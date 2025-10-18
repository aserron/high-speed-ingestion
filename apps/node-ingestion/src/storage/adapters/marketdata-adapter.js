/**
 * Market Data Storage Adapter
 *
 * Implements the MarketDataStorageInterface using a hybrid approach:
 * - Redis for real-time data and caching
 * - PostgreSQL for historical data persistence
 * Optimized for financial market data ingestion and retrieval.
 */

// Internal modules
import { ValidationError } from '../../errors/index.js'
import { getLogger } from '../../logging/index.js'

// Relative modules
import { MarketDataStorageInterface } from '../interfaces.js'
import { RedisStorageAdapter } from './redis-adapter.js'
import { PostgreSQLStorageAdapter } from './postgresql-adapter.js'

/**
 * Market data storage adapter implementing MarketDataStorageInterface
 */
export class MarketDataStorageAdapter extends MarketDataStorageInterface {
  constructor (config = null) {
    super()
    this.config = config
    this.redisAdapter = new RedisStorageAdapter(config)
    this.postgresAdapter = new PostgreSQLStorageAdapter(config)
    this.logger = getLogger('marketdata-adapter')

    // Configuration for data routing
    this.cacheConfig = {
      realtimeDataTtl: 3600, // 1 hour TTL for real-time data
      latestPriceTtl: 300, // 5 minutes TTL for latest prices
      ohlcvCacheTtl: 1800, // 30 minutes TTL for OHLCV data
      batchSize: 1000, // Batch size for bulk operations
      persistenceThreshold: 100 // Number of ticks before persisting to PostgreSQL
    }

    this.pendingTicks = new Map() // Buffer for batching ticks
    this.flushInterval = null
  }

  /**
   * Initialize market data storage
   */
  async initialize () {
    this.logger.info('Initializing market data storage adapter')

    // Initialize both storage backends
    await Promise.all([this.redisAdapter.initialize(), this.postgresAdapter.initialize()])

    // Create database schema if needed
    await this.createSchema()

    // Start periodic flush of pending ticks
    this.startPeriodicFlush()

    this.logger.info('Market data storage adapter initialized successfully')
  }

  /**
   * Create database schema for market data
   */
  async createSchema () {
    try {
      // Create market_ticks table
      await this.postgresAdapter.createTable(
        'market_ticks',
        {
          id: { type: 'BIGSERIAL', primaryKey: true },
          symbol: { type: 'VARCHAR(20)', notNull: true },
          timestamp: { type: 'BIGINT', notNull: true },
          price: { type: 'DECIMAL(20,8)', notNull: true },
          quantity: { type: 'DECIMAL(20,8)', notNull: true },
          side: { type: 'VARCHAR(10)' },
          exchange: { type: 'VARCHAR(20)' },
          created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        },
        { ifNotExists: true }
      )

      // Create indexes for performance
      await this.postgresAdapter.createIndex(
        'idx_market_ticks_symbol_timestamp',
        'market_ticks',
        ['symbol', 'timestamp'],
        { ifNotExists: true }
      )

      await this.postgresAdapter.createIndex(
        'idx_market_ticks_timestamp',
        'market_ticks',
        ['timestamp'],
        { ifNotExists: true }
      )

      // Create OHLCV aggregation table
      await this.postgresAdapter.createTable(
        'market_ohlcv',
        {
          id: { type: 'BIGSERIAL', primaryKey: true },
          symbol: { type: 'VARCHAR(20)', notNull: true },
          interval_type: { type: 'VARCHAR(10)', notNull: true }, // '1m', '5m', '1h', '1d'
          start_time: { type: 'BIGINT', notNull: true },
          end_time: { type: 'BIGINT', notNull: true },
          open_price: { type: 'DECIMAL(20,8)', notNull: true },
          high_price: { type: 'DECIMAL(20,8)', notNull: true },
          low_price: { type: 'DECIMAL(20,8)', notNull: true },
          close_price: { type: 'DECIMAL(20,8)', notNull: true },
          volume: { type: 'DECIMAL(20,8)', notNull: true },
          tick_count: { type: 'INTEGER', notNull: true },
          created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        },
        { ifNotExists: true }
      )

      await this.postgresAdapter.createIndex(
        'idx_market_ohlcv_symbol_interval_time',
        'market_ohlcv',
        ['symbol', 'interval_type', 'start_time'],
        { unique: true, ifNotExists: true }
      )

      this.logger.info('Market data schema created successfully')
    } catch (error) {
      this.logger.error('Failed to create market data schema', { error: error.message })
      throw error
    }
  }

  /**
   * Start periodic flush of pending ticks to PostgreSQL
   */
  startPeriodicFlush () {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    this.flushInterval = setInterval(async () => {
      try {
        await this.flushPendingTicks()
      } catch (error) {
        this.logger.error('Error during periodic flush', { error: error.message })
      }
    }, 5000) // Flush every 5 seconds
  }

  /**
   * Perform health check on both storage backends
   */
  async healthCheck () {
    const [redisHealth, postgresHealth] = await Promise.all([
      this.redisAdapter.healthCheck().catch((error) => ({ healthy: false, error: error.message })),
      this.postgresAdapter
        .healthCheck()
        .catch((error) => ({ healthy: false, error: error.message }))
    ])

    return {
      healthy: redisHealth.healthy && postgresHealth.healthy,
      redis: redisHealth,
      postgresql: postgresHealth,
      pendingTicks: this.pendingTicks.size
    }
  }

  /**
   * Get storage statistics
   */
  getStats () {
    return {
      type: 'marketdata',
      redis: this.redisAdapter.getStats(),
      postgresql: this.postgresAdapter.getStats(),
      pendingTicks: this.pendingTicks.size,
      cacheConfig: this.cacheConfig
    }
  }

  /**
   * Insert time-series data point (stores in Redis with PostgreSQL persistence)
   */
  async insertDataPoint (series, timestamp, value, tags = {}) {
    const key = `timeseries:${series}:${timestamp}`

    // Store in Redis for real-time access
    await this.redisAdapter.set(
      key,
      {
        timestamp,
        value,
        tags
      },
      { ttl: this.cacheConfig.realtimeDataTtl }
    )

    // Add to sorted set for time-based queries
    await this.redisAdapter.zadd(`series:${series}`, timestamp, key)

    return { series, timestamp, stored: true }
  }

  /**
   * Insert multiple time-series data points
   */
  async insertDataPoints (series, dataPoints) {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      throw new ValidationError('Data points must be a non-empty array', 'dataPoints', dataPoints)
    }

    const pipeline = this.redisAdapter.connectionManager.pipeline()

    for (const point of dataPoints) {
      const key = `timeseries:${series}:${point.timestamp}`

      pipeline.setex(
        key,
        this.cacheConfig.realtimeDataTtl,
        JSON.stringify({
          timestamp: point.timestamp,
          value: point.value,
          tags: point.tags || {}
        })
      )

      pipeline.zadd(`series:${series}`, point.timestamp, key)
    }

    await this.redisAdapter.connectionManager.executePipeline(pipeline)

    return { series, count: dataPoints.length, stored: true }
  }

  /**
   * Query time-series data within time range
   */
  async queryRange (series, startTime, endTime, options = {}) {
    const limit = options.limit || 1000

    // Get keys from sorted set within time range
    const keys = await this.redisAdapter.connectionManager.zrangebyscore(
      `series:${series}`,
      startTime,
      endTime,
      'LIMIT',
      0,
      limit
    )

    if (keys.length === 0) {
      // Fallback to PostgreSQL for historical data
      return await this.queryHistoricalData(series, startTime, endTime, options)
    }

    // Get data points from Redis
    const dataPoints = await this.redisAdapter.mget(...keys)

    return dataPoints.filter((point) => point !== null).sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Query historical data from PostgreSQL
   */
  async queryHistoricalData (series, startTime, endTime, options = {}) {
    const symbol = series.replace('ticks:', '')
    const limit = options.limit || 1000

    const result = await this.postgresAdapter.select('market_ticks', {
      columns: 'timestamp, price, quantity, side, exchange',
      where: 'symbol = $1 AND timestamp >= $2 AND timestamp <= $3',
      whereParams: [symbol, startTime, endTime],
      orderBy: 'timestamp ASC',
      limit
    })

    return result.rows.map((row) => ({
      timestamp: parseInt(row.timestamp),
      value: {
        price: parseFloat(row.price),
        quantity: parseFloat(row.quantity),
        side: row.side,
        exchange: row.exchange
      }
    }))
  }

  /**
   * Get latest data point for series
   */
  async getLatest (series, tags = {}) {
    // Try Redis first
    const latestKey = await this.redisAdapter.connectionManager.zrevrange(`series:${series}`, 0, 0)

    if (latestKey.length > 0) {
      return await this.redisAdapter.get(latestKey[0])
    }

    // Fallback to PostgreSQL
    const symbol = series.replace('ticks:', '')
    const result = await this.postgresAdapter.select('market_ticks', {
      columns: 'timestamp, price, quantity, side, exchange',
      where: 'symbol = $1',
      whereParams: [symbol],
      orderBy: 'timestamp DESC',
      limit: 1
    })

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      timestamp: parseInt(row.timestamp),
      value: {
        price: parseFloat(row.price),
        quantity: parseFloat(row.quantity),
        side: row.side,
        exchange: row.exchange
      }
    }
  }

  /**
   * Store market tick data (optimized for high-frequency data)
   */
  async storeTick (symbol, timestamp, price, quantity, side, exchange) {
    const tick = {
      symbol,
      timestamp: parseInt(timestamp),
      price: parseFloat(price),
      quantity: parseFloat(quantity),
      side,
      exchange
    }

    // Store latest price in Redis for fast access
    await this.redisAdapter.set(
      `latest:${symbol}`,
      { price: tick.price, timestamp: tick.timestamp },
      { ttl: this.cacheConfig.latestPriceTtl }
    )

    // Add to pending ticks for batch persistence
    if (!this.pendingTicks.has(symbol)) {
      this.pendingTicks.set(symbol, [])
    }

    this.pendingTicks.get(symbol).push(tick)

    // Store in time-series format
    await this.insertDataPoint(`ticks:${symbol}`, timestamp, {
      price: tick.price,
      quantity: tick.quantity,
      side: tick.side,
      exchange: tick.exchange
    })

    // Flush if threshold reached
    if (this.pendingTicks.get(symbol).length >= this.cacheConfig.persistenceThreshold) {
      await this.flushSymbolTicks(symbol)
    }

    return tick
  }

  /**
   * Store multiple ticks in batch
   */
  async storeTicks (ticks) {
    if (!Array.isArray(ticks) || ticks.length === 0) {
      throw new ValidationError('Ticks must be a non-empty array', 'ticks', ticks)
    }

    const results = []
    const symbolGroups = new Map()

    // Group ticks by symbol
    for (const tick of ticks) {
      const symbol = tick.symbol
      if (!symbolGroups.has(symbol)) {
        symbolGroups.set(symbol, [])
      }
      symbolGroups.get(symbol).push(tick)
    }

    // Process each symbol group
    for (const [symbol, symbolTicks] of symbolGroups) {
      // Update latest price
      const latestTick = symbolTicks[symbolTicks.length - 1]
      await this.redisAdapter.set(
        `latest:${symbol}`,
        { price: parseFloat(latestTick.price), timestamp: parseInt(latestTick.timestamp) },
        { ttl: this.cacheConfig.latestPriceTtl }
      )

      // Add to pending ticks
      if (!this.pendingTicks.has(symbol)) {
        this.pendingTicks.set(symbol, [])
      }

      for (const tick of symbolTicks) {
        this.pendingTicks.get(symbol).push({
          symbol,
          timestamp: parseInt(tick.timestamp),
          price: parseFloat(tick.price),
          quantity: parseFloat(tick.quantity),
          side: tick.side,
          exchange: tick.exchange
        })
      }

      // Store in time-series format
      const dataPoints = symbolTicks.map((tick) => ({
        timestamp: parseInt(tick.timestamp),
        value: {
          price: parseFloat(tick.price),
          quantity: parseFloat(tick.quantity),
          side: tick.side,
          exchange: tick.exchange
        }
      }))

      await this.insertDataPoints(`ticks:${symbol}`, dataPoints)
      results.push({ symbol, count: symbolTicks.length })
    }

    return results
  }

  /**
   * Flush pending ticks for a specific symbol to PostgreSQL
   */
  async flushSymbolTicks (symbol) {
    const ticks = this.pendingTicks.get(symbol)
    if (!ticks || ticks.length === 0) {
      return
    }

    try {
      await this.postgresAdapter.insertBatch('market_ticks', ticks)
      this.pendingTicks.set(symbol, []) // Clear pending ticks

      this.logger.debug('Flushed ticks to PostgreSQL', { symbol, count: ticks.length })
    } catch (error) {
      this.logger.error('Failed to flush ticks to PostgreSQL', {
        symbol,
        count: ticks.length,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Flush all pending ticks to PostgreSQL
   */
  async flushPendingTicks () {
    const symbols = Array.from(this.pendingTicks.keys())

    for (const symbol of symbols) {
      try {
        await this.flushSymbolTicks(symbol)
      } catch (error) {
        this.logger.error('Error flushing ticks for symbol', { symbol, error: error.message })
      }
    }
  }

  /**
   * Get latest price for symbol
   */
  async getLatestPrice (symbol) {
    const cached = await this.redisAdapter.get(`latest:${symbol}`)
    if (cached) {
      return cached.price
    }

    // Fallback to database
    const latest = await this.getLatest(`ticks:${symbol}`)
    return latest ? latest.value.price : null
  }

  /**
   * Calculate and cache OHLCV data
   */
  async calculateOHLCV (symbol, startTime, endTime, interval = '1m') {
    const cacheKey = `ohlcv:${symbol}:${interval}:${startTime}:${endTime}`

    // Check cache first
    const cached = await this.redisAdapter.get(cacheKey)
    if (cached) {
      return cached
    }

    // Calculate from tick data
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

    const ohlcv = {
      symbol,
      startTime,
      endTime,
      interval,
      open,
      high,
      low,
      close,
      volume,
      tickCount: ticks.length,
      calculatedAt: Date.now()
    }

    // Cache the result
    await this.redisAdapter.set(cacheKey, ohlcv, { ttl: this.cacheConfig.ohlcvCacheTtl })

    // Store in PostgreSQL for historical access
    await this.postgresAdapter.insert('market_ohlcv', {
      symbol,
      interval_type: interval,
      start_time: startTime,
      end_time: endTime,
      open_price: open,
      high_price: high,
      low_price: low,
      close_price: close,
      volume,
      tick_count: ticks.length
    })

    return ohlcv
  }

  /**
   * Close market data storage
   */
  async close () {
    this.logger.info('Closing market data storage adapter')

    // Stop periodic flush
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }

    // Flush any remaining pending ticks
    await this.flushPendingTicks()

    // Close both storage backends
    await Promise.all([this.redisAdapter.close(), this.postgresAdapter.close()])

    this.logger.info('Market data storage adapter closed')
  }
}

export default MarketDataStorageAdapter
