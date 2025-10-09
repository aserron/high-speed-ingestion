# Integration Tests

Comprehensive integration tests for the financial data ingestion benchmark system. These tests validate the complete data flow from WebSocket ingestion through processing to storage, including network failure simulation and load testing scenarios.

## Overview

The integration test suite includes:

- **End-to-End Tests**: Complete data flow validation (WebSocket → Processing → Storage)
- **Network Failure Tests**: Connection resilience and recovery testing
- **Load Testing**: Performance under various load patterns
- **Application Integration**: Python and Node.js application testing
- **Database Integration**: Redis and PostgreSQL storage validation

## Test Structure

```
tests/integration/
├── test_end_to_end.py          # Main end-to-end integration tests
├── test_network_failures.py    # Network failure simulation tests
├── test_load_scenarios.py      # Load testing scenarios
├── websocket_simulator.py      # WebSocket data feed simulator
├── test_config.py             # Test configuration management
├── test_utils.py              # Test utilities and helpers
├── run_integration_tests.py   # Main test runner
├── pytest.ini                # Pytest configuration
├── requirements.txt           # Test dependencies
└── README.md                  # This file
```

## Prerequisites

### System Requirements

- Python 3.11+
- Node.js 18+
- Redis server
- PostgreSQL server
- Available network ports (18765, 18080, 18081 by default)

### Database Setup

1. **Redis**: Ensure Redis is running on localhost:6379
   ```bash
   redis-server
   ```

2. **PostgreSQL**: Create test database and user
   ```sql
   CREATE DATABASE finance_benchmark_test;
   CREATE USER benchmark_user WITH PASSWORD 'benchmark_pass';
   GRANT ALL PRIVILEGES ON DATABASE finance_benchmark_test TO benchmark_user;
   ```

3. **Database Schema**: Ensure the market_data table exists
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
   ```

### Python Dependencies

Install test dependencies:
```bash
cd tests/integration
pip install -r requirements.txt
```

## Running Tests

### Quick Start

Run basic integration tests:
```bash
python run_integration_tests.py --suite basic
```

### Test Suites

1. **All Tests** (comprehensive suite):
   ```bash
   python run_integration_tests.py --suite all
   ```

2. **Network Failure Tests**:
   ```bash
   python run_integration_tests.py --suite network
   ```

3. **Load Tests**:
   ```bash
   python run_integration_tests.py --suite load
   ```

4. **End-to-End Tests**:
   ```bash
   python run_integration_tests.py --suite e2e
   ```

5. **Pytest-based Tests**:
   ```bash
   python run_integration_tests.py --suite pytest
   ```

### Using Pytest Directly

Run specific test files:
```bash
pytest test_end_to_end.py -v
pytest test_network_failures.py -v
pytest test_load_scenarios.py -v
```

Run tests with markers:
```bash
pytest -m "not slow" -v          # Skip slow tests
pytest -m "network" -v           # Only network tests
pytest -m "load" -v              # Only load tests
```

### Command Line Options

```bash
python run_integration_tests.py --help
```

Options:
- `--suite`: Test suite to run (all, basic, network, load, e2e, pytest)
- `--verbose`: Enable verbose output
- `--no-cleanup`: Skip cleanup after tests
- `--output-dir`: Directory for test results
- `--markers`: Pytest markers to filter tests

## Test Configuration

### Environment Variables

Configure tests using environment variables:

```bash
# Database configuration
export TEST_REDIS_HOST=localhost
export TEST_REDIS_PORT=6379
export TEST_POSTGRES_HOST=localhost
export TEST_POSTGRES_PORT=5432
export TEST_POSTGRES_DATABASE=finance_benchmark_test

# Network configuration
export TEST_SIMULATOR_PORT=18765
export TEST_PYTHON_API_PORT=18080
export TEST_NODE_API_PORT=18081

# Test behavior
export TEST_VERBOSE=true
export TEST_CLEANUP=true
export TEST_PARALLEL=false
```

### Configuration File

Create a custom test configuration (optional):
```python
from test_config import IntegrationTestConfig, TestDatabaseConfig

config = IntegrationTestConfig(
    database=TestDatabaseConfig(
        redis_host="custom-redis-host",
        postgres_host="custom-postgres-host"
    ),
    verbose_logging=True
)
```

## Test Scenarios

### End-to-End Tests

- **Basic Data Flow**: WebSocket → Processing → Storage validation
- **High Throughput**: Performance under high message rates
- **Network Failure Recovery**: Resilience testing with simulated failures
- **Burst Load Handling**: Market open simulation
- **Concurrent Connections**: Multiple client connection testing
- **Message Validation**: Data integrity and schema validation
- **Storage Persistence**: Multi-backend storage validation

### Network Failure Tests

- **Connection Drop Recovery**: Automatic reconnection testing
- **Slow Network Conditions**: Performance under network delays
- **Intermittent Connectivity**: On/off connectivity patterns
- **Exponential Backoff**: Reconnection strategy validation
- **Data Loss Measurement**: Message loss during failures
- **Concurrent Failure Scenarios**: Multiple failure types

### Load Testing Scenarios

- **Market Open Burst**: High initial load simulation
- **Sustained High Load**: Extended high-rate processing
- **Random Traffic Spikes**: Unpredictable load patterns
- **Gradual Ramp Up**: Progressive load increase
- **Stress Conditions**: Maximum load testing
- **Memory Stability**: Long-running stability testing

## Test Results

### Output Formats

Tests generate results in multiple formats:

1. **Console Output**: Real-time test progress and results
2. **JSON Reports**: Detailed test results and metrics
3. **HTML Reports**: Visual test reports (with pytest-html)
4. **Coverage Reports**: Code coverage analysis

### Result Files

Test results are saved to the `test_results/` directory:
- `integration_test_report_<timestamp>.json`: Comprehensive test report
- `pytest_report.html`: HTML test report
- `coverage_report/`: Coverage analysis

### Interpreting Results

Key metrics to monitor:
- **Throughput**: Messages processed per second
- **Latency**: End-to-end processing time
- **Memory Usage**: Memory consumption and growth
- **CPU Usage**: Processor utilization
- **Error Rates**: Failed operations percentage
- **Recovery Time**: Time to recover from failures

## Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```
   Error: Address already in use
   ```
   Solution: Change test ports in configuration or stop conflicting services

2. **Database Connection Failed**:
   ```
   Error: Could not connect to Redis/PostgreSQL
   ```
   Solution: Ensure databases are running and credentials are correct

3. **Import Errors**:
   ```
   ModuleNotFoundError: No module named 'finance_ingestion'
   ```
   Solution: Ensure Python path includes application source directories

4. **Timeout Errors**:
   ```
   asyncio.TimeoutError
   ```
   Solution: Increase timeout values or check system performance

### Debug Mode

Run tests with debug output:
```bash
python run_integration_tests.py --suite basic --verbose
```

Enable pytest debugging:
```bash
pytest --pdb -s test_end_to_end.py::TestEndToEndIntegration::test_basic_data_flow
```

### Performance Issues

If tests are running slowly:
1. Check system resources (CPU, memory, disk I/O)
2. Reduce test duration or message rates
3. Use faster storage (SSD vs HDD)
4. Optimize database configuration

## Continuous Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379
      
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: finance_benchmark_test
          POSTGRES_USER: benchmark_user
          POSTGRES_PASSWORD: benchmark_pass
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd tests/integration
        pip install -r requirements.txt
    
    - name: Run integration tests
      run: |
        cd tests/integration
        python run_integration_tests.py --suite basic
```

## Contributing

When adding new integration tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate pytest markers
3. Include comprehensive docstrings
4. Update this README with new test descriptions
5. Ensure tests are deterministic and can run in parallel
6. Add proper cleanup in test teardown methods

## Performance Benchmarks

Expected performance baselines:
- **Throughput**: > 1000 messages/second
- **Latency**: < 10ms average
- **Memory Growth**: < 100MB over 5 minutes
- **CPU Usage**: < 80% under normal load
- **Recovery Time**: < 5 seconds after network failure

These benchmarks may vary based on hardware and system configuration.