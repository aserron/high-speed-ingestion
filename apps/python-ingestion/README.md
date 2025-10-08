# Financial Data Ingestion System - Python Implementation

High-performance financial data ingestion system optimized for real-time market data processing with sub-millisecond latency requirements.

## Features

- **High Performance**: Built with asyncio and uvloop for maximum throughput
- **Structured Logging**: JSON-formatted logs with correlation IDs and performance metrics
- **Configuration Management**: Pydantic-based configuration with environment variable support
- **Error Handling**: Comprehensive exception hierarchy with context preservation
- **Monitoring Ready**: Prometheus metrics and health check endpoints
- **Production Ready**: Docker support, graceful shutdown, and resource monitoring

## Requirements

- Python 3.11 or higher
- uvloop for high-performance async I/O
- WebSocket server for market data feed
- Redis for real-time data storage
- PostgreSQL for historical data persistence

## Installation

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd finance-ingestion-benchmark/apps/python-ingestion

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .

# Install development dependencies
pip install -e ".[dev]"
```

### Production Setup

```bash
# Install production dependencies only
pip install -e .

# Or install from wheel
pip install finance-ingestion-python-1.0.0-py3-none-any.whl
```

## Configuration

The application uses environment variables for configuration. Create a `.env` file or set environment variables:

```bash
# WebSocket Configuration
WEBSOCKET__URL=wss://api.example.com/market-data
WEBSOCKET__CONNECT_TIMEOUT_MS=5000

# Database Configuration
POSTGRESQL__HOST=localhost
POSTGRESQL__PORT=5432
POSTGRESQL__DATABASE=finance_benchmark
POSTGRESQL__USERNAME=benchmark_user
POSTGRESQL__PASSWORD=benchmark_pass

# Redis Configuration
REDIS__HOST=localhost
REDIS__PORT=6379
REDIS__PASSWORD=optional_password

# Monitoring Configuration
MONITORING__LOG_LEVEL=INFO
MONITORING__PROMETHEUS_ENABLED=true
MONITORING__PROMETHEUS_PORT=9090

# Application Settings
ENVIRONMENT=production
DEBUG=false
```

### Configuration Sections

- **WebSocket**: Connection settings, timeouts, reconnection logic
- **Processing**: Batch sizes, backpressure handling, validation
- **Storage**: Redis and PostgreSQL connection pooling
- **Monitoring**: Logging, metrics, health checks
- **Benchmark**: Test parameters and data generation

## Usage

### Command Line Interface

```bash
# Run the ingestion system
finance-ingestion run --host api.example.com --port 8080

# Run with custom duration (60 seconds)
finance-ingestion run --duration 60

# Run in dry-run mode (no actual processing)
finance-ingestion run --dry-run

# Run performance benchmarks
finance-ingestion benchmark --output results.json --format json

# Validate configuration
finance-ingestion validate-config

# Perform health checks
finance-ingestion health-check

# Show help
finance-ingestion --help
```

### Programmatic Usage

```python
import asyncio
from finance_ingestion import get_config, setup_logging

async def main():
    # Load configuration
    config = get_config()
    
    # Set up logging
    setup_logging(config)
    
    # Your application logic here
    pass

if __name__ == "__main__":
    asyncio.run(main())
```

## Architecture

The system follows a layered architecture:

```
┌─────────────────────┐
│   CLI Interface     │
├─────────────────────┤
│   Configuration     │
│   & Logging         │
├─────────────────────┤
│   Connection        │
│   Manager           │
├─────────────────────┤
│   Message           │
│   Processor         │
├─────────────────────┤
│   Storage Layer     │
│   (Redis/PostgreSQL)│
├─────────────────────┤
│   Metrics &         │
│   Monitoring        │
└─────────────────────┘
```

### Key Components

1. **Configuration Management**: Pydantic-based configuration with validation
2. **Structured Logging**: High-performance JSON logging with correlation IDs
3. **Exception Handling**: Comprehensive error hierarchy with context
4. **CLI Interface**: Click-based command line interface
5. **Async Runtime**: uvloop-optimized asyncio for maximum performance

## Performance Targets

- **Latency**: < 1ms processing latency (p99)
- **Throughput**: 10,000+ messages per second
- **Reconnection**: < 1 second automatic reconnection
- **Memory**: Stable memory usage without leaks

## Development

### Code Quality

```bash
# Format code
black src/ tests/

# Sort imports
isort src/ tests/

# Type checking
mypy src/

# Linting
flake8 src/ tests/

# Run all quality checks
pre-commit run --all-files
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=finance_ingestion --cov-report=html

# Run only fast tests
pytest -m "not slow"

# Run integration tests
pytest -m integration
```

### Building

```bash
# Build wheel
python -m build

# Build Docker image
docker build -t finance-ingestion-python .
```

## Monitoring

### Metrics

The application exposes Prometheus metrics on `/metrics` endpoint:

- `finance_ingestion_messages_processed_total`: Total messages processed
- `finance_ingestion_processing_latency_seconds`: Processing latency histogram
- `finance_ingestion_connection_status`: Connection status gauge
- `finance_ingestion_queue_size`: Current queue size
- `finance_ingestion_errors_total`: Total errors by type

### Health Checks

Health check endpoint available at `/health`:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "checks": {
    "websocket": "connected",
    "redis": "connected", 
    "postgresql": "connected",
    "memory_usage": "normal"
  }
}
```

### Logging

Structured JSON logs include:

- Correlation IDs for request tracing
- Performance metrics (latency, throughput)
- Error context and stack traces
- Resource usage statistics

## Docker Support

```bash
# Build image
docker build -t finance-ingestion-python .

# Run container
docker run -d \
  --name finance-ingestion \
  -p 8080:8080 \
  -p 9090:9090 \
  -e WEBSOCKET__URL=wss://api.example.com/market-data \
  -e POSTGRESQL__HOST=postgres \
  -e REDIS__HOST=redis \
  finance-ingestion-python

# Run with Docker Compose
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Connection Failures**: Check WebSocket URL and network connectivity
2. **High Latency**: Verify system resources and database performance
3. **Memory Issues**: Monitor garbage collection and buffer sizes
4. **Configuration Errors**: Use `validate-config` command

### Debug Mode

```bash
# Enable debug logging
export MONITORING__LOG_LEVEL=DEBUG

# Run with verbose output
finance-ingestion run --verbose

# Check health status
finance-ingestion health-check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.