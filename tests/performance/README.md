# Performance Regression Testing

This directory contains automated performance regression testing tools for the Finance Ingestion Benchmark project. The regression tests help detect performance degradations and ensure consistent performance across code changes.

## Overview

The performance regression testing system:

- **Automated Testing**: Runs standardized performance tests against both Python and Node.js implementations
- **Baseline Comparison**: Compares current performance against stored baseline metrics
- **Regression Detection**: Automatically identifies performance regressions and improvements
- **Comprehensive Reporting**: Generates detailed reports with actionable insights
- **CI/CD Integration**: Can be integrated into continuous integration pipelines

## Quick Start

### Prerequisites

- Python 3.8+ with pip
- Node.js 18+ with npm
- Docker and Docker Compose
- At least 8GB RAM and 4 CPU cores for accurate testing

### Running Tests

```bash
# Run all regression tests (Linux/macOS)
./run_regression_tests.sh

# Run all regression tests (Windows)
.\run_regression_tests.ps1

# Run tests without environment setup
./run_regression_tests.sh --no-setup

# Get help
./run_regression_tests.sh --help
```

### Python API

```python
from regression_runner import PerformanceRegressionRunner

# Initialize runner
runner = PerformanceRegressionRunner()

# Run all tests
results = await runner.run_all_regression_tests()

# Check for regressions
failed_tests = [r for r in results if not r.passed]
if failed_tests:
    print(f"Found {len(failed_tests)} performance regressions")
```

## Test Scenarios

### 1. Baseline Load Test
- **Duration**: 5 minutes
- **Message Rate**: 1,000 msg/sec
- **Purpose**: Establish baseline performance under normal load
- **Metrics**: Latency percentiles, throughput, resource usage

### 2. High Throughput Test
- **Duration**: 3 minutes
- **Message Rate**: 10,000 msg/sec
- **Purpose**: Verify maximum capacity performance
- **Metrics**: Peak throughput, latency under load, resource limits

### 3. Burst Load Test
- **Duration**: 10 minutes
- **Base Rate**: 2,000 msg/sec
- **Burst Rate**: 15,000 msg/sec (30s every 2 minutes)
- **Purpose**: Simulate market opening conditions
- **Metrics**: Burst handling, recovery time, stability

### 4. Stability Test
- **Duration**: 1 hour
- **Message Rate**: 5,000 msg/sec
- **Purpose**: Long-term stability and memory leak detection
- **Metrics**: Memory growth, performance degradation over time

## Performance Metrics

### Latency Metrics
- **P50 Latency**: Median processing time
- **P95 Latency**: 95th percentile processing time
- **P99 Latency**: 99th percentile processing time
- **P99.9 Latency**: 99.9th percentile processing time

### Throughput Metrics
- **Average Throughput**: Mean messages processed per second
- **Peak Throughput**: Maximum sustained throughput
- **Message Count**: Total messages processed successfully

### Resource Metrics
- **Memory Usage**: Average and peak memory consumption
- **CPU Usage**: Average and peak CPU utilization
- **Error Rate**: Percentage of failed message processing

## Regression Detection

### Thresholds

The system uses configurable thresholds to detect regressions:

| Metric | Regression Threshold | Improvement Threshold |
|--------|---------------------|----------------------|
| **Latency** | +15% increase | -5% decrease |
| **Throughput** | -10% decrease | +5% increase |
| **Memory** | +20% increase | -5% decrease |
| **Error Rate** | +5% increase | Any decrease |

### Configuration

Thresholds can be customized in `regression_config.json`:

```json
{
  "regression_detection": {
    "latency_degradation_threshold_percent": 15,
    "throughput_degradation_threshold_percent": 10,
    "memory_increase_threshold_percent": 20,
    "error_rate_increase_threshold_percent": 5
  }
}
```

## Baseline Management

### Storing Baselines

Baselines are automatically stored after each test run:

```
tests/performance/baselines/
├── python_baseline_load_baseline.json
├── python_high_throughput_baseline.json
├── nodejs_baseline_load_baseline.json
└── nodejs_high_throughput_baseline.json
```

### Updating Baselines

To update baselines after intentional performance changes:

```bash
# Run tests and store new baselines
python regression_runner.py

# Or manually copy current results as new baselines
cp results/latest_metrics.json baselines/new_baseline.json
```

## Results and Reporting

### Report Files

Test results are stored in `tests/performance/results/`:

- **JSON Report**: `regression_report_YYYYMMDD_HHMMSS.json`
- **Summary Report**: `regression_summary_YYYYMMDD_HHMMSS.txt`

### Sample Report

```
Performance Regression Test Report
========================================

Test Date: 2024-01-15 14:30:00 UTC
Total Tests: 8
Passed: 6
Failed: 2
Total Regressions: 3
Total Improvements: 1

Test: high_throughput (python)
Status: FAIL
Regressions:
  - Latency p99 increased by 18.5%
  - Memory usage increased by 25.2%

Test: baseline_load (nodejs)
Status: PASS
Improvements:
  + Throughput improved by 8.3%
```

### JSON Report Structure

```json
{
  "timestamp": "2024-01-15T14:30:00Z",
  "summary": {
    "total_tests": 8,
    "passed_tests": 6,
    "failed_tests": 2,
    "total_regressions": 3,
    "total_improvements": 1
  },
  "results": [
    {
      "test_name": "baseline_load",
      "implementation": "python",
      "passed": true,
      "regressions": [],
      "improvements": ["Latency p99 improved by 5.2%"],
      "current_metrics": { ... },
      "baseline_metrics": { ... },
      "comparison_summary": { ... }
    }
  ]
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Performance Regression Tests

on:
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  regression-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Run Regression Tests
      run: |
        cd tests/performance
        ./run_regression_tests.sh
        
    - name: Upload Results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: regression-results
        path: tests/performance/results/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Setup') {
            steps {
                sh 'cd tests/performance && pip install -r requirements.txt'
            }
        }
        
        stage('Regression Tests') {
            steps {
                sh 'cd tests/performance && ./run_regression_tests.sh'
            }
            
            post {
                always {
                    archiveArtifacts artifacts: 'tests/performance/results/*'
                    
                    script {
                        def report = readJSON file: 'tests/performance/results/regression_report_*.json'
                        if (report.summary.failed_tests > 0) {
                            currentBuild.result = 'UNSTABLE'
                            error("Performance regressions detected: ${report.summary.failed_tests} tests failed")
                        }
                    }
                }
            }
        }
    }
}
```

## Troubleshooting

### Common Issues

#### Tests Fail to Start Applications

```bash
# Check if ports are already in use
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002

# Kill existing processes
pkill -f finance_ingestion
```

#### Infrastructure Services Not Ready

```bash
# Check Docker services
docker-compose ps

# Restart services
docker-compose down && docker-compose up -d

# Check logs
docker-compose logs redis
docker-compose logs postgres
```

#### Memory or Resource Issues

```bash
# Check system resources
free -h
top

# Reduce test duration or message rates in config
vim regression_config.json
```

#### Baseline Comparison Failures

```bash
# Check if baselines exist
ls -la baselines/

# Reset baselines (run tests once to establish new baselines)
rm baselines/*.json
python regression_runner.py
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

runner = PerformanceRegressionRunner()
results = await runner.run_all_regression_tests()
```

## Configuration Reference

### Complete Configuration Schema

```json
{
  "baseline_thresholds": {
    "latency": {
      "p50_ms": 0.5,
      "p95_ms": 1.0,
      "p99_ms": 2.0,
      "p999_ms": 5.0
    },
    "throughput": {
      "min_messages_per_second": 8000,
      "target_messages_per_second": 10000
    },
    "resources": {
      "max_memory_mb": 200,
      "max_cpu_percent": 80
    }
  },
  "test_scenarios": [
    {
      "name": "baseline_load",
      "duration_seconds": 300,
      "message_rate": 1000,
      "burst_enabled": false
    }
  ],
  "regression_detection": {
    "latency_degradation_threshold_percent": 15,
    "throughput_degradation_threshold_percent": 10,
    "memory_increase_threshold_percent": 20,
    "error_rate_increase_threshold_percent": 5
  },
  "reporting": {
    "output_format": "json",
    "include_charts": true,
    "alert_on_regression": true,
    "store_baseline": true
  }
}
```

## Best Practices

### Running Tests

1. **Consistent Environment**: Always run tests on the same hardware configuration
2. **Clean State**: Restart applications between test runs
3. **Sufficient Duration**: Allow enough time for performance to stabilize
4. **Multiple Runs**: Run tests multiple times and average results for accuracy

### Baseline Management

1. **Regular Updates**: Update baselines after intentional performance improvements
2. **Version Control**: Store baselines in version control for team collaboration
3. **Documentation**: Document baseline changes and reasons
4. **Validation**: Validate new baselines with multiple test runs

### CI/CD Integration

1. **Separate Pipeline**: Run regression tests in a dedicated pipeline
2. **Resource Allocation**: Ensure sufficient resources for accurate testing
3. **Failure Handling**: Treat regressions as build failures
4. **Notifications**: Alert teams immediately on performance regressions

## Contributing

### Adding New Test Scenarios

1. Add scenario to `regression_config.json`
2. Update documentation
3. Test the new scenario manually
4. Update CI/CD pipelines if needed

### Modifying Thresholds

1. Analyze historical performance data
2. Adjust thresholds in configuration
3. Validate with test runs
4. Document threshold changes

### Extending Metrics

1. Add new metrics to `PerformanceMetrics` class
2. Update collection logic in `_monitor_performance`
3. Add regression analysis in `_analyze_regression`
4. Update reporting format

For more information, see the main project documentation at [docs/](../../docs/).