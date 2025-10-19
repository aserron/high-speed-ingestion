/**
 * PostgreSQL Connection Manager
 *
 * High-performance PostgreSQL connection manager with async connection pooling,
 * transaction management, and comprehensive monitoring for the Node.js
 * financial data ingestion system.
 */

// External dependencies
import pg from 'pg'

// Internal modules
import { getConfig } from '../config/index.js'
import { StorageError } from '../errors/index.js'
import { getLogger } from '../logging/index.js'
import { createInitializableSingleton, errorUtils, connectionUtils, validationUtils } from '../utils/common-utilities.js'
import {
  handleConnectionInitError,
  handleTransactionError,
  handlePeriodicTaskError
} from '../utils/error-handlers.js'

const { Pool } = pg

/**
 * PostgreSQL connection manager with pooling and monitoring
 */
export class PostgreSQLConnectionManager {
  constructor (config = null) {
    this.config = config || getConfig()
    this.logger = getLogger('postgresql-manager')
    this.pool = null
    this.isConnected = false
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      totalQueries: 0,
      failedQueries: 0,
      totalTransactions: 0,
      failedTransactions: 0,
      lastConnectionTime: null,
      lastErrorTime: null
    }
    this.healthCheckInterval = null
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  async initialize () {
    try {
      this.logger.info('Initializing PostgreSQL connection manager', {
        host: this.config.postgresql.host,
        port: this.config.postgresql.port,
        database: this.config.postgresql.database,
        username: this.config.postgresql.username,
        maxConnections: this.config.postgresql.maxConnections
      })

      const poolConfig = {
        host: this.config.postgresql.host,
        port: this.config.postgresql.port,
        database: this.config.postgresql.database,
        user: this.config.postgresql.username,
        password: this.config.postgresql.password,

        // Connection pooling
        max: this.config.postgresql.maxConnections,
        min: this.config.postgresql.minConnections,
        acquireTimeoutMillis: this.config.postgresql.acquireTimeoutMs,
        idleTimeoutMillis: this.config.postgresql.idleTimeoutMs,

        // Performance settings
        statement_timeout: this.config.postgresql.statementTimeoutMs,
        query_timeout: this.config.postgresql.queryTimeoutMs,

        // SSL configuration
        ssl: this.config.postgresql.sslEnabled
          ? {
              rejectUnauthorized: false // For development, should be true in production
            }
          : false,

        // Connection validation
        allowExitOnIdle: true
      }

      this.pool = new Pool(poolConfig)

      // Setup event handlers
      this.setupEventHandlers()

      // Test connection
      await this.testConnection()

      this.isConnected = true
      this.connectionStats.lastConnectionTime = Date.now()

      // Start health monitoring
      this.startHealthMonitoring()

      this.logger.info('PostgreSQL connection manager initialized successfully')
    } catch (error) {
      handleConnectionInitError(
        error,
        'postgresql',
        `${this.config.postgresql.host}:${this.config.postgresql.port}/${this.config.postgresql.database}`,
        this.connectionStats
      )
    }
  }

  /**
   * Setup PostgreSQL event handlers
   */
  setupEventHandlers () {
    this.pool.on('connect', (client) => {
      this.logger.debug('PostgreSQL client connected')
      this.connectionStats.totalConnections++
      this.connectionStats.activeConnections++
    })

    this.pool.on('acquire', (client) => {
      this.logger.debug('PostgreSQL client acquired from pool')
    })

    this.pool.on('release', (client) => {
      this.logger.debug('PostgreSQL client released to pool')
    })

    this.pool.on('remove', (client) => {
      this.logger.debug('PostgreSQL client removed from pool')
      this.connectionStats.activeConnections = Math.max(
        0,
        this.connectionStats.activeConnections - 1
      )
    })

    this.pool.on('error', (error, client) => {
      this.logger.error('PostgreSQL pool error', {
        error: error.message,
        stack: error.stack
      })
      this.connectionStats.failedConnections++
      this.connectionStats.lastErrorTime = Date.now()
    })
  }

  /**
   * Test database connection
   */
  async testConnection () {
    const client = await this.pool.connect()

    try {
      const result = await client.query('SELECT NOW() as current_time, version() as version')

      this.logger.info('PostgreSQL connection test successful', {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0] // Just the version number
      })
    } finally {
      client.release()
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring () {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck()
      } catch (error) {
        handlePeriodicTaskError(error, 'PostgreSQL health check', this.logger)
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Perform health check
   */
  async healthCheck () {
    connectionUtils.validateConnection(this.pool, true, 'PostgreSQL', 'health check')

    const start = process.hrtime.bigint()

    try {
      const result = await this.query('SELECT 1 as health_check')
      const latencyNs = process.hrtime.bigint() - start

      if (!result.rows || result.rows.length === 0 || result.rows[0].health_check !== 1) {
        throw new StorageError('PostgreSQL health check returned unexpected result')
      }

      this.logger.debug('PostgreSQL health check passed', {
        latencyNs: latencyNs.toString(),
        latencyMs: Number(latencyNs) / 1_000_000,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      })

      return {
        healthy: true,
        latencyNs: latencyNs.toString(),
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        },
        timestamp: Date.now()
      }
    } catch (error) {
      const latencyNs = process.hrtime.bigint() - start

      throw new StorageError('PostgreSQL health check failed', 'postgresql', 'health_check', null, {
        context: {
          latencyNs: latencyNs.toString(),
          latencyMs: Number(latencyNs) / 1_000_000
        },
        cause: error
      })
    }
  }

  /**
   * Execute query with error handling and metrics
   */
  async query (text, params = null, client = null) {
    connectionUtils.validateDatabaseConnection(this.pool, this.isConnected, 'PostgreSQL', 'query')

    const start = process.hrtime.bigint()
    const usePoolClient = !client
    let queryClient = client

    try {
      if (usePoolClient) {
        queryClient = await this.pool.connect()
      }

      this.connectionStats.totalQueries++

      const result = await queryClient.query(text, params)
      const latencyNs = process.hrtime.bigint() - start

      this.logger.debug('PostgreSQL query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        rowCount: result.rowCount,
        latencyNs: latencyNs.toString(),
        latencyMs: Number(latencyNs) / 1_000_000
      })

      return result
    } catch (error) {
      const latencyNs = process.hrtime.bigint() - start
      this.connectionStats.failedQueries++

      throw new StorageError(
        `PostgreSQL query failed: ${error.message}`,
        'postgresql',
        'query',
        null,
        {
          context: {
            query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            params: params ? params.slice(0, 5) : null, // Limit params for logging
            latencyNs: latencyNs.toString(),
            latencyMs: Number(latencyNs) / 1_000_000
          },
          cause: error
        }
      )
    } finally {
      if (usePoolClient && queryClient) {
        queryClient.release()
      }
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction (callback) {
    connectionUtils.validateDatabaseConnection(this.pool, this.isConnected, 'PostgreSQL', 'transaction')

    const client = await this.pool.connect()
    const start = process.hrtime.bigint()

    try {
      this.connectionStats.totalTransactions++

      await client.query('BEGIN')

      const result = await callback(client)

      await client.query('COMMIT')

      const latencyNs = process.hrtime.bigint() - start

      this.logger.debug('PostgreSQL transaction completed', {
        latencyNs: latencyNs.toString(),
        latencyMs: Number(latencyNs) / 1_000_000
      })

      return result
    } catch (error) {
      errorUtils.handleError(this.logger, 'PostgreSQL transaction failed', error, {
        stats: this.connectionStats,
        statKey: 'failedTransactions',
        startTime: start
      })

      await handleTransactionError(error, client, 'PostgreSQL', this.connectionStats, this.logger)
    } finally {
      client.release()
    }
  }

  /**
   * Insert single record
   */
  async insert (table, data, returning = null) {
    validationUtils.validateObjectData(data, 'Insert')

    const columns = Object.keys(data)
    const values = Object.values(data)
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')

    let query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`

    if (returning) {
      query += ` RETURNING ${returning}`
    }

    return await this.query(query, values)
  }

  /**
   * Insert multiple records in batch
   */
  async insertBatch (table, records, returning = null) {
    validationUtils.validateNonEmptyArray(records, 'records', 'Insert records must be a non-empty array')

    const columns = Object.keys(records[0])
    const valueRows = []
    const allValues = []

    records.forEach((record, recordIndex) => {
      const recordValues = columns.map((col) => record[col])
      const placeholders = recordValues
        .map((_, valueIndex) => `$${allValues.length + valueIndex + 1}`)
        .join(', ')

      valueRows.push(`(${placeholders})`)
      allValues.push(...recordValues)
    })

    let query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valueRows.join(', ')}`

    if (returning) {
      query += ` RETURNING ${returning}`
    }

    return await this.query(query, allValues)
  }

  /**
   * Update records
   */
  async update (table, data, whereClause, whereParams = []) {
    validationUtils.validateObjectData(data, 'Update')

    const columns = Object.keys(data)
    const values = Object.values(data)

    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ')
    const whereParamOffset = values.length
    const adjustedWhereParams = whereParams.map((_, index) => `$${whereParamOffset + index + 1}`)

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause.replace(/\$(\d+)/g, (match, num) => adjustedWhereParams[parseInt(num) - 1])}`

    return await this.query(query, [...values, ...whereParams])
  }

  /**
   * Delete records
   */
  async delete (table, whereClause, whereParams = []) {
    const query = `DELETE FROM ${table} WHERE ${whereClause}`
    return await this.query(query, whereParams)
  }

  /**
   * Select records
   */
  async select (
    table,
    columns = '*',
    whereClause = null,
    whereParams = [],
    orderBy = null,
    limit = null
  ) {
    let query = `SELECT ${columns} FROM ${table}`

    if (whereClause) {
      query += ` WHERE ${whereClause}`
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`
    }

    if (limit) {
      query += ` LIMIT ${limit}`
    }

    return await this.query(query, whereParams)
  }

  /**
   * Execute raw SQL file
   */
  async executeFile (sqlContent) {
    const statements = sqlContent
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    const results = []

    for (const statement of statements) {
      try {
        const result = await this.query(statement)
        results.push(result)
      } catch (error) {
        errorUtils.logError(this.logger, 'SQL statement execution failed', error, {
          statement: statement.substring(0, 200)
        })
        throw error
      }
    }

    return results
  }

  /**
   * Get connection statistics
   */
  getStats () {
    const poolStats = this.pool
      ? {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      : null

    return {
      ...this.connectionStats,
      isConnected: this.isConnected,
      poolStats,
      uptime: this.connectionStats.lastConnectionTime
        ? Date.now() - this.connectionStats.lastConnectionTime
        : 0
    }
  }

  /**
   * Close PostgreSQL connection pool
   */
  async close () {
    this.logger.info('Closing PostgreSQL connection manager')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }

    this.isConnected = false
    this.connectionStats.activeConnections = 0
    this.connectionStats.idleConnections = 0

    this.logger.info('PostgreSQL connection manager closed')
  }
}

// Global PostgreSQL manager instance
const postgresManagerSingleton = createInitializableSingleton(
  (config) => new PostgreSQLConnectionManager(config)
)

/**
 * Get the global PostgreSQL manager instance
 */
export function getPostgreSQLManager () {
  return postgresManagerSingleton.getInstance()
}

/**
 * Initialize PostgreSQL manager
 */
export async function initializePostgreSQL (config = null) {
  return await postgresManagerSingleton.initialize(config)
}

export default {
  PostgreSQLConnectionManager,
  getPostgreSQLManager,
  initializePostgreSQL
}
