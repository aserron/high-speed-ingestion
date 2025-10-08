/**
 * Redis Key Patterns and Data Structures
 * Shared between Python and Node.js implementations
 */

/**
 * Redis key patterns for different data types
 */
export const RedisKeyPatterns = {
  // Real-time market data: market:{symbol}:{timestamp_ms}
  MARKET_DATA: 'market:{symbol}:{timestamp}',
  
  // Latest price by symbol: latest:{symbol}
  LATEST_PRICE: 'latest:{symbol}',
  
  // Performance metrics: metrics:{implementation}:{timestamp_ms}
  PERFORMANCE_METRICS: 'metrics:{implementation}:{timestamp}',
  
  // Connection statistics: conn:{implementation}:{timestamp_ms}
  CONNECTION_STATS: 'conn:{implementation}:{timestamp}',
  
  // Message processing queue: queue:{implementation}
  PROCESSING_QUEUE: 'queue:{implementation}',
  
  // Latency measurements: latency:{implementation}:{window}
  LATENCY_WINDOW: 'latency:{implementation}:{window}',
  
  // Throughput counters: throughput:{implementation}:{window}
  THROUGHPUT_WINDOW: 'throughput:{implementation}:{window}',
  
  // System health status: health:{implementation}
  HEALTH_STATUS: 'health:{implementation}',
  
  // Configuration cache: config:{implementation}:{key}
  CONFIG_CACHE: 'config:{implementation}:{key}',
  
  // Active symbols list: symbols:active
  ACTIVE_SYMBOLS: 'symbols:active'
} as const;

/**
 * Redis data structure specifications
 */
export const RedisDataStructures = {
  /**
   * Market data storage (Hash)
   * Key: market:{symbol}:{timestamp_ms}
   * TTL: 1 hour (3600 seconds)
   * Fields: messageId, price, quantity, side, exchange, sequenceNumber, processingLatencyNs
   */
  MARKET_DATA: {
    type: 'hash' as const,
    ttl: 3600, // 1 hour
    fields: [
      'messageId',
      'price', 
      'quantity',
      'side',
      'exchange',
      'sequenceNumber',
      'processingLatencyNs'
    ]
  },

  /**
   * Latest price storage (Hash)
   * Key: latest:{symbol}
   * TTL: 24 hours (86400 seconds)
   * Fields: price, quantity, timestamp, exchange, side
   */
  LATEST_PRICE: {
    type: 'hash' as const,
    ttl: 86400, // 24 hours
    fields: [
      'price',
      'quantity', 
      'timestamp',
      'exchange',
      'side',
      'lastUpdated'
    ]
  },

  /**
   * Performance metrics (Hash)
   * Key: metrics:{implementation}:{timestamp_ms}
   * TTL: 7 days (604800 seconds)
   */
  PERFORMANCE_METRICS: {
    type: 'hash' as const,
    ttl: 604800, // 7 days
    fields: [
      'latencyP50',
      'latencyP95',
      'latencyP99',
      'latencyP999',
      'messagesPerSecond',
      'bytesPerSecond',
      'cpuUsage',
      'memoryUsage',
      'memoryPercent'
    ]
  },

  /**
   * Latency measurements (Sorted Set)
   * Key: latency:{implementation}:{window}
   * Score: timestamp, Member: latency_value
   * TTL: 1 hour (3600 seconds)
   */
  LATENCY_WINDOW: {
    type: 'zset' as const,
    ttl: 3600, // 1 hour
    description: 'Sorted set of latency measurements for percentile calculation'
  },

  /**
   * Throughput counters (String with atomic operations)
   * Key: throughput:{implementation}:{window}
   * TTL: 1 hour (3600 seconds)
   */
  THROUGHPUT_WINDOW: {
    type: 'string' as const,
    ttl: 3600, // 1 hour
    description: 'Counter for messages processed in time window'
  },

  /**
   * Processing queue (List)
   * Key: queue:{implementation}
   * No TTL (persistent until processed)
   */
  PROCESSING_QUEUE: {
    type: 'list' as const,
    ttl: null,
    description: 'FIFO queue for message processing with backpressure'
  },

  /**
   * Active symbols (Set)
   * Key: symbols:active
   * TTL: 1 hour (3600 seconds)
   */
  ACTIVE_SYMBOLS: {
    type: 'set' as const,
    ttl: 3600, // 1 hour
    description: 'Set of currently active trading symbols'
  },

  /**
   * Health status (Hash)
   * Key: health:{implementation}
   * TTL: 5 minutes (300 seconds)
   */
  HEALTH_STATUS: {
    type: 'hash' as const,
    ttl: 300, // 5 minutes
    fields: [
      'isHealthy',
      'lastHeartbeat',
      'connectionsActive',
      'messagesProcessed',
      'errorsCount',
      'uptime'
    ]
  }
} as const;

/**
 * Helper functions for key generation
 */
export class RedisKeyBuilder {
  /**
   * Generate market data key
   */
  static marketData(symbol: string, timestamp: number): string {
    return RedisKeyPatterns.MARKET_DATA
      .replace('{symbol}', symbol)
      .replace('{timestamp}', timestamp.toString());
  }

  /**
   * Generate latest price key
   */
  static latestPrice(symbol: string): string {
    return RedisKeyPatterns.LATEST_PRICE.replace('{symbol}', symbol);
  }

  /**
   * Generate performance metrics key
   */
  static performanceMetrics(implementation: string, timestamp: number): string {
    return RedisKeyPatterns.PERFORMANCE_METRICS
      .replace('{implementation}', implementation)
      .replace('{timestamp}', timestamp.toString());
  }

  /**
   * Generate connection stats key
   */
  static connectionStats(implementation: string, timestamp: number): string {
    return RedisKeyPatterns.CONNECTION_STATS
      .replace('{implementation}', implementation)
      .replace('{timestamp}', timestamp.toString());
  }

  /**
   * Generate processing queue key
   */
  static processingQueue(implementation: string): string {
    return RedisKeyPatterns.PROCESSING_QUEUE.replace('{implementation}', implementation);
  }

  /**
   * Generate latency window key
   */
  static latencyWindow(implementation: string, windowMs: number): string {
    return RedisKeyPatterns.LATENCY_WINDOW
      .replace('{implementation}', implementation)
      .replace('{window}', windowMs.toString());
  }

  /**
   * Generate throughput window key
   */
  static throughputWindow(implementation: string, windowMs: number): string {
    return RedisKeyPatterns.THROUGHPUT_WINDOW
      .replace('{implementation}', implementation)
      .replace('{window}', windowMs.toString());
  }

  /**
   * Generate health status key
   */
  static healthStatus(implementation: string): string {
    return RedisKeyPatterns.HEALTH_STATUS.replace('{implementation}', implementation);
  }

  /**
   * Generate config cache key
   */
  static configCache(implementation: string, key: string): string {
    return RedisKeyPatterns.CONFIG_CACHE
      .replace('{implementation}', implementation)
      .replace('{key}', key);
  }

  /**
   * Get active symbols key
   */
  static activeSymbols(): string {
    return RedisKeyPatterns.ACTIVE_SYMBOLS;
  }
}

/**
 * Redis connection configuration
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  family: 4 | 6;
  keyPrefix?: string;
}

/**
 * Default Redis configuration
 */
export const defaultRedisConfig: RedisConfig = {
  host: 'localhost',
  port: 6379,
  db: 0,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4
};