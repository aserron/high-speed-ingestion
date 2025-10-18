/**
 * Common Utility Functions
 *
 * Provides reusable utility functions to reduce code duplication
 * across the application, including validation, configuration, and
 * common patterns.
 */

import { ValidationError } from '../errors/index.js'

/**
 * Singleton pattern utility
 */
export function createSingleton(createInstance) {
  let instance = null
  
  return function getInstance(...args) {
    if (!instance) {
      instance = createInstance(...args)
    }
    return instance
  }
}

/**
 * Initialize and get singleton pattern
 */
export function createInitializableSingleton(createInstance) {
  let instance = null
  
  return {
    getInstance: function(...args) {
      if (!instance) {
        instance = createInstance(...args)
      }
      return instance
    },
    
    initialize: async function(config = null) {
      const inst = createInstance(config)
      await inst.initialize()
      instance = inst
      return inst
    }
  }
}

/**
 * Common validation utilities
 */
export const validators = {
  /**
   * Validate required parameter
   */
  required(value, paramName, context = null) {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(
        `${paramName} is required`,
        paramName,
        value,
        { context }
      )
    }
    return value
  },

  /**
   * Validate key parameter (non-empty string)
   */
  key(key, paramName = 'key') {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new ValidationError(
        `${paramName} must be a non-empty string`,
        paramName,
        key
      )
    }
    return key.trim()
  },

  /**
   * Validate array parameter
   */
  array(arr, paramName = 'array', minLength = 0) {
    if (!Array.isArray(arr)) {
      throw new ValidationError(
        `${paramName} must be an array`,
        paramName,
        arr
      )
    }
    if (arr.length < minLength) {
      throw new ValidationError(
        `${paramName} must have at least ${minLength} item(s)`,
        paramName,
        arr
      )
    }
    return arr
  },

  /**
   * Validate object parameter
   */
  object(obj, paramName = 'object') {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new ValidationError(
        `${paramName} must be an object`,
        paramName,
        obj
      )
    }
    return obj
  },

  /**
   * Validate function parameter
   */
  function(fn, paramName = 'function') {
    if (typeof fn !== 'function') {
      throw new ValidationError(
        `${paramName} must be a function`,
        paramName,
        fn
      )
    }
    return fn
  },

  /**
   * Validate positive number
   */
  positiveNumber(num, paramName = 'number') {
    if (typeof num !== 'number' || num <= 0 || isNaN(num)) {
      throw new ValidationError(
        `${paramName} must be a positive number`,
        paramName,
        num
      )
    }
    return num
  },

  /**
   * Validate key-value pairs object
   */
  keyValuePairs(pairs, paramName = 'keyValuePairs') {
    this.object(pairs, paramName)
    if (Object.keys(pairs).length === 0) {
      throw new ValidationError(
        `${paramName} must not be empty`,
        paramName,
        pairs
      )
    }
    return pairs
  },

  /**
   * Validate key and field combination
   */
  keyField(key, field, keyName = 'key', fieldName = 'field') {
    this.key(key, keyName)
    this.key(field, fieldName)
    return { key, field }
  }
}

/**
 * Configuration utilities
 */
export const configUtils = {
  /**
   * Get configuration with fallback
   */
  getConfigWithFallback(getConfigFn, fallbackConfig = {}) {
    try {
      return getConfigFn() || fallbackConfig
    } catch (error) {
      return fallbackConfig
    }
  },

  /**
   * Extract nested configuration
   */
  extractConfig(config, path, defaultValue = null) {
    const keys = path.split('.')
    let current = config
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return defaultValue
      }
    }
    
    return current
  },

  /**
   * Merge configuration objects
   */
  mergeConfigs(baseConfig, overrideConfig) {
    if (!overrideConfig) return baseConfig
    if (!baseConfig) return overrideConfig
    
    const merged = { ...baseConfig }
    
    for (const [key, value] of Object.entries(overrideConfig)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value) && 
            typeof merged[key] === 'object' && !Array.isArray(merged[key])) {
          merged[key] = this.mergeConfigs(merged[key], value)
        } else {
          merged[key] = value
        }
      }
    }
    
    return merged
  }
}

/**
 * Common async utilities
 */
export const asyncUtils = {
  /**
   * Retry async operation with exponential backoff
   */
  async retry(operation, maxAttempts = 3, baseDelay = 1000, backoffMultiplier = 2) {
    let lastError
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxAttempts) {
          throw error
        }
        
        const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1)
        await this.delay(delay)
      }
    }
    
    throw lastError
  },

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  /**
   * Timeout wrapper for promises
   */
  withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timed out') {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      })
    ])
  }
}

/**
 * Performance utilities
 */
export const perfUtils = {
  /**
   * Measure execution time in nanoseconds
   */
  measureTime(fn) {
    const start = process.hrtime.bigint()
    const result = fn()
    const end = process.hrtime.bigint()
    
    return {
      result,
      durationNs: Number(end - start)
    }
  },

  /**
   * Measure async execution time in nanoseconds
   */
  async measureTimeAsync(fn) {
    const start = process.hrtime.bigint()
    const result = await fn()
    const end = process.hrtime.bigint()
    
    return {
      result,
      durationNs: Number(end - start)
    }
  },

  /**
   * Convert nanoseconds to milliseconds
   */
  nsToMs(nanoseconds) {
    return Number(nanoseconds) / 1_000_000
  },

  /**
   * Convert nanoseconds to seconds
   */
  nsToSeconds(nanoseconds) {
    return Number(nanoseconds) / 1_000_000_000
  }
}

/**
 * String utilities
 */
export const stringUtils = {
  /**
   * Truncate string with ellipsis
   */
  truncate(str, maxLength = 100, suffix = '...') {
    if (!str || str.length <= maxLength) {
      return str
    }
    return str.substring(0, maxLength - suffix.length) + suffix
  },

  /**
   * Safe string conversion
   */
  toString(value, fallback = '') {
    if (value === null || value === undefined) {
      return fallback
    }
    return String(value)
  },

  /**
   * Generate random string
   */
  randomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return result
  }
}

export default {
  createSingleton,
  createInitializableSingleton,
  validators,
  configUtils,
  asyncUtils,
  perfUtils,
  stringUtils
}