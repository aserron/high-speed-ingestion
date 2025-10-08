/**
 * Native Clustering for Multi-Core Utilization
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async initialize () {
    // Setup logging first
    setupLogging(this.config)
    this.logger = getLogger('cluster-manager')

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
  async initialize() {
    // Setup logging first
    setupLogging(this.config)
    this.logger = getLogger('cluster-manager')
    
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async startPrimary () {
=======
  async startPrimary() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startPrimary() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startPrimary() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startPrimary() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startPrimary() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startPrimary() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async startSingleWorker () {
=======
  async startSingleWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startSingleWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startSingleWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startSingleWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startSingleWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async startSingleWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async startWorker () {
    const workerId = process.env.WORKER_ID || cluster.worker.id
    const logger = getLogger(`worker-${workerId}`)

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
  async startWorker() {
    const workerId = process.env.WORKER_ID || cluster.worker.id
    const logger = getLogger(`worker-${workerId}`)
    
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
    logger.info('Starting worker process', {
      workerId,
      pid: process.pid,
      ppid: process.ppid
    })

    try {
      // Import and start the main application
      const { default: app } = await import('./index.js')
      await app.start()
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async forkWorker () {
=======
  async forkWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async forkWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async forkWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async forkWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async forkWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async forkWorker() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        this.logger.error('Worker error', {
          workerId,
          error: error.message,
          stack: error.stack
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
        this.logger.error('Worker error', { 
          workerId, 
          error: error.message,
          stack: error.stack 
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  setupClusterEventHandlers () {
    cluster.on('exit', (worker, code, signal) => {
      const workerId = worker.id
      const workerInfo = this.workers.get(workerId)

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
  setupClusterEventHandlers() {
    cluster.on('exit', (worker, code, signal) => {
      const workerId = worker.id
      const workerInfo = this.workers.get(workerId)
      
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async restartWorker (workerId) {
    const restartCount = this.restartCounts.get(workerId) || 0

    if (restartCount >= this.config.cluster.maxRestarts) {
      this.logger.error('Worker restart limit exceeded', {
        workerId,
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
  async restartWorker(workerId) {
    const restartCount = this.restartCounts.get(workerId) || 0
    
    if (restartCount >= this.config.cluster.maxRestarts) {
      this.logger.error('Worker restart limit exceeded', { 
        workerId, 
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
        restartCount,
        maxRestarts: this.config.cluster.maxRestarts
      })
      return
    }

    this.logger.info('Restarting worker', { workerId, restartCount })
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
    // Increment restart count
    this.restartCounts.set(workerId, restartCount + 1)

    // Wait before restarting
    await new Promise(resolve => setTimeout(resolve, this.config.cluster.restartDelay))

    try {
      await this.forkWorker()
      this.logger.info('Worker restarted successfully', { workerId })
    } catch (error) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      this.logger.error('Failed to restart worker', {
        workerId,
        error: error.message
=======
      this.logger.error('Failed to restart worker', { 
        workerId, 
        error: error.message 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      this.logger.error('Failed to restart worker', { 
        workerId, 
        error: error.message 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      this.logger.error('Failed to restart worker', { 
        workerId, 
        error: error.message 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      this.logger.error('Failed to restart worker', { 
        workerId, 
        error: error.message 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      this.logger.error('Failed to restart worker', { 
        workerId, 
        error: error.message 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
      this.logger.error('Failed to restart worker', { 
        workerId, 
        error: error.message 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
      })
    }
  }

  /**
   * Setup graceful shutdown
   */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  setupGracefulShutdown () {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']

=======
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  async gracefulShutdown () {
=======
  async gracefulShutdown() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async gracefulShutdown() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async gracefulShutdown() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async gracefulShutdown() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async gracefulShutdown() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  async gracefulShutdown() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  setupHealthMonitoring () {
=======
  setupHealthMonitoring() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupHealthMonitoring() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupHealthMonitoring() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupHealthMonitoring() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupHealthMonitoring() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  setupHealthMonitoring() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  getStats () {
=======
  getStats() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStats() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStats() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStats() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStats() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  getStats() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function startCluster () {
  const clusterManager = new ClusterManager()

=======
async function startCluster() {
  const clusterManager = new ClusterManager()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
async function startCluster() {
  const clusterManager = new ClusterManager()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
async function startCluster() {
  const clusterManager = new ClusterManager()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
async function startCluster() {
  const clusterManager = new ClusterManager()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
async function startCluster() {
  const clusterManager = new ClusterManager()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
async function startCluster() {
  const clusterManager = new ClusterManager()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export { startCluster }
=======
export { startCluster }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { startCluster }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { startCluster }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { startCluster }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { startCluster }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
export { startCluster }
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
