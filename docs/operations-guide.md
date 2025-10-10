# Operations Guide

This comprehensive guide covers the operational aspects of the Finance Ingestion Benchmark system, including deployment, monitoring, maintenance, and troubleshooting procedures.

## Table of Contents

1. [System Overview](#system-overview)
2. [Deployment Procedures](#deployment-procedures)
3. [Monitoring and Observability](#monitoring-and-observability)
4. [Performance Management](#performance-management)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Backup and Recovery](#backup-and-recovery)
7. [Security Operations](#security-operations)
8. [Troubleshooting](#troubleshooting)

## System Overview

### Architecture Components

The Finance Ingestion Benchmark system consists of the following components:

#### Core Applications
- **Python Ingestion Service** - FastAPI-based high-performance ingestion system
- **Node.js Ingestion Service** - Express-based high-performance ingestion system

#### Storage Layer
- **Redis** - High-speed in-memory storage for real-time data
- **PostgreSQL** - Persistent storage for historical data

#### Monitoring Stack
- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and alerting dashboards

#### Supporting Services
- **WebSocket Simulator** - Test data feed for benchmarking
- **Load Balancer** - Traffic distribution (production deployments)

### Data Flow

```
WebSocket Feed → Ingestion Service → Message Processor → Storage Layer
                      ↓
                 Metrics Collection → Prometheus → Grafana
```

## Deployment Procedures

### Prerequisites

#### System Requirements
- **CPU**: Minimum 8 cores, recommended 16+ cores for production
- **Memory**: Minimum 16GB RAM, recommended 32GB+ for production
- **Storage**: Minimum 100GB SSD, recommended 500GB+ NVMe SSD
- **Network**: 10Gbps network interface for high-throughput scenarios

#### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Linux kernel 5.4+ (for optimal performance)

### Deployment Steps

#### 1. Environment Preparation

```bash
# Clone repository
git clone <repository-url>
cd finance-ingestion-benchmark

# Set environment variables
export ENVIRONMENT=production
export LOG_LEVEL=INFO
export METRICS_ENABLED=true
```

#### 2. Configuration

Create environment-specific configuration files:

```bash
# Production configuration
cp .env.example .env.production
```

Edit `.env.production` with production values:
```env
# Database Configuration
POSTGRES_URL=postgresql://user:password@postgres:5432/finance_benchmark
REDIS_URL=redis://redis:6379

# Performance Configuration
MAX_CONNECTIONS=1000
WORKER_PROCESSES=8
BATCH_SIZE=100

# Security Configuration
API_KEY_REQUIRED=true
TLS_ENABLED=true
```

#### 3. Service Deployment

```bash
# Deploy with production configuration
./scripts/deploy.sh deploy

# Verify deployment
./scripts/deploy.sh status
```

#### 4. Health Verification

```bash
# Run health checks
./scripts/health-check.sh all

# Verify API endpoints
curl http://localhost:8001/health  # Python service
curl http://localhost:8002/health  # Node.js service
```

### Scaling Procedures

#### Horizontal Scaling

For high-throughput scenarios, deploy multiple instances:

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  python-ingestion:
    deploy:
      replicas: 3
  node-ingestion:
    deploy:
      replicas: 3
```

Deploy scaled configuration:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.scale.yml up -d
```

#### Vertical Scaling

Adjust resource limits in `docker-compose.prod.yml`:

```yaml
services:
  python-ingestion:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '4.0'
          memory: 6G
```

## Monitoring and Observability

### Key Metrics

#### Application Metrics
- **Message Processing Rate** - Messages processed per second
- **Processing Latency** - End-to-end message processing time
- **Error Rate** - Percentage of failed message processing attempts
- **Connection Health** - WebSocket connection status and stability

#### System Metrics
- **CPU Utilization** - Per-core and aggregate CPU usage
- **Memory Usage** - Heap, RSS, and total memory consumption
- **Network I/O** - Bytes sent/received, connection counts
- **Disk I/O** - Read/write operations and throughput

#### Business Metrics
- **Data Throughput** - Total data volume processed
- **Market Coverage** - Number of symbols/exchanges processed
- **Data Quality** - Message validation success rate

### Alerting Rules

#### Critical Alerts
- **Service Down** - Any core service becomes unavailable
- **High Error Rate** - Error rate exceeds 5% for 5 minutes
- **Memory Leak** - Memory usage increases >20% over 1 hour
- **Disk Space** - Available disk space <10%

#### Warning Alerts
- **High Latency** - P95 latency exceeds 10ms for 10 minutes
- **Connection Issues** - WebSocket reconnections >5 per minute
- **Resource Usage** - CPU/Memory usage >80% for 15 minutes

### Dashboard Configuration

#### Grafana Dashboards

1. **System Overview Dashboard**
   - Service health status
   - Key performance indicators
   - Resource utilization summary

2. **Performance Dashboard**
   - Message processing rates
   - Latency distributions
   - Throughput trends

3. **Infrastructure Dashboard**
   - System resource usage
   - Network and disk I/O
   - Container health

### Log Management

#### Log Levels
- **ERROR** - System errors requiring immediate attention
- **WARN** - Potential issues that should be monitored
- **INFO** - General operational information
- **DEBUG** - Detailed diagnostic information (development only)

#### Log Aggregation

Configure centralized logging:

```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  python-ingestion:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"
```

## Performance Management

### Performance Tuning

#### Operating System Tuning

```bash
# Network performance
echo 'net.core.rmem_max = 134217728' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 134217728' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_rmem = 4096 87380 134217728' >> /etc/sysctl.conf

# File descriptor limits
echo '* soft nofile 65536' >> /etc/security/limits.conf
echo '* hard nofile 65536' >> /etc/security/limits.conf

# Apply changes
sysctl -p
```

#### Application Tuning

**Python Configuration:**
```python
# config/production.py
UVLOOP_ENABLED = True
WORKER_PROCESSES = 8
MAX_CONNECTIONS = 1000
BATCH_SIZE = 100
BUFFER_SIZE = 10000
```

**Node.js Configuration:**
```javascript
// config/production.js
module.exports = {
  cluster: {
    workers: 8,
    maxRestarts: 3
  },
  performance: {
    maxConnections: 1000,
    batchSize: 100,
    bufferSize: 10000
  }
}
```

#### Database Tuning

**PostgreSQL Configuration:**
```sql
-- postgresql.conf
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 256MB
maintenance_work_mem = 1GB
max_connections = 200
```

**Redis Configuration:**
```conf
# redis.conf
maxmemory 8gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Performance Monitoring

#### Continuous Monitoring

Set up automated performance monitoring:

```bash
# Performance monitoring script
#!/bin/bash
while true; do
    # Collect metrics
    curl -s http://localhost:8001/stats > /tmp/python-stats.json
    curl -s http://localhost:8002/stats > /tmp/nodejs-stats.json
    
    # Analyze performance
    python3 scripts/analyze_performance.py
    
    sleep 60
done
```

#### Performance Baselines

Establish performance baselines:

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Processing Rate | >10,000 msg/sec | >5,000 msg/sec | <1,000 msg/sec |
| P95 Latency | <1ms | <5ms | >10ms |
| Error Rate | <0.1% | <1% | >5% |
| Memory Growth | <5%/hour | <10%/hour | >20%/hour |

## Maintenance Procedures

### Regular Maintenance

#### Daily Tasks
- [ ] Check service health status
- [ ] Review error logs for anomalies
- [ ] Verify backup completion
- [ ] Monitor resource usage trends

#### Weekly Tasks
- [ ] Analyze performance trends
- [ ] Review and rotate logs
- [ ] Update security patches
- [ ] Test disaster recovery procedures

#### Monthly Tasks
- [ ] Performance capacity planning
- [ ] Security audit and review
- [ ] Update documentation
- [ ] Conduct failover testing

### Update Procedures

#### Application Updates

```bash
# 1. Backup current state
./scripts/backup.sh create

# 2. Deploy new version
git checkout v2.0.0
./scripts/deploy.sh deploy

# 3. Verify deployment
./scripts/health-check.sh all

# 4. Run smoke tests
./scripts/run_e2e_tests.sh
```

#### Database Migrations

```bash
# PostgreSQL migrations
docker exec finance-postgres psql -U postgres -d finance_benchmark -f migrations/v2.0.0.sql

# Verify migration
docker exec finance-postgres psql -U postgres -d finance_benchmark -c "SELECT version FROM schema_version;"
```

### Capacity Planning

#### Growth Projections

Monitor and project capacity needs:

```python
# capacity_planning.py
def calculate_capacity_needs(current_load, growth_rate, time_horizon):
    """Calculate future capacity requirements"""
    future_load = current_load * (1 + growth_rate) ** time_horizon
    return {
        'cpu_cores': future_load * 0.1,  # 0.1 cores per 1000 msg/sec
        'memory_gb': future_load * 0.5,  # 0.5GB per 1000 msg/sec
        'storage_gb': future_load * 10   # 10GB per 1000 msg/sec daily
    }
```

## Backup and Recovery

### Backup Procedures

#### Database Backups

```bash
# PostgreSQL backup
docker exec finance-postgres pg_dump -U postgres finance_benchmark > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
docker exec finance-redis redis-cli BGSAVE
docker cp finance-redis:/data/dump.rdb backup_redis_$(date +%Y%m%d_%H%M%S).rdb
```

#### Configuration Backups

```bash
# Backup all configuration files
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    docker-compose*.yml \
    .env* \
    config/ \
    scripts/
```

### Recovery Procedures

#### Service Recovery

```bash
# 1. Stop affected services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml stop

# 2. Restore from backup
./scripts/restore.sh backup_20240115_120000.tar.gz

# 3. Restart services
./scripts/deploy.sh deploy

# 4. Verify recovery
./scripts/health-check.sh all
```

#### Database Recovery

```bash
# PostgreSQL recovery
docker exec -i finance-postgres psql -U postgres -d finance_benchmark < backup_20240115_120000.sql

# Redis recovery
docker cp backup_redis_20240115_120000.rdb finance-redis:/data/dump.rdb
docker restart finance-redis
```

## Security Operations

### Security Monitoring

#### Access Control
- Monitor API access patterns
- Review authentication logs
- Audit user permissions

#### Network Security
- Monitor network traffic patterns
- Review firewall logs
- Scan for vulnerabilities

### Security Procedures

#### Certificate Management

```bash
# Generate TLS certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Update certificate configuration
cp cert.pem config/tls/
cp key.pem config/tls/
```

#### Security Updates

```bash
# Update base images
docker pull python:3.11-slim
docker pull node:18-alpine
docker pull redis:7-alpine
docker pull postgres:15-alpine

# Rebuild with updated images
./scripts/deploy.sh deploy
```

## Troubleshooting

### Common Issues

#### High Memory Usage

**Symptoms:**
- Memory usage continuously increasing
- Out of memory errors
- Slow performance

**Diagnosis:**
```bash
# Check memory usage
docker stats
free -h
cat /proc/meminfo
```

**Resolution:**
1. Restart affected services
2. Adjust memory limits
3. Investigate memory leaks

#### Connection Issues

**Symptoms:**
- WebSocket connection failures
- Database connection errors
- API timeouts

**Diagnosis:**
```bash
# Check network connectivity
netstat -an | grep LISTEN
telnet localhost 8080
curl -v http://localhost:8001/health
```

**Resolution:**
1. Verify service status
2. Check firewall rules
3. Restart networking services

#### Performance Degradation

**Symptoms:**
- Increased latency
- Reduced throughput
- High CPU usage

**Diagnosis:**
```bash
# Performance analysis
top -p $(pgrep -f "python|node")
iostat -x 1
sar -u 1 10
```

**Resolution:**
1. Identify bottlenecks
2. Scale resources
3. Optimize configuration

### Emergency Procedures

#### Service Outage

1. **Immediate Response**
   - Check service status
   - Review recent changes
   - Implement quick fixes

2. **Investigation**
   - Collect logs and metrics
   - Identify root cause
   - Document findings

3. **Recovery**
   - Implement permanent fix
   - Test thoroughly
   - Update procedures

#### Data Loss

1. **Assessment**
   - Determine scope of loss
   - Identify last good backup
   - Estimate recovery time

2. **Recovery**
   - Restore from backup
   - Verify data integrity
   - Resume operations

3. **Post-Recovery**
   - Analyze cause
   - Improve backup procedures
   - Update documentation

### Support Contacts

#### Internal Team
- **Operations Team**: ops@company.com
- **Development Team**: dev@company.com
- **Security Team**: security@company.com

#### External Vendors
- **Cloud Provider**: support@cloudprovider.com
- **Database Vendor**: support@database.com
- **Monitoring Vendor**: support@monitoring.com

---

This operations guide should be reviewed and updated regularly to reflect changes in the system architecture, procedures, and lessons learned from operational experience.