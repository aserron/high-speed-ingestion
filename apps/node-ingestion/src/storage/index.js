/**
 * Storage Layer Infrastructure
 *
 * Main entry point for the Node.js storage layer providing unified access
 * to Redis, PostgreSQL, and specialized market data storage adapters.
 */

// Connection Managers
import { StorageFactory } from './interfaces.js'
import { getLogger } from '../logging/index.js'
import { getConfig } from '../config/index.js'

export { RedisConnectionManager, getRedisManager, initializeRedis } from './redis.js'
export { PostgreSQLConnectionManager, getPostgreSQLManager, initializePostgreSQL } from './postgresql.js'

// Storage Interfaces
export {
  BaseStorageInterface,
  KeyValueStorageInterface,
  RelationalStorageInterface,
  TimeSeriesStorageInterface,
  MarketDataStorageInterface,
  StorageFactory,
  StorageConfigValidator
} from './interfaces.js'

// Storage Adapters
export { RedisStorageAdapter } from './adapters/redis-adapter.js'
export { PostgreSQLStorageAdapter } from './adapters/postgresql-adapter.js'
export { MarketDataStorageAdapter } from './adapters/marketdata-adapter.js'

/**
 * Storage manager for coordinating multiple storage backends
 */
export class StorageManager {
  constructor (config = null) {
    this.config = config || getConfig()
    this.logger = getLogger('storage-manager')
    this.storageInstances = new Map()
    this.isInitialized = false
  }

  /**
   * Initialize all storage backends
   */
  async initialize () {
    if (this.isInitialized) {
      this.logger.warn('Storage manager already initialized')
      return
    }

    this.logger.info('Initializing storage manager')

    try {
      // Initialize Redis storage
      const redisStorage = await StorageFactory.createStorage('redis', this.config)
      this.storageInstances.set('redis', redisStorage)

      // Initialize PostgreSQL storage
      const postgresStorage = await StorageFactory.createStorage('postgresql', this.config)
      this.storageInstances.set('postgresql', postgresStorage)

      // Initialize Market Data storage (combines Redis + PostgreSQL)
      const marketDataStorage = await StorageFactory.createStorage('marketdata', this.config)
      this.storageInstances.set('marketdata', marketDataStorage)

      this.isInitialized = true
      this.logger.info('Storage manager initialized successfully', {
        backends: Array.from(this.storageInstances.keys())
      })
    } catch (error) {
      this.logger.error('Failed to initialize storage manager', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Get storage instance by type
   */
  getStorage (type) {
    if (!this.isInitialized) {
      throw new Error('Storage manager not initialized')
    }

    const storage = this.storageInstances.get(type.toLowerCase())
    if (!storage) {
      throw new Error(`Storage type '${type}' not found`)
    }

    return storage
  }

  /**
   * Get Redis storage
   */
  getRedisStorage () {
    return this.getStorage('redis')
  }

  /**
   * Get PostgreSQL storage
   */
  getPostgreSQLStorage () {
    return this.getStorage('postgresql')
  }

  /**
   * Get Market Data storage
   */
  getMarketDataStorage () {
    return this.getStorage('marketdata')
  }

  /**
   * Perform health check on all storage backends
   */
  async healthCheck () {
    if (!this.isInitialized) {
      return { healthy: false, error: 'Storage manager not initialized' }
    }

    const healthResults = {}
    let overallHealthy = true

    for (const [type, storage] of this.storageInstances) {
      try {
        const health = await storage.healthCheck()
        healthResults[type] = health

        if (!health.healthy) {
          overallHealthy = false
        }
      } catch (error) {
        healthResults[type] = {
          healthy: false,
          error: error.message
        }
        overallHealthy = false
      }
    }

    return {
      healthy: overallHealthy,
      backends: healthResults,
      timestamp: Date.now()
    }
  }

  /**
   * Get statistics from all storage backends
   */
  getStats () {
    if (!this.isInitialized) {
      return { error: 'Storage manager not initialized' }
    }

    const stats = {
      initialized: this.isInitialized,
      backends: {},
      timestamp: Date.now()
    }

    for (const [type, storage] of this.storageInstances) {
      try {
        stats.backends[type] = storage.getStats()
      } catch (error) {
        stats.backends[type] = { error: error.message }
      }
    }

    return stats
  }

  /**
   * Close all storage connections
   */
  async close () {
    if (!this.isInitialized) {
      return
    }

    this.logger.info('Closing storage manager')

    const closePromises = []

    for (const [type, storage] of this.storageInstances) {
      closePromises.push(
        storage.close().catch(error => {
          this.logger.error(`Error closing ${type} storage`, {
            error: error.message
          })
        })
      )
    }

    await Promise.all(closePromises)

    this.storageInstances.clear()
    this.isInitialized = false

    this.logger.info('Storage manager closed')
  }
}

// Global storage manager instance
let storageManager = null

/**
 * Get the global storage manager instance
 */
export function getStorageManager () {
  if (!storageManager) {
    storageManager = new StorageManager()
  }
  return storageManager
}

/**
 * Initialize global storage manager
 */
export async function initializeStorage (config = null) {
  const manager = new StorageManager(config)
  await manager.initialize()
  storageManager = manager
  return manager
}

/**
 * Convenience functions for direct storage access
 */
export async function getRedisStorage () {
  const manager = getStorageManager()
  if (!manager.isInitialized) {
    await manager.initialize()
  }
  return manager.getRedisStorage()
}

export async function getPostgreSQLStorage () {
  const manager = getStorageManager()
  if (!manager.isInitialized) {
    await manager.initialize()
  }
  return manager.getPostgreSQLStorage()
}

export async function getMarketDataStorage () {
  const manager = getStorageManager()
  if (!manager.isInitialized) {
    await manager.initialize()
  }
  return manager.getMarketDataStorage()
}

export default {
  StorageManager,
  getStorageManager,
  initializeStorage,
  getRedisStorage,
  getPostgreSQLStorage,
  getMarketDataStorage
}
