/**
 * Base Storage Interface Contracts
 *
 * Defines standardized interfaces for storage operations to ensure
 * consistency across different storage backends (Redis, PostgreSQL)
 * in the Node.js financial data ingestion system.
 */

// Internal modules
import { ValidationError } from '../errors/index.js'
import { validationUtils, jsonUtils } from '../utils/common-utilities.js'

/**
 * Base storage interface that all storage implementations must follow
 */
export class BaseStorageInterface {
  constructor () {
    if (this.constructor === BaseStorageInterface) {
      throw new Error('BaseStorageInterface cannot be instantiated directly')
    }
  }

  /**
   * Initialize the storage connection
   * Must be implemented by subclasses
   */
  async initialize () {
    throw new Error('initialize() must be implemented by subclass')
  }

  /**
   * Perform health check
   * Must be implemented by subclasses
   */
  async healthCheck () {
    throw new Error('healthCheck() must be implemented by subclass')
  }

  /**
   * Get storage statistics
   * Must be implemented by subclasses
   */
  getStats () {
    throw new Error('getStats() must be implemented by subclass')
  }

  /**
   * Close storage connection
   * Must be implemented by subclasses
   */
  async close () {
    throw new Error('close() must be implemented by subclass')
  }
}

/**
 * Key-Value storage interface for cache-like operations
 */
export class KeyValueStorageInterface extends BaseStorageInterface {
  /**
   * Set a key-value pair
   */
  async set (key, value, options = {}) {
    throw new Error('set() must be implemented by subclass')
  }

  /**
   * Get value by key
   */
  async get (key) {
    throw new Error('get() must be implemented by subclass')
  }

  /**
   * Delete key(s)
   */
  async delete (...keys) {
    throw new Error('delete() must be implemented by subclass')
  }

  /**
   * Check if key exists
   */
  async exists (...keys) {
    throw new Error('exists() must be implemented by subclass')
  }

  /**
   * Set expiration on key
   */
  async expire (key, seconds) {
    throw new Error('expire() must be implemented by subclass')
  }

  /**
   * Get multiple keys at once
   */
  async mget (...keys) {
    throw new Error('mget() must be implemented by subclass')
  }

  /**
   * Set multiple key-value pairs at once
   */
  async mset (keyValuePairs) {
    throw new Error('mset() must be implemented by subclass')
  }
}

/**
 * Relational storage interface for structured data operations
 */
export class RelationalStorageInterface extends BaseStorageInterface {
  /**
   * Execute a query
   */
  async query (sql, params = []) {
    throw new Error('query() must be implemented by subclass')
  }

  /**
   * Execute a transaction
   */
  async transaction (callback) {
    throw new Error('transaction() must be implemented by subclass')
  }

  /**
   * Insert a single record
   */
  async insert (table, data, options = {}) {
    throw new Error('insert() must be implemented by subclass')
  }

  /**
   * Insert multiple records
   */
  async insertBatch (table, records, options = {}) {
    throw new Error('insertBatch() must be implemented by subclass')
  }

  /**
   * Update records
   */
  async update (table, data, whereClause, whereParams = []) {
    throw new Error('update() must be implemented by subclass')
  }

  /**
   * Delete records
   */
  async delete (table, whereClause, whereParams = []) {
    throw new Error('delete() must be implemented by subclass')
  }

  /**
   * Select records
   */
  async select (table, options = {}) {
    throw new Error('select() must be implemented by subclass')
  }
}

/**
 * Time-series storage interface for financial market data
 */
export class TimeSeriesStorageInterface extends BaseStorageInterface {
  /**
   * Insert time-series data point
   */
  async insertDataPoint (series, timestamp, value, tags = {}) {
    throw new Error('insertDataPoint() must be implemented by subclass')
  }

  /**
   * Insert multiple time-series data points
   */
  async insertDataPoints (series, dataPoints) {
    throw new Error('insertDataPoints() must be implemented by subclass')
  }

  /**
   * Query time-series data within time range
   */
  async queryRange (series, startTime, endTime, options = {}) {
    throw new Error('queryRange() must be implemented by subclass')
  }

  /**
   * Get latest data point for series
   */
  async getLatest (series, tags = {}) {
    throw new Error('getLatest() must be implemented by subclass')
  }

  /**
   * Aggregate time-series data
   */
  async aggregate (series, startTime, endTime, aggregation, interval) {
    throw new Error('aggregate() must be implemented by subclass')
  }
}

/**
 * Market data storage interface specifically for financial data
 */
export class MarketDataStorageInterface extends TimeSeriesStorageInterface {
  /**
   * Store market tick data
   */
  async storeTick (symbol, timestamp, price, quantity, side, exchange) {
    const dataPoint = {
      timestamp,
      price: parseFloat(price),
      quantity: parseFloat(quantity),
      side,
      exchange
    }

    return await this.insertDataPoint(`ticks:${symbol}`, timestamp, dataPoint)
  }

  /**
   * Store multiple ticks in batch
   */
  async storeTicks (ticks) {
    validationUtils.validateNonEmptyArray(ticks, 'ticks', 'Ticks must be an array')

    const groupedTicks = {}

    for (const tick of ticks) {
      const { symbol, timestamp, price, quantity, side, exchange } = tick
      const series = `ticks:${symbol}`

      if (!groupedTicks[series]) {
        groupedTicks[series] = []
      }

      groupedTicks[series].push({
        timestamp,
        value: {
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          side,
          exchange
        }
      })
    }

    const promises = Object.entries(groupedTicks).map(([series, dataPoints]) =>
      this.insertDataPoints(series, dataPoints)
    )

    return await Promise.all(promises)
  }

  /**
   * Get latest price for symbol
   */
  async getLatestPrice (symbol) {
    const latest = await this.getLatest(`ticks:${symbol}`)
    return latest ? latest.value.price : null
  }

  /**
   * Get price history for symbol
   */
  async getPriceHistory (symbol, startTime, endTime, options = {}) {
    return await this.queryRange(`ticks:${symbol}`, startTime, endTime, options)
  }

  /**
   * Calculate OHLCV (Open, High, Low, Close, Volume) for time period
   */
  async calculateOHLCV (symbol, startTime, endTime, interval = '1m') {
    const ticks = await this.queryRange(`ticks:${symbol}`, startTime, endTime)

    if (!ticks || ticks.length === 0) {
      return null
    }

    const open = ticks[0].value.price
    let high = open
    let low = open
    const close = ticks[ticks.length - 1].value.price
    let volume = 0

    for (const tick of ticks) {
      const price = tick.value.price
      const quantity = tick.value.quantity

      if (price > high) high = price
      if (price < low) low = price
      volume += quantity
    }

    return {
      symbol,
      startTime,
      endTime,
      interval,
      open,
      high,
      low,
      close,
      volume,
      tickCount: ticks.length
    }
  }
}

/**
 * Storage factory for creating appropriate storage instances
 */
export class StorageFactory {
  static storageInstances = new Map()

  /**
   * Create or get storage instance
   */
  static async createStorage (type, config = null) {
    const key = `${type}_${jsonUtils.safeStringify(config, 'null')}`

    if (this.storageInstances.has(key)) {
      return this.storageInstances.get(key)
    }

    let storage = null

    switch (type.toLowerCase()) {
      case 'redis':
      case 'keyvalue': {
        const { RedisStorageAdapter } = await import('./adapters/redis-adapter.js')
        storage = new RedisStorageAdapter(config)
        break
      }

      case 'postgresql':
      case 'postgres':
      case 'relational': {
        const { PostgreSQLStorageAdapter } = await import('./adapters/postgresql-adapter.js')
        storage = new PostgreSQLStorageAdapter(config)
        break
      }

      case 'marketdata': {
        const { MarketDataStorageAdapter } = await import('./adapters/marketdata-adapter.js')
        storage = new MarketDataStorageAdapter(config)
        break
      }

      default:
        throw new ValidationError(`Unknown storage type: ${type}`, 'type', type)
    }

    await storage.initialize()
    this.storageInstances.set(key, storage)

    return storage
  }

  /**
   * Close all storage instances
   */
  static async closeAll () {
    const closePromises = Array.from(this.storageInstances.values()).map((storage) =>
      storage.close().catch((error) => {
        // Log error silently
        return error
      })
    )

    await Promise.all(closePromises)
    this.storageInstances.clear()
  }

  /**
   * Get all storage instances
   */
  static getAllInstances () {
    return Array.from(this.storageInstances.values())
  }

  /**
   * Get storage statistics for all instances
   */
  static getAllStats () {
    const stats = {}

    for (const [key, storage] of this.storageInstances) {
      try {
        stats[key] = storage.getStats()
      } catch (error) {
        stats[key] = { error: error.message }
      }
    }

    return stats
  }
}

/**
 * Storage configuration validator
 */
export class StorageConfigValidator {
  /**
   * Validate Redis configuration
   */
  static validateRedisConfig (config) {
    // Use centralized validation for common connection config
    validationUtils.validateConnectionConfig(config, 'Redis')

    const errors = []
    if (config.db !== undefined && (config.db < 0 || config.db > 15)) {
      errors.push('Redis database must be between 0 and 15')
    }

    if (errors.length > 0) {
      throw new ValidationError(`Redis configuration invalid: ${errors.join(', ')}`)
    }
  }

  /**
   * Validate PostgreSQL configuration
   */
  static validatePostgreSQLConfig (config) {
    const errors = []

    // Use centralized validation for common connection config
    validationUtils.validateConnectionConfig(config, 'PostgreSQL')
    if (!config.database) errors.push('PostgreSQL database is required')
    if (!config.username) errors.push('PostgreSQL username is required')

    if (errors.length > 0) {
      throw new ValidationError(`PostgreSQL configuration invalid: ${errors.join(', ')}`)
    }
  }
}

export default {
  BaseStorageInterface,
  KeyValueStorageInterface,
  RelationalStorageInterface,
  TimeSeriesStorageInterface,
  MarketDataStorageInterface,
  StorageFactory,
  StorageConfigValidator
}
