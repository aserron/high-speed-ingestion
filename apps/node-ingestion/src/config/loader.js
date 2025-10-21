/**
 * Configuration loader with hierarchical file loading and environment variable support.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { configSchema } from './schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Global configuration cache
let _config = null

/**
 * Load configuration from hierarchical config files and environment variables.
 * 
 * Loading order:
 * 1. Base configuration files
 * 2. Environment-specific configuration
 * 3. Local development overrides
 * 4. Environment variables (highest priority)
 */
export function loadConfig() {
  const config = {}
  
  // Get the project root directory (assuming standard structure)
  const projectRoot = path.resolve(__dirname, '../../../../../..')
  const configDir = path.join(projectRoot, 'configs')
  
  if (!fs.existsSync(configDir)) {
    console.warn(`Configuration directory not found: ${configDir}`)
    return validateAndTransformConfig(config)
  }
  
  // Load base configuration files
  const baseDir = path.join(configDir, 'base')
  if (fs.existsSync(baseDir)) {
    const baseFiles = fs.readdirSync(baseDir).filter(file => file.endsWith('.env'))
    for (const file of baseFiles) {
      const filePath = path.join(baseDir, file)
      Object.assign(config, loadEnvFile(filePath))
    }
  }
  
  // Load environment-specific configuration
  const environment = process.env.NODE_ENV || process.env.DEPLOYMENT_ENVIRONMENT || 'development'
  const envFile = path.join(configDir, 'environments', `${environment}.env`)
  if (fs.existsSync(envFile)) {
    Object.assign(config, loadEnvFile(envFile))
  }
  
  // Load local development overrides
  const localFile = path.join(configDir, 'local', '.env.local')
  if (fs.existsSync(localFile)) {
    Object.assign(config, loadEnvFile(localFile))
  }
  
  // Override with environment variables
  Object.assign(config, loadEnvironmentVariables())
  
  return validateAndTransformConfig(config)
}

/**
 * Load environment variables from a file.
 */
function loadEnvFile(filePath) {
  const config = {}
  
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue
      }
      
      // Parse key=value pairs
      const equalIndex = trimmedLine.indexOf('=')
      if (equalIndex === -1) {
        continue
      }
      
      let key = trimmedLine.substring(0, equalIndex).trim()
      let value = trimmedLine.substring(equalIndex + 1).trim()
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      
      // Convert key to camelCase for nested objects
      key = transformKey(key)
      
      // Convert value types
      value = convertValue(value)
      
      // Set nested properties
      setNestedProperty(config, key, value)
    }
  } catch (error) {
    console.warn(`Warning: Could not load config file ${filePath}: ${error.message}`)
  }
  
  return config
}

/**
 * Load configuration from environment variables.
 */
function loadEnvironmentVariables() {
  const config = {}
  
  // Define environment variable mappings
  const envMappings = {
    // Application settings
    'PORT': 'port',
    'HOST': 'host',
    'LOG_LEVEL': 'logLevel',
    'LOG_FORMAT': 'logFormat',
    'ENABLE_METRICS': 'enableMetrics',
    'ENABLE_CLUSTERING': 'enableClustering',
    'CLUSTER_WORKERS': 'clusterWorkers',
    'NODE_ENV': 'environment',
    'DEPLOYMENT_ENVIRONMENT': 'environment',
    'DEPLOYMENT_VERSION': 'version',
    'BUILD_NUMBER': 'buildNumber',
    'GIT_COMMIT_HASH': 'gitCommit',
    
    // Database settings
    'DB_HOST': 'database.host',
    'DB_PORT': 'database.port',
    'DB_NAME': 'database.name',
    'DB_USERNAME': 'database.username',
    'DB_PASSWORD': 'database.password',
    'DB_SSL': 'database.ssl',
    'DB_POOL_MIN': 'database.poolMin',
    'DB_POOL_MAX': 'database.poolMax',
    'DB_CONNECTION_TIMEOUT': 'database.connectionTimeout',
    'DB_IDLE_TIMEOUT': 'database.idleTimeout',
    
    // Redis settings
    'REDIS_HOST': 'redis.host',
    'REDIS_PORT': 'redis.port',
    'REDIS_PASSWORD': 'redis.password',
    'REDIS_DB': 'redis.db',
    'REDIS_CONNECT_TIMEOUT': 'redis.connectTimeout',
    'REDIS_COMMAND_TIMEOUT': 'redis.commandTimeout',
    'REDIS_RETRY_ATTEMPTS': 'redis.retryAttempts',
    'REDIS_RETRY_DELAY': 'redis.retryDelay',
    
    // WebSocket settings
    'WS_ENABLED': 'websocket.enabled',
    'WS_PORT': 'websocket.port',
    'WS_PATH': 'websocket.path',
    'WS_HEARTBEAT_INTERVAL': 'websocket.heartbeatInterval',
    'WS_MAX_CONNECTIONS': 'websocket.maxConnections',
    'WS_COMPRESSION': 'websocket.compression',
    
    // Monitoring settings
    'PROMETHEUS_ENABLED': 'monitoring.prometheusEnabled',
    'PROMETHEUS_PORT': 'monitoring.prometheusPort',
    'PROMETHEUS_METRICS_PATH': 'monitoring.prometheusPath',
    'GRAFANA_ENABLED': 'monitoring.grafanaEnabled',
    'GRAFANA_PORT': 'monitoring.grafanaPort',
    
    // Security settings
    'CORS_ENABLED': 'security.corsEnabled',
    'CORS_ORIGIN': 'security.corsOrigin',
    'RATE_LIMIT_ENABLED': 'security.rateLimitEnabled',
    'RATE_LIMIT_MAX': 'security.rateLimitMax',
    'RATE_LIMIT_WINDOW': 'security.rateLimitWindow',
    'SSL_ENABLED': 'security.sslEnabled',
    'SSL_CERT_PATH': 'security.sslCertPath',
    'SSL_KEY_PATH': 'security.sslKeyPath'
  }
  
  for (const [envVar, configPath] of Object.entries(envMappings)) {
    const value = process.env[envVar]
    if (value !== undefined) {
      setNestedProperty(config, configPath, convertValue(value))
    }
  }
  
  return config
}

/**
 * Transform environment variable key to camelCase configuration key.
 */
function transformKey(key) {
  // Convert DB_HOST to database.host, REDIS_PORT to redis.port, etc.
  const prefixMappings = {
    'DB_': 'database.',
    'REDIS_': 'redis.',
    'WS_': 'websocket.',
    'PROMETHEUS_': 'monitoring.prometheus',
    'GRAFANA_': 'monitoring.grafana',
    'CORS_': 'security.cors',
    'RATE_LIMIT_': 'security.rateLimit',
    'SSL_': 'security.ssl'
  }
  
  for (const [prefix, replacement] of Object.entries(prefixMappings)) {
    if (key.startsWith(prefix)) {
      const suffix = key.substring(prefix.length)
      const camelSuffix = suffix.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      return replacement + camelSuffix.charAt(0).toUpperCase() + camelSuffix.slice(1)
    }
  }
  
  // Convert general keys to camelCase
  return key.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert string values to appropriate types.
 */
function convertValue(value) {
  if (typeof value !== 'string') {
    return value
  }
  
  // Convert boolean strings
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  
  // Convert numeric strings
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10)
  }
  
  if (/^\d+\.\d+$/.test(value)) {
    return parseFloat(value)
  }
  
  // Handle environment variable substitution
  if (value.startsWith('${') && value.endsWith('}')) {
    const envVar = value.slice(2, -1)
    return process.env[envVar] || value
  }
  
  return value
}

/**
 * Set a nested property in an object using dot notation.
 */
function setNestedProperty(obj, path, value) {
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}

/**
 * Validate and transform configuration using Joi schema.
 */
function validateAndTransformConfig(config) {
  const { error, value, warning } = configSchema.validate(config, {
    allowUnknown: false,
    stripUnknown: true,
    abortEarly: false
  })
  
  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`)
  }
  
  if (warning) {
    console.warn(`Configuration warnings: ${warning.message}`)
  }
  
  return value
}

/**
 * Get the cached configuration instance.
 */
export function getConfig() {
  if (_config === null) {
    _config = loadConfig()
  }
  return _config
}

/**
 * Validate configuration for a specific environment.
 */
export function validateConfig(environment = null) {
  const errors = []
  const warnings = []
  
  // Set environment if provided
  if (environment) {
    process.env.DEPLOYMENT_ENVIRONMENT = environment
  }
  
  try {
    // Clear cached config to reload with new environment
    _config = null
    const config = getConfig()
    
    // Check for default/insecure values
    if (['postgres', 'password', 'admin'].includes(config.database.password)) {
      warnings.push('Using default database password - change for production')
    }
    
    if (config.redis.password && ['redis', 'password'].includes(config.redis.password)) {
      warnings.push('Using default Redis password - change for production')
    }
    
    // Environment-specific validations
    if (environment === 'production') {
      if (!config.security.sslEnabled) {
        warnings.push('SSL is disabled in production environment')
      }
      
      if (config.logLevel === 'debug') {
        warnings.push('Debug logging enabled in production')
      }
      
      if (config.security.corsOrigin === '*') {
        errors.push('CORS origin cannot be "*" in production')
      }
      
      if (!config.security.rateLimitEnabled) {
        warnings.push('Rate limiting is disabled in production')
      }
    }
    
    // Check required environment variables for non-development environments
    if (['staging', 'production'].includes(environment)) {
      const requiredVars = [
        `${environment.toUpperCase()}_DB_HOST`,
        `${environment.toUpperCase()}_DB_USERNAME`,
        `${environment.toUpperCase()}_DB_PASSWORD`,
        `${environment.toUpperCase()}_REDIS_HOST`
      ]
      
      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          errors.push(`Required environment variable ${varName} is not set`)
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config
    }
    
  } catch (error) {
    errors.push(`Configuration validation failed: ${error.message}`)
    return {
      valid: false,
      errors,
      warnings,
      config: null
    }
  }
}

/**
 * Reload the configuration (clear cache and reload).
 */
export function reloadConfig() {
  _config = null
  return getConfig()
}