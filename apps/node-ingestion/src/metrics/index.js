/**
 * Metrics Collection and Monitoring for Financial Data Ingestion
 *
 * Provides Prometheus metrics exporter, latency tracking, throughput monitoring,
 * and structured logging with correlation IDs for performance analysis.
 */

import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { getLogger } from '../logging/index.js'

// Prometheus client with graceful fallback
let promClient = null
let prometheusAvailable = false

try {
  promClient = await import('prom-client')
  prometheusAvailable = true
} catch (error) {
  // Create mock prometheus client for when prom-client is not available
  promClient = {
    Counter: class MockCounter {
      inc() {}
      labels() { return this }
    },
    Histogram: class MockHistogram {
      observe() {}
      labels() { return this }
      startTimer() { return () => {} }
    },
    Gauge: class MockGauge {
      set() {}
      inc() {}
      dec() {}
      labels() { return this }
    },
    Summary: class MockSummary {
      observe() {}
      labels() { return this }
    },
    register: {
      clear: () => {},
      metrics: () => Promise.resolve(''),
      contentType: 'text/plain'
    },
    collectDefaultMetrics: () => {}
  }
}

/**
 * Latency statistics container
 */
class LatencyStats {
  constructor() {
    this.count = 0
    this.totalNs = 0n
    this.minNs = Infinity
    this.maxNs = 0
    this.samples = []
    this.maxSamples = 10000
    
    // Percentile cache
    this.percentileCache = {
      p50: 0,
      p95: 0,
      p99: 0,
      p999: 0,
      lastUpdate: 0
    }
  }

  addSample(latencyNs) {
    this.count++
    this.totalNs += BigInt(latencyNs)
    this.minNs = Math.min(this.minNs, latencyNs)
    this.maxNs = Math.max(this.maxNs, latencyNs)
    
    // Add to samples array
    this.samples.push(latencyNs)
    
    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }
    
    // Update percentiles every 100 samples for performance
    if (this.count % 100 === 0) {
      this.updatePercentiles()
    }
  }

  updatePercentiles() {
    if (this.samples.length === 0) return
    
    const sorted = [...this.samples].sort((a, b) => a - b)
    const n = sorted.length
    
    this.percentileCache.p50 = sorted[Math.floor(n * 0.50)]
    this.percentileCache.p95 = sorted[Math.floor(n * 0.95)]
    this.percentileCache.p99 = sorted[Math.floor(n * 0.99)]
    this.percentileCache.p999 = sorted[Math.floor(n * 0.999)]
    this.percentileCache.lastUpdate = Date.now()
  }

  get avgNs() {
    return this.count > 0 ? Number(this.totalNs) / this.count : 0
  }

  toJSON() {
    return {
      count: this.count,
      avgNs: this.avgNs,
      minNs: this.minNs === Infinity ? 0 : this.minNs,
      maxNs: this.maxNs,
      p50Ns: this.percentileCache.p50,
      p95Ns: this.percentileCache.p95,
      p99Ns: this.percentileCache.p99,
      p999Ns: this.percentileCache.p999
    }
  }
}

/**
 * Central metrics collection and monitoring system
 */
export class MetricsCollector extends EventEmitter {
  constructor(config = {}) {
    super()
    this.config = config
    this.logger = getLogger('metrics-collector')
    
    // Metrics storage
    this.latencyStats = new Map()
    this.throughputCounters = new Map()
    this.resourceGauges = new Map()
    this.correlationIds = new Map()
    
    // Prometheus registry
    this.registry = prometheusAvailable ? new promClient.Registry() : null
    
    // Initialize Prometheus metrics
    this.initPrometheusMetrics()
    
    // Start background tasks
    this.startBackgroundTasks()
  }

  initPrometheusMetrics() {
    if (!prometheusAvailable) {
      this.logger.warn('Prometheus client not available, metrics will be limited')
      return
    }

    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.registry })

    // Message processing metrics
    this.messageCounter = new promClient.Counter({
      name: 'finance_messages_processed_total',
      help: 'Total number of messages processed',
      labelNames: ['symbol', 'message_type', 'status'],
      registers: [this.registry]
    })

    this.messageLatency = new promClient.Histogram({
      name: 'finance_message_latency_seconds',
      help: 'Message processing latency in seconds',
      labelNames: ['symbol', 'message_type'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
      registers: [this.registry]
    })

    this.throughputGauge = new promClient.Gauge({
      name: 'finance_throughput_messages_per_second',
      help: 'Current throughput in messages per second',
      labelNames: ['symbol'],
      registers: [this.registry]
    })

    // Storage metrics
    this.storageOperations = new promClient.Counter({
      name: 'finance_storage_operations_total',
      help: 'Total storage operations',
      labelNames: ['operation', 'backend', 'status'],
      registers: [this.registry]
    })

    this.storageLatency = new promClient.Histogram({
      name: 'finance_storage_latency_seconds',
      help: 'Storage operation latency in seconds',
      labelNames: ['operation', 'backend'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
      registers: [this.registry]
    })

    // Connection metrics
    this.connectionStatus = new promClient.Gauge({
      name: 'finance_connection_status',
      help: 'Connection status (1=connected, 0=disconnected)',
      labelNames: ['endpoint', 'protocol'],
      registers: [this.registry]
    })

    this.connectionLatency = new promClient.Histogram({
      name: 'finance_connection_latency_seconds',
      help: 'Connection latency in seconds',
      labelNames: ['endpoint'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
      registers: [this.registry]
    })

    // Resource utilization metrics
    this.cpuUsage = new promClient.Gauge({
      name: 'finance_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.registry]
    })

    this.memoryUsage = new promClient.Gauge({
      name: 'finance_memory_usage_bytes',
      help: 'Memory usage in bytes',
      registers: [this.registry]
    })

    this.networkBytes = new promClient.Counter({
      name: 'finance_network_bytes_total',
      help: 'Network bytes transferred',
      labelNames: ['direction'],
      registers: [this.registry]
    })

    // Application info
    this.appInfo = new promClient.Gauge({
      name: 'finance_app_info',
      help: 'Application information',
      labelNames: ['version', 'node_version', 'prometheus_available'],
      registers: [this.registry]
    })

    // Set application info
    this.appInfo.labels('1.0.0', process.version, prometheusAvailable.toString()).set(1)
  }

  startBackgroundTasks() {
    // Start resource monitoring
    if (this.config.enableResourceMonitoring !== false) {
      this.startResourceMonitoring()
    }

    // Start metrics cleanup
    this.startMetricsCleanup()

    // Start throughput calculation
    this.startThroughputCalculation()
  }

  startResourceMonitoring() {
    const monitorResources = () => {
      try {
        const memUsage = process.memoryUsage()
        const cpuUsage = process.cpuUsage()

        // Memory metrics
        this.setGauge('memory_usage_bytes', memUsage.rss)
        this.setGauge('memory_heap_used_bytes', memUsage.heapUsed)
        this.setGauge('memory_heap_total_bytes', memUsage.heapTotal)
        this.setGauge('memory_external_bytes', memUsage.external)

        // CPU metrics (convert microseconds to percentage)
        const totalCpuTime = cpuUsage.user + cpuUsage.system
        this.setGauge('cpu_usage_microseconds', totalCpuTime)

        // Event loop lag
        const { performance } = await import('perf_hooks')
        const start = performance.now()
        setImmediate(() => {
          const lag = performance.now() - start
          this.setGauge('event_loop_lag_ms', lag)
        })

      } catch (error) {
        this.logger.error('Error monitoring resources', { error: error.message })
      }
    }

    // Monitor every 5 seconds
    setInterval(monitorResources, 5000)
    monitorResources() // Initial measurement
  }

  startMetricsCleanup() {
    const cleanup = () => {
      try {
        const now = Date.now()
        const maxAge = 3600000 // 1 hour in milliseconds

        // Clean up old correlation IDs
        for (const [id, timestamp] of this.correlationIds.entries()) {
          if (now - timestamp > maxAge) {
            this.correlationIds.delete(id)
          }
        }

        // Clean up old latency samples
        for (const stats of this.latencyStats.values()) {
          if (stats.samples.length > stats.maxSamples) {
            stats.samples = stats.samples.slice(-stats.maxSamples)
          }
        }

        this.logger.debug('Metrics cleanup completed', {
          activeCorrelationIds: this.correlationIds.size,
          latencyStatsCount: this.latencyStats.size
        })

      } catch (error) {
        this.logger.error('Error during metrics cleanup', { error: error.message })
      }
    }

    // Cleanup every 5 minutes
    setInterval(cleanup, 300000)
  }

  startThroughputCalculation() {
    const calculateThroughput = () => {
      try {
        const now = Date.now()
        const windowMs = 60000 // 1 minute window

        for (const [key, stats] of this.latencyStats.entries()) {
          if (key.startsWith('message_processing')) {
            // Calculate messages per second over the last minute
            const recentSamples = stats.samples.filter(
              sample => now - sample.timestamp < windowMs
            )
            const messagesPerSecond = (recentSamples.length / windowMs) * 1000

            // Extract symbol from key if available
            const symbolMatch = key.match(/symbol=([^:]+)/)
            const symbol = symbolMatch ? symbolMatch[1] : 'all'

            this.setGauge('throughput_messages_per_second', messagesPerSecond, { symbol })
          }
        }

      } catch (error) {
        this.logger.error('Error calculating throughput', { error: error.message })
      }
    }

    // Calculate every 10 seconds
    setInterval(calculateThroughput, 10000)
  }

  generateCorrelationId() {
    const correlationId = randomUUID()
    this.correlationIds.set(correlationId, Date.now())
    return correlationId
  }

  trackLatency(operation, labels = {}) {
    const { performance } = await import('perf_hooks')
    const startTime = performance.now()
    const correlationId = this.generateCorrelationId()

    return {
      correlationId,
      end: () => {
        const endTime = performance.now()
        const latencyMs = endTime - startTime
        const latencyNs = Math.round(latencyMs * 1_000_000) // Convert to nanoseconds

        this.recordLatency(operation, latencyNs, labels)
        return latencyNs
      }
    }
  }

  recordLatency(operation, latencyNs, labels = {}) {
    // Create key from operation and labels
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(':')
    const key = labelStr ? `${operation}:${labelStr}` : operation

    // Update internal stats
    if (!this.latencyStats.has(key)) {
      this.latencyStats.set(key, new LatencyStats())
    }
    this.latencyStats.get(key).addSample(latencyNs)

    // Update Prometheus metrics
    if (prometheusAvailable) {
      const latencySeconds = latencyNs / 1_000_000_000

      if (operation.startsWith('message')) {
        this.messageLatency.labels(labels).observe(latencySeconds)
      } else if (operation.startsWith('storage')) {
        this.storageLatency.labels(labels).observe(latencySeconds)
      } else if (operation.startsWith('connection')) {
        this.connectionLatency.labels(labels).observe(latencySeconds)
      }
    }

    // Emit event for real-time monitoring
    this.emit('latency', { operation, latencyNs, labels })
  }

  incrementCounter(metric, value = 1, labels = {}) {
    // Create key from metric and labels
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(':')
    const key = labelStr ? `${metric}:${labelStr}` : metric

    // Update internal counter
    const current = this.throughputCounters.get(key) || 0
    this.throughputCounters.set(key, current + value)

    // Update Prometheus metrics
    if (prometheusAvailable) {
      if (metric.startsWith('message')) {
        this.messageCounter.labels(labels).inc(value)
      } else if (metric.startsWith('storage')) {
        this.storageOperations.labels(labels).inc(value)
      } else if (metric.startsWith('network')) {
        this.networkBytes.labels(labels).inc(value)
      }
    }

    // Emit event for real-time monitoring
    this.emit('counter', { metric, value, labels })
  }

  setGauge(metric, value, labels = {}) {
    // Create key from metric and labels
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(':')
    const key = labelStr ? `${metric}:${labelStr}` : metric

    // Update internal gauge
    this.resourceGauges.set(key, value)

    // Update Prometheus metrics
    if (prometheusAvailable) {
      if (metric === 'cpu_usage_percent') {
        this.cpuUsage.set(value)
      } else if (metric === 'memory_usage_bytes') {
        this.memoryUsage.set(value)
      } else if (metric.startsWith('throughput')) {
        this.throughputGauge.labels(labels).set(value)
      } else if (metric.startsWith('connection')) {
        this.connectionStatus.labels(labels).set(value)
      }
    }

    // Emit event for real-time monitoring
    this.emit('gauge', { metric, value, labels })
  }

  getLatencyStats(operation = null) {
    const result = {}

    for (const [key, stats] of this.latencyStats.entries()) {
      if (!operation || key.startsWith(operation)) {
        result[key] = stats.toJSON()
      }
    }

    return result
  }

  getThroughputStats() {
    return Object.fromEntries(this.throughputCounters)
  }

  getResourceStats() {
    return Object.fromEntries(this.resourceGauges)
  }

  getAllStats() {
    return {
      latency: this.getLatencyStats(),
      throughput: this.getThroughputStats(),
      resources: this.getResourceStats(),
      timestamp: Date.now(),
      correlationIdsActive: this.correlationIds.size
    }
  }

  async exportPrometheusMetrics() {
    if (!prometheusAvailable) {
      return '# Prometheus client not available\n'
    }

    try {
      return await this.registry.metrics()
    } catch (error) {
      this.logger.error('Error exporting Prometheus metrics', { error: error.message })
      return '# Error exporting metrics\n'
    }
  }

  getPrometheusContentType() {
    return prometheusAvailable ? this.registry.contentType : 'text/plain'
  }
}

/**
 * Structured logger with correlation ID support
 */
export class StructuredLogger {
  constructor(name, metricsCollector = null) {
    this.logger = getLogger(name)
    this.metricsCollector = metricsCollector
  }

  logWithContext(level, message, correlationId = null, extra = {}) {
    const logData = {
      message,
      timestamp: new Date().toISOString(),
      correlationId,
      ...extra
    }

    // Remove null/undefined values
    Object.keys(logData).forEach(key => {
      if (logData[key] == null) {
        delete logData[key]
      }
    })

    this.logger[level](JSON.stringify(logData))
  }

  info(message, correlationId = null, extra = {}) {
    this.logWithContext('info', message, correlationId, extra)
  }

  error(message, correlationId = null, extra = {}) {
    this.logWithContext('error', message, correlationId, extra)
  }

  warn(message, correlationId = null, extra = {}) {
    this.logWithContext('warn', message, correlationId, extra)
  }

  debug(message, correlationId = null, extra = {}) {
    this.logWithContext('debug', message, correlationId, extra)
  }
}

import { createSingleton } from '../utils/common-utilities.js'

// Global metrics collector instance
const getMetricsCollectorSingleton = createSingleton((config = {}) => new MetricsCollector(config))

/**
 * Get or create global metrics collector
 */
export function getMetricsCollector(config = {}) {
  return getMetricsCollectorSingleton(config)
}

/**
 * Get structured logger with metrics integration
 */
export function getStructuredLogger(name) {
  const metricsCollector = getMetricsCollector()
  return new StructuredLogger(name, metricsCollector)
}

// Convenience functions
export function trackLatency(operation, labels = {}) {
  return getMetricsCollector().trackLatency(operation, labels)
}

export function recordLatency(operation, latencyNs, labels = {}) {
  getMetricsCollector().recordLatency(operation, latencyNs, labels)
}

export function incrementCounter(metric, value = 1, labels = {}) {
  getMetricsCollector().incrementCounter(metric, value, labels)
}

export function setGauge(metric, value, labels = {}) {
  getMetricsCollector().setGauge(metric, value, labels)
}

export default {
  MetricsCollector,
  StructuredLogger,
  getMetricsCollector,
  getStructuredLogger,
  trackLatency,
  recordLatency,
  incrementCounter,
  setGauge
}