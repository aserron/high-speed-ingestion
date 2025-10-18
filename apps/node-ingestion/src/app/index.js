/**
 * Application Module Index
 *
 * Exports all application classes and utilities for different operation modes.
 */

// Internal modules
import { envUtils } from '../utils/common-utilities.js'

// Application classes
import { SimpleApp } from './simple-app.js'
import { FullApp } from './full-app.js'
import { ClusterApp } from './cluster-app.js'

/**
 * Application modes
 */
export const APP_MODES = {
  SIMPLE: 'simple',
  FULL: 'full',
  CLUSTER: 'cluster'
}

/**
 * Get application mode from environment
 */
export function getAppMode () {
  const mode = envUtils.getString('APP_MODE', 'full')
  if (!Object.values(APP_MODES).includes(mode)) {
    console.warn(`Invalid APP_MODE: ${mode}. Defaulting to 'full'`)
    return APP_MODES.FULL
  }
  return mode
}

/**
 * Create application instance based on mode
 */
export function createApp (mode = null) {
  const appMode = mode || getAppMode()

  switch (appMode) {
    case APP_MODES.SIMPLE:
      return new SimpleApp()
    case APP_MODES.FULL:
      return new FullApp()
    case APP_MODES.CLUSTER:
      return new ClusterApp()
    default:
      throw new Error(`Unknown application mode: ${appMode}`)
  }
}

// Export application classes
export { SimpleApp, FullApp, ClusterApp }

export default {
  APP_MODES,
  getAppMode,
  createApp,
  SimpleApp,
  FullApp,
  ClusterApp
}
