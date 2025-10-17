/**
 * @fileoverview Jest setup file - runs before each test file
 * Configure global test environment, mocks, and utilities
 * Using native ES modules with .mjs extension
 */

import { jest } from '@jest/globals'

/**
 * Global test configuration and setup for ES modules
 */

// Set test timeout for all tests
jest.setTimeout(10000) // 10 seconds

// Global test utilities with ES module support
globalThis.testUtils = {
  /**
   * Create a mock logger for testing
   */
  createMockLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(() => globalThis.testUtils.createMockLogger())
  }),

  /**
   * Create test data generators
   */
  generators: {
    /**
     * Generate a random UUID for testing
     */
    uuid: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    
    /**
     * Generate test market data
     */
    marketData: (overrides = {}) => ({
      messageId: globalThis.testUtils.generators.uuid(),
      timestamp: Date.now() * 1000000, // nanoseconds
      symbol: 'TEST',
      messageType: 'TRADE',
      data: {
        price: 100.0,
        quantity: 10.0,
        side: 'BUY',
        exchange: 'TEST_EXCHANGE'
      },
      sequenceNumber: 1,
      ...overrides
    }),

    /**
     * Generate test configuration
     */
    config: (overrides = {}) => ({
      app: {
        name: 'test-app',
        version: '1.0.0',
        environment: 'testing'
      },
      monitoring: {
        logLevel: 'error', // Reduce log noise in tests
        logFormat: 'text'
      },
      ...overrides
    })
  },

  /**
   * Test environment helpers
   */
  env: {
    /**
     * Set environment variables for test
     */
    setEnv: (vars) => {
      Object.entries(vars).forEach(([key, value]) => {
        process.env[key] = value
      })
    },
    
    /**
     * Restore original environment variables
     */
    restoreEnv: (originalEnv) => {
      Object.keys(process.env).forEach(key => {
        if (originalEnv[key] !== undefined) {
          process.env[key] = originalEnv[key]
        } else {
          delete process.env[key]
        }
      })
    },

    /**
     * Get a snapshot of current environment
     */
    snapshot: () => ({ ...process.env })
  },

  /**
   * Async test helpers
   */
  async: {
    /**
     * Wait for a condition to be true
     */
    waitFor: async (condition, timeout = 5000, interval = 100) => {
      const start = Date.now()
      while (Date.now() - start < timeout) {
        if (await condition()) {
          return true
        }
        await new Promise(resolve => setTimeout(resolve, interval))
      }
      throw new Error(`Condition not met within ${timeout}ms`)
    },

    /**
     * Sleep for specified milliseconds
     */
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Create a promise that resolves after specified time
     */
    delay: (ms, value) => new Promise(resolve => setTimeout(() => resolve(value), ms)),

    /**
     * Create a promise that rejects after specified time
     */
    timeout: (ms, reason = 'Timeout') => new Promise((_, reject) => 
      setTimeout(() => reject(new Error(reason)), ms)
    )
  },

  /**
   * Mock helpers for ES modules
   */
  mocks: {
    /**
     * Create a mock ES module
     */
    createModule: (exports = {}) => {
      const mockModule = {}
      Object.entries(exports).forEach(([key, value]) => {
        mockModule[key] = typeof value === 'function' ? jest.fn(value) : value
      })
      return mockModule
    },

    /**
     * Create a mock class with all methods mocked
     */
    createClass: (methods = []) => {
      const MockClass = jest.fn()
      methods.forEach(method => {
        MockClass.prototype[method] = jest.fn()
      })
      return MockClass
    }
  },

  /**
   * Performance testing utilities
   */
  performance: {
    /**
     * Measure execution time of a function
     */
    measure: async (fn) => {
      const start = process.hrtime.bigint()
      const result = await fn()
      const end = process.hrtime.bigint()
      return {
        result,
        duration: Number(end - start), // nanoseconds
        durationMs: Number(end - start) / 1_000_000 // milliseconds
      }
    },

    /**
     * Create a performance benchmark
     */
    benchmark: async (fn, iterations = 100) => {
      const times = []
      for (let i = 0; i < iterations; i++) {
        const { durationMs } = await globalThis.testUtils.performance.measure(fn)
        times.push(durationMs)
      }
      
      times.sort((a, b) => a - b)
      const sum = times.reduce((a, b) => a + b, 0)
      
      return {
        iterations,
        min: times[0],
        max: times[times.length - 1],
        mean: sum / times.length,
        median: times[Math.floor(times.length / 2)],
        p95: times[Math.floor(times.length * 0.95)],
        p99: times[Math.floor(times.length * 0.99)]
      }
    }
  }
}

// Global mocks for common modules using ES module syntax
// Uncomment and customize as needed

// Mock configuration module
// jest.unstable_mockModule('./src/config/index.js', () => ({
//   getConfig: jest.fn(() => globalThis.testUtils.generators.config())
// }))

// Mock logging module
// jest.unstable_mockModule('./src/logging/index.js', () => ({
//   getLogger: jest.fn(() => globalThis.testUtils.createMockLogger()),
//   setupLogging: jest.fn(),
//   setCorrelationId: jest.fn(),
//   getCorrelationId: jest.fn(() => 'test-correlation-id')
// }))

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
  
  // Reset any global state
  // Add your global state reset logic here
})

afterEach(() => {
  // Cleanup after each test
  // Add your cleanup logic here
})

beforeAll(() => {
  // Global setup before all tests
  // Set test environment
  process.env.NODE_ENV = 'test'
})

afterAll(() => {
  // Global cleanup after all tests
  // Restore environment
  delete process.env.NODE_ENV
})

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit the process in test environment
})

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // Don't exit the process in test environment
})

// Export empty object to satisfy ES module requirements
export default {}