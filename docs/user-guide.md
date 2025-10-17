# Finance Ingestion Benchmark - User Guide

This comprehensive guide will teach you how to use the Finance Ingestion Benchmark project, from initial setup to running benchmarks and monitoring performance.

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Requirements](#system-requirements)
3. [Installation and Setup](#installation-and-setup)
4. [Running the Systems](#running-the-systems)
5. [Monitoring and Observability](#monitoring-and-observability)
6. [Running Benchmarks](#running-benchmarks)
7. [Configuration Options](#configuration-options)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Usage](#advanced-usage)

## Quick Start

### 30-Second Demo

```bash
# 1. Clone and setup
git clone <repository-url>
cd finance-ingestion-benchmark

# 2. Start the system (one command!)
./scripts/deploy.sh deploy

# 3. Check status
./scripts/deploy.sh status

# 4. View dashboards
open http://localhost:8080  # Service monitoring dashboard
open http://localhost:3000  # Grafana (admin/admin)
open http://localhost:8001/docs  # Python API docs
open http://localhost:8002/docs  # Node.js API docs
```

That's it! You now have both Python and Node.js ingestion systems running with full monitoring.

## System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 20.04+), macOS (10.15+), or Windows 10/11
- **CPU**: 4 cores
- **Memory**: 8GB RAM
- **Storage**: 20GB free space
- **Network**: Stable internet connection

### Recommended for Performance Testing
- **CPU**: 8+ cores
- **Memory**: 16GB+ RAM
- **Storage**: NVMe SSD
- **Network**: 1Gbps+ connection

### Software Dependencies
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: For cloning the repository

## Installation and Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd finance-ingestion-benchmark
```

### Step 2: Verify Prerequisites

```bash
# Check Docker
docker --version
docker-compose --version

# Check system resources
free -h  # Memory
df -h    # Disk space
nproc    # CPU cores
```

### Step 3: Initial Setup

```bash
# Make scripts executable (Linux/macOS)
chmod +x scripts/*.sh

# Or use PowerShell on Windows
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 4: Deploy the System

#### Option A: Linux/macOS
```bash
./scripts/deploy.sh deploy
```

#### Option B: Windows
```powershell
.\scripts\deploy.ps1 deploy
```

#### Option C: Manual Docker Compose
```bash
# Development environment
docker-compose up -d

# Production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Step 5: Verify Installation

```bash
# Check all services are running
./scripts/health-check.sh all

# Or check manually
curl http://localhost:8001/health  # Python service
curl http://localhost:8002/health  # Node.js service
```

## Running the Systems

### Understanding the Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  WebSocket      │───▶│  Ingestion       │───▶│  Storage        │
│  Data Feed      │    │  Service         │    │  Layer          │
│                 │    │  (Python/Node)   │    │  (Redis+PG)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Monitoring      │
                       │  (Prometheus+    │
                       │   Grafana)       │
                       └──────────────────┘
```

### Service Overview

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| **Python Ingestion** | 8001 | High-performance Python ingestion | http://localhost:8001 |
| **Node.js Ingestion** | 8002 | High-performance Node.js ingestion | http://localhost:8002 |
| **Redis** | 6379 | Real-time data storage | redis://localhost:6379 |
| **PostgreSQL** | 5432 | Historical data storage | postgresql://localhost:5432 |
| **Prometheus** | 9090 | Metrics collection | http://localhost:9090 |
| **Grafana** | 3000 | Visualization dashboards | http://localhost:3000 |
| **Dashboard** | 8080 | Service monitoring dashboard | http://localhost:8080 |

### Starting Individual Services

```bash
# Start only Python service
docker-compose up -d python-ingestion redis postgres

# Start only Node.js service
docker-compose up -d node-ingestion redis postgres

# Start monitoring stack
docker-compose up -d prometheus grafana
```

### Stopping Services

```bash
# Graceful shutdown
./scripts/deploy.sh stop

# Force stop
docker-compose down

# Stop and remove volumes (⚠️ Data loss!)
docker-compose down -v
```

## Monitoring and Observability

### Grafana Dashboards

1. **Access Grafana**: http://localhost:3000
2. **Login**: admin/admin (change on first login)
3. **Import Dashboards**: Pre-configured dashboards for both systems

#### Key Dashboards
- **System Overview**: High-level health and performance
- **Python Performance**: Detailed Python metrics
- **Node.js Performance**: Detailed Node.js metrics
- **Infrastructure**: Resource utilization and health

### Prometheus Metrics

**Access**: http://localhost:9090

#### Key Metrics to Monitor
```promql
# Message processing rate
rate(messages_processed_total[5m])

# Processing latency (95th percentile)
histogram_quantile(0.95, rate(processing_latency_seconds_bucket[5m]))

# Error rate
rate(errors_total[5m]) / rate(requests_total[5m])

# Memory usage
memory_usage_bytes / memory_limit_bytes
```

### API Endpoints for Monitoring

#### Python Service (Port 8001)
```bash
# Health check
curl http://localhost:8001/health

# Prometheus metrics
curl http://localhost:8001/metrics

# Real-time stats
curl http://localhost:8001/stats | jq

# Latency breakdown
curl http://localhost:8001/stats/latency | jq

# Storage statistics
curl http://localhost:8001/stats/storage | jq
```

#### Node.js Service (Port 8002)
```bash
# Health check
curl http://localhost:8002/health

# Prometheus metrics
curl http://localhost:8002/metrics

# Real-time stats
curl http://localhost:8002/stats | jq

# Performance statistics
curl http://localhost:8002/stats/performance | jq
```

### Log Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f python-ingestion
docker-compose logs -f node-ingestion

# View recent errors
docker-compose logs --since=10m 2>&1 | grep -i error

# Follow logs with timestamps
docker-compose logs -f -t
```

## Running Benchmarks

### Quick Benchmark

```bash
# Run comprehensive benchmarks
./scripts/run_e2e_tests.sh

# Run Python benchmarks only
python3 benchmarks/run_benchmarks.py --implementation python

# Run Node.js benchmarks only
node benchmarks/run_benchmarks.js --implementation nodejs
```

### Custom Benchmark Scenarios

#### High Throughput Test
```bash
# Test with 10,000 messages/second for 5 minutes
python3 benchmarks/run_benchmarks.py \
  --rate 10000 \
  --duration 300 \
  --implementation both
```

#### Latency Test
```bash
# Test latency with burst patterns
python3 benchmarks/run_benchmarks.py \
  --scenario burst \
  --duration 60 \
  --implementation both
```

#### Memory Stress Test
```bash
# Extended test for memory stability
python3 benchmarks/run_benchmarks.py \
  --scenario memory_stress \
  --duration 3600 \
  --implementation both
```

### Benchmark Results

Results are saved to:
- **Reports**: `reports/benchmark-results-{timestamp}.json`
- **Charts**: `reports/performance-charts-{timestamp}.html`
- **Logs**: `logs/benchmark-{timestamp}.log`

#### Reading Results
```bash
# View latest benchmark results
cat reports/benchmark-results-*.json | jq '.summary'

# Generate comparison report
python3 benchmarks/reporting.py --compare --latest 2
```

## Configuration Options

### Environment Variables

Create `.env` file for custom configuration:

```env
# Database Configuration
POSTGRES_URL=postgresql://user:pass@localhost:5432/finance_benchmark
REDIS_URL=redis://localhost:6379

# Performance Tuning
WORKER_PROCESSES=8
BATCH_SIZE=100
BUFFER_SIZE=10000

# Monitoring
LOG_LEVEL=INFO
METRICS_ENABLED=true
PROMETHEUS_PORT=9090

# Security
API_KEY_REQUIRED=false
TLS_ENABLED=false
```

### Python Configuration

Edit `apps/python-ingestion/config/production.py`:

```python
# Performance settings
UVLOOP_ENABLED = True
WORKER_PROCESSES = 8
MAX_CONNECTIONS = 1000

# Message processing
BATCH_SIZE = 100
PROCESSING_TIMEOUT = 1.0

# Storage settings
REDIS_POOL_SIZE = 20
POSTGRES_POOL_SIZE = 20
```

### Node.js Configuration

Edit `apps/node-ingestion/config/production.js`:

```javascript
module.exports = {
  // Cluster settings
  cluster: {
    workers: 8,
    maxRestarts: 3
  },
  
  // Performance settings
  performance: {
    maxConnections: 1000,
    batchSize: 100,
    bufferSize: 10000
  },
  
  // Node.js options
  nodeOptions: [
    '--max-old-space-size=4096'
  ]
}
```

### Docker Resource Limits

Edit `docker-compose.prod.yml`:

```yaml
services:
  python-ingestion:
    deploy:
      resources:
        limits:
          cpus: '4.0'      # Adjust CPU limit
          memory: 8G       # Adjust memory limit
        reservations:
          cpus: '4.0'
          memory: 6G
```

## Testing

### Unit Tests

```bash
# Run Python unit tests
cd apps/python-ingestion
python -m pytest tests/ -v

# Run Node.js unit tests
cd apps/node-ingestion
npm test
```

### Integration Tests

```bash
# Run integration test suite
python3 tests/integration/run_integration_tests.py

# Run specific integration test
python3 tests/integration/test_end_to_end.py
```

### End-to-End Tests

```bash
# Comprehensive E2E tests
./scripts/run_e2e_tests.sh

# Python E2E tests only
python3 tests/e2e/test_complete_integration.py

# Node.js E2E tests only
node tests/e2e/test_complete_integration.js
```

### Load Testing

```bash
# Start WebSocket simulator
python3 tests/integration/websocket_simulator.py --port 8080 --rate 5000

# Run load test scenarios
python3 tests/integration/test_load_scenarios.py
```

## Troubleshooting

### Common Issues and Solutions

#### Services Won't Start
```bash
# Check Docker daemon
docker info

# Check port conflicts
netstat -tulpn | grep -E ':(8001|8002|3000|5432|6379|9090)'

# Check logs for errors
docker-compose logs python-ingestion
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Check system resources
top
free -h
iostat -x 1

# Check application metrics
curl http://localhost:8001/stats | jq '.performance'
```

#### Connection Issues
```bash
# Test WebSocket connectivity
wscat -c ws://localhost:8080/market-data

# Test database connectivity
docker exec finance-postgres pg_isready
docker exec finance-redis redis-cli ping

# Check network connectivity
curl -v http://localhost:8001/health
```

#### Memory Issues
```bash
# Check memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Check for memory leaks
docker exec python-ingestion python -c "
import psutil
print(f'Memory: {psutil.virtual_memory().percent}%')
"
```

### Getting Help

1. **Check Logs**: Always start with service logs
2. **Health Checks**: Use built-in health check endpoints
3. **Documentation**: Refer to the troubleshooting guide
4. **Metrics**: Check Grafana dashboards for insights

## Advanced Usage

### Custom Data Sources

#### WebSocket Data Feed
```python
# Create custom WebSocket data feed
import asyncio
import websockets
import json

async def custom_data_feed():
    async with websockets.serve(handler, "localhost", 8080):
        await asyncio.Future()  # Run forever

async def handler(websocket, path):
    while True:
        # Send custom market data
        data = {
            "symbol": "AAPL",
            "price": 150.00,
            "timestamp": time.time_ns()
        }
        await websocket.send(json.dumps(data))
        await asyncio.sleep(0.001)  # 1000 msg/sec
```

### Performance Optimization

#### System Tuning
```bash
# Optimize network settings
echo 'net.core.rmem_max = 134217728' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 134217728' >> /etc/sysctl.conf
sysctl -p

# Optimize file descriptors
echo '* soft nofile 65536' >> /etc/security/limits.conf
echo '* hard nofile 65536' >> /etc/security/limits.conf
```

#### Application Tuning
```python
# Python optimization
import gc
gc.set_threshold(1000, 15, 15)  # Reduce GC frequency

# Use object pooling for high-frequency objects
from queue import Queue

message_pool = Queue(maxsize=1000)
```

### Scaling Deployment

#### Horizontal Scaling
```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  python-ingestion:
    deploy:
      replicas: 4  # Scale to 4 instances
      
  node-ingestion:
    deploy:
      replicas: 4  # Scale to 4 instances
```

```bash
# Deploy scaled configuration
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

#### Load Balancing
```bash
# Use HAProxy for load balancing
docker run -d --name haproxy \
  -p 80:80 \
  -v $(pwd)/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg \
  haproxy:latest
```

### Custom Metrics

#### Adding Custom Metrics (Python)
```python
from prometheus_client import Counter, Histogram

# Custom metrics
custom_counter = Counter('custom_messages_total', 'Custom message counter')
custom_histogram = Histogram('custom_processing_time', 'Custom processing time')

# Use in your code
custom_counter.inc()
custom_histogram.observe(processing_time)
```

#### Adding Custom Metrics (Node.js)
```javascript
const client = require('prom-client');

// Custom metrics
const customCounter = new client.Counter({
  name: 'custom_messages_total',
  help: 'Custom message counter'
});

const customHistogram = new client.Histogram({
  name: 'custom_processing_time',
  help: 'Custom processing time'
});

// Use in your code
customCounter.inc();
customHistogram.observe(processingTime);
```

### Integration with External Systems

#### Kafka Integration
```python
# Add Kafka producer
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda x: json.dumps(x).encode('utf-8')
)

# Send processed messages to Kafka
producer.send('financial-data', processed_message)
```

#### REST API Integration
```python
# Add REST API endpoints
@app.post("/ingest")
async def ingest_data(data: dict):
    """Custom ingestion endpoint"""
    await process_message(data)
    return {"status": "processed"}
```

## Next Steps

1. **Start Simple**: Begin with the quick start guide
2. **Monitor Everything**: Set up Grafana dashboards
3. **Run Benchmarks**: Understand your system's performance
4. **Optimize**: Use performance tuning recommendations
5. **Scale**: Implement horizontal scaling as needed
6. **Customize**: Adapt the system to your specific needs

For more detailed information, refer to:
- **Operations Guide**: Complete deployment procedures
- **Performance Tuning Guide**: Optimization recommendations
- **Troubleshooting Guide**: Problem resolution procedures
- **Benchmark Analysis**: Performance comparison methodology

Happy ingesting! 🚀