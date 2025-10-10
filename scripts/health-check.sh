#!/bin/bash

# Health Check Script for Container Orchestration
# 
# This script provides a comprehensive health check for the finance ingestion
# system that can be used by container orchestrators like Kubernetes, Docker Swarm,
# or monitoring systems.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}
VERBOSE=${HEALTH_CHECK_VERBOSE:-false}
SERVICE=${HEALTH_CHECK_SERVICE:-"all"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    
    if [[ "$VERBOSE" == "true" ]]; then
        case $level in
            "INFO")
                echo -e "${GREEN}[INFO]${NC} $message" >&2
                ;;
            "WARN")
                echo -e "${YELLOW}[WARN]${NC} $message" >&2
                ;;
            "ERROR")
                echo -e "${RED}[ERROR]${NC} $message" >&2
                ;;
            *)
                echo "[$level] $message" >&2
                ;;
        esac
    fi
}

# Check if a URL is reachable and returns 200
check_url() {
    local url=$1
    local service_name=$2
    
    log "INFO" "Checking $service_name at $url"
    
    if command -v curl &> /dev/null; then
        if curl -f -s --max-time "$TIMEOUT" "$url" > /dev/null 2>&1; then
            log "INFO" "$service_name health check: OK"
            return 0
        else
            log "ERROR" "$service_name health check: FAILED"
            return 1
        fi
    elif command -v wget &> /dev/null; then
        if wget -q --timeout="$TIMEOUT" --tries=1 --spider "$url" > /dev/null 2>&1; then
            log "INFO" "$service_name health check: OK"
            return 0
        else
            log "ERROR" "$service_name health check: FAILED"
            return 1
        fi
    else
        log "ERROR" "Neither curl nor wget available for health checks"
        return 1
    fi
}

# Check Python ingestion service
check_python_service() {
    check_url "http://localhost:8001/health" "Python Ingestion Service"
}

# Check Node.js ingestion service
check_node_service() {
    check_url "http://localhost:8002/health" "Node.js Ingestion Service"
}

# Check Redis
check_redis() {
    log "INFO" "Checking Redis"
    
    if command -v redis-cli &> /dev/null; then
        if timeout "$TIMEOUT" redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
            log "INFO" "Redis health check: OK"
            return 0
        else
            log "ERROR" "Redis health check: FAILED"
            return 1
        fi
    else
        # Fallback to Docker exec if redis-cli not available
        if docker exec finance-redis redis-cli ping > /dev/null 2>&1; then
            log "INFO" "Redis health check: OK"
            return 0
        else
            log "ERROR" "Redis health check: FAILED"
            return 1
        fi
    fi
}

# Check PostgreSQL
check_postgres() {
    log "INFO" "Checking PostgreSQL"
    
    if command -v pg_isready &> /dev/null; then
        if timeout "$TIMEOUT" pg_isready -h localhost -p 5432 -U postgres -d finance_benchmark > /dev/null 2>&1; then
            log "INFO" "PostgreSQL health check: OK"
            return 0
        else
            log "ERROR" "PostgreSQL health check: FAILED"
            return 1
        fi
    else
        # Fallback to Docker exec if pg_isready not available
        if docker exec finance-postgres pg_isready -U postgres -d finance_benchmark > /dev/null 2>&1; then
            log "INFO" "PostgreSQL health check: OK"
            return 0
        else
            log "ERROR" "PostgreSQL health check: FAILED"
            return 1
        fi
    fi
}

# Check Prometheus
check_prometheus() {
    check_url "http://localhost:9090/-/healthy" "Prometheus"
}

# Check Grafana
check_grafana() {
    check_url "http://localhost:3000/api/health" "Grafana"
}

# Check all services
check_all_services() {
    local failed=0
    
    log "INFO" "Performing comprehensive health check"
    
    # Core ingestion services
    if ! check_python_service; then
        ((failed++))
    fi
    
    if ! check_node_service; then
        ((failed++))
    fi
    
    # Storage services
    if ! check_redis; then
        ((failed++))
    fi
    
    if ! check_postgres; then
        ((failed++))
    fi
    
    # Monitoring services
    if ! check_prometheus; then
        ((failed++))
    fi
    
    if ! check_grafana; then
        ((failed++))
    fi
    
    return $failed
}

# Check specific service
check_service() {
    local service=$1
    
    case $service in
        "python"|"python-ingestion")
            check_python_service
            ;;
        "node"|"node-ingestion")
            check_node_service
            ;;
        "redis")
            check_redis
            ;;
        "postgres"|"postgresql")
            check_postgres
            ;;
        "prometheus")
            check_prometheus
            ;;
        "grafana")
            check_grafana
            ;;
        "all")
            check_all_services
            ;;
        *)
            log "ERROR" "Unknown service: $service"
            echo "Available services: python, node, redis, postgres, prometheus, grafana, all"
            return 1
            ;;
    esac
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] [SERVICE]

Health check script for Finance Ingestion Benchmark system.

OPTIONS:
    -t, --timeout SECONDS    Health check timeout (default: 10)
    -v, --verbose           Enable verbose output
    -h, --help              Show this help message

SERVICE:
    python                  Check Python ingestion service
    node                    Check Node.js ingestion service
    redis                   Check Redis service
    postgres                Check PostgreSQL service
    prometheus              Check Prometheus service
    grafana                 Check Grafana service
    all                     Check all services (default)

ENVIRONMENT VARIABLES:
    HEALTH_CHECK_TIMEOUT    Health check timeout in seconds
    HEALTH_CHECK_VERBOSE    Enable verbose output (true/false)
    HEALTH_CHECK_SERVICE    Service to check

EXAMPLES:
    $0                      # Check all services
    $0 python               # Check only Python service
    $0 -v -t 30 all         # Check all services with 30s timeout and verbose output
    
EXIT CODES:
    0                       All checks passed
    1                       One or more checks failed
    2                       Invalid arguments or configuration

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                log "ERROR" "Unknown option: $1"
                show_usage
                exit 2
                ;;
            *)
                SERVICE="$1"
                shift
                ;;
        esac
    done
    
    # Validate timeout
    if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || [[ "$TIMEOUT" -lt 1 ]]; then
        log "ERROR" "Invalid timeout value: $TIMEOUT"
        exit 2
    fi
}

# Main function
main() {
    parse_args "$@"
    
    log "INFO" "Starting health check for service: $SERVICE (timeout: ${TIMEOUT}s)"
    
    if check_service "$SERVICE"; then
        if [[ "$SERVICE" == "all" ]]; then
            log "INFO" "All health checks passed"
        else
            log "INFO" "Health check passed for $SERVICE"
        fi
        exit 0
    else
        local exit_code=$?
        if [[ "$SERVICE" == "all" ]]; then
            log "ERROR" "$exit_code health check(s) failed"
        else
            log "ERROR" "Health check failed for $SERVICE"
        fi
        exit 1
    fi
}

# Run main function with all arguments
main "$@"