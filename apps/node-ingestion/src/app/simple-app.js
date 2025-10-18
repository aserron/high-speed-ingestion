/**
 * Simple HTTP Server Application
 *
 * Provides basic HTTP server functionality for simple mode operation
 * with health checks, CORS support, and minimal configuration.
 */

// External dependencies
import http from 'http'

// Internal modules
import { envUtils } from '../utils/common-utilities.js'

/**
 * Simple HTTP server for basic functionality
 */
export class SimpleApp {
  constructor () {
    this.server = null
    this.port = envUtils.getNumber('PORT', 8000)
    this.host = envUtils.getString('HOST', '0.0.0.0')
  }

  sendJSON (res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data, null, 2))
  }

  proxyPrometheus (res) {
    const proxyReq = http.request(
      {
        hostname: 'localhost',
        port: 9090,
        path: '/-/healthy',
        method: 'GET'
      },
      (proxyRes) => {
        let data = ''
        proxyRes.on('data', (chunk) => (data += chunk))
        proxyRes.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end(data)
        })
      }
    )
    proxyReq.on('error', () => {
      this.sendJSON(res, { error: 'Prometheus not available' }, 503)
    })
    proxyReq.end()
  }

  async start () {
    this.server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`)
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
              environment: envUtils.getEnvironment()
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
              env: envUtils.getEnvironment()
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

  async stop () {
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

export default SimpleApp
