/**
 * Redis Storage Adapter
 *
 * Implements the KeyValueStorageInterface using Redis as the backend
 * for high-performance caching and temporary data storage.
 */

import { KeyValueStorageInterface } from '../interfaces.js'
import { RedisConnectionManager } from '../redis.js'
import { ValidationError, StorageError } from '../../errors/index.js'
import { getLogger } from '../../logging/index.js'
import { handleJsonParseError, handleSerializationError } from '../../utils/error-handlers.js'
import { validators } from '../../utils/common-utilities.js'
import { validators } from '../../utils/common-utilities.js'

/**
 * Redis storage adapter implementing KeyValueStorageInterface
 */
export class RedisStorageAdapter extends KeyValueStorageInterface {
  constructor (config = null) {
    super()
    this.connectionManager = new RedisConnectionManager(config)
    this.logger = getLogger('redis-adapter')
  }

  /**
   * Initialize Redis storage
   */
  async initialize () {
    await this.connectionManager.initialize()
    this.logger.info('Redis storage adapter initialized')
  }

  /**
   * Perform health check
   */
  async healthCheck () {
    return await this.connectionManager.healthCheck()
  }

  /**
   * Get storage statistics
   */
  getStats () {
    return {
      type: 'redis',
      ...this.connectionManager.getStats()
    }
  }

  /**
   * Set a key-value pair
   */
  async set (key, value, options = {}) {
    validators.key(key)

    const serializedValue = handleSerializationError(value)
    const expirationMs = options.ttl ? options.ttl * 1000 : options.expirationMs
    return await this.connectionManager.set(key, serializedValue, expirationMs)
  }

  /**
   * Get value by key
   */
  async get (key) {
    validators.key(key)

    const value = await this.connectionManager.get(key)

    if (value === null) {
      return null
    }

    return handleJsonParseError(value, value)
  }

  /**
   * Delete key(s)
   */
  async delete (...keys) {
    if (keys.length === 0) {
      throw new ValidationError('At least one key is required', 'keys', keys)
    }

    return await this.connectionManager.del(...keys)
  }

  /**
   * Check if key exists
   */
  async exists (...keys) {
    if (keys.length === 0) {
      throw new ValidationError('At least one key is required', 'keys', keys)
    }

    return await this.connectionManager.exists(...keys)
  }

  /**
   * Set expiration on key
   */
  async expire (key, seconds) {
    if (!key) {
      throw new ValidationError('Key is required', 'key', key)
    }
    if (typeof seconds !== 'number' || seconds <= 0) {
      throw new ValidationError('Seconds must be a positive number', 'seconds', seconds)
    }

    return await this.connectionManager.expire(key, seconds)
  }

  /**
   * Get multiple keys at once
   */
  async mget (...keys) {
    if (keys.length === 0) {
      throw new ValidationError('At least one key is required', 'keys', keys)
    }

    const pipeline = this.connectionManager.pipeline()

    for (const key of keys) {
      pipeline.get(key)
    }

    const results = await this.connectionManager.executePipeline(pipeline)

    return results.map(([error, value]) => {
      if (error) {
        throw new StorageError(`Failed to get key: ${error.message}`, 'redis', 'mget', null, { cause: error })
      }

      if (value === null) {
        return null
      }

      try {
        return JSON.parse(value)
      } catch (parseError) {
        return value
      }
    })
  }

  /**
   * Set multiple key-value pairs at once
   */
  async mset (keyValuePairs) {
    validators.keyValuePairs(keyValuePairs)

    const pipeline = this.connectionManager.pipeline()

    for (const [key, value] of Object.entries(keyValuePairs)) {
      let serializedValue
      try {
        serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
      } catch (error) {
        throw new ValidationError(`Value for key ${key} must be serializable`, 'value', value, { cause: error })
      }

      pipeline.set(key, serializedValue)
    }

    const results = await this.connectionManager.executePipeline(pipeline)

    // Check for errors in pipeline results
    for (let i = 0; i < results.length; i++) {
      const [error] = results[i]
      if (error) {
        const key = Object.keys(keyValuePairs)[i]
        throw new StorageError(`Failed to set key ${key}: ${error.message}`, 'redis', 'mset', null, { cause: error })
      }
    }

    return results.length
  }

  /**
   * Increment numeric value
   */
  async increment (key, amount = 1) {
    if (!key) {
      throw new ValidationError('Key is required', 'key', key)
    }

    if (amount === 1) {
      return await this.connectionManager.incr(key)
    } else {
      return await this.connectionManager.incrby(key, amount)
    }
  }

  /**
   * Hash operations
   */
  async hset (key, field, value) {
    validators.keyField(key, field)

    let serializedValue
    try {
      serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
    } catch (error) {
      throw new ValidationError('Value must be serializable', 'value', value, { cause: error })
    }

    return await this.connectionManager.hset(key, field, serializedValue)
  }

  async hget (key, field) {
    if (!key || !field) {
      throw new ValidationError('Key and field are required', 'key/field', { key, field })
    }

    const value = await this.connectionManager.hget(key, field)

    if (value === null) {
      return null
    }

    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }

  async hgetall (key) {
    if (!key) {
      throw new ValidationError('Key is required', 'key', key)
    }

    const hash = await this.connectionManager.hgetall(key)

    if (!hash) {
      return {}
    }

    const result = {}
    for (const [field, value] of Object.entries(hash)) {
      try {
        result[field] = JSON.parse(value)
      } catch (error) {
        result[field] = value
      }
    }

    return result
  }

  async hdel (key, ...fields) {
    if (!key || fields.length === 0) {
      throw new ValidationError('Key and at least one field are required', 'key/fields', { key, fields })
    }

    return await this.connectionManager.hdel(key, ...fields)
  }

  /**
   * List operations
   */
  async lpush (key, ...values) {
    if (!key || values.length === 0) {
      throw new ValidationError('Key and at least one value are required', 'key/values', { key, values })
    }

    const serializedValues = values.map(value => {
      try {
        return typeof value === 'string' ? value : JSON.stringify(value)
      } catch (error) {
        throw new ValidationError('All values must be serializable', 'value', value, { cause: error })
      }
    })

    return await this.connectionManager.lpush(key, ...serializedValues)
  }

  async rpush (key, ...values) {
    if (!key || values.length === 0) {
      throw new ValidationError('Key and at least one value are required', 'key/values', { key, values })
    }

    const serializedValues = values.map(value => {
      try {
        return typeof value === 'string' ? value : JSON.stringify(value)
      } catch (error) {
        throw new ValidationError('All values must be serializable', 'value', value, { cause: error })
      }
    })

    return await this.connectionManager.rpush(key, ...serializedValues)
  }

  async lpop (key) {
    if (!key) {
      throw new ValidationError('Key is required', 'key', key)
    }

    const value = await this.connectionManager.lpop(key)

    if (value === null) {
      return null
    }

    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }

  async rpop (key) {
    if (!key) {
      throw new ValidationError('Key is required', 'key', key)
    }

    const value = await this.connectionManager.rpop(key)

    if (value === null) {
      return null
    }

    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }

  async llen (key) {
    if (!key) {
      throw new ValidationError('Key is required', 'key', key)
    }

    return await this.connectionManager.llen(key)
  }

  async lrange (key, start, stop) {
    if (!key) {
      throw new ValidationError('Key is required', 'key', key)
    }

    const values = await this.connectionManager.lrange(key, start, stop)

    return values.map(value => {
      try {
        return JSON.parse(value)
      } catch (error) {
        return value
      }
    })
  }

  /**
   * Close Redis connection
   */
  async close () {
    await this.connectionManager.close()
    this.logger.info('Redis storage adapter closed')
  }
}

export default RedisStorageAdapter
