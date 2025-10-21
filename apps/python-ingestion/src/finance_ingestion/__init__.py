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
from .exceptions import (
    ConfigurationError,
    ConnectionError,
    FinanceIngestionError,
    ProcessingError,
    StorageError,
)
from .logging import get_logger, setup_logging

__all__ = [
    "AppConfig",
    "ConfigurationError",
    "ConnectionError",
    "FinanceIngestionError",
    "ProcessingError",
    "StorageError",
    "__author__",
    "__email__",
    "__version__",
    "get_config",
    "get_logger",
    "setup_logging",
]
