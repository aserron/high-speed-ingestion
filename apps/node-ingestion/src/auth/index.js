/**
 * Authentication and Authorization
 *
 * Production authentication and authorization middleware for the Node.js
 * financial data ingestion system. Supports API keys, JWT tokens, and basic auth.
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import rateLimit from 'express-rate-limit'
import { getLogger } from '../logging/index.js'

/**
 * Authentication context for requests
 */
export class AuthContext {
  constructor() {
    this.authenticated = false
    this.userId = null
    this.authMethod = null
    this.permissions = []
    this.apiKey = null
    this.jwtClaims = null
  }
}

/**
 * Simple in-memory rate limiter
 */
export class RateLimiter {
  constructor(requestsPerMinute = 1000, burstSize = 100) {
    this.requestsPerMinute = requestsPerMinute
    this.burstSize = burstSize
    this.clients = new Map() // clientId -> { requestCount, windowStart, burstTokens }
    this.windowSize = 60 * 1000 // 1 minute in milliseconds
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000)
  }
  
  isAllowed(clientId) {
    const now = Date.now()
    
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, {
        requestCount: 1,
        windowStart: now,
        burstTokens: this.burstSize - 1
      })
      return true
    }
    
    const client = this.clients.get(clientId)
    
    // Reset window if expired
    if (now - client.windowStart >= this.windowSize) {
      client.requestCount = 1
      client.windowStart = now
      client.burstTokens = this.burstSize - 1
      return true
    }
    
    // Check burst tokens first
    if (client.burstTokens > 0) {
      client.requestCount++
      client.burstTokens--
      return true
    }
    
    // Check rate limit
    if (client.requestCount < this.requestsPerMinute) {
      client.requestCount++
      return true
    }
    
    return false
  }
  
  cleanupExpired() {
    const now = Date.now()
    const expiredClients = []
    
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.windowStart >= this.windowSize * 2) {
        expiredClients.push(clientId)
      }
    }
    
    expiredClients.forEach(clientId => this.clients.delete(clientId))
  }
}

/**
 * Authentication manager for production use
 */
export class AuthenticationManager {
  constructor() {
    this.logger = getLogger('auth')
    
    // Load authentication configuration
    try {
      const { getProductionConfig } = await import('../../config/production.js')
      this.prodConfig = getProductionConfig()
      this.authConfig = this.prodConfig.authConfig
    } catch (error) {
      this.logger.warn('Production config not available, using default settings')
      this.authConfig = null
    }
    
    // Initialize rate limiter
    if (this.authConfig && this.authConfig.rateLimitEnabled) {
      this.rateLimiter = new RateLimiter(
        this.authConfig.rateLimitRequestsPerMinute,
        this.authConfig.rateLimitBurstSize
      )
    } else {
      this.rateLimiter = null
    }
  }
  
  getClientId(req) {
    // Try to get client ID from various sources
    let clientId = req.headers['x-client-id']
    if (clientId) {
      return clientId
    }
    
    // Use API key if available
    const apiKey = this.extractApiKey(req)
    if (apiKey) {
      return `api_key:${apiKey.substring(0, 8)}`
    }
    
    // Use IP address as fallback
    const forwardedFor = req.headers['x-forwarded-for']
    if (forwardedFor) {
      return `ip:${forwardedFor.split(',')[0].trim()}`
    }
    
    return `ip:${req.ip || req.connection.remoteAddress}`
  }
  
  extractApiKey(req) {
    if (!this.authConfig || !this.authConfig.apiKeyEnabled) {
      return null
    }
    
    // Check header
    const apiKey = req.headers[this.authConfig.apiKeyHeader.toLowerCase()]
    if (apiKey) {
      return apiKey
    }
    
    // Check query parameter
    if (req.query && req.query.api_key) {
      return req.query.api_key
    }
    
    return null
  }
  
  validateApiKey(apiKey) {
    if (!this.authConfig || !this.authConfig.apiKeyEnabled) {
      return false
    }
    
    return this.authConfig.apiKeys.includes(apiKey)
  }
  
  extractJwtToken(req) {
    if (!this.authConfig || !this.authConfig.jwtEnabled) {
      return null
    }
    
    // Check Authorization header
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7) // Remove 'Bearer ' prefix
    }
    
    // Check cookie
    if (req.cookies && req.cookies.jwt_token) {
      return req.cookies.jwt_token
    }
    
    return null
  }
  
  validateJwtToken(token) {
    if (!this.authConfig || !this.authConfig.jwtEnabled) {
      return null
    }
    
    try {
      const claims = jwt.verify(token, this.authConfig.jwtSecretKey, {
        algorithms: [this.authConfig.jwtAlgorithm],
        issuer: this.authConfig.jwtIssuer
      })
      
      return claims
    } catch (error) {
      this.logger.warn(`Invalid JWT token: ${error.message}`)
      return null
    }
  }
  
  extractBasicAuth(req) {
    if (!this.authConfig || !this.authConfig.basicAuthEnabled) {
      return null
    }
    
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return null
    }
    
    try {
      const encodedCredentials = authHeader.substring(6) // Remove 'Basic ' prefix
      const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8')
      const [username, password] = decodedCredentials.split(':', 2)
      return { username, password }
    } catch (error) {
      this.logger.warn(`Invalid basic auth header: ${error.message}`)
      return null
    }
  }
  
  async validateBasicAuth(username, password) {
    if (!this.authConfig || !this.authConfig.basicAuthEnabled) {
      return false
    }
    
    // Check username
    if (username !== this.authConfig.adminUsername) {
      return false
    }
    
    // Check password hash
    if (!this.authConfig.adminPasswordHash) {
      return false
    }
    
    try {
      return await bcrypt.compare(password, this.authConfig.adminPasswordHash)
    } catch (error) {
      this.logger.warn(`Error validating password: ${error.message}`)
      return false
    }
  }
  
  async authenticateRequest(req) {
    const authContext = new AuthContext()
    
    // Check rate limiting first
    if (this.rateLimiter) {
      const clientId = this.getClientId(req)
      if (!this.rateLimiter.isAllowed(clientId)) {
        this.logger.warn(`Rate limit exceeded for client: ${clientId}`)
        const error = new Error('Rate limit exceeded')
        error.status = 429
        throw error
      }
    }
    
    // Try API key authentication
    const apiKey = this.extractApiKey(req)
    if (apiKey && this.validateApiKey(apiKey)) {
      authContext.authenticated = true
      authContext.authMethod = 'api_key'
      authContext.apiKey = apiKey
      authContext.userId = `api_key:${apiKey.substring(0, 8)}`
      authContext.permissions = ['read', 'write']
      return authContext
    }
    
    // Try JWT authentication
    const jwtToken = this.extractJwtToken(req)
    if (jwtToken) {
      const jwtClaims = this.validateJwtToken(jwtToken)
      if (jwtClaims) {
        authContext.authenticated = true
        authContext.authMethod = 'jwt'
        authContext.jwtClaims = jwtClaims
        authContext.userId = jwtClaims.sub || 'unknown'
        authContext.permissions = jwtClaims.permissions || []
        return authContext
      }
    }
    
    // Try basic authentication
    const basicAuth = this.extractBasicAuth(req)
    if (basicAuth) {
      const isValid = await this.validateBasicAuth(basicAuth.username, basicAuth.password)
      if (isValid) {
        authContext.authenticated = true
        authContext.authMethod = 'basic'
        authContext.userId = basicAuth.username
        authContext.permissions = ['admin', 'read', 'write']
        return authContext
      }
    }
    
    // No valid authentication found
    return authContext
  }
}

// Global authentication manager instance
let authManager = null

/**
 * Get global authentication manager instance
 */
export function getAuthManager() {
  if (!authManager) {
    authManager = new AuthenticationManager()
  }
  return authManager
}

/**
 * Middleware to require authentication
 */
export function requireAuth(permissions = []) {
  return async (req, res, next) => {
    try {
      const authMgr = getAuthManager()
      const authContext = await authMgr.authenticateRequest(req)
      
      if (!authContext.authenticated) {
        return res.status(401)
          .set('WWW-Authenticate', 'Bearer, Basic')
          .json({ error: 'Authentication required' })
      }
      
      // Check permissions if specified
      if (permissions.length > 0) {
        const userPermissions = authContext.permissions || []
        const hasPermission = permissions.some(perm => userPermissions.includes(perm))
        
        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' })
        }
      }
      
      // Add auth context to request
      req.authContext = authContext
      
      next()
    } catch (error) {
      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded' })
      }
      
      authMgr.logger.error(`Authentication error: ${error.message}`)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

/**
 * Middleware to require admin permissions
 */
export function requireAdmin() {
  return requireAuth(['admin'])
}

/**
 * Authentication middleware for Express
 */
export function authMiddleware() {
  return async (req, res, next) => {
    // Skip authentication for health check and metrics endpoints
    if (['/health', '/metrics', '/ready'].includes(req.path)) {
      return next()
    }
    
    // Skip authentication if not configured
    const authMgr = getAuthManager()
    if (!authMgr.authConfig) {
      return next()
    }
    
    try {
      // Authenticate request
      const authContext = await authMgr.authenticateRequest(req)
      req.authContext = authContext
      
      next()
    } catch (error) {
      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded' })
      }
      
      authMgr.logger.error(`Authentication middleware error: ${error.message}`)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

/**
 * Generate JWT token for user
 */
export function generateJwtToken(userId, permissions = [], expirationHours = 24) {
  const authMgr = getAuthManager()
  
  if (!authMgr.authConfig || !authMgr.authConfig.jwtEnabled) {
    throw new Error('JWT authentication not enabled')
  }
  
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: authMgr.authConfig.jwtIssuer,
    sub: userId,
    iat: now,
    exp: now + (expirationHours * 3600),
    permissions: permissions
  }
  
  return jwt.sign(claims, authMgr.authConfig.jwtSecretKey, {
    algorithm: authMgr.authConfig.jwtAlgorithm
  })
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password) {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Create Express rate limiter middleware
 */
export function createRateLimiter(options = {}) {
  const authMgr = getAuthManager()
  
  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute
    max: authMgr.authConfig?.rateLimitRequestsPerMinute || 1000,
    message: { error: 'Rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => authMgr.getClientId(req)
  }
  
  return rateLimit({ ...defaultOptions, ...options })
}

// CLI for password hashing
if (import.meta.url === `file://${process.argv[1]}`) {
  const password = process.argv[2]
  
  if (password) {
    hashPassword(password).then(hash => {
      console.log(`Password hash: ${hash}`)
    }).catch(error => {
      console.error(`Error hashing password: ${error.message}`)
    })
  } else {
    console.log('Usage: node auth/index.js <password>')
    console.log('Generates bcrypt hash for the given password')
  }
}