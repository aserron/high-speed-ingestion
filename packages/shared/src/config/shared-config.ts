/**
 * Shared Configuration Schemas
 * Used by both Python and Node.js implementations for consistent configuration
 */

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;
  
  // Connection settings
  connectTimeoutMs: number;
  pingIntervalMs: number;
  pongTimeoutMs: number;
  
  // Reconnection settings
  maxReconnectAttempts: number;
  reconnectDelayMs: number;
  reconnectBackoffMultiplier: number;
  reconnectMaxDelayMs: number;
  reconnectJitterMs: number;
  
  // Performance settings
  maxMessageSize: number;
  compressionEnabled: boolean;
  
  // Security settings
  tlsEnabled: boolean;
  tlsVerifyCertificate: boolean;
}

/**
 * Message processing configuration
 */
export interface ProcessingConfig {
  // Batch processing
  batchSize: number;
  batchTimeoutMs: number;
  
  // Backpressure handling
  maxQueueSize: number;
  backpressureThreshold: number;
  dropOldestOnBackpressure: boolean;
  
  // Performance monitoring
  latencyMeasurementEnabled: boolean;
  latencyHistogramBuckets: number[];
  metricsCollectionIntervalMs: number;
  
  // Message validation
  validateIncomingMessages: boolean;
  strictSchemaValidation: boolean;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  // Redis configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    keyPrefix?: string;
    
    // Connection pooling
    maxConnections: number;
    minConnections: number;
    acquireTimeoutMs: number;
    
    // Performance settings
    enableOfflineQueue: boolean;
    lazyConnect: boolean;
    keepAlive: number;
  };
  
  // PostgreSQL configuration
  postgresql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    
    // Connection pooling
    maxConnections: number;
    minConnections: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
    
    // Performance settings
    statementTimeoutMs: number;
    queryTimeoutMs: number;
    ssl: boolean;
  };
  
  // Buffer configuration
  buffer: {
    maxSize: number;
    flushIntervalMs: number;
    flushThreshold: number;
    circularBuffer: boolean;
  };
}

/**
 * Monitoring and observability configuration
 */
export interface MonitoringConfig {
  // Metrics export
  prometheusEnabled: boolean;
  prometheusPort: number;
  prometheusPath: string;
  
  // Logging configuration
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'text';
  logTimestamps: boolean;
  
  // Health checks
  healthCheckEnabled: boolean;
  healthCheckPort: number;
  healthCheckPath: string;
  healthCheckIntervalMs: number;
  
  // Performance tracking
  trackResourceUsage: boolean;
  resourceUsageIntervalMs: number;
  trackGarbageCollection: boolean;
}

/**
 * Benchmark-specific configuration
 */
export interface BenchmarkConfig {
  // Test duration and load
  durationMs: number;
  warmupMs: number;
  cooldownMs: number;
  
  // Message generation
  messageRatePerSecond: number;
  burstModeEnabled: boolean;
  burstIntervalMs: number;
  burstMultiplier: number;
  
  // Test symbols
  symbols: string[];
  symbolRotationEnabled: boolean;
  
  // Data generation
  priceRange: { min: number; max: number };
  quantityRange: { min: number; max: number };
  exchanges: string[];
  
  // Results collection
  collectDetailedMetrics: boolean;
  saveResultsToDatabase: boolean;
  exportResultsPath?: string;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  // Application metadata
  name: string;
  version: string;
  implementation: 'python' | 'nodejs';
  environment: 'development' | 'testing' | 'production';
  
  // Component configurations
  websocket: WebSocketConfig;
  processing: ProcessingConfig;
  storage: StorageConfig;
  monitoring: MonitoringConfig;
  benchmark: BenchmarkConfig;
  
  // Runtime settings
  debug: boolean;
  verbose: boolean;
  dryRun: boolean;
}

/**
 * Default configuration values
 */
export const defaultWebSocketConfig: WebSocketConfig = {
  url: 'wss://localhost:8080/market-data',
  connectTimeoutMs: 5000,
  pingIntervalMs: 30000,
  pongTimeoutMs: 5000,
  maxReconnectAttempts: 10,
  reconnectDelayMs: 100,
  reconnectBackoffMultiplier: 2,
  reconnectMaxDelayMs: 30000,
  reconnectJitterMs: 1000,
  maxMessageSize: 1024 * 1024, // 1MB
  compressionEnabled: true,
  tlsEnabled: true,
  tlsVerifyCertificate: true
};

export const defaultProcessingConfig: ProcessingConfig = {
  batchSize: 100,
  batchTimeoutMs: 10,
  maxQueueSize: 10000,
  backpressureThreshold: 0.8,
  dropOldestOnBackpressure: true,
  latencyMeasurementEnabled: true,
  latencyHistogramBuckets: [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100], // milliseconds
  metricsCollectionIntervalMs: 1000,
  validateIncomingMessages: true,
  strictSchemaValidation: false
};

export const defaultStorageConfig: StorageConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    maxConnections: 10,
    minConnections: 2,
    acquireTimeoutMs: 5000,
    enableOfflineQueue: false,
    lazyConnect: true,
    keepAlive: 30000
  },
  postgresql: {
    host: 'localhost',
    port: 5432,
    database: 'finance_benchmark',
    username: 'benchmark_user',
    password: 'benchmark_pass',
    maxConnections: 20,
    minConnections: 5,
    acquireTimeoutMs: 5000,
    idleTimeoutMs: 30000,
    statementTimeoutMs: 30000,
    queryTimeoutMs: 30000,
    ssl: false
  },
  buffer: {
    maxSize: 100000,
    flushIntervalMs: 1000,
    flushThreshold: 1000,
    circularBuffer: true
  }
};

export const defaultMonitoringConfig: MonitoringConfig = {
  prometheusEnabled: true,
  prometheusPort: 9090,
  prometheusPath: '/metrics',
  logLevel: 'info',
  logFormat: 'json',
  logTimestamps: true,
  healthCheckEnabled: true,
  healthCheckPort: 8080,
  healthCheckPath: '/health',
  healthCheckIntervalMs: 5000,
  trackResourceUsage: true,
  resourceUsageIntervalMs: 1000,
  trackGarbageCollection: true
};

export const defaultBenchmarkConfig: BenchmarkConfig = {
  durationMs: 60000, // 1 minute
  warmupMs: 10000, // 10 seconds
  cooldownMs: 5000, // 5 seconds
  messageRatePerSecond: 10000,
  burstModeEnabled: true,
  burstIntervalMs: 10000, // Every 10 seconds
  burstMultiplier: 5,
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX'],
  symbolRotationEnabled: true,
  priceRange: { min: 1.0, max: 1000.0 },
  quantityRange: { min: 1, max: 10000 },
  exchanges: ['NYSE', 'NASDAQ', 'BATS', 'ARCA'],
  collectDetailedMetrics: true,
  saveResultsToDatabase: true
};

/**
 * Configuration validation functions
 */
export class ConfigValidator {
  /**
   * Validate WebSocket configuration
   */
  static validateWebSocketConfig(config: Partial<WebSocketConfig>): string[] {
    const errors: string[] = [];
    
    if (!config.url) {
      errors.push('WebSocket URL is required');
    } else if (!config.url.startsWith('ws://') && !config.url.startsWith('wss://')) {
      errors.push('WebSocket URL must start with ws:// or wss://');
    }
    
    if (config.connectTimeoutMs && config.connectTimeoutMs <= 0) {
      errors.push('Connect timeout must be positive');
    }
    
    if (config.maxReconnectAttempts && config.maxReconnectAttempts < 0) {
      errors.push('Max reconnect attempts cannot be negative');
    }
    
    return errors;
  }

  /**
   * Validate processing configuration
   */
  static validateProcessingConfig(config: Partial<ProcessingConfig>): string[] {
    const errors: string[] = [];
    
    if (config.batchSize && config.batchSize <= 0) {
      errors.push('Batch size must be positive');
    }
    
    if (config.maxQueueSize && config.maxQueueSize <= 0) {
      errors.push('Max queue size must be positive');
    }
    
    if (config.backpressureThreshold && (config.backpressureThreshold <= 0 || config.backpressureThreshold > 1)) {
      errors.push('Backpressure threshold must be between 0 and 1');
    }
    
    return errors;
  }

  /**
   * Validate complete application configuration
   */
  static validateAppConfig(config: Partial<AppConfig>): string[] {
    const errors: string[] = [];
    
    if (!config.name) {
      errors.push('Application name is required');
    }
    
    if (!config.implementation || !['python', 'nodejs'].includes(config.implementation)) {
      errors.push('Implementation must be either "python" or "nodejs"');
    }
    
    if (config.websocket) {
      errors.push(...this.validateWebSocketConfig(config.websocket));
    }
    
    if (config.processing) {
      errors.push(...this.validateProcessingConfig(config.processing));
    }
    
    return errors;
  }
}