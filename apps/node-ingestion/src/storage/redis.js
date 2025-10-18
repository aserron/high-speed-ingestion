/**
 * Redis Connection Manager
 *
 * High-performance Redis connection manager with connection pooling,
 * automatic failover, and comprehensive monitoring for the Node.js
 * financial data ingestion system.
 */

import Redis from 'ioredis'
import { getConfig } from '../config/index.js'
import { getLogger } from '../logging/index.js'
import { ConnectionError, StorageError } from '../errors/index.js'
import { handleConnectionInitError, handleHealthCheckError, handleQueryError, handlePeriodicTaskError } from '../utils/error-handlers.js'
import { createInitializableSingleton } from '../utils/common-utilities.js'

/**
 * Redis connection manager with pooling and monitoring
 */
export class RedisConnectionManager {
  constructor (config = null) {
    this.config = config || getConfig()
    this.logger = getLogger('redis-manager')
    this.pool = null
    this.isConnected = false
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      reconnectAttempts: 0,
      lastConnectionTime: null,
      lastErrorTime: null,
      totalCommands: 0,
      failedCommands: 0
    }
    this.healthCheckInterval = null
  }

  /**
   * Initialize Redis connection pool
   */
  async initialize () {
    try {
      this.logger.info('Initializing Redis connection manager', {
        host: this.config.redis.host,
        port: this.config.redis.port,
        db: this.config.redis.db,
        maxConnections: this.config.redis.maxConnections
      })

      // Create Redis cluster or single instance
      const redisOptions = {
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db,

        // Connection pooling
        maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
        retryDelayOnFailover: this.config.redis.retryDelayOnFailover,

        // Performance settings
        keepAlive: this.config.redis.socketKeepalive,
        keyPrefix: this.config.redis.keyPrefix,

        // Connection timeout
        connectTimeout: this.config.redis.acquireTimeoutMs,
        lazyConnect: true,

        // Retry strategy
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          this.logger.warn('Redis connection retry', { attempt: times, delayMs: delay })
          return delay
        },

        // Reconnect on error
        reconnectOnError: (err) => {
          const targetError = 'READONLY'
          return err.message.includes(targetError)
        }
      }

      this.pool = new Redis(redisOptions)

      // Setup event handlers
      this.setupEventHandlers()

      // Connect to Redis
      await this.pool.connect()

      this.isConnected = true
      this.connectionStats.totalConnections++
      this.connectionStats.activeConnections++
      this.connectionStats.lastConnectionTime = Date.now()

      // Start health monitoring
      this.startHealthMonitoring()

      this.logger.info('Redis connection manager initialized successfully')
    } catch (error) {
      handleConnectionInitError(
        error,
        'redis',
        `${this.config.redis.host}:${this.config.redis.port}`,
        this.connectionStats
      )
    }
  }

  /**
   * Setup Redis event handlers
   */
  setupEventHandlers () {
    this.pool.on('connect', () => {
      this.logger.info('Redis connected')
      this.isConnected = true
      this.connectionStats.activeConnections++
    })

    this.pool.on('ready', () => {
      this.logger.info('Redis ready for commands')
    })

    this.pool.on('error', (error) => {
      this.logger.error('Redis connection error', {
        error: error.message,
        stack: error.stack
      })
      this.connectionStats.failedConnections++
      this.connectionStats.lastErrorTime = Date.now()
    })

    this.pool.on('close', () => {
      this.logger.warn('Redis connection closed')
      this.isConnected = false
      this.connectionStats.activeConnections = Math.max(0, this.connectionStats.activeConnections - 1)
    })

    this.pool.on('reconnecting', (ms) => {
      this.logger.info('Redis reconnecting', { delayMs: ms })
      this.connectionStats.reconnectAttempts++
    })

    this.pool.on('end', () => {
      this.logger.warn('Redis connection ended')
      this.isConnected = false
    })
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
        handlePeriodicTaskError(error, 'Redis health check', this.logger)
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Perform health check
   */
  async healthCheck () {
    if (!this.pool) {
      throw new StorageError('Redis pool not initialized')
    }

    const start = process.hrtime.bigint()

    try {
      const result = await this.pool.ping()
      const latencyNs = process.hrtime.bigint() - start

      if (result !== 'PONG') {
        throw new StorageError('Redis ping returned unexpected result', 'redis', 'ping')
      }

      this.logger.debug('Redis health check passed', {
        latencyNs: latencyNs.toString(),
        latencyMs: Number(latencyNs) / 1_000_000
      })

      return {
        healthy: true,
        latencyNs: latencyNs.toString(),
        timestamp: Date.now()
      }
    } catch (error) {
      handleHealthCheckError(error, 'Redis', start)
    }
  }

  /**
   * Execute Redis command with error handling and metrics
   */
  async execute (command, ...args) {
    if (!this.pool || !this.isConnected) {
      throw new StorageError('Redis not connected', 'redis', command)
    }

    const start = process.hrtime.bigint()

    try {
      this.connectionStats.totalCommands++

      const result = await this.pool[command](...args)
      const latencyNs = process.hrtime.bigint() - start

      this.logger.debug('Redis command executed', {
        command,
        latencyNs: latencyNs.toString(),
        latencyMs: Number(latencyNs) / 1_000_000
      })

      return result
    } catch (error) {
      handleQueryError(error, 'redis', command, start, this.connectionStats)
    }
  }

  /**
   * Set key-value pair with optional expiration
   */
  async set (key, value, expirationMs = null) {
    const args = [key, value]
    if (expirationMs) {
      args.push('PX', expirationMs)
    }
    return await this.execute('set', ...args)
  }

  /**
   * Get value by key
   */
  async get (key) {
    return await this.execute('get', key)
  }

  /**
   * Delete key(s)
   */
  async del (...keys) {
    return await this.execute('del', ...keys)
  }

  /**
   * Check if key exists
   */
  async exists (...keys) {
    return await this.execute('exists', ...keys)
  }

  /**
   * Set expiration on key
   */
  async expire (key, seconds) {
    return await this.execute('expire', key, seconds)
  }

  /**
   * Get time to live for key
   */
  async ttl (key) {
    return await this.execute('ttl', key)
  }

  /**
   * Increment numeric value
   */
  async incr (key) {
    return await this.execute('incr', key)
  }

  /**
   * Increment by specific amount
   */
  async incrby (key, increment) {
    return await this.execute('incrby', key, increment)
  }

  /**
   * Hash operations
   */
  async hset (key, field, value) {
    return await this.execute('hset', key, field, value)
  }

  async hget (key, field) {
    return await this.execute('hget', key, field)
  }

  async hgetall (key) {
    return await this.execute('hgetall', key)
  }

  async hdel (key, ...fields) {
    return await this.execute('hdel', key, ...fields)
  }

  /**
   * List operations
   */
  async lpush (key, ...values) {
    return await this.execute('lpush', key, ...values)
  }

  async rpush (key, ...values) {
    return await this.execute('rpush', key, ...values)
  }

  async lpop (key) {
    return await this.execute('lpop', key)
  }

  async rpop (key) {
    return await this.execute('rpop', key)
  }

  async llen (key) {
    return await this.execute('llen', key)
  }

  async lrange (key, start, stop) {
    return await this.execute('lrange', key, start, stop)
  }

  /**
   * Set operations
   */
  async sadd (key, ...members) {
    return await this.execute('sadd', key, ...members)
  }

  async srem (key, ...members) {
    return await this.execute('srem', key, ...members)
  }

  async smembers (key) {
    return await this.execute('smembers', key)
  }

  async scard (key) {
    return await this.execute('scard', key)
  }

  /**
   * Sorted set operations
   */
  async zadd (key, score, member) {
    return await this.execute('zadd', key, score, member)
  }

  async zrem (key, ...members) {
    return await this.execute('zrem', key, ...members)
  }

  async zrange (key, start, stop, withScores = false) {
    const args = [key, start, stop]
    if (withScores) args.push('WITHSCORES')
    return await this.execute('zrange', ...args)
  }

  async zcard (key) {
    return await this.execute('zcard', key)
  }

  /**
   * Pipeline operations for batch processing
   */
  pipeline () {
    if (!this.pool || !this.isConnected) {
      throw new StorageError('Redis not connected', 'redis', 'pipeline')
    }
    return this.pool.pipeline()
  }

  /**
   * Execute pipeline
   */
  async executePipeline (pipeline) {
    const start = process.hrtime.bigint()

    try {
      const results = await pipeline.exec()
      const latencyNs = process.hrtime.bigint() - start

      this.logger.debug('Redis pipeline executed', {
        commands: pipeline.length,
        latencyNs: latencyNs.toString(),
        latencyMs: Number(latencyNs) / 1_000_000
      })

      return results
    } catch (error) {
      const latencyNs = process.hrtime.bigint() - start

      throw new StorageError(
        'Redis pipeline execution failed',
        'redis',
        'pipeline',
        null,
        {
          context: {
            commands: pipeline.length,
            latencyNs: latencyNs.toString(),
            latencyMs: Number(latencyNs) / 1_000_000
          },
          cause: error
        }
      )
    }
  }

  /**
   * Get connection statistics
   */
  getStats () {
    return {
      ...this.connectionStats,
      isConnected: this.isConnected,
      poolStatus: this.pool ? this.pool.status : 'not_initialized',
      uptime: this.connectionStats.lastConnectionTime
        ? Date.now() - this.connectionStats.lastConnectionTime
        : 0
    }
  }

  /**
   * Close Redis connection
   */
  async close () {
    this.logger.info('Closing Redis connection manager')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    if (this.pool) {
      await this.pool.quit()
      this.pool = null
    }

    this.isConnected = false
    this.connectionStats.activeConnections = 0

    this.logger.info('Redis connection manager closed')
  }
}

// Global Redis manager instance
const redisManagerSingleton = createInitializableSingleton((config) => new RedisConnectionManager(config))

/**
 * Get the global Redis manager instance
 */
export function getRedisManager () {
  return redisManagerSingleton.getInstance()
}

/**
 * Initialize Redis manager
 */
export async function initializeRedis (config = null) {
  return await redisManagerSingleton.initialize(config)
}

export default {
  RedisConnectionManager,
  getRedisManager,
  initializeRedis
}
