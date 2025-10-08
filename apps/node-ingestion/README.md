# Financial Data Ingestion System - Node.js Implementation

High-performance Node.js financial data ingestion system optimized for real-time market data processing with sub-millisecond latency requirements and native clustering support.

## Features

- **High Performance**: Native clustering with multi-core CPU utilization
- **ES Modules**: Modern JavaScript with ES2022 features
- **Structured Logging**: JSON-formatted logs with correlation IDs and performance metrics
- **Configuration Management**: Joi-based validation with environment variable support
- **Error Handling**: Comprehensive error hierarchy with context preservation
- **Monitoring Ready**: Prometheus metrics and health check endpoints
- **Production Ready**: Docker support, graceful shutdown, and resource monitoring

## Requirements

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- WebSocket server for market data feed
- Redis for real-time data storage
- PostgreSQL for historical data persistence

## Installation

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd finance-ingestion-benchmark/apps/node-ingestion

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration as needed
nano .env
```

### Production Setup

```bash
# Install production dependencies only
npm ci --only=production

# Or install from package
npm install finance-ingestion-nodejs-1.0.0.tgz
```

## Configuration

The application uses environment variables for configuration. Create a `.env` file or set environment variables:

```bash
# Application Settings
NODE_ENV=production
APP_NAME=finance-ingestion-nodejs
DEBUG=false

# WebSocket Configuration
WEBSOCKET_URL=wss://api.example.com/market-data
WEBSOCKET_CONNECT_TIMEOUT_MS=5000

# Database Configuration
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=finance_benchmark
POSTGRESQL_USERNAME=benchmark_user
POSTGRESQL_PASSWORD=benchmark_pass

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password

# Clustering Configuration
CLUSTER_ENABLED=true
CLUSTER_WORKERS=0  # 0 = auto-detect CPU cores

# Monitoring Configuration
MONITORING_LOG_LEVEL=info
MONITORING_PROMETHEUS_ENABLED=true
MONITORING_PROMETHEUS_PORT=9090
```

### Configuration Sections

- **App**: Application metadata and runtime settings
- **WebSocket**: Connection settings, timeouts, reconnection logic
- **Processing**: Batch sizes, backpressure handling, validation
- **Cluster**: Multi-core utilization and worker management
- **Storage**: Redis and PostgreSQL connection pooling
- **Monitoring**: Logging, metrics, health checks
- **Benchmark**: Test parameters and data generation

## Usage

### Command Line Interface

```bash
# Run the ingestion system
node src/cli.js run --host api.example.com --port 8080

# Run with clustering enabled
node src/cli.js cluster --workers 4

# Run with custom duration (60 seconds)
node src/cli.js run --duration 60

# Run in dry-run mode (no actual processing)
node src/cli.js run --dry-run

# Run performance benchmarks
node src/cli.js benchmark --output results.json --format json

# Validate configuration
node src/cli.js validate-config

# Perform health checks
node src/cli.js health-check

# Show help
node src/cli.js --help
```

### Direct Execution

```bash
# Start with clustering (recommended for production)
node src/cluster.js

# Start single instance
node src/index.js

# Start with specific configuration
NODE_ENV=production CLUSTER_WORKERS=8 node src/cluster.js
```

### Programmatic Usage

```javascript
import { FinanceIngestionApp } from './src/index.js'
import { getConfig } from './src/config/index.js'

const app = new FinanceIngestionApp()

// Start the application
await app.start()

// Get application status
const status = app.getStatus()
console.log('App status:', status)

// Stop the application
await app.stop()
```

## Architecture

The system follows a clustered architecture for maximum performance:

```
┌─────────────────────┐
│   Cluster Master    │
│   (Process Manager) │
├─────────────────────┤
│   Worker 1          │   │   Worker 2          │   │   Worker N          │
│ ┌─────────────────┐ │   │ ┌─────────────────┐ │   │ ┌─────────────────┐ │
│ │ CLI Interface   │ │   │ │ CLI Interface   │ │   │ │ CLI Interface   │ │
│ ├─────────────────┤ │   │ ├─────────────────┤ │   │ ├─────────────────┤ │
│ │ Configuration   │ │   │ │ Configuration   │ │   │ │ Configuration   │ │
│ │ & Logging       │ │   │ │ & Logging       │ │   │ │ & Logging       │ │
│ ├─────────────────┤ │   │ ├─────────────────┤ │   │ ├─────────────────┤ │
│ │ Connection      │ │   │ │ Connection      │ │   │ │ Connection      │ │
│ │ Manager         │ │   │ │ Manager         │ │   │ │ Manager         │ │
│ ├─────────────────┤ │   │ ├─────────────────┤ │   │ ├─────────────────┤ │
│ │ Message         │ │   │ │ Message         │ │   │ │ Message         │ │
│ │ Processor       │ │   │ │ Processor       │ │   │ │ Processor       │ │
│ ├─────────────────┤ │   │ ├─────────────────┤ │   │ ├─────────────────┤ │
│ │ Storage Layer   │ │   │ │ Storage Layer   │ │   │ │ Storage Layer   │ │
│ └─────────────────┘ │   │ └─────────────────┘ │   │ └─────────────────┘ │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

### Key Components

1. **Cluster Manager**: Native Node.js clustering for multi-core utilization
2. **Configuration Management**: Joi-based validation with environment variables
3. **Structured Logging**: Winston with correlation IDs and JSON formatting
4. **Error Handling**: Comprehensive error hierarchy with context preservation
5. **CLI Interface**: Commander.js-based command line interface

## Performance Targets

- **Latency**: < 1ms processing latency (p99)
- **Throughput**: 10,000+ messages per second per core
- **Reconnection**: < 1 second automatic reconnection
- **Memory**: Stable memory usage without leaks
- **Clustering**: Linear scaling with CPU cores

## Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Run all quality checks
npm run lint && npm run format:check
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run benchmarks
npm run benchmark
```

### Building

```bash
# No build step required for Node.js
npm run build  # Just echoes message

# Clean generated files
npm run clean
```

## Monitoring

### Metrics

The application exposes Prometheus metrics on `/metrics` endpoint:

- `finance_ingestion_messages_processed_total`: Total messages processed
- `finance_ingestion_processing_latency_seconds`: Processing latency histogram
- `finance_ingestion_connection_status`: Connection status gauge
- `finance_ingestion_queue_size`: Current queue size
- `finance_ingestion_errors_total`: Total errors by type
- `finance_ingestion_cluster_workers`: Number of active workers

### Health Checks

Health check endpoint available at `/health`:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 3600000,
  "checks": {
    "websocket": "connected",
    "redis": "connected", 
    "postgresql": "connected",
    "memory_usage": "normal",
    "cluster": "healthy"
  },
  "cluster": {
    "workers": 4,
    "restarts": 0
  }
}
```

### Logging

Structured JSON logs include:

- Correlation IDs for request tracing
- High-precision timestamps (nanoseconds)
- Performance metrics (latency, throughput)
- Error context and stack traces
- Resource usage statistics
- Cluster worker information

## Clustering

### Automatic Scaling

```bash
# Auto-detect CPU cores
CLUSTER_WORKERS=0 node src/cluster.js

# Specific number of workers
CLUSTER_WORKERS=4 node src/cluster.js

# Disable clustering
CLUSTER_ENABLED=false node src/index.js
```

### Worker Management

- Automatic worker restart on crashes
- Graceful shutdown with configurable timeout
- Health monitoring and dead worker detection
- Load balancing across workers
- Resource usage tracking per worker

## Docker Support

```bash
# Build image
docker build -t finance-ingestion-nodejs .

# Run container
docker run -d \
  --name finance-ingestion \
  -p 8080:8080 \
  -p 9090:9090 \
  -e WEBSOCKET_URL=wss://api.example.com/market-data \
  -e POSTGRESQL_HOST=postgres \
  -e REDIS_HOST=redis \
  -e CLUSTER_WORKERS=4 \
  finance-ingestion-nodejs

# Run with Docker Compose
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Connection Failures**: Check WebSocket URL and network connectivity
2. **High Latency**: Verify system resources and enable clustering
3. **Memory Issues**: Monitor garbage collection and buffer sizes
4. **Worker Crashes**: Check logs for error patterns and resource limits
5. **Configuration Errors**: Use `validate-config` command

### Debug Mode

```bash
# Enable debug logging
export MONITORING_LOG_LEVEL=debug

# Run with verbose output
node src/cli.js run --verbose

# Check health status
node src/cli.js health-check

# Inspect cluster status
node --inspect src/cluster.js
```

### Performance Tuning

1. **Clustering**: Enable clustering for multi-core systems
2. **Batch Size**: Tune processing batch size for your workload
3. **Buffer Size**: Adjust buffer sizes based on message rate
4. **Connection Pooling**: Optimize database connection pools
5. **GC Tuning**: Use Node.js GC flags for high-throughput scenarios

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass and code is formatted
6. Submit a pull request

## License

MIT License - see LICENSE file for details.