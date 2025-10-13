#!/bin/bash

# Test runner script for message processor unit tests
# This script runs both Python and Node.js tests for the message processors

set -e

echo "Running Message Processor Unit Tests..."
echo "======================================="

# Run Python tests
echo ""
echo "Running Python Message Processor Tests..."
echo "-----------------------------------------"
cd apps/python-ingestion
if command -v pytest &> /dev/null; then
    python -m pytest ../../tests/python/test_message_processor.py -v --tb=short
else
    echo "pytest not found, skipping Python tests"
fi
cd ../..

# Run Node.js tests
echo ""
echo "Running Node.js Message Processor Tests..."
echo "------------------------------------------"
cd apps/node-ingestion
if command -v npm &> /dev/null; then
    npm test -- --testPathPattern=message-processor
else
    echo "npm not found, skipping Node.js tests"
fi
cd ../..

echo ""
echo "Test execution completed!"
echo "========================"