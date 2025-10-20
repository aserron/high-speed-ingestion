# Project Structure

## Monorepo Organization

This is a **Turborepo monorepo** with npm workspaces. All applications and packages are coordinated through the root-level build system.

## Top-Level Structure

```
├── apps/                    # Application implementations
│   ├── python-ingestion/    # Python implementation
│   ├── node-ingestion/      # Node.js implementation
│   ├── dashboard/           # Monitoring dashboard
│   └── docs-site/           # Documentation site
├── packages/                # Shared packages
│   ├── shared/              # Common schemas and utilities
│   ├── types/               # TypeScript type definitions
│   └── config/              # Shared configuration
├── infrastructure/          # Infrastructure and deployment
│   ├── docker/              # Docker Compose configurations
│   ├── monitoring/          # Prometheus, Grafana, alerts
│   └── docs/                # Infrastructure documentation
├── tests/                   # Cross-application tests
│   ├── e2e/                 # End-to-end tests
│   ├── integration/         # Integration tests
│   ├── performance/         # Performance and regression tests
│   ├── python/              # Python-specific tests
│   └── node/                # Node.js-specific tests
├── benchmarks/              # Benchmark suite and reporting
├── docs/                    # Project documentation
├── scripts/                 # Utility scripts and database setup
└── tools/                   # Development tools and utilities
```

## Application Structure Conventions

### Python Implementation (`apps/python-ingestion/`)
- **src/**: Main source code
- **tests/**: Application-specific tests
- **requirements.txt**: Python dependencies
- **setup.py**: Package configuration
- **Dockerfile**: Container configuration

### Node.js Implementation (`apps/node-ingestion/`)
- **src/**: Main source code (ES modules)
- **tests/**: Application-specific tests
- **package.json**: Dependencies and scripts
- **Dockerfile**: Container configuration

### Dashboard (`apps/dashboard/`)
- Simple Express.js server for monitoring
- Static assets for real-time visualization
- CORS-enabled for cross-origin requests

## Shared Packages

### `packages/shared/`
- Common schemas and validation
- Shared utilities between implementations
- TypeScript definitions
- Built with `tsc` and consumed by both apps

### `packages/types/`
- TypeScript type definitions
- Interface contracts between services
- Message format specifications

## Infrastructure Organization

### `infrastructure/docker/`
- **docker-compose.base.yml**: Base services (PostgreSQL, Redis, Prometheus, Grafana)
- **docker-compose.dev.yml**: Development overrides (hot-reload, debug ports)
- **docker-compose.prod.yml**: Production overrides (optimized resources, health checks)

### `infrastructure/monitoring/`
- Prometheus configuration and rules
- Grafana dashboards and data sources
- Alert manager configurations

## Testing Structure

### Cross-Application Tests (`tests/`)
- **e2e/**: Full system integration tests
- **integration/**: Service-to-service integration
- **performance/**: Benchmark and regression tests

### Application-Specific Tests
- Each app has its own `tests/` directory
- Unit tests alongside source code
- Integration tests for external dependencies

## File Naming Conventions

### Python
- **snake_case** for files and modules
- **PascalCase** for classes
- **UPPER_CASE** for constants
- Test files: `test_*.py` or `*_test.py`

### Node.js
- **kebab-case** for files
- **camelCase** for variables and functions
- **PascalCase** for classes
- **ES modules** with `.js` extension
- Test files: `*.test.js` or `*.spec.js`

## Configuration Management

### Environment-Specific Config
- `.env` files for local development
- Docker environment variables for containerized deployment
- Separate configs for dev/prod environments

### Shared Configuration
- `packages/config/` for common settings
- JSON schemas for validation
- Environment variable mapping

## Documentation Organization

### `docs/`
- **User guides** and API documentation
- **Deployment guides** and operational procedures
- **Performance analysis** and benchmark reports
- **Troubleshooting guides**

### Code Documentation
- **Python**: Docstrings following Google style
- **Node.js**: JSDoc comments for functions and classes
- **README.md** in each application directory