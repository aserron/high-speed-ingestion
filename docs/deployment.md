# Production Deployment Guide

This guide covers the deployment of the Finance Ingestion Benchmark system in production environments with proper health checks, graceful shutdown handling, and monitoring.

## Overview

The Finance Ingestion Benchmark system consists of:
- **Python Ingestion Service** - FastAPI-based ingestion system
- **Node.js Ingestion Service** - Express-based ingestion system  
- **Redis** - High-speed in-memory storage
- **PostgreSQL** - Historical data persistence
- **Prometheus** - Metrics collection
- **Grafana** - Visualization and dashboards

## Prerequisites

### System Requirements
- **CPU**: Minimum 4 cores, recommended 8+ cores
- **Memory**: Minimum 8GB RAM, recommended 16GB+ RAM
- **Storage**: Minimum 20GB free space, recommended SSD
- **Network**: Stable internet connection for container image downloads

### Software Requirements
- **Docker**: Version 20.10+ 
- **Docker Compose**: Version 2.0+ (or legacy 1.29+)
- **Operating System**: Linux (Ubuntu 20.04+), macOS (10.15+), or Windows 10/11

### Network Requirements
- **Ports**: 8001, 8002, 3000, 5432, 6379, 9090 must be available
- **Firewall**: Configure firewall rules for external access if needed

## Quick Start

### Linux/macOS Deployment

```bash
# Clone the repository
git clone <repository-url>
cd finance-ingestion-benchmark

# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy the system
./scripts/deploy.sh deploy
```

### Windows Deployment

```powershell
# Clone the repository
git clone <repository-url>
cd finance-ingestion-benchmark

# Run deployment script
.\scripts\deploy.ps1 deploy
```

## Deployment Scripts

### Linux/macOS Script (`scripts/deploy.sh`)

The bash deployment script provides the following commands:

```bash
./scripts/deploy.sh {deploy|status|stop|rollback|health}
```

**Commands:**
- `deploy` - Full deployment with health checks
- `status` - Show current deployment status
- `stop` - Graceful shutdown of services
- `rollback` - Rollback current deployment
- `health` - Wait for services to become healthy

### Windows Script (`scripts/deploy.ps1`)

The PowerShell deployment script provides the same functionality:

```powershell
.\scripts\deploy.ps1 {deploy|status|stop|rollback|health}
```

## Configuration

### Environment Variables

The system supports the following environment variables for production configuration:

#### Global Configuration
- `NODE_ENV=production` - Set production environment
- `LOG_LEVEL=INFO` - Set logging level (DEBUG, INFO, WARN, ERROR)
- `GRACEFUL_SHUTDOWN_TIMEOUT=30` - Shutdown timeout in seconds

#### Database Configuration
- `POSTGRES_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

#### API Configuration
- `API_HOST=0.0.0.0` - API server host
- `API_PORT=8000` - API server port

### Docker Compose Configuration

The system uses a multi-file Docker Compose setup:

1. **`docker-compose.yml`** - Base configuration
2. **`docker-compose.prod.yml`** - Production overrides
3. **`docker-compose.dev.yml`** - Development overrides

Production deployment uses:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Health Checks

### Container Health Checks

All services include comprehensive health checks:

#### Python Ingestion Service
```yaml
healthcheck:
  test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health', timeout=5)"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

#### Node.js Ingestion Service
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/health', {timeout: 5000}, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

#### Redis
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

#### PostgreSQL
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres -d finance_benchmark"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### API Health Endpoints

Both ingestion services provide comprehensive health endpoints:

#### Health Check Endpoint
```
GET /health
```

Returns detailed health status including:
- Overall system status
- Component health (storage, metrics, API)
- Uptime information
- Response time metrics

Example response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptimeSeconds": 3600,
  "components": {
    "storage": {
      "status": "healthy",
      "redis_writes": 1000,
      "postgres_writes": 500
    },
    "metrics": {
      "status": "healthy",
      "active_correlation_ids": 10
    }
  },
  "responseTimeMs": 5.2
}
```

## Graceful Shutdown

### Container Orchestration

The system implements proper graceful shutdown handling:

#### Stop Grace Periods
- **Python/Node.js Services**: 30 seconds
- **PostgreSQL**: 30 seconds
- **Redis**: 10 seconds
- **Prometheus/Grafana**: 15 seconds

#### Signal Handling

Both ingestion services handle shutdown signals properly:

**Python Service:**
- `SIGTERM` - Graceful shutdown
- `SIGINT` - Graceful shutdown (Ctrl+C)
- `SIGUSR1` - Configuration reload

**Node.js Service:**
- `SIGTERM` - Graceful shutdown
- `SIGINT` - Graceful shutdown (Ctrl+C)
- `SIGUSR2` - Graceful restart

### Shutdown Process

1. **Signal Reception** - Service receives shutdown signal
2. **Stop Accepting Requests** - API server stops accepting new requests
3. **Complete Active Requests** - Finish processing active requests
4. **Close Connections** - Close database and Redis connections
5. **Cleanup Resources** - Release file handles and memory
6. **Exit Process** - Clean process termination

## Monitoring and Observability

### Service URLs

After successful deployment, the following services are available:

- **Python API**: http://localhost:8001
  - Health: http://localhost:8001/health
  - Metrics: http://localhost:8001/metrics
  - Documentation: http://localhost:8001/docs

- **Node.js API**: http://localhost:8002
  - Health: http://localhost:8002/health
  - Metrics: http://localhost:8002/metrics
  - Documentation: http://localhost:8002/docs

- **Prometheus**: http://localhost:9090
  - Targets: http://localhost:9090/targets
  - Health: http://localhost:9090/-/healthy

- **Grafana**: http://localhost:3000
  - Default credentials: admin/admin
  - Health: http://localhost:3000/api/health

### Metrics Collection

Both services export Prometheus-compatible metrics:

#### Application Metrics
- Request rates and latencies
- Error rates and types
- Resource utilization
- Business metrics (messages processed, etc.)

#### Infrastructure Metrics
- Container resource usage
- Database connection pools
- Cache hit rates
- Network I/O

### Log Management

Logs are available through Docker:

```bash
# View all service logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs python-ingestion

# Follow logs in real-time
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

Deployment script logs are available at:
- **Linux/macOS**: `logs/deployment.log`
- **Windows**: `logs\deployment.log`

## Troubleshooting

### Common Issues

#### Services Not Starting
1. Check Docker daemon is running
2. Verify port availability
3. Check system resources (CPU, memory)
4. Review service logs for errors

#### Health Check Failures
1. Wait for full startup (services have start_period)
2. Check network connectivity between containers
3. Verify database initialization completed
4. Review application logs for startup errors

#### Performance Issues
1. Monitor resource usage with `docker stats`
2. Check database connection pool settings
3. Review Redis memory usage and eviction policy
4. Analyze application metrics in Grafana

### Diagnostic Commands

```bash
# Check container status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Check container resource usage
docker stats

# Check container health
docker inspect <container_name> | grep -A 10 Health

# Check service logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs <service_name>

# Test API endpoints
curl http://localhost:8001/health
curl http://localhost:8002/health
```

### Recovery Procedures

#### Service Recovery
```bash
# Restart specific service
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart <service_name>

# Rebuild and restart service
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build <service_name>
```

#### Full System Recovery
```bash
# Stop all services
./scripts/deploy.sh stop

# Clean up containers and volumes (WARNING: Data loss)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down -v

# Redeploy system
./scripts/deploy.sh deploy
```

## Security Considerations

### Container Security
- Services run as non-root users
- Minimal base images (Alpine Linux)
- No unnecessary packages installed
- Resource limits configured

### Network Security
- Services communicate through Docker network
- External access only through defined ports
- Consider using reverse proxy for production

### Data Security
- Database credentials should be managed via secrets
- Consider encryption for data at rest
- Regular security updates for base images

## Performance Tuning

### Resource Allocation
- Adjust CPU and memory limits in docker-compose.prod.yml
- Monitor resource usage and scale accordingly
- Consider horizontal scaling for high load

### Database Optimization
- Tune PostgreSQL configuration for workload
- Optimize Redis memory settings
- Monitor connection pool usage

### Application Tuning
- Adjust worker processes/threads
- Tune garbage collection settings
- Optimize batch sizes and timeouts

## Backup and Recovery

### Data Backup
```bash
# Backup PostgreSQL data
docker exec finance-postgres pg_dump -U postgres finance_benchmark > backup.sql

# Backup Redis data (if persistence enabled)
docker exec finance-redis redis-cli BGSAVE
```

### Configuration Backup
- Version control all configuration files
- Document environment-specific settings
- Maintain deployment runbooks

## Scaling Considerations

### Horizontal Scaling
- Use Docker Swarm or Kubernetes for orchestration
- Implement load balancing for API services
- Consider database read replicas

### Vertical Scaling
- Increase container resource limits
- Optimize application configuration
- Monitor bottlenecks and scale accordingly

## Support and Maintenance

### Regular Maintenance
- Update base images regularly
- Monitor security advisories
- Review and rotate credentials
- Clean up unused Docker resources

### Monitoring Checklist
- [ ] All services healthy
- [ ] API endpoints responding
- [ ] Database connections stable
- [ ] Metrics being collected
- [ ] Logs being generated
- [ ] Disk space available
- [ ] Memory usage normal
- [ ] CPU usage acceptable

For additional support, review the application logs and metrics dashboards, or consult the development team.