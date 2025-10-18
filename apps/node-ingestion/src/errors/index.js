/**
 * Error Handling and Exception Management Framework
 *
 * Provides a comprehensive error hierarchy and handling system for the
 * Node.js financial data ingestion system with proper error categorization
 * and context preservation.
 */



/**
 * Base error class for all finance ingestion system errors
 */
export class FinanceIngestionError extends Error {
  constructor(message, errorCode = null, context = {}, cause = null) {
    super(message)

    this.name = this.constructor.name
    this.message = message
    this.errorCode = errorCode || this.constructor.name.toUpperCase()
    this.context = context || {}
    this.cause = cause
    this.timestamp = new Date().toISOString()

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    // Preserve original error if there's a cause
    if (cause && cause.stack) {
      this.stack += `\nCaused by: ${cause.stack}`
    }
  }

  /**
   * Convert error to structured object for logging
   */
  toJSON() {
    return {
      errorType: this.name,
      errorCode: this.errorCode,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      cause: this.cause
        ? {
          type: this.cause.constructor.name,
          message: this.cause.message
        }
        : null
    }
  }

  /**
   * Get a detailed string representation
   */
  toString() {
    const parts = [`${this.errorCode}: ${this.message}`]

    if (Object.keys(this.context).length > 0) {
      const contextStr = Object.entries(this.context)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      parts.push(`Context: ${contextStr}`)
    }

    if (this.cause) {
      parts.push(`Caused by: ${this.cause.message}`)
    }

    return parts.join(' | ')
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends FinanceIngestionError {
  constructor(message, configKey = null, configValue = null, options = {}) {
    const context = { ...options.context }
    if (configKey) context.configKey = configKey
    if (configValue !== null) context.configValue = String(configValue)

    super(message, 'CONFIG_ERROR', context, options.cause)
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends FinanceIngestionError {
  constructor(message, connectionType = null, endpoint = null, retryCount = null, options = {}) {
    const context = { ...options.context }
    if (connectionType) context.connectionType = connectionType
    if (endpoint) context.endpoint = endpoint
    if (retryCount !== null) context.retryCount = retryCount

    super(message, 'CONNECTION_ERROR', context, options.cause)
  }
}

/**
 * Message processing errors
 */
export class ProcessingError extends FinanceIngestionError {
  constructor(message, messageId = null, processingStage = null, messageData = null, options = {}) {
    const context = { ...options.context }
    if (messageId) context.messageId = messageId
    if (processingStage) context.processingStage = processingStage
    if (messageData) {
      // Only include safe, non-sensitive data
      context.messageType = messageData.messageType
      context.symbol = messageData.symbol
      context.sequenceNumber = messageData.sequenceNumber
    }

    super(message, 'PROCESSING_ERROR', context, options.cause)
  }
}

/**
 * Alias for ProcessingError for backward compatibility
 */
export class MessageProcessingError extends ProcessingError {
  constructor(message, messageId = null, processingStage = null, messageData = null, options = {}) {
    super(message, messageId, processingStage, messageData, options)
  }
}

/**
 * Storage-related errors
 */
export class StorageError extends FinanceIngestionError {
  constructor(message, storageType = null, operation = null, affectedRecords = null, options = {}) {
    const context = { ...options.context }
    if (storageType) context.storageType = storageType
    if (operation) context.operation = operation
    if (affectedRecords !== null) context.affectedRecords = affectedRecords

    super(message, 'STORAGE_ERROR', context, options.cause)
  }
}

/**
 * Data validation errors
 */
export class ValidationError extends FinanceIngestionError {
  constructor(message, fieldName = null, fieldValue = null, validationRule = null, options = {}) {
    const context = { ...options.context }
    if (fieldName) context.fieldName = fieldName
    if (fieldValue !== null) context.fieldValue = String(fieldValue)
    if (validationRule) context.validationRule = validationRule

    super(message, 'VALIDATION_ERROR', context, options.cause)
  }
}

/**
 * Backpressure-related errors
 */
export class BackpressureError extends FinanceIngestionError {
  constructor(message, queueSize = null, maxQueueSize = null, messageRate = null, options = {}) {
    const context = { ...options.context }
    if (queueSize !== null) context.queueSize = queueSize
    if (maxQueueSize !== null) context.maxQueueSize = maxQueueSize
    if (messageRate !== null) context.messageRate = messageRate

    super(message, 'BACKPRESSURE_ERROR', context, options.cause)
  }
}

/**
 * Metrics collection errors
 */
export class MetricsError extends FinanceIngestionError {
  constructor(message, metricName = null, metricType = null, options = {}) {
    const context = { ...options.context }
    if (metricName) context.metricName = metricName
    if (metricType) context.metricType = metricType

    super(message, 'METRICS_ERROR', context, options.cause)
  }
}

/**
 * Timeout-related errors
 */
export class TimeoutError extends FinanceIngestionError {
  constructor(message, operation = null, timeoutMs = null, elapsedMs = null, options = {}) {
    const context = { ...options.context }
    if (operation) context.operation = operation
    if (timeoutMs !== null) context.timeoutMs = timeoutMs
    if (elapsedMs !== null) context.elapsedMs = elapsedMs

    super(message, 'TIMEOUT_ERROR', context, options.cause)
  }
}

/**
 * Resource constraint errors
 */
export class ResourceError extends FinanceIngestionError {
  constructor(message, resourceType = null, currentUsage = null, limit = null, options = {}) {
    const context = { ...options.context }
    if (resourceType) context.resourceType = resourceType
    if (currentUsage !== null) context.currentUsage = currentUsage
    if (limit !== null) context.limit = limit

    super(message, 'RESOURCE_ERROR', context, options.cause)
  }
}

/**
 * Cluster management errors
 */
export class ClusterError extends FinanceIngestionError {
  constructor(message, workerId = null, operation = null, options = {}) {
    const context = { ...options.context }
    if (workerId !== null) context.workerId = workerId
    if (operation) context.operation = operation

    super(message, 'CLUSTER_ERROR', context, options.cause)
  }
}

/**
 * Convert generic errors to appropriate FinanceIngestionError subclass
 */
export function convertError(error, context = {}) {
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

  if (error.code === 'ENOTFOUND') {
    return new ConnectionError(message, 'dns', null, null, { context, cause: error })
  }

  if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
    return new TimeoutError(message, null, null, null, { context, cause: error })
  }

  if (error.name === 'ValidationError' || error.name === 'TypeError') {
    return new ValidationError(message, null, null, null, { context, cause: error })
  }

  if (error.code === 'EMFILE' || error.code === 'ENOMEM') {
    return new ResourceError(message, 'system', null, null, { context, cause: error })
  }

  // Generic conversion
  return new FinanceIngestionError(message, 'UNKNOWN_ERROR', context, error)
}

/**
 * Async error handler function for centralized error processing
 * Enhanced to properly handle async operations and lazy imports
 * 
 * @param {Error} error - The error to handle and process
 * @param {Object} logger - Optional logger instance (will create if null)
 * @param {Object} context - Additional context for error enrichment
 * @param {boolean} shouldRethrow - Whether to rethrow after processing
 * @returns {Promise<FinanceIngestionError>} Processed error object
 * 
 * @async Supports lazy logger import to avoid circular dependencies
 * @errorHandling Converts all errors to standardized FinanceIngestionError
 * @performance Lazy loading pattern reduces initialization overhead
 */
export async function handleError(error, logger = null, context = {}, shouldRethrow = true) {
  // Convert to FinanceIngestionError if needed
  const financeError = convertError(error, context)

  /**
   * Lazy logger initialization with async import
   * Prevents circular dependency issues while maintaining functionality
   * 
   * @pattern Lazy loading to break circular dependencies
   * @async Dynamic import ensures proper module resolution
   */
  if (!logger) {
    // Lazy import to avoid circular dependency
    const { getLogger } = await import('../logging/index.js')
    logger = getLogger('error-handler')
  }
  logger.error('Error occurred', financeError.toJSON())

  if (shouldRethrow) {
    throw financeError
  }

  return financeError
}

/**
 * Error context manager for automatic error context addition
 */
export class ErrorContext {
  constructor(context = {}) {
    this.context = context
  }

  /**
   * Run function with error context
   */
  run(fn) {
    try {
      return fn()
    } catch (error) {
      throw convertError(error, this.context)
    }
  }

  /**
   * Run async function with error context
   */
  async runAsync(fn) {
    try {
      return await fn()
    } catch (error) {
      throw convertError(error, this.context)
    }
  }
}

/**
 * Async error handler wrapper with enhanced error processing
 * Properly handles async error processing chain with await
 * 
 * @param {Function} fn - Async function to wrap with error handling
 * @returns {Function} Wrapped function with comprehensive error handling
 * 
 * @async Ensures proper async error propagation and processing
 * @errorHandling Integrates with centralized error handling system
 * @pattern Higher-order function for consistent error handling across modules
 */
export function asyncErrorHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      // Properly await async error handler to ensure complete processing
      await handleError(error)
    }
  }
}

/**
 * Express/Fastify error handler middleware
 */
export async function errorHandlerMiddleware(error, request, reply, next) {
  const financeError = convertError(error, {
    requestId: request.id,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent']
  })

  // Lazy import to avoid circular dependency
  const { getLogger } = await import('../logging/index.js')
  const logger = getLogger('http-error')
  logger.error('HTTP request error', financeError.toJSON())

  // Send appropriate HTTP response
  const statusCode = getHttpStatusCode(financeError)

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
function getHttpStatusCode(error) {
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
export async function setupErrorHandlers() {
  // Lazy import to avoid circular dependency
  const { getLogger } = await import('../logging/index.js')
  const logger = getLogger('global-error')

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    const financeError = convertError(error, { source: 'uncaughtException' })
    logger.error('Uncaught exception', financeError.toJSON())

    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    const financeError = convertError(error, {
      source: 'unhandledRejection',
      promise: promise.toString()
    })

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
  MessageProcessingError,
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
}
