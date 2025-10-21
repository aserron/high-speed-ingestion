# Finance Ingestion Benchmark - Docker Management
.PHONY: help build up down logs clean dev prod test benchmark

# Default target
help:
	@echo "Finance Ingestion Benchmark - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-build    - Build and start development environment"
	@echo "  make dev-logs     - Show development logs"
	@echo "  make dev-down     - Stop development environment"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build and start production environment"
	@echo "  make prod-logs    - Show production logs"
	@echo "  make prod-down    - Stop production environment"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run tests in both implementations"
	@echo "  make benchmark    - Run performance benchmarks"
	@echo ""
	@echo "Utilities:"
	@echo "  make build        - Build all Docker images"
	@echo "  make clean        - Clean up containers, images, and volumes"
	@echo "  make logs         - Show logs from all services"
	@echo "  make shell-python - Open shell in Python container"
	@echo "  make shell-node   - Open shell in Node.js container"

# Development environment
dev:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml up

dev-build:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml up --build

dev-logs:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml logs -f

dev-down:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml down

# Production environment
prod:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.prod.yml up

prod-build:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.prod.yml up --build

prod-logs:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.prod.yml logs -f

prod-down:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.prod.yml down

# Build all images
build:
	docker compose -f infrastructure/docker/docker-compose.base.yml build

# Show logs
logs:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml logs -f

# Testing
test:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml exec python-ingestion python -m pytest
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml exec node-ingestion npm test

# Benchmarking
benchmark:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml exec python-ingestion python -m pytest benchmarks/
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml exec node-ingestion npm run benchmark

# Utility commands
shell-python:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml exec python-ingestion /bin/bash

shell-node:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml exec node-ingestion /bin/sh

# Database operations
db-reset:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml down -v
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml up -d postgres redis
	sleep 5
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml up

# Clean up everything
clean:
	docker compose -f infrastructure/docker/docker-compose.base.yml -f infrastructure/docker/docker-compose.dev.yml down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

# Health check
health:
	@echo "Checking service health..."
	@curl -f http://localhost:8001/health || echo "Python service not healthy"
	@curl -f http://localhost:8002/health || echo "Node.js service not healthy"