# Configuration Guide

This guide covers all configuration options for the Finance Ingestion Benchmark project, including environment variables, configuration files, and performance tuning parameters.

## Configuration Overview

The project uses a hierarchical configuration system:

1. **Default Values**: Built-in defaults for all settings
2. **Configuration Files**: YAML/JSON files for structured configuration
3. **Environment Variables**: Override any setting via environment variables
4. **Command Line Arguments**: Runtime parameter overrides

### Configuration Priority

Settings are applied in this order (highest priority first):

1. Command line arguments
2. Environment variables
3. Configuration files
4. Default values

## Environment Variables

### Core Application Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Application environment |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `LOG_FORMAT` | `json` | Log format (json, text) |
| `ENABLE_METRICS` | `true` | Enable Prometheus metrics |
| `ENABLE_TRACING` | `false` | Enable distributed tracing |

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `3001` (Python), `3002` (Node.js) | Server port |
| `METRICS_PORT` | `9090` | Prometheus metrics port |
| `HEALTH_CHECK_INTERVAL` | `30` | Health check interval (seconds) |

### WebSocket Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WEBSOCKET_URLS` | `""` | Comma-separated WebSocket URLs |
| `WEBSOCKET_MAX_RETRIES` | `10` | Maximum reconnection attempts |
| `WEBSOCKET_BASE_DELAY` | `100` | Base reconnection delay (ms) |
| `WEBSOCKET_MAX_DELAY` | `5000` | Maximum reconnection delay (ms) |
| `WEBSOCKET_PING_INTERVAL` | `20000` | Ping interval (ms) |
| `WEBSOCKET_PING_TIMEOUT` | `10000` | Ping timeout (ms) |
| `WEBSOCKET_COMPRESSION` | `""` | Compression algorithm (deflate, "") |

### Storage Configuration

#### Redis Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server host |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_DB` | `0` | Redis database number |
| `REDIS_PASSWORD` | `""` | Redis password |
| `REDIS_MAX_CONNECTIONS` | `10` | Maximum connection pool size |
| `REDIS_TTL` | `3600` | Default TTL for keys (seconds) |
| `REDIS_KEY_PREFIX` | `finance:` | Key prefix for namespacing |

#### PostgreSQL Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | PostgreSQL server host |
| `POSTGRES_PORT` | `5432` | PostgreSQL server port |
| `POSTGRES_DB` | `finance_benchmark` | Database name |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `""` | Database password |
| `POSTGRES_MAX_CONNECTIONS` | `20` | Maximum connection pool size |
| `POSTGRES_SSL_MODE` | `prefer` | SSL mode (disable, prefer, require) |

### Performance Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_BATCHING` | `true` | Enable message batching |
| `BATCH_SIZE` | `100` | Messages per batch |
| `MAX_LATENCY_MS` | `1.0` | Maximum acceptable latency (ms) |
| `BUFFER_SIZE` | `10000` | In-memory buffer size |
| `BUFFER_FLUSH_INTERVAL` | `5000` | Buffer flush interval (ms) |
| `BACKPRESSURE_STRATEGY` | `drop_oldest` | Backpressure handling strategy |
| `QUEUE_SIZE_THRESHOLD` | `1000` | Queue size threshold for backpressure |

### Authentication Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | `""` | API key for WebSocket authentication |
| `JWT_SECRET` | `""` | JWT secret for token validation |
| `AUTH_HEADER_NAME` | `Authorization` | Authentication header name |
| `ENABLE_API_AUTH` | `false` | Enable API authentication |

## Configuration Files

### Main Configuration File

Create `config/config.yaml` for structured configuration:

```yaml
# config/config.yaml
app:
  name: "finance-ingestion-benchmark"
  version: "1.0.0"
  environment: "development"
  
server:
  host: "0.0.0.0"
  port: 3001
  metrics_port: 9090
  
logging:
  level: "info"
  format: "json"
  enable_console: true
  enable_file: false
  file_path: "logs/app.log"
  
websocket:
  urls:
    - "wss://feed1.example.com/market-data"
    - "wss://feed2.example.com/market-data"
  connection:
    max_retries: 10
    base_delay: 100  # milliseconds
    max_delay: 5000
    ping_interval: 20000
    ping_timeout: 10000
    compression: null
  authentication:
    type: "bearer"  # bearer, api_key, none
    token: "${API_TOKEN}"
    header: "Authorization"
    
storage:
  redis:
    host: "localhost"
    port: 6379
    db: 0
    password: null
    max_connections: 10
    ttl: 3600
    key_prefix: "finance:"
    
  postgresql:
    host: "localhost"
    port: 5432
    database: "finance_benchmark"
    user: "postgres"
    password: "${POSTGRES_PASSWORD}"
    max_connections: 20
    ssl_mode: "prefer"
    
  buffer:
    size: 10000
    flush_interval: 5000  # milliseconds
    flush_threshold: 1000  # messages
    
processing:
  batching:
    enabled: true
    size: 100
    timeout: 10  # milliseconds
    
  performance:
    max_latency_ms: 1.0
    enable_zero_copy: true
    
  backpressure:
    strategy: "drop_oldest"  # drop_oldest, drop_newest, block
    queue_threshold: 1000
    latency_threshold: 5.0  # milliseconds
    
monitoring:
  metrics:
    enabled: true
    port: 9090
    path: "/metrics"
    
  tracing:
    enabled: false
    service_name: "finance-ingestion"
    jaeger_endpoint: "http://localhost:14268/api/traces"
    
  health_check:
    enabled: true
    interval: 30  # seconds
    timeout: 5    # seconds
```

### Environment-Specific Configuration

Create environment-specific configuration files:

::: code-group

```yaml [config/development.yaml]
app:
  environment: "development"
  
logging:
  level: "debug"
  enable_console: true
  
websocket:
  urls:
    - "ws://localhost:8080/market-data"  # Local test server
    
processing:
  performance:
    max_latency_ms: 5.0  # More relaxed for development
    
monitoring:
  tracing:
    enabled: true  # Enable tracing in development
```

```yaml [config/production.yaml]
app:
  environment: "production"
  
logging:
  level: "info"
  enable_file: true
  file_path: "/var/log/finance-ingestion/app.log"
  
websocket:
  urls:
    - "wss://prod-feed1.example.com/market-data"
    - "wss://prod-feed2.example.com/market-data"
  connection:
    max_retries: 20
    
storage:
  redis:
    max_connections: 50
  postgresql:
    max_connections: 100
    ssl_mode: "require"
    
processing:
  performance:
    max_latency_ms: 0.5  # Strict latency requirements
    
monitoring:
  tracing:
    enabled: true
    service_name: "finance-ingestion-prod"
```

```yaml [config/testing.yaml]
app:
  environment: "testing"
  
logging:
  level: "warn"
  enable_console: false
  
storage:
  redis:
    db: 1  # Use different database for tests
  postgresql:
    database: "finance_benchmark_test"
    
processing:
  batching:
    size: 10  # Smaller batches for faster tests
    
monitoring:
  metrics:
    enabled: false  # Disable metrics in tests
```

:::

## Python-Specific Configuration

### Configuration Class

```python
# apps/python-ingestion/src/finance_ingestion/config.py
import os
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import yaml

@dataclass
class WebSocketConfig:
    urls: List[str] = field(default_factory=list)
    max_retries: int = 10
    base_delay: float = 0.1  # seconds
    max_delay: float = 5.0
    ping_interval: int = 20
    ping_timeout: int = 10
    compression: Optional[str] = None
    
@dataclass
class RedisConfig:
    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: Optional[str] = None
    max_connections: int = 10
    ttl: int = 3600
    key_prefix: str = "finance:"
    
@dataclass
class PostgreSQLConfig:
    host: str = "localhost"
    port: int = 5432
    database: str = "finance_benchmark"
    user: str = "postgres"
    password: str = ""
    max_connections: int = 20
    ssl_mode: str = "prefer"
    
@dataclass
class ProcessingConfig:
    enable_batching: bool = True
    batch_size: int = 100
    max_latency_ms: float = 1.0
    buffer_size: int = 10000
    backpressure_strategy: str = "drop_oldest"
    
@dataclass
class AppConfig:
    # Server settings
    host: str = "0.0.0.0"
    port: int = 3001
    
    # Component configurations
    websocket: WebSocketConfig = field(default_factory=WebSocketConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)
    postgresql: PostgreSQLConfig = field(default_factory=PostgreSQLConfig)
    processing: ProcessingConfig = field(default_factory=ProcessingConfig)
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Load configuration from environment variables."""
        return cls(
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "3001")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            log_format=os.getenv("LOG_FORMAT", "json"),
            
            websocket=WebSocketConfig(
                urls=os.getenv("WEBSOCKET_URLS", "").split(",") if os.getenv("WEBSOCKET_URLS") else [],
                max_retries=int(os.getenv("WEBSOCKET_MAX_RETRIES", "10")),
                base_delay=float(os.getenv("WEBSOCKET_BASE_DELAY", "0.1")),
                ping_interval=int(os.getenv("WEBSOCKET_PING_INTERVAL", "20"))
            ),
            
            redis=RedisConfig(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                db=int(os.getenv("REDIS_DB", "0")),
                password=os.getenv("REDIS_PASSWORD"),
                max_connections=int(os.getenv("REDIS_MAX_CONNECTIONS", "10"))
            ),
            
            postgresql=PostgreSQLConfig(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                database=os.getenv("POSTGRES_DB", "finance_benchmark"),
                user=os.getenv("POSTGRES_USER", "postgres"),
                password=os.getenv("POSTGRES_PASSWORD", ""),
                max_connections=int(os.getenv("POSTGRES_MAX_CONNECTIONS", "20"))
            ),
            
            processing=ProcessingConfig(
                enable_batching=os.getenv("ENABLE_BATCHING", "true").lower() == "true",
                batch_size=int(os.getenv("BATCH_SIZE", "100")),
                max_latency_ms=float(os.getenv("MAX_LATENCY_MS", "1.0")),
                buffer_size=int(os.getenv("BUFFER_SIZE", "10000"))
            )
        )
    
    @classmethod
    def from_file(cls, config_path: str) -> 'AppConfig':
        """Load configuration from YAML file."""
        with open(config_path, 'r') as f:
            config_data = yaml.safe_load(f)
        
        # Convert nested dict to dataclass instances
        return cls(**config_data)
```

### Usage Example

```python
# Load configuration
config = AppConfig.from_env()

# Override with file if exists
if os.path.exists("config/config.yaml"):
    file_config = AppConfig.from_file("config/config.yaml")
    # Merge configurations (env takes precedence)
    config = merge_configs(file_config, config)

# Use configuration
app = FinanceIngestionApp(config)
```

## Node.js-Specific Configuration

### Configuration Module

```javascript
// apps/node-ingestion/src/config/index.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class Config {
    constructor() {
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        // Start with defaults
        const defaults = {
            app: {
                name: 'finance-ingestion-node',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            },
            server: {
                host: process.env.HOST || '0.0.0.0',
                port: parseInt(process.env.PORT) || 3002,
                metricsPort: parseInt(process.env.METRICS_PORT) || 9091
            },
            websocket: {
                urls: process.env.WEBSOCKET_URLS ? process.env.WEBSOCKET_URLS.split(',') : [],
                maxRetries: parseInt(process.env.WEBSOCKET_MAX_RETRIES) || 10,
                baseDelay: parseInt(process.env.WEBSOCKET_BASE_DELAY) || 100,
                maxDelay: parseInt(process.env.WEBSOCKET_MAX_DELAY) || 5000,
                pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL) || 20000,
                pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT) || 10000
            },
            storage: {
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT) || 6379,
                    db: parseInt(process.env.REDIS_DB) || 0,
                    password: process.env.REDIS_PASSWORD || null,
                    maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS) || 10,
                    ttl: parseInt(process.env.REDIS_TTL) || 3600,
                    keyPrefix: process.env.REDIS_KEY_PREFIX || 'finance:'
                },
                postgresql: {
                    host: process.env.POSTGRES_HOST || 'localhost',
                    port: parseInt(process.env.POSTGRES_PORT) || 5432,
                    database: process.env.POSTGRES_DB || 'finance_benchmark',
                    user: process.env.POSTGRES_USER || 'postgres',
                    password: process.env.POSTGRES_PASSWORD || '',
                    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
                    ssl: process.env.POSTGRES_SSL_MODE === 'require'
                }
            },
            processing: {
                enableBatching: process.env.ENABLE_BATCHING !== 'false',
                batchSize: parseInt(process.env.BATCH_SIZE) || 100,
                maxLatencyMs: parseFloat(process.env.MAX_LATENCY_MS) || 1.0,
                bufferSize: parseInt(process.env.BUFFER_SIZE) || 10000,
                backpressureStrategy: process.env.BACKPRESSURE_STRATEGY || 'drop_oldest'
            },
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                format: process.env.LOG_FORMAT || 'json'
            }
        };
        
        // Load from config file if exists
        const configFile = this.findConfigFile();
        if (configFile) {
            const fileConfig = this.loadConfigFile(configFile);
            return this.mergeConfigs(defaults, fileConfig);
        }
        
        return defaults;
    }
    
    findConfigFile() {
        const environment = process.env.NODE_ENV || 'development';
        const configPaths = [
            `config/${environment}.yaml`,
            `config/${environment}.yml`,
            'config/config.yaml',
            'config/config.yml'
        ];
        
        for (const configPath of configPaths) {
            if (fs.existsSync(configPath)) {
                return configPath;
            }
        }
        
        return null;
    }
    
    loadConfigFile(configPath) {
        try {
            const fileContent = fs.readFileSync(configPath, 'utf8');
            return yaml.load(fileContent);
        } catch (error) {
            console.warn(`Failed to load config file ${configPath}:`, error.message);
            return {};
        }
    }
    
    mergeConfigs(defaults, override) {
        // Deep merge configuration objects
        return this.deepMerge(defaults, override);
    }
    
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    get(path, defaultValue = null) {
        return this.getNestedValue(this.config, path, defaultValue);
    }
    
    getNestedValue(obj, path, defaultValue) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }
}

module.exports = new Config();
```

### Usage Example

```javascript
const config = require('./config');

// Access configuration values
const serverPort = config.get('server.port');
const redisHost = config.get('storage.redis.host');
const batchSize = config.get('processing.batchSize');

// Use in application
const app = express();
app.listen(serverPort, () => {
    console.log(`Server running on port ${serverPort}`);
});
```

## Performance Tuning Configuration

### High-Performance Settings

For maximum performance, use these optimized settings:

```yaml
# config/high-performance.yaml
processing:
  batching:
    enabled: true
    size: 1000  # Larger batches for higher throughput
    timeout: 1   # Aggressive batching timeout
    
  performance:
    max_latency_ms: 0.5  # Strict latency requirement
    enable_zero_copy: true
    
  backpressure:
    strategy: "drop_oldest"
    queue_threshold: 5000  # Higher threshold
    
storage:
  redis:
    max_connections: 50  # More connections for higher concurrency
    
  postgresql:
    max_connections: 100
    
  buffer:
    size: 50000  # Larger buffer
    flush_threshold: 5000  # Batch larger writes
    
websocket:
  connection:
    ping_interval: 10000  # More frequent pings
    compression: "deflate"  # Enable compression
```

### Memory-Optimized Settings

For memory-constrained environments:

```yaml
# config/memory-optimized.yaml
processing:
  batching:
    size: 50  # Smaller batches
    
storage:
  buffer:
    size: 1000  # Smaller buffer
    flush_threshold: 100
    
  redis:
    max_connections: 5
    ttl: 1800  # Shorter TTL
    
  postgresql:
    max_connections: 10
```

## Configuration Validation

### Python Validation

```python
from pydantic import BaseModel, validator
from typing import List, Optional

class WebSocketConfig(BaseModel):
    urls: List[str]
    max_retries: int = 10
    base_delay: float = 0.1
    
    @validator('max_retries')
    def validate_max_retries(cls, v):
        if v < 1 or v > 100:
            raise ValueError('max_retries must be between 1 and 100')
        return v
    
    @validator('base_delay')
    def validate_base_delay(cls, v):
        if v < 0.01 or v > 10.0:
            raise ValueError('base_delay must be between 0.01 and 10.0 seconds')
        return v

class AppConfig(BaseModel):
    websocket: WebSocketConfig
    # ... other configurations
    
    class Config:
        validate_assignment = True
```

### Node.js Validation

```javascript
const Joi = require('joi');

const configSchema = Joi.object({
    server: Joi.object({
        host: Joi.string().ip().required(),
        port: Joi.number().port().required()
    }),
    
    websocket: Joi.object({
        urls: Joi.array().items(Joi.string().uri()).min(1).required(),
        maxRetries: Joi.number().integer().min(1).max(100).default(10),
        baseDelay: Joi.number().min(10).max(10000).default(100)
    }),
    
    processing: Joi.object({
        batchSize: Joi.number().integer().min(1).max(10000).default(100),
        maxLatencyMs: Joi.number().min(0.1).max(1000).default(1.0)
    })
});

function validateConfig(config) {
    const { error, value } = configSchema.validate(config);
    if (error) {
        throw new Error(`Configuration validation failed: ${error.message}`);
    }
    return value;
}
```

## Configuration Best Practices

### Security

1. **Never commit secrets**: Use environment variables for passwords and API keys
2. **Use secure defaults**: Enable SSL/TLS by default in production
3. **Validate inputs**: Always validate configuration values
4. **Principle of least privilege**: Use minimal required permissions

### Performance

1. **Environment-specific tuning**: Different settings for dev/staging/prod
2. **Resource limits**: Set appropriate connection pool sizes
3. **Monitoring**: Enable metrics and logging in production
4. **Graceful degradation**: Configure backpressure handling

### Maintainability

1. **Documentation**: Document all configuration options
2. **Defaults**: Provide sensible defaults for all settings
3. **Validation**: Validate configuration at startup
4. **Hot reloading**: Support configuration updates without restart (where safe)

## Next Steps

- **[Development Guide](/guide/development)** - Set up development environment
- **[Monitoring Guide](/guide/monitoring)** - Configure monitoring and alerting
- **[Performance Tuning](/benchmarks/tuning)** - Optimize for your use case
- **[Deployment Guide](/guide/production)** - Production deployment configuration