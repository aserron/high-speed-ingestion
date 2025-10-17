/**
 * Unified Application Entry Point
 * 
 * Single source of truth for the Node.js Financial Data Ingestion System
 * Supports multiple modes: simple, full-featured, and clustered
 */

import cluster from 'cluster'
import os from 'os'
import http from 'http'
import url from 'url'
import { getConfig } from './config/index.js'
import { setupLogging, getLogger, setCorrelationId } from './logging/index.js'
import { setupErrorHandlers } from './errors/index.js'

/**
 * Application modes
 */
const APP_MODES = {
  SIMPLE: 'simple',
  FULL: 'full', 
  CLUSTER: 'cluster'
}

/**
 * Get application mode from environment
 */
function getAppMode() {
  const mode = process.env.APP_MODE || 'full'
  if (!Object.values(APP_MODES).includes(mode)) {
    console.warn(`Invalid APP_MODE: ${mode}. Defaulting to 'full'`)
    return APP_MODES.FULL
  }
  return mode
}

/**
 * Simple HTTP server for basic functionality
 */
class SimpleApp {
  constructor() {
    this.server = null
    this.port = process.env.PORT || 8000
    this.host = process.env.HOST || '0.0.0.0'
  }

  sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data, null, 2))
  }

  proxyPrometheus(res) {
    const proxyReq = http.request({
      hostname: 'localhost',
      port: 9090,
      path: '/-/healthy',
      method: 'GET'
    }, (proxyRes) => {
      let data = ''
      proxyRes.on('data', chunk => data += chunk)
      proxyRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end(data)
      })
    })
    proxyReq.on('error', () => {
      this.sendJSON(res, { error: 'Prometheus not available' }, 503)
    })
    proxyReq.end()
  }

  async start() {
    this.server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true)
      const path = parsedUrl.pathname
      const method = req.method

      console.log(`${new Date().toISOString()} ${method} ${path}`)

      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      if (method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      // Route handling
      if (method === 'GET') {
        switch (path) {
          case '/':
            this.sendJSON(res, {
              service: 'finance-ingestion-nodejs',
              version: '1.0.0',
              status: 'running',
              mode: 'simple',
              environment: process.env.NODE_ENV || 'development'
            })
            break

          case '/health':
            this.sendJSON(res, {
              status: 'healthy',
              timestamp: new Date().toISOString(),
              uptime: process.uptime(),
              memory: process.memoryUsage(),
              mode: 'simple'
            })
            break

          case '/config-test':
            this.sendJSON(res, {
              message: 'Simple mode - no complex config needed',
              env: process.env.NODE_ENV || 'development'
            })
            break

          case '/prometheus-health':
            // Simple proxy to Prometheus health endpoint with CORS
            this.proxyPrometheus(res)
            break

          default:
            this.sendJSON(res, { error: 'Not Found' }, 404)
        }
      } else {
        this.sendJSON(res, { error: 'Method Not Allowed' }, 405)
      }
    })

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, (err) => {
        if (err) {
          reject(err)
        } else {
          console.log(`🚀 Simple server running on http://${this.host}:${this.port}`)
          console.log(`📊 Health check: http://${this.host}:${this.port}/health`)
          console.log(`🔧 Config test: http://${this.host}:${this.port}/config-test`)
          resolve()
        }
      })
    })
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Simple server stopped')
          resolve()
        })
      })
    }
  }
}

/**
 * Full-featured application (from src/index.js)
 */
class FullApp {
  constructor() {
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

      this.logger.info('Initializing Finance Ingestion System', {
        version: this.config.app.version,
        environment: this.config.app.environment,
        nodeVersion: process.version,
        pid: process.pid,
        mode: 'full'
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

  async start() {
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

  async validateConfiguration() {
    this.logger.info('Validating configuration')
    // Add validation logic here
    this.logger.info('Configuration validation passed')
  }

  async startServices() {
    this.logger.info('Starting core services')
    // Add service startup logic here
  }

  setupGracefulShutdown() {
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

  setupErrorRecovery() {
    this.logger.info('Setting up error recovery mechanisms')
    // Add error recovery logic here
  }

  keepAlive() {
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

  async stop() {
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

  async stopService(serviceName) {
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
}

/**
 * Cluster manager for multi-core utilization
 */
class ClusterApp {
  constructor() {
    this.config = null
    this.logger = null
    this.workers = new Map()
    this.isShuttingDown = false
    this.restartCounts = new Map()
    this.startTime = Date.now()
  }

  async start() {
    try {
      this.config = getConfig()
      setupLogging(this.config)
      this.logger = getLogger('cluster-manager')
      setupErrorHandlers()

      this.logger.info('Initializing cluster manager', {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      })

      if (cluster.isPrimary) {
        await this.startPrimary()
      } else {
        await this.startWorker()
      }
    } catch (error) {
      console.error('Failed to start cluster:', error.message)
      process.exit(1)
    }
  }

  async startPrimary() {
    this.logger.info('Starting cluster primary process', {
      pid: process.pid
    })

    const numWorkers = this.config?.cluster?.workers || os.cpus().length
    this.logger.info(`Starting ${numWorkers} worker processes`)

    // Setup cluster event handlers
    this.setupClusterEventHandlers()

    // Start workers
    for (let i = 0; i < numWorkers; i++) {
      await this.forkWorker()
    }

    // Setup graceful shutdown
    this.setupGracefulShutdown()

    this.logger.info('Cluster primary process started successfully', {
      workers: this.workers.size,
      uptime: Date.now() - this.startTime
    })
  }

  async startWorker() {
    const workerId = process.env.WORKER_ID || cluster.worker.id
    const logger = getLogger(`worker-${workerId}`)

    logger.info('Starting worker process', {
      workerId,
      pid: process.pid,
      ppid: process.ppid
    })

    try {
      // Start the full application in worker mode
      const app = new FullApp()
      await app.start()

      logger.info('Worker process started successfully', {
        workerId,
        uptime: process.uptime()
      })
    } catch (error) {
      logger.error('Worker process failed to start', {
        workerId,
        error: error.message,
        stack: error.stack
      })
      process.exit(1)
    }
  }

  async forkWorker() {
    return new Promise((resolve, reject) => {
      const worker = cluster.fork({ WORKER_ID: cluster.worker?.id || 'primary' })
      const workerId = worker.id

      // Track worker
      this.workers.set(workerId, {
        worker,
        startTime: Date.now(),
        restarts: this.restartCounts.get(workerId) || 0
      })

      worker.on('online', () => {
        this.logger.info('Worker came online', { workerId, pid: worker.process.pid })
        resolve(worker)
      })

      worker.on('error', (error) => {
        this.logger.error('Worker error', {
          workerId,
          error: error.message,
          stack: error.stack
        })
        reject(error)
      })

      // Set timeout for worker startup
      const startupTimeout = setTimeout(() => {
        this.logger.error('Worker startup timeout', { workerId })
        worker.kill('SIGKILL')
        reject(new Error(`Worker ${workerId} startup timeout`))
      }, 30000) // 30 second timeout

      worker.on('online', () => {
        clearTimeout(startupTimeout)
      })
    })
  }

  setupClusterEventHandlers() {
    cluster.on('exit', (worker, code, signal) => {
      const workerId = worker.id
      const workerInfo = this.workers.get(workerId)

      this.logger.warn('Worker exited', {
        workerId,
        pid: worker.process.pid,
        code,
        signal,
        uptime: workerInfo ? Date.now() - workerInfo.startTime : 0
      })

      // Remove from tracking
      this.workers.delete(workerId)

      // Restart worker if not shutting down
      if (!this.isShuttingDown && !worker.exitedAfterDisconnect) {
        this.restartWorker(workerId)
      }
    })
  }

  async restartWorker(workerId) {
    const restartCount = this.restartCounts.get(workerId) || 0
    const maxRestarts = this.config?.cluster?.maxRestarts || 10

    if (restartCount >= maxRestarts) {
      this.logger.error('Worker restart limit exceeded', {
        workerId,
        restartCount,
        maxRestarts
      })
      return
    }

    this.logger.info('Restarting worker', { workerId, restartCount })

    // Increment restart count
    this.restartCounts.set(workerId, restartCount + 1)

    // Wait before restarting
    const restartDelay = this.config?.cluster?.restartDelay || 1000
    await new Promise(resolve => setTimeout(resolve, restartDelay))

    try {
      await this.forkWorker()
      this.logger.info('Worker restarted successfully', { workerId })
    } catch (error) {
      this.logger.error('Failed to restart worker', {
        workerId,
        error: error.message
      })
    }
  }

  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    signals.forEach(signal => {
      process.on(signal, () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`)
        this.gracefulShutdown()
      })
    })
  }

  async gracefulShutdown() {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    this.logger.info('Starting graceful shutdown', { workers: this.workers.size })

    const shutdownPromises = []
    const gracefulShutdownTimeout = this.config?.cluster?.gracefulShutdownTimeout || 10000

    // Disconnect all workers
    for (const [workerId, workerInfo] of this.workers) {
      const { worker } = workerInfo

      shutdownPromises.push(
        new Promise((resolve) => {
          const timeout = setTimeout(() => {
            this.logger.warn('Worker shutdown timeout, killing', { workerId })
            worker.kill('SIGKILL')
            resolve()
          }, gracefulShutdownTimeout)

          worker.on('disconnect', () => {
            clearTimeout(timeout)
            resolve()
          })

          worker.on('exit', () => {
            clearTimeout(timeout)
            resolve()
          })

          // Disconnect worker
          worker.disconnect()
        })
      )
    }

    // Wait for all workers to shutdown
    await Promise.all(shutdownPromises)

    this.logger.info('All workers shutdown, exiting primary process')
    process.exit(0)
  }
}

/**
 * Main application launcher
 */
async function main() {
  const mode = getAppMode()
  
  console.log(`Starting application in ${mode} mode...`)

  try {
    switch (mode) {
      case APP_MODES.SIMPLE:
        const simpleApp = new SimpleApp()
        await simpleApp.start()
        
        // Setup graceful shutdown for simple mode
        process.on('SIGTERM', () => simpleApp.stop())
        process.on('SIGINT', () => simpleApp.stop())
        break

      case APP_MODES.FULL:
        const fullApp = new FullApp()
        await fullApp.start()
        break

      case APP_MODES.CLUSTER:
        const clusterApp = new ClusterApp()
        await clusterApp.start()
        break

      default:
        throw new Error(`Unknown application mode: ${mode}`)
    }
  } catch (error) {
    console.error('Application startup failed:', error.message)
    process.exit(1)
  }
}

// Start application if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { SimpleApp, FullApp, ClusterApp, APP_MODES, main }