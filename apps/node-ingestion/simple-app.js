/**
 * Simple Node.js App for Testing
 * 
 * Basic HTTP server using Node.js built-in modules
 */

import http from 'http'
import url from 'url'

const port = process.env.PORT || 8000
const host = process.env.HOST || '0.0.0.0'

// Helper function to send JSON response
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data, null, 2))
}

// Create HTTP server
const server = http.createServer((req, res) => {
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
        sendJSON(res, {
          service: 'finance-ingestion-nodejs',
          version: '1.0.0',
          status: 'running',
          environment: process.env.NODE_ENV || 'development'
        })
        break

      case '/health':
        sendJSON(res, {
          status: 'healthy',
          service: 'finance-ingestion-nodejs',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        })
        break

      case '/metrics':
        const memUsage = process.memoryUsage()
        sendJSON(res, {
          messages_processed: 0,
          uptime_seconds: Math.floor(process.uptime()),
          memory: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
          },
          status: 'ok'
        })
        break

      case '/config-test':
        sendJSON(res, {
          redis_url: process.env.REDIS_URL,
          postgres_url: process.env.POSTGRES_URL,
          node_env: process.env.NODE_ENV,
          debug: process.env.DEBUG
        })
        break

      default:
        sendJSON(res, { error: 'Not Found', path }, 404)
    }
  } else {
    sendJSON(res, { error: 'Method Not Allowed', method }, 405)
  }
})

// Start server
server.listen(port, host, () => {
  console.log(`🚀 Server running on http://${host}:${port}`)
  console.log(`📊 Health check: http://${host}:${port}/health`)
  console.log(`🔧 Config test: http://${host}:${port}/config-test`)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully')
  server.close(() => {
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully')
  server.close(() => {
    process.exit(0)
  })
})