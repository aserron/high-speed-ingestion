"""
High-Performance Financial Data Ingestion System - Python Implementation

This package provides a high-performance financial data ingestion system optimized
for real-time market data processing with sub-millisecond latency requirements.
"""

__version__ = "1.0.0"
__author__ = "Finance Benchmark Team"
__email__ = "team@finance-benchmark.com"

# Package-level imports for convenience
from .config import AppConfig, get_config
from .logging import setup_logging, get_logger
from .exceptions import (
    FinanceIngestionError,
    ConfigurationError,
    ConnectionError,
    ProcessingError,
    StorageError,
)

__all__ = [
    "__version__",
    "__author__", 
    "__email__",
    "AppConfig",
    "get_config",
    "setup_logging",
    "get_logger",
    "FinanceIngestionError",
    "ConfigurationError", 
    "ConnectionError",
    "ProcessingError",
    "StorageError",
]