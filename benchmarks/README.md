# Benchmark Orchestration System

Comprehensive benchmarking system for comparing Python and Node.js financial data ingestion implementations. This system provides automated testing with identical conditions, realistic market data patterns, and detailed performance analysis.

## Overview

The benchmark orchestration system includes:

- **Automated Testing**: Run both implementations with identical conditions
- **Realistic Data Patterns**: Market open bursts, sustained trading, stress tests
- **Resource Monitoring**: CPU, memory, network usage tracking
- **Performance Comparison**: Side-by-side analysis with statistical significance
- **Comprehensive Reporting**: JSON, HTML, and visual reports

## Quick Start

### Prerequisites

1. **System Requirements**:
   - Python 3.11+
   - Node.js 18+
   - Redis server
   - PostgreSQL server
   - Available ports: 18765, 18080, 18081, 19090, 19091

2. **Dependencies**:
   ```bash
   pip install asyncio psutil aiohttp websockets msgpack
   npm install ws msgpack5 redis pg
   ```

3. **Database Setup**:
   ```bash
   # Redis (default configuration)
   redis-server
   
   # PostgreSQL
   createdb finance_benchmark
   psql finance_benchmark -c "CREATE USER benchmark_user WITH PASSWORD 'benchmark_pass';"
   psql finance_benchmark -c "GRANT ALL PRIVILEGES ON DATABASE finance_benchmark TO benchmark_user;"
   ```

### Running Benchmarks

#### Quick Comparison (1 minute)
```bash
python benchmarks/run_benchmarks.py --quick
```

#### Stress Test
```bash
python benchmarks/run_benchmarks.py --stress
```

#### Market Open Simulation
```bash
python benchmarks/run_benchmarks.py --market
```

#### Comprehensive Suite (15+ minutes)
```bash
python benchmarks/run_benchmarks.py --comprehensive
```

#### Custom Benchmark
```bash
python benchmarks/run_benchmarks.py --custom stress_test
```

#### List Available Configurations
```bash
python benchmarks/run_benchmarks.py --list
```

## Architecture

### Components

```
benchmarks/
├── orchestrator.py      # Main orchestration system
├── run_benchmarks.py    # Convenient CLI interface
├── config.py           # Configuration management
├── utils.py            # Utility functions
└── README.md           # This file
```

### Benchmark Flow

1. **Setup Phase**:
   - Start WebSocket data feed simulator
   - Launch Python and Node.js applications
   - Initialize resource monitoring
   - Wait for applications to connect

2. **Warmup Phase**:
   - Run at base message rate
   - Allow applications to reach steady state
   - Collect baseline metrics

3. **Main Benchmark Phase**:
   - Execute configured load pattern
   - Monitor performance metrics
   - Track resource usage
   - Record latency measurements

4. **Cooldown Phase**:
   - Reduce message rate
   - Allow applications to stabilize
   - Collect final metrics

5. **Results Collection**:
   - Gather application metrics
   - Analyze resource usage
   - Generate performance comparison
   - Save detailed results

## Benchmark Configurations

### Available Configurations

| Configuration | Description | Duration | Base Rate | Peak Rate | Features |
|---------------|-------------|----------|-----------|-----------|----------|
| `comparison_baseline` | Basic comparison | 60s | 2,000 | 4,000 | Periodic bursts |
| `market_open_burst` | Market open simulation | 120s | 1,000 | 8,000 | High initial burst |
| `sustained_high_load` | Sustained high throughput | 180s | 5,000 | 7,000 | Consistent load |
| `stress_test` | Maximum load testing | 90s | 2,000 | 12,000 | Stress conditions |
| `network_resilience` | Network failure testing | 120s | 3,000 | 5,000 | Failure simulation |
| `memory_stability` | Long-running stability | 300s | 2,000 | 2,000 | Memory leak detection |

### Load Patterns

#### Market Open Pattern
- **Pre-market**: 30% of time at 20% base rate
- **Market Open**: 20% of time ramping to peak rate
- **Normal Trading**: 50% of time at base rate with variance

#### Sustained Trading Pattern
- **Base Rate**: Consistent message rate
- **Periodic Bursts**: Regular spikes to peak rate
- **Variance**: ±30% random variation

#### Stress Test Pattern
- **Ramp Up**: Gradual increase to peak rate
- **Sustained Peak**: Maximum load for extended period
- **Ramp Down**: Gradual decrease to base rate

## Metrics and Analysis

### Performance Metrics

- **Throughput**: Messages processed per second
- **Latency**: End-to-end processing time (P50, P95, P99, P99.9)
- **Resource Usage**: CPU and memory consumption
- **Error Rates**: Failed operations percentage
- **Connection Stability**: Reconnection events

### Resource Monitoring

- **System-wide**: CPU, memory, network, disk I/O
- **Process-specific**: Per-application resource usage
- **Time-series**: Continuous monitoring during benchmark
- **Anomaly Detection**: Resource spikes and degradation

### Comparison Analysis

- **Throughput Comparison**: Side-by-side performance
- **Latency Distribution**: Statistical analysis
- **Resource Efficiency**: CPU and memory usage
- **Stability Metrics**: Error rates and recovery

## Configuration

### Environment Variables

```bash
# Network configuration
export BENCHMARK_SIMULATOR_HOST=localhost
export BENCHMARK_SIMULATOR_PORT=18765

# Database configuration
export BENCHMARK_REDIS_HOST=localhost
export BENCHMARK_REDIS_PORT=6379
export BENCHMARK_POSTGRES_HOST=localhost
export BENCHMARK_POSTGRES_PORT=5432
export BENCHMARK_POSTGRES_DATABASE=finance_benchmark

# Resource limits
export BENCHMARK_CPU_LIMIT=80
export BENCHMARK_MEMORY_LIMIT=4096
```

### Custom Configuration

Create custom benchmark configurations:

```python
from benchmarks.orchestrator import BenchmarkConfiguration

custom_config = BenchmarkConfiguration(
    name="custom_test",
    description="Custom benchmark configuration",
    duration_seconds=120,
    message_rate_base=3000,
    message_rate_peak=6000,
    symbols=["AAPL", "GOOGL", "MSFT"],
    burst_enabled=True,
    network_failures_enabled=False
)
```

## Results and Reporting

### Output Structure

```
benchmark_results/
├── benchmark_20241209_143022_market_open_burst/
│   ├── results.json           # Complete benchmark results
│   ├── configuration.json     # Benchmark configuration
│   ├── resource_usage.json    # Resource monitoring data
│   ├── metrics.json          # Application metrics
│   └── comparison.json       # Performance comparison
├── benchmark_summary_20241209_143500.json
└── benchmark_orchestrator.log
```

### Result Analysis

#### JSON Results
```json
{
  "configuration": { ... },
  "python_metrics": {
    "throughput_mps": 4250.5,
    "latency_p95_ms": 2.3,
    "cpu_percent": 45.2,
    "memory_mb": 128.5
  },
  "nodejs_metrics": {
    "throughput_mps": 4180.2,
    "latency_p95_ms": 2.8,
    "cpu_percent": 52.1,
    "memory_mb": 95.3
  },
  "performance_comparison": {
    "throughput_comparison": {
      "winner": "python",
      "difference_percent": 1.7
    }
  }
}
```

#### Summary Report
```
BENCHMARK SUITE SUMMARY
================================================================================
Total benchmarks: 5
Successful: 5
Failed: 0
Success rate: 100.0%

OVERALL PERFORMANCE COMPARISON
========================================
Throughput:
  Python: 4250 msg/s
  Node.js: 4180 msg/s
  Winner: python (+1.7%)

Latency (P95):
  Python: 2.30 ms
  Node.js: 2.80 ms
  Winner: python (-0.50 ms)
```

## Advanced Usage

### Programmatic API

```python
from benchmarks.orchestrator import BenchmarkOrchestrator, BenchmarkConfiguration

# Create orchestrator
orchestrator = BenchmarkOrchestrator(output_dir=Path("my_results"))

# Define configuration
config = BenchmarkConfiguration(
    name="my_benchmark",
    duration_seconds=60,
    message_rate_base=2000,
    message_rate_peak=4000
)

# Run benchmark
results = await orchestrator.run_benchmark(config)

# Analyze results
if results.success:
    print(f"Python throughput: {results.python_metrics.throughput_mps}")
    print(f"Node.js throughput: {results.nodejs_metrics.throughput_mps}")
```

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Run Performance Benchmarks
  run: |
    python benchmarks/run_benchmarks.py --quick
    python benchmarks/run_benchmarks.py --stress
  
- name: Upload Benchmark Results
  uses: actions/upload-artifact@v3
  with:
    name: benchmark-results
    path: benchmark_results/
```

### Custom Metrics Collection

Extend the orchestrator to collect custom metrics:

```python
class CustomBenchmarkOrchestrator(BenchmarkOrchestrator):
    async def _collect_application_metrics(self, implementation: str, port: int):
        # Call parent method
        metrics = await super()._collect_application_metrics(implementation, port)
        
        # Add custom metrics
        custom_data = await self.collect_custom_metrics(port)
        metrics.custom_metrics = custom_data
        
        return metrics
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```
   Error: Address already in use
   ```
   Solution: Change ports in configuration or stop conflicting services

2. **Application Startup Timeout**:
   ```
   Error: Application failed to start within timeout
   ```
   Solution: Increase startup timeout or check application logs

3. **Database Connection Failed**:
   ```
   Error: Could not connect to Redis/PostgreSQL
   ```
   Solution: Ensure databases are running and credentials are correct

4. **High Resource Usage**:
   ```
   Warning: System resource usage is high
   ```
   Solution: Close other applications or increase resource limits

### Debug Mode

Enable debug logging:
```bash
export BENCHMARK_LOG_LEVEL=DEBUG
python benchmarks/run_benchmarks.py --quick
```

Check application logs:
```bash
tail -f benchmark_results/benchmark_orchestrator.log
```

### Performance Tuning

1. **System Optimization**:
   - Increase file descriptor limits
   - Optimize network buffer sizes
   - Use SSD storage for databases

2. **Application Tuning**:
   - Adjust connection pool sizes
   - Optimize batch processing parameters
   - Configure garbage collection settings

3. **Benchmark Tuning**:
   - Reduce monitoring frequency for high-load tests
   - Use separate machines for applications and databases
   - Minimize background processes during benchmarks

## Contributing

When adding new benchmark configurations or features:

1. Follow the existing code structure and naming conventions
2. Add comprehensive documentation and examples
3. Include validation and error handling
4. Test with both Python and Node.js implementations
5. Update this README with new features

## Performance Baselines

Expected performance ranges (hardware dependent):

- **Throughput**: 1,000 - 50,000 messages/second
- **Latency P95**: 1 - 10 milliseconds
- **CPU Usage**: 20 - 80% under normal load
- **Memory Usage**: 50 - 500 MB per application
- **Error Rate**: < 0.1% under normal conditions

These baselines will vary significantly based on:
- Hardware specifications (CPU, memory, storage)
- Network configuration and latency
- Database performance and configuration
- System load and background processes