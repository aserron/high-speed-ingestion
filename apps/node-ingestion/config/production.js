/**
 * Production Configuration
 *
 * Production-specific configuration settings for the Node.js financial data ingestion system.
 * Includes security, authentication, TLS/SSL, and production monitoring settings.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Authentication configuration for production
 */
export class AuthenticationConfig {
  constructor() {
    // API Key authentication
    this.apiKeyEnabled = process.env.AUTH_API_KEY_ENABLED === 'true'
    this.apiKeyHeader = process.env.AUTH_API_KEY_HEADER || 'X-API-Key'
    this.apiKeys = process.env.AUTH_API_KEYS ? process.env.AUTH_API_KEYS.split(',') : []
    
    // JWT authentication
    this.jwtEnabled = process.env.AUTH_JWT_ENABLED === 'true'
    this.jwtSecretKey = process.env.AUTH_JWT_SECRET_KEY || ''
    this.jwtAlgorithm = process.env.AUTH_JWT_ALGORITHM || 'HS256'
    this.jwtExpirationHours = parseInt(process.env.AUTH_JWT_EXPIRATION_HOURS) || 24
    this.jwtIssuer = process.env.AUTH_JWT_ISSUER || 'finance-ingestion-system'
    
    // Basic authentication (for admin endpoints)
    this.basicAuthEnabled = process.env.AUTH_BASIC_ENABLED !== 'false'
    this.adminUsername = process.env.AUTH_ADMIN_USERNAME || 'admin'
    this.adminPasswordHash = process.env.AUTH_ADMIN_PASSWORD_HASH || ''
    
    // Rate limiting
    this.rateLimitEnabled = process.env.AUTH_RATE_LIMIT_ENABLED !== 'false'
    this.rateLimitRequestsPerMinute = parseInt(process.env.AUTH_RATE_LIMIT_RPM) || 1000
    this.rateLimitBurstSize = parseInt(process.env.AUTH_RATE_LIMIT_BURST) || 100
    
    // Session management
    this.sessionEnabled = process.env.AUTH_SESSION_ENABLED === 'true'
    this.sessionSecret = process.env.AUTH_SESSION_SECRET || crypto.randomBytes(32).toString('hex')
    this.sessionMaxAge = parseInt(process.env.AUTH_SESSION_MAX_AGE) || 86400000 // 24 hours
  }
  
  /**
   * Validate authentication configuration
   */
  validate() {
    const issues = []
    
    if (this.apiKeyEnabled && this.apiKeys.length === 0) {
      issues.push('API key authentication enabled but no API keys configured')
    }
    
    if (this.jwtEnabled && !this.jwtSecretKey) {
      issues.push('JWT authentication enabled but no secret key configured')
    }
    
    if (this.basicAuthEnabled && !this.adminPasswordHash) {
      issues.push('Basic authentication enabled but no admin password hash configured')
    }
    
    return issues
  }
}

/**
 * TLS/SSL configuration for production
 */
export class TLSConfig {
  constructor() {
    // TLS settings
    this.tlsEnabled = process.env.TLS_ENABLED !== 'false'
    this.tlsCertFile = process.env.TLS_CERT_FILE || '/etc/ssl/certs/app.crt'
    this.tlsKeyFile = process.env.TLS_KEY_FILE || '/etc/ssl/private/app.key'
    this.tlsCaFile = process.env.TLS_CA_FILE || null
    
    // SSL context settings
    this.sslProtocol = process.env.SSL_PROTOCOL || 'TLSv1.2'
    this.sslCiphers = process.env.SSL_CIPHERS || 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS'
    this.sslVerifyMode = process.env.SSL_VERIFY_MODE || 'CERT_REQUIRED'
    
    // WebSocket TLS
    this.websocketTlsEnabled = process.env.WEBSOCKET_TLS_ENABLED !== 'false'
    this.websocketVerifySsl = process.env.WEBSOCKET_VERIFY_SSL !== 'false'
    
    // Client certificate authentication
    this.clientCertAuthEnabled = process.env.CLIENT_CERT_AUTH_ENABLED === 'true'
    this.clientCertCaFile = process.env.CLIENT_CERT_CA_FILE || null
    
    // HSTS (HTTP Strict Transport Security)
    this.hstsEnabled = process.env.HSTS_ENABLED !== 'false'
    this.hstsMaxAge = parseInt(process.env.HSTS_MAX_AGE) || 31536000 // 1 year
    this.hstsIncludeSubdomains = process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false'
  }
  
  /**
   * Create HTTPS options for production use
   */
  createHttpsOptions() {
    if (!this.tlsEnabled) {
      return null
    }
    
    const options = {}
    
    // Load certificate and key
    if (fs.existsSync(this.tlsCertFile) && fs.existsSync(this.tlsKeyFile)) {
      options.cert = fs.readFileSync(this.tlsCertFile)
      options.key = fs.readFileSync(this.tlsKeyFile)
    }
    
    // Load CA certificates if specified
    if (this.tlsCaFile && fs.existsSync(this.tlsCaFile)) {
      options.ca = fs.readFileSync(this.tlsCaFile)
    }
    
    // Set SSL/TLS version
    if (this.sslProtocol === 'TLSv1.3') {
      options.secureProtocol = 'TLSv1_3_method'
    } else {
      options.secureProtocol = 'TLSv1_2_method'
    }
    
    // Set cipher suites
    options.ciphers = this.sslCiphers
    
    // Client certificate authentication
    if (this.clientCertAuthEnabled) {
      options.requestCert = true
      options.rejectUnauthorized = true
      
      if (this.clientCertCaFile && fs.existsSync(this.clientCertCaFile)) {
        options.ca = fs.readFileSync(this.clientCertCaFile)
      }
    }
    
    return options
  }
  
  /**
   * Get security headers for HTTP responses
   */
  getSecurityHeaders() {
    const headers = {}
    
    if (this.hstsEnabled) {
      let hstsValue = `max-age=${this.hstsMaxAge}`
      if (this.hstsIncludeSubdomains) {
        hstsValue += '; includeSubDomains'
      }
      headers['Strict-Transport-Security'] = hstsValue
    }
    
    // Additional security headers
    headers['X-Content-Type-Options'] = 'nosniff'
    headers['X-Frame-Options'] = 'DENY'
    headers['X-XSS-Protection'] = '1; mode=block'
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    headers['Content-Security-Policy'] = "default-src 'self'"
    
    return headers
  }
  
  /**
   * Validate TLS configuration
   */
  validate() {
    const issues = []
    
    if (this.tlsEnabled) {
      if (!fs.existsSync(this.tlsCertFile)) {
        issues.push(`TLS certificate file not found: ${this.tlsCertFile}`)
      }
      
      if (!fs.existsSync(this.tlsKeyFile)) {
        issues.push(`TLS key file not found: ${this.tlsKeyFile}`)
      }
      
      if (this.tlsCaFile && !fs.existsSync(this.tlsCaFile)) {
        issues.push(`TLS CA file not found: ${this.tlsCaFile}`)
      }
    }
    
    return issues
  }
}

/**
 * Production logging configuration
 */
export class ProductionLoggingConfig {
  constructor() {
    // Log levels and formats
    this.logLevel = process.env.LOG_LEVEL || 'info'
    this.logFormat = process.env.LOG_FORMAT || 'json'
    this.logTimestamps = process.env.LOG_TIMESTAMPS !== 'false'
    this.logCorrelationIds = process.env.LOG_CORRELATION_IDS !== 'false'
    
    // Log destinations
    this.logToConsole = process.env.LOG_TO_CONSOLE !== 'false'
    this.logToFile = process.env.LOG_TO_FILE === 'true'
    this.logToSyslog = process.env.LOG_TO_SYSLOG === 'true'
    this.logToElasticsearch = process.env.LOG_TO_ELASTICSEARCH === 'true'
    
    // File logging
    this.logFilePath = process.env.LOG_FILE_PATH || '/var/log/finance-ingestion/app.log'
    this.logFileMaxSizeMb = parseInt(process.env.LOG_FILE_MAX_SIZE_MB) || 100
    this.logFileBackupCount = parseInt(process.env.LOG_FILE_BACKUP_COUNT) || 10
    this.logFileRotation = process.env.LOG_FILE_ROTATION || 'size'
    
    // Syslog configuration
    this.syslogHost = process.env.SYSLOG_HOST || 'localhost'
    this.syslogPort = parseInt(process.env.SYSLOG_PORT) || 514
    this.syslogFacility = process.env.SYSLOG_FACILITY || 'local0'
    
    // Elasticsearch logging
    this.elasticsearchHost = process.env.ELASTICSEARCH_HOST || 'localhost'
    this.elasticsearchPort = parseInt(process.env.ELASTICSEARCH_PORT) || 9200
    this.elasticsearchIndex = process.env.ELASTICSEARCH_INDEX || 'finance-ingestion-logs'
    
    // Security and privacy
    this.logSensitiveData = process.env.LOG_SENSITIVE_DATA === 'true'
    this.maskPii = process.env.MASK_PII !== 'false'
    this.logRequestBodies = process.env.LOG_REQUEST_BODIES === 'true'
  }
  
  /**
   * Create Winston logger configuration
   */
  createWinstonConfig() {
    const transports = []
    const format = []
    
    // Add timestamp
    if (this.logTimestamps) {
      format.push(require('winston').format.timestamp())
    }
    
    // Add correlation ID
    if (this.logCorrelationIds) {
      format.push(require('winston').format.printf(info => {
        const correlationId = info.correlationId || 'unknown'
        return `${info.timestamp} [${correlationId}] ${info.level}: ${info.message}`
      }))
    }
    
    // Set format
    if (this.logFormat === 'json') {
      format.push(require('winston').format.json())
    } else {
      format.push(require('winston').format.simple())
    }
    
    // Console transport
    if (this.logToConsole) {
      transports.push(new (require('winston')).transports.Console({
        level: this.logLevel,
        format: require('winston').format.combine(...format)
      }))
    }
    
    // File transport
    if (this.logToFile) {
      transports.push(new (require('winston')).transports.File({
        filename: this.logFilePath,
        level: this.logLevel,
        maxsize: this.logFileMaxSizeMb * 1024 * 1024,
        maxFiles: this.logFileBackupCount,
        format: require('winston').format.combine(...format)
      }))
    }
    
    return {
      level: this.logLevel,
      format: require('winston').format.combine(...format),
      transports
    }
  }
  
  /**
   * Validate logging configuration
   */
  validate() {
    const issues = []
    
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath)
      if (!fs.existsSync(logDir)) {
        issues.push(`Log directory does not exist: ${logDir}`)
      }
    }
    
    return issues
  }
}

/**
 * Production monitoring configuration
 */
export class ProductionMonitoringConfig {
  constructor() {
    // Metrics collection
    this.metricsEnabled = process.env.METRICS_ENABLED !== 'false'
    this.metricsPort = parseInt(process.env.METRICS_PORT) || 9090
    this.metricsPath = process.env.METRICS_PATH || '/metrics'
    this.metricsIntervalSeconds = parseInt(process.env.METRICS_INTERVAL_SECONDS) || 15
    
    // Health checks
    this.healthCheckEnabled = process.env.HEALTH_CHECK_ENABLED !== 'false'
    this.healthCheckPort = parseInt(process.env.HEALTH_CHECK_PORT) || 8080
    this.healthCheckPath = process.env.HEALTH_CHECK_PATH || '/health'
    this.healthCheckTimeoutSeconds = parseInt(process.env.HEALTH_CHECK_TIMEOUT_SECONDS) || 30
    
    // Alerting
    this.alertingEnabled = process.env.ALERTING_ENABLED === 'true'
    this.alertWebhookUrl = process.env.ALERT_WEBHOOK_URL || null
    this.alertEmailEnabled = process.env.ALERT_EMAIL_ENABLED === 'true'
    this.alertEmailSmtpHost = process.env.ALERT_EMAIL_SMTP_HOST || 'localhost'
    this.alertEmailSmtpPort = parseInt(process.env.ALERT_EMAIL_SMTP_PORT) || 587
    this.alertEmailFrom = process.env.ALERT_EMAIL_FROM || 'alerts@finance-ingestion.com'
    this.alertEmailTo = process.env.ALERT_EMAIL_TO ? process.env.ALERT_EMAIL_TO.split(',') : []
    
    // Performance thresholds for alerting
    this.alertCpuThresholdPercent = parseFloat(process.env.ALERT_CPU_THRESHOLD_PERCENT) || 80.0
    this.alertMemoryThresholdPercent = parseFloat(process.env.ALERT_MEMORY_THRESHOLD_PERCENT) || 85.0
    this.alertLatencyThresholdMs = parseFloat(process.env.ALERT_LATENCY_THRESHOLD_MS) || 100.0
    this.alertErrorRateThresholdPercent = parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD_PERCENT) || 5.0
    
    // Distributed tracing
    this.tracingEnabled = process.env.TRACING_ENABLED === 'true'
    this.tracingServiceName = process.env.TRACING_SERVICE_NAME || 'finance-ingestion-nodejs'
    this.tracingJaegerHost = process.env.TRACING_JAEGER_HOST || 'localhost'
    this.tracingJaegerPort = parseInt(process.env.TRACING_JAEGER_PORT) || 14268
    
    // APM (Application Performance Monitoring)
    this.apmEnabled = process.env.APM_ENABLED === 'true'
    this.apmServiceName = process.env.APM_SERVICE_NAME || 'finance-ingestion-nodejs'
    this.apmServerUrl = process.env.APM_SERVER_URL || null
  }
  
  /**
   * Validate monitoring configuration
   */
  validate() {
    const issues = []
    
    if (this.alertingEnabled) {
      if (!this.alertWebhookUrl && !this.alertEmailEnabled) {
        issues.push('Alerting enabled but no webhook URL or email configuration provided')
      }
    }
    
    if (this.tracingEnabled && !this.tracingJaegerHost) {
      issues.push('Tracing enabled but no Jaeger host configured')
    }
    
    return issues
  }
}

/**
 * Production configuration manager
 */
export class ProductionConfigManager {
  constructor() {
    this.authConfig = new AuthenticationConfig()
    this.tlsConfig = new TLSConfig()
    this.loggingConfig = new ProductionLoggingConfig()
    this.monitoringConfig = new ProductionMonitoringConfig()
  }
  
  /**
   * Get production application configuration
   */
  getProductionAppConfig() {
    // Load base configuration
    const { getConfig } = await import('../src/config/index.js')
    const baseConfig = getConfig()
    
    // Override with production settings
    baseConfig.app.environment = 'production'
    baseConfig.app.debug = false
    baseConfig.app.verbose = false
    
    // Update WebSocket configuration for production
    baseConfig.websocket.tlsEnabled = this.tlsConfig.websocketTlsEnabled
    baseConfig.websocket.tlsVerifyCertificate = this.tlsConfig.websocketVerifySsl
    
    // Update monitoring configuration
    baseConfig.monitoring.prometheusEnabled = this.monitoringConfig.metricsEnabled
    baseConfig.monitoring.prometheusPort = this.monitoringConfig.metricsPort
    baseConfig.monitoring.healthCheckEnabled = this.monitoringConfig.healthCheckEnabled
    baseConfig.monitoring.healthCheckPort = this.monitoringConfig.healthCheckPort
    
    // Update logging configuration
    baseConfig.monitoring.logLevel = this.loggingConfig.logLevel
    baseConfig.monitoring.logFormat = this.loggingConfig.logFormat
    baseConfig.monitoring.logTimestamps = this.loggingConfig.logTimestamps
    
    return baseConfig
  }
  
  /**
   * Validate production configuration
   */
  validateProductionConfig() {
    const issues = []
    
    // Validate all components
    issues.push(...this.authConfig.validate())
    issues.push(...this.tlsConfig.validate())
    issues.push(...this.loggingConfig.validate())
    issues.push(...this.monitoringConfig.validate())
    
    return issues
  }
  
  /**
   * Generate environment template for production deployment
   */
  generateEnvironmentTemplate() {
    return `
# Production Environment Configuration Template
# Copy this file to .env and configure the values for your environment

# Application Environment
NODE_ENV=production
DEBUG=false
VERBOSE=false

# Authentication Configuration
AUTH_API_KEY_ENABLED=true
AUTH_API_KEYS=your-api-key-1,your-api-key-2
AUTH_JWT_ENABLED=false
AUTH_JWT_SECRET_KEY=your-jwt-secret-key-here
AUTH_BASIC_ENABLED=true
AUTH_ADMIN_USERNAME=admin
AUTH_ADMIN_PASSWORD_HASH=your-bcrypt-hash-here

# TLS/SSL Configuration
TLS_ENABLED=true
TLS_CERT_FILE=/etc/ssl/certs/app.crt
TLS_KEY_FILE=/etc/ssl/private/app.key
TLS_CA_FILE=/etc/ssl/certs/ca.crt
SSL_PROTOCOL=TLSv1.2
WEBSOCKET_TLS_ENABLED=true
WEBSOCKET_VERIFY_SSL=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000

# Database Configuration
POSTGRESQL_HOST=postgres.example.com
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=finance_ingestion_prod
POSTGRESQL_USERNAME=finance_user
POSTGRESQL_PASSWORD=secure-password-here
POSTGRESQL_SSL_ENABLED=true

REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=redis-password-here
REDIS_DB=0

# WebSocket Configuration
WEBSOCKET_URL=wss://market-data.example.com/feed

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_TO_FILE=true
LOG_FILE_PATH=/var/log/finance-ingestion/app.log
LOG_TO_SYSLOG=false
LOG_TO_ELASTICSEARCH=false

# Monitoring Configuration
METRICS_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PORT=8080
ALERTING_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url

# Performance Tuning
PROCESSING_BATCH_SIZE=1000
PROCESSING_MAX_QUEUE_SIZE=100000
POSTGRESQL_MAX_CONNECTIONS=50
REDIS_MAX_CONNECTIONS=20
CLUSTER_WORKERS=0
`.trim()
  }
}

/**
 * Get production configuration manager instance
 */
export function getProductionConfig() {
  return new ProductionConfigManager()
}

// CLI for configuration validation and template generation
if (import.meta.url === `file://${process.argv[1]}`) {
  const configManager = getProductionConfig()
  
  // Validate production configuration
  const issues = configManager.validateProductionConfig()
  
  if (issues.length > 0) {
    console.log('Production configuration issues found:')
    issues.forEach(issue => console.log(`  - ${issue}`))
  } else {
    console.log('Production configuration validation passed')
  }
  
  // Generate environment template
  const template = configManager.generateEnvironmentTemplate()
  console.log('\nEnvironment template:')
  console.log(template)
}