"""
High-performance message processor for financial data ingestion.

This module implements the core message processing engine with:
- MessagePack serialization for high performance
- End-to-end latency measurement using time.perf_counter_ns
- Adaptive batching for backpressure handling
- Message validation and error handling
"""

import asyncio
import time
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from collections import deque
import msgpack
from enum import Enum

from .exceptions import MessageProcessingError, ValidationError, BackpressureError
from .logging import get_logger


class MessageType(Enum):
    """Supported market data message types."""
    TRADE = "TRADE"
    QUOTE = "QUOTE"
    BOOK_UPDATE = "BOOK_UPDATE"


class Side(Enum):
    """Trade/quote side enumeration."""
    BUY = "BUY"
    SELL = "SELL"


@dataclass
class MarketData:
    """Market data message structure."""
    message_id: str
    timestamp: int  # nanoseconds
    symbol: str
    message_type: MessageType
    price: float
    quantity: float
    side: Side
    exchange: str
    sequence_number: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'messageId': self.message_id,
            'timestamp': self.timestamp,
            'symbol': self.symbol,
            'messageType': self.message_type.value,
            'data': {
                'price': self.price,
                'quantity': self.quantity,
                'side': self.side.value,
                'exchange': self.exchange
            },
            'sequenceNumber': self.sequence_number
        }


@dataclass
class ProcessingResult:
    """Result of message processing operation."""
    success: bool
    message_id: str
    processing_latency_ns: int
    error: Optional[str] = None
    market_data: Optional[MarketData] = None


@dataclass
class LatencyStats:
    """Latency statistics tracking."""
    p50: float = 0.0
    p95: float = 0.0
    p99: float = 0.0
    p999: float = 0.0
    min_latency: float = float('inf')
    max_latency: float = 0.0
    total_messages: int = 0
    
    def update(self, latency_ns: int) -> None:
        """Update statistics with new latency measurement."""
        latency_ms = latency_ns / 1_000_000  # Convert to milliseconds
        self.min_latency = min(self.min_latency, latency_ms)
        self.max_latency = max(self.max_latency, latency_ms)
        self.total_messages += 1


@dataclass
class ThroughputStats:
    """Throughput statistics tracking."""
    messages_per_second: float = 0.0
    bytes_per_second: float = 0.0
    total_messages: int = 0
    total_bytes: int = 0
    start_time: float = field(default_factory=time.time)
    
    def update(self, message_size_bytes: int) -> None:
        """Update throughput statistics."""
        self.total_messages += 1
        self.total_bytes += message_size_bytes
        
        elapsed = time.time() - self.start_time
        if elapsed > 0:
            self.messages_per_second = self.total_messages / elapsed
            self.bytes_per_second = self.total_bytes / elapsed


class MessageProcessor:
    """
    High-performance message processor for financial market data.
    
    Features:
    - MessagePack serialization for optimal performance
    - Nanosecond precision latency measurement
    - Adaptive batching for backpressure handling
    - Comprehensive validation and error handling
    """
    
    def __init__(self, 
                 max_batch_size: int = 1000,
                 batch_timeout_ms: int = 10,
                 max_queue_size: int = 10000,
                 enable_validation: bool = True):
        """
        Initialize the message processor.
        
        Args:
            max_batch_size: Maximum messages per batch for backpressure handling
            batch_timeout_ms: Maximum time to wait for batch completion
            max_queue_size: Maximum queue size before applying backpressure
            enable_validation: Whether to enable message validation
        """
        self.max_batch_size = max_batch_size
        self.batch_timeout_ms = batch_timeout_ms
        self.max_queue_size = max_queue_size
        self.enable_validation = enable_validation
        
        # Statistics tracking
        self.latency_stats = LatencyStats()
        self.throughput_stats = ThroughputStats()
        self.latency_samples = deque(maxlen=10000)  # Keep last 10k samples for percentiles
        
        # Processing queue and batch management
        self.processing_queue = asyncio.Queue(maxsize=max_queue_size)
        self.current_batch = []
        self.batch_start_time = None
        
        # Error tracking
        self.error_count = 0
        self.validation_errors = 0
        self.processing_errors = 0
        
        self.logger = get_logger(__name__)
        self.logger.info(f"MessageProcessor initialized with batch_size={max_batch_size}, "
                        f"timeout={batch_timeout_ms}ms, queue_size={max_queue_size}")
    
    async def process_message(self, message: bytes) -> ProcessingResult:
        """
        Process a single market data message.
        
        Args:
            message: Raw message bytes (MessagePack encoded)
            
        Returns:
            ProcessingResult with processing outcome and metrics
        """
        start_time = time.perf_counter_ns()
        
        try:
            # Deserialize message using MessagePack
            raw_data = msgpack.unpackb(message, raw=False, strict_map_key=False)
            
            # Validate message structure if enabled
            if self.enable_validation:
                self._validate_message(raw_data)
            
            # Parse into MarketData object
            market_data = self._parse_market_data(raw_data)
            
            # Calculate processing latency
            end_time = time.perf_counter_ns()
            processing_latency = end_time - start_time
            
            # Update statistics
            self._update_stats(processing_latency, len(message))
            
            result = ProcessingResult(
                success=True,
                message_id=market_data.message_id,
                processing_latency_ns=processing_latency,
                market_data=market_data
            )
            
            self.logger.debug(f"Processed message {market_data.message_id} in "
                            f"{processing_latency / 1_000_000:.3f}ms")
            
            return result
            
        except ValidationError as e:
            self.validation_errors += 1
            self.error_count += 1
            self.logger.warning(f"Message validation failed: {e}")
            
            return ProcessingResult(
                success=False,
                message_id="unknown",
                processing_latency_ns=time.perf_counter_ns() - start_time,
                error=f"Validation error: {str(e)}"
            )
            
        except Exception as e:
            self.processing_errors += 1
            self.error_count += 1
            self.logger.error(f"Message processing failed: {e}")
            
            return ProcessingResult(
                success=False,
                message_id="unknown", 
                processing_latency_ns=time.perf_counter_ns() - start_time,
                error=f"Processing error: {str(e)}"
            )
    
    async def process_batch(self, messages: List[bytes]) -> List[ProcessingResult]:
        """
        Process a batch of messages for improved throughput.
        
        Args:
            messages: List of raw message bytes
            
        Returns:
            List of ProcessingResult objects
        """
        if not messages:
            return []
        
        batch_start = time.perf_counter_ns()
        results = []
        
        # Process messages concurrently within the batch
        tasks = [self.process_message(msg) for msg in messages]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions from concurrent processing
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.processing_errors += 1
                self.error_count += 1
                processed_results.append(ProcessingResult(
                    success=False,
                    message_id=f"batch_{i}",
                    processing_latency_ns=time.perf_counter_ns() - batch_start,
                    error=f"Batch processing error: {str(result)}"
                ))
            else:
                processed_results.append(result)
        
        batch_latency = time.perf_counter_ns() - batch_start
        self.logger.debug(f"Processed batch of {len(messages)} messages in "
                         f"{batch_latency / 1_000_000:.3f}ms")
        
        return processed_results
    
    async def handle_backpressure(self) -> None:
        """
        Handle backpressure by implementing adaptive batching.
        
        This method monitors queue depth and adjusts batch sizes dynamically
        to maintain optimal throughput under varying load conditions.
        """
        queue_size = self.processing_queue.qsize()
        queue_utilization = queue_size / self.max_queue_size
        
        if queue_utilization > 0.8:  # High load - increase batch size
            new_batch_size = min(self.max_batch_size * 2, 2000)
            self.logger.warning(f"High queue utilization ({queue_utilization:.2f}), "
                              f"increasing batch size to {new_batch_size}")
            self.max_batch_size = new_batch_size
            
        elif queue_utilization < 0.2:  # Low load - decrease batch size
            new_batch_size = max(self.max_batch_size // 2, 100)
            self.logger.info(f"Low queue utilization ({queue_utilization:.2f}), "
                           f"decreasing batch size to {new_batch_size}")
            self.max_batch_size = new_batch_size
        
        # If queue is full, apply backpressure
        if queue_size >= self.max_queue_size:
            self.logger.error(f"Queue full ({queue_size}/{self.max_queue_size}), "
                            "applying backpressure")
            raise BackpressureError(f"Processing queue full: {queue_size}/{self.max_queue_size}")
    
    def _validate_message(self, data: Dict[str, Any]) -> None:
        """
        Validate message structure and required fields.
        
        Args:
            data: Parsed message data
            
        Raises:
            ValidationError: If message validation fails
        """
        required_fields = ['messageId', 'timestamp', 'symbol', 'messageType', 'data', 'sequenceNumber']
        
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate message type
        if data['messageType'] not in [mt.value for mt in MessageType]:
            raise ValidationError(f"Invalid message type: {data['messageType']}")
        
        # Validate data section
        data_section = data['data']
        required_data_fields = ['price', 'quantity', 'side', 'exchange']
        
        for field in required_data_fields:
            if field not in data_section:
                raise ValidationError(f"Missing required data field: {field}")
        
        # Validate side
        if data_section['side'] not in [s.value for s in Side]:
            raise ValidationError(f"Invalid side: {data_section['side']}")
        
        # Validate numeric fields
        if not isinstance(data_section['price'], (int, float)) or data_section['price'] <= 0:
            raise ValidationError(f"Invalid price: {data_section['price']}")
        
        if not isinstance(data_section['quantity'], (int, float)) or data_section['quantity'] <= 0:
            raise ValidationError(f"Invalid quantity: {data_section['quantity']}")
    
    def _parse_market_data(self, data: Dict[str, Any]) -> MarketData:
        """
        Parse validated message data into MarketData object.
        
        Args:
            data: Validated message data
            
        Returns:
            MarketData object
        """
        data_section = data['data']
        
        return MarketData(
            message_id=data['messageId'],
            timestamp=data['timestamp'],
            symbol=data['symbol'],
            message_type=MessageType(data['messageType']),
            price=float(data_section['price']),
            quantity=float(data_section['quantity']),
            side=Side(data_section['side']),
            exchange=data_section['exchange'],
            sequence_number=data['sequenceNumber']
        )
    
    def _update_stats(self, latency_ns: int, message_size: int) -> None:
        """
        Update processing statistics.
        
        Args:
            latency_ns: Processing latency in nanoseconds
            message_size: Message size in bytes
        """
        # Update latency statistics
        self.latency_stats.update(latency_ns)
        self.latency_samples.append(latency_ns / 1_000_000)  # Store as milliseconds
        
        # Update throughput statistics
        self.throughput_stats.update(message_size)
        
        # Calculate percentiles from recent samples
        if len(self.latency_samples) >= 100:  # Need minimum samples for meaningful percentiles
            sorted_samples = sorted(self.latency_samples)
            n = len(sorted_samples)
            
            self.latency_stats.p50 = sorted_samples[int(n * 0.50)]
            self.latency_stats.p95 = sorted_samples[int(n * 0.95)]
            self.latency_stats.p99 = sorted_samples[int(n * 0.99)]
            self.latency_stats.p999 = sorted_samples[int(n * 0.999)]
    
    def get_latency_stats(self) -> LatencyStats:
        """Get current latency statistics."""
        return self.latency_stats
    
    def get_throughput_stats(self) -> ThroughputStats:
        """Get current throughput statistics."""
        return self.throughput_stats
    
    def get_error_stats(self) -> Dict[str, int]:
        """Get error statistics."""
        return {
            'total_errors': self.error_count,
            'validation_errors': self.validation_errors,
            'processing_errors': self.processing_errors
        }
    
    def reset_stats(self) -> None:
        """Reset all statistics counters."""
        self.latency_stats = LatencyStats()
        self.throughput_stats = ThroughputStats()
        self.latency_samples.clear()
        self.error_count = 0
        self.validation_errors = 0
        self.processing_errors = 0
        self.logger.info("Statistics reset")