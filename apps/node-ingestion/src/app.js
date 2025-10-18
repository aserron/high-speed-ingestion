/**
 * Unified Application Entry Point
 *
 * Single source of truth for the Node.js Financial Data Ingestion System
 * Supports multiple modes: simple, full-featured, and clustered
 */

// Internal modules
import { APP_MODES, getAppMode, createApp, SimpleApp, FullApp, ClusterApp } from './app/index.js'

/**
 * Main application launcher
 */
async function main () {
  const mode = getAppMode()

  console.log(`Starting application in ${mode} mode...`)

  try {
    const app = createApp(mode)
    await app.start()

    // Setup graceful shutdown for simple mode
    if (mode === APP_MODES.SIMPLE) {
      process.on('SIGTERM', () => app.stop())
      process.on('SIGINT', () => app.stop())
    }
  } catch (error) {
    console.error('Application startup failed:', error.message)
    process.exit(1)
  }
}

// Start application if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { SimpleApp, FullApp, ClusterApp, APP_MODES, main }
