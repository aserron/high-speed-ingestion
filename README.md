# Finance Ingestion Benchmark

A comprehensive benchmark comparing high-performance financial data ingestion systems built in Python and Node.js. This project evaluates real-time market data processing capabilities, measuring latency, throughput, and resource utilization under realistic trading conditions.

## Overview

This monorepo contains two equivalent implementations of a financial data ingestion system:

- **Python Implementation**: Built with asyncio, uvloop, and optimized for high-frequency data processing
- **Node.js Implementation**: Built with native clustering and worker threads for maximum performance

Both systems process identical WebSocket market data feeds and provide comprehensive performance metrics for fair comparison.

## Performance Targets

- **Latency**: Sub-millisecond processing (< 1ms end-to-end)
- **Throughput**: 10,000+ messages per second sustained
- **Reliability**: Automatic reconnection within 1 second
- **Stability**: Memory-stable operation under continuous load

## Project Structure

```
├── apps/
│   ├── python-ingestion/     # Python implementation
│   ├── node-ingestion/       # Node.js implementation
│   └── dashboard/            # Monitoring dashboard
├── packages/
│   └── shared/               # Shared schemas and utilities
├── infrastructure/           # Infrastructure configurations
│   ├── docker/              # Docker Compose configurations
│   ├── monitoring/          # Prometheus, Grafana, alerts
│   └── docs/                # Infrastructure documentation
├── tests/                    # Integration and benchmark tests
├── docs/                     # Documentation and specifications
├── docker-compose*.yml       # Environment-specific configurations
└── turbo.json               # Monorepo build configuration
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Python 3.11+
- Docker and Docker Compose
- Git

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd finance-ingestion-benchmark
   npm install
   ```

2. **Start development environment:**
   ```bash
   npm run docker:dev   # Start all services with development settings
   npm run setup        # Initialize both applications
   ```

3. **Run development servers:**
   ```bash
   npm run dev          # Start both implementations in development mode
   ```

### Available Scripts

**Development:**
- `npm run build` - Build both applications
- `npm run dev` - Start both implementations in development mode
- `npm run test` - Run all tests
- `npm run benchmark` - Execute performance benchmarks
- `npm run lint` - Lint all code
- `npm run clean` - Clean build artifacts

**Infrastructure:**
- `npm run docker:dev` - Start development environment with hot-reload
- `npm run docker:prod` - Start production environment
- `npm run docker:up` - Start services (backward compatibility)
- `npm run docker:down` - Stop all services
- `npm run docker:logs` - View service logs
- `npm run docker:clean` - Clean up containers and volumes

## Architecture

Both implementations follow identical architectural patterns:

1. **WebSocket Connection Manager** - Handles real-time data feeds with automatic reconnection
2. **Message Processor** - High-performance parsing with latency measurement
3. **Storage Layer** - Redis for real-time data, PostgreSQL for historical persistence
4. **Metrics & Monitoring** - Prometheus metrics with comprehensive observability
5. **REST API** - Health checks, metrics endpoints, and configuration

## Benchmarking

The benchmark suite includes:

- **Latency Testing**: End-to-end processing time measurement
- **Throughput Testing**: Maximum sustainable message rates
- **Burst Testing**: Market open simulation with traffic spikes
- **Resource Monitoring**: CPU, memory, and network utilization
- **Stability Testing**: Long-running memory and connection stability

Results are automatically generated with side-by-side comparisons and performance visualizations.

## Technology Stack

### Python Implementation
- **Runtime**: Python 3.11+ with uvloop
- **WebSocket**: websockets library with asyncio
- **Storage**: aioredis, asyncpg
- **Monitoring**: prometheus_client, structlog

### Node.js Implementation
- **Runtime**: Node.js 18+ with native clustering
- **WebSocket**: ws library with performance optimizations
- **Storage**: ioredis, pg
- **Monitoring**: prom-client, winston

## Development

### Adding New Features

1. Create feature branch: `git checkout -b feat/feature-name`
2. Implement in both Python and Node.js applications
3. Add tests and update documentation
4. Run benchmarks to verify performance impact
5. Submit pull request with performance analysis

### Performance Guidelines

- Maintain sub-millisecond processing latency
- Ensure memory stability under sustained load
- Implement identical functionality in both platforms
- Add comprehensive metrics for all new features

## Infrastructure

### Monitoring Stack

- **Grafana**: http://localhost:3000 (admin/admin) - Metrics visualization and dashboards
- **Prometheus**: http://localhost:9090 - Metrics collection and alerting
- **Dashboard**: http://localhost:8080 - Real-time service monitoring

### Environment Configuration

The project supports multiple deployment environments:

- **Development**: Hot-reload, debug ports, verbose logging
- **Production**: Optimized resources, health checks, graceful shutdown

See [Infrastructure Documentation](infrastructure/docs/deployment.md) for detailed setup instructions.

## Documentation

- [Infrastructure Deployment Guide](infrastructure/docs/deployment.md)
- [Requirements Specification](.kiro/specs/finance-ingestion-benchmark/requirements.md)
- [Technical Design](.kiro/specs/finance-ingestion-benchmark/design.md)
- [Implementation Tasks](.kiro/specs/finance-ingestion-benchmark/tasks.md)

## License

MIT License - see LICENSE file for details.

## Contributing

Please read our contributing guidelines and ensure all benchmarks pass before submitting changes.