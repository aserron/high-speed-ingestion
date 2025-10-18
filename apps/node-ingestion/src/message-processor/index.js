/**
 * High-performance message processor for financial data ingestion.
 *
 * This module implements the core message processing engine with:
 * - msgpack5 serialization for high performance
 * - End-to-end latency measurement using process.hrtime.bigint
 * - Adaptive batching for backpressure handling
 * - Message validation and error handling
 */

import msgpack from 'msgpack5'
import { EventEmitter } from 'events'

import { getLogger } from '../logging/index.js'
import { MessageProcessingError, ValidationError, BackpressureError } from '../errors/index.js'

// Message type enumeration
export const MessageType = {
  TRADE: 'TRADE',
  QUOTE: 'QUOTE',
  BOOK_UPDATE: 'BOOK_UPDATE'
}

// Trade/quote side enumeration
export const Side = {
  BUY: 'BUY',
  SELL: 'SELL'
}

/**
 * Market data message structure
 */
export class MarketData {
  constructor ({
    messageId,
    timestamp,
    symbol,
    messageType,
    price,
    quantity,
    side,
    exchange,
    sequenceNumber
  }) {
    this.messageId = messageId
    this.timestamp = timestamp
    this.symbol = symbol
    this.messageType = messageType
    this.price = price
    this.quantity = quantity
    this.side = side
    this.exchange = exchange
    this.sequenceNumber = sequenceNumber
  }

  toDict () {
    return {
      messageId: this.messageId,
      timestamp: this.timestamp,
      symbol: this.symbol,
      messageType: this.messageType,
      data: {
        price: this.price,
        quantity: this.quantity,
        side: this.side,
        exchange: this.exchange
      },
      sequenceNumber: this.sequenceNumber
    }
  }
}

/**
 * Result of message processing operation
 */
export class ProcessingResult {
  constructor ({ success, messageId, processingLatencyNs, error = null, marketData = null }) {
    this.success = success
    this.messageId = messageId
    this.processingLatencyNs = processingLatencyNs
    this.error = error
    this.marketData = marketData
  }
}

/**
 * Latency statistics tracking
 */
export class LatencyStats {
  constructor () {
    this.p50 = 0.0
    this.p95 = 0.0
    this.p99 = 0.0
    this.p999 = 0.0
    this.minLatency = Number.MAX_VALUE
    this.maxLatency = 0.0
    this.totalMessages = 0
  }

  update (latencyNs) {
    const latencyMs = latencyNs / 1_000_000 // Convert to milliseconds
    this.minLatency = Math.min(this.minLatency, latencyMs)
    this.maxLatency = Math.max(this.maxLatency, latencyMs)
    this.totalMessages++
  }
}

/**
 * Throughput statistics tracking
 */
export class ThroughputStats {
  constructor () {
    this.messagesPerSecond = 0.0
    this.bytesPerSecond = 0.0
    this.totalMessages = 0
    this.totalBytes = 0
    this.startTime = Date.now()
  }

  update (messageSizeBytes) {
    this.totalMessages++
    this.totalBytes += messageSizeBytes

    const elapsed = (Date.now() - this.startTime) / 1000 // Convert to seconds
    if (elapsed > 0) {
      this.messagesPerSecond = this.totalMessages / elapsed
      this.bytesPerSecond = this.totalBytes / elapsed
    }
  }
}

/**
 * High-performance message processor for financial market data.
 *
 * Features:
 * - msgpack5 serialization for optimal performance
 * - Nanosecond precision latency measurement
 * - Adaptive batching for backpressure handling
 * - Comprehensive validation and error handling
 */
export class MessageProcessor extends EventEmitter {
  constructor ({
    maxBatchSize = 1000,
    batchTimeoutMs = 10,
    maxQueueSize = 10000,
    enableValidation = true
  } = {}) {
    super()

    this.maxBatchSize = maxBatchSize
    this.batchTimeoutMs = batchTimeoutMs
    this.maxQueueSize = maxQueueSize
    this.enableValidation = enableValidation

    // Initialize MessagePack codec
    this.msgpack = msgpack()

    // Statistics tracking
    this.latencyStats = new LatencyStats()
    this.throughputStats = new ThroughputStats()
    this.latencySamples = [] // Keep last 10k samples for percentiles
    this.maxSamples = 10000

    // Processing queue and batch management
    this.processingQueue = []
    this.currentBatch = []
    this.batchStartTime = null

    // Error tracking
    this.errorCount = 0
    this.validationErrors = 0
    this.processingErrors = 0

    this.logger = getLogger('MessageProcessor')
    this.logger.info('MessageProcessor initialized', {
      maxBatchSize,
      batchTimeoutMs,
      maxQueueSize,
      enableValidation
    })
  }

  /**
   * Process a single market data message.
   *
   * @param {Buffer} message - Raw message bytes (MessagePack encoded)
   * @returns {Promise<ProcessingResult>} Processing result with outcome and metrics
   */
  async processMessage (message) {
    const startTime = process.hrtime.bigint()

    try {
      // Deserialize message using MessagePack
      const rawData = this.msgpack.decode(message)

      // Validate message structure if enabled
      if (this.enableValidation) {
        this._validateMessage(rawData)
      }

      // Parse into MarketData object
      const marketData = this._parseMarketData(rawData)

      // Calculate processing latency
      const endTime = process.hrtime.bigint()
      const processingLatency = Number(endTime - startTime)

      // Update statistics
      this._updateStats(processingLatency, message.length)

      const result = new ProcessingResult({
        success: true,
        messageId: marketData.messageId,
        processingLatencyNs: processingLatency,
        marketData
      })

      this.logger.debug(`Processed message ${marketData.messageId}`, {
        latencyMs: processingLatency / 1_000_000
      })

      return result
    } catch (error) {
      const endTime = process.hrtime.bigint()
      const processingLatency = Number(endTime - startTime)

      if (error instanceof ValidationError) {
        this.validationErrors++
        this.errorCount++
        this.logger.warn('Message validation failed', { error: error.message })

        return new ProcessingResult({
          success: false,
          messageId: 'unknown',
          processingLatencyNs: processingLatency,
          error: `Validation error: ${error.message}`
        })
      } else {
        this.processingErrors++
        this.errorCount++
        this.logger.error('Message processing failed', { error: error.message })

        return new ProcessingResult({
          success: false,
          messageId: 'unknown',
          processingLatencyNs: processingLatency,
          error: `Processing error: ${error.message}`
        })
      }
    }
  }

  /**
   * Process a batch of messages for improved throughput.
   *
   * @param {Buffer[]} messages - Array of raw message bytes
   * @returns {Promise<ProcessingResult[]>} Array of processing results
   */
  async processBatch (messages) {
    if (!messages || messages.length === 0) {
      return []
    }

    const batchStart = process.hrtime.bigint()
    const results = []

    try {
      // Process messages concurrently within the batch
      const promises = messages.map((msg) => this.processMessage(msg))
      const batchResults = await Promise.allSettled(promises)

      // Handle results and exceptions from concurrent processing
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i]

        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          this.processingErrors++
          this.errorCount++
          const batchLatency = Number(process.hrtime.bigint() - batchStart)

          results.push(
            new ProcessingResult({
              success: false,
              messageId: `batch_${i}`,
              processingLatencyNs: batchLatency,
              error: `Batch processing error: ${result.reason.message}`
            })
          )
        }
      }

      const batchLatency = Number(process.hrtime.bigint() - batchStart)
      this.logger.debug(`Processed batch of ${messages.length} messages`, {
        latencyMs: batchLatency / 1_000_000
      })

      return results
    } catch (error) {
      this.logger.error('Batch processing failed', { error: error.message })
      throw new MessageProcessingError(`Batch processing failed: ${error.message}`)
    }
  }

  /**
   * Handle backpressure by implementing adaptive batching.
   *
   * This method monitors queue depth and adjusts batch sizes dynamically
   * to maintain optimal throughput under varying load conditions.
   */
  async handleBackpressure () {
    const queueSize = this.processingQueue.length
    const queueUtilization = queueSize / this.maxQueueSize

    if (queueUtilization > 0.8) {
      // High load - increase batch size
      const newBatchSize = Math.min(this.maxBatchSize * 2, 2000)
      this.logger.warn(`High queue utilization (${queueUtilization.toFixed(2)})`, {
        newBatchSize,
        queueSize,
        maxQueueSize: this.maxQueueSize
      })
      this.maxBatchSize = newBatchSize
    } else if (queueUtilization < 0.2) {
      // Low load - decrease batch size
      const newBatchSize = Math.max(Math.floor(this.maxBatchSize / 2), 100)
      this.logger.info(`Low queue utilization (${queueUtilization.toFixed(2)})`, {
        newBatchSize,
        queueSize,
        maxQueueSize: this.maxQueueSize
      })
      this.maxBatchSize = newBatchSize
    }

    // If queue is full, apply backpressure
    if (queueSize >= this.maxQueueSize) {
      const error = `Processing queue full: ${queueSize}/${this.maxQueueSize}`
      this.logger.error('Queue full, applying backpressure', {
        queueSize,
        maxQueueSize: this.maxQueueSize
      })
      throw new BackpressureError(error)
    }
  }

  /**
   * Validate message structure and required fields.
   *
   * @param {Object} data - Parsed message data
   * @throws {ValidationError} If message validation fails
   */
  _validateMessage (data) {
    const requiredFields = [
      'messageId',
      'timestamp',
      'symbol',
      'messageType',
      'data',
      'sequenceNumber'
    ]

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new ValidationError(`Missing required field: ${field}`)
      }
    }

    // Validate message type
    if (!Object.values(MessageType).includes(data.messageType)) {
      throw new ValidationError(`Invalid message type: ${data.messageType}`)
    }

    // Validate data section
    const dataSection = data.data
    const requiredDataFields = ['price', 'quantity', 'side', 'exchange']

    for (const field of requiredDataFields) {
      if (!(field in dataSection)) {
        throw new ValidationError(`Missing required data field: ${field}`)
      }
    }

    // Validate side
    if (!Object.values(Side).includes(dataSection.side)) {
      throw new ValidationError(`Invalid side: ${dataSection.side}`)
    }

    // Validate numeric fields
    if (typeof dataSection.price !== 'number' || dataSection.price <= 0) {
      throw new ValidationError(`Invalid price: ${dataSection.price}`)
    }

    if (typeof dataSection.quantity !== 'number' || dataSection.quantity <= 0) {
      throw new ValidationError(`Invalid quantity: ${dataSection.quantity}`)
    }
  }

  /**
   * Parse validated message data into MarketData object.
   *
   * @param {Object} data - Validated message data
   * @returns {MarketData} MarketData object
   */
  _parseMarketData (data) {
    const dataSection = data.data

    return new MarketData({
      messageId: data.messageId,
      timestamp: data.timestamp,
      symbol: data.symbol,
      messageType: data.messageType,
      price: dataSection.price,
      quantity: dataSection.quantity,
      side: dataSection.side,
      exchange: dataSection.exchange,
      sequenceNumber: data.sequenceNumber
    })
  }

  /**
   * Update processing statistics.
   *
   * @param {number} latencyNs - Processing latency in nanoseconds
   * @param {number} messageSize - Message size in bytes
   */
  _updateStats (latencyNs, messageSize) {
    // Update latency statistics
    this.latencyStats.update(latencyNs)

    // Store latency sample (as milliseconds)
    this.latencySamples.push(latencyNs / 1_000_000)

    // Keep only the most recent samples
    if (this.latencySamples.length > this.maxSamples) {
      this.latencySamples.shift()
    }

    // Update throughput statistics
    this.throughputStats.update(messageSize)

    // Calculate percentiles from recent samples
    if (this.latencySamples.length >= 100) {
      // Need minimum samples for meaningful percentiles
      const sortedSamples = [...this.latencySamples].sort((a, b) => a - b)
      const n = sortedSamples.length

      this.latencyStats.p50 = sortedSamples[Math.floor(n * 0.5)]
      this.latencyStats.p95 = sortedSamples[Math.floor(n * 0.95)]
      this.latencyStats.p99 = sortedSamples[Math.floor(n * 0.99)]
      this.latencyStats.p999 = sortedSamples[Math.floor(n * 0.999)]
    }
  }

  /**
   * Get current latency statistics.
   * @returns {LatencyStats} Current latency statistics
   */
  getLatencyStats () {
    return this.latencyStats
  }

  /**
   * Get current throughput statistics.
   * @returns {ThroughputStats} Current throughput statistics
   */
  getThroughputStats () {
    return this.throughputStats
  }

  /**
   * Get error statistics.
   * @returns {Object} Error statistics
   */
  getErrorStats () {
    return {
      totalErrors: this.errorCount,
      validationErrors: this.validationErrors,
      processingErrors: this.processingErrors
    }
  }

  /**
   * Reset all statistics counters.
   */
  resetStats () {
    this.latencyStats = new LatencyStats()
    this.throughputStats = new ThroughputStats()
    this.latencySamples = []
    this.errorCount = 0
    this.validationErrors = 0
    this.processingErrors = 0
    this.logger.info('Statistics reset')
  }
}

export default MessageProcessor
