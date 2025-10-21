/**
 * Configuration management for the Node.js Finance Ingestion application.
 * 
 * This module provides a hierarchical configuration system that loads settings from:
 * 1. Base configuration files
 * 2. Environment-specific configuration files
 * 3. Local development overrides  
 * 4. Environment variables (highest priority)
 */

import { loadConfig, validateConfig, getConfig } from './loader.js'
import { configSchema } from './schema.js'

export {
  loadConfig,
  validateConfig,
  getConfig,
  configSchema
}