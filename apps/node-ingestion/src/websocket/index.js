/**
 * WebSocket Module
 *
 * Main entry point for WebSocket functionality providing connection management,
 * client interface, and utilities for financial market data ingestion.
 */

// Core WebSocket components
// Utilities and helpers
import { getConfig } from '../config/index.js'
import { getLogger } from '../logging/index.js'
import { WebSocketClient } from './client.js'

export { WebSocketConnectionManager, ConnectionState } from './connection-manager.js'
export { WebSocketClient } from './client.js'

/**
 * WebSocket service manager for coordinating WebSocket connections
 */
export class WebSocketService {
  constructor (config = null) {
    this.config = config || getConfig()
    this.logger = getLogger('websocket-service')
    this.clients = new Map()
    this.isInitialized = false
  }

  /**
   * Initialize WebSocket service
   */
  async initialize () {
    if (this.isInitialized) {
      this.logger.warn('WebSocket service already initialized')
      return
    }

    this.logger.info('Initializing WebSocket service')
    this.isInitialized = true
  }

  /**
   * Create a new WebSocket client
   */
  createClient (name, url = null, options = {}) {
    if (this.clients.has(name)) {
      throw new Error(`WebSocket client '${name}' already exists`)
    }

    const client = new WebSocketClient(url, options)
    this.clients.set(name, client)

    this.logger.info('WebSocket client created', {
      name,
      url: url || this.config.websocket.url
    })

    return client
  }

  /**
   * Get WebSocket client by name
   */
  getClient (name) {
    const client = this.clients.get(name)
    if (!client) {
      throw new Error(`WebSocket client '${name}' not found`)
    }
    return client
  }

  /**
   * Remove WebSocket client
   */
  async removeClient (name) {
    const client = this.clients.get(name)
    if (!client) {
      return false
    }

    await client.disconnect()
    this.clients.delete(name)

    this.logger.info('WebSocket client removed', { name })
    return true
  }

  /**
   * Get all client names
   */
  getClientNames () {
    return Array.from(this.clients.keys())
  }

  /**
   * Get statistics for all clients
   */
  getStats () {
    const stats = {
      totalClients: this.clients.size,
      clients: {}
    }

    for (const [name, client] of this.clients) {
      stats.clients[name] = client.getStats()
    }

    return stats
  }

  /**
   * Get health status for all clients
   */
  getHealth () {
    const health = {
      healthy: true,
      clients: {}
    }

    for (const [name, client] of this.clients) {
      const clientHealth = client.getHealth()
      health.clients[name] = clientHealth

      if (!clientHealth.healthy) {
        health.healthy = false
      }
    }

    return health
  }

  /**
   * Close all WebSocket connections
   */
  async close () {
    this.logger.info('Closing WebSocket service')

    const closePromises = []
    for (const [name, client] of this.clients) {
      closePromises.push(
        client.disconnect().catch(error => {
          this.logger.error(`Error closing client ${name}`, {
            error: error.message
          })
        })
      )
    }

    await Promise.all(closePromises)
    this.clients.clear()
    this.isInitialized = false

    this.logger.info('WebSocket service closed')
  }
}

// Global WebSocket service instance
let webSocketService = null

/**
 * Get the global WebSocket service instance
 */
export function getWebSocketService () {
  if (!webSocketService) {
    webSocketService = new WebSocketService()
  }
  return webSocketService
}

/**
 * Initialize global WebSocket service
 */
export async function initializeWebSocket (config = null) {
  const service = new WebSocketService(config)
  await service.initialize()
  webSocketService = service
  return service
}

/**
 * Create a market data WebSocket client with default configuration
 */
export async function createMarketDataClient (symbols = [], options = {}) {
  const service = getWebSocketService()

  if (!service.isInitialized) {
    await service.initialize()
  }

  const clientName = options.name || 'market-data'
  const client = service.createClient(clientName, null, {
    autoConnect: true,
    autoReconnect: true,
    messageFormat: 'json',
    ...options
  })

  // Initialize and connect
  await client.initialize()

  // Subscribe to symbols if provided
  if (symbols.length > 0) {
    await client.waitForConnection()
    await client.subscribe(symbols)
  }

  return client
}

/**
 * Utility function to create a simple WebSocket client
 */
export function createSimpleClient (url, options = {}) {
  return new WebSocketClient(url, options)
}

export default {
  getWebSocketService,
  initializeWebSocket,
  createMarketDataClient,
  createSimpleClient
}
