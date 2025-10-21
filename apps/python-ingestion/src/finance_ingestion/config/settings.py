"""
Configuration settings using Pydantic for validation and environment variable loading.

This module provides a hierarchical configuration system that loads settings from:
1. Base configuration files
2. Environment-specific configuration files  
3. Local development overrides
4. Environment variables (highest priority)
"""

import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from pydantic import BaseSettings, Field, SecretStr, validator
from pydantic.env_settings import SettingsSourceCallable


class DatabaseConfig(BaseSettings):
    """Database connection configuration."""
    
    host: str = Field(default="localhost", description="Database host")
    port: int = Field(default=5432, description="Database port")
    name: str = Field(default="finance_benchmark", description="Database name")
    username: str = Field(description="Database username")
    password: SecretStr = Field(description="Database password")
    ssl: bool = Field(default=False, description="Enable SSL connection")
    pool_min: int = Field(default=2, description="Minimum pool connections")
    pool_max: int = Field(default=10, description="Maximum pool connections")
    connection_timeout: int = Field(default=5000, description="Connection timeout in ms")
    idle_timeout: int = Field(default=30000, description="Idle timeout in ms")
    
    @validator('port')
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v
    
    @validator('pool_min', 'pool_max')
    def validate_pool_size(cls, v):
        if v < 1:
            raise ValueError('Pool size must be at least 1')
        return v
    
    @validator('pool_max')
    def validate_pool_max_greater_than_min(cls, v, values):
        if 'pool_min' in values and v < values['pool_min']:
            raise ValueError('pool_max must be greater than or equal to pool_min')
        return v
    
    class Config:
        env_prefix = "DB_"
        case_sensitive = False


class RedisConfig(BaseSettings):
    """Redis connection configuration."""
    
    host: str = Field(default="localhost", description="Redis host")
    port: int = Field(default=6379, description="Redis port")
    password: Optional[SecretStr] = Field(default=None, description="Redis password")
    db: int = Field(default=0, description="Redis database number")
    connect_timeout: int = Field(default=5000, description="Connection timeout in ms")
    command_timeout: int = Field(default=3000, description="Command timeout in ms")
    retry_attempts: int = Field(default=3, description="Number of retry attempts")
    retry_delay: int = Field(default=1000, description="Retry delay in ms")
    
    @validator('port')
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v
    
    @validator('db')
    def validate_db(cls, v):
        if not 0 <= v <= 15:
            raise ValueError('Redis database must be between 0 and 15')
        return v
    
    @validator('retry_attempts')
    def validate_retry_attempts(cls, v):
        if v < 0:
            raise ValueError('Retry attempts must be non-negative')
        return v
    
    class Config:
        env_prefix = "REDIS_"
        case_sensitive = False


class WebSocketConfig(BaseSettings):
    """WebSocket server configuration."""
    
    enabled: bool = Field(default=True, description="Enable WebSocket server")
    port: int = Field(default=8080, description="WebSocket server port")
    path: str = Field(default="/ws", description="WebSocket endpoint path")
    heartbeat_interval: int = Field(default=30000, description="Heartbeat interval in ms")
    max_connections: int = Field(default=1000, description="Maximum concurrent connections")
    compression: bool = Field(default=True, description="Enable compression")
    
    @validator('port')
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v
    
    @validator('max_connections')
    def validate_max_connections(cls, v):
        if v < 1:
            raise ValueError('Max connections must be at least 1')
        return v
    
    @validator('heartbeat_interval')
    def validate_heartbeat_interval(cls, v):
        if v < 1000:
            raise ValueError('Heartbeat interval must be at least 1000ms')
        return v
    
    class Config:
        env_prefix = "WS_"
        case_sensitive = False


class MonitoringConfig(BaseSettings):
    """Monitoring and metrics configuration."""
    
    prometheus_enabled: bool = Field(default=True, description="Enable Prometheus metrics")
    prometheus_port: int = Field(default=9090, description="Prometheus metrics port")
    prometheus_path: str = Field(default="/metrics", description="Prometheus metrics path")
    grafana_enabled: bool = Field(default=False, description="Enable Grafana dashboard")
    grafana_port: int = Field(default=3001, description="Grafana dashboard port")
    
    @validator('prometheus_port', 'grafana_port')
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v
    
    class Config:
        env_prefix = "PROMETHEUS_"
        case_sensitive = False


class SecurityConfig(BaseSettings):
    """Security and CORS configuration."""
    
    cors_enabled: bool = Field(default=True, description="Enable CORS")
    cors_origin: str = Field(default="*", description="CORS allowed origins")
    rate_limit_enabled: bool = Field(default=False, description="Enable rate limiting")
    rate_limit_max: int = Field(default=100, description="Rate limit max requests")
    rate_limit_window: int = Field(default=900, description="Rate limit window in seconds")
    ssl_enabled: bool = Field(default=False, description="Enable SSL/TLS")
    ssl_cert_path: Optional[str] = Field(default=None, description="SSL certificate path")
    ssl_key_path: Optional[str] = Field(default=None, description="SSL private key path")
    
    @validator('rate_limit_max')
    def validate_rate_limit_max(cls, v):
        if v < 1:
            raise ValueError('Rate limit max must be at least 1')
        return v
    
    @validator('rate_limit_window')
    def validate_rate_limit_window(cls, v):
        if v < 1:
            raise ValueError('Rate limit window must be at least 1 second')
        return v
    
    class Config:
        env_prefix = "CORS_"
        case_sensitive = False


class ApplicationConfig(BaseSettings):
    """Main application configuration that combines all sub-configurations."""
    
    # Application settings
    port: int = Field(default=3000, description="Application server port")
    host: str = Field(default="0.0.0.0", description="Application server host")
    log_level: str = Field(default="info", description="Logging level")
    log_format: str = Field(default="json", description="Log format")
    enable_metrics: bool = Field(default=True, description="Enable metrics collection")
    enable_clustering: bool = Field(default=False, description="Enable clustering")
    cluster_workers: str = Field(default="auto", description="Number of cluster workers")
    
    # Environment metadata
    environment: str = Field(default="development", description="Deployment environment")
    version: str = Field(default="1.0.0", description="Application version")
    build_number: Optional[str] = Field(default=None, description="Build number")
    git_commit: Optional[str] = Field(default=None, description="Git commit hash")
    
    # Sub-configurations
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    redis: RedisConfig = Field(default_factory=RedisConfig)
    websocket: WebSocketConfig = Field(default_factory=WebSocketConfig)
    monitoring: MonitoringConfig = Field(default_factory=MonitoringConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    
    @validator('port')
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v
    
    @validator('log_level')
    def validate_log_level(cls, v):
        valid_levels = ['debug', 'info', 'warning', 'error', 'critical']
        if v.lower() not in valid_levels:
            raise ValueError(f'Log level must be one of: {valid_levels}')
        return v.lower()
    
    @validator('log_format')
    def validate_log_format(cls, v):
        valid_formats = ['json', 'text', 'structured']
        if v.lower() not in valid_formats:
            raise ValueError(f'Log format must be one of: {valid_formats}')
        return v.lower()
    
    @validator('cluster_workers')
    def validate_cluster_workers(cls, v):
        if v != "auto":
            try:
                workers = int(v)
                if workers < 1:
                    raise ValueError('Cluster workers must be at least 1 or "auto"')
            except ValueError:
                raise ValueError('Cluster workers must be a number or "auto"')
        return v
    
    class Config:
        env_prefix = ""
        case_sensitive = False
        
        @classmethod
        def customise_sources(
            cls,
            init_settings: SettingsSourceCallable,
            env_settings: SettingsSourceCallable,
            file_secret_settings: SettingsSourceCallable,
        ) -> tuple[SettingsSourceCallable, ...]:
            """Customize the order of configuration sources."""
            return (
                init_settings,
                env_settings,
                _load_config_files,
                file_secret_settings,
            )


def _load_config_files(settings: BaseSettings) -> Dict[str, Any]:
    """
    Load configuration from hierarchical config files.
    
    Loading order:
    1. Base configuration files
    2. Environment-specific configuration
    3. Local development overrides
    """
    config = {}
    
    # Get the project root directory
    project_root = Path(__file__).parent.parent.parent.parent.parent.parent
    config_dir = project_root / "configs"
    
    if not config_dir.exists():
        return config
    
    # Load base configuration files
    base_dir = config_dir / "base"
    if base_dir.exists():
        for config_file in base_dir.glob("*.env"):
            config.update(_load_env_file(config_file))
    
    # Load environment-specific configuration
    environment = os.getenv("NODE_ENV", os.getenv("DEPLOYMENT_ENVIRONMENT", "development"))
    env_file = config_dir / "environments" / f"{environment}.env"
    if env_file.exists():
        config.update(_load_env_file(env_file))
    
    # Load local development overrides
    local_file = config_dir / "local" / ".env.local"
    if local_file.exists():
        config.update(_load_env_file(local_file))
    
    return config


def _load_env_file(file_path: Path) -> Dict[str, Any]:
    """Load environment variables from a file."""
    config = {}
    
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                
                # Parse key=value pairs
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    
                    # Remove quotes if present
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    elif value.startswith("'") and value.endswith("'"):
                        value = value[1:-1]
                    
                    # Convert boolean strings
                    if value.lower() in ('true', 'false'):
                        value = value.lower() == 'true'
                    
                    # Convert numeric strings
                    elif value.isdigit():
                        value = int(value)
                    
                    config[key.lower()] = value
                    
    except Exception as e:
        # Log warning but don't fail
        print(f"Warning: Could not load config file {file_path}: {e}")
    
    return config


# Global configuration instance
_config: Optional[ApplicationConfig] = None


def get_config() -> ApplicationConfig:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = ApplicationConfig()
    return _config


def validate_config(environment: Optional[str] = None) -> tuple[bool, List[str], List[str]]:
    """
    Validate the configuration for a specific environment.
    
    Args:
        environment: Target environment (development, staging, production)
        
    Returns:
        Tuple of (is_valid, errors, warnings)
    """
    errors = []
    warnings = []
    
    # Set environment if provided
    if environment:
        os.environ["DEPLOYMENT_ENVIRONMENT"] = environment
    
    try:
        # Try to create configuration instance
        config = ApplicationConfig()
        
        # Check for default/insecure values
        if config.database.password.get_secret_value() in ["postgres", "password", "admin"]:
            warnings.append("Using default database password - change for production")
        
        if config.redis.password and config.redis.password.get_secret_value() in ["redis", "password"]:
            warnings.append("Using default Redis password - change for production")
        
        if config.environment == "production":
            # Production-specific validations
            if not config.security.ssl_enabled:
                warnings.append("SSL is disabled in production environment")
            
            if config.log_level == "debug":
                warnings.append("Debug logging enabled in production")
            
            if config.security.cors_origin == "*":
                errors.append("CORS origin cannot be '*' in production")
            
            if not config.security.rate_limit_enabled:
                warnings.append("Rate limiting is disabled in production")
        
        # Check required environment variables for non-development environments
        if environment in ["staging", "production"]:
            required_vars = [
                f"{environment.upper()}_DB_HOST",
                f"{environment.upper()}_DB_USERNAME", 
                f"{environment.upper()}_DB_PASSWORD",
                f"{environment.upper()}_REDIS_HOST",
            ]
            
            for var in required_vars:
                if not os.getenv(var):
                    errors.append(f"Required environment variable {var} is not set")
        
        return len(errors) == 0, errors, warnings
        
    except Exception as e:
        errors.append(f"Configuration validation failed: {str(e)}")
        return False, errors, warnings


def reload_config() -> ApplicationConfig:
    """Reload the global configuration instance."""
    global _config
    _config = None
    return get_config()