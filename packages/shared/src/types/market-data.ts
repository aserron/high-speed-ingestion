/**
 * Market Data Types and Interfaces
 * Shared between Python and Node.js implementations
 */

export type MessageType = 'TRADE' | 'QUOTE' | 'BOOK_UPDATE';
export type Side = 'BUY' | 'SELL';

/**
 * Core market data message structure
 */
export interface MarketDataMessage {
  messageId: string;
  timestamp: number; // nanoseconds since epoch
  symbol: string;
  messageType: MessageType;
  data: MarketDataPayload;
  sequenceNumber: number;
}

/**
 * Market data payload containing trade/quote information
 */
export interface MarketDataPayload {
  price: number;
  quantity: number;
  side: Side;
  exchange: string;
}

/**
 * Processing result with latency measurements
 */
export interface ProcessingResult {
  messageId: string;
  processingLatencyNs: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  isConnected: boolean;
  connectionCount: number;
  reconnectionCount: number;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  latencyMs: number;
  packetLoss: number;
  bandwidthBytesPerSec: number;
}

/**
 * Latency statistics with percentiles
 */
export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  p999: number;
  min: number;
  max: number;
  mean: number;
  count: number;
}

/**
 * Throughput statistics
 */
export interface ThroughputStats {
  messagesPerSecond: number;
  bytesPerSecond: number;
  totalMessages: number;
  totalBytes: number;
  windowSizeMs: number;
}

/**
 * Buffer statistics for memory management
 */
export interface BufferStats {
  currentSize: number;
  maxSize: number;
  utilizationPercent: number;
  droppedMessages: number;
  oldestMessageAge: number;
}

/**
 * Performance metrics aggregation
 */
export interface PerformanceMetrics {
  timestamp: number;
  latency: LatencyStats;
  throughput: ThroughputStats;
  resources: ResourceStats;
  connection: ConnectionStats;
  buffer: BufferStats;
}

/**
 * Resource utilization statistics
 */
export interface ResourceStats {
  cpuUsage: number; // percentage
  memoryUsage: number; // bytes
  memoryPercent: number; // percentage
  networkIO: NetworkIOStats;
  gcStats?: GarbageCollectionStats;
}

/**
 * Network I/O statistics
 */
export interface NetworkIOStats {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  errors: number;
}

/**
 * Garbage collection statistics (where applicable)
 */
export interface GarbageCollectionStats {
  collections: number;
  totalTimeMs: number;
  avgTimeMs: number;
  maxTimeMs: number;
}