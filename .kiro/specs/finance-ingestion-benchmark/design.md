# Design Document

## Overview

This document outlines the technical design for two high-performance financial data ingestion systems that will be benchmarked against each other. The design ensures fair comparison by using equivalent architectures while leveraging each platform's strengths.

## Architecture

### High-Level Architecture

Both systems follow a similar multi-layered architecture:

```
┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │    │   Data Sources  │
│   (WebSocket)   │    │   (WebSocket)   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
┌─────────▼───────┐    ┌─────────▼───────┐
│  Connection     │    │  Connection     │
│  Manager        │    │  Manager        │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
┌─────────▼───────┐    ┌─────────▼───────┐
│  Message        │    │  Message        │
│  Processor      │    │  Processor      │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
┌─────────▼───────┐    ┌─────────▼───────┐
│  Storage        │    │  Storage        │
│  Layer          │    │  Layer          │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
┌─────────▼───────┐    ┌─────────▼───────┐
│  Metrics &      │    │  Metrics &      │
│  Monitoring     │    │  Monitoring     │
└─────────────────┘    └─────────────────┘
   Python Stack           Node.js Stack
```

### System Components

1. **Connection Manager**: Handles WebSocket connections, reconnection logic, and connection pooling
2. **Message Processor**: Core processing engine with latency measurement and backpressure handling  
3. **Storage Layer**: Redis for real-time data, PostgreSQL for persistence, in-memory buffers
4. **Metrics & Monitoring**: Performance tracking, logging, and observability
5. **API Layer**: REST endpoints for health checks, metrics, and configuration

## Components and Interfaces

### Python Implementation

#### Core Components

**Connection Manager (`connection_manager.py`)**
```python
class ConnectionManager:
    async def connect(self, url: str, headers: dict) -> None
    async def disconnect(self) -> None
    async def send_message(self, message: bytes) -> None
    async def receive_message(self) -> bytes
    def get_connection_stats(self) -> ConnectionStats
```

**Message Processor (`message_processor.py`)**
```python
class MessageProcessor:
    async def process_message(self, message: bytes) -> ProcessingResult
    async def handle_backpressure(self) -> None
    def get_latency_stats(self) -> LatencyStats
    def get_throughput_stats(self) -> ThroughputStats
```

**Storage Manager (`storage_manager.py`)**
```python
class StorageManager:
    async def store_realtime(self, data: MarketData) -> None
    async def store_historical(self, data: MarketData) -> None
    async def get_buffer_stats(self) -> BufferStats
```

#### Technology Stack
- **Runtime**: Python 3.11+ with uvloop event loop
- **WebSocket**: `websockets` library with asyncio
- **Serialization**: `msgpack` for binary serialization
- **Storage**: `aioredis` for Redis, `asyncpg` for PostgreSQL
- **Monitoring**: `prometheus_client` for metrics
- **Logging**: `structlog` for structured logging

### Node.js Implementation

#### Core Components

**Connection Manager (`connectionManager.js`)**
```javascript
class ConnectionManager {
    async connect(url, headers) {}
    async disconnect() {}
    async sendMessage(message) {}
    async receiveMessage() {}
    getConnectionStats() {}
}
```

**Message Processor (`messageProcessor.js`)**
```javascript
class MessageProcessor {
    async processMessage(message) {}
    async handleBackpressure() {}
    getLatencyStats() {}
    getThroughputStats() {}
}
```

**Storage Manager (`storageManager.js`)**
```javascript
class StorageManager {
    async storeRealtime(data) {}
    async storeHistorical(data) {}
    async getBufferStats() {}
}
```

#### Technology Stack
- **Runtime**: Node.js 18+ with native clustering
- **WebSocket**: `ws` library with native performance optimizations
- **Serialization**: `msgpack5` for binary serialization
- **Storage**: `ioredis` for Redis, `pg` for PostgreSQL
- **Monitoring**: `prom-client` for Prometheus metrics
- **Logging**: `winston` with JSON formatting

## Data Models

### Market Data Message Format

```json
{
  "messageId": "string",
  "timestamp": "number (nanoseconds)",
  "symbol": "string",
  "messageType": "TRADE|QUOTE|BOOK_UPDATE",
  "data": {
    "price": "number",
    "quantity": "number", 
    "side": "BUY|SELL",
    "exchange": "string"
  },
  "sequenceNumber": "number"
}
```

### Performance Metrics Schema

```json
{
  "timestamp": "number",
  "latency": {
    "p50": "number",
    "p95": "number", 
    "p99": "number",
    "p999": "number"
  },
  "throughput": {
    "messagesPerSecond": "number",
    "bytesPerSecond": "number"
  },
  "resources": {
    "cpuUsage": "number",
    "memoryUsage": "number",
    "networkIO": "object"
  }
}
```

### Database Schemas

**Redis Schema (Real-time data)**
```
Key Pattern: market:{symbol}:{timestamp}
Value: MessagePack serialized market data
TTL: 1 hour
```

**PostgreSQL Schema (Historical data)**
```sql
CREATE TABLE market_data (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    price DECIMAL(18,8),
    quantity DECIMAL(18,8),
    side VARCHAR(4),
    exchange VARCHAR(20),
    sequence_number BIGINT,
    processing_latency_ns BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp);
```

## Error Handling

### Connection Error Handling

**Reconnection Strategy**
- Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms (max)
- Jitter: ±25% random variation to prevent thundering herd
- Max reconnection attempts: 10 before alerting
- Circuit breaker pattern for persistent failures

**Message Error Handling**
- Invalid message format: Log error, increment counter, continue processing
- Processing timeout: Move to dead letter queue, alert operations
- Storage failure: Retry with exponential backoff, fallback to local buffer

### Performance Degradation Handling

**Backpressure Management**
- Monitor queue depth and processing latency
- Implement adaptive batching when under load
- Drop non-critical messages if buffers exceed thresholds
- Alert when sustained backpressure detected

## Testing Strategy

### Unit Testing

**Python Testing Stack**
- `pytest` for test framework
- `pytest-asyncio` for async test support
- `pytest-benchmark` for performance testing
- `unittest.mock` for mocking external dependencies

**Node.js Testing Stack**
- `jest` for test framework
- `supertest` for API testing
- `benchmark.js` for performance testing
- Native mocking capabilities

### Integration Testing

**Test Scenarios**
1. **Connection resilience**: Network interruption simulation
2. **Load testing**: Sustained high message rates
3. **Latency testing**: End-to-end timing validation
4. **Storage testing**: Database performance under load
5. **Memory testing**: Long-running stability tests

### Performance Testing

**Benchmark Scenarios**
1. **Baseline performance**: Single connection, moderate load
2. **High throughput**: Multiple connections, maximum sustainable rate
3. **Burst handling**: Sudden traffic spikes (market open simulation)
4. **Resource efficiency**: Memory and CPU usage under various loads
5. **Latency distribution**: P50, P95, P99, P99.9 measurements

**Test Data Generation**
- Realistic market data patterns based on historical data
- Configurable message rates and burst patterns
- Multiple symbol simulation for realistic workloads
- Replay capability for consistent benchmarking

### Monitoring and Observability

**Metrics Collection**
- Application metrics: Latency, throughput, error rates
- System metrics: CPU, memory, network, disk I/O
- Business metrics: Messages processed, symbols tracked
- Custom metrics: Queue depths, connection health

**Logging Strategy**
- Structured JSON logging for both platforms
- Correlation IDs for request tracing
- Performance-sensitive logging (async where possible)
- Log levels: ERROR, WARN, INFO, DEBUG

**Alerting Thresholds**
- Latency P99 > 5ms (warning), > 10ms (critical)
- Throughput < 8000 msg/sec (warning), < 5000 msg/sec (critical)  
- Memory usage > 80% (warning), > 95% (critical)
- Connection failures > 5/minute (warning), > 20/minute (critical)

## Deployment Architecture

### Docker Configuration

Both systems will use multi-stage Docker builds optimized for performance:

**Python Dockerfile Strategy**
```dockerfile
# Build stage with compilation
FROM python:3.11-slim as builder
# Install dependencies and compile extensions

# Runtime stage with minimal footprint  
FROM python:3.11-slim as runtime
# Copy only necessary artifacts
```

**Node.js Dockerfile Strategy**
```dockerfile
# Build stage with native compilation
FROM node:18-alpine as builder
# Install dependencies and build native modules

# Runtime stage with minimal footprint
FROM node:18-alpine as runtime  
# Copy only production dependencies
```

### Resource Allocation

**Container Limits (for fair comparison)**
- CPU: 2 cores
- Memory: 4GB
- Network: No artificial limits
- Storage: SSD-backed volumes for databases

**Infrastructure Requirements**
- Redis: Dedicated instance with 2GB memory
- PostgreSQL: Dedicated instance with appropriate connection pooling
- Monitoring: Prometheus + Grafana stack
- Load testing: Separate instance for test data generation
##
 Git Workflow Strategy

### Repository Structure and Branching

**Branch Strategy**
- `main`: Production-ready code, protected branch
- `feat/XX-feature-description`: Feature branches following conventional naming
- `fix/XX-bug-description`: Bug fix branches
- `perf/XX-optimization-description`: Performance optimization branches

**Conventional Commit Messages**
Following the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Commit Types**
- `feat`: New features
- `fix`: Bug fixes  
- `perf`: Performance improvements
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `docs`: Documentation updates
- `build`: Build system changes
- `ci`: CI/CD changes

**Example Commit Messages**
```
feat(python): add WebSocket connection manager with reconnection logic
perf(node): optimize message processing with worker threads
test(benchmark): add latency measurement test suite
docs(api): update OpenAPI specification for metrics endpoints
```

### Initial Repository Setup

**Step 1: Initialize Repository and Base Structure**
```bash
git init
git add .gitignore README.md
git commit -m "chore: initial repository setup with gitignore and readme"
```

**Step 2: Create Base Project Structure**
```bash
git add apps/ docker-compose.yml
git commit -m "feat: add base project structure for Python and Node.js implementations"
```

**Step 3: Feature Development Workflow**
```bash
# Create feature branch
git checkout -b feat/01-python-connection-manager

# Implement feature with incremental commits
git add apps/python-ingestion/connection_manager.py
git commit -m "feat(python): implement WebSocket connection manager"

git add tests/python/test_connection_manager.py  
git commit -m "test(python): add unit tests for connection manager"

# Merge back to main
git checkout main
git merge feat/01-python-connection-manager
git branch -d feat/01-python-connection-manager
```

### Git Ignore Configuration

**.gitignore**
```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST
venv/
env/
ENV/
.venv/
pip-log.txt
pip-delete-this-directory.txt

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.npm
.eslintcache
.yarn-integrity
.pnp
.pnp.js
coverage/
nyc_output/
.grunt
bower_components/
.lock-wscript
build/Release/
.nyc_output/
.node_repl_history
*.tgz
.yarn-integrity
.cache/

# IDEs and Editors
.vscode/
.idea/
*.swp
*.swo
*~
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace
*.sublime-project

# OS Generated Files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Docker
.dockerignore
docker-compose.override.yml

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime Data
pids/
*.pid
*.seed
*.pid.lock

# Database
*.db
*.sqlite
*.sqlite3

# Temporary Files
tmp/
temp/
.tmp/

# Performance and Benchmark Results
benchmark-results/
performance-logs/
*.perf
*.prof

# Redis Dumps
dump.rdb

# PostgreSQL
*.sql.backup

# Monitoring and Metrics
prometheus-data/
grafana-data/
```

### Development Workflow

**Feature Development Process**
1. Create feature branch from main: `git checkout -b feat/XX-feature-name`
2. Implement feature with atomic commits
3. Add tests with separate commit
4. Update documentation if needed
5. Run benchmarks and commit results
6. Create pull request (if using GitHub/GitLab)
7. Merge to main after review
8. Delete feature branch

**Commit Frequency Guidelines**
- Commit after each logical unit of work
- Separate commits for implementation, tests, and documentation
- Commit benchmark results separately for tracking performance changes
- Use descriptive commit messages that explain the "why" not just the "what"

**Branch Naming Convention**
- `feat/01-python-websocket-client`
- `feat/02-node-message-processor`  
- `feat/03-redis-storage-layer`
- `perf/04-optimize-serialization`
- `test/05-integration-test-suite`
- `fix/06-connection-memory-leak`

This workflow ensures:
- Clear development history
- Easy rollback of specific features
- Parallel development capability
- Performance regression tracking
- Consistent code organization