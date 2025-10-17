# Infrastructure Consolidation Design

## Overview

This design consolidates scattered infrastructure configuration files into a well-organized directory structure that supports multiple environments, improves maintainability, and provides clear separation of concerns for the finance ingestion benchmark monorepo.

## Architecture

### Directory Structure
```
infrastructure/
├── docker/
│   ├── docker-compose.base.yml      # Base services (Redis, PostgreSQL, etc.)
│   ├── docker-compose.dev.yml       # Development overrides
│   ├── docker-compose.prod.yml      # Production overrides
│   └── environments/
│       ├── .env.dev.template        # Development environment template
│       └── .env.prod.template       # Production environment template
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml           # Main Prometheus config
│   │   └── rules/                   # Alert rules
│   ├── grafana/
│   │   ├── dashboards/              # Dashboard definitions
│   │   └── provisioning/            # Grafana provisioning configs
│   └── alerts/
│       └── alertmanager.yml         # Alert manager configuration
└── docs/
    ├── deployment.md                # Deployment guide
    ├── environments.md              # Environment differences
    └── monitoring.md                # Monitoring setup guide
```

## Components and Interfaces

### Docker Compose Structure

#### Base Services (docker-compose.base.yml)
- **Purpose**: Define common infrastructure services
- **Services**: Redis, PostgreSQL, Prometheus, Grafana
- **Configuration**: Environment-agnostic settings
- **Interface**: Extended by environment-specific overrides

#### Development Override (docker-compose.dev.yml)
- **Purpose**: Development-specific configurations
- **Features**: 
  - Volume mounts for hot-reload
  - Debug ports exposed
  - Relaxed resource limits
  - Development logging levels
- **Interface**: Extends base services with dev-specific settings

#### Production Override (docker-compose.prod.yml)
- **Purpose**: Production-optimized configurations
- **Features**:
  - No volume mounts
  - Optimized resource limits
  - Production logging levels
  - Health checks enabled
- **Interface**: Extends base services with prod-specific settings

### Monitoring Stack Organization

#### Prometheus Configuration
- **Location**: `infrastructure/monitoring/prometheus/`
- **Components**: Main config, scrape configs, recording rules
- **Interface**: Service discovery for dynamic targets

#### Grafana Setup
- **Location**: `infrastructure/monitoring/grafana/`
- **Components**: Dashboards, data sources, provisioning
- **Interface**: Automated dashboard deployment

#### Alerting System
- **Location**: `infrastructure/monitoring/alerts/`
- **Components**: Alert rules, notification channels
- **Interface**: Integration with external alerting systems

## Data Models

### Environment Configuration Schema
```yaml
# Environment template structure
services:
  app:
    environment:
      - NODE_ENV=${NODE_ENV}
      - LOG_LEVEL=${LOG_LEVEL}
      - REDIS_URL=${REDIS_URL}
      - POSTGRES_URL=${POSTGRES_URL}
    volumes: # Development only
      - ./apps:/app
    deploy:
      resources:
        limits:
          cpus: ${CPU_LIMIT}
          memory: ${MEMORY_LIMIT}
```

### Service Discovery Model
```yaml
# Prometheus service discovery
scrape_configs:
  - job_name: 'finance-services'
    static_configs:
      - targets: 
        - 'python-ingestion:8000'
        - 'node-ingestion:8000'
        - 'dashboard:8080'
```

## Error Handling

### Configuration Validation
- **Docker Compose**: Validate compose files before deployment
- **Environment Variables**: Check required variables are set
- **Service Health**: Implement health checks for all services
- **Fallback Strategy**: Graceful degradation when optional services fail

### Migration Safety
- **Backward Compatibility**: Maintain existing npm script interfaces
- **Gradual Migration**: Support both old and new paths during transition
- **Rollback Plan**: Easy reversion to original structure if needed

### Monitoring Resilience
- **Service Discovery**: Handle dynamic service registration
- **Alert Reliability**: Ensure alerts work across environment changes
- **Dashboard Persistence**: Maintain dashboard configurations across updates

## Testing Strategy

### Configuration Testing
- **Docker Compose Validation**: Lint and validate all compose files
- **Environment Testing**: Test each environment configuration separately
- **Service Integration**: Verify services can communicate across environments

### Migration Testing
- **Backward Compatibility**: Test existing workflows continue to work
- **Environment Parity**: Ensure dev/prod environments remain consistent
- **Performance Impact**: Verify no performance regression from changes

### Monitoring Validation
- **Metrics Collection**: Verify all metrics are still collected
- **Dashboard Functionality**: Test all Grafana dashboards work
- **Alert Testing**: Validate alert rules fire correctly

## Implementation Phases

### Phase 1: Infrastructure Directory Setup
1. Create infrastructure directory structure
2. Move and organize existing configuration files
3. Update file references in Docker compose

### Phase 2: Environment Separation
1. Split docker-compose.yml into base and environment-specific files
2. Create environment variable templates
3. Update npm scripts to use new structure

### Phase 3: Monitoring Consolidation
1. Organize Prometheus and Grafana configurations
2. Set up alert rules and dashboards
3. Test monitoring stack functionality

### Phase 4: Documentation and Cleanup
1. Update all documentation references
2. Remove old configuration files
3. Verify backward compatibility

## Design Decisions

### File Organization Rationale
- **Separation by Function**: Docker, monitoring, and docs in separate directories
- **Environment Inheritance**: Base configuration extended by environment-specific overrides
- **Template Approach**: Environment variables templated for easy customization

### Backward Compatibility Strategy
- **Script Preservation**: Keep existing npm scripts working
- **Gradual Migration**: Support transition period with both structures
- **Documentation Updates**: Clear migration guide for team members

### Monitoring Architecture
- **Centralized Configuration**: All monitoring configs in one location
- **Modular Setup**: Separate components for easy maintenance
- **Environment Awareness**: Different monitoring for dev vs prod