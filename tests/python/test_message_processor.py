"""
Unit tests for the Python message processor.

Tests cover:
- Message processing logic and validation
- Latency measurement accuracy
- Backpressure handling mechanisms
- Error handling and statistics tracking
- Batch processing functionality
"""

import asyncio
import pytest
import msgpack
import time
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any

# Import the classes we're testing
from finance_ingestion.message_processor import (
    MessageProcessor,
    MarketData,
    ProcessingResult,
    LatencyStats,
    ThroughputStats,
    MessageType,
    Side
)
from finance_ingestion.exceptions import (
    ValidationError,
    BackpressureError,
    ProcessingError
)


class TestMessageProcessor:
    """Test suite for MessageProcessor class."""
    
    @pytest.fixture
    def processor(self):
        """Create a MessageProcessor instance for testing."""
        return MessageProcessor(
            max_batch_size=100,
            batch_timeout_ms=10,
            max_queue_size=1000,
            enable_validation=True
        )
    
    @pytest.fixture
    def valid_message_data(self) -> Dict[str, Any]:
        """Create valid message data for testing."""
        return {
            'messageId': 'test-msg-001',
            'timestamp': int(time.time_ns()),
            'symbol': 'AAPL',
            'messageType': 'TRADE',
            'data': {
                'price': 150.25,
                'quantity': 100.0,
                'side': 'BUY',
                'exchange': 'NASDAQ'
            },
            'sequenceNumber': 12345
        }
    
    @pytest.fixture
    def valid_message_bytes(self, valid_message_data) -> bytes:
        """Create valid MessagePack encoded message bytes."""
        return msgpack.packb(valid_message_data)
    
    @pytest.fixture
    def invalid_message_data(self) -> Dict[str, Any]:
        """Create invalid message data for testing validation."""
        return {
            'messageId': 'test-msg-002',
            'timestamp': int(time.time_ns()),
            'symbol': 'AAPL',
            'messageType': 'INVALID_TYPE',  # Invalid message type
            'data': {
                'price': -150.25,  # Invalid negative price
                'quantity': 100.0,
                'side': 'INVALID_SIDE',  # Invalid side
                'exchange': 'NASDAQ'
            },
            'sequenceNumber': 12346
        }


class TestMessageProcessing:
    """Test message processing functionality."""
    
    @pytest.mark.asyncio
    async def test_process_valid_message_success(self, processor, valid_message_bytes, valid_message_data):
        """Test successful processing of a valid message."""
        result = await processor.process_message(valid_message_bytes)
        
        assert result.success is True
        assert result.message_id == valid_message_data['messageId']
        assert result.processing_latency_ns > 0
        assert result.error is None
        assert result.market_data is not None
        
        # Verify market data parsing
        market_data = result.market_data
        assert market_data.message_id == valid_message_data['messageId']
        assert market_data.symbol == valid_message_data['symbol']
        assert market_data.message_type == MessageType.TRADE
        assert market_data.price == valid_message_data['data']['price']
        assert market_data.quantity == valid_message_data['data']['quantity']
        assert market_data.side == Side.BUY
        assert market_data.exchange == valid_message_data['data']['exchange']
    
    @pytest.mark.asyncio
    async def test_process_invalid_message_validation_error(self, processor, invalid_message_data):
        """Test processing of invalid message triggers validation error."""
        invalid_bytes = msgpack.packb(invalid_message_data)
        result = await processor.process_message(invalid_bytes)
        
        assert result.success is False
        assert result.message_id == "unknown"
        assert result.processing_latency_ns > 0
        assert "Validation error" in result.error
        assert result.market_data is None
        
        # Check error statistics
        error_stats = processor.get_error_stats()
        assert error_stats['validation_errors'] == 1
        assert error_stats['total_errors'] == 1
    
    @pytest.mark.asyncio
    async def test_process_malformed_message_processing_error(self, processor):
        """Test processing of malformed message triggers processing error."""
        malformed_bytes = b"invalid msgpack data"
        result = await processor.process_message(malformed_bytes)
        
        assert result.success is False
        assert result.message_id == "unknown"
        assert result.processing_latency_ns > 0
        assert "Processing error" in result.error
        assert result.market_data is None
        
        # Check error statistics
        error_stats = processor.get_error_stats()
        assert error_stats['processing_errors'] == 1
        assert error_stats['total_errors'] == 1
    
    @pytest.mark.asyncio
    async def test_process_message_with_validation_disabled(self, invalid_message_data):
        """Test processing with validation disabled accepts invalid data."""
        processor = MessageProcessor(enable_validation=False)
        invalid_bytes = msgpack.packb(invalid_message_data)
        
        # Should not raise validation error but may fail during parsing
        result = await processor.process_message(invalid_bytes)
        
        # The result depends on whether parsing fails or succeeds
        # If parsing fails due to invalid enum values, it should be a processing error
        if not result.success:
            assert "Processing error" in result.error
        else:
            # If it somehow succeeds, verify the data was processed
            assert result.market_data is not None


class TestLatencyMeasurement:
    """Test latency measurement accuracy."""
    
    @pytest.mark.asyncio
    async def test_latency_measurement_accuracy(self, processor, valid_message_bytes):
        """Test that latency measurements are accurate and consistent."""
        # Process multiple messages and verify latency measurements
        results = []
        for _ in range(10):
            result = await processor.process_message(valid_message_bytes)
            results.append(result)
        
        # All results should be successful
        assert all(r.success for r in results)
        
        # All latency measurements should be positive and reasonable (< 10ms for simple processing)
        latencies = [r.processing_latency_ns for r in results]
        assert all(lat > 0 for lat in latencies)
        assert all(lat < 10_000_000 for lat in latencies)  # Less than 10ms
        
        # Verify statistics are updated
        stats = processor.get_latency_stats()
        assert stats.total_messages == 10
        assert stats.min_latency > 0
        assert stats.max_latency > 0
        assert stats.min_latency <= stats.max_latency
    
    @pytest.mark.asyncio
    async def test_latency_percentiles_calculation(self, processor, valid_message_bytes):
        """Test that latency percentiles are calculated correctly."""
        # Process enough messages to trigger percentile calculation
        for _ in range(150):  # More than the minimum 100 samples
            await processor.process_message(valid_message_bytes)
        
        stats = processor.get_latency_stats()
        
        # Verify percentiles are calculated and in correct order
        assert stats.p50 > 0
        assert stats.p95 > 0
        assert stats.p99 > 0
        assert stats.p999 > 0
        assert stats.p50 <= stats.p95 <= stats.p99 <= stats.p999
    
    @pytest.mark.asyncio
    async def test_latency_measurement_with_artificial_delay(self, processor, valid_message_bytes):
        """Test latency measurement with artificial processing delay."""
        # Mock the msgpack.unpackb to add artificial delay
        original_unpackb = msgpack.unpackb
        
        def delayed_unpackb(*args, **kwargs):
            time.sleep(0.001)  # 1ms delay
            return original_unpackb(*args, **kwargs)
        
        with patch('msgpack.unpackb', side_effect=delayed_unpackb):
            result = await processor.process_message(valid_message_bytes)
        
        # Latency should reflect the added delay (should be > 1ms)
        assert result.processing_latency_ns > 1_000_000  # > 1ms
        assert result.success is True


class TestBackpressureHandling:
    """Test backpressure handling mechanisms."""
    
    @pytest.mark.asyncio
    async def test_backpressure_queue_full(self):
        """Test backpressure handling when queue is full."""
        processor = MessageProcessor(max_queue_size=5)
        
        # Fill the queue beyond capacity
        for _ in range(6):
            processor.processing_queue.put_nowait(b"dummy")
        
        # Should raise BackpressureError
        with pytest.raises(BackpressureError) as exc_info:
            await processor.handle_backpressure()
        
        assert "Processing queue full" in str(exc_info.value)
        assert "5/5" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_backpressure_adaptive_batching_high_load(self):
        """Test adaptive batching increases batch size under high load."""
        processor = MessageProcessor(max_batch_size=100, max_queue_size=100)
        
        # Simulate high queue utilization (> 80%)
        for _ in range(85):
            processor.processing_queue.put_nowait(b"dummy")
        
        original_batch_size = processor.max_batch_size
        await processor.handle_backpressure()
        
        # Batch size should increase
        assert processor.max_batch_size > original_batch_size
        assert processor.max_batch_size <= 2000  # Should not exceed maximum
    
    @pytest.mark.asyncio
    async def test_backpressure_adaptive_batching_low_load(self):
        """Test adaptive batching decreases batch size under low load."""
        processor = MessageProcessor(max_batch_size=1000, max_queue_size=1000)
        
        # Simulate low queue utilization (< 20%)
        for _ in range(10):
            processor.processing_queue.put_nowait(b"dummy")
        
        original_batch_size = processor.max_batch_size
        await processor.handle_backpressure()
        
        # Batch size should decrease
        assert processor.max_batch_size < original_batch_size
        assert processor.max_batch_size >= 100  # Should not go below minimum


class TestBatchProcessing:
    """Test batch processing functionality."""
    
    @pytest.mark.asyncio
    async def test_process_batch_success(self, processor, valid_message_bytes):
        """Test successful batch processing."""
        messages = [valid_message_bytes] * 5
        results = await processor.process_batch(messages)
        
        assert len(results) == 5
        assert all(r.success for r in results)
        assert all(r.processing_latency_ns > 0 for r in results)
    
    @pytest.mark.asyncio
    async def test_process_empty_batch(self, processor):
        """Test processing empty batch returns empty results."""
        results = await processor.process_batch([])
        assert results == []
        
        results = await processor.process_batch(None)
        assert results == []
    
    @pytest.mark.asyncio
    async def test_process_batch_with_mixed_results(self, processor, valid_message_bytes):
        """Test batch processing with both valid and invalid messages."""
        messages = [
            valid_message_bytes,
            b"invalid msgpack",
            valid_message_bytes,
            b"another invalid"
        ]
        
        results = await processor.process_batch(messages)
        
        assert len(results) == 4
        assert results[0].success is True
        assert results[1].success is False
        assert results[2].success is True
        assert results[3].success is False
        
        # Check error statistics
        error_stats = processor.get_error_stats()
        assert error_stats['processing_errors'] == 2
        assert error_stats['total_errors'] == 2
    
    @pytest.mark.asyncio
    async def test_process_batch_concurrent_processing(self, processor, valid_message_bytes):
        """Test that batch processing handles concurrent message processing."""
        # Create a large batch to test concurrency
        messages = [valid_message_bytes] * 50
        
        start_time = time.perf_counter()
        results = await processor.process_batch(messages)
        end_time = time.perf_counter()
        
        # All messages should be processed successfully
        assert len(results) == 50
        assert all(r.success for r in results)
        
        # Batch processing should be faster than sequential processing
        # (This is a rough check - actual performance depends on system)
        batch_time = end_time - start_time
        assert batch_time < 1.0  # Should complete within 1 second


class TestStatisticsTracking:
    """Test statistics tracking functionality."""
    
    @pytest.mark.asyncio
    async def test_latency_stats_tracking(self, processor, valid_message_bytes):
        """Test latency statistics are tracked correctly."""
        # Process several messages
        for _ in range(10):
            await processor.process_message(valid_message_bytes)
        
        stats = processor.get_latency_stats()
        assert stats.total_messages == 10
        assert stats.min_latency > 0
        assert stats.max_latency >= stats.min_latency
    
    @pytest.mark.asyncio
    async def test_throughput_stats_tracking(self, processor, valid_message_bytes):
        """Test throughput statistics are tracked correctly."""
        # Process messages with small delay to allow throughput calculation
        for _ in range(5):
            await processor.process_message(valid_message_bytes)
            await asyncio.sleep(0.001)  # Small delay
        
        stats = processor.get_throughput_stats()
        assert stats.total_messages == 5
        assert stats.total_bytes > 0
        assert stats.messages_per_second > 0
        assert stats.bytes_per_second > 0
    
    @pytest.mark.asyncio
    async def test_error_stats_tracking(self, processor):
        """Test error statistics are tracked correctly."""
        # Process valid and invalid messages
        valid_data = {
            'messageId': 'test-001',
            'timestamp': int(time.time_ns()),
            'symbol': 'AAPL',
            'messageType': 'TRADE',
            'data': {
                'price': 150.25,
                'quantity': 100.0,
                'side': 'BUY',
                'exchange': 'NASDAQ'
            },
            'sequenceNumber': 1
        }
        
        invalid_data = {**valid_data, 'messageType': 'INVALID'}
        
        # Process valid message
        await processor.process_message(msgpack.packb(valid_data))
        
        # Process invalid message (validation error)
        await processor.process_message(msgpack.packb(invalid_data))
        
        # Process malformed message (processing error)
        await processor.process_message(b"invalid")
        
        error_stats = processor.get_error_stats()
        assert error_stats['total_errors'] == 2
        assert error_stats['validation_errors'] == 1
        assert error_stats['processing_errors'] == 1
    
    def test_reset_stats(self, processor):
        """Test statistics reset functionality."""
        # Manually set some statistics
        processor.latency_stats.total_messages = 10
        processor.throughput_stats.total_messages = 5
        processor.error_count = 3
        processor.validation_errors = 1
        processor.processing_errors = 2
        
        # Reset statistics
        processor.reset_stats()
        
        # Verify all statistics are reset
        assert processor.latency_stats.total_messages == 0
        assert processor.throughput_stats.total_messages == 0
        assert processor.error_count == 0
        assert processor.validation_errors == 0
        assert processor.processing_errors == 0
        assert len(processor.latency_samples) == 0


class TestMessageValidation:
    """Test message validation functionality."""
    
    @pytest.mark.asyncio
    async def test_validate_missing_required_fields(self, processor):
        """Test validation fails for missing required fields."""
        incomplete_data = {
            'messageId': 'test-001',
            # Missing timestamp, symbol, messageType, data, sequenceNumber
        }
        
        result = await processor.process_message(msgpack.packb(incomplete_data))
        assert result.success is False
        assert "Missing required field" in result.error
    
    @pytest.mark.asyncio
    async def test_validate_invalid_message_type(self, processor):
        """Test validation fails for invalid message type."""
        invalid_data = {
            'messageId': 'test-001',
            'timestamp': int(time.time_ns()),
            'symbol': 'AAPL',
            'messageType': 'INVALID_TYPE',
            'data': {
                'price': 150.25,
                'quantity': 100.0,
                'side': 'BUY',
                'exchange': 'NASDAQ'
            },
            'sequenceNumber': 1
        }
        
        result = await processor.process_message(msgpack.packb(invalid_data))
        assert result.success is False
        assert "Invalid message type" in result.error
    
    @pytest.mark.asyncio
    async def test_validate_invalid_side(self, processor):
        """Test validation fails for invalid side."""
        invalid_data = {
            'messageId': 'test-001',
            'timestamp': int(time.time_ns()),
            'symbol': 'AAPL',
            'messageType': 'TRADE',
            'data': {
                'price': 150.25,
                'quantity': 100.0,
                'side': 'INVALID_SIDE',
                'exchange': 'NASDAQ'
            },
            'sequenceNumber': 1
        }
        
        result = await processor.process_message(msgpack.packb(invalid_data))
        assert result.success is False
        assert "Invalid side" in result.error
    
    @pytest.mark.asyncio
    async def test_validate_invalid_price_quantity(self, processor):
        """Test validation fails for invalid price and quantity."""
        # Test negative price
        invalid_price_data = {
            'messageId': 'test-001',
            'timestamp': int(time.time_ns()),
            'symbol': 'AAPL',
            'messageType': 'TRADE',
            'data': {
                'price': -150.25,  # Invalid negative price
                'quantity': 100.0,
                'side': 'BUY',
                'exchange': 'NASDAQ'
            },
            'sequenceNumber': 1
        }
        
        result = await processor.process_message(msgpack.packb(invalid_price_data))
        assert result.success is False
        assert "Invalid price" in result.error
        
        # Test zero quantity
        invalid_quantity_data = {
            'messageId': 'test-002',
            'timestamp': int(time.time_ns()),
            'symbol': 'AAPL',
            'messageType': 'TRADE',
            'data': {
                'price': 150.25,
                'quantity': 0.0,  # Invalid zero quantity
                'side': 'BUY',
                'exchange': 'NASDAQ'
            },
            'sequenceNumber': 2
        }
        
        result = await processor.process_message(msgpack.packb(invalid_quantity_data))
        assert result.success is False
        assert "Invalid quantity" in result.error


class TestMarketDataModel:
    """Test MarketData model functionality."""
    
    def test_market_data_creation(self):
        """Test MarketData object creation and properties."""
        market_data = MarketData(
            message_id="test-001",
            timestamp=1234567890123456789,
            symbol="AAPL",
            message_type=MessageType.TRADE,
            price=150.25,
            quantity=100.0,
            side=Side.BUY,
            exchange="NASDAQ",
            sequence_number=12345
        )
        
        assert market_data.message_id == "test-001"
        assert market_data.timestamp == 1234567890123456789
        assert market_data.symbol == "AAPL"
        assert market_data.message_type == MessageType.TRADE
        assert market_data.price == 150.25
        assert market_data.quantity == 100.0
        assert market_data.side == Side.BUY
        assert market_data.exchange == "NASDAQ"
        assert market_data.sequence_number == 12345
    
    def test_market_data_to_dict(self):
        """Test MarketData to_dict conversion."""
        market_data = MarketData(
            message_id="test-001",
            timestamp=1234567890123456789,
            symbol="AAPL",
            message_type=MessageType.QUOTE,
            price=150.25,
            quantity=100.0,
            side=Side.SELL,
            exchange="NASDAQ",
            sequence_number=12345
        )
        
        data_dict = market_data.to_dict()
        
        expected = {
            'messageId': 'test-001',
            'timestamp': 1234567890123456789,
            'symbol': 'AAPL',
            'messageType': 'QUOTE',
            'data': {
                'price': 150.25,
                'quantity': 100.0,
                'side': 'SELL',
                'exchange': 'NASDAQ'
            },
            'sequenceNumber': 12345
        }
        
        assert data_dict == expected


class TestProcessingResult:
    """Test ProcessingResult model functionality."""
    
    def test_processing_result_success(self):
        """Test ProcessingResult for successful processing."""
        market_data = MarketData(
            message_id="test-001",
            timestamp=1234567890123456789,
            symbol="AAPL",
            message_type=MessageType.TRADE,
            price=150.25,
            quantity=100.0,
            side=Side.BUY,
            exchange="NASDAQ",
            sequence_number=12345
        )
        
        result = ProcessingResult(
            success=True,
            message_id="test-001",
            processing_latency_ns=1500000,
            market_data=market_data
        )
        
        assert result.success is True
        assert result.message_id == "test-001"
        assert result.processing_latency_ns == 1500000
        assert result.error is None
        assert result.market_data == market_data
    
    def test_processing_result_failure(self):
        """Test ProcessingResult for failed processing."""
        result = ProcessingResult(
            success=False,
            message_id="unknown",
            processing_latency_ns=500000,
            error="Validation error: Invalid message type"
        )
        
        assert result.success is False
        assert result.message_id == "unknown"
        assert result.processing_latency_ns == 500000
        assert result.error == "Validation error: Invalid message type"
        assert result.market_data is None


if __name__ == "__main__":
    pytest.main([__file__])