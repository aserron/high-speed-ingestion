/**
 * MessagePack Serialization Specification
 * Defines the binary serialization format used by both Python and Node.js implementations
 */

/**
 * MessagePack format specification for market data messages
 * 
 * This specification ensures both Python (msgpack) and Node.js (msgpack5) 
 * implementations use identical serialization formats for fair benchmarking.
 */

/**
 * Serialization format for MarketDataMessage
 * 
 * Binary layout (MessagePack format):
 * - messageId: str (fixstr/str8/str16/str32)
 * - timestamp: uint64 (8 bytes)
 * - symbol: str (fixstr/str8)
 * - messageType: uint8 (1 byte enum: 0=TRADE, 1=QUOTE, 2=BOOK_UPDATE)
 * - data: map with 4 fields
 *   - price: float64 (8 bytes)
 *   - quantity: float64 (8 bytes) 
 *   - side: uint8 (1 byte enum: 0=BUY, 1=SELL)
 *   - exchange: str (fixstr/str8)
 * - sequenceNumber: uint64 (8 bytes)
 */

export enum MessageTypeEnum {
  TRADE = 0,
  QUOTE = 1,
  BOOK_UPDATE = 2
}

export enum SideEnum {
  BUY = 0,
  SELL = 1
}

/**
 * Serializable market data message format
 * Uses numeric enums for efficient binary serialization
 */
export interface SerializableMarketDataMessage {
  messageId: string;
  timestamp: number; // uint64
  symbol: string;
  messageType: MessageTypeEnum; // uint8
  data: {
    price: number; // float64
    quantity: number; // float64
    side: SideEnum; // uint8
    exchange: string;
  };
  sequenceNumber: number; // uint64
}

/**
 * Serializable performance metrics format
 */
export interface SerializablePerformanceMetrics {
  timestamp: number; // uint64
  latency: {
    p50: number; // uint64 (nanoseconds)
    p95: number; // uint64
    p99: number; // uint64
    p999: number; // uint64
    min: number; // uint64
    max: number; // uint64
    mean: number; // uint64
    count: number; // uint64
  };
  throughput: {
    messagesPerSecond: number; // float64
    bytesPerSecond: number; // uint64
    totalMessages: number; // uint64
    totalBytes: number; // uint64
  };
  resources: {
    cpuUsage: number; // float32 (percentage)
    memoryUsage: number; // uint64 (bytes)
    memoryPercent: number; // float32 (percentage)
  };
}

/**
 * MessagePack encoding/decoding utilities
 */
export class MessagePackSpec {
  /**
   * Convert string message type to enum
   */
  static messageTypeToEnum(messageType: string): MessageTypeEnum {
    switch (messageType) {
      case 'TRADE': return MessageTypeEnum.TRADE;
      case 'QUOTE': return MessageTypeEnum.QUOTE;
      case 'BOOK_UPDATE': return MessageTypeEnum.BOOK_UPDATE;
      default: throw new Error(`Invalid message type: ${messageType}`);
    }
  }

  /**
   * Convert enum to string message type
   */
  static enumToMessageType(enumValue: MessageTypeEnum): string {
    switch (enumValue) {
      case MessageTypeEnum.TRADE: return 'TRADE';
      case MessageTypeEnum.QUOTE: return 'QUOTE';
      case MessageTypeEnum.BOOK_UPDATE: return 'BOOK_UPDATE';
      default: throw new Error(`Invalid message type enum: ${enumValue}`);
    }
  }

  /**
   * Convert string side to enum
   */
  static sideToEnum(side: string): SideEnum {
    switch (side) {
      case 'BUY': return SideEnum.BUY;
      case 'SELL': return SideEnum.SELL;
      default: throw new Error(`Invalid side: ${side}`);
    }
  }

  /**
   * Convert enum to string side
   */
  static enumToSide(enumValue: SideEnum): string {
    switch (enumValue) {
      case SideEnum.BUY: return 'BUY';
      case SideEnum.SELL: return 'SELL';
      default: throw new Error(`Invalid side enum: ${enumValue}`);
    }
  }

  /**
   * Convert MarketDataMessage to serializable format
   */
  static toSerializable(message: any): SerializableMarketDataMessage {
    return {
      messageId: message.messageId,
      timestamp: message.timestamp,
      symbol: message.symbol,
      messageType: this.messageTypeToEnum(message.messageType),
      data: {
        price: message.data.price,
        quantity: message.data.quantity,
        side: this.sideToEnum(message.data.side),
        exchange: message.data.exchange
      },
      sequenceNumber: message.sequenceNumber
    };
  }

  /**
   * Convert serializable format to MarketDataMessage
   */
  static fromSerializable(serializable: SerializableMarketDataMessage): any {
    return {
      messageId: serializable.messageId,
      timestamp: serializable.timestamp,
      symbol: serializable.symbol,
      messageType: this.enumToMessageType(serializable.messageType),
      data: {
        price: serializable.data.price,
        quantity: serializable.data.quantity,
        side: this.enumToSide(serializable.data.side),
        exchange: serializable.data.exchange
      },
      sequenceNumber: serializable.sequenceNumber
    };
  }
}

/**
 * MessagePack configuration for consistent encoding
 */
export const MessagePackConfig = {
  /**
   * Encoding options for Python msgpack
   * These should be used in Python implementation:
   * 
   * import msgpack
   * msgpack.packb(data, use_bin_type=True, strict_types=True)
   * msgpack.unpackb(data, raw=False, strict_map_key=False)
   */
  python: {
    use_bin_type: true,
    strict_types: true,
    raw: false,
    strict_map_key: false
  },

  /**
   * Encoding options for Node.js msgpack5
   * These should be used in Node.js implementation:
   * 
   * const msgpack = require('msgpack5')();
   * msgpack.encode(data);
   * msgpack.decode(buffer);
   */
  nodejs: {
    // msgpack5 uses sensible defaults that match Python configuration
    // No special configuration needed for compatibility
  }
} as const;

/**
 * Expected message sizes for performance testing
 */
export const MessageSizes = {
  /**
   * Typical market data message size in bytes (MessagePack encoded)
   * Based on average trade/quote message with:
   * - messageId: ~20 chars
   * - symbol: ~6 chars  
   * - exchange: ~4 chars
   * - numeric fields: fixed sizes
   */
  TYPICAL_MESSAGE: 120,

  /**
   * Minimum message size (smallest possible valid message)
   */
  MIN_MESSAGE: 80,

  /**
   * Maximum message size (largest expected message)
   */
  MAX_MESSAGE: 200,

  /**
   * Batch size for bulk operations (number of messages)
   */
  BATCH_SIZE: 1000
} as const;

/**
 * Validation functions for serialized data
 */
export class MessagePackValidator {
  /**
   * Validate serializable market data message
   */
  static validateMarketDataMessage(data: any): data is SerializableMarketDataMessage {
    return (
      typeof data === 'object' &&
      typeof data.messageId === 'string' &&
      typeof data.timestamp === 'number' &&
      typeof data.symbol === 'string' &&
      typeof data.messageType === 'number' &&
      data.messageType >= 0 && data.messageType <= 2 &&
      typeof data.data === 'object' &&
      typeof data.data.price === 'number' &&
      typeof data.data.quantity === 'number' &&
      typeof data.data.side === 'number' &&
      data.data.side >= 0 && data.data.side <= 1 &&
      typeof data.data.exchange === 'string' &&
      typeof data.sequenceNumber === 'number'
    );
  }

  /**
   * Validate performance metrics
   */
  static validatePerformanceMetrics(data: any): data is SerializablePerformanceMetrics {
    return (
      typeof data === 'object' &&
      typeof data.timestamp === 'number' &&
      typeof data.latency === 'object' &&
      typeof data.throughput === 'object' &&
      typeof data.resources === 'object'
    );
  }
}