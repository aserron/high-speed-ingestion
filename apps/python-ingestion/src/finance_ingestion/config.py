"""
Configuration Management System

Provides centralized configuration management using Pydantic for validation
and environment variable support for different deployment environments.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from functools import lru_cache

from pydantic import BaseModel, Field, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class WebSocketConfig(BaseModel):
    """WebSocket connection configuration"""
    
    url: str = Field(
        default="wss://localhost:8080/market-data",
        description="WebSocket server URL"
    )
    protocols: Optional[List[str]] = Field(
        default=None,
        description="WebSocket sub-protocols"
    )
    headers: Optional[Dict[str, str]] = Field(
        default=None,
        description="Additional headers for WebSocket connection"
    )
    
    # Connection settings
    connect_timeout_ms: int = Field(
        default=5000,
        ge=1000,
        le=30000,
        description="Connection timeout in milliseconds"
    )
    ping_interval_ms: int = Field(
        default=30000,
        ge=5000,
        le=300000,
        description="Ping interval in milliseconds"
    )
    pong_timeout_ms: int = Field(
        default=5000,
        ge=1000,
        le=30000,
        description="Pong timeout in milliseconds"
    )
    
    # Reconnection settings
    max_reconnect_attempts: int = Field(
        default=10,
        ge=0,
        le=100,
        description="Maximum reconnection attempts (0 = infinite)"
    )
    reconnect_delay_ms: int = Field(
        default=100,
        ge=10,
        le=10000,
        description="Initial reconnection delay in milliseconds"
    )
    reconnect_backoff_multiplier: float = Field(
        default=2.0,
        ge=1.0,
        le=10.0,
        description="Backoff multiplier for reconnection delays"
    )
    reconnect_max_delay_ms: int = Field(
        default=30000,
        ge=1000,
        le=300000,
        description="Maximum reconnection delay in milliseconds"
    )
    reconnect_jitter_ms: int = Field(
        default=1000,
        ge=0,
        le=5000,
        description="Random jitter for reconnection delays"
    )
    
    # Performance settings
    max_message_size: int = Field(
        default=1024 * 1024,  # 1MB
        ge=1024,
        le=10 * 1024 * 1024,  # 10MB
        description="Maximum message size in bytes"
    )
    compression_enabled: bool = Field(
        default=True,
        description="Enable WebSocket compression"
    )
    
    # Security settings
    tls_enabled: bool = Field(
        default=True,
        description="Enable TLS/SSL"
    )
    tls_verify_certificate: bool = Field(
        default=True,
        description="Verify TLS certificate"
    )


class ProcessingConfig(BaseModel):
    """Message processing configuration"""
    
    # Batch processing
    batch_size: int = Field(
        default=100,
        ge=1,
        le=10000,
        description="Batch size for message processing"
    )
    batch_timeout_ms: int = Field(
        default=10,
        ge=1,
        le=1000,
        description="Batch timeout in milliseconds"
    )
    
    # Backpressure handling
    max_queue_size: int = Field(
        default=10000,
        ge=100,
        le=1000000,
        description="Maximum queue size for backpressure"
    )
    backpressure_threshold: float = Field(
        default=0.8,
        ge=0.1,
        le=1.0,
        description="Backpressure threshold (0.0-1.0)"
    )
    drop_oldest_on_backpressure: bool = Field(
        default=True,
        description="Drop oldest messages when backpressure threshold is reached"
    )
    
    # Performance monitoring
    latency_measurement_enabled: bool = Field(
        default=True,
        description="Enable latency measurement"
    )
    latency_histogram_buckets: List[float] = Field(
        default=[0.1, 0.5, 1, 2, 5, 10, 20, 50, 100],
        description="Latency histogram buckets in milliseconds"
    )
    metrics_collection_interval_ms: int = Field(
        default=1000,
        ge=100,
        le=60000,
        description="Metrics collection interval in milliseconds"
    )
    
    # Message validation
    validate_incoming_messages: bool = Field(
        default=True,
        description="Enable incoming message validation"
    )
    strict_schema_validation: bool = Field(
        default=False,
        description="Enable strict schema validation"
    )


class RedisConfig(BaseModel):
    """Redis configuration"""
    
    host: str = Field(default="localhost", description="Redis host")
    port: int = Field(default=6379, ge=1, le=65535, description="Redis port")
    password: Optional[str] = Field(default=None, description="Redis password")
    db: int = Field(default=0, ge=0, le=15, description="Redis database number")
    
    # Connection settings
    max_connections: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum connections in pool"
    )
    min_connections: int = Field(
        default=2,
        ge=1,
        le=50,
        description="Minimum connections in pool"
    )
    acquire_timeout_ms: int = Field(
        default=5000,
        ge=1000,
        le=30000,
        description="Connection acquire timeout in milliseconds"
    )
    
    # Performance settings
    socket_keepalive: bool = Field(
        default=True,
        description="Enable socket keepalive"
    )
    socket_keepalive_options: Optional[Dict[str, int]] = Field(
        default=None,
        description="Socket keepalive options"
    )
    key_prefix: Optional[str] = Field(
        default=None,
        description="Key prefix for all Redis keys"
    )


class PostgreSQLConfig(BaseModel):
    """PostgreSQL configuration"""
    
    host: str = Field(default="localhost", description="PostgreSQL host")
    port: int = Field(default=5432, ge=1, le=65535, description="PostgreSQL port")
    database: str = Field(default="finance_benchmark", description="Database name")
    username: str = Field(default="benchmark_user", description="Database username")
    password: str = Field(default="benchmark_pass", description="Database password")
    
    # Connection pooling
    max_connections: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Maximum connections in pool"
    )
    min_connections: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Minimum connections in pool"
    )
    acquire_timeout_ms: int = Field(
        default=5000,
        ge=1000,
        le=30000,
        description="Connection acquire timeout in milliseconds"
    )
    idle_timeout_ms: int = Field(
        default=30000,
        ge=5000,
        le=300000,
        description="Connection idle timeout in milliseconds"
    )
    
    # Performance settings
    statement_timeout_ms: int = Field(
        default=30000,
        ge=1000,
        le=300000,
        description="Statement timeout in milliseconds"
    )
    query_timeout_ms: int = Field(
        default=30000,
        ge=1000,
        le=300000,
        description="Query timeout in milliseconds"
    )
    ssl_enabled: bool = Field(
        default=False,
        description="Enable SSL connection"
    )


class BufferConfig(BaseModel):
    """In-memory buffer configuration"""
    
    max_size: int = Field(
        default=100000,
        ge=1000,
        le=10000000,
        description="Maximum buffer size"
    )
    flush_interval_ms: int = Field(
        default=1000,
        ge=100,
        le=60000,
        description="Buffer flush interval in milliseconds"
    )
    flush_threshold: int = Field(
        default=1000,
        ge=10,
        le=100000,
        description="Buffer flush threshold"
    )
    circular_buffer: bool = Field(
        default=True,
        description="Use circular buffer (overwrite oldest when full)"
    )


class MonitoringConfig(BaseModel):
    """Monitoring and observability configuration"""
    
    # Metrics export
    prometheus_enabled: bool = Field(
        default=True,
        description="Enable Prometheus metrics export"
    )
    prometheus_port: int = Field(
        default=9090,
        ge=1024,
        le=65535,
        description="Prometheus metrics port"
    )
    prometheus_path: str = Field(
        default="/metrics",
        description="Prometheus metrics endpoint path"
    )
    
    # Logging configuration
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )
    log_format: str = Field(
        default="json",
        description="Log format (json or text)"
    )
    log_timestamps: bool = Field(
        default=True,
        description="Include timestamps in logs"
    )
    
    # Health checks
    health_check_enabled: bool = Field(
        default=True,
        description="Enable health check endpoint"
    )
    health_check_port: int = Field(
        default=8080,
        ge=1024,
        le=65535,
        description="Health check endpoint port"
    )
    health_check_path: str = Field(
        default="/health",
        description="Health check endpoint path"
    )
    health_check_interval_ms: int = Field(
        default=5000,
        ge=1000,
        le=60000,
        description="Health check interval in milliseconds"
    )
    
    # Performance tracking
    track_resource_usage: bool = Field(
        default=True,
        description="Track system resource usage"
    )
    resource_usage_interval_ms: int = Field(
        default=1000,
        ge=100,
        le=60000,
        description="Resource usage tracking interval in milliseconds"
    )
    track_garbage_collection: bool = Field(
        default=True,
        description="Track garbage collection statistics"
    )

    @validator('log_level')
    def validate_log_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'log_level must be one of {valid_levels}')
        return v.upper()

    @validator('log_format')
    def validate_log_format(cls, v):
        valid_formats = ['json', 'text']
        if v.lower() not in valid_formats:
            raise ValueError(f'log_format must be one of {valid_formats}')
        return v.lower()


class BenchmarkConfig(BaseModel):
    """Benchmark-specific configuration"""
    
    # Test duration and load
    duration_ms: int = Field(
        default=60000,  # 1 minute
        ge=1000,
        le=3600000,  # 1 hour
        description="Benchmark duration in milliseconds"
    )
    warmup_ms: int = Field(
        default=10000,  # 10 seconds
        ge=0,
        le=300000,  # 5 minutes
        description="Warmup period in milliseconds"
    )
    cooldown_ms: int = Field(
        default=5000,  # 5 seconds
        ge=0,
        le=60000,  # 1 minute
        description="Cooldown period in milliseconds"
    )
    
    # Message generation
    message_rate_per_second: int = Field(
        default=10000,
        ge=1,
        le=1000000,
        description="Target message rate per second"
    )
    burst_mode_enabled: bool = Field(
        default=True,
        description="Enable burst mode testing"
    )
    burst_interval_ms: int = Field(
        default=10000,  # Every 10 seconds
        ge=1000,
        le=300000,
        description="Burst interval in milliseconds"
    )
    burst_multiplier: float = Field(
        default=5.0,
        ge=1.0,
        le=100.0,
        description="Burst rate multiplier"
    )
    
    # Test symbols
    symbols: List[str] = Field(
        default=['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX'],
        description="List of symbols to use in testing"
    )
    symbol_rotation_enabled: bool = Field(
        default=True,
        description="Enable symbol rotation during testing"
    )
    
    # Data generation
    price_range_min: float = Field(
        default=1.0,
        ge=0.01,
        description="Minimum price for generated data"
    )
    price_range_max: float = Field(
        default=1000.0,
        ge=1.0,
        description="Maximum price for generated data"
    )
    quantity_range_min: float = Field(
        default=1.0,
        ge=0.01,
        description="Minimum quantity for generated data"
    )
    quantity_range_max: float = Field(
        default=10000.0,
        ge=1.0,
        description="Maximum quantity for generated data"
    )
    exchanges: List[str] = Field(
        default=['NYSE', 'NASDAQ', 'BATS', 'ARCA'],
        description="List of exchanges to use in testing"
    )
    
    # Results collection
    collect_detailed_metrics: bool = Field(
        default=True,
        description="Collect detailed performance metrics"
    )
    save_results_to_database: bool = Field(
        default=True,
        description="Save benchmark results to database"
    )
    export_results_path: Optional[str] = Field(
        default=None,
        description="Path to export benchmark results"
    )


class AppConfig(BaseSettings):
    """Main application configuration"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application metadata
    name: str = Field(
        default="finance-ingestion-python",
        description="Application name"
    )
    version: str = Field(
        default="1.0.0",
        description="Application version"
    )
    environment: str = Field(
        default="development",
        description="Environment (development, testing, production)"
    )
    
    # Component configurations
    websocket: WebSocketConfig = Field(
        default_factory=WebSocketConfig,
        description="WebSocket configuration"
    )
    processing: ProcessingConfig = Field(
        default_factory=ProcessingConfig,
        description="Message processing configuration"
    )
    redis: RedisConfig = Field(
        default_factory=RedisConfig,
        description="Redis configuration"
    )
    postgresql: PostgreSQLConfig = Field(
        default_factory=PostgreSQLConfig,
        description="PostgreSQL configuration"
    )
    buffer: BufferConfig = Field(
        default_factory=BufferConfig,
        description="Buffer configuration"
    )
    monitoring: MonitoringConfig = Field(
        default_factory=MonitoringConfig,
        description="Monitoring configuration"
    )
    benchmark: BenchmarkConfig = Field(
        default_factory=BenchmarkConfig,
        description="Benchmark configuration"
    )
    
    # Runtime settings
    debug: bool = Field(
        default=False,
        description="Enable debug mode"
    )
    verbose: bool = Field(
        default=False,
        description="Enable verbose logging"
    )
    dry_run: bool = Field(
        default=False,
        description="Enable dry run mode (no actual processing)"
    )

    @validator('environment')
    def validate_environment(cls, v):
        valid_environments = ['development', 'testing', 'production']
        if v.lower() not in valid_environments:
            raise ValueError(f'environment must be one of {valid_environments}')
        return v.lower()

    def get_database_url(self) -> str:
        """Get PostgreSQL database URL"""
        return (
            f"postgresql://{self.postgresql.username}:{self.postgresql.password}"
            f"@{self.postgresql.host}:{self.postgresql.port}/{self.postgresql.database}"
        )

    def get_redis_url(self) -> str:
        """Get Redis connection URL"""
        auth = f":{self.redis.password}@" if self.redis.password else ""
        return f"redis://{auth}{self.redis.host}:{self.redis.port}/{self.redis.db}"

    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == "production"

    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == "development"


# Global configuration instance
_config: Optional[AppConfig] = None


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    """
    Get the global configuration instance.
    
    This function is cached to ensure the same configuration instance
    is returned across the application.
    
    Returns:
        AppConfig: The global configuration instance
    """
    global _config
    if _config is None:
        _config = AppConfig()
    return _config


def reload_config() -> AppConfig:
    """
    Reload the configuration from environment variables.
    
    This clears the cache and creates a new configuration instance.
    
    Returns:
        AppConfig: The new configuration instance
    """
    global _config
    get_config.cache_clear()
    _config = None
    return get_config()


def set_config(config: AppConfig) -> None:
    """
    Set the global configuration instance.
    
    This is primarily used for testing purposes.
    
    Args:
        config: The configuration instance to set
    """
    global _config
    get_config.cache_clear()
    _config = config