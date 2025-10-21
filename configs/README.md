# Configuration Management

This directory contains the hierarchical configuration system for the Finance Ingestion Benchmark project.

## Directory Structure

```
configs/
├── base/                    # Base configuration templates
│   ├── app.base.env        # Application-level defaults
│   ├── services.base.env   # Service-level defaults
│   └── infrastructure.base.env # Infrastructure defaults
├── environments/           # Environment-specific overrides
│   ├── development.env     # Development configuration
│   ├── staging.env         # Staging configuration
│   └── production.env      # Production configuration
└── local/                  # Local development overrides
    ├── .env.example        # Example local configuration
    └── .gitignore          # Ignore local env files
```

## Configuration Hierarchy

Configuration values are loaded in the following order (later values override earlier ones):

1. **Base Configuration**: Default values from `base/*.env` files
2. **Environment Configuration**: Environment-specific overrides from `environments/{env}.env`
3. **Local Configuration**: Developer-specific overrides from `local/.env.local`
4. **Environment Variables**: System environment variables (highest priority)

## Usage

### For Applications

Applications should load configuration using the appropriate configuration management library:

- **Python**: Use Pydantic Settings with the configuration classes
- **Node.js**: Use Joi validation with the configuration loader

### For Development

1. Copy `local/.env.example` to `local/.env.local`
2. Customize values in `.env.local` for your local setup
3. The application will automatically load the appropriate configuration

### For Deployment

Set the `NODE_ENV` or `DEPLOYMENT_ENVIRONMENT` variable to load the correct environment configuration:

- `development`: Loads `environments/development.env`
- `staging`: Loads `environments/staging.env`
- `production`: Loads `environments/production.env`

## Configuration Categories

### Application Settings (`app.base.env`)
- Server configuration (port, host)
- Logging settings
- Performance tuning
- Security settings
- Feature flags

### Service Settings (`services.base.env`)
- Database connection settings
- Redis configuration
- WebSocket settings
- Message queue configuration

### Infrastructure Settings (`infrastructure.base.env`)
- Monitoring and metrics
- Docker configuration
- Load balancer settings
- Backup configuration
- SSL/TLS settings
- Environment metadata

## Security Best Practices

1. **Never commit sensitive values**: Use environment variables for passwords, API keys, etc.
2. **Use placeholder variables**: Reference environment variables like `${PROD_DB_PASSWORD}`
3. **Keep local files private**: The `local/.env.local` file is ignored by Git
4. **Validate configuration**: Use the configuration validator before starting applications

## Environment Variables

### Required for Staging/Production

The following environment variables must be set for staging and production deployments:

#### Database
- `STAGING_DB_HOST` / `PROD_DB_HOST`
- `STAGING_DB_USERNAME` / `PROD_DB_USERNAME`
- `STAGING_DB_PASSWORD` / `PROD_DB_PASSWORD`

#### Redis
- `STAGING_REDIS_HOST` / `PROD_REDIS_HOST`
- `STAGING_REDIS_PASSWORD` / `PROD_REDIS_PASSWORD`

#### Security
- `STAGING_CORS_ORIGIN` / `PROD_CORS_ORIGIN`

#### Backup (if enabled)
- `STAGING_BACKUP_BUCKET` / `PROD_BACKUP_BUCKET`

#### CI/CD Metadata (automatically set by CI)
- `CI_COMMIT_TAG`
- `CI_PIPELINE_ID`
- `CI_COMMIT_SHA`
- `CI_JOB_STARTED_AT`

## Validation

Use the configuration validator to check your setup:

```bash
# Validate development configuration
npm run validate-config --env=development

# Validate staging configuration  
npm run validate-config --env=staging

# Validate production configuration
npm run validate-config --env=production
```

## Troubleshooting

### Common Issues

1. **Missing environment variables**: Check that all required variables are set
2. **Invalid values**: Ensure values match expected types and formats
3. **File not found**: Verify the environment file exists for your target environment
4. **Permission errors**: Check file permissions for configuration files

### Debug Configuration Loading

Enable debug logging to see which configuration files are being loaded:

```bash
LOG_LEVEL=debug npm start
```

This will show the configuration loading process and final merged values.