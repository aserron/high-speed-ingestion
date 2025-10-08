"""
Unit tests for Python Storage Manager

Tests the storage manager functionality including Redis, PostgreSQL,
and circular buffer operations with performance monitoring.
"""

import asyncio
import pytest
import time
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from dataclasses import asdict

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../apps/python-ingestion/src'))

from finance_ingestion.storage.storage_manager import (
    StorageManager,
    MarketDataMessage,
    CircularBuffer,
    StorageMetrics
)


class TestCircularBuffer:
    """Test circular buffer functionality"""
    
    def test_buffer_initialization(self):
        """Test buffer initialization with default and custom sizes"""
        # Default size
        buffer = CircularBuffer()
        assert buffer.max_size == 10000
        assert buffer.size() == 0
        assert buffer.write_count == 0
        
        # Custom size
        buffer = CircularBuffer(max_size=5000)
        assert buffer.max_size == 5000
        
    def test_buffer_write_and_read(self):
        """Test writing and reading from buffer"""
        buffer = CircularBuffer(max_size=3)
        
        # Create test messages
        msg1 = MarketDataMessage(
            symbol="AAPL",
            price=150.0,
            volume=1000,
            timestamp=datetime.now(),
            message_type="trade",
            exchange="NASDAQ"
        )
        
        msg2 = MarketDataMessage(
            symbol="GOOGL",
            price=2500.0,
            volume=500,
            timestamp=datetime.now(),
            message_type="quote",
            exchange="NASDAQ"
        )
        
        # Write messages
        buffer.write(msg1)
        assert buffer.size() == 1
        assert buffer.write_count == 1
        
        buffer.write(msg2)
        assert buffer.size() == 2
        assert buffer.write_count == 2
        
        # Read latest
        latest = buffer.read_latest(1)
        assert len(latest) == 1
        assert latest[0].symbol == "GOOGL"
        
        # Read all
        all_msgs = buffer.read_latest(10)
        assert len(all_msgs) == 2
        
    def test_buffer_overflow(self):
        """Test buffer behavior when max size is exceeded"""
        buffer = CircularBuffer(max_size=2)
        
        # Fill buffer beyond capacity
        for i in range(5):
            msg = MarketDataMessage(
                symbol=f"SYM{i}",
                price=100.0 + i,
                volume=1000,
                timestamp=datetime.now(),
                message_type="trade",
                exchange="NYSE"
            )
            buffer.write(msg)
            
        # Should only contain last 2 messages
        assert buffer.size() == 2
        assert buffer.write_count == 5
        
        latest = buffer.read_latest(10)
        assert len(latest) == 2
        assert latest[0].symbol == "SYM3"  # Oldest in buffer
        assert latest[1].symbol == "SYM4"  # Newest in buffer
        
    def test_buffer_clear(self):
        """Test buffer clearing"""
        buffer = CircularBuffer()
        
        # Add some data
        msg = MarketDataMessage(
            symbol="TEST",
            price=100.0,
            volume=1000,
            timestamp=datetime.now(),
            message_type="trade",
            exchange="NYSE"
        )
        buffer.write(msg)
        
        assert buffer.size() == 1
        
        # Clear buffer
        buffer.clear()
        assert buffer.size() == 0
        assert len(buffer.read_latest(10)) == 0


class TestStorageManager:
    """Test storage manager functionality"""
    
    @pytest.fixture
    def config(self):
        """Test configuration"""
        return {
            'redis': {
                'host': 'localhost',
                'port': 6379,
                'db': 0,
                'max_connections': 10
            },
            'postgres': {
                'host': 'localhost',
                'port': 5432,
                'database': 'test_finance',
                'user': 'test_user',
                'password': 'test_pass',
                'min_connections': 2,
                'max_connections': 10
            },
            'buffer_size': 1000,
            'batch_size': 100,
            'batch_timeout': 1.0
        }
        
    @pytest.fixture
    def sample_message(self):
        """Sample market data message"""
        return MarketDataMessage(
            symbol="AAPL",
            price=150.25,
            volume=1000,
            timestamp=datetime.now(),
            message_type="trade",
            exchange="NASDAQ",
            bid=150.20,
            ask=150.30
        )
        
    def test_storage_manager_initialization(self, config):
        """Test storage manager initialization"""
        manager = StorageManager(config)
        
        assert manager.config == config
        assert manager.batch_size == 100
        assert manager.batch_timeout == 1.0
        assert manager.circular_buffer.max_size == 1000
        assert len(manager.pending_batch) == 0
        
    @pytest.mark.asyncio
    async def test_redis_initialization_success(self, config):
        """Test successful Redis initialization"""
        manager = StorageManager(config)
        
        with patch('redis.asyncio.ConnectionPool') as mock_pool, \
             patch('redis.asyncio.Redis') as mock_redis:
            
            # Mock Redis connection
            mock_redis_instance = AsyncMock()
            mock_redis_instance.ping = AsyncMock()
            mock_redis.return_value.__aenter__ = AsyncMock(return_value=mock_redis_instance)
            mock_redis.return_value.__aexit__ = AsyncMock()
            
            await manager._init_redis()
            
            # Verify Redis pool was created
            mock_pool.assert_called_once()
            mock_redis_instance.ping.assert_called_once()
            
    @pytest.mark.asyncio
    async def test_postgres_initialization_success(self, config):
        """Test successful PostgreSQL initialization"""
        manager = StorageManager(config)
        
        with patch('asyncpg.create_pool') as mock_create_pool:
            mock_pool = AsyncMock()
            mock_create_pool.return_value = mock_pool
            
            await manager._init_postgres()
            
            # Verify PostgreSQL pool was created
            mock_create_pool.assert_called_once()
            assert manager.postgres_pool == mock_pool
            
    @pytest.mark.asyncio
    async def test_store_message_success(self, config, sample_message):
        """Test successful message storage"""
        manager = StorageManager(config)
        
        # Mock storage backends
        manager.redis_pool = MagicMock()
        manager.postgres_pool = MagicMock()
        
        with patch.object(manager, '_store_redis') as mock_redis_store, \
             patch.object(manager, '_flush_postgres_batch') as mock_flush:
            
            mock_redis_store.return_value = AsyncMock()
            mock_flush.return_value = AsyncMock()
            
            await manager.store_message(sample_message)
            
            # Verify message was stored in buffer
            assert manager.circular_buffer.size() == 1
            assert manager.metrics.buffer_writes == 1
            
            # Verify message was added to pending batch
            assert len(manager.pending_batch) == 1
            assert manager.pending_batch[0] == sample_message
            
            # Verify Redis storage was called
            mock_redis_store.assert_called_once_with(sample_message)
            
    @pytest.mark.asyncio
    async def test_redis_storage(self, config, sample_message):
        """Test Redis storage functionality"""
        manager = StorageManager(config)
        
        # Mock Redis connection
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()
        mock_redis.zadd = AsyncMock()
        mock_redis.zremrangebyrank = AsyncMock()
        
        with patch('redis.asyncio.Redis') as mock_redis_class:
            mock_redis_class.return_value.__aenter__ = AsyncMock(return_value=mock_redis)
            mock_redis_class.return_value.__aexit__ = AsyncMock()
            
            manager.redis_pool = MagicMock()
            
            await manager._store_redis(sample_message)
            
            # Verify Redis operations
            assert mock_redis.set.call_count == 1
            assert mock_redis.zadd.call_count == 1
            assert mock_redis.zremrangebyrank.call_count == 1
            
            # Verify metrics
            assert manager.metrics.redis_writes == 1
            assert manager.metrics.redis_latency_ns > 0
            
    @pytest.mark.asyncio
    async def test_postgres_batch_flush(self, config):
        """Test PostgreSQL batch flushing"""
        manager = StorageManager(config)
        
        # Add messages to pending batch
        messages = []
        for i in range(3):
            msg = MarketDataMessage(
                symbol=f"SYM{i}",
                price=100.0 + i,
                volume=1000,
                timestamp=datetime.now(),
                message_type="trade",
                exchange="NYSE"
            )
            messages.append(msg)
            manager.pending_batch.append(msg)
            
        # Mock PostgreSQL connection
        mock_conn = AsyncMock()
        mock_conn.executemany = AsyncMock()
        
        mock_pool = AsyncMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock()
        
        manager.postgres_pool = mock_pool
        
        await manager._flush_postgres_batch()
        
        # Verify batch was executed
        mock_conn.executemany.assert_called_once()
        
        # Verify metrics
        assert manager.metrics.postgres_writes == 3
        assert manager.metrics.postgres_latency_ns > 0
        
        # Verify batch was cleared
        assert len(manager.pending_batch) == 0
        
    @pytest.mark.asyncio
    async def test_get_latest_price_redis(self, config):
        """Test getting latest price from Redis"""
        manager = StorageManager(config)
        
        # Mock Redis response
        mock_redis = AsyncMock()
        mock_data = {
            'symbol': 'AAPL',
            'price': 150.25,
            'volume': 1000,
            'timestamp': '2023-01-01T12:00:00',
            'message_type': 'trade',
            'exchange': 'NASDAQ'
        }
        
        with patch('msgpack.unpackb') as mock_unpack:
            mock_unpack.return_value = mock_data
            mock_redis.get.return_value = b'packed_data'
            
            with patch('redis.asyncio.Redis') as mock_redis_class:
                mock_redis_class.return_value.__aenter__ = AsyncMock(return_value=mock_redis)
                mock_redis_class.return_value.__aexit__ = AsyncMock()
                
                manager.redis_pool = MagicMock()
                
                result = await manager.get_latest_price('AAPL')
                
                assert result is not None
                assert result.symbol == 'AAPL'
                assert result.price == 150.25
                
    @pytest.mark.asyncio
    async def test_get_latest_price_not_found(self, config):
        """Test getting latest price when not found"""
        manager = StorageManager(config)
        
        # Mock Redis returning None
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        
        with patch('redis.asyncio.Redis') as mock_redis_class:
            mock_redis_class.return_value.__aenter__ = AsyncMock(return_value=mock_redis)
            mock_redis_class.return_value.__aexit__ = AsyncMock()
            
            manager.redis_pool = MagicMock()
            
            result = await manager.get_latest_price('NONEXISTENT')
            
            assert result is None
            
    @pytest.mark.asyncio
    async def test_batch_timeout_flush(self, config, sample_message):
        """Test batch flushing on timeout"""
        config['batch_timeout'] = 0.1  # Very short timeout
        manager = StorageManager(config)
        
        # Mock storage backends
        manager.redis_pool = MagicMock()
        manager.postgres_pool = MagicMock()
        
        with patch.object(manager, '_store_redis') as mock_redis_store, \
             patch.object(manager, '_flush_postgres_batch') as mock_flush:
            
            mock_redis_store.return_value = AsyncMock()
            mock_flush.return_value = AsyncMock()
            
            # Store message
            await manager.store_message(sample_message)
            
            # Wait for timeout
            await asyncio.sleep(0.2)
            
            # Store another message (should trigger flush due to timeout)
            await manager.store_message(sample_message)
            
            # Verify flush was called
            assert mock_flush.call_count >= 1
            
    def test_get_buffer_data(self, config, sample_message):
        """Test getting data from circular buffer"""
        manager = StorageManager(config)
        
        # Add message to buffer
        manager.circular_buffer.write(sample_message)
        
        # Get buffer data
        data = manager.get_buffer_data(10)
        
        assert len(data) == 1
        assert data[0] == sample_message
        
    def test_get_metrics(self, config):
        """Test getting storage metrics"""
        manager = StorageManager(config)
        
        # Update some metrics
        manager.metrics.redis_writes = 10
        manager.metrics.postgres_writes = 5
        manager.metrics.buffer_writes = 15
        manager.metrics.errors = 1
        
        metrics = manager.get_metrics()
        
        assert metrics['redis_writes'] == 10
        assert metrics['postgres_writes'] == 5
        assert metrics['buffer_writes'] == 15
        assert metrics['errors'] == 1
        assert 'buffer_size' in metrics
        
    @pytest.mark.asyncio
    async def test_close_storage_manager(self, config):
        """Test closing storage manager"""
        manager = StorageManager(config)
        
        # Mock storage backends
        mock_redis_pool = AsyncMock()
        mock_postgres_pool = AsyncMock()
        
        manager.redis_pool = mock_redis_pool
        manager.postgres_pool = mock_postgres_pool
        
        # Add pending batch
        manager.pending_batch.append(MarketDataMessage(
            symbol="TEST",
            price=100.0,
            volume=1000,
            timestamp=datetime.now(),
            message_type="trade",
            exchange="NYSE"
        ))
        
        with patch.object(manager, '_flush_postgres_batch') as mock_flush:
            mock_flush.return_value = AsyncMock()
            
            await manager.close()
            
            # Verify flush was called
            mock_flush.assert_called_once()
            
            # Verify connections were closed
            mock_redis_pool.disconnect.assert_called_once()
            mock_postgres_pool.close.assert_called_once()
            
    @pytest.mark.asyncio
    async def test_error_handling(self, config, sample_message):
        """Test error handling in storage operations"""
        manager = StorageManager(config)
        
        # Mock storage backends to raise errors
        manager.redis_pool = MagicMock()
        
        with patch.object(manager, '_store_redis') as mock_redis_store:
            mock_redis_store.side_effect = Exception("Redis error")
            
            # Should raise exception and increment error count
            with pytest.raises(Exception):
                await manager.store_message(sample_message)
                
            assert manager.metrics.errors == 1


if __name__ == '__main__':
    pytest.main([__file__])