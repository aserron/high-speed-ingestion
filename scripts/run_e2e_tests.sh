#!/bin/bash

# End-to-End Integration Test Runner
# 
# Runs comprehensive end-to-end tests for both Python and Node.js
# implementations to verify complete system integration.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/e2e-tests.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create logs directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Log to console with colors
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
        *)
            echo "[$level] $message"
            ;;
    esac
}

# Error handler
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites for end-to-end tests..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        error_exit "Python 3 is not installed or not in PATH"
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed or not in PATH"
    fi
    
    # Check if Docker is running (for services)
    if ! docker info &> /dev/null; then
        error_exit "Docker daemon is not running (required for test services)"
    fi
    
    log "INFO" "Prerequisites check passed"
}

# Setup test environment
setup_test_environment() {
    log "INFO" "Setting up test environment..."
    
    cd "$PROJECT_ROOT"
    
    # Start required services
    log "INFO" "Starting test services..."
    docker-compose -f docker-compose.yml up -d redis postgres
    
    # Wait for services to be ready
    log "INFO" "Waiting for services to be ready..."
    sleep 10
    
    # Verify services are healthy
    if ! docker-compose -f docker-compose.yml ps redis | grep -q "Up"; then
        error_exit "Redis service failed to start"
    fi
    
    if ! docker-compose -f docker-compose.yml ps postgres | grep -q "Up"; then
        error_exit "PostgreSQL service failed to start"
    fi
    
    log "INFO" "Test environment setup completed"
}

# Cleanup test environment
cleanup_test_environment() {
    log "INFO" "Cleaning up test environment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop test services
    docker-compose -f docker-compose.yml down
    
    log "INFO" "Test environment cleanup completed"
}

# Run Python end-to-end tests
run_python_e2e_tests() {
    log "INFO" "Running Python end-to-end integration tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install Python dependencies if needed
    if [[ -f "apps/python-ingestion/requirements.txt" ]]; then
        log "INFO" "Installing Python dependencies..."
        pip install -r apps/python-ingestion/requirements.txt
    fi
    
    # Run Python E2E tests
    log "INFO" "Executing Python end-to-end tests..."
    if python3 tests/e2e/test_complete_integration.py; then
        log "INFO" "Python end-to-end tests PASSED"
        return 0
    else
        log "ERROR" "Python end-to-end tests FAILED"
        return 1
    fi
}

# Run Node.js end-to-end tests
run_nodejs_e2e_tests() {
    log "INFO" "Running Node.js end-to-end integration tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install Node.js dependencies if needed
    if [[ -f "apps/node-ingestion/package.json" ]]; then
        log "INFO" "Installing Node.js dependencies..."
        cd apps/node-ingestion
        npm install
        cd "$PROJECT_ROOT"
    fi
    
    # Run Node.js E2E tests
    log "INFO" "Executing Node.js end-to-end tests..."
    if node tests/e2e/test_complete_integration.js; then
        log "INFO" "Node.js end-to-end tests PASSED"
        return 0
    else
        log "ERROR" "Node.js end-to-end tests FAILED"
        return 1
    fi
}

# Run performance comparison
run_performance_comparison() {
    log "INFO" "Running performance comparison between Python and Node.js..."
    
    # This would run both implementations with identical workloads
    # and compare their performance metrics
    
    log "INFO" "Performance comparison completed (placeholder)"
    return 0
}

# Generate test report
generate_test_report() {
    log "INFO" "Generating end-to-end test report..."
    
    local report_file="$PROJECT_ROOT/reports/e2e-test-report.html"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>End-to-End Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .pass { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        .metrics { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>End-to-End Integration Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Project: Finance Ingestion Benchmark</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <p>This report contains the results of comprehensive end-to-end integration tests
        for both Python and Node.js implementations of the financial data ingestion system.</p>
    </div>
    
    <div class="section">
        <h2>Test Results</h2>
        <p>Detailed test results are available in the log file: <code>$LOG_FILE</code></p>
    </div>
    
    <div class="section">
        <h2>Performance Metrics</h2>
        <div class="metrics">
            <p>Performance metrics and comparison data will be populated here.</p>
        </div>
    </div>
</body>
</html>
EOF
    
    log "INFO" "Test report generated: $report_file"
}

# Main function
main() {
    local python_success=false
    local nodejs_success=false
    
    log "INFO" "Starting end-to-end integration test suite..."
    
    # Setup
    check_prerequisites
    setup_test_environment
    
    # Trap cleanup on exit
    trap cleanup_test_environment EXIT
    
    # Run tests
    if run_python_e2e_tests; then
        python_success=true
    fi
    
    if run_nodejs_e2e_tests; then
        nodejs_success=true
    fi
    
    # Performance comparison
    run_performance_comparison
    
    # Generate report
    generate_test_report
    
    # Summary
    log "INFO" "End-to-end integration test suite completed"
    echo ""
    echo "="*60
    echo "END-TO-END INTEGRATION TEST SUMMARY"
    echo "="*60
    echo "Python Implementation: $(if $python_success; then echo "PASSED"; else echo "FAILED"; fi)"
    echo "Node.js Implementation: $(if $nodejs_success; then echo "PASSED"; else echo "FAILED"; fi)"
    echo ""
    
    if $python_success && $nodejs_success; then
        log "INFO" "🎉 All end-to-end integration tests PASSED!"
        echo "Both implementations successfully completed end-to-end integration testing."
        return 0
    else
        log "ERROR" "❌ Some end-to-end integration tests FAILED!"
        echo "One or more implementations failed end-to-end integration testing."
        return 1
    fi
}

# Handle script interruption
trap 'log "WARN" "End-to-end test suite interrupted"; cleanup_test_environment; exit 130' INT TERM

# Run main function
main "$@"