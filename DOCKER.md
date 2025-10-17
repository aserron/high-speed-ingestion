# Docker Infrastructure Guide

This document explains the containerization infrastructure for the Finance Ingestion Benchmark project.

## Overview

The project uses Docker and Docker Compose to provide consistent, isolated environments for both Python and Node.js implementations. The infrastructure includes:

- **Python Ingestion Service**: High-performance Python application with uvloop
- **Node.js Ingestion Service**: High-performance Node.js application with clustering
- **Redis**: In-memory data store for real-time market data
- **PostgreSQL**: Persistent database for historical data storage
- **Prometheus**: Metrics collection and monitoring
- **Grafana**: Visualization and dashboards

## Resource Allocation

Both ingestion services are configured with identical resource limits for fair comparison:

- **CPU**: 2 cores limit, 1 core reservation (dev) / 2 cores reservation (prod)
- **Memory**: 4GB limit, 2GB reservation (dev) / 3GB reservation (prod)

## Quick Start

### Development Environment

```bash
# Start development environment
make dev

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Build and start
make dev-build
```

### Production Environment

```bash
# Start production environment
make prod

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# Build and start
make prod-build
```

## Service Endpoints

| Service | Development | Production | Purpose |
|---------|-------------|------------|---------|
| Python Ingestion | http://localhost:8001 | http://localhost:8001 | Python API and metrics |
| Node.js Ingestion | http://localhost:8002 | http://localhost:8002 | Node.js API and metrics |
| Redis | localhost:6379 | localhost:6379 | In-memory data store |
| PostgreSQL | localhost:5432 | localhost:5432 | Historical data storage |
| Prometheus | http://localhost:9090 | http://localhost:9090 | Metrics collection |
| Grafana | http://localhost:3000 | http://localhost:3000 | Dashboards (admin/admin) |
| Dashboard | http://localhost:8080 | http://localhost:8080 | Service monitoring dashboard |
| Node.js Debugger | localhost:9229 | N/A | Development debugging |

## Docker Images

### Python Application

**Multi-stage build optimized for performance:**

- **Builder stage**: Compiles dependencies and native extensions
- **Runtime stage**: Minimal Python 3.11-slim with only runtime dependencies
- **Optimizations**: Virtual environment, non-root user, health checks
- **Size**: ~200MB (estimated)

### Node.js Application

**Multi-stage build optimized for performance:**

- **Builder stage**: Installs and builds native modules
- **Runtime stage**: Minimal Node.js 18-alpine with production dependencies
- **Optimizations**: Production node_modules, non-root user, dumb-init
- **Size**: ~150MB (estimated)

## Configuration Files

### Docker Compose Files

- `docker-compose.yml`: Base configuration with all services
- `docker-compose.dev.yml`: Development overrides (debugging, hot reload)
- `docker-compose.prod.yml`: Production overrides (restart policies, resource limits)

### Application Configuration

- `apps/python-ingestion/requirements.txt`: Python dependencies
- `apps/node-ingestion/package.json`: Node.js dependencies
- `apps/*/Dockerfile`: Multi-stage build configurations
- `apps/*/.dockerignore`: Build context optimization

### Infrastructure Configuration

- `scripts/init-db.sql`: PostgreSQL schema initialization
- `scripts/dev-seed.sql`: Development test data
- `monitoring/prometheus.yml`: Prometheus scraping configuration

## Development Features

### Hot Reload

Both applications support hot reload in development:

- **Python**: Uses `--reload` flag with uvicorn
- **Node.js**: Volume mounts source code, excludes node_modules

### Debugging

- **Python**: Standard Python debugging tools
- **Node.js**: Inspector protocol on port 9229

### Volume Mounts

Development environment mounts source code for live editing:

```yaml
volumes:
  - ./apps/python-ingestion:/app
  - /app/__pycache__  # Exclude cache
```

## Production Features

### Resource Management

Production configuration includes:

- **Restart policies**: `unless-stopped` with failure handling
- **Resource reservations**: Guaranteed CPU and memory allocation
- **Health checks**: Automatic container health monitoring

### Security

- **Non-root users**: Both applications run as non-privileged users
- **Minimal images**: Alpine Linux base for smaller attack surface
- **No development tools**: Production images exclude build dependencies

## Database Schema

### PostgreSQL Tables

- `market_data`: Historical market data storage
- `performance_metrics`: Benchmark results and performance data
- `connection_stats`: WebSocket connection monitoring

### Redis Configuration

- **Memory limit**: 2GB with LRU eviction policy
- **Persistence**: Configurable RDB snapshots
- **Key patterns**: `market:{symbol}:{timestamp}`

## Monitoring Stack

### Prometheus Metrics

Both applications export metrics on `/metrics` endpoint:

- **Latency percentiles**: p50, p95, p99, p99.9
- **Throughput**: Messages per second, bytes per second
- **Resource usage**: CPU, memory, network I/O
- **Connection stats**: WebSocket health and performance

### Grafana Dashboards

Access Grafana at http://localhost:3000 (admin/admin):

- **Performance comparison**: Side-by-side Python vs Node.js metrics
- **System resources**: CPU, memory, network utilization
- **Application metrics**: Latency distributions, throughput trends

## Makefile Commands

The included Makefile provides convenient commands:

```bash
# Development
make dev          # Start development environment
make dev-build    # Build and start development
make dev-logs     # Show development logs
make dev-down     # Stop development environment

# Production
make prod         # Start production environment
make prod-build   # Build and start production
make prod-logs    # Show production logs
make prod-down    # Stop production environment

# Testing
make test         # Run tests in both implementations
make benchmark    # Run performance benchmarks

# Utilities
make build        # Build all Docker images
make clean        # Clean up containers and volumes
make logs         # Show logs from all services
make shell-python # Open shell in Python container
make shell-node   # Open shell in Node.js container
make health       # Check service health
```

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using the ports
netstat -tulpn | grep :8001
netstat -tulpn | grep :8002

# Stop conflicting services or change ports in docker-compose.yml
```

**Build failures:**
```bash
# Clean Docker cache and rebuild
docker system prune -f
make clean
make dev-build
```

**Database connection issues:**
```bash
# Reset database volumes
make clean
docker-compose up -d postgres redis
# Wait for services to start, then start applications
```

**Memory issues:**
```bash
# Check Docker resource allocation
docker stats

# Increase Docker Desktop memory limit if needed
# Or reduce container memory limits in docker-compose files
```

### Logs and Debugging

```bash
# View logs for specific service
docker-compose logs -f python-ingestion
docker-compose logs -f node-ingestion

# Enter container for debugging
make shell-python
make shell-node

# Check container resource usage
docker stats finance-python-ingestion finance-node-ingestion
```

## Performance Considerations

### Resource Limits

The identical resource limits ensure fair comparison:

- **CPU**: 2 cores prevent one implementation from using more processing power
- **Memory**: 4GB limit tests memory efficiency under constraints
- **Network**: No artificial limits to test real network performance

### Build Optimization

- **Multi-stage builds**: Separate build and runtime stages minimize image size
- **Layer caching**: Dependencies installed before source code for better caching
- **Alpine Linux**: Smaller base images for faster startup and deployment

### Runtime Optimization

- **uvloop**: Python uses uvloop for maximum async performance
- **Native clustering**: Node.js uses built-in cluster module for multi-core usage
- **Connection pooling**: Both implementations use optimized database connections