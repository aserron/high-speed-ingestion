# Product Overview

This is a **Finance Ingestion Benchmark** project that compares high-performance financial data ingestion systems built in Python and Node.js.

## Core Purpose
- Evaluate real-time market data processing capabilities
- Measure latency, throughput, and resource utilization under realistic trading conditions
- Provide fair comparison between Python and Node.js implementations

## Performance Targets
- **Latency**: Sub-millisecond processing (< 1ms end-to-end)
- **Throughput**: 10,000+ messages per second sustained
- **Reliability**: Automatic reconnection within 1 second
- **Stability**: Memory-stable operation under continuous load

## Key Features
- Dual implementation approach (Python + Node.js)
- Real-time WebSocket market data feeds
- Comprehensive performance metrics and monitoring
- Automated benchmarking and comparison tools
- Production-ready infrastructure with Docker

## Architecture Components
1. **WebSocket Connection Manager** - Real-time data feeds with auto-reconnection
2. **Message Processor** - High-performance parsing with latency measurement
3. **Storage Layer** - Redis for real-time data, PostgreSQL for historical persistence
4. **Metrics & Monitoring** - Prometheus metrics with comprehensive observability
5. **REST API** - Health checks, metrics endpoints, and configuration