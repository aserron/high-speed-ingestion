/**
 * Unit tests for the Node.js message processor.
 *
 * Tests cover:
 * - Message processing logic and validation
 * - Latency measurement accuracy
 * - Backpressure handling mechanisms
 * - Error handling and statistics tracking
 * - Batch processing functionality
 */

import { jest } from '@jest/globals'
import msgpack from 'msgpack5'
import {
  MessageProcessor,
  MarketData,
  ProcessingResult,
  LatencyStats,
  ThroughputStats,
  MessageType,
  Side
} from '../index.js'
import { BackpressureError } from '../../errors/index.js'

// Mock the config to avoid validation errors during tests
jest.mock('../../config/index.js', () => ({
  getConfig: jest.fn(() => ({
    app: {
      name: 'test-app',
      version: '1.0.0',
      environment: 'testing'
    },
    monitoring: {
      logLevel: 'info',
      logFormat: 'text'
    }
  }))
}))

// Mock the logger to avoid console output during tests
jest.mock('../../logging/index.js', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}))

describe('MessageProcessor', () => {
  let processor
  let msgpackCodec
  let validMessageData
  let validMessageBytes
  let invalidMessageData

  beforeEach(() => {
    processor = new MessageProcessor({
      maxBatchSize: 100,
      batchTimeoutMs: 10,
      maxQueueSize: 1000,
      enableValidation: true
    })

    msgpackCodec = msgpack()

    validMessageData = {
      messageId: 'test-msg-001',
      timestamp: Date.now() * 1000000, // Convert to nanoseconds
      symbol: 'AAPL',
      messageType: 'TRADE',
      data: {
        price: 150.25,
        quantity: 100.0,
        side: 'BUY',
        exchange: 'NASDAQ'
      },
      sequenceNumber: 12345
    }

    validMessageBytes = msgpackCodec.encode(validMessageData)

    invalidMessageData = {
      messageId: 'test-msg-002',
      timestamp: Date.now() * 1000000,
      symbol: 'AAPL',
      messageType: 'INVALID_TYPE', // Invalid message type
      data: {
        price: -150.25, // Invalid negative price
        quantity: 100.0,
        side: 'INVALID_SIDE', // Invalid side
        exchange: 'NASDAQ'
      },
      sequenceNumber: 12346
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Message Processing', () => {
    test('should successfully process valid message', async () => {
      const result = await processor.processMessage(validMessageBytes)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe(validMessageData.messageId)
      expect(result.processingLatencyNs).toBeGreaterThan(0)
      expect(result.error).toBeNull()
      expect(result.marketData).toBeDefined()

      // Verify market data parsing
      const marketData = result.marketData
      expect(marketData.messageId).toBe(validMessageData.messageId)
      expect(marketData.symbol).toBe(validMessageData.symbol)
      expect(marketData.messageType).toBe(MessageType.TRADE)
      expect(marketData.price).toBe(validMessageData.data.price)
      expect(marketData.quantity).toBe(validMessageData.data.quantity)
      expect(marketData.side).toBe(Side.BUY)
      expect(marketData.exchange).toBe(validMessageData.data.exchange)
    })

    test('should handle invalid message with validation error', async () => {
      const invalidBytes = msgpackCodec.encode(invalidMessageData)
      const result = await processor.processMessage(invalidBytes)

      expect(result.success).toBe(false)
      expect(result.messageId).toBe('unknown')
      expect(result.processingLatencyNs).toBeGreaterThan(0)
      expect(result.error).toContain('Validation error')
      expect(result.marketData).toBeNull()

      // Check error statistics
      const errorStats = processor.getErrorStats()
      expect(errorStats.validationErrors).toBe(1)
      expect(errorStats.totalErrors).toBe(1)
    })

    test('should handle malformed message with processing error', async () => {
      const malformedBytes = Buffer.from('invalid msgpack data')
      const result = await processor.processMessage(malformedBytes)

      expect(result.success).toBe(false)
      expect(result.messageId).toBe('unknown')
      expect(result.processingLatencyNs).toBeGreaterThan(0)
      expect(result.error).toContain('Processing error')
      expect(result.marketData).toBeNull()

      // Check error statistics
      const errorStats = processor.getErrorStats()
      expect(errorStats.processingErrors).toBe(1)
      expect(errorStats.totalErrors).toBe(1)
    })

    test('should process message with validation disabled', async () => {
      const processorNoValidation = new MessageProcessor({ enableValidation: false })
      const invalidBytes = msgpackCodec.encode(invalidMessageData)

      // Should not raise validation error but may fail during parsing
      const result = await processorNoValidation.processMessage(invalidBytes)

      // The result depends on whether parsing fails or succeeds
      // If parsing fails due to invalid enum values, it should be a processing error
      if (!result.success) {
        expect(result.error).toContain('Processing error')
      } else {
        // If it somehow succeeds, verify the data was processed
        expect(result.marketData).toBeDefined()
      }
    })
  })

  describe('Latency Measurement', () => {
    test('should measure latency accurately and consistently', async () => {
      const results = []

      // Process multiple messages and verify latency measurements
      for (let i = 0; i < 10; i++) {
        const result = await processor.processMessage(validMessageBytes)
        results.push(result)
      }

      // All results should be successful
      expect(results.every((r) => r.success)).toBe(true)

      // All latency measurements should be positive and reasonable (< 10ms for simple processing)
      const latencies = results.map((r) => r.processingLatencyNs)
      expect(latencies.every((lat) => lat > 0)).toBe(true)
      expect(latencies.every((lat) => lat < 10_000_000)).toBe(true) // Less than 10ms

      // Verify statistics are updated
      const stats = processor.getLatencyStats()
      expect(stats.totalMessages).toBe(10)
      expect(stats.minLatency).toBeGreaterThan(0)
      expect(stats.maxLatency).toBeGreaterThan(0)
      expect(stats.minLatency).toBeLessThanOrEqual(stats.maxLatency)
    })

    test('should calculate latency percentiles correctly', async () => {
      // Process enough messages to trigger percentile calculation
      for (let i = 0; i < 150; i++) {
        // More than the minimum 100 samples
        await processor.processMessage(validMessageBytes)
      }

      const stats = processor.getLatencyStats()

      // Verify percentiles are calculated and in correct order
      expect(stats.p50).toBeGreaterThan(0)
      expect(stats.p95).toBeGreaterThan(0)
      expect(stats.p99).toBeGreaterThan(0)
      expect(stats.p999).toBeGreaterThan(0)
      expect(stats.p50).toBeLessThanOrEqual(stats.p95)
      expect(stats.p95).toBeLessThanOrEqual(stats.p99)
      expect(stats.p99).toBeLessThanOrEqual(stats.p999)
    })

    test('should measure latency with artificial delay', async () => {
      // Mock the msgpack decode to add artificial delay
      const originalDecode = processor.msgpack.decode
      processor.msgpack.decode = jest.fn((data) => {
        // Add 1ms delay
        const start = Date.now()
        while (Date.now() - start < 1) {
          // Busy wait for 1ms
        }
        return originalDecode.call(processor.msgpack, data)
      })

      const result = await processor.processMessage(validMessageBytes)

      // Latency should reflect the added delay (should be > 1ms)
      expect(result.processingLatencyNs).toBeGreaterThan(1_000_000) // > 1ms
      expect(result.success).toBe(true)

      // Restore original method
      processor.msgpack.decode = originalDecode
    })
  })

  describe('Backpressure Handling', () => {
    test('should handle backpressure when queue is full', async () => {
      const smallQueueProcessor = new MessageProcessor({ maxQueueSize: 5 })

      // Fill the queue beyond capacity
      for (let i = 0; i < 6; i++) {
        smallQueueProcessor.processingQueue.push(Buffer.from('dummy'))
      }

      // Should throw BackpressureError
      await expect(smallQueueProcessor.handleBackpressure()).rejects.toThrow(BackpressureError)
      await expect(smallQueueProcessor.handleBackpressure()).rejects.toThrow(
        'Processing queue full'
      )
    })

    test('should increase batch size under high load', async () => {
      const highLoadProcessor = new MessageProcessor({ maxBatchSize: 100, maxQueueSize: 100 })

      // Simulate high queue utilization (> 80%)
      for (let i = 0; i < 85; i++) {
        highLoadProcessor.processingQueue.push(Buffer.from('dummy'))
      }

      const originalBatchSize = highLoadProcessor.maxBatchSize
      await highLoadProcessor.handleBackpressure()

      // Batch size should increase
      expect(highLoadProcessor.maxBatchSize).toBeGreaterThan(originalBatchSize)
      expect(highLoadProcessor.maxBatchSize).toBeLessThanOrEqual(2000) // Should not exceed maximum
    })

    test('should decrease batch size under low load', async () => {
      const lowLoadProcessor = new MessageProcessor({ maxBatchSize: 1000, maxQueueSize: 1000 })

      // Simulate low queue utilization (< 20%)
      for (let i = 0; i < 10; i++) {
        lowLoadProcessor.processingQueue.push(Buffer.from('dummy'))
      }

      const originalBatchSize = lowLoadProcessor.maxBatchSize
      await lowLoadProcessor.handleBackpressure()

      // Batch size should decrease
      expect(lowLoadProcessor.maxBatchSize).toBeLessThan(originalBatchSize)
      expect(lowLoadProcessor.maxBatchSize).toBeGreaterThanOrEqual(100) // Should not go below minimum
    })
  })

  describe('Batch Processing', () => {
    test('should process batch successfully', async () => {
      const messages = Array(5).fill(validMessageBytes)
      const results = await processor.processBatch(messages)

      expect(results).toHaveLength(5)
      expect(results.every((r) => r.success)).toBe(true)
      expect(results.every((r) => r.processingLatencyNs > 0)).toBe(true)
    })

    test('should handle empty batch', async () => {
      let results = await processor.processBatch([])
      expect(results).toEqual([])

      results = await processor.processBatch(null)
      expect(results).toEqual([])

      results = await processor.processBatch(undefined)
      expect(results).toEqual([])
    })

    test('should handle batch with mixed valid and invalid messages', async () => {
      const messages = [
        validMessageBytes,
        Buffer.from('invalid msgpack'),
        validMessageBytes,
        Buffer.from('another invalid')
      ]

      const results = await processor.processBatch(messages)

      expect(results).toHaveLength(4)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
      expect(results[3].success).toBe(false)

      // Check error statistics
      const errorStats = processor.getErrorStats()
      expect(errorStats.processingErrors).toBe(2)
      expect(errorStats.totalErrors).toBe(2)
    })

    test('should handle concurrent processing in batch', async () => {
      // Create a large batch to test concurrency
      const messages = Array(50).fill(validMessageBytes)

      const startTime = Date.now()
      const results = await processor.processBatch(messages)
      const endTime = Date.now()

      // All messages should be processed successfully
      expect(results).toHaveLength(50)
      expect(results.every((r) => r.success)).toBe(true)

      // Batch processing should complete within reasonable time
      const batchTime = endTime - startTime
      expect(batchTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Statistics Tracking', () => {
    test('should track latency statistics correctly', async () => {
      // Process several messages
      for (let i = 0; i < 10; i++) {
        await processor.processMessage(validMessageBytes)
      }

      const stats = processor.getLatencyStats()
      expect(stats.totalMessages).toBe(10)
      expect(stats.minLatency).toBeGreaterThan(0)
      expect(stats.maxLatency).toBeGreaterThanOrEqual(stats.minLatency)
    })

    test('should track throughput statistics correctly', async () => {
      // Process messages with small delay to allow throughput calculation
      for (let i = 0; i < 5; i++) {
        await processor.processMessage(validMessageBytes)
        await new Promise((resolve) => setTimeout(resolve, 1)) // Small delay
      }

      const stats = processor.getThroughputStats()
      expect(stats.totalMessages).toBe(5)
      expect(stats.totalBytes).toBeGreaterThan(0)
      expect(stats.messagesPerSecond).toBeGreaterThan(0)
      expect(stats.bytesPerSecond).toBeGreaterThan(0)
    })

    test('should track error statistics correctly', async () => {
      const validData = { ...validMessageData }
      const invalidData = { ...validMessageData, messageType: 'INVALID' }

      // Process valid message
      await processor.processMessage(msgpackCodec.encode(validData))

      // Process invalid message (validation error)
      await processor.processMessage(msgpackCodec.encode(invalidData))

      // Process malformed message (processing error)
      await processor.processMessage(Buffer.from('invalid'))

      const errorStats = processor.getErrorStats()
      expect(errorStats.totalErrors).toBe(2)
      expect(errorStats.validationErrors).toBe(1)
      expect(errorStats.processingErrors).toBe(1)
    })

    test('should reset statistics correctly', () => {
      // Manually set some statistics
      processor.latencyStats.totalMessages = 10
      processor.throughputStats.totalMessages = 5
      processor.errorCount = 3
      processor.validationErrors = 1
      processor.processingErrors = 2

      // Reset statistics
      processor.resetStats()

      // Verify all statistics are reset
      expect(processor.latencyStats.totalMessages).toBe(0)
      expect(processor.throughputStats.totalMessages).toBe(0)
      expect(processor.errorCount).toBe(0)
      expect(processor.validationErrors).toBe(0)
      expect(processor.processingErrors).toBe(0)
      expect(processor.latencySamples).toHaveLength(0)
    })
  })

  describe('Message Validation', () => {
    test('should fail validation for missing required fields', async () => {
      const incompleteData = {
        messageId: 'test-001'
        // Missing timestamp, symbol, messageType, data, sequenceNumber
      }

      const result = await processor.processMessage(msgpackCodec.encode(incompleteData))
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required field')
    })

    test('should fail validation for invalid message type', async () => {
      const invalidData = {
        ...validMessageData,
        messageType: 'INVALID_TYPE'
      }

      const result = await processor.processMessage(msgpackCodec.encode(invalidData))
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid message type')
    })

    test('should fail validation for invalid side', async () => {
      const invalidData = {
        ...validMessageData,
        data: {
          ...validMessageData.data,
          side: 'INVALID_SIDE'
        }
      }

      const result = await processor.processMessage(msgpackCodec.encode(invalidData))
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid side')
    })

    test('should fail validation for invalid price and quantity', async () => {
      // Test negative price
      const invalidPriceData = {
        ...validMessageData,
        data: {
          ...validMessageData.data,
          price: -150.25 // Invalid negative price
        }
      }

      let result = await processor.processMessage(msgpackCodec.encode(invalidPriceData))
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid price')

      // Test zero quantity
      const invalidQuantityData = {
        ...validMessageData,
        data: {
          ...validMessageData.data,
          quantity: 0.0 // Invalid zero quantity
        }
      }

      result = await processor.processMessage(msgpackCodec.encode(invalidQuantityData))
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid quantity')
    })
  })

  describe('MarketData Model', () => {
    test('should create MarketData object correctly', () => {
      const marketData = new MarketData({
        messageId: 'test-001',
        timestamp: 1234567890123,
        symbol: 'AAPL',
        messageType: MessageType.TRADE,
        price: 150.25,
        quantity: 100.0,
        side: Side.BUY,
        exchange: 'NASDAQ',
        sequenceNumber: 12345
      })

      expect(marketData.messageId).toBe('test-001')
      expect(marketData.timestamp).toBe(1234567890123)
      expect(marketData.symbol).toBe('AAPL')
      expect(marketData.messageType).toBe(MessageType.TRADE)
      expect(marketData.price).toBe(150.25)
      expect(marketData.quantity).toBe(100.0)
      expect(marketData.side).toBe(Side.BUY)
      expect(marketData.exchange).toBe('NASDAQ')
      expect(marketData.sequenceNumber).toBe(12345)
    })

    test('should convert MarketData to dictionary correctly', () => {
      const marketData = new MarketData({
        messageId: 'test-001',
        timestamp: 1234567890123,
        symbol: 'AAPL',
        messageType: MessageType.QUOTE,
        price: 150.25,
        quantity: 100.0,
        side: Side.SELL,
        exchange: 'NASDAQ',
        sequenceNumber: 12345
      })

      const dataDict = marketData.toDict()

      const expected = {
        messageId: 'test-001',
        timestamp: 1234567890123,
        symbol: 'AAPL',
        messageType: 'QUOTE',
        data: {
          price: 150.25,
          quantity: 100.0,
          side: 'SELL',
          exchange: 'NASDAQ'
        },
        sequenceNumber: 12345
      }

      expect(dataDict).toEqual(expected)
    })
  })

  describe('ProcessingResult Model', () => {
    test('should create successful ProcessingResult correctly', () => {
      const marketData = new MarketData({
        messageId: 'test-001',
        timestamp: 1234567890123,
        symbol: 'AAPL',
        messageType: MessageType.TRADE,
        price: 150.25,
        quantity: 100.0,
        side: Side.BUY,
        exchange: 'NASDAQ',
        sequenceNumber: 12345
      })

      const result = new ProcessingResult({
        success: true,
        messageId: 'test-001',
        processingLatencyNs: 1500000,
        marketData
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-001')
      expect(result.processingLatencyNs).toBe(1500000)
      expect(result.error).toBeNull()
      expect(result.marketData).toBe(marketData)
    })

    test('should create failed ProcessingResult correctly', () => {
      const result = new ProcessingResult({
        success: false,
        messageId: 'unknown',
        processingLatencyNs: 500000,
        error: 'Validation error: Invalid message type'
      })

      expect(result.success).toBe(false)
      expect(result.messageId).toBe('unknown')
      expect(result.processingLatencyNs).toBe(500000)
      expect(result.error).toBe('Validation error: Invalid message type')
      expect(result.marketData).toBeNull()
    })
  })

  describe('Statistics Classes', () => {
    test('should update LatencyStats correctly', () => {
      const stats = new LatencyStats()

      stats.update(1500000) // 1.5ms in nanoseconds

      expect(stats.totalMessages).toBe(1)
      expect(stats.minLatency).toBe(1.5)
      expect(stats.maxLatency).toBe(1.5)

      stats.update(2500000) // 2.5ms in nanoseconds

      expect(stats.totalMessages).toBe(2)
      expect(stats.minLatency).toBe(1.5)
      expect(stats.maxLatency).toBe(2.5)
    })

    test('should update ThroughputStats correctly', () => {
      const stats = new ThroughputStats()

      // Wait a bit to ensure elapsed time > 0
      setTimeout(() => {
        stats.update(100) // 100 bytes

        expect(stats.totalMessages).toBe(1)
        expect(stats.totalBytes).toBe(100)
        expect(stats.messagesPerSecond).toBeGreaterThan(0)
        expect(stats.bytesPerSecond).toBeGreaterThan(0)
      }, 10)
    })
  })
})
