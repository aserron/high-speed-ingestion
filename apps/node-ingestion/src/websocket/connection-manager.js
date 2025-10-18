/**
 * WebSocket Connection Manager
 *
 * High-performance WebSocket connection manager with health monitoring,
 * exponential backoff reconnection, and comprehensive statistics tracking
 * for the Node.js financial data ingestion system.
 */

// External dependencies
import WebSocket from 'ws'
import { EventEmitter } from 'events'

// Internal modules
import { getConfig } from '../config/index.js'
import { getLogger, setCorrelationId } from '../logging/index.js'
import { jsonUtils, errorUtils } from '../utils/common-utilities.js'
import { ConnectionError, TimeoutError } from '../errors/index.js'

/**
 * WebSocket connection states
 */
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  CLOSING: 'closing',
  CLOSED: 'closed',
  ERROR: 'error'
}

/**
 * WebSocket connection manager with advanced features
 */
export class WebSocketConnectionManager extends EventEmitter {
  constructor (config = null) {
    super()
    this.config = config || getConfig()
    this.logger = getLogger('websocket-manager')

    // Connection state
    this.ws = null
    this.state = ConnectionState.DISCONNECTED
    this.url = this.config.websocket.url

    // Reconnection management
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = this.config.websocket.maxReconnectAttempts
    this.reconnectDelay = this.config.websocket.reconnectDelayMs
    this.reconnectBackoffMultiplier = this.config.websocket.reconnectBackoffMultiplier
    this.reconnectMaxDelay = this.config.websocket.reconnectMaxDelayMs
    this.reconnectJitter = this.config.websocket.reconnectJitterMs
    this.reconnectTimer = null

    // Health monitoring
    this.pingInterval = null
    this.pongTimeout = null
    this.lastPingTime = null
    this.lastPongTime = null
    this.healthCheckInterval = null

    // Statistics tracking
    this.stats = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      lastConnectionTime: null,
      lastDisconnectionTime: null,
      totalUptime: 0,
      currentSessionStart: null,

      // Latency tracking
      pingLatencies: [],
      maxPingLatency: 0,
      minPingLatency: Infinity,
      avgPingLatency: 0,

      // Error tracking
      connectionErrors: 0,
      messageErrors: 0,
      timeoutErrors: 0,

      // Bandwidth tracking
      bandwidthSamples: [],
      currentBandwidth: 0
    }

    // Message queue for buffering during disconnection
    this.messageQueue = []
    this.maxQueueSize = 10000
    this.queueingEnabled = true

    // Event handlers
    this.messageHandlers = new Map()
    this.errorHandlers = new Map()

    // Performance monitoring
    this.performanceMetrics = {
      messageProcessingTimes: [],
      throughputSamples: [],
      lastThroughputCheck: Date.now(),
      messagesInLastSecond: 0
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect () {
    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
      this.logger.warn('Already connected or connecting')
      return
    }

    this.setState(ConnectionState.CONNECTING)
    this.stats.connectionAttempts++

    try {
      this.logger.info('Connecting to WebSocket server', {
        url: this.url,
        attempt: this.reconnectAttempts + 1,
        maxAttempts: this.maxReconnectAttempts
      })

      // Create WebSocket connection
      this.ws = new WebSocket(this.url, {
        protocols: this.config.websocket.protocols,
        headers: this.config.websocket.headers,
        handshakeTimeout: this.config.websocket.connectTimeoutMs,
        maxPayload: this.config.websocket.maxMessageSize,
        perMessageDeflate: this.config.websocket.compressionEnabled
      })

      // Setup event handlers
      this.setupWebSocketHandlers()

      // Wait for connection to be established
      await this.waitForConnection()

      this.onConnectionEstablished()
    } catch (error) {
      this.onConnectionFailed(error)
      throw error
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers () {
    this.ws.on('open', () => {
      this.onOpen()
    })

    this.ws.on('message', (data, isBinary) => {
      this.onMessage(data, isBinary)
    })

    this.ws.on('close', (code, reason) => {
      this.onClose(code, reason)
    })

    this.ws.on('error', (error) => {
      this.onError(error)
    })

    this.ws.on('pong', (data) => {
      this.onPong(data)
    })
  }

  /**
   * Wait for WebSocket connection to be established
   */
  waitForConnection () {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new TimeoutError(
            'WebSocket connection timeout',
            'connect',
            this.config.websocket.connectTimeoutMs
          )
        )
      }, this.config.websocket.connectTimeoutMs)

      const onOpen = () => {
        clearTimeout(timeout)
        this.ws.removeListener('error', onError)
        resolve()
      }

      const onError = (error) => {
        clearTimeout(timeout)
        this.ws.removeListener('open', onOpen)
        reject(
          new ConnectionError(
            'WebSocket connection failed',
            'websocket',
            this.url,
            this.reconnectAttempts,
            { cause: error }
          )
        )
      }

      this.ws.once('open', onOpen)
      this.ws.once('error', onError)
    })
  }

  /**
   * Handle WebSocket open event
   */
  onOpen () {
    this.logger.info('WebSocket connection established', {
      url: this.url,
      readyState: this.ws.readyState
    })

    this.setState(ConnectionState.CONNECTED)
    this.onConnectionEstablished()
  }

  /**
   * Handle successful connection establishment
   */
  onConnectionEstablished () {
    // Reset reconnection state
    this.reconnectAttempts = 0
    this.clearReconnectTimer()

    // Update statistics
    this.stats.successfulConnections++
    this.stats.lastConnectionTime = Date.now()
    this.stats.currentSessionStart = Date.now()

    // Start health monitoring
    this.startHealthMonitoring()

    // Process queued messages
    this.processMessageQueue()

    // Emit connection event
    this.emit('connected', {
      url: this.url,
      attempt: this.stats.connectionAttempts,
      timestamp: Date.now()
    })

    this.logger.info('WebSocket connection ready', {
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts
    })
  }

  /**
   * Handle connection failure
   */
  onConnectionFailed (error) {
    this.stats.failedConnections++

    errorUtils.logErrorWithStats(this.logger, 'WebSocket connection failed', error, this.stats, 'connectionErrors', {
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.maxReconnectAttempts,
      url: this.url
    })

    this.setState(ConnectionState.ERROR)

    // Emit error event
    this.emit('connectionError', {
      error,
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.maxReconnectAttempts,
      timestamp: Date.now()
    })

    // Attempt reconnection if not at max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect()
    } else {
      this.logger.error('Max reconnection attempts reached', {
        maxAttempts: this.maxReconnectAttempts
      })
      this.setState(ConnectionState.CLOSED)
      this.emit('maxReconnectAttemptsReached', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      })
    }
  }

  /**
   * Handle WebSocket message
   */
  onMessage (data, isBinary) {
    const messageStart = process.hrtime.bigint()

    try {
      // Update statistics
      this.stats.messagesReceived++
      this.stats.bytesReceived += data.length
      this.performanceMetrics.messagesInLastSecond++

      // Parse message
      let message
      if (isBinary) {
        message = data
      } else {
        message = jsonUtils.safeParse(data.toString(), data.toString())
      }

      // Set correlation ID for message processing
      const correlationId =
        message.correlationId || `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setCorrelationId(correlationId)

      // Emit message event
      this.emit('message', {
        data: message,
        isBinary,
        size: data.length,
        timestamp: Date.now(),
        correlationId
      })

      // Track processing time
      const processingTime = Number(process.hrtime.bigint() - messageStart) / 1_000_000
      this.performanceMetrics.messageProcessingTimes.push(processingTime)

      // Keep only last 1000 processing times
      if (this.performanceMetrics.messageProcessingTimes.length > 1000) {
        this.performanceMetrics.messageProcessingTimes.shift()
      }

      this.logger.debug('WebSocket message received', {
        size: data.length,
        isBinary,
        processingTimeMs: processingTime,
        correlationId
      })
    } catch (error) {
      errorUtils.handleError(this.logger, 'Error processing WebSocket message', error, {
        stats: this.stats,
        statKey: 'messageErrors',
        eventEmitter: this,
        eventName: 'messageError',
        context: {
          messageSize: data.length,
          isBinary
        }
      })
    }
  }

  /**
   * Handle WebSocket close event
   */
  onClose (code, reason) {
    this.logger.info('WebSocket connection closed', {
      code,
      reason: reason.toString(),
      url: this.url
    })

    // Update statistics
    this.stats.lastDisconnectionTime = Date.now()
    if (this.stats.currentSessionStart) {
      this.stats.totalUptime += Date.now() - this.stats.currentSessionStart
      this.stats.currentSessionStart = null
    }

    // Stop health monitoring
    this.stopHealthMonitoring()

    // Set state and emit event
    this.setState(ConnectionState.DISCONNECTED)
    this.emit('disconnected', {
      code,
      reason: reason.toString(),
      timestamp: Date.now()
    })

    // Attempt reconnection if not intentionally closed
    if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  /**
   * Handle WebSocket error event
   */
  onError (error) {
    this.stats.connectionErrors++

    this.logger.error('WebSocket error', {
      error: error.message,
      code: error.code,
      url: this.url
    })

    this.setState(ConnectionState.ERROR)
    this.emit('error', {
      error,
      timestamp: Date.now()
    })
  }

  /**
   * Handle pong response
   */
  onPong (data) {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout)
      this.pongTimeout = null
    }

    const now = Date.now()
    this.lastPongTime = now

    if (this.lastPingTime) {
      const latency = now - this.lastPingTime
      this.updatePingLatency(latency)

      this.logger.debug('WebSocket pong received', {
        latencyMs: latency,
        data: data.toString()
      })
    }
  }

  /**
   * Update ping latency statistics
   */
  updatePingLatency (latency) {
    this.stats.pingLatencies.push(latency)

    // Keep only last 100 ping latencies
    if (this.stats.pingLatencies.length > 100) {
      this.stats.pingLatencies.shift()
    }

    // Update min/max/avg
    this.stats.maxPingLatency = Math.max(this.stats.maxPingLatency, latency)
    this.stats.minPingLatency = Math.min(this.stats.minPingLatency, latency)
    this.stats.avgPingLatency =
      this.stats.pingLatencies.reduce((a, b) => a + b, 0) / this.stats.pingLatencies.length
  }

  /**
   * Schedule reconnection with exponential backoff and jitter
   */
  scheduleReconnect () {
    if (this.reconnectTimer) {
      return
    }

    this.reconnectAttempts++
    this.stats.reconnectAttempts++

    // Calculate delay with exponential backoff
    let delay = Math.min(
      this.reconnectDelay * Math.pow(this.reconnectBackoffMultiplier, this.reconnectAttempts - 1),
      this.reconnectMaxDelay
    )

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.reconnectJitter
    delay += jitter

    this.logger.info('Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      delayMs: Math.round(delay),
      maxAttempts: this.maxReconnectAttempts
    })

    this.setState(ConnectionState.RECONNECTING)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
      } catch (error) {
        // Error handling is done in connect() method
      }
    }, delay)

    this.emit('reconnectScheduled', {
      attempt: this.reconnectAttempts,
      delayMs: Math.round(delay),
      timestamp: Date.now()
    })
  }

  /**
   * Clear reconnection timer
   */
  clearReconnectTimer () {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * Start health monitoring (ping/pong)
   */
  startHealthMonitoring () {
    this.stopHealthMonitoring()

    // Start ping interval
    this.pingInterval = setInterval(() => {
      this.sendPing()
    }, this.config.websocket.pingIntervalMs)

    // Start performance monitoring
    this.healthCheckInterval = setInterval(() => {
      this.updatePerformanceMetrics()
    }, 1000) // Every second
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring () {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout)
      this.pongTimeout = null
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * Send ping to server
   */
  sendPing () {
    if (this.state !== ConnectionState.CONNECTED) {
      return
    }

    try {
      const pingData = Buffer.from(Date.now().toString())
      this.lastPingTime = Date.now()

      this.ws.ping(pingData)

      // Set pong timeout
      this.pongTimeout = setTimeout(() => {
        this.stats.timeoutErrors++
        this.logger.warn('Pong timeout - connection may be unhealthy', {
          timeoutMs: this.config.websocket.pongTimeoutMs
        })

        this.emit('pongTimeout', {
          timeoutMs: this.config.websocket.pongTimeoutMs,
          timestamp: Date.now()
        })
      }, this.config.websocket.pongTimeoutMs)
    } catch (error) {
      errorUtils.logError(this.logger, 'Failed to send ping', error)
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics () {
    const now = Date.now()

    // Calculate throughput (messages per second)
    const throughput = this.performanceMetrics.messagesInLastSecond
    this.performanceMetrics.throughputSamples.push({
      timestamp: now,
      messagesPerSecond: throughput
    })

    // Keep only last 60 samples (1 minute)
    if (this.performanceMetrics.throughputSamples.length > 60) {
      this.performanceMetrics.throughputSamples.shift()
    }

    // Reset counter
    this.performanceMetrics.messagesInLastSecond = 0
    this.performanceMetrics.lastThroughputCheck = now

    // Calculate bandwidth
    const timeDiff =
      (now -
        (this.stats.bandwidthSamples[this.stats.bandwidthSamples.length - 1]?.timestamp || now)) /
      1000
    if (timeDiff > 0) {
      const bytesDiff =
        this.stats.bytesReceived -
        (this.stats.bandwidthSamples[this.stats.bandwidthSamples.length - 1]?.bytes || 0)
      const bandwidth = bytesDiff / timeDiff // bytes per second

      this.stats.bandwidthSamples.push({
        timestamp: now,
        bytes: this.stats.bytesReceived,
        bandwidth
      })

      this.stats.currentBandwidth = bandwidth

      // Keep only last 60 samples
      if (this.stats.bandwidthSamples.length > 60) {
        this.stats.bandwidthSamples.shift()
      }
    }
  }

  /**
   * Send message through WebSocket
   */
  async send (data, options = {}) {
    if (this.state !== ConnectionState.CONNECTED) {
      if (this.queueingEnabled && this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push({ data, options, timestamp: Date.now() })
        this.logger.debug('Message queued (not connected)', {
          queueSize: this.messageQueue.length
        })
        return
      } else {
        throw new ConnectionError(
          'WebSocket not connected and queuing disabled or queue full',
          'websocket',
          this.url
        )
      }
    }

    try {
      let payload

      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        payload = data
      } else if (typeof data === 'object') {
        payload = jsonUtils.safeStringify(data, String(data))
      } else {
        payload = String(data)
      }

      this.ws.send(payload, options)

      // Update statistics
      this.stats.messagesSent++
      this.stats.bytesSent += payload.length || payload.byteLength || 0

      this.logger.debug('WebSocket message sent', {
        size: payload.length || payload.byteLength || 0,
        type: typeof data
      })
    } catch (error) {
      this.stats.messageErrors++
      throw new ConnectionError(
        `Failed to send WebSocket message: ${error.message}`,
        'websocket',
        this.url,
        null,
        { cause: error }
      )
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue () {
    if (this.messageQueue.length === 0) {
      return
    }

    this.logger.info('Processing queued messages', {
      count: this.messageQueue.length
    })

    const messages = [...this.messageQueue]
    this.messageQueue = []

    for (const { data, options } of messages) {
      try {
        this.send(data, options)
      } catch (error) {
        this.logger.error('Failed to send queued message', {
          error: error.message
        })
      }
    }
  }

  /**
   * Set connection state
   */
  setState (newState) {
    const oldState = this.state
    this.state = newState

    this.logger.debug('WebSocket state changed', {
      from: oldState,
      to: newState
    })

    this.emit('stateChange', {
      from: oldState,
      to: newState,
      timestamp: Date.now()
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect (code = 1000, reason = 'Normal closure') {
    this.logger.info('Disconnecting WebSocket', { code, reason })

    this.setState(ConnectionState.CLOSING)

    // Stop reconnection attempts
    this.clearReconnectTimer()
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection

    // Stop health monitoring
    this.stopHealthMonitoring()

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(code, reason)
    }

    this.setState(ConnectionState.CLOSED)
  }

  /**
   * Get connection statistics
   */
  getStats () {
    const currentTime = Date.now()
    const currentSessionUptime = this.stats.currentSessionStart
      ? currentTime - this.stats.currentSessionStart
      : 0

    return {
      ...this.stats,
      currentSessionUptime,
      totalUptime: this.stats.totalUptime + currentSessionUptime,
      state: this.state,
      url: this.url,
      isConnected: this.state === ConnectionState.CONNECTED,
      queueSize: this.messageQueue.length,

      // Performance metrics
      averageProcessingTime:
        this.performanceMetrics.messageProcessingTimes.length > 0
          ? this.performanceMetrics.messageProcessingTimes.reduce((a, b) => a + b, 0) /
            this.performanceMetrics.messageProcessingTimes.length
          : 0,

      currentThroughput:
        this.performanceMetrics.throughputSamples.length > 0
          ? this.performanceMetrics.throughputSamples[
            this.performanceMetrics.throughputSamples.length - 1
          ].messagesPerSecond
          : 0,

      averageThroughput:
        this.performanceMetrics.throughputSamples.length > 0
          ? this.performanceMetrics.throughputSamples.reduce((a, b) => a + b.messagesPerSecond, 0) /
            this.performanceMetrics.throughputSamples.length
          : 0
    }
  }

  /**
   * Get health status
   */
  getHealth () {
    const stats = this.getStats()
    const now = Date.now()

    return {
      healthy: this.state === ConnectionState.CONNECTED,
      state: this.state,
      uptime: stats.currentSessionUptime,
      lastPingLatency: this.stats.avgPingLatency,
      messagesPerSecond: stats.currentThroughput,
      errorRate: stats.connectionErrors / Math.max(stats.connectionAttempts, 1),
      queueSize: this.messageQueue.length,
      timestamp: now
    }
  }
}

export default WebSocketConnectionManager
