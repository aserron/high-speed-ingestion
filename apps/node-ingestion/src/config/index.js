/**
 * Configuration Management System
<<<<<<< HEAD
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
 * Provides centralized configuration management with validation,
 * environment variable support, and type checking for the Node.js
 * financial data ingestion system.
 */

<<<<<<< HEAD
<<<<<<< HEAD
// import { fileURLToPath } from 'url'
// import { dirname } from 'path'
=======
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
import Joi from 'joi'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

<<<<<<< HEAD
<<<<<<< HEAD
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)
=======
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
>>>>>>> b42d439 (feat: implement Node.js foundation framework)

/**
 * Configuration schema validation using Joi
 */
const configSchema = Joi.object({
  // Application metadata
  app: Joi.object({
    name: Joi.string().default('finance-ingestion-nodejs'),
    version: Joi.string().default('1.0.0'),
    environment: Joi.string().valid('development', 'testing', 'production').default('development'),
    debug: Joi.boolean().default(false),
    verbose: Joi.boolean().default(false),
    dryRun: Joi.boolean().default(false)
  }).default(),

  // WebSocket configuration
  websocket: Joi.object({
    url: Joi.string().uri({ scheme: ['ws', 'wss'] }).default('wss://localhost:8080/market-data'),
    protocols: Joi.array().items(Joi.string()).optional(),
    headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Connection settings
    connectTimeoutMs: Joi.number().integer().min(1000).max(30000).default(5000),
    pingIntervalMs: Joi.number().integer().min(5000).max(300000).default(30000),
    pongTimeoutMs: Joi.number().integer().min(1000).max(30000).default(5000),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Reconnection settings
    maxReconnectAttempts: Joi.number().integer().min(0).max(100).default(10),
    reconnectDelayMs: Joi.number().integer().min(10).max(10000).default(100),
    reconnectBackoffMultiplier: Joi.number().min(1.0).max(10.0).default(2.0),
    reconnectMaxDelayMs: Joi.number().integer().min(1000).max(300000).default(30000),
    reconnectJitterMs: Joi.number().integer().min(0).max(5000).default(1000),
<<<<<<< HEAD
<<<<<<< HEAD

    // Performance settings
    maxMessageSize: Joi.number().integer().min(1024).max(10 * 1024 * 1024).default(1024 * 1024),
    compressionEnabled: Joi.boolean().default(true),

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    
    // Performance settings
    maxMessageSize: Joi.number().integer().min(1024).max(10 * 1024 * 1024).default(1024 * 1024),
    compressionEnabled: Joi.boolean().default(true),
    
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Security settings
    tlsEnabled: Joi.boolean().default(true),
    tlsVerifyCertificate: Joi.boolean().default(true)
  }).default(),

  // Processing configuration
  processing: Joi.object({
    // Batch processing
    batchSize: Joi.number().integer().min(1).max(10000).default(100),
    batchTimeoutMs: Joi.number().integer().min(1).max(1000).default(10),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Backpressure handling
    maxQueueSize: Joi.number().integer().min(100).max(1000000).default(10000),
    backpressureThreshold: Joi.number().min(0.1).max(1.0).default(0.8),
    dropOldestOnBackpressure: Joi.boolean().default(true),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Performance monitoring
    latencyMeasurementEnabled: Joi.boolean().default(true),
    latencyHistogramBuckets: Joi.array().items(Joi.number().positive()).default([0.1, 0.5, 1, 2, 5, 10, 20, 50, 100]),
    metricsCollectionIntervalMs: Joi.number().integer().min(100).max(60000).default(1000),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Message validation
    validateIncomingMessages: Joi.boolean().default(true),
    strictSchemaValidation: Joi.boolean().default(false)
  }).default(),

  // Clustering configuration
  cluster: Joi.object({
    enabled: Joi.boolean().default(true),
    workers: Joi.number().integer().min(0).max(32).default(0), // 0 = auto-detect CPU cores
    restartDelay: Joi.number().integer().min(100).max(10000).default(1000),
    maxRestarts: Joi.number().integer().min(0).max(100).default(10),
    gracefulShutdownTimeout: Joi.number().integer().min(1000).max(60000).default(10000)
  }).default(),

  // Redis configuration
  redis: Joi.object({
    host: Joi.string().default('localhost'),
    port: Joi.number().integer().min(1).max(65535).default(6379),
    password: Joi.string().optional(),
    db: Joi.number().integer().min(0).max(15).default(0),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Connection settings
    maxConnections: Joi.number().integer().min(1).max(100).default(10),
    minConnections: Joi.number().integer().min(1).max(50).default(2),
    acquireTimeoutMs: Joi.number().integer().min(1000).max(30000).default(5000),
<<<<<<< HEAD
<<<<<<< HEAD

    // Performance settings
    socketKeepalive: Joi.boolean().default(true),
    keyPrefix: Joi.string().optional(),

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    
    // Performance settings
    socketKeepalive: Joi.boolean().default(true),
    keyPrefix: Joi.string().optional(),
    
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Retry settings
    retryDelayOnFailover: Joi.number().integer().min(10).max(10000).default(100),
    maxRetriesPerRequest: Joi.number().integer().min(0).max(10).default(3)
  }).default(),

  // PostgreSQL configuration
  postgresql: Joi.object({
    host: Joi.string().default('localhost'),
    port: Joi.number().integer().min(1).max(65535).default(5432),
    database: Joi.string().default('finance_benchmark'),
    username: Joi.string().default('benchmark_user'),
    password: Joi.string().default('benchmark_pass'),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Connection pooling
    maxConnections: Joi.number().integer().min(1).max(100).default(20),
    minConnections: Joi.number().integer().min(1).max(50).default(5),
    acquireTimeoutMs: Joi.number().integer().min(1000).max(30000).default(5000),
    idleTimeoutMs: Joi.number().integer().min(5000).max(300000).default(30000),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Performance settings
    statementTimeoutMs: Joi.number().integer().min(1000).max(300000).default(30000),
    queryTimeoutMs: Joi.number().integer().min(1000).max(300000).default(30000),
    sslEnabled: Joi.boolean().default(false)
  }).default(),

  // Buffer configuration
  buffer: Joi.object({
    maxSize: Joi.number().integer().min(1000).max(10000000).default(100000),
    flushIntervalMs: Joi.number().integer().min(100).max(60000).default(1000),
    flushThreshold: Joi.number().integer().min(10).max(100000).default(1000),
    circularBuffer: Joi.boolean().default(true)
  }).default(),

  // Monitoring configuration
  monitoring: Joi.object({
    // Metrics export
    prometheusEnabled: Joi.boolean().default(true),
    prometheusPort: Joi.number().integer().min(1024).max(65535).default(9090),
    prometheusPath: Joi.string().default('/metrics'),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Logging configuration
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    logFormat: Joi.string().valid('json', 'text').default('json'),
    logTimestamps: Joi.boolean().default(true),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Health checks
    healthCheckEnabled: Joi.boolean().default(true),
    healthCheckPort: Joi.number().integer().min(1024).max(65535).default(8080),
    healthCheckPath: Joi.string().default('/health'),
    healthCheckIntervalMs: Joi.number().integer().min(1000).max(60000).default(5000),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Performance tracking
    trackResourceUsage: Joi.boolean().default(true),
    resourceUsageIntervalMs: Joi.number().integer().min(100).max(60000).default(1000),
    trackGarbageCollection: Joi.boolean().default(true)
  }).default(),

  // Benchmark configuration
  benchmark: Joi.object({
    // Test duration and load
    durationMs: Joi.number().integer().min(1000).max(3600000).default(60000),
    warmupMs: Joi.number().integer().min(0).max(300000).default(10000),
    cooldownMs: Joi.number().integer().min(0).max(60000).default(5000),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Message generation
    messageRatePerSecond: Joi.number().integer().min(1).max(1000000).default(10000),
    burstModeEnabled: Joi.boolean().default(true),
    burstIntervalMs: Joi.number().integer().min(1000).max(300000).default(10000),
    burstMultiplier: Joi.number().min(1.0).max(100.0).default(5.0),
<<<<<<< HEAD
<<<<<<< HEAD

    // Test symbols
    symbols: Joi.array().items(Joi.string()).default(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX']),
    symbolRotationEnabled: Joi.boolean().default(true),

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    
    // Test symbols
    symbols: Joi.array().items(Joi.string()).default(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX']),
    symbolRotationEnabled: Joi.boolean().default(true),
    
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Data generation
    priceRangeMin: Joi.number().min(0.01).default(1.0),
    priceRangeMax: Joi.number().min(1.0).default(1000.0),
    quantityRangeMin: Joi.number().min(0.01).default(1.0),
    quantityRangeMax: Joi.number().min(1.0).default(10000.0),
    exchanges: Joi.array().items(Joi.string()).default(['NYSE', 'NASDAQ', 'BATS', 'ARCA']),
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Results collection
    collectDetailedMetrics: Joi.boolean().default(true),
    saveResultsToDatabase: Joi.boolean().default(true),
    exportResultsPath: Joi.string().optional()
  }).default()
})

/**
 * Load configuration from environment variables with nested support
 */
<<<<<<< HEAD
<<<<<<< HEAD
function loadConfigFromEnv () {
=======
function loadConfigFromEnv() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function loadConfigFromEnv() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const config = {
    app: {
      name: process.env.APP_NAME,
      version: process.env.APP_VERSION,
      environment: process.env.NODE_ENV || process.env.ENVIRONMENT,
      debug: process.env.DEBUG === 'true',
      verbose: process.env.VERBOSE === 'true',
      dryRun: process.env.DRY_RUN === 'true'
    },
    websocket: {
      url: process.env.WEBSOCKET_URL,
      connectTimeoutMs: parseInt(process.env.WEBSOCKET_CONNECT_TIMEOUT_MS),
      pingIntervalMs: parseInt(process.env.WEBSOCKET_PING_INTERVAL_MS),
      pongTimeoutMs: parseInt(process.env.WEBSOCKET_PONG_TIMEOUT_MS),
      maxReconnectAttempts: parseInt(process.env.WEBSOCKET_MAX_RECONNECT_ATTEMPTS),
      reconnectDelayMs: parseInt(process.env.WEBSOCKET_RECONNECT_DELAY_MS),
      reconnectBackoffMultiplier: parseFloat(process.env.WEBSOCKET_RECONNECT_BACKOFF_MULTIPLIER),
      reconnectMaxDelayMs: parseInt(process.env.WEBSOCKET_RECONNECT_MAX_DELAY_MS),
      reconnectJitterMs: parseInt(process.env.WEBSOCKET_RECONNECT_JITTER_MS),
      maxMessageSize: parseInt(process.env.WEBSOCKET_MAX_MESSAGE_SIZE),
      compressionEnabled: process.env.WEBSOCKET_COMPRESSION_ENABLED !== 'false',
      tlsEnabled: process.env.WEBSOCKET_TLS_ENABLED !== 'false',
      tlsVerifyCertificate: process.env.WEBSOCKET_TLS_VERIFY_CERTIFICATE !== 'false'
    },
    processing: {
      batchSize: parseInt(process.env.PROCESSING_BATCH_SIZE),
      batchTimeoutMs: parseInt(process.env.PROCESSING_BATCH_TIMEOUT_MS),
      maxQueueSize: parseInt(process.env.PROCESSING_MAX_QUEUE_SIZE),
      backpressureThreshold: parseFloat(process.env.PROCESSING_BACKPRESSURE_THRESHOLD),
      dropOldestOnBackpressure: process.env.PROCESSING_DROP_OLDEST_ON_BACKPRESSURE !== 'false',
      latencyMeasurementEnabled: process.env.PROCESSING_LATENCY_MEASUREMENT_ENABLED !== 'false',
      metricsCollectionIntervalMs: parseInt(process.env.PROCESSING_METRICS_COLLECTION_INTERVAL_MS),
      validateIncomingMessages: process.env.PROCESSING_VALIDATE_INCOMING_MESSAGES !== 'false',
      strictSchemaValidation: process.env.PROCESSING_STRICT_SCHEMA_VALIDATION === 'true'
    },
    cluster: {
      enabled: process.env.CLUSTER_ENABLED !== 'false',
      workers: parseInt(process.env.CLUSTER_WORKERS) || 0,
      restartDelay: parseInt(process.env.CLUSTER_RESTART_DELAY),
      maxRestarts: parseInt(process.env.CLUSTER_MAX_RESTARTS),
      gracefulShutdownTimeout: parseInt(process.env.CLUSTER_GRACEFUL_SHUTDOWN_TIMEOUT)
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB),
      maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS),
      minConnections: parseInt(process.env.REDIS_MIN_CONNECTIONS),
      acquireTimeoutMs: parseInt(process.env.REDIS_ACQUIRE_TIMEOUT_MS),
      socketKeepalive: process.env.REDIS_SOCKET_KEEPALIVE !== 'false',
      keyPrefix: process.env.REDIS_KEY_PREFIX,
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY_ON_FAILOVER),
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST)
    },
    postgresql: {
      host: process.env.POSTGRESQL_HOST,
      port: parseInt(process.env.POSTGRESQL_PORT),
      database: process.env.POSTGRESQL_DATABASE,
      username: process.env.POSTGRESQL_USERNAME,
      password: process.env.POSTGRESQL_PASSWORD,
      maxConnections: parseInt(process.env.POSTGRESQL_MAX_CONNECTIONS),
      minConnections: parseInt(process.env.POSTGRESQL_MIN_CONNECTIONS),
      acquireTimeoutMs: parseInt(process.env.POSTGRESQL_ACQUIRE_TIMEOUT_MS),
      idleTimeoutMs: parseInt(process.env.POSTGRESQL_IDLE_TIMEOUT_MS),
      statementTimeoutMs: parseInt(process.env.POSTGRESQL_STATEMENT_TIMEOUT_MS),
      queryTimeoutMs: parseInt(process.env.POSTGRESQL_QUERY_TIMEOUT_MS),
      sslEnabled: process.env.POSTGRESQL_SSL_ENABLED === 'true'
    },
    buffer: {
      maxSize: parseInt(process.env.BUFFER_MAX_SIZE),
      flushIntervalMs: parseInt(process.env.BUFFER_FLUSH_INTERVAL_MS),
      flushThreshold: parseInt(process.env.BUFFER_FLUSH_THRESHOLD),
      circularBuffer: process.env.BUFFER_CIRCULAR_BUFFER !== 'false'
    },
    monitoring: {
      prometheusEnabled: process.env.MONITORING_PROMETHEUS_ENABLED !== 'false',
      prometheusPort: parseInt(process.env.MONITORING_PROMETHEUS_PORT),
      prometheusPath: process.env.MONITORING_PROMETHEUS_PATH,
      logLevel: process.env.MONITORING_LOG_LEVEL,
      logFormat: process.env.MONITORING_LOG_FORMAT,
      logTimestamps: process.env.MONITORING_LOG_TIMESTAMPS !== 'false',
      healthCheckEnabled: process.env.MONITORING_HEALTH_CHECK_ENABLED !== 'false',
      healthCheckPort: parseInt(process.env.MONITORING_HEALTH_CHECK_PORT),
      healthCheckPath: process.env.MONITORING_HEALTH_CHECK_PATH,
      healthCheckIntervalMs: parseInt(process.env.MONITORING_HEALTH_CHECK_INTERVAL_MS),
      trackResourceUsage: process.env.MONITORING_TRACK_RESOURCE_USAGE !== 'false',
      resourceUsageIntervalMs: parseInt(process.env.MONITORING_RESOURCE_USAGE_INTERVAL_MS),
      trackGarbageCollection: process.env.MONITORING_TRACK_GARBAGE_COLLECTION !== 'false'
    },
    benchmark: {
      durationMs: parseInt(process.env.BENCHMARK_DURATION_MS),
      warmupMs: parseInt(process.env.BENCHMARK_WARMUP_MS),
      cooldownMs: parseInt(process.env.BENCHMARK_COOLDOWN_MS),
      messageRatePerSecond: parseInt(process.env.BENCHMARK_MESSAGE_RATE_PER_SECOND),
      burstModeEnabled: process.env.BENCHMARK_BURST_MODE_ENABLED !== 'false',
      burstIntervalMs: parseInt(process.env.BENCHMARK_BURST_INTERVAL_MS),
      burstMultiplier: parseFloat(process.env.BENCHMARK_BURST_MULTIPLIER),
      symbolRotationEnabled: process.env.BENCHMARK_SYMBOL_ROTATION_ENABLED !== 'false',
      priceRangeMin: parseFloat(process.env.BENCHMARK_PRICE_RANGE_MIN),
      priceRangeMax: parseFloat(process.env.BENCHMARK_PRICE_RANGE_MAX),
      quantityRangeMin: parseFloat(process.env.BENCHMARK_QUANTITY_RANGE_MIN),
      quantityRangeMax: parseFloat(process.env.BENCHMARK_QUANTITY_RANGE_MAX),
      collectDetailedMetrics: process.env.BENCHMARK_COLLECT_DETAILED_METRICS !== 'false',
      saveResultsToDatabase: process.env.BENCHMARK_SAVE_RESULTS_TO_DATABASE !== 'false',
      exportResultsPath: process.env.BENCHMARK_EXPORT_RESULTS_PATH
    }
  }

  // Remove undefined values and filter out NaN numbers to let Joi apply defaults
<<<<<<< HEAD
<<<<<<< HEAD
  function cleanValue (key, value) {
=======
  function cleanValue(key, value) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  function cleanValue(key, value) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    if (value === undefined || value === null || value === '') {
      return undefined
    }
    if (typeof value === 'number' && isNaN(value)) {
      return undefined
    }
    return value
  }
<<<<<<< HEAD
<<<<<<< HEAD

=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  return JSON.parse(JSON.stringify(config, cleanValue))
}

/**
 * Validate and create configuration
 */
<<<<<<< HEAD
<<<<<<< HEAD
function createConfig () {
=======
function createConfig() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function createConfig() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const envConfig = loadConfigFromEnv()
  const { error, value } = configSchema.validate(envConfig, {
    allowUnknown: false,
    stripUnknown: true,
    abortEarly: false
  })

  if (error) {
    throw new Error(`Configuration validation failed: ${error.details.map(d => d.message).join(', ')}`)
  }

  return value
}

/**
 * Global configuration instance
 */
let config = null

/**
 * Get the global configuration instance
 */
<<<<<<< HEAD
<<<<<<< HEAD
export function getConfig () {
=======
export function getConfig() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function getConfig() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (!config) {
    config = createConfig()
  }
  return config
}

/**
 * Reload configuration (primarily for testing)
 */
<<<<<<< HEAD
<<<<<<< HEAD
export function reloadConfig () {
=======
export function reloadConfig() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function reloadConfig() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  config = null
  return getConfig()
}

/**
 * Set configuration (primarily for testing)
 */
<<<<<<< HEAD
<<<<<<< HEAD
export function setConfig (newConfig) {
=======
export function setConfig(newConfig) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function setConfig(newConfig) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  config = newConfig
}

/**
 * Get database connection URL
 */
<<<<<<< HEAD
<<<<<<< HEAD
export function getDatabaseUrl (cfg = getConfig()) {
=======
export function getDatabaseUrl(cfg = getConfig()) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function getDatabaseUrl(cfg = getConfig()) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const { postgresql } = cfg
  return `postgresql://${postgresql.username}:${postgresql.password}@${postgresql.host}:${postgresql.port}/${postgresql.database}`
}

/**
 * Get Redis connection URL
 */
<<<<<<< HEAD
<<<<<<< HEAD
export function getRedisUrl (cfg = getConfig()) {
=======
export function getRedisUrl(cfg = getConfig()) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function getRedisUrl(cfg = getConfig()) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  const { redis } = cfg
  const auth = redis.password ? `:${redis.password}@` : ''
  return `redis://${auth}${redis.host}:${redis.port}/${redis.db}`
}

/**
 * Check if running in production environment
 */
<<<<<<< HEAD
<<<<<<< HEAD
export function isProduction (cfg = getConfig()) {
=======
export function isProduction(cfg = getConfig()) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function isProduction(cfg = getConfig()) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  return cfg.app.environment === 'production'
}

/**
 * Check if running in development environment
 */
<<<<<<< HEAD
<<<<<<< HEAD
export function isDevelopment (cfg = getConfig()) {
=======
export function isDevelopment(cfg = getConfig()) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export function isDevelopment(cfg = getConfig()) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  return cfg.app.environment === 'development'
}

export default {
  getConfig,
  reloadConfig,
  setConfig,
  getDatabaseUrl,
  getRedisUrl,
  isProduction,
  isDevelopment
<<<<<<< HEAD
<<<<<<< HEAD
}
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
