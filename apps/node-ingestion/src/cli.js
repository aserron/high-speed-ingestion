#!/usr/bin/env node

/**
 * Command-line interface for the Node.js Finance Ingestion application.
 * 
 * This module provides CLI commands for configuration validation, health checks,
 * and other operational tasks.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { validateConfig, getConfig } from './config/index.js'

const program = new Command()

program
  .name('finance-ingestion-node')
  .description('Finance Ingestion CLI - Configuration and operational tools')
  .version('1.0.0')

program
  .command('validate-config')
  .description('Validate configuration for the specified environment')
  .option('-e, --env <environment>', 'Target environment to validate', null)
  .option('-j, --json', 'Output results in JSON format', false)
  .option('-v, --verbose', 'Show detailed configuration values', false)
  .action(async (options) => {
    try {
      const result = validateConfig(options.env)
      
      if (options.json) {
        // JSON output for programmatic use
        const output = {
          valid: result.valid,
          environment: options.env || 'current',
          errors: result.errors,
          warnings: result.warnings
        }
        
        if (options.verbose && result.config) {
          output.configuration = maskSensitiveConfig(result.config)
        }
        
        console.log(JSON.stringify(output, null, 2))
        process.exit(result.valid ? 0 : 1)
      }
      
      // Rich console output for human use
      displayValidationResults(result, options.env, options.verbose)
      process.exit(result.valid ? 0 : 1)
      
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          valid: false,
          environment: options.env || 'current',
          errors: [`Validation failed: ${error.message}`],
          warnings: []
        }, null, 2))
      } else {
        console.error(chalk.red(`❌ Configuration validation failed: ${error.message}`))
      }
      process.exit(1)
    }
  })

program
  .command('show-config')
  .description('Display current configuration')
  .option('-f, --format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      const config = getConfig()
      
      if (options.format === 'json') {
        const maskedConfig = maskSensitiveConfig(config)
        console.log(JSON.stringify(maskedConfig, null, 2))
      } else {
        displayConfigTable(config)
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load configuration: ${error.message}`))
      process.exit(1)
    }
  })

program
  .command('health-check')
  .description('Perform application health check')
  .action(async () => {
    try {
      // Basic configuration validation
      const result = validateConfig()
      
      if (!result.valid) {
        console.error(chalk.red('❌ Health check failed - configuration errors'))
        result.errors.forEach(error => {
          console.error(`  • ${error}`)
        })
        process.exit(1)
      }
      
      // TODO: Add database connectivity check
      // TODO: Add Redis connectivity check
      // TODO: Add external service checks
      
      console.log(chalk.green('✅ Health check passed'))
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'))
        result.warnings.forEach(warning => {
          console.log(`  • ${warning}`)
        })
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Health check failed: ${error.message}`))
      process.exit(1)
    }
  })

/**
 * Display validation results using colored console output.
 */
function displayValidationResults(result, env, verbose) {
  const envText = env || 'current environment'
  
  // Header
  if (result.valid) {
    console.log(chalk.green(`✅ Configuration Valid`) + ` for ${envText}`)
  } else {
    console.log(chalk.red(`❌ Configuration Invalid`) + ` for ${envText}`)
  }
  
  // Configuration summary
  if (verbose && result.config) {
    displayConfigSummary(result.config)
  }
  
  // Errors
  if (result.errors.length > 0) {
    console.log(chalk.red('\n❌ Errors:'))
    result.errors.forEach(error => {
      console.log(`  • ${error}`)
    })
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'))
    result.warnings.forEach(warning => {
      console.log(`  • ${warning}`)
    })
  }
  
  // Suggestions
  if (result.errors.length > 0 || result.warnings.length > 0) {
    console.log(chalk.blue('\n💡 Suggestions:'))
    
    const allIssues = [...result.errors, ...result.warnings]
    
    if (allIssues.some(item => item.toLowerCase().includes('password'))) {
      console.log('  • Set secure passwords using environment variables')
      console.log('  • Use different passwords for each environment')
    }
    
    if (allIssues.some(item => item.toLowerCase().includes('ssl'))) {
      console.log('  • Enable SSL/TLS for production deployments')
      console.log('  • Configure SSL certificates and keys')
    }
    
    if (allIssues.some(item => item.toLowerCase().includes('cors'))) {
      console.log('  • Set specific CORS origins for production')
      console.log('  • Use environment-specific CORS configuration')
    }
    
    if (allIssues.some(item => item.includes('environment variable'))) {
      console.log('  • Set required environment variables for your target environment')
      console.log('  • Check your deployment configuration')
    }
  }
}

/**
 * Display a summary of the loaded configuration.
 */
function displayConfigSummary(config) {
  console.log(chalk.magenta.bold('\n📋 Configuration Summary'))
  console.log('─'.repeat(50))
  
  const summary = [
    ['Environment', config.environment],
    ['Application Port', config.port],
    ['Log Level', config.logLevel],
    ['Metrics Enabled', config.enableMetrics ? '✅' : '❌'],
    ['Database Host', `${config.database.host}:${config.database.port}`],
    ['Database Name', config.database.name],
    ['Database SSL', config.database.ssl ? '✅' : '❌'],
    ['Redis Host', `${config.redis.host}:${config.redis.port}`],
    ['Redis Database', config.redis.db],
    ['WebSocket', config.websocket.enabled ? `Port ${config.websocket.port}` : '❌ Disabled'],
    ['CORS Enabled', config.security.corsEnabled ? '✅' : '❌'],
    ['Rate Limiting', config.security.rateLimitEnabled ? '✅' : '❌'],
    ['SSL Enabled', config.security.sslEnabled ? '✅' : '❌']
  ]
  
  summary.forEach(([key, value]) => {
    console.log(`${chalk.cyan(key.padEnd(20))} ${chalk.white(value)}`)
  })
  
  // Default value warnings
  const defaultWarnings = []
  
  if (['postgres', 'password', 'admin'].includes(config.database.password)) {
    defaultWarnings.push('Using default database password')
  }
  
  if (config.redis.password && ['redis', 'password'].includes(config.redis.password)) {
    defaultWarnings.push('Using default Redis password')
  }
  
  if (config.security.corsOrigin === '*' && config.environment === 'production') {
    defaultWarnings.push("CORS origin set to '*' in production")
  }
  
  if (defaultWarnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Default Values Detected:'))
    defaultWarnings.forEach(warning => {
      console.log(`  • ${warning}`)
    })
  }
}

/**
 * Display full configuration in table format.
 */
function displayConfigTable(config) {
  // Application Configuration
  console.log(chalk.blue.bold('\nApplication Configuration'))
  console.log('─'.repeat(40))
  
  const appConfig = [
    ['Port', config.port],
    ['Host', config.host],
    ['Environment', config.environment],
    ['Log Level', config.logLevel],
    ['Log Format', config.logFormat],
    ['Metrics Enabled', config.enableMetrics],
    ['Clustering Enabled', config.enableClustering],
    ['Cluster Workers', config.clusterWorkers]
  ]
  
  appConfig.forEach(([key, value]) => {
    console.log(`${chalk.cyan(key.padEnd(20))} ${chalk.white(value)}`)
  })
  
  // Database Configuration
  console.log(chalk.green.bold('\nDatabase Configuration'))
  console.log('─'.repeat(40))
  
  const dbConfig = [
    ['Host', config.database.host],
    ['Port', config.database.port],
    ['Database', config.database.name],
    ['Username', config.database.username],
    ['Password', config.database.password ? '***' : 'Not set'],
    ['SSL', config.database.ssl],
    ['Pool Min', config.database.poolMin],
    ['Pool Max', config.database.poolMax]
  ]
  
  dbConfig.forEach(([key, value]) => {
    console.log(`${chalk.cyan(key.padEnd(20))} ${chalk.white(value)}`)
  })
  
  // Redis Configuration
  console.log(chalk.red.bold('\nRedis Configuration'))
  console.log('─'.repeat(40))
  
  const redisConfig = [
    ['Host', config.redis.host],
    ['Port', config.redis.port],
    ['Database', config.redis.db],
    ['Password', config.redis.password ? '***' : 'Not set'],
    ['Connect Timeout', `${config.redis.connectTimeout}ms`],
    ['Command Timeout', `${config.redis.commandTimeout}ms`]
  ]
  
  redisConfig.forEach(([key, value]) => {
    console.log(`${chalk.cyan(key.padEnd(20))} ${chalk.white(value)}`)
  })
}

/**
 * Mask sensitive configuration values for safe display.
 */
function maskSensitiveConfig(config) {
  const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential']
  
  function maskRecursive(obj) {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(maskRecursive)
      } else {
        const masked = {}
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            masked[key] = '***'
          } else {
            masked[key] = maskRecursive(value)
          }
        }
        return masked
      }
    }
    return obj
  }
  
  return maskRecursive(config)
}

// Parse command line arguments
program.parse()

export { program }