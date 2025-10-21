/**
 * REST API Endpoints for Financial Data Ingestion
 *
 * Provides health checks, metrics endpoints, and real-time performance statistics
 * with OpenAPI 3.0 specification documentation for monitoring and observability.
 */

import Fastify from 'fastify'
import { performance } from 'perf_hooks'
import { getLogger } from '../logging/index.js'
import { getMetricsCollector } from '../metrics/index.js'
import { getConfig } from '../config/index.js'

// Health status constants
const HealthStatus = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded'
}

/**
 * REST API server for financial data ingestion system
 */
export class APIServer {
  constructor (config = null) {
    this.config = config || getConfig()
    this.logger = getLogger('api-server')
    this.metricsCollector = getMetricsCollector(this.config.metrics || {})

    // Storage manager reference (will be injected)
    this.storageManager = null

    // Express app and server
    this.app = null
    this.server = null
    this.startTime = Date.now()

    // Initialize Express app
    this.initExpressApp()
  }

  initExpressApp () {
    this.app = Fastify({
      logger: false // We'll use our own logger
    })

    // Register CORS plugin
    this.app.register(import('@fastify/cors'), {
      origin: true
    })

    // Request logging hook
    this.app.addHook('onRequest', async (request, reply) => {
      request.startTime = performance.now()
    })

    this.app.addHook('onResponse', async (request, reply) => {
      const duration = performance.now() - request.startTime
      this.logger.info('API request completed', null, {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        userAgent: request.headers['user-agent']
      })

      // Track API metrics
      this.metricsCollector.incrementCounter('api_requests_total', 1, {
        method: request.method,
        endpoint: request.routeOptions?.url || request.url,
        status: reply.statusCode.toString()
      })

      this.metricsCollector.recordLatency('api_request', duration * 1_000_000, {
        method: request.method,
        endpoint: request.routeOptions?.url || request.url
      })
    })

    // Register routes
    this.registerRoutes()

    // Error handler
    this.app.setErrorHandler(this.errorHandler.bind(this))
  }

  registerRoutes () {
    // Health check endpoint
    this.app.get('/health', async (request, reply) => {
      try {
        const healthData = await this.getHealthCheck()
        const statusCode = healthData.status === HealthStatus.HEALTHY ? 200 : 503
        reply.code(statusCode).send(healthData)
      } catch (error) {
        this.logger.error('Health check failed', null, { error: error.message })
        reply.code(500).send({
          status: HealthStatus.UNHEALTHY,
          error: 'Health check failed',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (request, reply) => {
      try {
        const metrics = await this.metricsCollector.exportPrometheusMetrics()
        const contentType = this.metricsCollector.getPrometheusContentType()

        reply.header('Content-Type', contentType)
        reply.send(metrics)

        // Track metrics export
        this.metricsCollector.incrementCounter('api_metrics_exports_total', 1, {
          format: 'prometheus'
        })
      } catch (error) {
        this.logger.error('Metrics export failed', null, { error: error.message })
        reply.code(500).send({ error: 'Failed to export metrics' })
      }
    })

    // Performance statistics endpoint
    this.app.get('/stats', async (request, reply) => {
      try {
        const stats = await this.getPerformanceStats()
        reply.send(stats)

        // Track stats request
        this.metricsCollector.incrementCounter('api_stats_requests_total', 1, {
          endpoint: 'performance'
        })
      } catch (error) {
        this.logger.error('Performance stats failed', null, { error: error.message })
        reply.code(500).send({ error: 'Failed to get performance statistics' })
      }
    })

    // Latency statistics endpoint
    this.app.get('/stats/latency', async (request, reply) => {
      try {
        const latencyStats = this.metricsCollector.getLatencyStats()

        reply.send({
          timestamp: Date.now(),
          latencyStats
        })

        // Track latency stats request
        this.metricsCollector.incrementCounter('api_stats_requests_total', 1, {
          endpoint: 'latency'
        })
      } catch (error) {
        this.logger.error('Latency stats failed', null, { error: error.message })
        reply.code(500).send({ error: 'Failed to get latency statistics' })
      }
    })

    // Throughput statistics endpoint
    this.app.get('/stats/throughput', async (request, reply) => {
      try {
        const throughputStats = this.metricsCollector.getThroughputStats()
        const resourceStats = this.metricsCollector.getResourceStats()

        reply.send({
          timestamp: Date.now(),
          throughput: throughputStats,
          resources: resourceStats
        })

        // Track throughput stats request
        this.metricsCollector.incrementCounter('api_stats_requests_total', 1, {
          endpoint: 'throughput'
        })
      } catch (error) {
        this.logger.error('Throughput stats failed', null, { error: error.message })
        reply.code(500).send({ error: 'Failed to get throughput statistics' })
      }
    })

    // Storage statistics endpoint
    this.app.get('/stats/storage', async (request, reply) => {
      try {
        if (!this.storageManager) {
          return reply.code(503).send({ error: 'Storage manager not available' })
        }

        const storageStats = this.storageManager.getStats()

        reply.send({
          timestamp: Date.now(),
          storage: storageStats
        })

        // Track storage stats request
        this.metricsCollector.incrementCounter('api_stats_requests_total', 1, {
          endpoint: 'storage'
        })
      } catch (error) {
        this.logger.error('Storage stats failed', null, { error: error.message })
        reply.code(500).send({ error: 'Failed to get storage statistics' })
      }
    })

    // Configuration endpoint
    this.app.get('/config', async (request, reply) => {
      try {
        const sanitizedConfig = this.getSanitizedConfig()

        reply.send({
          timestamp: Date.now(),
          config: sanitizedConfig
        })

        // Track config request
        this.metricsCollector.incrementCounter('api_config_requests_total', 1, {
          action: 'get'
        })
      } catch (error) {
        this.logger.error('Config retrieval failed', null, { error: error.message })
        reply.code(500).send({ error: 'Failed to get configuration' })
      }
    })

    // Configuration reload endpoint
    this.app.post('/config/reload', async (request, reply) => {
      try {
        // This would typically reload configuration from file/environment
        // For now, just return success

        reply.send({
          timestamp: Date.now(),
          status: 'success',
          message: 'Configuration reload requested'
        })

        // Track config reload
        this.metricsCollector.incrementCounter('api_config_requests_total', 1, {
          action: 'reload'
        })
      } catch (error) {
        this.logger.error('Config reload failed', null, { error: error.message })
        reply.code(500).send({ error: 'Failed to reload configuration' })
      }
    })

    // OpenAPI specification endpoint
    this.app.get('/openapi.json', (request, reply) => {
      const openApiSpec = this.generateOpenAPISpec()
      reply.send(openApiSpec)
    })

    // API documentation endpoint
    this.app.get('/docs', (request, reply) => {
      const html = this.generateSwaggerUI()
      reply.header('Content-Type', 'text/html')
      reply.send(html)
    })
  }

  async getHealthCheck () {
    const startTime = performance.now()

    const healthData = {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      components: {}
    }

    let overallHealthy = true

    // Check metrics collector
    try {
      const metricsStats = this.metricsCollector.getAllStats()
      healthData.components.metrics = {
        status: HealthStatus.HEALTHY,
        activeCorrelationIds: metricsStats.correlationIdsActive || 0,
        latencyStatsCount: Object.keys(metricsStats.latency || {}).length
      }
    } catch (error) {
      healthData.components.metrics = {
        status: HealthStatus.UNHEALTHY,
        error: error.message
      }
      overallHealthy = false
    }

    // Check storage manager
    if (this.storageManager) {
      try {
        const storageHealth = await this.storageManager.healthCheck()
        healthData.components.storage = {
          status: storageHealth.healthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          ...storageHealth
        }

        if (!storageHealth.healthy) {
          overallHealthy = false
        }
      } catch (error) {
        healthData.components.storage = {
          status: HealthStatus.UNHEALTHY,
          error: error.message
        }
        overallHealthy = false
      }
    } else {
      healthData.components.storage = {
        status: HealthStatus.UNHEALTHY,
        error: 'Storage manager not initialized'
      }
      overallHealthy = false
    }

    // Set overall status
    if (!overallHealthy) {
      healthData.status = HealthStatus.UNHEALTHY
    } else if (
      Object.values(healthData.components).some((comp) => comp.status === HealthStatus.DEGRADED)
    ) {
      healthData.status = HealthStatus.DEGRADED
    }

    // Add response time
    healthData.responseTimeMs = performance.now() - startTime

    // Track health check metrics
    this.metricsCollector.incrementCounter('api_health_checks_total', 1, {
      status: healthData.status
    })

    return healthData
  }

  async getPerformanceStats () {
    const stats = this.metricsCollector.getAllStats()

    // Add storage stats if available
    if (this.storageManager) {
      stats.storage = this.storageManager.getStats()
    }

    // Add API-specific stats
    stats.api = {
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
    }

    return stats
  }

  getSanitizedConfig () {
    const config = { ...this.config }

    // Remove sensitive information
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'auth']

    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return obj
      }

      const sanitized = {}
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '***REDACTED***'
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value)
        } else {
          sanitized[key] = value
        }
      }
      return sanitized
    }

    return sanitizeObject(config)
  }

  generateOpenAPISpec () {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Financial Data Ingestion API',
        description: 'High-performance financial market data ingestion system',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@example.com'
        }
      },
      servers: [
        {
          url: 'http://localhost:8080',
          description: 'Development server'
        }
      ],
      tags: [
        {
          name: 'health',
          description: 'System health and status monitoring'
        },
        {
          name: 'metrics',
          description: 'Performance metrics and monitoring'
        },
        {
          name: 'statistics',
          description: 'Real-time performance statistics'
        },
        {
          name: 'configuration',
          description: 'System configuration management'
        }
      ],
      paths: {
        '/health': {
          get: {
            tags: ['health'],
            summary: 'Health Check',
            description: 'Check the health status of the ingestion system',
            responses: {
              200: {
                description: 'System is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string' },
                        uptimeSeconds: { type: 'number' },
                        components: { type: 'object' },
                        responseTimeMs: { type: 'number' }
                      }
                    }
                  }
                }
              },
              503: {
                description: 'System is unhealthy'
              }
            }
          }
        },
        '/metrics': {
          get: {
            tags: ['metrics'],
            summary: 'Prometheus Metrics',
            description: 'Export metrics in Prometheus format',
            responses: {
              200: {
                description: 'Prometheus metrics',
                content: {
                  'text/plain': {
                    schema: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        },
        '/stats': {
          get: {
            tags: ['statistics'],
            summary: 'Performance Statistics',
            description: 'Get real-time performance statistics',
            responses: {
              200: {
                description: 'Performance statistics',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        timestamp: { type: 'number' },
                        latency: { type: 'object' },
                        throughput: { type: 'object' },
                        resources: { type: 'object' },
                        storage: { type: 'object' },
                        api: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/config': {
          get: {
            tags: ['configuration'],
            summary: 'Configuration',
            description: 'Get current system configuration (sanitized)',
            responses: {
              200: {
                description: 'System configuration',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        timestamp: { type: 'number' },
                        config: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  generateSwaggerUI () {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Financial Data Ingestion API</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
      <script>
        SwaggerUIBundle({
          url: '/openapi.json',
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.presets.standalone
          ]
        });
      </script>
    </body>
    </html>
    `
  }

  errorHandler (error, request, reply) {
    this.logger.error('API error', null, {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method
    })

    // Track API errors
    this.metricsCollector.incrementCounter('api_errors_total', 1, {
      method: request.method,
      endpoint: request.routeOptions?.url || request.url,
      errorType: error.constructor.name
    })

    reply.code(500).send({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    })
  }

  setStorageManager (storageManager) {
    this.storageManager = storageManager
  }

  async startServer (host = '0.0.0.0', port = 8080) {
    try {
      await this.app.listen({ host, port })
      this.logger.info(`API server started on ${host}:${port}`)
    } catch (error) {
      this.logger.error('Failed to start API server', null, { error: error.message })
      throw error
    }
  }

  async stopServer () {
    if (this.app) {
      try {
        this.logger.info('Stopping API server')
        await this.app.close()
        this.logger.info('API server stopped')
      } catch (error) {
        this.logger.error('Error stopping API server', null, { error: error.message })
        throw error
      }
    }
  }
}

// Global API server instance
let globalAPIServer = null

/**
 * Get or create global API server instance
 */
export function getAPIServer (config = null) {
  if (!globalAPIServer) {
    globalAPIServer = new APIServer(config)
  }
  return globalAPIServer
}

/**
 * Start the global API server
 */
export async function startAPIServer (host = '0.0.0.0', port = 8080, config = null) {
  const server = getAPIServer(config)
  await server.startServer(host, port)
  return server
}

/**
 * Stop the global API server
 */
export async function stopAPIServer () {
  if (globalAPIServer) {
    await globalAPIServer.stopServer()
    globalAPIServer = null
  }
}

export default {
  APIServer,
  getAPIServer,
  startAPIServer,
  stopAPIServer,
  HealthStatus
}
