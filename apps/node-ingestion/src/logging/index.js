/**
 * Structured Logging Infrastructure
 *
 * Provides high-performance structured logging with JSON output, correlation IDs,
 * and integration with the monitoring system for comprehensive observability.
 */

// External dependencies
import { AsyncLocalStorage } from 'async_hooks'
import { v4 as uuidv4 } from 'uuid'
import winston from 'winston'

// Internal modules
import { getConfig } from '../config/index.js'

// AsyncLocalStorage for correlation ID tracking
const correlationStorage = new AsyncLocalStorage()

/**
 * Custom formatter for financial data logging
 */
const financeFormatter = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    // Add correlation ID if available
    const correlationId = correlationStorage.getStore()?.correlationId
    if (correlationId) {
      info.correlationId = correlationId
    }

    // Add application metadata
    const config = getConfig()
    info.application = config.app.name
    info.version = config.app.version
    info.environment = config.app.environment
    info.processId = process.pid
    info.threadId = 0 // Node.js is single-threaded

    // Add high-precision timestamp for performance measurements
    info.timestampNs = process.hrtime.bigint().toString()

    // Format financial data types
    formatFinancialData(info)

    return JSON.stringify(info)
  })
)

/**
 * Text formatter for development
 */
const textFormatter = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const correlationId = correlationStorage.getStore()?.correlationId
    const corrId = correlationId ? ` [${correlationId.slice(0, 8)}]` : ''
    return `${info.timestamp} ${info.level}${corrId}: ${info.message} ${info.stack || ''}`
  })
)

/**
 * Format financial data types for consistent logging
 */
function formatFinancialData (logEntry) {
  // Format price and quantity fields with appropriate precision
  const financialFields = ['price', 'quantity', 'latencyNs', 'processingTimeNs']

  for (const field of financialFields) {
    if (logEntry[field] !== undefined) {
      if (field.includes('Ns')) {
        // Keep nanosecond precision for timing fields
        logEntry[field] = BigInt(logEntry[field]).toString()
      } else if (['price', 'quantity'].includes(field)) {
        // Format financial values with 8 decimal places
        logEntry[field] = Number(logEntry[field]).toFixed(8)
      }
    }
  }
}

/**
 * Create Winston logger instance
 */
function createLogger () {
  const config = getConfig()
  const { monitoring } = config

  const transports = []

  // Console transport
  transports.push(
    new winston.transports.Console({
      level: monitoring.logLevel,
      format: monitoring.logFormat === 'json' ? financeFormatter : textFormatter,
      handleExceptions: true,
      handleRejections: true
    })
  )

  // File transport for production
  if (config.app.environment === 'production') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/application.log',
        level: monitoring.logLevel,
        format: financeFormatter,
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10,
        handleExceptions: true,
        handleRejections: true
      })
    )

    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: financeFormatter,
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 5,
        handleExceptions: true,
        handleRejections: true
      })
    )
  }

  return winston.createLogger({
    level: monitoring.logLevel,
    format: winston.format.json(),
    defaultMeta: {
      service: config.app.name
    },
    transports,
    exitOnError: false
  })
}

// Global logger instance
let logger = null

/**
 * Get the global logger instance
 */
export function getLogger (module = 'app') {
  if (!logger) {
    logger = createLogger()
  }

  // Return a child logger with module context
  return logger.child({ module })
}

/**
 * Set correlation ID for the current async context
 */
export function setCorrelationId (correlationId = null) {
  const id = correlationId || uuidv4()
  correlationStorage.enterWith({ correlationId: id })
  return id
}

/**
 * Get the current correlation ID
 */
export function getCorrelationId () {
  return correlationStorage.getStore()?.correlationId
}

/**
 * Run function with correlation ID context
 */
export function withCorrelationId (correlationId, fn) {
  const id = correlationId || uuidv4()
  return correlationStorage.run({ correlationId: id }, fn)
}

/**
 * Performance logger for specialized performance measurements
 */
export class PerformanceLogger {
  constructor (module = 'performance') {
    this.logger = getLogger(module)
  }

  /**
   * Log latency measurement
   */
  logLatency (operation, latencyNs, messageId = null, context = {}) {
    this.logger.info('Latency measurement', {
      operation,
      latencyNs: latencyNs.toString(),
      latencyMs: Number(latencyNs) / 1_000_000,
      messageId,
      ...context
    })
  }

  /**
   * Log throughput measurement
   */
  logThroughput (
    operation,
    messagesPerSecond,
    bytesPerSecond = null,
    windowSizeMs = null,
    context = {}
  ) {
    const logData = {
      operation,
      messagesPerSecond,
      ...context
    }

    if (bytesPerSecond !== null) {
      logData.bytesPerSecond = bytesPerSecond
    }

    if (windowSizeMs !== null) {
      logData.windowSizeMs = windowSizeMs
    }

    this.logger.info('Throughput measurement', logData)
  }

  /**
   * Log resource usage measurement
   */
  logResourceUsage (cpuPercent, memoryBytes, memoryPercent, context = {}) {
    this.logger.info('Resource usage', {
      cpuPercent,
      memoryBytes,
      memoryPercent,
      memoryMB: memoryBytes / (1024 * 1024),
      ...context
    })
  }

  /**
   * Log garbage collection statistics
   */
  logGarbageCollection (gcStats, context = {}) {
    this.logger.info('Garbage collection', {
      ...gcStats,
      ...context
    })
  }
}

/**
 * Logging context manager for adding structured context
 */
export class LoggingContext {
  constructor (context = {}) {
    this.context = context
    this.originalLogger = null
  }

  /**
   * Enter the logging context
   */
  enter () {
    // Store original logger and create child with context
    this.originalLogger = logger
    if (logger) {
      logger = logger.child(this.context)
    }
    return this
  }

  /**
   * Exit the logging context
   */
  exit () {
    // Restore original logger
    if (this.originalLogger) {
      logger = this.originalLogger
      this.originalLogger = null
    }
  }

  /**
   * Run function with logging context
   */
  run (fn) {
    this.enter()
    try {
      return fn()
    } finally {
      this.exit()
    }
  }

  /**
   * Run async function with logging context
   */
  async runAsync (fn) {
    this.enter()
    try {
      return await fn()
    } finally {
      this.exit()
    }
  }
}

/**
 * Setup logging infrastructure
 */
export function setupLogging (config = null) {
  // Create logger with provided or default config
  logger = createLogger()

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack })
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    })
  })

  return logger
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger (context, module = 'app') {
  const baseLogger = getLogger(module)
  return baseLogger.child(context)
}

// Global performance logger instance
let performanceLogger = null

/**
 * Get the global performance logger instance
 */
export function getPerformanceLogger () {
  if (!performanceLogger) {
    performanceLogger = new PerformanceLogger()
  }
  return performanceLogger
}

export default {
  getLogger,
  setupLogging,
  setCorrelationId,
  getCorrelationId,
  withCorrelationId,
  createChildLogger,
  getPerformanceLogger,
  PerformanceLogger,
  LoggingContext
}
