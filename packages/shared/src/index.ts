/**
 * Shared Package Entry Point
 * Exports all shared types, schemas, and utilities for both Python and Node.js implementations
 */

// Type definitions
export * from './types/market-data';

// Configuration schemas
export * from './config/shared-config';

// Redis key patterns and data structures
export * from './redis/key-patterns';

// MessagePack serialization specification
export * from './serialization/messagepack-spec';

// Schema validation utilities
export * from './validation/schema-validator';

// JSON schemas (for external use)
export { default as marketDataSchema } from './schemas/market-data.schema.json';
export { default as performanceMetricsSchema } from './schemas/performance-metrics.schema.json';

/**
 * Package version and metadata
 */
export const PACKAGE_VERSION = '1.0.0';
export const PACKAGE_NAME = '@finance-benchmark/shared';

/**
 * Supported implementations
 */
export const SUPPORTED_IMPLEMENTATIONS = ['python', 'nodejs'] as const;
export type SupportedImplementation = typeof SUPPORTED_IMPLEMENTATIONS[number];

/**
 * Common constants
 */
export const CONSTANTS = {
  // Timing precision
  NANOSECONDS_PER_MILLISECOND: 1_000_000,
  NANOSECONDS_PER_SECOND: 1_000_000_000,
  
  // Default ports
  DEFAULT_WEBSOCKET_PORT: 8080,
  DEFAULT_REDIS_PORT: 6379,
  DEFAULT_POSTGRESQL_PORT: 5432,
  DEFAULT_PROMETHEUS_PORT: 9090,
  DEFAULT_HEALTH_CHECK_PORT: 8081,
  
  // Performance targets (from requirements)
  TARGET_PROCESSING_LATENCY_MS: 1,
  TARGET_THROUGHPUT_MSG_PER_SEC: 10000,
  TARGET_RECONNECTION_TIME_MS: 1000,
  
  // Buffer sizes
  DEFAULT_BUFFER_SIZE: 100000,
  DEFAULT_BATCH_SIZE: 1000,
  
  // Timeouts
  DEFAULT_CONNECTION_TIMEOUT_MS: 5000,
  DEFAULT_PROCESSING_TIMEOUT_MS: 100,
  DEFAULT_HEALTH_CHECK_TIMEOUT_MS: 1000
} as const;

/**
 * Utility functions
 */
export class SharedUtils {
  /**
   * Get current timestamp in nanoseconds
   */
  static getCurrentTimestampNs(): number {
    return Date.now() * CONSTANTS.NANOSECONDS_PER_MILLISECOND;
  }

  /**
   * Convert milliseconds to nanoseconds
   */
  static msToNs(ms: number): number {
    return ms * CONSTANTS.NANOSECONDS_PER_MILLISECOND;
  }

  /**
   * Convert nanoseconds to milliseconds
   */
  static nsToMs(ns: number): number {
    return ns / CONSTANTS.NANOSECONDS_PER_MILLISECOND;
  }

  /**
   * Generate unique message ID
   */
  static generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `msg_${timestamp}_${random}`;
  }

  /**
   * Validate implementation type
   */
  static isValidImplementation(impl: string): impl is SupportedImplementation {
    return SUPPORTED_IMPLEMENTATIONS.includes(impl as SupportedImplementation);
  }

  /**
   * Calculate percentile from sorted array
   */
  static calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Calculate basic statistics from array
   */
  static calculateStats(values: number[]): {
    min: number;
    max: number;
    mean: number;
    count: number;
  } {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, count: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;

    return { min, max, mean, count: values.length };
  }
}