/**
 * Unit tests for Node.js Storage Manager
 *
 * Tests the storage manager functionality including Redis, PostgreSQL,
 * and market data storage operations with performance monitoring.
 */

import { jest } from '@jest/globals'
import { StorageManager, MarketDataStorageAdapter } from '../../apps/node-ingestion/src/storage/index.js'

// Mock dependencies
jest.mock('../../apps/node-ingestion/src/logging/index.js', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}))

jest.mock('../../apps/node-ingestion/src/config/index.js', () => ({
  getConfig: jest.fn(() => ({
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0
    },
    postgresql: {
      host: 'localhost',
      port: 5432,
      database: 'test_finance',
      username: 'test_user',
      password: 'test_pass'
    }
  }))
}))

describe('StorageManager', () => {
  let storageManager
  let mockConfig

  beforeEach(() => {
    mockConfig = {
      redis: {
        host: 'localhost',
        port: 6379,
        db: 0,
        maxConnections: 10
      },
      postgresql: {
        host: 'localhost',
        port: 5432,
        database: 'test_finance',
        username: 'test_user',
        password: 'test_pass',
        minConnections: 2,
        maxConnections: 10
      }
    }

    storageManager = new StorageManager(mockConfig)
  })

  afterEach(async () => {
    if (storageManager && storageManager.isInitialized) {
      await storageManager.close()
    }
  })

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      const manager = new StorageManager()
      expect(manager.config).toBeDefined()
      expect(manager.isInitialized).toBe(false)
      expect(manager.storageInstances).toBeInstanceOf(Map)
    })

    test('should initialize with custom config', () => {
      expect(storageManager.config).toEqual(mockConfig)
      expect(storageManager.isInitialized).toBe(false)
    })

    test('should prevent double initialization', async () => {
      // Mock StorageFactory to avoid actual connections
      const mockStorageFactory = {
        createStorage: jest.fn().mockResolvedValue({
          healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
          getStats: jest.fn().mockReturnValue({}),
          close: jest.fn().mockResolvedValue()
        })
      }

      // Mock the StorageFactory import
      jest.doMock('../../apps/node-ingestion/src/storage/interfaces.js', () => ({
        StorageFactory: mockStorageFactory
      }))

      await storageManager.initialize()
      expect(storageManager.isInitialized).toBe(true)

      // Second initialization should warn and return
      const consoleSpy = jest.spyOn(storageManager.logger, 'warn')
      await storageManager.initialize()
      expect(consoleSpy).toHaveBeenCalledWith('Storage manager already initialized')
    })
  })

  describe('Storage Access', () => {
    beforeEach(async () => {
      // Mock storage instances
      const mockStorage = {
        healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
        getStats: jest.fn().mockReturnValue({ type: 'mock' }),
        close: jest.fn().mockResolvedValue()
      }

      storageManager.storageInstances.set('redis', mockStorage)
      storageManager.storageInstances.set('postgresql', mockStorage)
      storageManager.storageInstances.set('marketdata', mockStorage)
      storageManager.isInitialized = true
    })

    test('should get storage by type', () => {
      const redisStorage = storageManager.getStorage('redis')
      expect(redisStorage).toBeDefined()
      expect(redisStorage.getStats().type).toBe('mock')
    })

    test('should throw error for unknown storage type', () => {
      expect(() => {
        storageManager.getStorage('unknown')
      }).toThrow("Storage type 'unknown' not found")
    })

    test('should throw error when not initialized', () => {
      storageManager.isInitialized = false
      expect(() => {
        storageManager.getStorage('redis')
      }).toThrow('Storage manager not initialized')
    })

    test('should get Redis storage', () => {
      const redisStorage = storageManager.getRedisStorage()
      expect(redisStorage).toBeDefined()
    })

    test('should get PostgreSQL storage', () => {
      const postgresStorage = storageManager.getPostgreSQLStorage()
      expect(postgresStorage).toBeDefined()
    })

    test('should get Market Data storage', () => {
      const marketDataStorage = storageManager.getMarketDataStorage()
      expect(marketDataStorage).toBeDefined()
    })
  })

  describe('Health Check', () => {
    test('should return unhealthy when not initialized', async () => {
      const health = await storageManager.healthCheck()
      expect(health.healthy).toBe(false)
      expect(health.error).toBe('Storage manager not initialized')
    })

    test('should return healthy when all backends are healthy', async () => {
      const mockStorage = {
        healthCheck: jest.fn().mockResolvedValue({ healthy: true })
      }

      storageManager.storageInstances.set('redis', mockStorage)
      storageManager.storageInstances.set('postgresql', mockStorage)
      storageManager.isInitialized = true

      const health = await storageManager.healthCheck()
      expect(health.healthy).toBe(true)
      expect(health.backends.redis.healthy).toBe(true)
      expect(health.backends.postgresql.healthy).toBe(true)
    })

    test('should return unhealthy when any backend is unhealthy', async () => {
      const healthyStorage = {
        healthCheck: jest.fn().mockResolvedValue({ healthy: true })
      }
      const unhealthyStorage = {
        healthCheck: jest.fn().mockResolvedValue({ healthy: false, error: 'Connection failed' })
      }

      storageManager.storageInstances.set('redis', healthyStorage)
      storageManager.storageInstances.set('postgresql', unhealthyStorage)
      storageManager.isInitialized = true

      const health = await storageManager.healthCheck()
      expect(health.healthy).toBe(false)
      expect(health.backends.redis.healthy).toBe(true)
      expect(health.backends.postgresql.healthy).toBe(false)
    })

    test('should handle health check errors', async () => {
      const errorStorage = {
        healthCheck: jest.fn().mockRejectedValue(new Error('Health check failed'))
      }

      storageManager.storageInstances.set('redis', errorStorage)
      storageManager.isInitialized = true

      const health = await storageManager.healthCheck()
      expect(health.healthy).toBe(false)
      expect(health.backends.redis.healthy).toBe(false)
      expect(health.backends.redis.error).toBe('Health check failed')
    })
  })

  describe('Statistics', () => {
    test('should return error when not initialized', () => {
      const stats = storageManager.getStats()
      expect(stats.error).toBe('Storage manager not initialized')
    })

    test('should return stats from all backends', () => {
      const mockStorage = {
        getStats: jest.fn().mockReturnValue({ connections: 5, operations: 100 })
      }

      storageManager.storageInstances.set('redis', mockStorage)
      storageManager.storageInstances.set('postgresql', mockStorage)
      storageManager.isInitialized = true

      const stats = storageManager.getStats()
      expect(stats.initialized).toBe(true)
      expect(stats.backends.redis.connections).toBe(5)
      expect(stats.backends.postgresql.operations).toBe(100)
      expect(stats.timestamp).toBeDefined()
    })

    test('should handle stats errors', () => {
      const errorStorage = {
        getStats: jest.fn().mockImplementation(() => {
          throw new Error('Stats error')
        })
      }

      storageManager.storageInstances.set('redis', errorStorage)
      storageManager.isInitialized = true

      const stats = storageManager.getStats()
      expect(stats.backends.redis.error).toBe('Stats error')
    })
  })

  describe('Close', () => {
    test('should close all storage instances', async () => {
      const mockStorage1 = {
        close: jest.fn().mockResolvedValue()
      }
      const mockStorage2 = {
        close: jest.fn().mockResolvedValue()
      }

      storageManager.storageInstances.set('redis', mockStorage1)
      storageManager.storageInstances.set('postgresql', mockStorage2)
      storageManager.isInitialized = true

      await storageManager.close()

      expect(mockStorage1.close).toHaveBeenCalled()
      expect(mockStorage2.close).toHaveBeenCalled()
      expect(storageManager.storageInstances.size).toBe(0)
      expect(storageManager.isInitialized).toBe(false)
    })

    test('should handle close errors gracefully', async () => {
      const errorStorage = {
        close: jest.fn().mockRejectedValue(new Error('Close error'))
      }

      storageManager.storageInstances.set('redis', errorStorage)
      storageManager.isInitialized = true

      // Should not throw error
      await expect(storageManager.close()).resolves.toBeUndefined()
      expect(storageManager.storageInstances.size).toBe(0)
    })

    test('should handle close when not initialized', async () => {
      await expect(storageManager.close()).resolves.toBeUndefined()
    })
  })
})

describe('MarketDataStorageAdapter', () => {
  let adapter
  let mockConfig

  beforeEach(() => {
    mockConfig = {
      redis: {
        host: 'localhost',
        port: 6379
      },
      postgresql: {
        host: 'localhost',
        port: 5432,
        database: 'test_finance'
      }
    }

    // Mock the Redis and PostgreSQL adapters
    jest.doMock('../../apps/node-ingestion/src/storage/adapters/redis-adapter.js', () => ({
      RedisStorageAdapter: jest.fn().mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(),
        healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
        getStats: jest.fn().mockReturnValue({ type: 'redis' }),
        close: jest.fn().mockResolvedValue(),
        set: jest.fn().mockResolvedValue(),
        get: jest.fn().mockResolvedValue(),
        mget: jest.fn().mockResolvedValue([]),
        zadd: jest.fn().mockResolvedValue(),
        connectionManager: {
          pipeline: jest.fn().mockReturnValue({
            setex: jest.fn(),
            zadd: jest.fn()
          }),
          executePipeline: jest.fn().mockResolvedValue(),
          zrangebyscore: jest.fn().mockResolvedValue([]),
          zrevrange: jest.fn().mockResolvedValue([])
        }
      }))
    }))

    jest.doMock('../../apps/node-ingestion/src/storage/adapters/postgresql-adapter.js', () => ({
      PostgreSQLStorageAdapter: jest.fn().mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(),
        healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
        getStats: jest.fn().mockReturnValue({ type: 'postgresql' }),
        close: jest.fn().mockResolvedValue(),
        createTable: jest.fn().mockResolvedValue(),
        createIndex: jest.fn().mockResolvedValue(),
        insertBatch: jest.fn().mockResolvedValue(),
        insert: jest.fn().mockResolvedValue(),
        select: jest.fn().mockResolvedValue({ rows: [] })
      }))
    }))

    adapter = new MarketDataStorageAdapter(mockConfig)
  })

  afterEach(async () => {
    if (adapter.flushInterval) {
      clearInterval(adapter.flushInterval)
    }
    await adapter.close()
  })

  describe('Initialization', () => {
    test('should initialize with config', () => {
      expect(adapter.config).toEqual(mockConfig)
      expect(adapter.cacheConfig).toBeDefined()
      expect(adapter.pendingTicks).toBeInstanceOf(Map)
    })

    test('should initialize storage backends', async () => {
      await adapter.initialize()

      expect(adapter.redisAdapter.initialize).toHaveBeenCalled()
      expect(adapter.postgresAdapter.initialize).toHaveBeenCalled()
    })
  })

  describe('Tick Storage', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    test('should store single tick', async () => {
      const tick = await adapter.storeTick('AAPL', Date.now(), 150.25, 1000, 'buy', 'NASDAQ')

      expect(tick.symbol).toBe('AAPL')
      expect(tick.price).toBe(150.25)
      expect(tick.quantity).toBe(1000)
      expect(adapter.redisAdapter.set).toHaveBeenCalled()
      expect(adapter.pendingTicks.has('AAPL')).toBe(true)
    })

    test('should store multiple ticks', async () => {
      const ticks = [
        { symbol: 'AAPL', timestamp: Date.now(), price: 150.25, quantity: 1000, side: 'buy', exchange: 'NASDAQ' },
        { symbol: 'GOOGL', timestamp: Date.now(), price: 2500.50, quantity: 500, side: 'sell', exchange: 'NASDAQ' }
      ]

      const results = await adapter.storeTicks(ticks)

      expect(results).toHaveLength(2)
      expect(results[0].symbol).toBe('AAPL')
      expect(results[1].symbol).toBe('GOOGL')
      expect(adapter.pendingTicks.has('AAPL')).toBe(true)
      expect(adapter.pendingTicks.has('GOOGL')).toBe(true)
    })

    test('should validate ticks array', async () => {
      await expect(adapter.storeTicks(null)).rejects.toThrow('Ticks must be a non-empty array')
      await expect(adapter.storeTicks([])).rejects.toThrow('Ticks must be a non-empty array')
      await expect(adapter.storeTicks('invalid')).rejects.toThrow('Ticks must be a non-empty array')
    })

    test('should flush ticks when threshold reached', async () => {
      // Set low threshold for testing
      adapter.cacheConfig.persistenceThreshold = 2

      const spy = jest.spyOn(adapter, 'flushSymbolTicks')

      // Store ticks to reach threshold
      await adapter.storeTick('AAPL', Date.now(), 150.25, 1000, 'buy', 'NASDAQ')
      await adapter.storeTick('AAPL', Date.now(), 150.30, 1000, 'sell', 'NASDAQ')

      expect(spy).toHaveBeenCalledWith('AAPL')
    })
  })

  describe('Price Queries', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    test('should get latest price from cache', async () => {
      adapter.redisAdapter.get.mockResolvedValue({ price: 150.25, timestamp: Date.now() })

      const price = await adapter.getLatestPrice('AAPL')
      expect(price).toBe(150.25)
      expect(adapter.redisAdapter.get).toHaveBeenCalledWith('latest:AAPL')
    })

    test('should fallback to database for latest price', async () => {
      adapter.redisAdapter.get.mockResolvedValue(null)
      adapter.postgresAdapter.select.mockResolvedValue({
        rows: [{ timestamp: '1640995200000', price: '150.25', quantity: '1000', side: 'buy', exchange: 'NASDAQ' }]
      })

      const price = await adapter.getLatestPrice('AAPL')
      expect(price).toBe(150.25)
    })

    test('should return null when no price found', async () => {
      adapter.redisAdapter.get.mockResolvedValue(null)
      adapter.postgresAdapter.select.mockResolvedValue({ rows: [] })

      const price = await adapter.getLatestPrice('NONEXISTENT')
      expect(price).toBeNull()
    })
  })

  describe('OHLCV Calculation', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    test('should calculate OHLCV from tick data', async () => {
      const mockTicks = [
        { timestamp: 1640995200000, value: { price: 150.00, quantity: 1000 } },
        { timestamp: 1640995260000, value: { price: 151.00, quantity: 500 } },
        { timestamp: 1640995320000, value: { price: 149.50, quantity: 750 } },
        { timestamp: 1640995380000, value: { price: 150.75, quantity: 1200 } }
      ]

      jest.spyOn(adapter, 'queryRange').mockResolvedValue(mockTicks)

      const ohlcv = await adapter.calculateOHLCV('AAPL', 1640995200000, 1640995380000, '1m')

      expect(ohlcv.symbol).toBe('AAPL')
      expect(ohlcv.open).toBe(150.00)
      expect(ohlcv.high).toBe(151.00)
      expect(ohlcv.low).toBe(149.50)
      expect(ohlcv.close).toBe(150.75)
      expect(ohlcv.volume).toBe(3450)
      expect(ohlcv.tickCount).toBe(4)
    })

    test('should return null for empty tick data', async () => {
      jest.spyOn(adapter, 'queryRange').mockResolvedValue([])

      const ohlcv = await adapter.calculateOHLCV('NONEXISTENT', 1640995200000, 1640995380000, '1m')
      expect(ohlcv).toBeNull()
    })

    test('should cache OHLCV results', async () => {
      const mockTicks = [
        { timestamp: 1640995200000, value: { price: 150.00, quantity: 1000 } }
      ]

      jest.spyOn(adapter, 'queryRange').mockResolvedValue(mockTicks)

      await adapter.calculateOHLCV('AAPL', 1640995200000, 1640995380000, '1m')

      expect(adapter.redisAdapter.set).toHaveBeenCalledWith(
        expect.stringContaining('ohlcv:AAPL:1m:'),
        expect.any(Object),
        expect.objectContaining({ ttl: adapter.cacheConfig.ohlcvCacheTtl })
      )
    })
  })

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    test('should flush pending ticks to PostgreSQL', async () => {
      const ticks = [
        { symbol: 'AAPL', timestamp: Date.now(), price: 150.25, quantity: 1000, side: 'buy', exchange: 'NASDAQ' }
      ]

      adapter.pendingTicks.set('AAPL', ticks)

      await adapter.flushSymbolTicks('AAPL')

      expect(adapter.postgresAdapter.insertBatch).toHaveBeenCalledWith('market_ticks', ticks)
      expect(adapter.pendingTicks.get('AAPL')).toHaveLength(0)
    })

    test('should handle flush errors gracefully', async () => {
      const ticks = [
        { symbol: 'AAPL', timestamp: Date.now(), price: 150.25, quantity: 1000, side: 'buy', exchange: 'NASDAQ' }
      ]

      adapter.pendingTicks.set('AAPL', ticks)
      adapter.postgresAdapter.insertBatch.mockRejectedValue(new Error('Database error'))

      await expect(adapter.flushSymbolTicks('AAPL')).rejects.toThrow('Database error')
    })

    test('should flush all pending ticks', async () => {
      const spy = jest.spyOn(adapter, 'flushSymbolTicks').mockResolvedValue()

      adapter.pendingTicks.set('AAPL', [])
      adapter.pendingTicks.set('GOOGL', [])

      await adapter.flushPendingTicks()

      expect(spy).toHaveBeenCalledWith('AAPL')
      expect(spy).toHaveBeenCalledWith('GOOGL')
    })
  })

  describe('Health and Stats', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    test('should perform health check', async () => {
      const health = await adapter.healthCheck()

      expect(health.healthy).toBe(true)
      expect(health.redis.healthy).toBe(true)
      expect(health.postgresql.healthy).toBe(true)
      expect(typeof health.pendingTicks).toBe('number')
    })

    test('should handle health check failures', async () => {
      adapter.redisAdapter.healthCheck.mockResolvedValue({ healthy: false, error: 'Redis down' })

      const health = await adapter.healthCheck()

      expect(health.healthy).toBe(false)
      expect(health.redis.healthy).toBe(false)
    })

    test('should get storage statistics', () => {
      const stats = adapter.getStats()

      expect(stats.type).toBe('marketdata')
      expect(stats.redis).toBeDefined()
      expect(stats.postgresql).toBeDefined()
      expect(typeof stats.pendingTicks).toBe('number')
      expect(stats.cacheConfig).toBeDefined()
    })
  })

  describe('Cleanup', () => {
    test('should close adapter and clear intervals', async () => {
      await adapter.initialize()

      const intervalId = adapter.flushInterval
      expect(intervalId).toBeDefined()

      await adapter.close()

      expect(adapter.redisAdapter.close).toHaveBeenCalled()
      expect(adapter.postgresAdapter.close).toHaveBeenCalled()
      expect(adapter.flushInterval).toBeNull()
    })
  })
})