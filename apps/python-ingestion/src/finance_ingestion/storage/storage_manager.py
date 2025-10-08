"""
Storage Manager for Financial Data Ingestion

Provides unified storage interface for Redis real-time data, PostgreSQL historical data,
and in-memory circular buffers with performance monitoring and error handling.
"""

import asyncio
import logging
import time
from collections import deque
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import json
import msgpack

import redis.asyncio as redis
import asyncpg
from asyncpg import Pool


@dataclass
class StorageMetrics:
    """Storage performance metrics"""
    redis_writes: int = 0
    postgres_writes: int = 0
    buffer_writes: int = 0
    redis_latency_ns: int = 0
    postgres_latency_ns: int = 0
    buffer_size: int = 0
    errors: int = 0


@dataclass
class MarketDataMessage:
    """Market data message structure"""
    symbol: str
    price: float
    volume: int
    timestamp: datetime
    message_type: str
    exchange: str
    bid: Optional[float] = None
    ask: Optional[float] = None


class CircularBuffer:
    """High-performance circular buffer for market data"""
    
    def __init__(self, max_size: int = 10000):
        self.max_size = max_size
        self.buffer = deque(maxlen=max_size)
        self.write_count = 0
        
    def write(self, data: MarketDataMessage) -> None:
        """Write data to buffer"""
        self.buffer.append(data)
        self.write_count += 1
        
    def read_latest(self, count: int = 100) -> List[MarketDataMessage]:
        """Read latest N messages"""
        return list(self.buffer)[-count:]
        
    def size(self) -> int:
        """Get current buffer size"""
        return len(self.buffer)
        
    def clear(self) -> None:
        """Clear buffer"""
        self.buffer.clear()


class StorageManager:
    """Unified storage manager for financial data ingestion"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Storage backends
        self.redis_pool: Optional[redis.ConnectionPool] = None
        self.postgres_pool: Optional[Pool] = None
        self.circular_buffer = CircularBuffer(config.get('buffer_size', 10000))
        
        # Metrics
        self.metrics = StorageMetrics()
        
        # Batch processing
        self.batch_size = config.get('batch_size', 1000)
        self.batch_timeout = config.get('batch_timeout', 1.0)
        self.pending_batch: List[MarketDataMessage] = []
        self.last_batch_time = time.perf_counter()
        
    async def initialize(self) -> None:
        """Initialize storage connections"""
        try:
            await self._init_redis()
            await self._init_postgres()
            self.logger.info("Storage manager initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize storage manager: {e}")
            raise
            
    async def _init_redis(self) -> None:
        """Initialize Redis connection pool"""
        redis_config = self.config.get('redis', {})
        self.redis_pool = redis.ConnectionPool(
            host=redis_config.get('host', 'localhost'),
            port=redis_config.get('port', 6379),
            db=redis_config.get('db', 0),
            password=redis_config.get('password'),
            max_connections=redis_config.get('max_connections', 20),
            retry_on_timeout=True,
            socket_keepalive=True,
            socket_keepalive_options={}
        )
        
        # Test connection
        async with redis.Redis(connection_pool=self.redis_pool) as r:
            await r.ping()
            
    async def _init_postgres(self) -> None:
        """Initialize PostgreSQL connection pool"""
        pg_config = self.config.get('postgres', {})
        self.postgres_pool = await asyncpg.create_pool(
            host=pg_config.get('host', 'localhost'),
            port=pg_config.get('port', 5432),
            database=pg_config.get('database', 'finance_data'),
            user=pg_config.get('user', 'postgres'),
            password=pg_config.get('password', 'postgres'),
            min_size=pg_config.get('min_connections', 5),
            max_size=pg_config.get('max_connections', 20),
            command_timeout=pg_config.get('command_timeout', 5)
        )
        
    async def store_message(self, message: MarketDataMessage) -> None:
        """Store message in all storage backends"""
        start_time = time.perf_counter_ns()
        
        try:
            # Store in circular buffer (fastest)
            self.circular_buffer.write(message)
            self.metrics.buffer_writes += 1
            
            # Store in Redis for real-time access
            await self._store_redis(message)
            
            # Add to batch for PostgreSQL
            self.pending_batch.append(message)
            
            # Check if we should flush batch
            current_time = time.perf_counter()
            if (len(self.pending_batch) >= self.batch_size or 
                current_time - self.last_batch_time >= self.batch_timeout):
                await self._flush_postgres_batch()
                
        except Exception as e:
            self.metrics.errors += 1
            self.logger.error(f"Error storing message: {e}")
            raise
            
    async def _store_redis(self, message: MarketDataMessage) -> None:
        """Store message in Redis"""
        start_time = time.perf_counter_ns()
        
        try:
            async with redis.Redis(connection_pool=self.redis_pool) as r:
                # Store latest price by symbol
                key = f"market:latest:{message.symbol}"
                data = msgpack.packb(asdict(message), default=str)
                await r.set(key, data, ex=3600)  # 1 hour expiry
                
                # Store in time series
                ts_key = f"market:ts:{message.symbol}"
                score = message.timestamp.timestamp()
                await r.zadd(ts_key, {data: score})
                
                # Trim time series to last 1000 entries
                await r.zremrangebyrank(ts_key, 0, -1001)
                
            self.metrics.redis_writes += 1
            self.metrics.redis_latency_ns = time.perf_counter_ns() - start_time
            
        except Exception as e:
            self.logger.error(f"Redis storage error: {e}")
            raise
            
    async def _flush_postgres_batch(self) -> None:
        """Flush pending batch to PostgreSQL"""
        if not self.pending_batch:
            return
            
        start_time = time.perf_counter_ns()
        
        try:
            async with self.postgres_pool.acquire() as conn:
                # Prepare batch data
                records = [
                    (
                        msg.symbol,
                        msg.price,
                        msg.volume,
                        msg.timestamp,
                        msg.message_type,
                        msg.exchange,
                        msg.bid,
                        msg.ask
                    )
                    for msg in self.pending_batch
                ]
                
                # Batch insert
                await conn.executemany(
                    """
                    INSERT INTO market_data 
                    (symbol, price, volume, timestamp, message_type, exchange, bid, ask)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """,
                    records
                )
                
            self.metrics.postgres_writes += len(self.pending_batch)
            self.metrics.postgres_latency_ns = time.perf_counter_ns() - start_time
            
            # Clear batch
            self.pending_batch.clear()
            self.last_batch_time = time.perf_counter()
            
        except Exception as e:
            self.logger.error(f"PostgreSQL batch insert error: {e}")
            raise
            
    async def get_latest_price(self, symbol: str) -> Optional[MarketDataMessage]:
        """Get latest price for symbol from Redis"""
        try:
            async with redis.Redis(connection_pool=self.redis_pool) as r:
                key = f"market:latest:{symbol}"
                data = await r.get(key)
                
                if data:
                    unpacked = msgpack.unpackb(data, raw=False)
                    unpacked['timestamp'] = datetime.fromisoformat(unpacked['timestamp'])
                    return MarketDataMessage(**unpacked)
                    
        except Exception as e:
            self.logger.error(f"Error getting latest price: {e}")
            
        return None
        
    async def get_price_history(self, symbol: str, limit: int = 100) -> List[MarketDataMessage]:
        """Get price history for symbol from Redis"""
        try:
            async with redis.Redis(connection_pool=self.redis_pool) as r:
                key = f"market:ts:{symbol}"
                data = await r.zrevrange(key, 0, limit - 1)
                
                messages = []
                for item in data:
                    unpacked = msgpack.unpackb(item, raw=False)
                    unpacked['timestamp'] = datetime.fromisoformat(unpacked['timestamp'])
                    messages.append(MarketDataMessage(**unpacked))
                    
                return messages
                
        except Exception as e:
            self.logger.error(f"Error getting price history: {e}")
            return []
            
    def get_buffer_data(self, count: int = 100) -> List[MarketDataMessage]:
        """Get latest data from circular buffer"""
        return self.circular_buffer.read_latest(count)
        
    def get_metrics(self) -> Dict[str, Any]:
        """Get storage performance metrics"""
        self.metrics.buffer_size = self.circular_buffer.size()
        return asdict(self.metrics)
        
    async def close(self) -> None:
        """Close all storage connections"""
        try:
            # Flush any pending batch
            if self.pending_batch:
                await self._flush_postgres_batch()
                
            # Close connections
            if self.redis_pool:
                await self.redis_pool.disconnect()
                
            if self.postgres_pool:
                await self.postgres_pool.close()
                
            self.logger.info("Storage manager closed successfully")
            
        except Exception as e:
            self.logger.error(f"Error closing storage manager: {e}")
            
    @asynccontextmanager
    async def transaction(self):
        """Context manager for transactional operations"""
        async with self.postgres_pool.acquire() as conn:
            async with conn.transaction():
                yield conn