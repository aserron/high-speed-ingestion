/**
 * WebSocket Client
 *
 * High-level WebSocket client wrapper that provides a simple interface
 * for connecting to financial market data feeds with automatic reconnection,
 * message handling, and performance monitoring.
 */

import { EventEmitter } from 'events'
import { WebSocketConnectionManager, ConnectionState } from './connection-manager.js'
import { getConfig } from '../config/index.js'
import { getLogger } from '../logging/index.js'
import { ValidationError, ConnectionError } from '../errors/index.js'
import { handleJsonParseError } from '../utils/error-handlers.js'

/**
 * WebSocket client for financial market data
 */
export class WebSocketClient extends EventEmitter {
  constructor (url = null, options = {}) {
    super()

    this.config = getConfig()
    this.logger = getLogger('websocket-client')

    // Configuration
    this.url = url || this.config.websocket.url
    this.options = {
      autoConnect: true,
      autoReconnect: true,
      messageFormat: 'json', // 'json', 'binary', 'text'
      ...options
    }

    // Connection manager
    this.connectionManager = new WebSocketConnectionManager({
      ...this.config,
      websocket: {
        ...this.config.websocket,
        url: this.url
      }
    })

    // Message handlers
    this.messageHandlers = new Map()
    this.subscriptions = new Set()

    // State
    this.isInitialized = false

    this.setupConnectionManagerHandlers()
  }

  /**
   * Setup connection manager event handlers
   */
  setupConnectionManagerHandlers () {
    this.connectionManager.on('connected', (event) => {
      this.logger.info('WebSocket client connected', {
        url: this.url,
        attempt: event.attempt
      })

      // Re-establish subscriptions
      this.reestablishSubscriptions()

      this.emit('connected', event)
    })

    this.connectionManager.on('disconnected', (event) => {
      this.logger.info('WebSocket client disconnected', {
        code: event.code,
        reason: event.reason
      })

      this.emit('disconnected', event)
    })

    this.connectionManager.on('message', (event) => {
      this.handleMessage(event)
    })

    this.connectionManager.on('error', (event) => {
      this.logger.error('WebSocket client error', {
        error: event.error.message
      })

      this.emit('error', event)
    })

    this.connectionManager.on('reconnectScheduled', (event) => {
      this.logger.info('WebSocket reconnection scheduled', {
        attempt: event.attempt,
        delayMs: event.delayMs
      })

      this.emit('reconnecting', event)
    })

    this.connectionManager.on('stateChange', (event) => {
      this.emit('stateChange', event)
    })
  }

  /**
   * Initialize the WebSocket client
   */
  async initialize () {
    if (this.isInitialized) {
      this.logger.warn('WebSocket client already initialized')
      return
    }

    this.logger.info('Initializing WebSocket client', {
      url: this.url,
      autoConnect: this.options.autoConnect
    })

    this.isInitialized = true

    if (this.options.autoConnect) {
      await this.connect()
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect () {
    if (!this.isInitialized) {
      await this.initialize()
    }

    return await this.connectionManager.connect()
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect () {
    this.logger.info('Disconnecting WebSocket client')

    // Clear subscriptions
    this.subscriptions.clear()

    await this.connectionManager.disconnect()
  }

  /**
   * Handle incoming messages
   */
  handleMessage (event) {
    try {
      const { data, isBinary, correlationId } = event

      // Parse message based on format
      let parsedMessage = data
      if (!isBinary && this.options.messageFormat === 'json') {
        if (typeof data === 'string') {
          parsedMessage = handleJsonParseError(data, data, this.logger)
        }
      }

      // Determine message type
      const messageType = this.getMessageType(parsedMessage)

      // Emit specific message type event
      if (messageType) {
        this.emit(messageType, {
          data: parsedMessage,
          originalData: data,
          isBinary,
          correlationId,
          timestamp: event.timestamp
        })
      }

      // Emit general message event
      this.emit('message', {
        data: parsedMessage,
        originalData: data,
        isBinary,
        messageType,
        correlationId,
        timestamp: event.timestamp
      })

      // Call registered message handlers
      this.callMessageHandlers(messageType, parsedMessage, event)
    } catch (error) {
      this.logger.error('Error handling WebSocket message', {
        error: error.message,
        correlationId: event.correlationId
      })

      this.emit('messageError', {
        error,
        originalEvent: event
      })
    }
  }

  /**
   * Determine message type from message content
   */
  getMessageType (message) {
    if (typeof message === 'object' && message !== null) {
      // Common financial data message types
      if (message.type) return message.type
      if (message.msgType) return message.msgType
      if (message.messageType) return message.messageType

      // Infer from content
      if (message.symbol && message.price) return 'tick'
      if (message.symbol && message.bid && message.ask) return 'quote'
      if (message.symbol && message.volume) return 'trade'
      if (message.symbols && Array.isArray(message.symbols)) return 'subscription'
      if (message.status) return 'status'
      if (message.error) return 'error'
    }

    return 'unknown'
  }

  /**
   * Call registered message handlers
   */
  callMessageHandlers (messageType, message, originalEvent) {
    // Call handlers for specific message type
    const typeHandlers = this.messageHandlers.get(messageType) || []
    for (const handler of typeHandlers) {
      try {
        handler(message, originalEvent)
      } catch (error) {
        this.logger.error('Message handler error', {
          messageType,
          error: error.message
        })
      }
    }

    // Call handlers for all messages
    const allHandlers = this.messageHandlers.get('*') || []
    for (const handler of allHandlers) {
      try {
        handler(message, originalEvent)
      } catch (error) {
        this.logger.error('Global message handler error', {
          error: error.message
        })
      }
    }
  }

  /**
   * Send message to WebSocket server
   */
  async send (message, options = {}) {
    let payload = message

    // Format message based on configuration
    if (this.options.messageFormat === 'json' && typeof message === 'object') {
      payload = JSON.stringify(message)
    }

    return await this.connectionManager.send(payload, options)
  }

  /**
   * Subscribe to market data symbols
   */
  async subscribe (symbols, messageType = 'tick') {
    if (!Array.isArray(symbols)) {
      symbols = [symbols]
    }

    const subscriptionMessage = {
      action: 'subscribe',
      symbols,
      messageType,
      timestamp: Date.now()
    }

    await this.send(subscriptionMessage)

    // Track subscriptions for reconnection
    for (const symbol of symbols) {
      this.subscriptions.add(`${messageType}:${symbol}`)
    }

    this.logger.info('Subscribed to symbols', {
      symbols,
      messageType,
      totalSubscriptions: this.subscriptions.size
    })
  }

  /**
   * Unsubscribe from market data symbols
   */
  async unsubscribe (symbols, messageType = 'tick') {
    if (!Array.isArray(symbols)) {
      symbols = [symbols]
    }

    const unsubscriptionMessage = {
      action: 'unsubscribe',
      symbols,
      messageType,
      timestamp: Date.now()
    }

    await this.send(unsubscriptionMessage)

    // Remove from tracked subscriptions
    for (const symbol of symbols) {
      this.subscriptions.delete(`${messageType}:${symbol}`)
    }

    this.logger.info('Unsubscribed from symbols', {
      symbols,
      messageType,
      totalSubscriptions: this.subscriptions.size
    })
  }

  /**
   * Re-establish subscriptions after reconnection
   */
  async reestablishSubscriptions () {
    if (this.subscriptions.size === 0) {
      return
    }

    this.logger.info('Re-establishing subscriptions', {
      count: this.subscriptions.size
    })

    // Group subscriptions by message type
    const subscriptionGroups = new Map()

    for (const subscription of this.subscriptions) {
      const [messageType, symbol] = subscription.split(':')

      if (!subscriptionGroups.has(messageType)) {
        subscriptionGroups.set(messageType, [])
      }

      subscriptionGroups.get(messageType).push(symbol)
    }

    // Re-subscribe for each message type
    for (const [messageType, symbols] of subscriptionGroups) {
      try {
        await this.subscribe(symbols, messageType)
      } catch (error) {
        this.logger.error('Failed to re-establish subscription', {
          messageType,
          symbols,
          error: error.message
        })
      }
    }
  }

  /**
   * Register message handler
   */
  onMessage (messageType, handler) {
    if (typeof handler !== 'function') {
      throw new ValidationError('Message handler must be a function', 'handler', handler)
    }

    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, [])
    }

    this.messageHandlers.get(messageType).push(handler)

    this.logger.debug('Message handler registered', {
      messageType,
      handlerCount: this.messageHandlers.get(messageType).length
    })
  }

  /**
   * Remove message handler
   */
  offMessage (messageType, handler) {
    const handlers = this.messageHandlers.get(messageType)
    if (!handlers) {
      return false
    }

    const index = handlers.indexOf(handler)
    if (index === -1) {
      return false
    }

    handlers.splice(index, 1)

    if (handlers.length === 0) {
      this.messageHandlers.delete(messageType)
    }

    return true
  }

  /**
   * Get connection state
   */
  getState () {
    return this.connectionManager.state
  }

  /**
   * Check if connected
   */
  isConnected () {
    return this.connectionManager.state === ConnectionState.CONNECTED
  }

  /**
   * Get connection statistics
   */
  getStats () {
    return {
      ...this.connectionManager.getStats(),
      subscriptions: Array.from(this.subscriptions),
      messageHandlers: Object.fromEntries(
        Array.from(this.messageHandlers.entries()).map(([type, handlers]) => [
          type,
          handlers.length
        ])
      )
    }
  }

  /**
   * Get health status
   */
  getHealth () {
    return this.connectionManager.getHealth()
  }

  /**
   * Wait for connection to be established
   */
  waitForConnection (timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        this.removeListener('connected', onConnected)
        this.removeListener('error', onError)
        reject(new ConnectionError('Connection timeout', 'websocket', this.url))
      }, timeoutMs)

      const onConnected = () => {
        clearTimeout(timeout)
        this.removeListener('error', onError)
        resolve()
      }

      const onError = (event) => {
        clearTimeout(timeout)
        this.removeListener('connected', onConnected)
        reject(event.error)
      }

      this.once('connected', onConnected)
      this.once('error', onError)
    })
  }
}

export default WebSocketClient
