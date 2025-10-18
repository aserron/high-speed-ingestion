/**
 * TLS/SSL Utilities
 *
 * Production TLS/SSL configuration and utilities for secure WebSocket connections
 * and HTTPS endpoints in the Node.js financial data ingestion system.
 */

// External dependencies
import fs, { promises as fsPromises } from 'fs'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { WebSocket } from 'ws'

// Internal modules
import { getLogger } from '../logging/index.js'
import { createSingleton } from '../utils/common-utilities.js'

/**
 * TLS certificate information
 */
export class TLSCertificateInfo {
  constructor (cert) {
    this.subject = cert.subject
    this.issuer = cert.issuer
    this.serialNumber = cert.serialNumber
    this.notBefore = cert.valid_from
    this.notAfter = cert.valid_to
    this.fingerprint = cert.fingerprint
    this.isValid = this.checkValidity()
    this.daysUntilExpiry = this.calculateDaysUntilExpiry()
  }

  checkValidity () {
    const now = new Date()
    const notBefore = new Date(this.notBefore)
    const notAfter = new Date(this.notAfter)
    return now >= notBefore && now <= notAfter
  }

  calculateDaysUntilExpiry () {
    const now = new Date()
    const notAfter = new Date(this.notAfter)
    const diffTime = notAfter - now
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
}

/**
 * TLS/SSL configuration manager
 */
export class TLSManager {
  constructor () {
    this.logger = getLogger('tls')
    this.prodConfig = null
    this.tlsConfig = null
    this.initialized = false
  }

  async initialize () {
    if (this.initialized) return

    // Load TLS configuration
    try {
      const { getProductionConfig } = await import('../../config/production.js')
      this.prodConfig = getProductionConfig()
      this.tlsConfig = this.prodConfig.tlsConfig
    } catch (error) {
      this.logger.warn('Production config not available, TLS disabled')
      this.tlsConfig = null
    }

    this.initialized = true
  }

  /**
   * Create HTTPS server options
   */
  createHttpsOptions () {
    if (!this.tlsConfig || !this.tlsConfig.tlsEnabled) {
      return null
    }

    try {
      return this.tlsConfig.createHttpsOptions()
    } catch (error) {
      this.logger.error(`Failed to create HTTPS options: ${error.message}`)
      return null
    }
  }

  /**
   * Create secure WebSocket server options
   */
  createSecureWebSocketOptions () {
    const httpsOptions = this.createHttpsOptions()
    if (!httpsOptions) {
      return null
    }

    return {
      ...httpsOptions,
      // WebSocket-specific options
      perMessageDeflate: false,
      clientTracking: true,
      maxPayload: 1024 * 1024 // 1MB
    }
  }

  /**
   * Get certificate information (async)
   */
  async getCertificateInfo (certFile) {
    try {
      // Use fs.promises.access instead of existsSync
      await fsPromises.access(certFile, fs.constants.F_OK)

      const certData = await fsPromises.readFile(certFile, 'utf8')
      const cert = new crypto.X509Certificate(certData)

      return new TLSCertificateInfo({
        subject: cert.subject,
        issuer: cert.issuer,
        serialNumber: cert.serialNumber,
        valid_from: cert.validFrom,
        valid_to: cert.validTo,
        fingerprint: cert.fingerprint256
      })
    } catch (error) {
      this.logger.error(`Failed to read certificate info: ${error.message}`)
      return null
    }
  }

  /**
   * Validate TLS configuration (async)
   */
  async validateTlsConfiguration () {
    if (!this.tlsConfig) {
      return {
        enabled: false,
        status: 'disabled',
        message: 'TLS configuration not available'
      }
    }

    if (!this.tlsConfig.tlsEnabled) {
      return {
        enabled: false,
        status: 'disabled',
        message: 'TLS explicitly disabled'
      }
    }

    const issues = []
    const warnings = []

    // Check certificate files using modern async approach
    try {
      await fsPromises.access(this.tlsConfig.tlsCertFile, fs.constants.F_OK)
      const certInfo = await this.getCertificateInfo(this.tlsConfig.tlsCertFile)
      if (certInfo) {
        if (!certInfo.isValid) {
          issues.push('Certificate is not valid (expired or not yet valid)')
        } else if (certInfo.daysUntilExpiry < 30) {
          warnings.push(`Certificate expires in ${certInfo.daysUntilExpiry} days`)
        }
      }
    } catch (error) {
      issues.push(`Certificate file not found: ${this.tlsConfig.tlsCertFile}`)
    }

    try {
      await fsPromises.access(this.tlsConfig.tlsKeyFile, fs.constants.F_OK)
    } catch (error) {
      issues.push(`Private key file not found: ${this.tlsConfig.tlsKeyFile}`)
    }

    // Check CA file if specified
    if (this.tlsConfig.tlsCaFile) {
      try {
        await fsPromises.access(this.tlsConfig.tlsCaFile, fs.constants.F_OK)
      } catch (error) {
        issues.push(`CA file not found: ${this.tlsConfig.tlsCaFile}`)
      }
    }

    // Try to create HTTPS options
    try {
      const options = this.createHttpsOptions()
      if (!options) {
        issues.push('Failed to create HTTPS options')
      }
    } catch (error) {
      issues.push(`HTTPS options creation failed: ${error.message}`)
    }

    // Determine status
    let status, message
    if (issues.length > 0) {
      status = 'error'
      message = `TLS configuration has ${issues.length} error(s)`
    } else if (warnings.length > 0) {
      status = 'warning'
      message = `TLS configuration has ${warnings.length} warning(s)`
    } else {
      status = 'ok'
      message = 'TLS configuration is valid'
    }

    return {
      enabled: true,
      status,
      message,
      issues,
      warnings,
      certificateInfo: await this.getCertificateInfo(this.tlsConfig.tlsCertFile)
    }
  }

  /**
   * Create secure WebSocket connection
   */
  async createSecureWebSocketConnection (url, options = {}) {
    try {
      // Configure TLS options for WebSocket client
      const wsOptions = { ...options }

      if (url.startsWith('wss://') && this.tlsConfig) {
        // Add TLS configuration
        if (this.tlsConfig.websocketTlsEnabled) {
          wsOptions.rejectUnauthorized = this.tlsConfig.websocketVerifySsl

          // Add CA certificates if specified using modern async approach
          if (this.tlsConfig.tlsCaFile) {
            try {
              // Optimize by combining access check and file read in parallel
              await fsPromises.access(this.tlsConfig.tlsCaFile, fs.constants.F_OK)
              wsOptions.ca = await fsPromises.readFile(this.tlsConfig.tlsCaFile)
            } catch (error) {
              this.logger.warn(`CA file not accessible: ${this.tlsConfig.tlsCaFile}`)
            }
          }
        }
      }

      // Add security headers
      wsOptions.headers = {
        'User-Agent': 'FinanceIngestion/1.0',
        'X-Client-Version': '1.0.0',
        ...wsOptions.headers
      }

      return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, wsOptions)

        ws.on('open', () => resolve(ws))
        ws.on('error', (error) => {
          this.logger.error(`WebSocket connection failed: ${error.message}`)
          reject(error)
        })
      })
    } catch (error) {
      this.logger.error(`Failed to create secure WebSocket connection: ${error.message}`)
      throw error
    }
  }

  /**
   * Create secure HTTPS agent (async)
   */
  async createSecureHttpsAgent (options = {}) {
    if (!this.tlsConfig || !this.tlsConfig.websocketTlsEnabled) {
      return new https.Agent(options)
    }

    const agentOptions = {
      ...options,
      rejectUnauthorized: this.tlsConfig.websocketVerifySsl
    }

    // Add CA certificates if specified using modern async approach
    if (this.tlsConfig.tlsCaFile) {
      try {
        // Optimize by combining access check and file read in parallel
        await fsPromises.access(this.tlsConfig.tlsCaFile, fs.constants.F_OK)
        agentOptions.ca = await fsPromises.readFile(this.tlsConfig.tlsCaFile)
      } catch (error) {
        this.logger.warn(`CA file not accessible: ${this.tlsConfig.tlsCaFile}`)
      }
    }

    return new https.Agent(agentOptions)
  }
}

// Global TLS manager instance
const getTlsManagerSingleton = createSingleton(() => new TLSManager())

/**
 * Get global TLS manager instance
 */
export function getTlsManager () {
  return getTlsManagerSingleton()
}

/**
 * Security middleware for Express
 */
export function securityMiddleware () {
  const tlsMgr = getTlsManager()

  return (req, res, next) => {
    // Add security headers
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'",
      'X-Permitted-Cross-Domain-Policies': 'none'
    }

    // Add HSTS header for HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      if (tlsMgr.tlsConfig && tlsMgr.tlsConfig.hstsEnabled) {
        let hstsValue = `max-age=${tlsMgr.tlsConfig.hstsMaxAge}`
        if (tlsMgr.tlsConfig.hstsIncludeSubdomains) {
          hstsValue += '; includeSubDomains'
        }
        securityHeaders['Strict-Transport-Security'] = hstsValue
      }
    }

    // Set headers
    Object.entries(securityHeaders).forEach(([header, value]) => {
      res.setHeader(header, value)
    })

    next()
  }
}

/**
 * Generate self-signed certificate for development/testing
 */
export function generateSelfSignedCertificate (
  certFile,
  keyFile,
  commonName = 'localhost',
  daysValid = 365
) {
  try {
    // Generate private key
    execSync(`openssl genrsa -out ${keyFile} 2048`, { stdio: 'inherit' })

    // Generate certificate
    const subj = `/C=US/ST=CA/L=San Francisco/O=Finance Ingestion/CN=${commonName}`
    execSync(
      `openssl req -new -x509 -key ${keyFile} -out ${certFile} -days ${daysValid} -subj "${subj}"`,
      { stdio: 'inherit' }
    )

    // Set appropriate permissions
    fs.chmodSync(keyFile, 0o600)
    fs.chmodSync(certFile, 0o644)

    return true
  } catch (error) {
    console.error(`Failed to generate self-signed certificate: ${error.message}`)
    return false
  }
}

/**
 * Create secure HTTPS server
 */
export function createSecureServer (app, options = {}) {
  const tlsMgr = getTlsManager()
  const httpsOptions = tlsMgr.createHttpsOptions()

  if (!httpsOptions) {
    // Fallback to HTTP server
    return http.createServer(app)
  }

  return https.createServer({ ...httpsOptions, ...options }, app)
}

/**
 * Validate certificate chain (async)
 */
export async function validateCertificateChain (certFile, keyFile, caFile = null) {
  try {
    // Check if certificate and key match using modern async approach
    // Parallelize file reads for better performance
    const [cert, key] = await Promise.all([
      fsPromises.readFile(certFile, 'utf8'),
      fsPromises.readFile(keyFile, 'utf8')
    ])

    // Create temporary files for validation
    const tempCertFile = `/tmp/temp_cert_${Date.now()}.pem`
    const tempKeyFile = `/tmp/temp_key_${Date.now()}.pem`

    // Parallelize file writes for better performance
    await Promise.all([
      fsPromises.writeFile(tempCertFile, cert),
      fsPromises.writeFile(tempKeyFile, key)
    ])

    try {
      // Check if certificate and key match
      const certModulus = execSync(`openssl x509 -noout -modulus -in ${tempCertFile}`, {
        encoding: 'utf8'
      })
      const keyModulus = execSync(`openssl rsa -noout -modulus -in ${tempKeyFile}`, {
        encoding: 'utf8'
      })

      if (certModulus !== keyModulus) {
        return { valid: false, error: 'Certificate and private key do not match' }
      }

      // Verify certificate chain if CA is provided
      if (caFile) {
        try {
          await fsPromises.access(caFile, fs.constants.F_OK)
          execSync(`openssl verify -CAfile ${caFile} ${tempCertFile}`, { stdio: 'inherit' })
        } catch (error) {
          return { valid: false, error: `CA file not accessible: ${caFile}` }
        }
      }

      return { valid: true }
    } finally {
      // Clean up temporary files
      fs.unlinkSync(tempCertFile)
      fs.unlinkSync(tempKeyFile)
    }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

// CLI for TLS utilities
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]

  if (!command) {
    console.log('Usage:')
    console.log('  node tls/index.js validate - Validate TLS configuration')
    console.log(
      '  node tls/index.js generate <cert_file> <key_file> [common_name] - Generate self-signed certificate'
    )
    console.log('  node tls/index.js info <cert_file> - Show certificate information')
    console.log(
      '  node tls/index.js verify <cert_file> <key_file> [ca_file] - Verify certificate chain'
    )
    process.exit(1)
  }

  const tlsMgr = getTlsManager()

  switch (command) {
    case 'validate': {
      const status = tlsMgr.validateTlsConfiguration()
      console.log(JSON.stringify(status, null, 2))
      break
    }

    case 'generate': {
      if (process.argv.length < 5) {
        console.log('Usage: node tls/index.js generate <cert_file> <key_file> [common_name]')
        process.exit(1)
      }

      const certFile = process.argv[3]
      const keyFile = process.argv[4]
      const commonName = process.argv[5] || 'localhost'

      if (generateSelfSignedCertificate(certFile, keyFile, commonName)) {
        console.log('Self-signed certificate generated:')
        console.log(`  Certificate: ${certFile}`)
        console.log(`  Private key: ${keyFile}`)
        console.log(`  Common name: ${commonName}`)
      } else {
        console.log('Failed to generate certificate')
        process.exit(1)
      }
      break
    }

    case 'info': {
      if (process.argv.length < 4) {
        console.log('Usage: node tls/index.js info <cert_file>')
        process.exit(1)
      }

      const certInfoFile = process.argv[3]
      const certInfo = tlsMgr.getCertificateInfo(certInfoFile)

      if (certInfo) {
        console.log(JSON.stringify(certInfo, null, 2))
      } else {
        console.log(`Failed to read certificate: ${certInfoFile}`)
        process.exit(1)
      }
      break
    }

    case 'verify': {
      if (process.argv.length < 5) {
        console.log('Usage: node tls/index.js verify <cert_file> <key_file> [ca_file]')
        process.exit(1)
      }

      const verifyCertFile = process.argv[3]
      const verifyKeyFile = process.argv[4]
      const caFile = process.argv[5]

      const validation = validateCertificateChain(verifyCertFile, verifyKeyFile, caFile)

      if (validation.valid) {
        console.log('Certificate chain is valid')
      } else {
        console.log(`Certificate chain validation failed: ${validation.error}`)
        process.exit(1)
      }
      break
    }

    default:
      console.log(`Unknown command: ${command}`)
      process.exit(1)
  }
}
