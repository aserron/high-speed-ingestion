/**
 * Native Clustering for Multi-Core Utilization
 * 
 * Implements Node.js cluster management for maximum CPU utilization
 * with proper worker lifecycle management, graceful shutdown, and
 * load balancing for the financial data ingestion system.
 */

import cluster from 'cluster'
import os from 'os'
import { getConfig } from './config/index.js'
import { setupLogging, getLogger } from './logging/index.js'
import { setupErrorHandlers, ClusterError } from './errors/index.js'

/**
 * Cluster manager class
 */
class ClusterManager {
  constructor() {
    this.config = getConfig()
    this.logger = null
    this.workers = new Map()
    this.isShuttingDown = false
    this.restartCounts = new Map()
    this.startTime = Date.now()
  }

  /**
   * Initialize the cluster manager
   */
  async initialize() {
    // Setup logging first
    setupLogging(this.config)
    this.logger = getLogger('cluster-manager')
    
    // Setup error handlers
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
  }

  /**
   * Start the primary process
   */
  async startPrimary() {
    this.logger.info('Starting cluster primary process', {
      pid: process.pid,
      clusterEnabled: this.config.cluster.enabled
    })

    if (!this.config.cluster.enabled) {
      this.logger.info('Clustering disabled, starting single worker')
      await this.startSingleWorker()
      return
    }

    // Determine number of workers
    const numWorkers = this.config.cluster.workers || os.cpus().length
    this.logger.info(`Starting ${numWorkers} worker processes`)

    // Setup cluster event handlers
    this.setupClusterEventHandlers()

    // Start workers
    for (let i = 0; i < numWorkers; i++) {
      await this.forkWorker()
    }

    // Setup graceful shutdown
    this.setupGracefulShutdown()

    // Setup health monitoring
    this.setupHealthMonitoring()

    this.logger.info('Cluster primary process started successfully', {
      workers: this.workers.size,
      uptime: Date.now() - this.startTime
    })
  }

  /**
   * Start a single worker (no clustering)
   */
  async startSingleWorker() {
    try {
      const { default: app } = await import('./index.js')
      await app.start()
    } catch (error) {
      this.logger.error('Failed to start single worker', { error: error.message, stack: error.stack })
      process.exit(1)
    }
  }

  /**
   * Start a worker process
   */
  async startWorker() {
    const workerId = process.env.WORKER_ID || cluster.worker.id
    const logger = getLogger(`worker-${workerId}`)
    
    logger.info('Starting worker process', {
      workerId,
      pid: process.pid,
      ppid: process.ppid
    })

    try {
      // Import and start the main application
      const { default: app } = await import('./index.js')
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

  /**
   * Fork a new worker
   */
  async forkWorker() {
    return new Promise((resolve, reject) => {
      const worker = cluster.fork()
      const workerId = worker.id

      // Set worker environment
      worker.process.env.WORKER_ID = workerId

      // Track worker
      this.workers.set(workerId, {
        worker,
        startTime: Date.now(),
        restarts: this.restartCounts.get(workerId) || 0
      })

      // Setup worker event handlers
      worker.on('online', () => {
        this.logger.info('Worker came online', { workerId, pid: worker.process.pid })
        resolve(worker)
      })

      worker.on('listening', (address) => {
        this.logger.info('Worker listening', { workerId, address })
      })

      worker.on('disconnect', () => {
        this.logger.warn('Worker disconnected', { workerId })
      })

      worker.on('error', (error) => {
        this.logger.error('Worker error', { 
          workerId, 
          error: error.message,
          stack: error.stack 
        })
        reject(new ClusterError(`Worker ${workerId} error: ${error.message}`, workerId, 'start'))
      })

      // Set timeout for worker startup
      const startupTimeout = setTimeout(() => {
        this.logger.error('Worker startup timeout', { workerId })
        worker.kill('SIGKILL')
        reject(new ClusterError(`Worker ${workerId} startup timeout`, workerId, 'start'))
      }, 30000) // 30 second timeout

      worker.on('online', () => {
        clearTimeout(startupTimeout)
      })
    })
  }

  /**
   * Setup cluster event handlers
   */
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

    cluster.on('disconnect', (worker) => {
      this.logger.info('Worker disconnected', { workerId: worker.id })
    })
  }

  /**
   * Restart a worker
   */
  async restartWorker(workerId) {
    const restartCount = this.restartCounts.get(workerId) || 0
    
    if (restartCount >= this.config.cluster.maxRestarts) {
      this.logger.error('Worker restart limit exceeded', { 
        workerId, 
        restartCount,
        maxRestarts: this.config.cluster.maxRestarts
      })
      return
    }

    this.logger.info('Restarting worker', { workerId, restartCount })
    
    // Increment restart count
    this.restartCounts.set(workerId, restartCount + 1)

    // Wait before restarting
    await new Promise(resolve => setTimeout(resolve, this.config.cluster.restartDelay))

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

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
    signals.forEach(signal => {
      process.on(signal, () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`)
        this.gracefulShutdown()
      })
    })
  }

  /**
   * Perform graceful shutdown
   */
  async gracefulShutdown() {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    this.logger.info('Starting graceful shutdown', { workers: this.workers.size })

    const shutdownPromises = []

    // Disconnect all workers
    for (const [workerId, workerInfo] of this.workers) {
      const { worker } = workerInfo
      
      shutdownPromises.push(
        new Promise((resolve) => {
          const timeout = setTimeout(() => {
            this.logger.warn('Worker shutdown timeout, killing', { workerId })
            worker.kill('SIGKILL')
            resolve()
          }, this.config.cluster.gracefulShutdownTimeout)

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

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring() {
    setInterval(() => {
      const healthInfo = {
        uptime: Date.now() - this.startTime,
        workers: this.workers.size,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }

      this.logger.debug('Cluster health check', healthInfo)

      // Check for unhealthy workers
      for (const [workerId, workerInfo] of this.workers) {
        const { worker } = workerInfo
        
        if (worker.isDead()) {
          this.logger.warn('Dead worker detected', { workerId })
          this.workers.delete(workerId)
        }
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Get cluster statistics
   */
  getStats() {
    const workers = Array.from(this.workers.entries()).map(([id, info]) => ({
      id,
      pid: info.worker.process.pid,
      uptime: Date.now() - info.startTime,
      restarts: info.restarts,
      state: info.worker.state
    }))

    return {
      isPrimary: cluster.isPrimary,
      uptime: Date.now() - this.startTime,
      workers,
      totalWorkers: this.workers.size,
      restartCounts: Object.fromEntries(this.restartCounts)
    }
  }
}

/**
 * Start the cluster
 */
async function startCluster() {
  const clusterManager = new ClusterManager()
  
  try {
    await clusterManager.initialize()
  } catch (error) {
    console.error('Failed to start cluster:', error.message)
    process.exit(1)
  }
}

// Start cluster if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startCluster()
}

export default ClusterManager
export { startCluster }