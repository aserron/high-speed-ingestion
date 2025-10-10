/**
 * Main Application Entry Point
 *
 * Node.js Financial Data Ingestion System
 * High-performance real-time market data processing with clustering support
 */

import { getConfig } from './config/index.js'
import { setupLogging, getLogger, setCorrelationId } from './logging/index.js'
import { setupErrorHandlers } from './errors/index.js'

/**
 * Main application class
 */
class FinanceIngestionApp {
  constructor () {
    this.config = null
    this.logger = null
    this.isStarted = false
    this.isShuttingDown = false
    this.startTime = null
    this.services = new Map()
    
    // Error recovery state
    this.errorRecovery = {
      maxConsecutiveErrors: 10,
      errorResetInterval: 300000, // 5 minutes
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      consecutiveErrors: 0,
      lastErrorTime: 0,
      circuitBreakerOpen: false,
      circuitBreakerOpenTime: 0
    }
  }

  /**
   * Initialize the application
   */
  async initialize () {
    try {
      // Load configuration
      this.config = getConfig()

      // Setup logging
      setupLogging(this.config)
      this.logger = getLogger('app')

      // Setup error handlers
      setupErrorHandlers()

      // Set correlation ID for startup
      setCorrelationId('startup')

      this.logger.info('Initializing Finance Ingestion System', {
        version: this.config.app.version,
        environment: this.config.app.environment,
        nodeVersion: process.version,
        pid: process.pid,
        workerId: process.env.WORKER_ID || 'single'
      })

      // Validate configuration
      await this.validateConfiguration()
      
      // Setup error recovery mechanisms
      this.setupErrorRecovery()

      this.logger.info('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error.message)
      throw error
    }
  }

  /**
   * Start the application
   */
  async start () {
    if (this.isStarted) {
      this.logger.warn('Application already started')
      return
    }

    try {
      await this.initialize()

      this.startTime = Date.now()
      this.logger.info('Starting Finance Ingestion System')

      // Setup graceful shutdown
      this.setupGracefulShutdown()

      // Start core services (placeholder for now)
      await this.startServices()

      this.isStarted = true

      this.logger.info('Finance Ingestion System started successfully', {
        uptime: Date.now() - this.startTime,
        services: Array.from(this.services.keys())
      })

      // Keep the process alive
      this.keepAlive()
    } catch (error) {
      this.logger.error('Failed to start application', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Stop the application
   */
  async stop () {
    if (!this.isStarted || this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true
    this.logger.info('Stopping Finance Ingestion System')

    try {
      // Stop services in reverse order
      const serviceNames = Array.from(this.services.keys()).reverse()

      for (const serviceName of serviceNames) {
        await this.stopService(serviceName)
      }

      this.isStarted = false

      this.logger.info('Finance Ingestion System stopped successfully', {
        uptime: Date.now() - this.startTime
      })
    } catch (error) {
      this.logger.error('Error during application shutdown', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration () {
    this.logger.info('Validating configuration')

    const errors = []

    // Validate WebSocket configuration
    if (!this.config.websocket.url.startsWith('ws://') && !this.config.websocket.url.startsWith('wss://')) {
      errors.push('WebSocket URL must start with ws:// or wss://')
    }

    // Validate database configuration
    if (!this.config.postgresql.database) {
      errors.push('PostgreSQL database name is required')
    }

    // Validate Redis configuration
    if (this.config.redis.port < 1 || this.config.redis.port > 65535) {
      errors.push('Redis port must be between 1 and 65535')
    }

    // Validate cluster configuration
    if (this.config.cluster.workers < 0 || this.config.cluster.workers > 32) {
      errors.push('Cluster workers must be between 0 and 32')
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
    }

    this.logger.info('Configuration validation passed')
  }

  /**
   * Start core services
   */
  async startServices () {
    this.logger.info('Starting core services')

    const services = [
      { name: 'storage', start: () => this.startStorageService() },
      { name: 'metrics', start: () => this.startMetricsService() },
      { name: 'processor', start: () => this.startProcessorService() },
      { name: 'websocket', start: () => this.startWebSocketService() },
      { name: 'health', start: () => this.startHealthService() }
    ]

    for (const service of services) {
      try {
        this.logger.info(`Starting ${service.name} service`)
        const serviceInstance = await service.start()
        this.services.set(service.name, serviceInstance)
        this.logger.info(`${service.name} service started successfully`)
      } catch (error) {
        this.logger.error(`Failed to start ${service.name} service`, {
          error: error.message,
          stack: error.stack
        })
        throw error
      }
    }
  }

  /**
   * Stop a service
   */
  async stopService (serviceName) {
    const service = this.services.get(serviceName)
    if (!service) {
      return
    }

    try {
      this.logger.info(`Stopping ${serviceName} service`)

      if (service.stop && typeof service.stop === 'function') {
        await service.stop()
      }

      this.services.delete(serviceName)
      this.logger.info(`${serviceName} service stopped successfully`)
    } catch (error) {
      this.logger.error(`Error stopping ${serviceName} service`, {
        error: error.message,
        stack: error.stack
      })
    }
  }

  /**
   * Service implementations
   */
  async startStorageService () {
    const { initializeStorage } = await import('./storage/index.js')

    this.logger.info('Initializing storage layer')
    const storageManager = await initializeStorage(this.config)

    // Perform initial health check
    const health = await storageManager.healthCheck()
    if (!health.healthy) {
      throw new Error(`Storage health check failed: ${JSON.stringify(health)}`)
    }

    this.logger.info('Storage service started successfully', {
      backends: Object.keys(health.backends)
    })

    return {
      name: 'storage',
      manager: storageManager,
      stop: async () => {
        this.logger.info('Stopping storage service')
        await storageManager.close()
      }
    }
  }

  async startMetricsService () {
    this.logger.info('Metrics service would start here (placeholder)')
    return { name: 'metrics', stop: async () => {} }
  }

  async startHealthService () {
    this.logger.info('Health service would start here (placeholder)')
    return { name: 'health', stop: async () => {} }
  }

  async startWebSocketService () {
    const { WebSocketConnectionManager } = await import('./websocket/index.js')

    this.logger.info('Initializing WebSocket service')
    
    // Get processor service for message handling
    const processorService = this.services.get('processor')
    if (!processorService) {
      throw new Error('Processor service must be started before WebSocket service')
    }
    
    // Initialize WebSocket connection manager
    const webSocketManager = new WebSocketConnectionManager({
      url: this.config.websocket.url,
      config: this.config.websocket,
      logger: this.logger
    })
    
    // Set up message processing callback
    webSocketManager.onMessage = async (messageData) => {
      try {
        const receiptTime = process.hrtime.bigint()
        await processorService.processor.processMessage(messageData, receiptTime)
      } catch (error) {
        this.logger.error('Error processing WebSocket message', {
          error: error.message,
          stack: error.stack
        })
      }
    }
    
    // Set up connection event handlers
    webSocketManager.onConnected = () => {
      this.logger.info('WebSocket connected successfully')
    }
    
    webSocketManager.onDisconnected = (reason) => {
      this.logger.warn('WebSocket disconnected', { reason })
    }
    
    webSocketManager.onError = (error) => {
      this.logger.error('WebSocket error', {
        error: error.message,
        stack: error.stack
      })
    }
    
    // Start WebSocket connection
    await webSocketManager.connect()
    
    this.logger.info('WebSocket service started successfully', {
      url: this.config.websocket.url,
      connected: webSocketManager.isConnected()
    })

    return {
      name: 'websocket',
      manager: webSocketManager,
      stop: async () => {
        this.logger.info('Stopping WebSocket service')
        await webSocketManager.disconnect()
      }
    }
  }

  async startProcessorService () {
    const { MessageProcessor } = await import('./message-processor/index.js')
    
    this.logger.info('Initializing message processor service')
    
    // Get storage manager from services
    const storageService = this.services.get('storage')
    if (!storageService) {
      throw new Error('Storage service must be started before processor service')
    }
    
    // Get metrics service (when implemented)
    const metricsService = this.services.get('metrics')
    
    // Initialize message processor
    const messageProcessor = new MessageProcessor({
      storageManager: storageService.manager,
      metricsCollector: metricsService?.collector,
      config: this.config.messageProcessor || {}
    })
    
    await messageProcessor.initialize()
    
    this.logger.info('Message processor service started successfully')
    
    return {
      name: 'processor',
      processor: messageProcessor,
      stop: async () => {
        this.logger.info('Stopping message processor service')
        await messageProcessor.shutdown()
      }
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown () {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    signals.forEach(signal => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`)

        try {
          await this.stop()
          process.exit(0)
        } catch (error) {
          this.logger.error('Error during graceful shutdown', {
            error: error.message,
            stack: error.stack
          })
          process.exit(1)
        }
      })
    })
  }

  /**
   * Keep the process alive
   */
  keepAlive () {
    // Log periodic status
    setInterval(() => {
      if (this.isStarted && !this.isShuttingDown) {
        this.logger.debug('Application status', {
          uptime: Date.now() - this.startTime,
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          services: Array.from(this.services.keys())
        })
      }
    }, 60000) // Every minute
  }

  /**
   * Handle component errors with recovery logic
   */
  async handleComponentError (component, error, recoveryAction = null) {
    const currentTime = Date.now()
    
    // Reset consecutive errors if enough time has passed
    if (currentTime - this.errorRecovery.lastErrorTime > this.errorRecovery.errorResetInterval) {
      this.errorRecovery.consecutiveErrors = 0
    }
    
    this.errorRecovery.consecutiveErrors++
    this.errorRecovery.lastErrorTime = currentTime
    
    this.logger.error(`Component error in ${component}`, {
      error: error.message,
      stack: error.stack,
      consecutiveErrors: this.errorRecovery.consecutiveErrors
    })
    
    // Circuit breaker logic
    if (this.errorRecovery.consecutiveErrors >= this.errorRecovery.circuitBreakerThreshold) {
      if (!this.errorRecovery.circuitBreakerOpen) {
        this.logger.warn(`Opening circuit breaker for ${component}`)
        this.errorRecovery.circuitBreakerOpen = true
        this.errorRecovery.circuitBreakerOpenTime = currentTime
      }
    }
    
    // Check if circuit breaker should be closed
    if (this.errorRecovery.circuitBreakerOpen && 
        currentTime - this.errorRecovery.circuitBreakerOpenTime > this.errorRecovery.circuitBreakerTimeout) {
      this.logger.info(`Closing circuit breaker for ${component}`)
      this.errorRecovery.circuitBreakerOpen = false
      this.errorRecovery.consecutiveErrors = 0
    }
    
    // Execute recovery action if provided and circuit breaker is closed
    if (recoveryAction && !this.errorRecovery.circuitBreakerOpen) {
      try {
        this.logger.info(`Executing recovery action for ${component}`)
        await recoveryAction()
        this.logger.info(`Recovery action completed for ${component}`)
      } catch (recoveryError) {
        this.logger.error(`Recovery action failed for ${component}`, {
          error: recoveryError.message,
          stack: recoveryError.stack
        })
      }
    }
    
    // Shutdown if too many consecutive errors
    if (this.errorRecovery.consecutiveErrors >= this.errorRecovery.maxConsecutiveErrors) {
      this.logger.critical(`Maximum consecutive errors reached for ${component}, initiating shutdown`)
      await this.stop()
      process.exit(1)
    }
  }

  /**
   * Setup comprehensive error recovery
   */
  setupErrorRecovery () {
    this.logger.info('Setting up error recovery mechanisms')
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      await this.handleComponentError('uncaughtException', error)
    })
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason))
      await this.handleComponentError('unhandledRejection', error)
    })
    
    this.logger.info('Error recovery mechanisms configured')
  }

  /**
   * Get application status
   */
  getStatus () {
    return {
      isStarted: this.isStarted,
      isShuttingDown: this.isShuttingDown,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      services: Array.from(this.services.keys()),
      errorRecovery: {
        consecutiveErrors: this.errorRecovery.consecutiveErrors,
        circuitBreakerOpen: this.errorRecovery.circuitBreakerOpen
      },
      config: {
        environment: this.config?.app?.environment,
        version: this.config?.app?.version
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }
  }
}

// Create and export application instance
const app = new FinanceIngestionApp()

// Start application if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.start().catch(error => {
    console.error('Application startup failed:', error.message)
    process.exit(1)
  })
}

export default app
export { FinanceIngestionApp }
