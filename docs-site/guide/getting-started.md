# Getting Started

This guide will walk you through setting up and running your first benchmark with the Finance Ingestion Benchmark project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm 8+
- **Python 3.11+** with pip
- **Docker** and Docker Compose
- **Git** for version control

::: tip System Requirements
For optimal performance, we recommend:
- 8GB+ RAM
- 4+ CPU cores
- SSD storage
- Stable internet connection for WebSocket testing
:::

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd finance-ingestion-benchmark
```

### 2. Install Dependencies

The project uses a monorepo structure with both Node.js and Python components:

```bash
# Install Node.js dependencies (includes Turborepo)
npm install

# Install Python dependencies for the ingestion app
cd apps/python-ingestion
pip install -r requirements.txt
cd ../..

# Install Node.js dependencies for the ingestion app
cd apps/node-ingestion
npm install
cd ../..
```

### 3. Start Infrastructure Services

The benchmark requires Redis and PostgreSQL. Use Docker Compose to start them:

```bash
# Start Redis and PostgreSQL
npm run docker:up

# Verify services are running
docker-compose ps
```

You should see output similar to:
```
Name                    Command               State           Ports
------------------------------------------------------------------------
benchmark_postgres_1    docker-entrypoint.sh postgres    Up      0.0.0.0:5432->5432/tcp
benchmark_redis_1       docker-entrypoint.sh redis ...   Up      0.0.0.0:6379->6379/tcp
```

### 4. Initialize Applications

Set up the database schema and initial configuration:

```bash
# Initialize both applications
npm run setup

# Or initialize individually
npm run setup:python
npm run setup:node
```

## Your First Benchmark Run

### 1. Start the Applications

Run both implementations in development mode:

::: code-group

```bash [Both Applications]
# Start both Python and Node.js implementations
npm run dev
```

```bash [Python Only]
# Start only the Python implementation
npm run dev:python
```

```bash [Node.js Only]
# Start only the Node.js implementation
npm run dev:node
```

:::

You should see output indicating both applications are running:

```
[Python] Starting Finance Ingestion (Python) on port 3001
[Node.js] Starting Finance Ingestion (Node.js) on port 3002
[Python] Connected to Redis at localhost:6379
[Node.js] Connected to Redis at localhost:6379
[Python] Connected to PostgreSQL at localhost:5432
[Node.js] Connected to PostgreSQL at localhost:5432
```

### 2. Verify Health Status

Check that both applications are healthy:

```bash
# Check Python application health
curl http://localhost:3001/health

# Check Node.js application health  
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 45.123,
  "connections": {
    "redis": "connected",
    "postgresql": "connected",
    "websocket": "disconnected"
  }
}
```

### 3. Run a Simple Benchmark

Execute a basic latency test to verify everything is working:

```bash
# Run a quick latency benchmark
npm run benchmark:quick

# Or run the full benchmark suite (takes longer)
npm run benchmark
```

The benchmark will:
1. Start a WebSocket data simulator
2. Connect both applications to the simulator
3. Send test market data messages
4. Measure and compare performance
5. Generate a report

### 4. View Results

After the benchmark completes, you'll see a summary report:

```
Finance Ingestion Benchmark Results
===================================

Test Duration: 60 seconds
Message Rate: 1,000 msg/sec
Total Messages: 60,000

Python Implementation:
  P50 Latency: 0.45ms
  P95 Latency: 0.78ms  
  P99 Latency: 1.23ms
  Throughput: 1,000 msg/sec
  Memory Usage: 145MB
  CPU Usage: 25%

Node.js Implementation:
  P50 Latency: 0.38ms
  P95 Latency: 0.65ms
  P99 Latency: 0.95ms  
  Throughput: 1,000 msg/sec
  Memory Usage: 118MB
  CPU Usage: 22%

Winner: Node.js (lower latency and memory usage)
```

Detailed results are saved to `benchmark-results/` directory.

## Interactive Demo

Try the interactive WebSocket connection demo:

<div class="interactive-demo">
  <div class="demo-controls">
    <button class="demo-button" onclick="connectDemo()">Connect</button>
    <button class="demo-button" onclick="sendMessage()">Send Message</button>
    <button class="demo-button" onclick="disconnectDemo()">Disconnect</button>
    <button class="demo-button" onclick="clearOutput()">Clear</button>
  </div>
  <div class="demo-output" id="demo-output">
Click "Connect" to start the WebSocket demo...
  </div>
</div>

<script>
let demoWs = null;
let messageCount = 0;

function connectDemo() {
  const output = document.getElementById('demo-output');
  
  if (demoWs) {
    output.textContent += '\nAlready connected!';
    return;
  }
  
  // Simulate WebSocket connection (in real implementation, this would connect to your local server)
  output.textContent += '\nConnecting to ws://localhost:8080...\n';
  
  setTimeout(() => {
    output.textContent += 'Connected successfully!\n';
    demoWs = { readyState: 1 }; // Mock WebSocket
  }, 500);
}

function sendMessage() {
  const output = document.getElementById('demo-output');
  
  if (!demoWs) {
    output.textContent += '\nNot connected! Click "Connect" first.\n';
    return;
  }
  
  messageCount++;
  const message = {
    messageId: `msg_${messageCount}`,
    timestamp: Date.now() * 1000000, // nanoseconds
    symbol: 'AAPL',
    messageType: 'TRADE',
    data: {
      price: 150.25 + Math.random() * 10,
      quantity: Math.floor(Math.random() * 1000) + 100,
      side: Math.random() > 0.5 ? 'BUY' : 'SELL',
      exchange: 'NASDAQ'
    }
  };
  
  output.textContent += `\nSent: ${JSON.stringify(message, null, 2)}\n`;
  
  // Simulate processing latency
  setTimeout(() => {
    const latency = (Math.random() * 0.5 + 0.2).toFixed(3);
    output.textContent += `Processed in ${latency}ms\n`;
  }, 100);
}

function disconnectDemo() {
  const output = document.getElementById('demo-output');
  
  if (!demoWs) {
    output.textContent += '\nNot connected!\n';
    return;
  }
  
  output.textContent += '\nDisconnecting...\n';
  demoWs = null;
  messageCount = 0;
  
  setTimeout(() => {
    output.textContent += 'Disconnected.\n';
  }, 300);
}

function clearOutput() {
  document.getElementById('demo-output').textContent = 'Output cleared. Click "Connect" to start...';
}
</script>

## Understanding the Output

### Application Logs

Both applications provide structured JSON logging:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Message processed",
  "messageId": "msg_12345",
  "symbol": "AAPL", 
  "latency_ns": 450000,
  "throughput_msg_per_sec": 1000
}
```

### Metrics Endpoints

Access real-time metrics via REST APIs:

```bash
# Python metrics (Prometheus format)
curl http://localhost:3001/metrics

# Node.js metrics (Prometheus format)  
curl http://localhost:3002/metrics

# Human-readable stats
curl http://localhost:3001/stats
curl http://localhost:3002/stats
```

### Performance Data

Key metrics to monitor:

| Metric | Description | Good Value |
|--------|-------------|------------|
| **P99 Latency** | 99th percentile processing time | < 1ms |
| **Throughput** | Messages processed per second | > 10,000 |
| **Memory Usage** | Resident memory consumption | Stable over time |
| **CPU Usage** | Processor utilization | < 80% under load |
| **Connection Health** | WebSocket connection status | Always connected |

## Common Issues and Solutions

### Port Conflicts

If you see "port already in use" errors:

```bash
# Check what's using the ports
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002

# Kill processes if needed
pkill -f "python.*finance_ingestion"
pkill -f "node.*finance_ingestion"
```

### Database Connection Issues

If applications can't connect to Redis or PostgreSQL:

```bash
# Check Docker services
docker-compose ps

# Restart services if needed
npm run docker:down
npm run docker:up

# Check logs
docker-compose logs redis
docker-compose logs postgres
```

### Python Environment Issues

If Python dependencies fail to install:

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd apps/python-ingestion
pip install -r requirements.txt
```

### Node.js Module Issues

If Node.js modules fail to install:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

Now that you have the basic setup working:

1. **[Configuration Guide](/guide/configuration)** - Customize settings for your environment
2. **[Architecture Overview](/architecture/overview)** - Understand the system design
3. **[Benchmark Analysis](/benchmarks/overview)** - Deep dive into performance results
4. **[Development Guide](/guide/development)** - Contribute to the project

## Development Workflow

For ongoing development:

```bash
# Start development with hot reload
npm run dev

# Run tests
npm run test

# Run linting
npm run lint

# Build for production
npm run build

# Run production containers
npm run docker:prod
```

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](/guide/troubleshooting)
2. Review [GitHub Issues](https://github.com/finance-ingestion-benchmark/issues)
3. Join our [Discord Community](https://discord.gg/finance-ingestion-benchmark)
4. Read the [FAQ](/guide/faq)

::: tip Pro Tip
Enable debug logging for more detailed output:
```bash
DEBUG=* npm run dev
```
:::

Congratulations! You've successfully set up and run your first Finance Ingestion Benchmark. The system is now ready for more advanced testing and customization.

<CrossReference 
  title="Next Steps"
  :links="[
    {
      url: '/guide/configuration',
      title: 'Configuration Guide',
      description: 'Customize settings for your environment',
      icon: '⚙️'
    },
    {
      url: '/architecture/overview',
      title: 'Architecture Overview',
      description: 'Understand the system design',
      icon: '🏗️'
    },
    {
      url: '/benchmarks/overview',
      title: 'Benchmark Analysis',
      description: 'Deep dive into performance results',
      icon: '📊'
    },
    {
      url: '/api/python',
      title: 'Python API Reference',
      description: 'Complete API documentation',
      icon: '🐍'
    }
  ]"
  :seeAlso="[
    {
      url: '/guide/development',
      title: 'Development Guide',
      description: 'Set up development environment'
    },
    {
      url: '/guide/troubleshooting',
      title: 'Troubleshooting',
      description: 'Common issues and solutions'
    }
  ]"
/>