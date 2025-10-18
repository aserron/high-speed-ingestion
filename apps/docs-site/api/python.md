# Python API Reference

This document provides comprehensive API documentation for the Python implementation of the Finance Ingestion Benchmark system.

## Interactive API Explorer

<ApiExplorer />

## API Overview

The Finance Ingestion Benchmark Python implementation exposes several REST endpoints for monitoring, configuration, and health checking. Use the interactive explorer above to test the endpoints in real-time.

## Core Classes

### ConnectionManager

Manages WebSocket connections to market data feeds with automatic reconnection and health monitoring.

```python
from finance_ingestion.connection import ConnectionManager, ConnectionConfig

class ConnectionManager:
    """WebSocket connection manager with automatic reconnection."""
    
    def __init__(self, config: ConnectionConfig):
        """Initialize connection manager with configuration."""
        pass
    
    async def connect(self, url: str, headers: Dict[str, str] = None) -> None:
        """Establish WebSocket connection to the specified URL."""
        pass
    
    async def disconnect(self, url: str = None) -> None:
        """Disconnect from WebSocket(s)."""
        pass
    
    async def send_message(self, url: str, message: bytes) -> None:
        """Send message to specific WebSocket connection."""
        pass
    
    async def receive_messages(self, url: str) -> AsyncIterator[bytes]:
        """Receive messages from WebSocket connection."""
        pass
    
    def get_connection_stats(self, url: str) -> ConnectionStats:
        """Get connection statistics and health information."""
        pass
```

#### Configuration

```python
@dataclass
class ConnectionConfig:
    """Configuration for WebSocket connections."""
    
    max_retries: int = 10
    base_delay: float = 0.1  # seconds
    max_delay: float = 5.0
    ping_interval: int = 20  # seconds
    ping_timeout: int = 10   # seconds
    compression: str = None  # 'deflate' or None
    
    # TLS configuration
    ssl_context: ssl.SSLContext = None
    verify_ssl: bool = True
    
    # Authentication
    auth_headers: Dict[str, str] = field(default_factory=dict)
```

#### Usage Example

::: code-group

```python [Basic Usage]
import asyncio
from finance_ingestion.connection import ConnectionManager, ConnectionConfig

async def main():
    config = ConnectionConfig(
        max_retries=5,
        base_delay=0.1,
        ping_interval=30
    )
    
    manager = ConnectionManager(config)
    
    # Connect to market data feed
    await manager.connect(
        "wss://feed.example.com/market-data",
        headers={"Authorization": "Bearer token123"}
    )
    
    # Receive messages
    async for message in manager.receive_messages("wss://feed.example.com/market-data"):
        print(f"Received: {len(message)} bytes")
        
        # Process message here
        await process_message(message)

if __name__ == "__main__":
    asyncio.run(main())
```

```python [Advanced Usage]
import asyncio
import ssl
from finance_ingestion.connection import ConnectionManager, ConnectionConfig

async def advanced_example():
    # Custom SSL context
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    config = ConnectionConfig(
        max_retries=10,
        base_delay=0.05,
        max_delay=2.0,
        ping_interval=15,
        ssl_context=ssl_context,
        auth_headers={
            "Authorization": "Bearer token123",
            "X-API-Key": "api-key-456"
        }
    )
    
    manager = ConnectionManager(config)
    
    # Connect to multiple feeds
    feeds = [
        "wss://feed1.example.com/market-data",
        "wss://feed2.example.com/market-data"
    ]
    
    for feed_url in feeds:
        await manager.connect(feed_url)
    
    # Monitor connection health
    for feed_url in feeds:
        stats = manager.get_connection_stats(feed_url)
        print(f"Feed {feed_url}: {stats.status}, latency: {stats.latency_ms}ms")
```

:::

### MessageProcessor

High-performance message processing with latency measurement and backpressure handling.

```python
from finance_ingestion.processor import MessageProcessor, ProcessorConfig
from finance_ingestion.models import MarketDataMessage

class MessageProcessor:
    """High-performance message processor with latency tracking."""
    
    def __init__(self, config: ProcessorConfig):
        """Initialize message processor with configuration."""
        pass
    
    async def process_message(self, raw_message: bytes) -> ProcessingResult:
        """Process raw message and return result with latency metrics."""
        pass
    
    async def process_batch(self, messages: List[bytes]) -> List[ProcessingResult]:
        """Process multiple messages in batch for efficiency."""
        pass
    
    def get_latency_stats(self) -> LatencyStats:
        """Get current latency statistics."""
        pass
    
    def get_throughput_stats(self) -> ThroughputStats:
        """Get current throughput statistics."""
        pass
    
    async def handle_backpressure(self) -> None:
        """Handle backpressure by adjusting processing parameters."""
        pass
```

#### Configuration

```python
@dataclass
class ProcessorConfig:
    """Configuration for message processing."""
    
    # Performance settings
    batch_size: int = 100
    max_latency_ms: float = 1.0
    enable_batching: bool = True
    
    # Backpressure settings
    queue_size_threshold: int = 1000
    latency_threshold_ms: float = 5.0
    backpressure_strategy: str = 'drop_oldest'  # 'drop_oldest', 'drop_newest', 'block'
    
    # Validation settings
    validate_messages: bool = True
    strict_validation: bool = False
    
    # Metrics settings
    enable_metrics: bool = True
    metrics_window_size: int = 1000
```

#### Usage Example

::: code-group

```python [Basic Processing]
import asyncio
from finance_ingestion.processor import MessageProcessor, ProcessorConfig

async def process_messages():
    config = ProcessorConfig(
        batch_size=50,
        max_latency_ms=0.5,
        enable_batching=True
    )
    
    processor = MessageProcessor(config)
    
    # Process single message
    raw_message = b'{"symbol": "AAPL", "price": 150.25}'
    result = await processor.process_message(raw_message)
    
    print(f"Processed message in {result.latency_ms:.3f}ms")
    print(f"Parsed data: {result.parsed_message}")
    
    # Get performance stats
    latency_stats = processor.get_latency_stats()
    print(f"P99 latency: {latency_stats.p99:.3f}ms")
```

```python [Batch Processing]
import asyncio
from finance_ingestion.processor import MessageProcessor, ProcessorConfig

async def batch_processing_example():
    config = ProcessorConfig(
        batch_size=100,
        enable_batching=True,
        backpressure_strategy='drop_oldest'
    )
    
    processor = MessageProcessor(config)
    
    # Simulate batch of messages
    messages = [
        b'{"symbol": "AAPL", "price": 150.25}',
        b'{"symbol": "GOOGL", "price": 2750.50}',
        b'{"symbol": "MSFT", "price": 305.75}'
    ] * 50  # 150 messages total
    
    # Process batch
    results = await processor.process_batch(messages)
    
    # Analyze results
    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]
    
    print(f"Processed {len(successful)}/{len(messages)} messages successfully")
    
    if failed:
        print(f"Failed messages: {len(failed)}")
        for failure in failed[:5]:  # Show first 5 failures
            print(f"  Error: {failure.error}")
```

:::

### StorageManager

Multi-tier storage management for Redis, PostgreSQL, and in-memory buffers.

```python
from finance_ingestion.storage import StorageManager, StorageConfig
from finance_ingestion.models import MarketDataMessage

class StorageManager:
    """Multi-tier storage manager for market data."""
    
    def __init__(self, config: StorageConfig):
        """Initialize storage manager with configuration."""
        pass
    
    async def store_realtime(self, message: MarketDataMessage) -> None:
        """Store message in Redis for real-time access."""
        pass
    
    async def store_historical(self, message: MarketDataMessage) -> None:
        """Store message in PostgreSQL for historical analysis."""
        pass
    
    async def store_batch(self, messages: List[MarketDataMessage]) -> None:
        """Store multiple messages efficiently."""
        pass
    
    async def get_latest(self, symbol: str, limit: int = 100) -> List[MarketDataMessage]:
        """Get latest messages for a symbol from Redis."""
        pass
    
    async def get_historical(self, symbol: str, start_time: datetime, end_time: datetime) -> List[MarketDataMessage]:
        """Get historical messages from PostgreSQL."""
        pass
    
    def get_buffer_stats(self) -> BufferStats:
        """Get in-memory buffer statistics."""
        pass
```

#### Configuration

```python
@dataclass
class StorageConfig:
    """Configuration for storage systems."""
    
    # Redis configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_max_connections: int = 10
    redis_ttl_seconds: int = 3600  # 1 hour
    
    # PostgreSQL configuration
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_database: str = "finance_benchmark"
    postgres_user: str = "postgres"
    postgres_password: str = ""
    postgres_max_connections: int = 20
    
    # Buffer configuration
    buffer_size: int = 10000
    buffer_flush_interval: int = 5  # seconds
    buffer_flush_threshold: int = 1000  # messages
    
    # Performance settings
    batch_insert_size: int = 1000
    enable_compression: bool = True
    compression_algorithm: str = "msgpack"  # 'msgpack', 'json', 'pickle'
```

#### Usage Example

::: code-group

```python [Basic Storage]
import asyncio
from datetime import datetime, timedelta
from finance_ingestion.storage import StorageManager, StorageConfig
from finance_ingestion.models import MarketDataMessage

async def storage_example():
    config = StorageConfig(
        redis_host="localhost",
        postgres_host="localhost",
        buffer_size=5000
    )
    
    storage = StorageManager(config)
    
    # Create sample message
    message = MarketDataMessage(
        message_id="msg_123",
        timestamp=datetime.now(),
        symbol="AAPL",
        message_type="TRADE",
        data={
            "price": 150.25,
            "quantity": 1000,
            "side": "BUY",
            "exchange": "NASDAQ"
        }
    )
    
    # Store in both Redis and PostgreSQL
    await storage.store_realtime(message)
    await storage.store_historical(message)
    
    # Retrieve latest data
    latest_messages = await storage.get_latest("AAPL", limit=10)
    print(f"Found {len(latest_messages)} recent messages for AAPL")
```

```python [Batch Operations]
import asyncio
from finance_ingestion.storage import StorageManager, StorageConfig

async def batch_storage_example():
    config = StorageConfig(
        batch_insert_size=500,
        buffer_flush_threshold=100
    )
    
    storage = StorageManager(config)
    
    # Generate batch of messages
    messages = []
    for i in range(1000):
        message = MarketDataMessage(
            message_id=f"msg_{i}",
            timestamp=datetime.now(),
            symbol=f"SYMBOL_{i % 10}",
            message_type="TRADE",
            data={"price": 100 + i * 0.01, "quantity": 100}
        )
        messages.append(message)
    
    # Store batch efficiently
    await storage.store_batch(messages)
    
    # Check buffer statistics
    stats = storage.get_buffer_stats()
    print(f"Buffer usage: {stats.current_size}/{stats.max_size}")
    print(f"Flush rate: {stats.flushes_per_second:.2f}/sec")
```

:::

## REST API Endpoints

The Python implementation exposes several REST endpoints for monitoring and control.

### Health Check

<div class="api-endpoint">
  <div class="api-endpoint-header">
    <span class="api-method get">GET</span>
    <span class="api-path">/health</span>
  </div>
  <div class="api-endpoint-body">
    <p><strong>Description:</strong> Get application health status and connection information.</p>
    
    <p><strong>Response:</strong></p>
    
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123,
  "version": "1.0.0",
  "connections": {
    "redis": "connected",
    "postgresql": "connected",
    "websocket": "connected"
  },
  "performance": {
    "messages_processed": 150000,
    "current_throughput": 2500,
    "avg_latency_ms": 0.45
  }
}
```
  </div>
</div>

### Metrics

<div class="api-endpoint">
  <div class="api-endpoint-header">
    <span class="api-method get">GET</span>
    <span class="api-path">/metrics</span>
  </div>
  <div class="api-endpoint-body">
    <p><strong>Description:</strong> Get Prometheus-formatted metrics for monitoring.</p>
    
    <p><strong>Response:</strong> Prometheus text format</p>
    
```prometheus
# HELP finance_ingestion_messages_total Total number of messages processed
# TYPE finance_ingestion_messages_total counter
finance_ingestion_messages_total 150000

# HELP finance_ingestion_latency_seconds Message processing latency
# TYPE finance_ingestion_latency_seconds histogram
finance_ingestion_latency_seconds_bucket{le="0.001"} 120000
finance_ingestion_latency_seconds_bucket{le="0.005"} 148000
finance_ingestion_latency_seconds_bucket{le="0.01"} 149800
finance_ingestion_latency_seconds_bucket{le="+Inf"} 150000
```
  </div>
</div>

### Statistics

<div class="api-endpoint">
  <div class="api-endpoint-header">
    <span class="api-method get">GET</span>
    <span class="api-path">/stats</span>
  </div>
  <div class="api-endpoint-body">
    <p><strong>Description:</strong> Get detailed performance statistics in human-readable format.</p>
    
    <p><strong>Response:</strong></p>
    
```json
{
  "latency": {
    "p50": 0.45,
    "p95": 0.78,
    "p99": 1.23,
    "p999": 2.45,
    "unit": "milliseconds"
  },
  "throughput": {
    "current": 2500,
    "peak": 12000,
    "average": 8500,
    "unit": "messages_per_second"
  },
  "resources": {
    "memory_mb": 145,
    "cpu_percent": 65,
    "connections": {
      "redis": 8,
      "postgresql": 15,
      "websocket": 3
    }
  },
  "errors": {
    "connection_errors": 2,
    "processing_errors": 0,
    "storage_errors": 1
  }
}
```
  </div>
</div>

## Data Models

### MarketDataMessage

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, Literal

@dataclass
class MarketDataMessage:
    """Market data message structure."""
    
    message_id: str
    timestamp: datetime
    symbol: str
    message_type: Literal["TRADE", "QUOTE", "BOOK_UPDATE"]
    data: Dict[str, Any]
    sequence_number: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "messageId": self.message_id,
            "timestamp": int(self.timestamp.timestamp() * 1_000_000_000),  # nanoseconds
            "symbol": self.symbol,
            "messageType": self.message_type,
            "data": self.data,
            "sequenceNumber": self.sequence_number
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MarketDataMessage':
        """Create from dictionary."""
        return cls(
            message_id=data["messageId"],
            timestamp=datetime.fromtimestamp(data["timestamp"] / 1_000_000_000),
            symbol=data["symbol"],
            message_type=data["messageType"],
            data=data["data"],
            sequence_number=data.get("sequenceNumber", 0)
        )
```

### Performance Metrics

```python
@dataclass
class LatencyStats:
    """Latency statistics."""
    
    p50: float  # milliseconds
    p95: float
    p99: float
    p999: float
    mean: float
    std_dev: float
    min_latency: float
    max_latency: float
    sample_count: int

@dataclass
class ThroughputStats:
    """Throughput statistics."""
    
    current_rate: float  # messages per second
    peak_rate: float
    average_rate: float
    total_messages: int
    duration_seconds: float

@dataclass
class ConnectionStats:
    """Connection health statistics."""
    
    status: Literal["connected", "disconnected", "reconnecting", "error"]
    latency_ms: float
    messages_sent: int
    messages_received: int
    reconnection_count: int
    last_error: str = None
```

## Configuration Management

### Environment Variables

```python
import os
from dataclasses import dataclass

@dataclass
class AppConfig:
    """Application configuration from environment variables."""
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "3001"))
    
    # WebSocket settings
    WEBSOCKET_URLS: List[str] = os.getenv("WEBSOCKET_URLS", "").split(",")
    WEBSOCKET_MAX_RETRIES: int = int(os.getenv("WEBSOCKET_MAX_RETRIES", "10"))
    
    # Redis settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    
    # PostgreSQL settings
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "finance_benchmark")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    
    # Performance settings
    ENABLE_BATCHING: bool = os.getenv("ENABLE_BATCHING", "true").lower() == "true"
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "100"))
    MAX_LATENCY_MS: float = float(os.getenv("MAX_LATENCY_MS", "1.0"))
    
    # Logging settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "json")
```

### Configuration File

```yaml
# config.yaml
server:
  host: "0.0.0.0"
  port: 3001
  workers: 1

websocket:
  urls:
    - "wss://feed1.example.com/market-data"
    - "wss://feed2.example.com/market-data"
  max_retries: 10
  base_delay: 0.1
  max_delay: 5.0
  ping_interval: 20

storage:
  redis:
    host: "localhost"
    port: 6379
    db: 0
    max_connections: 10
    ttl: 3600
  
  postgresql:
    host: "localhost"
    port: 5432
    database: "finance_benchmark"
    user: "postgres"
    password: ""
    max_connections: 20

processing:
  batch_size: 100
  max_latency_ms: 1.0
  enable_batching: true
  backpressure_strategy: "drop_oldest"

monitoring:
  enable_metrics: true
  metrics_port: 9090
  log_level: "INFO"
```

## Error Handling

### Exception Classes

```python
class FinanceIngestionError(Exception):
    """Base exception for finance ingestion errors."""
    pass

class ConnectionError(FinanceIngestionError):
    """WebSocket connection related errors."""
    pass

class ProcessingError(FinanceIngestionError):
    """Message processing related errors."""
    pass

class StorageError(FinanceIngestionError):
    """Storage operation related errors."""
    pass

class ValidationError(FinanceIngestionError):
    """Message validation related errors."""
    pass
```

### Error Handling Example

```python
import logging
from finance_ingestion.exceptions import ConnectionError, ProcessingError

logger = logging.getLogger(__name__)

async def robust_message_processing():
    try:
        # Connect to WebSocket
        await connection_manager.connect("wss://feed.example.com")
        
        # Process messages
        async for message in connection_manager.receive_messages():
            try:
                result = await processor.process_message(message)
                await storage.store_realtime(result.parsed_message)
                
            except ProcessingError as e:
                logger.error(f"Processing failed: {e}", extra={
                    "message_id": getattr(e, 'message_id', None),
                    "error_type": "processing"
                })
                # Continue processing other messages
                
            except StorageError as e:
                logger.error(f"Storage failed: {e}", extra={
                    "error_type": "storage"
                })
                # Implement retry logic or fallback storage
                
    except ConnectionError as e:
        logger.error(f"Connection failed: {e}", extra={
            "error_type": "connection"
        })
        # Implement reconnection logic
        await asyncio.sleep(1)
        # Retry connection...
```

## Testing

### Unit Test Example

```python
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from finance_ingestion.processor import MessageProcessor, ProcessorConfig

@pytest.mark.asyncio
async def test_message_processing():
    """Test basic message processing functionality."""
    
    config = ProcessorConfig(
        batch_size=10,
        max_latency_ms=1.0,
        validate_messages=True
    )
    
    processor = MessageProcessor(config)
    
    # Test valid message
    valid_message = b'{"messageId": "test_123", "symbol": "AAPL", "price": 150.25}'
    result = await processor.process_message(valid_message)
    
    assert result.success is True
    assert result.parsed_message.symbol == "AAPL"
    assert result.latency_ms < 1.0
    
    # Test invalid message
    invalid_message = b'{"invalid": "json"}'
    result = await processor.process_message(invalid_message)
    
    assert result.success is False
    assert "validation" in result.error.lower()

@pytest.mark.asyncio
async def test_batch_processing():
    """Test batch processing performance."""
    
    config = ProcessorConfig(batch_size=100, enable_batching=True)
    processor = MessageProcessor(config)
    
    # Generate test messages
    messages = [
        b'{"messageId": "test_%d", "symbol": "AAPL", "price": 150.25}' % i
        for i in range(100)
    ]
    
    # Process batch
    results = await processor.process_batch(messages)
    
    assert len(results) == 100
    assert all(r.success for r in results)
    
    # Check performance
    avg_latency = sum(r.latency_ms for r in results) / len(results)
    assert avg_latency < 0.1  # Should be very fast for test data
```

## Performance Optimization

### Async Best Practices

```python
import asyncio
import uvloop
from concurrent.futures import ThreadPoolExecutor

# Use uvloop for better performance
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

class OptimizedProcessor:
    def __init__(self):
        # Use thread pool for CPU-intensive tasks
        self.thread_pool = ThreadPoolExecutor(max_workers=4)
        
        # Pre-allocate buffers
        self.message_buffer = bytearray(1024 * 1024)  # 1MB buffer
        
    async def process_cpu_intensive_task(self, data):
        """Offload CPU-intensive work to thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.thread_pool, 
            self._cpu_intensive_work, 
            data
        )
    
    def _cpu_intensive_work(self, data):
        """CPU-intensive work that runs in thread pool."""
        # Complex calculations, parsing, etc.
        return processed_data
```

### Memory Optimization

```python
import gc
from typing import List
import msgpack

class MemoryOptimizedStorage:
    def __init__(self):
        # Use __slots__ to reduce memory overhead
        self.__slots__ = ['_buffer', '_size', '_capacity']
        
        self._buffer: List[bytes] = []
        self._size = 0
        self._capacity = 10000
    
    def add_message(self, message: bytes) -> None:
        """Add message with memory management."""
        if self._size >= self._capacity:
            # Remove oldest messages
            self._buffer = self._buffer[self._capacity // 2:]
            self._size = len(self._buffer)
            
            # Force garbage collection
            gc.collect()
        
        self._buffer.append(message)
        self._size += 1
    
    def serialize_efficiently(self, data: dict) -> bytes:
        """Use MessagePack for efficient serialization."""
        return msgpack.packb(data, use_bin_type=True)
```

This completes the Python API reference documentation. The documentation provides comprehensive coverage of all major classes, configuration options, usage examples, and best practices for the Python implementation.