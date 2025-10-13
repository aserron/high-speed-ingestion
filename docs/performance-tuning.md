# Performance Tuning Guide

This guide provides comprehensive recommendations for optimizing the performance of the Finance Ingestion Benchmark system to achieve maximum throughput and minimum latency.

## Table of Contents

1. [Performance Targets](#performance-targets)
2. [System-Level Optimizations](#system-level-optimizations)
3. [Application-Level Tuning](#application-level-tuning)
4. [Database Optimization](#database-optimization)
5. [Network Optimization](#network-optimization)
6. [Monitoring and Profiling](#monitoring-and-profiling)
7. [Benchmarking Methodology](#benchmarking-methodology)

## Performance Targets

### Primary Objectives

| Metric | Target | Acceptable | Critical Threshold |
|--------|--------|------------|-------------------|
| **Message Processing Rate** | >10,000 msg/sec | >5,000 msg/sec | <1,000 msg/sec |
| **End-to-End Latency (P95)** | <1ms | <5ms | >10ms |
| **End-to-End Latency (P99)** | <2ms | <10ms | >20ms |
| **Error Rate** | <0.01% | <0.1% | >1% |
| **Memory Growth Rate** | <2%/hour | <5%/hour | >10%/hour |
| **CPU Utilization** | 60-80% | <90% | >95% |
| **Connection Stability** | >99.9% uptime | >99% uptime | <95% uptime |

### Secondary Objectives

- **Startup Time**: <30 seconds for full system
- **Recovery Time**: <10 seconds for connection recovery
- **Resource Efficiency**: <4GB RAM per 10,000 msg/sec
- **Scalability**: Linear scaling up to 100,000 msg/sec

## System-Level Optimizations

### Operating System Tuning

#### Kernel Parameters

```bash
# /etc/sysctl.conf - Network performance optimizations

# TCP buffer sizes
net.core.rmem_default = 262144
net.core.rmem_max = 134217728
net.core.wmem_default = 262144
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Connection handling
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_syncookies = 1

# Memory management
vm.swappiness = 1
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# File descriptor limits
fs.file-max = 2097152

# Apply changes
sysctl -p
```

#### Process Limits

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768

# For systemd services
# /etc/systemd/system.conf
DefaultLimitNOFILE=65536
DefaultLimitNPROC=32768
```

#### CPU Optimization

```bash
# CPU governor for performance
echo performance | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Disable CPU frequency scaling
systemctl disable ondemand

# NUMA optimization
echo 0 > /proc/sys/kernel/numa_balancing

# IRQ affinity for network interfaces
echo 2 > /proc/irq/24/smp_affinity  # Adjust IRQ number as needed
```

#### Memory Optimization

```bash
# Huge pages configuration
echo 1024 > /proc/sys/vm/nr_hugepages

# Memory overcommit
echo 1 > /proc/sys/vm/overcommit_memory
echo 80 > /proc/sys/vm/overcommit_ratio

# Transparent huge pages
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

### Container Optimization

#### Docker Configuration

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
```

#### Resource Allocation

```yaml
# docker-compose.performance.yml
version: '3.8'
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
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    sysctls:
      - net.core.somaxconn=65535
```

## Application-Level Tuning

### Python Application Optimization

#### Runtime Configuration

```python
# config/performance.py
import os

# Event loop optimization
UVLOOP_ENABLED = True
ASYNCIO_DEBUG = False

# Worker configuration
WORKER_PROCESSES = min(8, os.cpu_count())
WORKER_CONNECTIONS = 1000
MAX_REQUESTS = 10000
MAX_REQUESTS_JITTER = 1000

# Message processing
BATCH_SIZE = 100
BUFFER_SIZE = 10000
PROCESSING_TIMEOUT = 1.0  # seconds

# Memory management
GC_THRESHOLD = (700, 10, 10)
MAX_MEMORY_USAGE = 4 * 1024 * 1024 * 1024  # 4GB

# Connection pooling
REDIS_POOL_SIZE = 20
POSTGRES_POOL_SIZE = 20
WEBSOCKET_POOL_SIZE = 10
```

#### Code Optimizations

```python
# High-performance message processing
import asyncio
import uvloop
from concurrent.futures import ThreadPoolExecutor

class OptimizedMessageProcessor:
    def __init__(self):
        # Use uvloop for better performance
        if uvloop:
            asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
        
        # Thread pool for CPU-intensive tasks
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Pre-allocate buffers
        self.message_buffer = bytearray(1024 * 1024)  # 1MB buffer
        
    async def process_batch(self, messages):
        """Process messages in batches for better throughput"""
        tasks = []
        for batch in self.chunk_messages(messages, 100):
            task = asyncio.create_task(self.process_message_batch(batch))
            tasks.append(task)
        
        await asyncio.gather(*tasks)
    
    def chunk_messages(self, messages, chunk_size):
        """Split messages into chunks"""
        for i in range(0, len(messages), chunk_size):
            yield messages[i:i + chunk_size]
```

#### Memory Management

```python
# Memory optimization techniques
import gc
import weakref
from pympler import tracker

class MemoryOptimizedProcessor:
    def __init__(self):
        # Disable automatic garbage collection
        gc.disable()
        
        # Set custom GC thresholds
        gc.set_threshold(700, 10, 10)
        
        # Memory tracking
        self.memory_tracker = tracker.SummaryTracker()
        
    def periodic_gc(self):
        """Perform periodic garbage collection"""
        collected = gc.collect()
        if collected > 0:
            self.logger.debug(f"Garbage collected {collected} objects")
    
    def check_memory_usage(self):
        """Monitor memory usage"""
        import psutil
        process = psutil.Process()
        memory_info = process.memory_info()
        
        if memory_info.rss > self.max_memory:
            self.logger.warning("Memory usage exceeds threshold")
            self.periodic_gc()
```

### Node.js Application Optimization

#### Runtime Configuration

```javascript
// config/performance.js
module.exports = {
  // V8 optimization flags
  nodeOptions: [
    '--max-old-space-size=4096',
    '--max-new-space-size=1024',
    '--optimize-for-size',
    '--gc-interval=100'
  ],
  
  // Cluster configuration
  cluster: {
    workers: Math.min(8, require('os').cpus().length),
    maxRestarts: 3,
    restartDelay: 1000
  },
  
  // Event loop optimization
  eventLoop: {
    maxLatency: 10, // milliseconds
    sampleInterval: 1000
  },
  
  // Connection handling
  server: {
    maxConnections: 1000,
    keepAliveTimeout: 65000,
    headersTimeout: 66000
  },
  
  // Message processing
  processing: {
    batchSize: 100,
    bufferSize: 10000,
    timeout: 1000
  }
}
```

#### Performance Optimizations

```javascript
// High-performance message processing
const cluster = require('cluster')
const { performance } = require('perf_hooks')

class OptimizedMessageProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 100
    this.processingQueue = []
    this.isProcessing = false
    
    // Pre-allocate buffers
    this.messageBuffer = Buffer.allocUnsafe(1024 * 1024) // 1MB
    
    // Setup batch processing
    this.setupBatchProcessing()
  }
  
  setupBatchProcessing() {
    // Process messages in batches every 10ms
    setInterval(() => {
      if (this.processingQueue.length > 0 && !this.isProcessing) {
        this.processBatch()
      }
    }, 10)
  }
  
  async processBatch() {
    if (this.isProcessing) return
    
    this.isProcessing = true
    const batch = this.processingQueue.splice(0, this.batchSize)
    
    try {
      // Process batch in parallel
      const promises = batch.map(message => this.processMessage(message))
      await Promise.all(promises)
    } finally {
      this.isProcessing = false
    }
  }
}
```

#### Memory Management

```javascript
// Memory optimization for Node.js
class MemoryManager {
  constructor() {
    this.memoryThreshold = 3 * 1024 * 1024 * 1024 // 3GB
    this.gcInterval = 60000 // 1 minute
    
    this.setupMemoryMonitoring()
  }
  
  setupMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage()
      
      if (memUsage.heapUsed > this.memoryThreshold) {
        this.logger.warn('Memory usage high, triggering GC')
        global.gc && global.gc()
      }
      
      // Log memory statistics
      this.logger.debug('Memory usage', {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      })
    }, this.gcInterval)
  }
}
```

## Database Optimization

### PostgreSQL Tuning

#### Configuration Parameters

```sql
-- postgresql.conf
# Memory settings
shared_buffers = 4GB                    # 25% of total RAM
effective_cache_size = 12GB             # 75% of total RAM
work_mem = 256MB                        # Per connection
maintenance_work_mem = 1GB              # For maintenance operations

# Connection settings
max_connections = 200                   # Adjust based on workload
superuser_reserved_connections = 3

# Write-ahead logging
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Query planner
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD storage

# Logging
log_min_duration_statement = 1000       # Log slow queries
log_checkpoints = on
log_connections = on
log_disconnections = on
```

#### Index Optimization

```sql
-- Create optimized indexes for financial data
CREATE INDEX CONCURRENTLY idx_market_data_timestamp 
ON market_data USING BRIN (timestamp);

CREATE INDEX CONCURRENTLY idx_market_data_symbol_timestamp 
ON market_data (symbol, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_market_data_exchange 
ON market_data (exchange) WHERE exchange IS NOT NULL;

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY idx_market_data_recent 
ON market_data (timestamp DESC) 
WHERE timestamp > NOW() - INTERVAL '1 day';
```

#### Connection Pooling

```python
# Python connection pooling with asyncpg
import asyncpg
from asyncpg.pool import Pool

async def create_optimized_pool():
    return await asyncpg.create_pool(
        dsn="postgresql://user:pass@host/db",
        min_size=10,
        max_size=20,
        max_queries=50000,
        max_inactive_connection_lifetime=300,
        command_timeout=60
    )
```

### Redis Optimization

#### Configuration

```conf
# redis.conf
# Memory management
maxmemory 8gb
maxmemory-policy allkeys-lru
maxmemory-samples 10

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error no

# Network
tcp-keepalive 300
timeout 0

# Performance
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
```

#### Connection Optimization

```python
# Redis connection pooling
import aioredis
from aioredis.pool import ConnectionPool

async def create_redis_pool():
    return ConnectionPool.from_url(
        "redis://localhost:6379",
        max_connections=20,
        retry_on_timeout=True,
        socket_keepalive=True,
        socket_keepalive_options={
            1: 1,  # TCP_KEEPIDLE
            2: 3,  # TCP_KEEPINTVL
            3: 5   # TCP_KEEPCNT
        }
    )
```

## Network Optimization

### WebSocket Optimization

#### Connection Configuration

```python
# Python WebSocket optimization
import websockets

async def create_optimized_websocket():
    return await websockets.connect(
        uri="wss://example.com/feed",
        max_size=10 * 1024 * 1024,  # 10MB max message size
        max_queue=100,               # Message queue size
        read_limit=2**20,           # 1MB read buffer
        write_limit=2**20,          # 1MB write buffer
        ping_interval=20,           # Ping every 20 seconds
        ping_timeout=10,            # Ping timeout
        close_timeout=10            # Close timeout
    )
```

```javascript
// Node.js WebSocket optimization
const WebSocket = require('ws')

const ws = new WebSocket('wss://example.com/feed', {
  maxPayload: 10 * 1024 * 1024,  // 10MB
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 10,
    memLevel: 8
  },
  handshakeTimeout: 30000,
  followRedirects: true
})
```

#### Message Compression

```python
# Enable compression for large messages
import zlib
import msgpack

def compress_message(data):
    """Compress message data"""
    packed = msgpack.packb(data)
    if len(packed) > 1024:  # Compress if > 1KB
        return zlib.compress(packed, level=6)
    return packed

def decompress_message(data):
    """Decompress message data"""
    try:
        return msgpack.unpackb(zlib.decompress(data))
    except zlib.error:
        return msgpack.unpackb(data)
```

### Load Balancing

#### HAProxy Configuration

```conf
# haproxy.cfg
global
    maxconn 4096
    nbproc 2
    cpu-map 1 0
    cpu-map 2 1

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog

frontend finance_ingestion
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/finance.pem
    redirect scheme https if !{ ssl_fc }
    default_backend ingestion_servers

backend ingestion_servers
    balance roundrobin
    option httpchk GET /health
    server python1 python-ingestion-1:8000 check
    server python2 python-ingestion-2:8000 check
    server nodejs1 node-ingestion-1:8000 check
    server nodejs2 node-ingestion-2:8000 check
```

## Monitoring and Profiling

### Performance Monitoring

#### Application Metrics

```python
# Python performance monitoring
import time
import psutil
from prometheus_client import Counter, Histogram, Gauge

# Metrics
message_counter = Counter('messages_processed_total', 'Total messages processed')
latency_histogram = Histogram('processing_latency_seconds', 'Message processing latency')
memory_gauge = Gauge('memory_usage_bytes', 'Current memory usage')

class PerformanceMonitor:
    def __init__(self):
        self.start_time = time.time()
        
    def record_message_processed(self, processing_time):
        message_counter.inc()
        latency_histogram.observe(processing_time)
        
    def update_memory_usage(self):
        process = psutil.Process()
        memory_gauge.set(process.memory_info().rss)
```

#### System Monitoring

```bash
# System performance monitoring script
#!/bin/bash

# CPU usage
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

# Memory usage
echo "Memory Usage:"
free -m | awk 'NR==2{printf "%.2f%%\n", $3*100/$2}'

# Disk I/O
echo "Disk I/O:"
iostat -x 1 1 | tail -n +4

# Network I/O
echo "Network I/O:"
sar -n DEV 1 1 | grep -E "(eth0|ens|enp)"
```

### Profiling Tools

#### Python Profiling

```python
# CPU profiling with cProfile
import cProfile
import pstats
from functools import wraps

def profile_function(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        profiler = cProfile.Profile()
        profiler.enable()
        result = func(*args, **kwargs)
        profiler.disable()
        
        stats = pstats.Stats(profiler)
        stats.sort_stats('cumulative')
        stats.print_stats(10)  # Top 10 functions
        
        return result
    return wrapper

# Memory profiling with memory_profiler
from memory_profiler import profile

@profile
def memory_intensive_function():
    # Function to profile
    pass
```

#### Node.js Profiling

```javascript
// CPU profiling with built-in profiler
const { performance, PerformanceObserver } = require('perf_hooks')

// Setup performance observer
const obs = new PerformanceObserver((list) => {
  const entries = list.getEntries()
  entries.forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`)
  })
})
obs.observe({ entryTypes: ['measure'] })

// Profile function execution
function profileFunction(name, fn) {
  return function(...args) {
    performance.mark(`${name}-start`)
    const result = fn.apply(this, args)
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)
    return result
  }
}
```

## Benchmarking Methodology

### Benchmark Configuration

#### Test Environment

```yaml
# benchmark-config.yml
environment:
  cpu_cores: 8
  memory_gb: 16
  storage_type: "NVMe SSD"
  network_bandwidth: "10Gbps"

test_scenarios:
  - name: "baseline"
    message_rate: 1000
    duration: 300  # 5 minutes
    
  - name: "high_load"
    message_rate: 10000
    duration: 600  # 10 minutes
    
  - name: "burst_load"
    message_rate: 50000
    duration: 60   # 1 minute
    
  - name: "sustained_load"
    message_rate: 5000
    duration: 3600 # 1 hour
```

#### Benchmark Execution

```python
# Automated benchmark runner
import asyncio
import time
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class BenchmarkResult:
    scenario: str
    duration: float
    messages_processed: int
    avg_latency: float
    p95_latency: float
    p99_latency: float
    error_rate: float
    throughput: float

class BenchmarkRunner:
    def __init__(self, config):
        self.config = config
        self.results: List[BenchmarkResult] = []
    
    async def run_benchmark(self, scenario):
        """Run a single benchmark scenario"""
        print(f"Running benchmark: {scenario['name']}")
        
        # Setup test environment
        await self.setup_test_environment()
        
        # Run test
        start_time = time.time()
        result = await self.execute_test(scenario)
        end_time = time.time()
        
        # Collect results
        benchmark_result = BenchmarkResult(
            scenario=scenario['name'],
            duration=end_time - start_time,
            **result
        )
        
        self.results.append(benchmark_result)
        return benchmark_result
    
    async def run_all_benchmarks(self):
        """Run all benchmark scenarios"""
        for scenario in self.config['test_scenarios']:
            await self.run_benchmark(scenario)
        
        return self.generate_report()
```

### Performance Analysis

#### Statistical Analysis

```python
# Performance analysis tools
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

class PerformanceAnalyzer:
    def __init__(self, results):
        self.results = pd.DataFrame(results)
    
    def analyze_latency_distribution(self):
        """Analyze latency distribution"""
        latencies = self.results['latencies']
        
        return {
            'mean': np.mean(latencies),
            'median': np.median(latencies),
            'p95': np.percentile(latencies, 95),
            'p99': np.percentile(latencies, 99),
            'p99.9': np.percentile(latencies, 99.9),
            'std': np.std(latencies)
        }
    
    def compare_implementations(self):
        """Compare Python vs Node.js performance"""
        python_results = self.results[self.results['implementation'] == 'python']
        nodejs_results = self.results[self.results['implementation'] == 'nodejs']
        
        comparison = {
            'throughput_ratio': nodejs_results['throughput'].mean() / python_results['throughput'].mean(),
            'latency_ratio': python_results['avg_latency'].mean() / nodejs_results['avg_latency'].mean(),
            'memory_efficiency': python_results['memory_usage'].mean() / nodejs_results['memory_usage'].mean()
        }
        
        return comparison
```

### Continuous Performance Testing

#### Automated Performance CI/CD

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  performance-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup test environment
      run: |
        docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d
        
    - name: Run performance benchmarks
      run: |
        ./scripts/run_performance_tests.sh
        
    - name: Analyze results
      run: |
        python scripts/analyze_performance.py
        
    - name: Upload results
      uses: actions/upload-artifact@v2
      with:
        name: performance-results
        path: reports/performance-*.json
```

This performance tuning guide provides comprehensive recommendations for optimizing every aspect of the Finance Ingestion Benchmark system. Regular application of these optimizations and continuous monitoring will ensure the system maintains peak performance under all operating conditions.