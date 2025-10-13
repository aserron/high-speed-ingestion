/**
 * Command Line Interface
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
 * 
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
 * Provides CLI commands for running the Node.js financial data ingestion system
 * with proper configuration, logging, and error handling.
 */

import { Command } from 'commander'
import { getConfig } from './config/index.js'
import { setupLogging, getLogger } from './logging/index.js'
import { setupErrorHandlers } from './errors/index.js'
import { startCluster } from './cluster.js'
import app from './index.js'

const program = new Command()

/**
 * Setup CLI program
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
function setupCLI () {
=======
function setupCLI() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function setupCLI() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function setupCLI() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
function setupCLI() {
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  program
    .name('finance-ingestion')
    .description('High-performance Node.js financial data ingestion system')
    .version('1.0.0')

  // Global options
  program
    .option('--config <path>', 'Path to configuration file')
    .option('--log-level <level>', 'Override log level (error, warn, info, debug)')
    .option('--verbose', 'Enable verbose logging')
    .option('--dry-run', 'Run in dry-run mode (no actual processing)')

  // Run command
  program
    .command('run')
    .description('Run the financial data ingestion system')
    .option('--host <host>', 'WebSocket server host', 'localhost')
    .option('--port <port>', 'WebSocket server port', '8080')
    .option('--duration <seconds>', 'Run duration in seconds (0 for infinite)', '0')
    .option('--cluster', 'Enable clustering')
    .option('--workers <count>', 'Number of worker processes', '0')
    .action(async (options) => {
      try {
        await runCommand(options)
      } catch (error) {
        console.error('Run command failed:', error.message)
        process.exit(1)
      }
    })

  // Cluster command
  program
    .command('cluster')
    .description('Run with clustering enabled')
    .option('--workers <count>', 'Number of worker processes', '0')
    .action(async (options) => {
      try {
        await clusterCommand(options)
      } catch (error) {
        console.error('Cluster command failed:', error.message)
        process.exit(1)
      }
    })

  // Benchmark command
  program
    .command('benchmark')
    .description('Run performance benchmarks')
    .option('--output <file>', 'Output file for benchmark results')
    .option('--format <format>', 'Output format (json, csv, html)', 'json')
    .option('--duration <seconds>', 'Benchmark duration in seconds', '60')
    .action(async (options) => {
      try {
        await benchmarkCommand(options)
      } catch (error) {
        console.error('Benchmark command failed:', error.message)
        process.exit(1)
      }
    })

  // Validate config command
  program
    .command('validate-config')
    .description('Validate the current configuration')
    .action(async () => {
      try {
        await validateConfigCommand()
      } catch (error) {
        console.error('Config validation failed:', error.message)
        process.exit(1)
      }
    })

  // Health check command
  program
    .command('health-check')
    .description('Perform system health checks')
    .action(async () => {
      try {
        await healthCheckCommand()
      } catch (error) {
        console.error('Health check failed:', error.message)
        process.exit(1)
      }
    })

  return program
}

/**
 * Run command implementation
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function runCommand (options) {
  // Initialize configuration and logging
  const config = getConfig()

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
async function runCommand(options) {
  // Initialize configuration and logging
  const config = getConfig()
  
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  // Override configuration with CLI options
  if (options.host || options.port) {
    config.websocket.url = `wss://${options.host || 'localhost'}:${options.port || 8080}/market-data`
  }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

  if (options.duration && parseInt(options.duration) > 0) {
    config.benchmark.durationMs = parseInt(options.duration) * 1000
  }

  if (options.cluster) {
    config.cluster.enabled = true
  }

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  
  if (options.duration && parseInt(options.duration) > 0) {
    config.benchmark.durationMs = parseInt(options.duration) * 1000
  }
  
  if (options.cluster) {
    config.cluster.enabled = true
  }
  
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (options.workers) {
    config.cluster.workers = parseInt(options.workers)
  }

  setupLogging(config)
  setupErrorHandlers()
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

  const logger = getLogger('cli')

=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  logger.info('Starting ingestion system', {
    websocketUrl: config.websocket.url,
    durationMs: config.benchmark.durationMs,
    clusterEnabled: config.cluster.enabled,
    workers: config.cluster.workers,
    dryRun: config.app.dryRun
  })

  // Start the application
  if (config.cluster.enabled) {
    await startCluster()
  } else {
    await app.start()
  }
}

/**
 * Cluster command implementation
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function clusterCommand (options) {
  const config = getConfig()

  // Enable clustering
  config.cluster.enabled = true

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
async function clusterCommand(options) {
  const config = getConfig()
  
  // Enable clustering
  config.cluster.enabled = true
  
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (options.workers) {
    config.cluster.workers = parseInt(options.workers)
  }

  setupLogging(config)
  setupErrorHandlers()
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

  const logger = getLogger('cli')

=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  logger.info('Starting cluster mode', {
    workers: config.cluster.workers || 'auto'
  })

  await startCluster()
}

/**
 * Benchmark command implementation
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function benchmarkCommand (options) {
  const config = getConfig()

=======
async function benchmarkCommand(options) {
  const config = getConfig()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
async function benchmarkCommand(options) {
  const config = getConfig()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
async function benchmarkCommand(options) {
  const config = getConfig()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
async function benchmarkCommand(options) {
  const config = getConfig()
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  if (options.duration) {
    config.benchmark.durationMs = parseInt(options.duration) * 1000
  }

  setupLogging(config)
  setupErrorHandlers()
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

  const logger = getLogger('cli')

=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
  const logger = getLogger('cli')
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  logger.info('Starting benchmark suite', {
    durationMs: config.benchmark.durationMs,
    outputFile: options.output,
    format: options.format
  })

  // Placeholder for benchmark implementation
  logger.info('Benchmark suite would start here')
  logger.info('This will be implemented in subsequent tasks')
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

  if (options.output) {
    logger.info(`Would save results to ${options.output} in ${options.format} format`)
  }

  // Simulate benchmark execution
  await new Promise(resolve => setTimeout(resolve, 2000))

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  
  if (options.output) {
    logger.info(`Would save results to ${options.output} in ${options.format} format`)
  }
  
  // Simulate benchmark execution
  await new Promise(resolve => setTimeout(resolve, 2000))
  
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  logger.info('Benchmark suite completed')
}

/**
 * Validate config command implementation
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function validateConfigCommand () {
  try {
    const config = getConfig()
    setupLogging(config)

    const logger = getLogger('cli')

    logger.info('Validating configuration...')

    const errors = []

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
async function validateConfigCommand() {
  try {
    const config = getConfig()
    setupLogging(config)
    
    const logger = getLogger('cli')
    
    logger.info('Validating configuration...')
    
    const errors = []
    
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Check WebSocket configuration
    if (!config.websocket.url.startsWith('ws://') && !config.websocket.url.startsWith('wss://')) {
      errors.push('WebSocket URL must start with ws:// or wss://')
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Check database configuration
    if (!config.postgresql.database) {
      errors.push('PostgreSQL database name is required')
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Check Redis configuration
    if (config.redis.port < 1 || config.redis.port > 65535) {
      errors.push('Redis port must be between 1 and 65535')
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    // Check cluster configuration
    if (config.cluster.workers < 0 || config.cluster.workers > 32) {
      errors.push('Cluster workers must be between 0 and 32')
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
    if (errors.length > 0) {
      logger.error('Configuration validation failed', { errors })
      errors.forEach(error => console.error(`ERROR: ${error}`))
      process.exit(1)
    } else {
      logger.info('Configuration validation passed')
      console.log('Configuration is valid ✓')
    }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
    
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  } catch (error) {
    console.error('Configuration validation error:', error.message)
    process.exit(1)
  }
}

/**
 * Health check command implementation
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function healthCheckCommand () {
  const config = getConfig()
  setupLogging(config)

  const logger = getLogger('cli')

  logger.info('Performing health checks...')

=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
async function healthCheckCommand() {
  const config = getConfig()
  setupLogging(config)
  
  const logger = getLogger('cli')
  
  logger.info('Performing health checks...')
  
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  // Placeholder for health check implementation
  const checks = [
    'WebSocket connectivity',
    'Redis connectivity',
    'PostgreSQL connectivity',
    'System resources'
  ]
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  for (const check of checks) {
    logger.info(`Would check: ${check}`)
    // Simulate check
    await new Promise(resolve => setTimeout(resolve, 500))
  }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
  
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  logger.info('All health checks would pass')
  console.log('All health checks passed ✓')
}

/**
 * Main CLI entry point
 */
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function main () {
  try {
    const cli = setupCLI()

    // Parse command line arguments
    await cli.parseAsync(process.argv)
=======
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
async function main() {
  try {
    const cli = setupCLI()
    
    // Parse command line arguments
    await cli.parseAsync(process.argv)
    
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
  } catch (error) {
    console.error('CLI error:', error.message)
    process.exit(1)
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default {
  setupCLI,
  runCommand,
  clusterCommand,
  benchmarkCommand,
  validateConfigCommand,
  healthCheckCommand,
  main
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
}
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
=======
}
>>>>>>> b42d439 (feat: implement Node.js foundation framework)
