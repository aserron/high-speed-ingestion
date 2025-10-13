/**
 * Main Application Entry Point
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  constructor () {
=======
  constructor() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  constructor() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    this.config = null
    this.logger = null
    this.isStarted = false
    this.isShuttingDown = false
    this.startTime = null
    this.services = new Map()
  }

  /**
   * Initialize the application
   */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  async initialize() {
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
      
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      this.logger.info('Initializing Finance Ingestion System', {
        version: this.config.app.version,
        environment: this.config.app.environment,
        nodeVersion: process.version,
        pid: process.pid,
        workerId: process.env.WORKER_ID || 'single'
      })

      // Validate configuration
      await this.validateConfiguration()
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

      this.logger.info('Application initialized successfully')
=======
      
      this.logger.info('Application initialized successfully')
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
      this.logger.info('Application initialized successfully')
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
      this.logger.info('Application initialized successfully')
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
      this.logger.info('Application initialized successfully')
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
      this.logger.info('Application initialized successfully')
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
      this.logger.info('Application initialized successfully')
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
      this.logger.info('Application initialized successfully')
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
      this.logger.info('Application initialized successfully')
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    } catch (error) {
      console.error('Failed to initialize application:', error.message)
      throw error
    }
  }

  /**
   * Start the application
   */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async start () {
=======
  async start() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async start() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async start() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async start() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async start() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async start() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async start() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async start() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    if (this.isStarted) {
      this.logger.warn('Application already started')
      return
    }

    try {
      await this.initialize()
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      this.startTime = Date.now()
      this.logger.info('Starting Finance Ingestion System')

      // Setup graceful shutdown
      this.setupGracefulShutdown()

      // Start core services (placeholder for now)
      await this.startServices()

      this.isStarted = true
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      this.logger.info('Finance Ingestion System started successfully', {
        uptime: Date.now() - this.startTime,
        services: Array.from(this.services.keys())
      })

      // Keep the process alive
      this.keepAlive()
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async stop () {
=======
  async stop() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stop() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stop() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stop() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stop() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stop() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stop() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stop() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    if (!this.isStarted || this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true
    this.logger.info('Stopping Finance Ingestion System')

    try {
      // Stop services in reverse order
      const serviceNames = Array.from(this.services.keys()).reverse()
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      for (const serviceName of serviceNames) {
        await this.stopService(serviceName)
      }

      this.isStarted = false
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

      this.logger.info('Finance Ingestion System stopped successfully', {
        uptime: Date.now() - this.startTime
      })
=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      
      this.logger.info('Finance Ingestion System stopped successfully', {
        uptime: Date.now() - this.startTime
      })
      
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async validateConfiguration () {
    this.logger.info('Validating configuration')

=======
  async validateConfiguration() {
    this.logger.info('Validating configuration')
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async validateConfiguration() {
    this.logger.info('Validating configuration')
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async validateConfiguration() {
    this.logger.info('Validating configuration')
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async validateConfiguration() {
    this.logger.info('Validating configuration')
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async validateConfiguration() {
    this.logger.info('Validating configuration')
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async validateConfiguration() {
    this.logger.info('Validating configuration')
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async validateConfiguration() {
    this.logger.info('Validating configuration')
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async validateConfiguration() {
    this.logger.info('Validating configuration')
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async startServices () {
    this.logger.info('Starting core services')

    const services = [
      { name: 'storage', start: () => this.startStorageService() },
      { name: 'metrics', start: () => this.startMetricsService() },
      { name: 'health', start: () => this.startHealthService() },
      { name: 'websocket', start: () => this.startWebSocketService() },
      { name: 'processor', start: () => this.startProcessorService() }
=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  async startServices() {
    this.logger.info('Starting core services')

    // Placeholder service implementations
    // These will be implemented in subsequent tasks
    
    const services = [
      { name: 'metrics', start: () => this.startMetricsService() },
      { name: 'health', start: () => this.startHealthService() },
      { name: 'websocket', start: () => this.startWebSocketService() },
      { name: 'processor', start: () => this.startProcessorService() },
      { name: 'storage', start: () => this.startStorageService() }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async stopService (serviceName) {
=======
  async stopService(serviceName) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stopService(serviceName) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stopService(serviceName) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stopService(serviceName) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stopService(serviceName) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stopService(serviceName) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stopService(serviceName) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async stopService(serviceName) {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    const service = this.services.get(serviceName)
    if (!service) {
      return
    }

    try {
      this.logger.info(`Stopping ${serviceName} service`)
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

      if (service.stop && typeof service.stop === 'function') {
        await service.stop()
      }

      this.services.delete(serviceName)
      this.logger.info(`${serviceName} service stopped successfully`)
=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      
      if (service.stop && typeof service.stop === 'function') {
        await service.stop()
      }
      
      this.services.delete(serviceName)
      this.logger.info(`${serviceName} service stopped successfully`)
      
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    } catch (error) {
      this.logger.error(`Error stopping ${serviceName} service`, {
        error: error.message,
        stack: error.stack
      })
    }
  }

  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
   * Placeholder service implementations
   * These will be replaced with actual implementations in subsequent tasks
   */
  async startMetricsService() {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    this.logger.info('Metrics service would start here (placeholder)')
    return { name: 'metrics', stop: async () => {} }
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async startHealthService () {
=======
  async startHealthService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startHealthService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startHealthService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startHealthService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startHealthService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startHealthService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startHealthService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startHealthService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    this.logger.info('Health service would start here (placeholder)')
    return { name: 'health', stop: async () => {} }
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async startWebSocketService () {
    const { initializeWebSocket } = await import('./websocket/index.js')

    this.logger.info('Initializing WebSocket service')
    const webSocketService = await initializeWebSocket(this.config)

    // Perform initial health check
    webSocketService.getHealth()

    this.logger.info('WebSocket service started successfully', {
      initialized: webSocketService.isInitialized
    })

    return {
      name: 'websocket',
      service: webSocketService,
      stop: async () => {
        this.logger.info('Stopping WebSocket service')
        await webSocketService.close()
      }
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  }

  async startProcessorService () {
=======
  async startWebSocketService() {
    this.logger.info('WebSocket service would start here (placeholder)')
    return { name: 'websocket', stop: async () => {} }
=======
>>>>>>> c4efaa2 (feat: implement Node.js WebSocket connection management)
  }

  async startProcessorService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startWebSocketService() {
    this.logger.info('WebSocket service would start here (placeholder)')
    return { name: 'websocket', stop: async () => {} }
=======
>>>>>>> c4efaa2 (feat: implement Node.js WebSocket connection management)
  }

  async startProcessorService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startWebSocketService() {
    this.logger.info('WebSocket service would start here (placeholder)')
    return { name: 'websocket', stop: async () => {} }
=======
>>>>>>> c4efaa2 (feat: implement Node.js WebSocket connection management)
  }

  async startProcessorService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startWebSocketService() {
    this.logger.info('WebSocket service would start here (placeholder)')
    return { name: 'websocket', stop: async () => {} }
=======
>>>>>>> c4efaa2 (feat: implement Node.js WebSocket connection management)
  }

  async startProcessorService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startWebSocketService() {
    this.logger.info('WebSocket service would start here (placeholder)')
    return { name: 'websocket', stop: async () => {} }
=======
>>>>>>> c4efaa2 (feat: implement Node.js WebSocket connection management)
  }

  async startProcessorService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startWebSocketService() {
    this.logger.info('WebSocket service would start here (placeholder)')
    return { name: 'websocket', stop: async () => {} }
=======
>>>>>>> c4efaa2 (feat: implement Node.js WebSocket connection management)
  }

  async startProcessorService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startWebSocketService() {
    this.logger.info('WebSocket service would start here (placeholder)')
    return { name: 'websocket', stop: async () => {} }
=======
>>>>>>> c4efaa2 (feat: implement Node.js WebSocket connection management)
  }

  async startProcessorService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startWebSocketService() {
    this.logger.info('WebSocket service would start here (placeholder)')
    return { name: 'websocket', stop: async () => {} }
=======
>>>>>>> c4efaa2 (feat: implement Node.js WebSocket connection management)
  }

  async startProcessorService() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    this.logger.info('Processor service would start here (placeholder)')
    return { name: 'processor', stop: async () => {} }
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown () {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    signals.forEach(signal => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`)

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  async startStorageService() {
    this.logger.info('Storage service would start here (placeholder)')
    return { name: 'storage', stop: async () => {} }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`)
        
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  keepAlive () {
=======
  keepAlive() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  keepAlive() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  keepAlive() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  keepAlive() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  keepAlive() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  keepAlive() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  keepAlive() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  keepAlive() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
   * Get application status
   */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  getStatus () {
=======
  getStatus() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStatus() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStatus() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStatus() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStatus() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStatus() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStatus() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStatus() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    return {
      isStarted: this.isStarted,
      isShuttingDown: this.isShuttingDown,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      services: Array.from(this.services.keys()),
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export { FinanceIngestionApp }
=======
export { FinanceIngestionApp }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { FinanceIngestionApp }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { FinanceIngestionApp }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { FinanceIngestionApp }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { FinanceIngestionApp }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { FinanceIngestionApp }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { FinanceIngestionApp }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { FinanceIngestionApp }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
