"""
Integration Test Configuration

Provides configuration management specifically for integration tests,
including test-specific settings and environment setup.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class TestDatabaseConfig:
    """Test database configuration"""
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_test_db: int = 15
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_database: str = "finance_benchmark_test"
    postgres_username: str = "benchmark_user"
    postgres_password: str = "benchmark_pass"


@dataclass
class TestNetworkConfig:
    """Test network configuration"""
    simulator_host: str = "localhost"
    simulator_port: int = 18765
    python_api_port: int = 18080
    node_api_port: int = 18081
    python_metrics_port: int = 19090
    node_metrics_port: int = 19091


@dataclass
class TestScenarioConfig:
    """Test scenario configuration"""
    # Basic test parameters
    basic_duration_seconds: int = 10
    basic_message_rate: int = 1000
    
    # High throughput test parameters
    high_throughput_duration_seconds: int = 15
    high_throughput_message_rate: int = 5000
    
    # Stress test parameters
    stress_duration_seconds: int = 20
    stress_message_rate: int = 8000
    
    # Sustained load test parameters
    sustained_duration_seconds: int = 30
    sustained_message_rate: int = 2000
    
    # Memory stability test parameters
    memory_test_duration_seconds: int = 25
    memory_test_message_rate: int = 3000
    
    # Network failure test parameters
    failure_test_duration_seconds: int = 20
    failure_test_message_rate: int = 1000
    failure_rate: float = 0.001
    
    # Burst test parameters
    burst_duration_seconds: int = 25
    burst_base_rate: int = 1000
    burst_peak_rate: int = 10000
    burst_interval_seconds: float = 10.0
    burst_duration_seconds_per_burst: float = 5.0


@dataclass
class TestSymbolConfig:
    """Test symbol configuration"""
    symbols: list = field(default_factory=lambda: ["AAPL", "GOOGL", "MSFT", "TSLA"])
    exchanges: list = field(default_factory=lambda: ["NYSE", "NASDAQ", "BATS"])
    price_range_min: float = 10.0
    price_range_max: float = 500.0
    quantity_range_min: float = 100.0
    quantity_range_max: float = 10000.0
    volatility: float = 0.02


@dataclass
class TestMonitoringConfig:
    """Test monitoring configuration"""
    resource_monitoring_enabled: bool = True
    resource_sampling_interval_seconds: float = 1.0
    max_resource_snapshots: int = 1000
    
    # Performance thresholds
    max_memory_growth_mb: float = 500.0
    min_throughput_mps: float = 500.0
    max_latency_ms: float = 100.0
    
    # Test timeouts
    application_startup_timeout_seconds: int = 30
    application_shutdown_timeout_seconds: int = 10
    database_connection_timeout_seconds: int = 10


@dataclass
class IntegrationTestConfig:
    """Complete integration test configuration"""
    database: TestDatabaseConfig = field(default_factory=TestDatabaseConfig)
    network: TestNetworkConfig = field(default_factory=TestNetworkConfig)
    scenarios: TestScenarioConfig = field(default_factory=TestScenarioConfig)
    symbols: TestSymbolConfig = field(default_factory=TestSymbolConfig)
    monitoring: TestMonitoringConfig = field(default_factory=TestMonitoringConfig)
    
    # Test environment settings
    cleanup_after_tests: bool = True
    parallel_test_execution: bool = False
    verbose_logging: bool = True
    save_test_artifacts: bool = True
    test_artifacts_path: str = "test_artifacts"
    
    # Application settings
    python_app_enabled: bool = True
    node_app_enabled: bool = True
    simulator_enabled: bool = True
    
    def __post_init__(self):
        """Post-initialization setup"""
        # Create test artifacts directory
        if self.save_test_artifacts:
            Path(self.test_artifacts_path).mkdir(exist_ok=True)
    
    @classmethod
    def from_environment(cls) -> 'IntegrationTestConfig':
        """Create configuration from environment variables"""
        config = cls()
        
        # Override with environment variables if present
        if os.getenv('TEST_REDIS_HOST'):
            config.database.redis_host = os.getenv('TEST_REDIS_HOST')
        
        if os.getenv('TEST_REDIS_PORT'):
            config.database.redis_port = int(os.getenv('TEST_REDIS_PORT'))
        
        if os.getenv('TEST_POSTGRES_HOST'):
            config.database.postgres_host = os.getenv('TEST_POSTGRES_HOST')
        
        if os.getenv('TEST_POSTGRES_PORT'):
            config.database.postgres_port = int(os.getenv('TEST_POSTGRES_PORT'))
        
        if os.getenv('TEST_POSTGRES_DATABASE'):
            config.database.postgres_database = os.getenv('TEST_POSTGRES_DATABASE')
        
        if os.getenv('TEST_SIMULATOR_PORT'):
            config.network.simulator_port = int(os.getenv('TEST_SIMULATOR_PORT'))
        
        if os.getenv('TEST_PYTHON_API_PORT'):
            config.network.python_api_port = int(os.getenv('TEST_PYTHON_API_PORT'))
        
        if os.getenv('TEST_NODE_API_PORT'):
            config.network.node_api_port = int(os.getenv('TEST_NODE_API_PORT'))
        
        if os.getenv('TEST_VERBOSE') == 'true':
            config.verbose_logging = True
        
        if os.getenv('TEST_CLEANUP') == 'false':
            config.cleanup_after_tests = False
        
        if os.getenv('TEST_PARALLEL') == 'true':
            config.parallel_test_execution = True
        
        return config
    
    def get_python_env_vars(self) -> Dict[str, str]:
        """Get environment variables for Python application"""
        return {
            'WEBSOCKET_URL': f'ws://{self.network.simulator_host}:{self.network.simulator_port}',
            'REDIS_HOST': self.database.redis_host,
            'REDIS_PORT': str(self.database.redis_port),
            'REDIS_DB': str(self.database.redis_test_db),
            'POSTGRESQL_HOST': self.database.postgres_host,
            'POSTGRESQL_PORT': str(self.database.postgres_port),
            'POSTGRESQL_DATABASE': self.database.postgres_database,
            'POSTGRESQL_USERNAME': self.database.postgres_username,
            'POSTGRESQL_PASSWORD': self.database.postgres_password,
            'MONITORING_HEALTH_CHECK_PORT': str(self.network.python_api_port),
            'MONITORING_PROMETHEUS_PORT': str(self.network.python_metrics_port),
            'ENVIRONMENT': 'testing',
            'LOG_LEVEL': 'DEBUG' if self.verbose_logging else 'INFO'
        }
    
    def get_node_env_vars(self) -> Dict[str, str]:
        """Get environment variables for Node.js application"""
        return {
            'WEBSOCKET_URL': f'ws://{self.network.simulator_host}:{self.network.simulator_port}',
            'REDIS_HOST': self.database.redis_host,
            'REDIS_PORT': str(self.database.redis_port),
            'REDIS_DB': str(self.database.redis_test_db),
            'POSTGRESQL_HOST': self.database.postgres_host,
            'POSTGRESQL_PORT': str(self.database.postgres_port),
            'POSTGRESQL_DATABASE': self.database.postgres_database,
            'POSTGRESQL_USERNAME': self.database.postgres_username,
            'POSTGRESQL_PASSWORD': self.database.postgres_password,
            'MONITORING_HEALTH_CHECK_PORT': str(self.network.node_api_port),
            'MONITORING_PROMETHEUS_PORT': str(self.network.node_metrics_port),
            'NODE_ENV': 'testing',
            'MONITORING_LOG_LEVEL': 'debug' if self.verbose_logging else 'info'
        }
    
    def get_simulator_config_dict(self) -> Dict[str, Any]:
        """Get simulator configuration as dictionary"""
        return {
            'host': self.network.simulator_host,
            'port': self.network.simulator_port,
            'symbols': self.symbols.symbols,
            'exchanges': self.symbols.exchanges,
            'price_range_min': self.symbols.price_range_min,
            'price_range_max': self.symbols.price_range_max,
            'quantity_range_min': self.symbols.quantity_range_min,
            'quantity_range_max': self.symbols.quantity_range_max,
            'price_volatility': self.symbols.volatility,
            'serialization_format': 'json'
        }


# Global test configuration instance
_test_config: Optional[IntegrationTestConfig] = None


def get_test_config() -> IntegrationTestConfig:
    """Get the global test configuration instance"""
    global _test_config
    if _test_config is None:
        _test_config = IntegrationTestConfig.from_environment()
    return _test_config


def set_test_config(config: IntegrationTestConfig) -> None:
    """Set the global test configuration instance"""
    global _test_config
    _test_config = config


def reset_test_config() -> None:
    """Reset the global test configuration instance"""
    global _test_config
    _test_config = None