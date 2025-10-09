"""
Benchmark Configuration

Configuration settings and utilities for the benchmark orchestration system.
"""

import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field


@dataclass
class BenchmarkEnvironmentConfig:
    """Environment configuration for benchmarks"""
    
    # Application paths
    python_app_path: Path = Path("apps/python-ingestion/src/finance_ingestion/cli.py")
    nodejs_app_path: Path = Path("apps/node-ingestion/src/index.js")
    
    # Network configuration
    simulator_host: str = "localhost"
    simulator_port: int = 18765
    python_api_port: int = 18080
    nodejs_api_port: int = 18081
    python_metrics_port: int = 19090
    nodejs_metrics_port: int = 19091
    
    # Database configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_python_db: int = 1
    redis_nodejs_db: int = 2
    
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_database: str = "finance_benchmark"
    postgres_username: str = "benchmark_user"
    postgres_password: str = "benchmark_pass"
    
    # Resource limits
    default_cpu_limit_percent: Optional[int] = None
    default_memory_limit_mb: Optional[int] = None
    
    # Monitoring settings
    resource_monitoring_interval: float = 1.0
    metrics_collection_interval: float = 5.0
    
    # Timeouts
    application_startup_timeout: int = 30
    application_shutdown_timeout: int = 10
    
    @classmethod
    def from_environment(cls) -> 'BenchmarkEnvironmentConfig':
        """Create configuration from environment variables"""
        config = cls()
        
        # Override with environment variables if present
        if os.getenv('BENCHMARK_SIMULATOR_HOST'):
            config.simulator_host = os.getenv('BENCHMARK_SIMULATOR_HOST')
        
        if os.getenv('BENCHMARK_SIMULATOR_PORT'):
            config.simulator_port = int(os.getenv('BENCHMARK_SIMULATOR_PORT'))
        
        if os.getenv('BENCHMARK_REDIS_HOST'):
            config.redis_host = os.getenv('BENCHMARK_REDIS_HOST')
        
        if os.getenv('BENCHMARK_REDIS_PORT'):
            config.redis_port = int(os.getenv('BENCHMARK_REDIS_PORT'))
        
        if os.getenv('BENCHMARK_POSTGRES_HOST'):
            config.postgres_host = os.getenv('BENCHMARK_POSTGRES_HOST')
        
        if os.getenv('BENCHMARK_POSTGRES_PORT'):
            config.postgres_port = int(os.getenv('BENCHMARK_POSTGRES_PORT'))
        
        if os.getenv('BENCHMARK_POSTGRES_DATABASE'):
            config.postgres_database = os.getenv('BENCHMARK_POSTGRES_DATABASE')
        
        if os.getenv('BENCHMARK_CPU_LIMIT'):
            config.default_cpu_limit_percent = int(os.getenv('BENCHMARK_CPU_LIMIT'))
        
        if os.getenv('BENCHMARK_MEMORY_LIMIT'):
            config.default_memory_limit_mb = int(os.getenv('BENCHMARK_MEMORY_LIMIT'))
        
        return config
    
    def get_python_env_vars(self) -> Dict[str, str]:
        """Get environment variables for Python application"""
        return {
            'WEBSOCKET_URL': f'ws://{self.simulator_host}:{self.simulator_port}',
            'REDIS_HOST': self.redis_host,
            'REDIS_PORT': str(self.redis_port),
            'REDIS_DB': str(self.redis_python_db),
            'POSTGRESQL_HOST': self.postgres_host,
            'POSTGRESQL_PORT': str(self.postgres_port),
            'POSTGRESQL_DATABASE': self.postgres_database,
            'POSTGRESQL_USERNAME': self.postgres_username,
            'POSTGRESQL_PASSWORD': self.postgres_password,
            'MONITORING_HEALTH_CHECK_PORT': str(self.python_api_port),
            'MONITORING_PROMETHEUS_PORT': str(self.python_metrics_port),
            'ENVIRONMENT': 'benchmark',
            'LOG_LEVEL': 'INFO'
        }
    
    def get_nodejs_env_vars(self) -> Dict[str, str]:
        """Get environment variables for Node.js application"""
        return {
            'WEBSOCKET_URL': f'ws://{self.simulator_host}:{self.simulator_port}',
            'REDIS_HOST': self.redis_host,
            'REDIS_PORT': str(self.redis_port),
            'REDIS_DB': str(self.redis_nodejs_db),
            'POSTGRESQL_HOST': self.postgres_host,
            'POSTGRESQL_PORT': str(self.postgres_port),
            'POSTGRESQL_DATABASE': self.postgres_database,
            'POSTGRESQL_USERNAME': self.postgres_username,
            'POSTGRESQL_PASSWORD': self.postgres_password,
            'MONITORING_HEALTH_CHECK_PORT': str(self.nodejs_api_port),
            'MONITORING_PROMETHEUS_PORT': str(self.nodejs_metrics_port),
            'NODE_ENV': 'benchmark',
            'MONITORING_LOG_LEVEL': 'info'
        }


@dataclass
class BenchmarkReportingConfig:
    """Configuration for benchmark reporting"""
    
    # Output settings
    save_detailed_logs: bool = True
    save_metrics_data: bool = True
    save_resource_snapshots: bool = True
    
    # Chart generation
    generate_charts: bool = True
    chart_format: str = "png"  # png, svg, pdf
    chart_dpi: int = 300
    
    # Report formats
    generate_json_report: bool = True
    generate_html_report: bool = True
    generate_csv_export: bool = True
    
    # Comparison settings
    include_performance_comparison: bool = True
    include_resource_comparison: bool = True
    include_latency_distribution: bool = True
    
    # Retention settings
    max_result_files: int = 100
    cleanup_old_results: bool = True


# Default benchmark environment configuration
DEFAULT_BENCHMARK_ENV = BenchmarkEnvironmentConfig.from_environment()

# Default reporting configuration
DEFAULT_REPORTING_CONFIG = BenchmarkReportingConfig()


def get_benchmark_symbols(category: str = "default") -> List[str]:
    """Get symbol lists for different benchmark categories"""
    symbol_sets = {
        "default": ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"],
        "large": ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "NFLX"],
        "extended": [
            "AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "NFLX",
            "ORCL", "CRM", "ADBE", "INTC", "AMD", "QCOM", "AVGO", "TXN"
        ],
        "small": ["AAPL", "GOOGL", "MSFT"],
        "single": ["AAPL"]
    }
    
    return symbol_sets.get(category, symbol_sets["default"])


def get_benchmark_exchanges() -> List[str]:
    """Get list of exchanges for benchmarking"""
    return ["NYSE", "NASDAQ", "BATS", "ARCA", "IEX"]


def validate_benchmark_environment() -> List[str]:
    """Validate benchmark environment and return list of issues"""
    issues = []
    
    config = DEFAULT_BENCHMARK_ENV
    
    # Check if application files exist
    if not config.python_app_path.exists():
        issues.append(f"Python application not found: {config.python_app_path}")
    
    if not config.nodejs_app_path.exists():
        issues.append(f"Node.js application not found: {config.nodejs_app_path}")
    
    # Check if ports are available (basic check)
    import socket
    
    ports_to_check = [
        config.simulator_port,
        config.python_api_port,
        config.nodejs_api_port,
        config.python_metrics_port,
        config.nodejs_metrics_port
    ]
    
    for port in ports_to_check:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((config.simulator_host, port))
                if result == 0:
                    issues.append(f"Port {port} is already in use")
        except Exception as e:
            issues.append(f"Could not check port {port}: {e}")
    
    return issues


def print_benchmark_environment_info():
    """Print benchmark environment information"""
    config = DEFAULT_BENCHMARK_ENV
    
    print("Benchmark Environment Configuration:")
    print("=" * 50)
    print(f"Simulator: {config.simulator_host}:{config.simulator_port}")
    print(f"Python API: {config.simulator_host}:{config.python_api_port}")
    print(f"Node.js API: {config.simulator_host}:{config.nodejs_api_port}")
    print(f"Redis: {config.redis_host}:{config.redis_port}")
    print(f"PostgreSQL: {config.postgres_host}:{config.postgres_port}/{config.postgres_database}")
    
    # Check for issues
    issues = validate_benchmark_environment()
    if issues:
        print(f"\nEnvironment Issues:")
        for issue in issues:
            print(f"  ⚠️  {issue}")
    else:
        print(f"\n✅ Environment validation passed")


if __name__ == "__main__":
    print_benchmark_environment_info()