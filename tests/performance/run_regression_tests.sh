#!/bin/bash

# Performance Regression Test Runner Script
# This script sets up the environment and runs performance regression tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Starting Performance Regression Tests${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Setup test environment
setup_environment() {
    echo "Setting up test environment..."
    
    # Install Python dependencies for regression testing
    if [ -f "tests/performance/requirements.txt" ]; then
        pip3 install -r tests/performance/requirements.txt
        print_status "Python dependencies installed"
    fi
    
    # Start infrastructure services
    echo "Starting infrastructure services..."
    docker-compose up -d redis postgres
    
    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 10
    
    # Verify services are running
    if ! docker-compose ps | grep -q "redis.*Up"; then
        print_error "Redis service is not running"
        exit 1
    fi
    
    if ! docker-compose ps | grep -q "postgres.*Up"; then
        print_error "PostgreSQL service is not running"
        exit 1
    fi
    
    print_status "Infrastructure services are ready"
}

# Install application dependencies
install_dependencies() {
    echo "Installing application dependencies..."
    
    # Install Python application dependencies
    cd apps/python-ingestion
    pip3 install -r requirements.txt
    cd ../..
    
    # Install Node.js application dependencies
    cd apps/node-ingestion
    npm install
    cd ../..
    
    print_status "Application dependencies installed"
}

# Run regression tests
run_tests() {
    echo "Running performance regression tests..."
    
    cd tests/performance
    
    # Set environment variables for testing
    export PYTHONPATH="../../apps/python-ingestion/src:$PYTHONPATH"
    export NODE_PATH="../../apps/node-ingestion/node_modules:$NODE_PATH"
    
    # Run the regression test suite
    python3 regression_runner.py
    
    local exit_code=$?
    
    cd ../..
    
    return $exit_code
}

# Cleanup function
cleanup() {
    echo "Cleaning up test environment..."
    
    # Stop any running applications
    pkill -f "finance_ingestion" || true
    pkill -f "node.*finance" || true
    
    # Stop infrastructure services
    docker-compose down
    
    print_status "Cleanup completed"
}

# Set up trap for cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    check_prerequisites
    setup_environment
    install_dependencies
    
    if run_tests; then
        print_status "All regression tests passed!"
        echo -e "${GREEN}🎉 Performance regression testing completed successfully${NC}"
        exit 0
    else
        print_error "Some regression tests failed!"
        echo -e "${RED}❌ Performance regressions detected${NC}"
        exit 1
    fi
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Performance Regression Test Runner"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h   Show this help message"
    echo "  --no-setup   Skip environment setup (use existing services)"
    echo "  --cleanup    Only run cleanup and exit"
    echo ""
    echo "This script runs automated performance regression tests for both"
    echo "Python and Node.js implementations of the Finance Ingestion Benchmark."
    exit 0
fi

if [ "$1" = "--cleanup" ]; then
    cleanup
    exit 0
fi

if [ "$1" = "--no-setup" ]; then
    echo "Skipping environment setup..."
    run_tests
    exit $?
fi

# Run main function
main