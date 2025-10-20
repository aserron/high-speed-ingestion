# Technology Stack

## Build System
- **Monorepo**: Turborepo for coordinated builds and task execution
- **Package Manager**: npm with workspaces
- **Node.js**: 18+ required
- **Python**: 3.11+ required

## Python Implementation Stack
- **Runtime**: Python 3.11+ with uvloop for maximum performance
- **WebSocket**: websockets library with asyncio
- **Serialization**: msgpack for high-performance data serialization
- **Database**: asyncpg (PostgreSQL), redis with hiredis (Redis)
- **Web Framework**: FastAPI with uvicorn
- **Configuration**: pydantic and pydantic-settings
- **Logging**: structlog with python-json-logger
- **Monitoring**: prometheus-client
- **CLI**: click

## Node.js Implementation Stack
- **Runtime**: Node.js 18+ with native clustering and worker threads
- **WebSocket**: ws library with performance optimizations
- **Serialization**: msgpack5
- **Database**: pg (PostgreSQL), ioredis (Redis)
- **Web Framework**: Fastify
- **Configuration**: joi for validation
- **Logging**: winston
- **Monitoring**: prom-client
- **Testing**: Jest with ES modules support

## Infrastructure
- **Containerization**: Docker and Docker Compose
- **Monitoring**: Prometheus + Grafana stack
- **Databases**: PostgreSQL, Redis
- **Load Balancing**: Native clustering (Node.js), uvloop (Python)

## Common Commands

### Development
```bash
npm install              # Install all dependencies
npm run dev             # Start both implementations in development mode
npm run build           # Build both applications
npm run test            # Run all tests
npm run lint            # Lint all code
```

### Docker Operations
```bash
npm run docker:dev     # Start development environment
npm run docker:prod    # Start production environment
npm run docker:down    # Stop all services
npm run docker:logs    # View service logs
npm run docker:clean   # Clean up containers and volumes
```

### Benchmarking
```bash
npm run benchmark                    # Execute performance benchmarks
npm run test:regression             # Run regression tests
npm run test:regression:quick       # Quick regression tests
```

### Makefile Commands (Alternative)
```bash
make dev               # Start development environment
make prod              # Start production environment
make test              # Run tests in both implementations
make benchmark         # Run performance benchmarks
make clean             # Clean up everything
make health            # Check service health
```

## Performance Guidelines
- Maintain sub-millisecond processing latency
- Ensure memory stability under sustained load
- Implement identical functionality in both platforms
- Add comprehensive metrics for all new features
- Use ES modules for Node.js (type: "module")
- Prefer async/await patterns for both implementations