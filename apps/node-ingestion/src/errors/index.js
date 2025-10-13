/**
 * Error Handling and Exception Management Framework
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
 * Provides a comprehensive error hierarchy and handling system for the
 * Node.js financial data ingestion system with proper error categorization
 * and context preservation.
 */

import { getLogger } from '../logging/index.js'

/**
 * Base error class for all finance ingestion system errors
 */
export class FinanceIngestionError extends Error {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, errorCode = null, context = {}, cause = null) {
    super(message)

=======
  constructor(message, errorCode = null, context = {}, cause = null) {
    super(message)
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, errorCode = null, context = {}, cause = null) {
    super(message)
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, errorCode = null, context = {}, cause = null) {
    super(message)
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, errorCode = null, context = {}, cause = null) {
    super(message)
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, errorCode = null, context = {}, cause = null) {
    super(message)
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, errorCode = null, context = {}, cause = null) {
    super(message)
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    this.name = this.constructor.name
    this.message = message
    this.errorCode = errorCode || this.constructor.name.toUpperCase()
    this.context = context || {}
    this.cause = cause
    this.timestamp = new Date().toISOString()
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Preserve original error if there's a cause
    if (cause && cause.stack) {
      this.stack += '\nCaused by: ' + cause.stack
    }
  }

  /**
   * Convert error to structured object for logging
   */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  toJSON () {
=======
  toJSON() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toJSON() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toJSON() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toJSON() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toJSON() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toJSON() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    return {
      errorType: this.name,
      errorCode: this.errorCode,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      cause: this.cause
        ? {
            type: this.cause.constructor.name,
            message: this.cause.message
          }
        : null
=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      cause: this.cause ? {
        type: this.cause.constructor.name,
        message: this.cause.message
      } : null
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    }
  }

  /**
   * Get a detailed string representation
   */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  toString () {
    const parts = [`${this.errorCode}: ${this.message}`]

=======
  toString() {
    const parts = [`${this.errorCode}: ${this.message}`]
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toString() {
    const parts = [`${this.errorCode}: ${this.message}`]
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toString() {
    const parts = [`${this.errorCode}: ${this.message}`]
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toString() {
    const parts = [`${this.errorCode}: ${this.message}`]
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toString() {
    const parts = [`${this.errorCode}: ${this.message}`]
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  toString() {
    const parts = [`${this.errorCode}: ${this.message}`]
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    if (Object.keys(this.context).length > 0) {
      const contextStr = Object.entries(this.context)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      parts.push(`Context: ${contextStr}`)
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

    if (this.cause) {
      parts.push(`Caused by: ${this.cause.message}`)
    }

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    
    if (this.cause) {
      parts.push(`Caused by: ${this.cause.message}`)
    }
    
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    return parts.join(' | ')
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, configKey = null, configValue = null, options = {}) {
    const context = { ...options.context }
    if (configKey) context.configKey = configKey
    if (configValue !== null) context.configValue = String(configValue)

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  constructor(message, configKey = null, configValue = null, options = {}) {
    const context = { ...options.context }
    if (configKey) context.configKey = configKey
    if (configValue !== null) context.configValue = String(configValue)
    
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'CONFIG_ERROR', context, options.cause)
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, connectionType = null, endpoint = null, retryCount = null, options = {}) {
=======
  constructor(message, connectionType = null, endpoint = null, retryCount = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, connectionType = null, endpoint = null, retryCount = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, connectionType = null, endpoint = null, retryCount = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, connectionType = null, endpoint = null, retryCount = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, connectionType = null, endpoint = null, retryCount = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, connectionType = null, endpoint = null, retryCount = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const context = { ...options.context }
    if (connectionType) context.connectionType = connectionType
    if (endpoint) context.endpoint = endpoint
    if (retryCount !== null) context.retryCount = retryCount
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'CONNECTION_ERROR', context, options.cause)
  }
}

/**
 * Message processing errors
 */
export class ProcessingError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, messageId = null, processingStage = null, messageData = null, options = {}) {
=======
  constructor(message, messageId = null, processingStage = null, messageData = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, messageId = null, processingStage = null, messageData = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, messageId = null, processingStage = null, messageData = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, messageId = null, processingStage = null, messageData = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, messageId = null, processingStage = null, messageData = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, messageId = null, processingStage = null, messageData = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const context = { ...options.context }
    if (messageId) context.messageId = messageId
    if (processingStage) context.processingStage = processingStage
    if (messageData) {
      // Only include safe, non-sensitive data
      context.messageType = messageData.messageType
      context.symbol = messageData.symbol
      context.sequenceNumber = messageData.sequenceNumber
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'PROCESSING_ERROR', context, options.cause)
  }
}

/**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
 * Alias for ProcessingError for backward compatibility
 */
export class MessageProcessingError extends ProcessingError {
  constructor (message, messageId = null, processingStage = null, messageData = null, options = {}) {
    super(message, messageId, processingStage, messageData, options)
  }
}

/**
 * Storage-related errors
 */
export class StorageError extends FinanceIngestionError {
  constructor (message, storageType = null, operation = null, affectedRecords = null, options = {}) {
=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
 * Storage-related errors
 */
export class StorageError extends FinanceIngestionError {
  constructor(message, storageType = null, operation = null, affectedRecords = null, options = {}) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const context = { ...options.context }
    if (storageType) context.storageType = storageType
    if (operation) context.operation = operation
    if (affectedRecords !== null) context.affectedRecords = affectedRecords
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'STORAGE_ERROR', context, options.cause)
  }
}

/**
 * Data validation errors
 */
export class ValidationError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, fieldName = null, fieldValue = null, validationRule = null, options = {}) {
=======
  constructor(message, fieldName = null, fieldValue = null, validationRule = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, fieldName = null, fieldValue = null, validationRule = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, fieldName = null, fieldValue = null, validationRule = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, fieldName = null, fieldValue = null, validationRule = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, fieldName = null, fieldValue = null, validationRule = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, fieldName = null, fieldValue = null, validationRule = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const context = { ...options.context }
    if (fieldName) context.fieldName = fieldName
    if (fieldValue !== null) context.fieldValue = String(fieldValue)
    if (validationRule) context.validationRule = validationRule
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'VALIDATION_ERROR', context, options.cause)
  }
}

/**
 * Backpressure-related errors
 */
export class BackpressureError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, queueSize = null, maxQueueSize = null, messageRate = null, options = {}) {
=======
  constructor(message, queueSize = null, maxQueueSize = null, messageRate = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, queueSize = null, maxQueueSize = null, messageRate = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, queueSize = null, maxQueueSize = null, messageRate = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, queueSize = null, maxQueueSize = null, messageRate = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, queueSize = null, maxQueueSize = null, messageRate = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, queueSize = null, maxQueueSize = null, messageRate = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const context = { ...options.context }
    if (queueSize !== null) context.queueSize = queueSize
    if (maxQueueSize !== null) context.maxQueueSize = maxQueueSize
    if (messageRate !== null) context.messageRate = messageRate
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'BACKPRESSURE_ERROR', context, options.cause)
  }
}

/**
 * Metrics collection errors
 */
export class MetricsError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, metricName = null, metricType = null, options = {}) {
    const context = { ...options.context }
    if (metricName) context.metricName = metricName
    if (metricType) context.metricType = metricType

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  constructor(message, metricName = null, metricType = null, options = {}) {
    const context = { ...options.context }
    if (metricName) context.metricName = metricName
    if (metricType) context.metricType = metricType
    
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'METRICS_ERROR', context, options.cause)
  }
}

/**
 * Timeout-related errors
 */
export class TimeoutError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, operation = null, timeoutMs = null, elapsedMs = null, options = {}) {
=======
  constructor(message, operation = null, timeoutMs = null, elapsedMs = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, operation = null, timeoutMs = null, elapsedMs = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, operation = null, timeoutMs = null, elapsedMs = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, operation = null, timeoutMs = null, elapsedMs = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, operation = null, timeoutMs = null, elapsedMs = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, operation = null, timeoutMs = null, elapsedMs = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const context = { ...options.context }
    if (operation) context.operation = operation
    if (timeoutMs !== null) context.timeoutMs = timeoutMs
    if (elapsedMs !== null) context.elapsedMs = elapsedMs
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'TIMEOUT_ERROR', context, options.cause)
  }
}

/**
 * Resource constraint errors
 */
export class ResourceError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, resourceType = null, currentUsage = null, limit = null, options = {}) {
=======
  constructor(message, resourceType = null, currentUsage = null, limit = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, resourceType = null, currentUsage = null, limit = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, resourceType = null, currentUsage = null, limit = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, resourceType = null, currentUsage = null, limit = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, resourceType = null, currentUsage = null, limit = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(message, resourceType = null, currentUsage = null, limit = null, options = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const context = { ...options.context }
    if (resourceType) context.resourceType = resourceType
    if (currentUsage !== null) context.currentUsage = currentUsage
    if (limit !== null) context.limit = limit
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'RESOURCE_ERROR', context, options.cause)
  }
}

/**
 * Cluster management errors
 */
export class ClusterError extends FinanceIngestionError {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (message, workerId = null, operation = null, options = {}) {
    const context = { ...options.context }
    if (workerId !== null) context.workerId = workerId
    if (operation) context.operation = operation

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  constructor(message, workerId = null, operation = null, options = {}) {
    const context = { ...options.context }
    if (workerId !== null) context.workerId = workerId
    if (operation) context.operation = operation
    
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    super(message, 'CLUSTER_ERROR', context, options.cause)
  }
}

/**
 * Convert generic errors to appropriate FinanceIngestionError subclass
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export function convertError (error, context = {}) {
=======
export function convertError(error, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function convertError(error, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function convertError(error, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function convertError(error, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function convertError(error, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function convertError(error, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (error instanceof FinanceIngestionError) {
    // Add additional context to existing error
    Object.assign(error.context, context)
    return error
  }

  const message = error.message || String(error)

  // Map common Node.js errors to our hierarchy
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return new ConnectionError(message, 'network', null, null, { context, cause: error })
  }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

  if (error.code === 'ENOTFOUND') {
    return new ConnectionError(message, 'dns', null, null, { context, cause: error })
  }

  if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
    return new TimeoutError(message, null, null, null, { context, cause: error })
  }

  if (error.name === 'ValidationError' || error.name === 'TypeError') {
    return new ValidationError(message, null, null, null, { context, cause: error })
  }

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  
  if (error.code === 'ENOTFOUND') {
    return new ConnectionError(message, 'dns', null, null, { context, cause: error })
  }
  
  if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
    return new TimeoutError(message, null, null, null, { context, cause: error })
  }
  
  if (error.name === 'ValidationError' || error.name === 'TypeError') {
    return new ValidationError(message, null, null, null, { context, cause: error })
  }
  
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (error.code === 'EMFILE' || error.code === 'ENOMEM') {
    return new ResourceError(message, 'system', null, null, { context, cause: error })
  }

  // Generic conversion
  return new FinanceIngestionError(message, 'UNKNOWN_ERROR', context, error)
}

/**
 * Error handler function for centralized error processing
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export function handleError (error, logger = null, context = {}, shouldRethrow = true) {
  // Convert to FinanceIngestionError if needed
  const financeError = convertError(error, context)

  // Log the error
  const log = logger || getLogger('error-handler')
  log.error('Error occurred', financeError.toJSON())

  if (shouldRethrow) {
    throw financeError
  }

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
export function handleError(error, logger = null, context = {}, shouldRethrow = true) {
  // Convert to FinanceIngestionError if needed
  const financeError = convertError(error, context)
  
  // Log the error
  const log = logger || getLogger('error-handler')
  log.error('Error occurred', financeError.toJSON())
  
  if (shouldRethrow) {
    throw financeError
  }
  
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  return financeError
}

/**
 * Error context manager for automatic error context addition
 */
export class ErrorContext {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor (context = {}) {
=======
  constructor(context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor(context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    this.context = context
  }

  /**
   * Run function with error context
   */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  run (fn) {
=======
  run(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  run(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  run(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  run(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  run(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  run(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    try {
      return fn()
    } catch (error) {
      throw convertError(error, this.context)
    }
  }

  /**
   * Run async function with error context
   */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async runAsync (fn) {
=======
  async runAsync(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async runAsync(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async runAsync(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async runAsync(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async runAsync(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async runAsync(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    try {
      return await fn()
    } catch (error) {
      throw convertError(error, this.context)
    }
  }
}

/**
 * Async error handler wrapper
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export function asyncErrorHandler (fn) {
=======
export function asyncErrorHandler(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function asyncErrorHandler(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function asyncErrorHandler(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function asyncErrorHandler(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function asyncErrorHandler(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function asyncErrorHandler(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error)
    }
  }
}

/**
 * Express/Fastify error handler middleware
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export function errorHandlerMiddleware (error, request, reply, next) {
=======
export function errorHandlerMiddleware(error, request, reply, next) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function errorHandlerMiddleware(error, request, reply, next) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function errorHandlerMiddleware(error, request, reply, next) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function errorHandlerMiddleware(error, request, reply, next) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function errorHandlerMiddleware(error, request, reply, next) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function errorHandlerMiddleware(error, request, reply, next) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const financeError = convertError(error, {
    requestId: request.id,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent']
  })

  const logger = getLogger('http-error')
  logger.error('HTTP request error', financeError.toJSON())

  // Send appropriate HTTP response
  const statusCode = getHttpStatusCode(financeError)
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (reply.sent) {
    return next ? next(financeError) : undefined
  }

  reply.status(statusCode).send({
    error: {
      type: financeError.name,
      code: financeError.errorCode,
      message: financeError.message,
      timestamp: financeError.timestamp
    }
  })

  return next ? next() : undefined
}

/**
 * Map error types to HTTP status codes
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
function getHttpStatusCode (error) {
=======
function getHttpStatusCode(error) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function getHttpStatusCode(error) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function getHttpStatusCode(error) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function getHttpStatusCode(error) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function getHttpStatusCode(error) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function getHttpStatusCode(error) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (error instanceof ValidationError) return 400
  if (error instanceof ConfigurationError) return 400
  if (error instanceof ConnectionError) return 503
  if (error instanceof TimeoutError) return 408
  if (error instanceof ResourceError) return 507
  if (error instanceof BackpressureError) return 429
  return 500
}

/**
 * Setup global error handlers
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export function setupErrorHandlers () {
=======
export function setupErrorHandlers() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function setupErrorHandlers() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function setupErrorHandlers() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function setupErrorHandlers() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function setupErrorHandlers() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function setupErrorHandlers() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const logger = getLogger('global-error')

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    const financeError = convertError(error, { source: 'uncaughtException' })
    logger.error('Uncaught exception', financeError.toJSON())
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const financeError = convertError(error, {
      source: 'unhandledRejection',
      promise: promise.toString()
    })

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const financeError = convertError(error, { 
      source: 'unhandledRejection',
      promise: promise.toString()
    })
    
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    logger.error('Unhandled promise rejection', financeError.toJSON())
  })

  // Handle warnings
  process.on('warning', (warning) => {
    logger.warn('Process warning', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    })
  })
}

export default {
  FinanceIngestionError,
  ConfigurationError,
  ConnectionError,
  ProcessingError,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  MessageProcessingError,
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  StorageError,
  ValidationError,
  BackpressureError,
  MetricsError,
  TimeoutError,
  ResourceError,
  ClusterError,
  convertError,
  handleError,
  ErrorContext,
  asyncErrorHandler,
  errorHandlerMiddleware,
  setupErrorHandlers
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
}
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
