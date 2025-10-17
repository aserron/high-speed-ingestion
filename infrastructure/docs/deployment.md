# Infrastructure Deployment Guide

## Overview

This guide covers deploying the finance ingestion benchmark infrastructure using the consolidated Docker configuration structure.

## Quick Start

### Development Environment
```bash
# Start development environment with hot-reload
npm run docker:dev

# Or using Docker Compose directly
docker-compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml up -d
```

### Production Environment
```bash
# Start production environment
npm run docker:prod

# Or using Docker Compose directly
docker-compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.prod.yml up -d
```

## Environment Setup

### 1. Environment Variables

Copy and customize environment templates:

**Development:**
```bash
cp infrastructure/docker/environments/.env.dev.template .env.dev
# Edit .env.dev with your development settings
```

**Production:**
```bash
cp infrastructure/docker/environments/.env.prod.template .env.prod
# Edit .env.prod with your production settings
# IMPORTANT: Change default passwords!
```

### 2. Required Environment Variables

| Variable | Description | Dev Default | Prod Default |
|----------|-------------|-------------|--------------|
| `NODE_ENV` | Application environment | `development` | `production` |
| `LOG_LEVEL` | Logging level | `debug` | `info` |
| `POSTGRES_PASSWORD` | Database password | `postgres` | **CHANGE THIS** |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` | `redis://redis:6379` |

## Service Architecture

### Core Services

1. **Python Ingestion** (port 8001)
   - High-performance Python implementation
   - Uses uvloop for async processing
   - Metrics endpoint: `/metrics`

2. **Node.js Ingestion** (port 8002)
   - Node.js implementation with clustering
   - Native performance optimizations
   - Metrics endpoint: `/metrics`

3. **Dashboard** (port 8080)
   - Real-time monitoring interface
   - Service health checks
   - Performance metrics visualization

### Infrastructure Services

1. **Redis** (port 6379)
   - In-memory data store
   - Message queuing
   - Session storage

2. **PostgreSQL** (port 5432)
   - Historical data persistence
   - Benchmark results storage
   - Audit logs

3. **Prometheus** (port 9090)
   - Metrics collection
   - Alert rule evaluation
   - Time-series database

4. **Grafana** (port 3000)
   - Metrics visualization
   - Dashboard management
   - Alert notifications

## Deployment Commands

### Basic Operations
```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Clean up (removes volumes)
npm run docker:clean
```

### Environment-Specific Operations
```bash
# Development with hot-reload
npm run docker:dev

# Production optimized
npm run docker:prod

# Build images
npm run docker:build
```

### Health Checks
```bash
# Check service health
curl http://localhost:8001/health  # Python service
curl http://localhost:8002/health  # Node.js service
curl http://localhost:8080/health  # Dashboard

# Check infrastructure
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3000/api/health # Grafana
```

## Monitoring Setup

### Accessing Monitoring Tools

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Dashboard**: http://localhost:8080

### Default Dashboards

1. **Finance Ingestion Overview**
   - Service health status
   - Message processing rates
   - Processing latency metrics

### Alert Configuration

Alerts are configured for:
- Service downtime (> 30 seconds)
- High processing latency (> 1ms)
- Low message rates (< 100 msg/sec)
- Infrastructure failures

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :8001
   
   # Stop conflicting services
   docker-compose down
   ```

2. **Volume Permissions**
   ```bash
   # Fix volume permissions
   sudo chown -R $USER:$USER ./data
   ```

3. **Memory Issues**
   ```bash
   # Check Docker memory usage
   docker stats
   
   # Increase Docker memory limit in Docker Desktop
   ```

### Log Analysis
```bash
# View specific service logs
docker-compose logs python-ingestion
docker-compose logs node-ingestion
docker-compose logs redis
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f --tail=100
```

### Performance Tuning

**Development:**
- Reduced resource limits
- Hot-reload enabled
- Debug ports exposed
- Verbose logging

**Production:**
- Optimized resource allocation
- Health checks enabled
- Graceful shutdown handling
- Production logging levels

## Security Considerations

### Production Checklist

- [ ] Change default passwords
- [ ] Configure proper network security
- [ ] Enable SSL/TLS for external access
- [ ] Set up proper backup procedures
- [ ] Configure log rotation
- [ ] Review resource limits
- [ ] Enable security scanning

### Network Security
```bash
# Create custom network (optional)
docker network create finance-network --driver bridge

# Restrict external access
# Only expose necessary ports to host
```

## Backup and Recovery

### Database Backup
```bash
# PostgreSQL backup
docker exec finance-postgres pg_dump -U postgres finance_benchmark > backup.sql

# Redis backup
docker exec finance-redis redis-cli BGSAVE
```

### Configuration Backup
```bash
# Backup all configurations
tar -czf infrastructure-backup.tar.gz infrastructure/ docker-compose*.yml
```

## Scaling Considerations

### Horizontal Scaling
- Use Docker Swarm or Kubernetes for multi-node deployment
- Configure load balancing for ingestion services
- Set up Redis clustering for high availability
- Use PostgreSQL replication for read scaling

### Vertical Scaling
- Adjust resource limits in compose files
- Monitor resource usage with Grafana
- Scale based on benchmark requirements