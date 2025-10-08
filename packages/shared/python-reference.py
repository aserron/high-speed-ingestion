"""
Python Reference for @finance-benchmark/shared

This file provides Python equivalents and utilities for using the shared schemas
and specifications defined in the TypeScript package.

Usage:
    from packages.shared.python_reference import (
        MarketDataMessage,
        MessagePackSpec,
        RedisKeyBuilder,
        load_json_schema
    )
"""

import json
import os
from typing import Dict, Any, Optional, Union, Literal
from dataclasses import dataclass
from enum import IntEnum
from pathlib import Path

# Type aliases for Python equivalents
MessageType = Literal['TRADE', 'QUOTE', 'BOOK_UPDATE']
Side = Literal['BUY', 'SELL']

class MessageTypeEnum(IntEnum):
    """MessagePack serialization enum for message types"""
    TRADE = 0
    QUOTE = 1
    BOOK_UPDATE = 2

class SideEnum(IntEnum):
    """MessagePack serialization enum for sides"""
    BUY = 0
    SELL = 1

@dataclass
class MarketDataPayload:
    """Market data payload containing trade/quote information"""
    price: float
    quantity: float
    side: Side
    exchange: str

@dataclass
class MarketDataMessage:
    """Core market data message structure"""
    messageId: str
    timestamp: int  # nanoseconds since epoch
    symbol: str
    messageType: MessageType
    data: MarketDataPayload
    sequenceNumber: int

@dataclass
class LatencyStats:
    """Latency statistics with percentiles"""
    p50: int
    p95: int
    p99: int
    p999: int
    min: int
    max: int
    mean: int
    count: int

@dataclass
class ThroughputStats:
    """Throughput statistics"""
    messagesPerSecond: float
    bytesPerSecond: int
    totalMessages: int
    totalBytes: int
    windowSizeMs: Optional[int] = None

@dataclass
class NetworkIOStats:
    """Network I/O statistics"""
    bytesReceived: int
    bytesSent: int
    packetsReceived: int
    packetsSent: int
    errors: int

@dataclass
class ResourceStats:
    """Resource utilization statistics"""
    cpuUsage: float  # percentage
    memoryUsage: int  # bytes
    memoryPercent: float  # percentage
    networkIO: NetworkIOStats
    gcStats: Optional[Dict[str, Any]] = None

@dataclass
class PerformanceMetrics:
    """Performance metrics aggregation"""
    timestamp: int
    latency: LatencyStats
    throughput: ThroughputStats
    resources: ResourceStats

class MessagePackSpec:
    """MessagePack serialization utilities for Python"""
    
    @staticmethod
    def message_type_to_enum(message_type: str) -> MessageTypeEnum:
        """Convert string message type to enum"""
        mapping = {
            'TRADE': MessageTypeEnum.TRADE,
            'QUOTE': MessageTypeEnum.QUOTE,
            'BOOK_UPDATE': MessageTypeEnum.BOOK_UPDATE
        }
        if message_type not in mapping:
            raise ValueError(f"Invalid message type: {message_type}")
        return mapping[message_type]
    
    @staticmethod
    def enum_to_message_type(enum_value: MessageTypeEnum) -> str:
        """Convert enum to string message type"""
        mapping = {
            MessageTypeEnum.TRADE: 'TRADE',
            MessageTypeEnum.QUOTE: 'QUOTE',
            MessageTypeEnum.BOOK_UPDATE: 'BOOK_UPDATE'
        }
        if enum_value not in mapping:
            raise ValueError(f"Invalid message type enum: {enum_value}")
        return mapping[enum_value]
    
    @staticmethod
    def side_to_enum(side: str) -> SideEnum:
        """Convert string side to enum"""
        mapping = {
            'BUY': SideEnum.BUY,
            'SELL': SideEnum.SELL
        }
        if side not in mapping:
            raise ValueError(f"Invalid side: {side}")
        return mapping[side]
    
    @staticmethod
    def enum_to_side(enum_value: SideEnum) -> str:
        """Convert enum to string side"""
        mapping = {
            SideEnum.BUY: 'BUY',
            SideEnum.SELL: 'SELL'
        }
        if enum_value not in mapping:
            raise ValueError(f"Invalid side enum: {enum_value}")
        return mapping[enum_value]
    
    @staticmethod
    def to_serializable(message: MarketDataMessage) -> Dict[str, Any]:
        """Convert MarketDataMessage to serializable format"""
        return {
            'messageId': message.messageId,
            'timestamp': message.timestamp,
            'symbol': message.symbol,
            'messageType': MessagePackSpec.message_type_to_enum(message.messageType),
            'data': {
                'price': message.data.price,
                'quantity': message.data.quantity,
                'side': MessagePackSpec.side_to_enum(message.data.side),
                'exchange': message.data.exchange
            },
            'sequenceNumber': message.sequenceNumber
        }
    
    @staticmethod
    def from_serializable(serializable: Dict[str, Any]) -> MarketDataMessage:
        """Convert serializable format to MarketDataMessage"""
        return MarketDataMessage(
            messageId=serializable['messageId'],
            timestamp=serializable['timestamp'],
            symbol=serializable['symbol'],
            messageType=MessagePackSpec.enum_to_message_type(serializable['messageType']),
            data=MarketDataPayload(
                price=serializable['data']['price'],
                quantity=serializable['data']['quantity'],
                side=MessagePackSpec.enum_to_side(serializable['data']['side']),
                exchange=serializable['data']['exchange']
            ),
            sequenceNumber=serializable['sequenceNumber']
        )

class RedisKeyBuilder:
    """Redis key generation utilities for Python"""
    
    # Key patterns (matching TypeScript implementation)
    MARKET_DATA = 'market:{symbol}:{timestamp}'
    LATEST_PRICE = 'latest:{symbol}'
    PERFORMANCE_METRICS = 'metrics:{implementation}:{timestamp}'
    CONNECTION_STATS = 'conn:{implementation}:{timestamp}'
    PROCESSING_QUEUE = 'queue:{implementation}'
    LATENCY_WINDOW = 'latency:{implementation}:{window}'
    THROUGHPUT_WINDOW = 'throughput:{implementation}:{window}'
    HEALTH_STATUS = 'health:{implementation}'
    CONFIG_CACHE = 'config:{implementation}:{key}'
    ACTIVE_SYMBOLS = 'symbols:active'
    
    @staticmethod
    def market_data(symbol: str, timestamp: int) -> str:
        """Generate market data key"""
        return RedisKeyBuilder.MARKET_DATA.format(symbol=symbol, timestamp=timestamp)
    
    @staticmethod
    def latest_price(symbol: str) -> str:
        """Generate latest price key"""
        return RedisKeyBuilder.LATEST_PRICE.format(symbol=symbol)
    
    @staticmethod
    def performance_metrics(implementation: str, timestamp: int) -> str:
        """Generate performance metrics key"""
        return RedisKeyBuilder.PERFORMANCE_METRICS.format(
            implementation=implementation, timestamp=timestamp
        )
    
    @staticmethod
    def connection_stats(implementation: str, timestamp: int) -> str:
        """Generate connection stats key"""
        return RedisKeyBuilder.CONNECTION_STATS.format(
            implementation=implementation, timestamp=timestamp
        )
    
    @staticmethod
    def processing_queue(implementation: str) -> str:
        """Generate processing queue key"""
        return RedisKeyBuilder.PROCESSING_QUEUE.format(implementation=implementation)
    
    @staticmethod
    def latency_window(implementation: str, window_ms: int) -> str:
        """Generate latency window key"""
        return RedisKeyBuilder.LATENCY_WINDOW.format(
            implementation=implementation, window=window_ms
        )
    
    @staticmethod
    def throughput_window(implementation: str, window_ms: int) -> str:
        """Generate throughput window key"""
        return RedisKeyBuilder.THROUGHPUT_WINDOW.format(
            implementation=implementation, window=window_ms
        )
    
    @staticmethod
    def health_status(implementation: str) -> str:
        """Generate health status key"""
        return RedisKeyBuilder.HEALTH_STATUS.format(implementation=implementation)
    
    @staticmethod
    def config_cache(implementation: str, key: str) -> str:
        """Generate config cache key"""
        return RedisKeyBuilder.CONFIG_CACHE.format(implementation=implementation, key=key)
    
    @staticmethod
    def active_symbols() -> str:
        """Get active symbols key"""
        return RedisKeyBuilder.ACTIVE_SYMBOLS

def load_json_schema(schema_name: str) -> Dict[str, Any]:
    """
    Load JSON schema from the shared package
    
    Args:
        schema_name: Name of the schema file (e.g., 'market-data.schema.json')
    
    Returns:
        Parsed JSON schema dictionary
    """
    # Get the directory of this file
    current_dir = Path(__file__).parent
    schema_path = current_dir / 'dist' / 'schemas' / schema_name
    
    if not schema_path.exists():
        # Try alternative path for development
        schema_path = current_dir / 'src' / 'schemas' / schema_name
    
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_name}")
    
    with open(schema_path, 'r') as f:
        return json.load(f)

def get_postgresql_schema() -> str:
    """
    Get the PostgreSQL schema SQL
    
    Returns:
        SQL schema as string
    """
    current_dir = Path(__file__).parent
    schema_path = current_dir / 'src' / 'database' / 'postgresql-schema.sql'
    
    if not schema_path.exists():
        raise FileNotFoundError("PostgreSQL schema file not found")
    
    with open(schema_path, 'r') as f:
        return f.read()

# Constants (matching TypeScript implementation)
CONSTANTS = {
    'NANOSECONDS_PER_MILLISECOND': 1_000_000,
    'NANOSECONDS_PER_SECOND': 1_000_000_000,
    'DEFAULT_WEBSOCKET_PORT': 8080,
    'DEFAULT_REDIS_PORT': 6379,
    'DEFAULT_POSTGRESQL_PORT': 5432,
    'DEFAULT_PROMETHEUS_PORT': 9090,
    'DEFAULT_HEALTH_CHECK_PORT': 8081,
    'TARGET_PROCESSING_LATENCY_MS': 1,
    'TARGET_THROUGHPUT_MSG_PER_SEC': 10000,
    'TARGET_RECONNECTION_TIME_MS': 1000,
    'DEFAULT_BUFFER_SIZE': 100000,
    'DEFAULT_BATCH_SIZE': 1000,
    'DEFAULT_CONNECTION_TIMEOUT_MS': 5000,
    'DEFAULT_PROCESSING_TIMEOUT_MS': 100,
    'DEFAULT_HEALTH_CHECK_TIMEOUT_MS': 1000
}

class SharedUtils:
    """Utility functions (matching TypeScript implementation)"""
    
    @staticmethod
    def get_current_timestamp_ns() -> int:
        """Get current timestamp in nanoseconds"""
        import time
        return int(time.time() * CONSTANTS['NANOSECONDS_PER_SECOND'])
    
    @staticmethod
    def ms_to_ns(ms: float) -> int:
        """Convert milliseconds to nanoseconds"""
        return int(ms * CONSTANTS['NANOSECONDS_PER_MILLISECOND'])
    
    @staticmethod
    def ns_to_ms(ns: int) -> float:
        """Convert nanoseconds to milliseconds"""
        return ns / CONSTANTS['NANOSECONDS_PER_MILLISECOND']
    
    @staticmethod
    def generate_message_id() -> str:
        """Generate unique message ID"""
        import time
        import random
        import string
        
        timestamp = int(time.time() * 1000)
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        return f"msg_{timestamp}_{random_str}"
    
    @staticmethod
    def calculate_percentile(sorted_array: list, percentile: float) -> float:
        """Calculate percentile from sorted array"""
        if not sorted_array:
            return 0.0
        
        index = (percentile / 100) * (len(sorted_array) - 1)
        lower = int(index)
        upper = min(lower + 1, len(sorted_array) - 1)
        
        if lower == upper:
            return float(sorted_array[lower])
        
        weight = index - lower
        return sorted_array[lower] * (1 - weight) + sorted_array[upper] * weight
    
    @staticmethod
    def calculate_stats(values: list) -> Dict[str, Union[int, float]]:
        """Calculate basic statistics from array"""
        if not values:
            return {'min': 0, 'max': 0, 'mean': 0, 'count': 0}
        
        return {
            'min': min(values),
            'max': max(values),
            'mean': sum(values) / len(values),
            'count': len(values)
        }

# Example usage
if __name__ == '__main__':
    # Example market data message
    message = MarketDataMessage(
        messageId=SharedUtils.generate_message_id(),
        timestamp=SharedUtils.get_current_timestamp_ns(),
        symbol='AAPL',
        messageType='TRADE',
        data=MarketDataPayload(
            price=150.25,
            quantity=100.0,
            side='BUY',
            exchange='NYSE'
        ),
        sequenceNumber=1
    )
    
    # Convert to serializable format for MessagePack
    serializable = MessagePackSpec.to_serializable(message)
    print("Serializable format:", serializable)
    
    # Generate Redis key
    key = RedisKeyBuilder.market_data('AAPL', message.timestamp)
    print("Redis key:", key)
    
    # Load JSON schema
    try:
        schema = load_json_schema('market-data.schema.json')
        print("Schema loaded successfully")
    except FileNotFoundError as e:
        print(f"Schema not found: {e}")