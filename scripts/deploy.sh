#!/bin/bash

# Production Deployment Script for Finance Ingestion Benchmark
# 
# This script handles the deployment of both Python and Node.js
# financial data ingestion systems with proper health checks,
# graceful shutdown, and monitoring setup.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/infrastructure/docker/docker-compose.base.yml"
PROD_COMPOSE_FILE="$PROJECT_ROOT/infrastructure/docker/docker-compose.prod.yml"
LOG_FILE="$PROJECT_ROOT/logs/deployment.log"

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
    log "INFO" "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed or not in PATH"
    fi
    
    if ! docker info &> /dev/null; then
        error_exit "Docker daemon is not running"
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error_exit "Docker Compose is not installed"
    fi
    
    # Check if compose files exist
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error_exit "Base compose file not found: $COMPOSE_FILE"
    fi
    
    if [[ ! -f "$PROD_COMPOSE_FILE" ]]; then
        error_exit "Production compose file not found: $PROD_COMPOSE_FILE"
    fi
    
    log "INFO" "Prerequisites check passed"
}

# Build images
build_images() {
    log "INFO" "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build with production optimizations
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" build --no-cache
    else
        docker compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" build --no-cache
    fi
    
    log "INFO" "Docker images built successfully"
}

# Deploy services
deploy_services() {
    log "INFO" "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Deploy with production configuration
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" up -d
    else
        docker compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" up -d
    fi
    
    log "INFO" "Services deployed successfully"
}

# Wait for services to be healthy
wait_for_health() {
    log "INFO" "Waiting for services to become healthy..."
    
    local max_attempts=60  # 5 minutes with 5-second intervals
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        local all_healthy=true
        
        # Check each service health
        for service in python-ingestion node-ingestion redis postgres; do
            local health_status
            if command -v docker-compose &> /dev/null; then
                health_status=$(docker-compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" ps -q "$service" | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
            else
                health_status=$(docker compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" ps -q "$service" | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
            fi
            
            if [[ "$health_status" != "healthy" ]]; then
                all_healthy=false
                log "DEBUG" "Service $service is not healthy yet (status: $health_status)"
                break
            fi
        done
        
        if [[ "$all_healthy" == "true" ]]; then
            log "INFO" "All services are healthy"
            return 0
        fi
        
        ((attempt++))
        log "DEBUG" "Health check attempt $attempt/$max_attempts"
        sleep 5
    done
    
    log "WARN" "Some services may not be fully healthy after $max_attempts attempts"
    return 1
}

# Verify deployment
verify_deployment() {
    log "INFO" "Verifying deployment..."
    
    # Check if containers are running
    local running_containers
    if command -v docker-compose &> /dev/null; then
        running_containers=$(docker-compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" ps --services --filter "status=running" | wc -l)
    else
        running_containers=$(docker compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" ps --services --filter "status=running" | wc -l)
    fi
    
    if [[ $running_containers -lt 4 ]]; then
        log "WARN" "Not all expected services are running ($running_containers/6)"
    fi
    
    # Test API endpoints
    log "INFO" "Testing API endpoints..."
    
    # Test Python API
    if curl -f -s "http://localhost:8001/health" > /dev/null; then
        log "INFO" "Python API health check: OK"
    else
        log "WARN" "Python API health check: FAILED"
    fi
    
    # Test Node.js API
    if curl -f -s "http://localhost:8002/health" > /dev/null; then
        log "INFO" "Node.js API health check: OK"
    else
        log "WARN" "Node.js API health check: FAILED"
    fi
    
    # Test Prometheus
    if curl -f -s "http://localhost:9090/-/healthy" > /dev/null; then
        log "INFO" "Prometheus health check: OK"
    else
        log "WARN" "Prometheus health check: FAILED"
    fi
    
    # Test Grafana
    if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
        log "INFO" "Grafana health check: OK"
    else
        log "WARN" "Grafana health check: FAILED"
    fi
    
    log "INFO" "Deployment verification completed"
}

# Show deployment status
show_status() {
    log "INFO" "Deployment Status:"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" ps
    else
        docker compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" ps
    fi
    
    echo ""
    log "INFO" "Service URLs:"
    echo "  Python API:    http://localhost:8001"
    echo "  Node.js API:   http://localhost:8002"
    echo "  Prometheus:    http://localhost:9090"
    echo "  Grafana:       http://localhost:3000 (admin/admin)"
    echo ""
    log "INFO" "Logs: tail -f $LOG_FILE"
}

# Graceful shutdown
graceful_shutdown() {
    log "INFO" "Performing graceful shutdown..."
    
    cd "$PROJECT_ROOT"
    
    # Stop services gracefully
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" stop
    else
        docker compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" stop
    fi
    
    log "INFO" "Graceful shutdown completed"
}

# Rollback deployment
rollback() {
    log "INFO" "Rolling back deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop current deployment
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" down
    else
        docker compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" down
    fi
    
    log "INFO" "Rollback completed"
}

# Main deployment function
main() {
    local action="${1:-deploy}"
    
    log "INFO" "Starting deployment script with action: $action"
    
    case $action in
        "deploy")
            check_prerequisites
            build_images
            deploy_services
            wait_for_health
            verify_deployment
            show_status
            ;;
        "status")
            show_status
            ;;
        "stop")
            graceful_shutdown
            ;;
        "rollback")
            rollback
            ;;
        "health")
            wait_for_health
            ;;
        *)
            echo "Usage: $0 {deploy|status|stop|rollback|health}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment with health checks"
            echo "  status   - Show current deployment status"
            echo "  stop     - Graceful shutdown of services"
            echo "  rollback - Rollback current deployment"
            echo "  health   - Wait for services to become healthy"
            exit 1
            ;;
    esac
    
    log "INFO" "Deployment script completed successfully"
}

# Handle script interruption
trap 'log "WARN" "Deployment script interrupted"; exit 130' INT TERM

# Run main function
main "$@"