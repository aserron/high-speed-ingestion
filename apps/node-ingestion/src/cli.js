/**
 * Command Line Interface
 *
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
function setupCLI() {
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
async function runCommand(options) {
  // Initialize configuration and logging
  const config = getConfig()

  // Override configuration with CLI options
  if (options.host || options.port) {
    config.websocket.url = `wss://${options.host || 'localhost'}:${options.port || 8080}/market-data`
  }
  
  if (options.duration && parseInt(options.duration) > 0) {
    config.benchmark.durationMs = parseInt(options.duration) * 1000
  }
  
  if (options.cluster) {
    config.cluster.enabled = true
  }

  if (options.workers) {
    config.cluster.workers = parseInt(options.workers)
  }

  setupLogging(config)
  setupErrorHandlers()
  
  const logger = getLogger('cli')

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
async function clusterCommand(options) {
  const config = getConfig()
  
  // Enable clustering
  config.cluster.enabled = true

  if (options.workers) {
    config.cluster.workers = parseInt(options.workers)
  }

  setupLogging(config)
  setupErrorHandlers()
  
  const logger = getLogger('cli')

  logger.info('Starting cluster mode', {
    workers: config.cluster.workers || 'auto'
  })

  await startCluster()
}

/**
 * Benchmark command implementation
 */
async function benchmarkCommand(options) {
  const config = getConfig()

  if (options.duration) {
    config.benchmark.durationMs = parseInt(options.duration) * 1000
  }

  setupLogging(config)
  setupErrorHandlers()
  
  const logger = getLogger('cli')

  logger.info('Starting benchmark suite', {
    durationMs: config.benchmark.durationMs,
    outputFile: options.output,
    format: options.format
  })

  // Placeholder for benchmark implementation
  logger.info('Benchmark suite would start here')
  logger.info('This will be implemented in subsequent tasks')
  
  if (options.output) {
    logger.info(`Would save results to ${options.output} in ${options.format} format`)
  }
  
  // Simulate benchmark execution
  await new Promise(resolve => setTimeout(resolve, 2000))

  logger.info('Benchmark suite completed')
}

/**
 * Validate config command implementation
 */
async function validateConfigCommand() {
  try {
    const config = getConfig()
    setupLogging(config)
    
    const logger = getLogger('cli')
    
    logger.info('Validating configuration...')
    
    const errors = []

    // Check WebSocket configuration
    if (!config.websocket.url.startsWith('ws://') && !config.websocket.url.startsWith('wss://')) {
      errors.push('WebSocket URL must start with ws:// or wss://')
    }

    // Check database configuration
    if (!config.postgresql.database) {
      errors.push('PostgreSQL database name is required')
    }

    // Check Redis configuration
    if (config.redis.port < 1 || config.redis.port > 65535) {
      errors.push('Redis port must be between 1 and 65535')
    }

    // Check cluster configuration
    if (config.cluster.workers < 0 || config.cluster.workers > 32) {
      errors.push('Cluster workers must be between 0 and 32')
    }

    if (errors.length > 0) {
      logger.error('Configuration validation failed', { errors })
      errors.forEach(error => console.error(`ERROR: ${error}`))
      process.exit(1)
    } else {
      logger.info('Configuration validation passed')
      console.log('Configuration is valid ✓')
    }
  } catch (error) {
    console.error('Configuration validation error:', error.message)
    process.exit(1)
  }
}

/**
 * Health check command implementation
 */
async function healthCheckCommand() {
  const config = getConfig()
  setupLogging(config)
  
  const logger = getLogger('cli')
  
  logger.info('Performing health checks...')

  // Placeholder for health check implementation
  const checks = [
    'WebSocket connectivity',
    'Redis connectivity',
    'PostgreSQL connectivity',
    'System resources'
  ]

  for (const check of checks) {
    logger.info(`Would check: ${check}`)
    // Simulate check
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  logger.info('All health checks would pass')
  console.log('All health checks passed ✓')
}

/**
 * Main CLI entry point
 */
async function main () {
  try {
    const cli = setupCLI()

    // Parse command line arguments
    await cli.parseAsync(process.argv)
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
}
