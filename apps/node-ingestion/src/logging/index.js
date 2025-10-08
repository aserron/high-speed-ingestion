/**
 * Structured Logging Infrastructure
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
 * Provides high-performance structured logging with JSON output, correlation IDs,
 * and integration with the monitoring system for comprehensive observability.
 */

import winston from 'winston'
import { AsyncLocalStorage } from 'async_hooks'
import { v4 as uuidv4 } from 'uuid'
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
<<<<<<< HEAD
function formatFinancialData (logEntry) {
  // Format price and quantity fields with appropriate precision
  const financialFields = ['price', 'quantity', 'latencyNs', 'processingTimeNs']

=======
function formatFinancialData(logEntry) {
  // Format price and quantity fields with appropriate precision
  const financialFields = ['price', 'quantity', 'latencyNs', 'processingTimeNs']
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
function createLogger () {
=======
function createLogger() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
export function getLogger (module = 'app') {
=======
export function getLogger(module = 'app') {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (!logger) {
    logger = createLogger()
  }

  // Return a child logger with module context
  return logger.child({ module })
}

/**
 * Set correlation ID for the current async context
 */
<<<<<<< HEAD
export function setCorrelationId (correlationId = null) {
=======
export function setCorrelationId(correlationId = null) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const id = correlationId || uuidv4()
  correlationStorage.enterWith({ correlationId: id })
  return id
}

/**
 * Get the current correlation ID
 */
<<<<<<< HEAD
export function getCorrelationId () {
=======
export function getCorrelationId() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  return correlationStorage.getStore()?.correlationId
}

/**
 * Run function with correlation ID context
 */
<<<<<<< HEAD
export function withCorrelationId (correlationId, fn) {
=======
export function withCorrelationId(correlationId, fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const id = correlationId || uuidv4()
  return correlationStorage.run({ correlationId: id }, fn)
}

/**
 * Performance logger for specialized performance measurements
 */
export class PerformanceLogger {
<<<<<<< HEAD
  constructor (module = 'performance') {
=======
  constructor(module = 'performance') {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    this.logger = getLogger(module)
  }

  /**
   * Log latency measurement
   */
<<<<<<< HEAD
  logLatency (operation, latencyNs, messageId = null, context = {}) {
=======
  logLatency(operation, latencyNs, messageId = null, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
  logThroughput (operation, messagesPerSecond, bytesPerSecond = null, windowSizeMs = null, context = {}) {
=======
  logThroughput(operation, messagesPerSecond, bytesPerSecond = null, windowSizeMs = null, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
  logResourceUsage (cpuPercent, memoryBytes, memoryPercent, context = {}) {
=======
  logResourceUsage(cpuPercent, memoryBytes, memoryPercent, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
  logGarbageCollection (gcStats, context = {}) {
=======
  logGarbageCollection(gcStats, context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
  constructor (context = {}) {
=======
  constructor(context = {}) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    this.context = context
    this.originalLogger = null
  }

  /**
   * Enter the logging context
   */
<<<<<<< HEAD
  enter () {
=======
  enter() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
  exit () {
=======
  exit() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Restore original logger
    if (this.originalLogger) {
      logger = this.originalLogger
      this.originalLogger = null
    }
  }

  /**
   * Run function with logging context
   */
<<<<<<< HEAD
  run (fn) {
=======
  run(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
  async runAsync (fn) {
=======
  async runAsync(fn) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
export function setupLogging (config = null) {
  // Create logger with provided or default config
  logger = createLogger()
=======
export function setupLogging(config = null) {
  if (config) {
    // Temporarily set config for logger creation
    const originalConfig = getConfig()
    setConfig(config)
    logger = createLogger()
    setConfig(originalConfig)
  } else {
    logger = createLogger()
  }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack })
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
<<<<<<< HEAD
    logger.error('Unhandled rejection', {
      reason: reason?.message || reason,
=======
    logger.error('Unhandled rejection', { 
      reason: reason?.message || reason, 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      stack: reason?.stack,
      promise: promise.toString()
    })
  })

  return logger
}

/**
 * Create a child logger with additional context
 */
<<<<<<< HEAD
export function createChildLogger (context, module = 'app') {
=======
export function createChildLogger(context, module = 'app') {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const baseLogger = getLogger(module)
  return baseLogger.child(context)
}

// Global performance logger instance
let performanceLogger = null

/**
 * Get the global performance logger instance
 */
<<<<<<< HEAD
export function getPerformanceLogger () {
=======
export function getPerformanceLogger() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
}
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
