/**
 * Cluster Application Manager
 *
 * Manages multi-core utilization with worker processes, health monitoring,
 * and graceful shutdown capabilities.
 */

// External dependencies
import cluster from 'cluster'
import os from 'os'

// Internal modules
import { getConfig } from '../config/index.js'
import { setupErrorHandlers, ClusterError } from '../errors/index.js'
import { setupLogging, getLogger } from '../logging/index.js'

/**
 * Cluster manager for multi-core utilization
 */
export class ClusterApp {
  constructor () {
    this.config = null
    this.logger = null
    this.workers = new Map()
    this.isShuttingDown = false
    this.restartCounts = new Map()
    this.startTime = Date.now()
  }

  async start () {
    try {
      this.config = getConfig()
      setupLogging(this.config)
      this.logger = getLogger('cluster-manager')
      await setupErrorHandlers()

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

  async startPrimary () {
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

  async startWorker () {
    const workerId = process.env.WORKER_ID || cluster.worker.id
    const logger = getLogger(`worker-${workerId}`)

    logger.info('Starting worker process', {
      workerId,
      pid: process.pid,
      ppid: process.ppid
    })

    try {
      const { FullApp } = await import('./full-app.js')
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

  async forkWorker () {
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
        reject(new ClusterError(`Worker ${workerId} startup timeout`, workerId, 'start'))
      }, 30000) // 30 second timeout

      worker.on('online', () => {
        clearTimeout(startupTimeout)
      })
    })
  }

  setupClusterEventHandlers () {
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

  async restartWorker (workerId) {
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
    await new Promise((resolve) => setTimeout(resolve, restartDelay))

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

  setupGracefulShutdown () {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    signals.forEach((signal) => {
      process.on(signal, () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`)
        this.gracefulShutdown()
      })
    })
  }

  async gracefulShutdown () {
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

  getStats () {
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

export default ClusterApp
