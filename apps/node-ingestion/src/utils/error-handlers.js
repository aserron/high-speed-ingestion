/**
 * Common Error Handling Utilities
 *
 * Provides standardized error handling patterns to reduce code duplication
 * and ensure consistent error logging and metrics tracking.
 */

// Internal modules
import { getLogger } from '../logging/index.js'
import { ConnectionError, StorageError, ProcessingError, ValidationError } from '../errors/index.js'

/**
 * Standard connection initialization error handler
 */
export function handleConnectionInitError (error, connectionType, endpoint, stats = null) {
  if (stats) {
    stats.failedConnections++
    stats.lastErrorTime = Date.now()
  }

  throw new ConnectionError(
    `Failed to initialize ${connectionType} connection manager`,
    connectionType,
    endpoint,
    null,
    { cause: error }
  )
}

/**
 * Standard health check error handler
 */
export function handleHealthCheckError (error, storageType, latencyStart) {
  const latencyNs = process.hrtime.bigint() - latencyStart

  throw new StorageError(`${storageType} health check failed`, storageType, 'ping', null, {
    context: {
      latencyNs: latencyNs.toString(),
      latencyMs: Number(latencyNs) / 1_000_000
    },
    cause: error
  })
}

/**
 * Standard query/command error handler
 */
export function handleQueryError (error, storageType, operation, latencyStart, stats = null) {
  const latencyNs = process.hrtime.bigint() - latencyStart

  if (stats) {
    stats.failedCommands++
    stats.lastErrorTime = Date.now()
  }

  throw new StorageError(`${storageType} ${operation} failed`, storageType, operation, null, {
    context: {
      latencyNs: latencyNs.toString(),
      latencyMs: Number(latencyNs) / 1_000_000
    },
    cause: error
  })
}

/**
 * Standard transaction error handler with rollback
 */
export async function handleTransactionError (
  error,
  client,
  storageType,
  stats = null,
  logger = null
) {
  const log = logger || getLogger('transaction-error')

  if (stats) {
    stats.failedTransactions++
  }

  try {
    await client.query('ROLLBACK')
    log.debug(`${storageType} transaction rolled back`)
  } catch (rollbackError) {
    log.error(`${storageType} rollback failed`, {
      error: rollbackError.message
    })
  }

  throw error
}

/**
 * Standard message processing error handler
 */
export function handleMessageProcessingError (error, messageId, stage, logger = null) {
  const log = logger || getLogger('message-processing')

  log.error('Error processing message', {
    messageId,
    stage,
    error: error.message,
    stack: error.stack
  })

  throw new ProcessingError(`Message processing failed at ${stage}`, messageId, stage, null, {
    cause: error
  })
}

/**
 * Standard JSON parsing error handler
 */
export function handleJsonParseError (data, fallbackValue = null, logger = null) {
  const log = logger || getLogger('json-parse')

  try {
    return JSON.parse(data)
  } catch (error) {
    if (logger) {
      log.warn('Failed to parse JSON, returning fallback', {
        error: error.message,
        dataType: typeof data,
        dataLength: data?.length || 0
      })
    }
    return fallbackValue || data
  }
}

/**
 * Standard serialization error handler
 */
export function handleSerializationError (value, context = 'value') {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch (error) {
    throw new ValidationError(`${context} must be serializable`, 'value', value, { cause: error })
  }
}

/**
 * Standard async operation wrapper with error handling
 */
export async function withErrorHandling (operation, errorHandler, context = {}) {
  try {
    return await operation()
  } catch (error) {
    return errorHandler(error, context)
  }
}

/**
 * Standard periodic task error handler
 */
export function handlePeriodicTaskError (error, taskName, logger = null) {
  const log = logger || getLogger('periodic-task')

  log.error(`Error in periodic task: ${taskName}`, {
    error: error.message,
    stack: error.stack
  })

  // Don't rethrow for periodic tasks to avoid crashing the process
}

export default {
  handleConnectionInitError,
  handleHealthCheckError,
  handleQueryError,
  handleTransactionError,
  handleMessageProcessingError,
  handleJsonParseError,
  handleSerializationError,
  withErrorHandling,
  handlePeriodicTaskError
}
