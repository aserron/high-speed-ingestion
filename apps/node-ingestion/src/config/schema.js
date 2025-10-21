/**
 * Joi validation schemas for configuration management.
 */

import Joi from 'joi'

// Database configuration schema
const databaseSchema = Joi.object({
  host: Joi.string().hostname().default('localhost').description('Database host'),
  port: Joi.number().port().default(5432).description('Database port'),
  name: Joi.string().min(1).default('finance_benchmark').description('Database name'),
  username: Joi.string().min(1).required().description('Database username'),
  password: Joi.string().min(1).required().description('Database password'),
  ssl: Joi.boolean().default(false).description('Enable SSL connection'),
  poolMin: Joi.number().integer().min(1).default(2).description('Minimum pool connections'),
  poolMax: Joi.number().integer().min(1).default(10).description('Maximum pool connections'),
  connectionTimeout: Joi.number().integer().min(1000).default(5000).description('Connection timeout in ms'),
  idleTimeout: Joi.number().integer().min(1000).default(30000).description('Idle timeout in ms')
}).custom((value, helpers) => {
  if (value.poolMax < value.poolMin) {
    return helpers.error('database.poolMax must be greater than or equal to poolMin')
  }
  return value
})

// Redis configuration schema
const redisSchema = Joi.object({
  host: Joi.string().hostname().default('localhost').description('Redis host'),
  port: Joi.number().port().default(6379).description('Redis port'),
  password: Joi.string().allow('').optional().description('Redis password'),
  db: Joi.number().integer().min(0).max(15).default(0).description('Redis database number'),
  connectTimeout: Joi.number().integer().min(1000).default(5000).description('Connection timeout in ms'),
  commandTimeout: Joi.number().integer().min(1000).default(3000).description('Command timeout in ms'),
  retryAttempts: Joi.number().integer().min(0).default(3).description('Number of retry attempts'),
  retryDelay: Joi.number().integer().min(100).default(1000).description('Retry delay in ms')
})

// WebSocket configuration schema
const websocketSchema = Joi.object({
  enabled: Joi.boolean().default(true).description('Enable WebSocket server'),
  port: Joi.number().port().default(8080).description('WebSocket server port'),
  path: Joi.string().pattern(/^\//).default('/ws').description('WebSocket endpoint path'),
  heartbeatInterval: Joi.number().integer().min(1000).default(30000).description('Heartbeat interval in ms'),
  maxConnections: Joi.number().integer().min(1).default(1000).description('Maximum concurrent connections'),
  compression: Joi.boolean().default(true).description('Enable compression')
})

// Monitoring configuration schema
const monitoringSchema = Joi.object({
  prometheusEnabled: Joi.boolean().default(true).description('Enable Prometheus metrics'),
  prometheusPort: Joi.number().port().default(9090).description('Prometheus metrics port'),
  prometheusPath: Joi.string().pattern(/^\//).default('/metrics').description('Prometheus metrics path'),
  grafanaEnabled: Joi.boolean().default(false).description('Enable Grafana dashboard'),
  grafanaPort: Joi.number().port().default(3001).description('Grafana dashboard port')
})

// Security configuration schema
const securitySchema = Joi.object({
  corsEnabled: Joi.boolean().default(true).description('Enable CORS'),
  corsOrigin: Joi.string().default('*').description('CORS allowed origins'),
  rateLimitEnabled: Joi.boolean().default(false).description('Enable rate limiting'),
  rateLimitMax: Joi.number().integer().min(1).default(100).description('Rate limit max requests'),
  rateLimitWindow: Joi.number().integer().min(1).default(900).description('Rate limit window in seconds'),
  sslEnabled: Joi.boolean().default(false).description('Enable SSL/TLS'),
  sslCertPath: Joi.string().when('sslEnabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }).description('SSL certificate path'),
  sslKeyPath: Joi.string().when('sslEnabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }).description('SSL private key path')
})

// Main application configuration schema
export const configSchema = Joi.object({
  // Application settings
  port: Joi.number().port().default(3000).description('Application server port'),
  host: Joi.string().hostname().default('0.0.0.0').description('Application server host'),
  logLevel: Joi.string().valid('debug', 'info', 'warn', 'error').default('info').description('Logging level'),
  logFormat: Joi.string().valid('json', 'text', 'structured').default('json').description('Log format'),
  enableMetrics: Joi.boolean().default(true).description('Enable metrics collection'),
  enableClustering: Joi.boolean().default(false).description('Enable clustering'),
  clusterWorkers: Joi.alternatives().try(
    Joi.string().valid('auto'),
    Joi.number().integer().min(1)
  ).default('auto').description('Number of cluster workers'),
  
  // Environment metadata
  environment: Joi.string().valid('development', 'staging', 'production').default('development').description('Deployment environment'),
  version: Joi.string().default('1.0.0').description('Application version'),
  buildNumber: Joi.string().optional().description('Build number'),
  gitCommit: Joi.string().optional().description('Git commit hash'),
  
  // Sub-configurations
  database: databaseSchema.required(),
  redis: redisSchema.required(),
  websocket: websocketSchema.required(),
  monitoring: monitoringSchema.required(),
  security: securitySchema.required()
}).custom((value, helpers) => {
  // Production-specific validations
  if (value.environment === 'production') {
    if (value.security.corsOrigin === '*') {
      return helpers.error('security.corsOrigin cannot be "*" in production')
    }
    
    if (value.logLevel === 'debug') {
      helpers.warn('Debug logging enabled in production')
    }
    
    if (!value.security.sslEnabled) {
      helpers.warn('SSL is disabled in production environment')
    }
    
    if (!value.security.rateLimitEnabled) {
      helpers.warn('Rate limiting is disabled in production')
    }
  }
  
  return value
})