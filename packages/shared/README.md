# @finance-benchmark/shared

Shared schemas, types, and utilities for the financial data ingestion benchmark project.

## Overview

This package provides common data structures, configuration schemas, and utilities that are used by both the Python and Node.js implementations of the financial data ingestion system. It ensures consistency and fair comparison between the two implementations.

## Features

- **TypeScript Type Definitions**: Comprehensive type definitions for market data, performance metrics, and configuration
- **JSON Schema Validation**: Schema validation for data integrity and consistency
- **Redis Key Patterns**: Standardized Redis key patterns and data structures
- **MessagePack Specification**: Binary serialization format specification for both platforms
- **Configuration Schemas**: Shared configuration interfaces and validation
- **Database Schema**: PostgreSQL schema for historical data storage

## Installation

```bash
npm install @finance-benchmark/shared
```

## Usage

### TypeScript/Node.js

```typescript
import {
  MarketDataMessage,
  PerformanceMetrics,
  RedisKeyBuilder,
  MessagePackSpec,
  validateMarketData,
  defaultWebSocketConfig
} from '@finance-benchmark/shared';

// Use type definitions
const message: MarketDataMessage = {
  messageId: 'msg_123',
  timestamp: Date.now() * 1000000, // nanoseconds
  symbol: 'AAPL',
  messageType: 'TRADE',
  data: {
    price: 150.25,
    quantity: 100,
    side: 'BUY',
    exchange: 'NYSE'
  },
  sequenceNumber: 1
};

// Validate data
const validation = validateMarketData(message);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Generate Redis keys
const key = RedisKeyBuilder.marketData('AAPL', Date.now());

// Use configuration
const config = { ...defaultWebSocketConfig, url: 'wss://api.example.com' };
```

### Python

While this package is written in TypeScript, the schemas and specifications can be used in Python:

```python
import json
import msgpack
from typing import Dict, Any

# Load JSON schemas for validation
with open('node_modules/@finance-benchmark/shared/dist/schemas/market-data.schema.json') as f:
    market_data_schema = json.load(f)

# Use MessagePack specification
from finance_benchmark_shared.serialization import MessagePackSpec

# Convert message to serializable format
serializable_message = MessagePackSpec.to_serializable(message)
packed_data = msgpack.packb(serializable_message, use_bin_type=True, strict_types=True)
```

## Package Structure

```
src/
├── types/
│   └── market-data.ts          # TypeScript type definitions
├── schemas/
│   ├── market-data.schema.json # JSON schema for market data
│   └── performance-metrics.schema.json # JSON schema for metrics
├── config/
│   └── shared-config.ts        # Configuration interfaces
├── redis/
│   └── key-patterns.ts         # Redis key patterns and structures
├── serialization/
│   └── messagepack-spec.ts     # MessagePack serialization spec
├── validation/
│   └── schema-validator.ts     # Schema validation utilities
├── database/
│   └── postgresql-schema.sql   # PostgreSQL database schema
└── index.ts                    # Main entry point
```

## Key Components

### Market Data Types

- `MarketDataMessage`: Core market data message structure
- `MessageType`: Enum for message types (TRADE, QUOTE, BOOK_UPDATE)
- `Side`: Enum for trade sides (BUY, SELL)
- `PerformanceMetrics`: Performance measurement data structure

### Configuration

- `WebSocketConfig`: WebSocket connection configuration
- `ProcessingConfig`: Message processing configuration
- `StorageConfig`: Redis and PostgreSQL configuration
- `MonitoringConfig`: Observability and monitoring configuration
- `BenchmarkConfig`: Benchmark-specific settings

### Redis Integration

- `RedisKeyPatterns`: Standardized key patterns for different data types
- `RedisKeyBuilder`: Helper class for generating Redis keys
- `RedisDataStructures`: Specifications for Redis data structures and TTLs

### MessagePack Serialization

- `MessagePackSpec`: Utilities for consistent binary serialization
- `SerializableMarketDataMessage`: Optimized format for binary encoding
- `MessagePackConfig`: Configuration for Python and Node.js msgpack libraries

### Validation

- `SchemaValidator`: JSON schema validation using AJV
- `ValidationError`: Custom error class for validation failures
- Type guards and validation functions

## Database Schema

The package includes a complete PostgreSQL schema (`postgresql-schema.sql`) with:

- `market_data`: Historical market data storage
- `performance_metrics`: Benchmark results and performance data
- `connection_stats`: Connection health and statistics
- Optimized indexes for query performance
- Views for common queries and comparisons

## Performance Considerations

- All timestamps use nanosecond precision for accurate latency measurement
- MessagePack binary serialization for efficient data transfer
- Optimized Redis key patterns with appropriate TTLs
- Database indexes designed for high-frequency insert and query operations
- Type definitions optimized for both runtime performance and developer experience

## Requirements Compliance

This package addresses the following requirements from the benchmark specification:

- **3.1**: Identical message formats between implementations
- **3.3**: Equivalent serialization methods (MessagePack)
- **8.1**: Redis for high-speed in-memory storage
- **8.2**: PostgreSQL with identical database schemas
- **8.3**: Connection pooling with identical pool sizes

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Clean build artifacts
npm run clean
```

## License

MIT