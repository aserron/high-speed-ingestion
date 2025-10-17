# Environment Configuration Guide

## Overview

The finance ingestion benchmark supports multiple deployment environments with different configurations optimized for their specific use cases.

## Environment Comparison

| Feature | Development | Production |
|---------|-------------|------------|
| **Hot Reload** | ✅ Enabled | ❌ Disabled |
| **Debug Ports** | ✅ Exposed | ❌ Not exposed |
| **Resource Limits** | 🔽 Relaxed | 🔼 Optimized |
| **Logging Level** | `debug` | `info` |
| **Health Checks** | ❌ Basic | ✅ Comprehensive |
| **Volume Mounts** | ✅ Source code | ❌ None |
| **Restart Policy** | `no` | `unless-stopped` |
| **Memory Limits** | 2GB per service | 4GB per service |
| **CPU Limits** | 1.0 per service | 2.0 per service |

## Development Environment

### Purpose
- Local development and testing
- Hot-reload for rapid iteration
- Debug capabilities
- Verbose logging for troubleshooting

### Configuration
```bash
# Start development environment
npm run docker:dev

# Or manually
docker-compose -f infrastructure/docker/docker-compose.base.yml -f docker-compose.dev.yml up -d
```

### Features
- **Volume Mounts**: Source code mounted for hot-reload
- **Debug Ports**: Node.js inspector on port 9229
- **Development Database**: Separate dev database with seed data
- **Relaxed Resources**: Lower memory and CPU limits
- **Verbose Logging**: Debug-level logging for all services

### Environment Variables
```bash
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
POSTGRES_DB=finance_benchmark_dev
ENABLE_HOT_RELOAD=true
ENABLE_DEBUG_PORTS=true
```

## Production Environment

### Purpose
- Production deployment
- Optimized performance
- Enhanced security
- Comprehensive monitoring

### Configuration
```bash
# Start production environment
npm run docker:prod

# Or manually
docker-compose -f infrastructure/docker/docker-compose.base.yml -f docker-compose.prod.yml up -d
```

### Features
- **No Volume Mounts**: Containers run with built-in code
- **Health Checks**: Comprehensive health monitoring
- **Resource Optimization**: Higher limits with reservations
- **Graceful Shutdown**: Proper signal handling
- **Production Logging**: Info-level logging with structured output

### Environment Variables
```bash
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info
POSTGRES_DB=finance_benchmark
ENABLE_HOT_RELOAD=false
ENABLE_DEBUG_PORTS=false
GRACEFUL_SHUTDOWN_TIMEOUT=30
```

## Service-Specific Differences

### Python Ingestion Service

**Development:**
```yaml
volumes:
  - ./apps/python-ingestion:/app
  - /app/__pycache__  # Exclude cache
environment:
  - DEBUG=true
  - LOG_LEVEL=DEBUG
  - RELOAD=true
command: ["python", "-m", "uvicorn", "app:app", "--reload"]
```

**Production:**
```yaml
volumes: []  # No volumes
environment:
  - LOG_LEVEL=INFO
  - GRACEFUL_SHUTDOWN_TIMEOUT=30
healthcheck:
  test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health')"]
restart: unless-stopped
```

### Node.js Ingestion Service

**Development:**
```yaml
volumes:
  - ./apps/node-ingestion:/app
  - /app/node_modules  # Exclude node_modules
environment:
  - NODE_ENV=development
  - DEBUG=true
ports:
  - "9229:9229"  # Debug port
command: ["node", "--inspect=0.0.0.0:9229", "simple-app.js"]
```

**Production:**
```yaml
volumes: []  # No volumes
environment:
  - NODE_ENV=production
  - GRACEFUL_SHUTDOWN_TIMEOUT=30
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/health')"]
restart: unless-stopped
```

### Infrastructure Services

**Redis:**
- **Dev**: 1GB memory limit, basic persistence
- **Prod**: 2GB memory limit, comprehensive persistence, health checks

**PostgreSQL:**
- **Dev**: Includes seed data, relaxed settings
- **Prod**: Production-optimized settings, no seed data

**Monitoring:**
- **Dev**: Basic monitoring, no alerting
- **Prod**: Full monitoring stack with alerting

## Environment Variables Reference

### Required Variables

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `NODE_ENV` | `development` | `production` | Application environment |
| `LOG_LEVEL` | `debug` | `info` | Logging verbosity |
| `POSTGRES_PASSWORD` | `postgres` | **CHANGE THIS** | Database password |
| `REDIS_URL` | `redis://redis:6379` | `redis://redis:6379` | Redis connection |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GRACEFUL_SHUTDOWN_TIMEOUT` | `30` | Shutdown timeout in seconds |
| `HEALTH_CHECK_INTERVAL` | `30s` | Health check frequency |
| `PYTHON_CPU_LIMIT` | `2.0` | Python service CPU limit |
| `NODE_MEMORY_LIMIT` | `4G` | Node.js service memory limit |

## Switching Between Environments

### From Development to Production
1. Stop development environment: `npm run docker:down`
2. Update environment variables (especially passwords)
3. Start production environment: `npm run docker:prod`
4. Verify health checks: `curl http://localhost:8001/health`

### From Production to Development
1. Stop production environment: `npm run docker:down`
2. Start development environment: `npm run docker:dev`
3. Verify hot-reload is working

## Security Considerations

### Development
- Default passwords are acceptable
- Debug ports can be exposed
- Verbose logging is helpful
- Volume mounts are necessary

### Production
- **MUST** change default passwords
- **NEVER** expose debug ports
- Minimize logging verbosity
- Remove all volume mounts
- Enable health checks
- Configure proper restart policies

## Performance Considerations

### Development
- Prioritize developer experience
- Accept performance overhead for features
- Use relaxed resource limits
- Enable debugging capabilities

### Production
- Optimize for performance and stability
- Use appropriate resource limits
- Enable comprehensive monitoring
- Implement graceful shutdown handling

## Troubleshooting

### Environment Detection
```bash
# Check which environment is running
docker-compose ps
docker inspect finance-python-ingestion | grep -i env
```

### Common Issues
1. **Port conflicts**: Check if ports are already in use
2. **Volume permissions**: Ensure proper file permissions in development
3. **Resource limits**: Monitor resource usage in production
4. **Health check failures**: Verify service startup in production