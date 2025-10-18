/**
 * @fileoverview Modern Jest configuration for Node.js ES modules
 * @type {import('jest').Config}
 * 
 * This configuration leverages jsconfig.json for module resolution
 * and follows modern JavaScript testing best practices.
 */

/**
 * Jest configuration for finance-ingestion-nodejs
 * 
 * Modern Features:
 * - Leverages jsconfig.json for consistent module resolution
 * - Native ES Module support with proper configuration
 * - Path aliases matching jsconfig.json
 * - Optimized for modern Node.js environments
 * - Enhanced IDE integration
 */
const config = {
  // Test environment configuration
  testEnvironment: 'node',
  
  // ES Module support - use native modules without transforms
  transform: {},
  preset: undefined,
  
  // Module resolution matching jsconfig.json
  moduleNameMapper: {
    // Path aliases from jsconfig.json
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@tests/(.*)$': '<rootDir>/src/**/__tests__/$1'
  },
  
  // Module resolution directories
  moduleDirectories: ['node_modules', 'src'],
  
  // Test file discovery patterns
  testMatch: [
    // Tests in __tests__ directories
    '**/__tests__/**/*.?(m)js',
    // Test files with .test or .spec suffix
    '**/?(*.)+(spec|test).?(m)js'
  ],
  
  // Files to ignore during test discovery
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/.git/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    // Include all source files
    'src/**/*.?(m)js',
    // Exclude test files
    '!src/**/*.{test,spec}.?(m)js',
    // Exclude specific files
    '!src/benchmark.js',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  
  // Coverage output configuration
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief summary
    'lcov',          // For CI/CD and IDE integration
    'html',          // Detailed HTML report
    'json'           // Machine-readable format
  ],
  
  // Coverage thresholds (optional - uncomment to enforce)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Test execution configuration
  verbose: true,
  
  // Timeout configuration
  testTimeout: 10000, // 10 seconds
  
  // Setup files (run before each test file)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  
  // Global setup/teardown
  // globalSetup: '<rootDir>/jest.global-setup.mjs',
  // globalTeardown: '<rootDir>/jest.global-teardown.mjs',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance optimization
  maxWorkers: '50%', // Use half of available CPU cores
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false, // Keep manual mocks
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.git/',
    '/.jest-cache/'
  ],
  
  // Notification configuration (for watch mode)
  notify: false,
  notifyMode: 'failure-change',
  
  // Reporter configuration
  reporters: [
    'default'
    // Uncomment for CI/CD environments
    // ['jest-junit', {
    //   outputDirectory: 'coverage',
    //   outputName: 'junit.xml'
    // }]
  ],
  
  // Mock configuration (deprecated option removed)
  
  // File extensions Jest will process (matching jsconfig.json)
  moduleFileExtensions: ['js', 'mjs', 'json'],
  
  // Resolver configuration (optional custom resolver)
  // resolver: '<rootDir>/jest.resolver.mjs',
  
  // Resolver configuration for monorepo support
  // resolver: '<rootDir>/jest.resolver.mjs',
  
  // Environment variables for tests
  testEnvironmentOptions: {
    // Node.js specific options
    node: {
      // No experimental flags needed with .mjs config
    }
  },
  
  // Globals configuration for ES modules
  globals: {
    // No ts-jest needed for pure ES modules
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Preset configuration
  preset: undefined, // Use default Jest preset
  
  // Bail configuration
  bail: 0, // Don't bail on first failure
  
  // Collect coverage from untested files (deprecated option removed)
  
  // Force exit after tests complete
  forceExit: false,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Detect leaked timers
  detectLeaks: false
}

export default config