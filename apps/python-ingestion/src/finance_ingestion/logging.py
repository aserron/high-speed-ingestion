"""
Structured Logging Infrastructure

Provides high-performance structured logging with JSON output, correlation IDs,
and integration with the monitoring system for comprehensive observability.
"""

import logging
import logging.config
import sys
import time
import uuid
from contextvars import ContextVar
from typing import Any, Dict, Optional, Union
from pathlib import Path

import structlog
from pythonjsonlogger import jsonlogger

from .config import AppConfig, get_config
from .exceptions import FinanceIngestionError


# Context variable for correlation ID tracking
correlation_id: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)


class CorrelationIdProcessor:
    """Structlog processor to add correlation IDs to log records."""
    
    def __call__(self, logger, method_name, event_dict):
        """Add correlation ID to the event dictionary."""
        corr_id = correlation_id.get()
        if corr_id:
            event_dict['correlation_id'] = corr_id
        return event_dict


class TimestampProcessor:
    """Structlog processor to add high-precision timestamps."""
    
    def __call__(self, logger, method_name, event_dict):
        """Add timestamp to the event dictionary."""
        event_dict['timestamp'] = time.time_ns()  # Nanosecond precision
        event_dict['timestamp_iso'] = structlog.stdlib.add_log_level(
            logger, method_name, event_dict
        ).get('timestamp', time.time())
        return event_dict


class PerformanceProcessor:
    """Structlog processor to add performance-related metadata."""
    
    def __call__(self, logger, method_name, event_dict):
        """Add performance metadata to the event dictionary."""
        # Add log level as numeric value for easier filtering
        level_map = {
            'debug': 10,
            'info': 20,
            'warning': 30,
            'error': 40,
            'critical': 50,
        }
        event_dict['level_num'] = level_map.get(method_name, 20)
        
        # Add process/thread information for debugging
        import os
        import threading
        event_dict['process_id'] = os.getpid()
        event_dict['thread_id'] = threading.get_ident()
        
        return event_dict


class ExceptionProcessor:
    """Structlog processor to handle FinanceIngestionError exceptions."""
    
    def __call__(self, logger, method_name, event_dict):
        """Process FinanceIngestionError exceptions for structured logging."""
        exc_info = event_dict.get('exc_info')
        if exc_info and isinstance(exc_info, FinanceIngestionError):
            # Add structured exception information
            event_dict.update(exc_info.to_dict())
            # Remove the raw exc_info to avoid duplication
            event_dict.pop('exc_info', None)
        
        return event_dict


class CustomJSONFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter with enhanced formatting for financial data ingestion.
    
    Provides consistent JSON structure and handles special data types
    commonly used in financial applications.
    """
    
    def add_fields(self, log_record, record, message_dict):
        """Add custom fields to the log record."""
        super().add_fields(log_record, record, message_dict)
        
        # Ensure consistent field naming
        if 'levelname' in log_record:
            log_record['level'] = log_record.pop('levelname').lower()
        
        if 'name' in log_record:
            log_record['logger'] = log_record.pop('name')
        
        # Add application metadata
        config = get_config()
        log_record['application'] = config.name
        log_record['version'] = config.version
        log_record['environment'] = config.environment
        
        # Format timestamp consistently
        if 'created' in log_record:
            log_record['timestamp'] = log_record['created']
        
        # Handle financial data types
        self._format_financial_data(log_record)
    
    def _format_financial_data(self, log_record):
        """Format financial data types for consistent logging."""
        # Format price and quantity fields with appropriate precision
        for field in ['price', 'quantity', 'latency_ns', 'processing_time_ns']:
            if field in log_record and isinstance(log_record[field], (int, float)):
                if 'ns' in field:
                    # Keep nanosecond precision for timing fields
                    log_record[field] = int(log_record[field])
                elif field in ['price', 'quantity']:
                    # Format financial values with 8 decimal places
                    log_record[field] = round(float(log_record[field]), 8)


def setup_logging(config: Optional[AppConfig] = None) -> None:
    """
    Set up the logging infrastructure for the application.
    
    Configures both standard library logging and structlog for
    high-performance structured logging with JSON output.
    
    Args:
        config: Optional configuration object. If not provided,
                the global configuration will be used.
    """
    if config is None:
        config = get_config()
    
    # Configure standard library logging
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'json': {
                '()': CustomJSONFormatter,
                'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
                'datefmt': '%Y-%m-%dT%H:%M:%S',
            },
            'text': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': config.monitoring.log_format,
                'stream': sys.stdout,
            },
        },
        'loggers': {
            'finance_ingestion': {
                'level': config.monitoring.log_level,
                'handlers': ['console'],
                'propagate': False,
            },
            'uvloop': {
                'level': 'WARNING',
                'handlers': ['console'],
                'propagate': False,
            },
            'websockets': {
                'level': 'INFO',
                'handlers': ['console'],
                'propagate': False,
            },
            'asyncpg': {
                'level': 'INFO',
                'handlers': ['console'],
                'propagate': False,
            },
        },
        'root': {
            'level': config.monitoring.log_level,
            'handlers': ['console'],
        },
    }
    
    # Add file handler for production
    if config.is_production():
        log_dir = Path('/var/log/finance-ingestion')
        log_dir.mkdir(exist_ok=True)
        
        logging_config['handlers']['file'] = {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(log_dir / 'application.log'),
            'maxBytes': 100 * 1024 * 1024,  # 100MB
            'backupCount': 10,
            'formatter': 'json',
        }
        
        # Add file handler to all loggers
        for logger_config in logging_config['loggers'].values():
            logger_config['handlers'].append('file')
        logging_config['root']['handlers'].append('file')
    
    logging.config.dictConfig(logging_config)
    
    # Configure structlog
    processors = [
        structlog.contextvars.merge_contextvars,
        CorrelationIdProcessor(),
        TimestampProcessor(),
        PerformanceProcessor(),
        ExceptionProcessor(),
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    
    if config.monitoring.log_format == 'json':
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.extend([
            structlog.dev.ConsoleRenderer(colors=not config.is_production()),
        ])
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: Optional[str] = None) -> structlog.BoundLogger:
    """
    Get a structured logger instance.
    
    Args:
        name: Logger name. If not provided, uses the caller's module name.
    
    Returns:
        Configured structlog BoundLogger instance
    """
    if name is None:
        # Get the caller's module name
        import inspect
        frame = inspect.currentframe()
        if frame and frame.f_back:
            name = frame.f_back.f_globals.get('__name__', 'finance_ingestion')
        else:
            name = 'finance_ingestion'
    
    return structlog.get_logger(name)


def set_correlation_id(corr_id: Optional[str] = None) -> str:
    """
    Set the correlation ID for the current context.
    
    Args:
        corr_id: Correlation ID to set. If not provided, generates a new UUID.
    
    Returns:
        The correlation ID that was set
    """
    if corr_id is None:
        corr_id = str(uuid.uuid4())
    
    correlation_id.set(corr_id)
    return corr_id


def get_correlation_id() -> Optional[str]:
    """
    Get the current correlation ID.
    
    Returns:
        The current correlation ID or None if not set
    """
    return correlation_id.get()


def clear_correlation_id() -> None:
    """Clear the current correlation ID."""
    correlation_id.set(None)


class LoggingContext:
    """
    Context manager for adding structured context to logs.
    
    All log messages within this context will include the provided
    key-value pairs automatically.
    """
    
    def __init__(self, **context):
        """
        Initialize the logging context.
        
        Args:
            **context: Key-value pairs to add to all log messages
        """
        self.context = context
        self.token = None
    
    def __enter__(self):
        """Enter the logging context."""
        self.token = structlog.contextvars.bind_contextvars(**self.context)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the logging context."""
        if self.token:
            structlog.contextvars.unbind_contextvars(self.token)


class PerformanceLogger:
    """
    Specialized logger for performance measurements.
    
    Provides convenient methods for logging latency, throughput,
    and other performance-related metrics.
    """
    
    def __init__(self, logger: Optional[structlog.BoundLogger] = None):
        """
        Initialize the performance logger.
        
        Args:
            logger: Optional logger instance. If not provided, creates a new one.
        """
        self.logger = logger or get_logger('performance')
    
    def log_latency(
        self,
        operation: str,
        latency_ns: int,
        message_id: Optional[str] = None,
        **context
    ) -> None:
        """
        Log latency measurement.
        
        Args:
            operation: Name of the operation being measured
            latency_ns: Latency in nanoseconds
            message_id: Optional message ID for correlation
            **context: Additional context information
        """
        log_data = {
            'operation': operation,
            'latency_ns': latency_ns,
            'latency_ms': latency_ns / 1_000_000,
        }
        
        if message_id:
            log_data['message_id'] = message_id
        
        log_data.update(context)
        
        self.logger.info('Latency measurement', **log_data)
    
    def log_throughput(
        self,
        operation: str,
        messages_per_second: float,
        bytes_per_second: Optional[int] = None,
        window_size_ms: Optional[int] = None,
        **context
    ) -> None:
        """
        Log throughput measurement.
        
        Args:
            operation: Name of the operation being measured
            messages_per_second: Messages processed per second
            bytes_per_second: Optional bytes processed per second
            window_size_ms: Optional measurement window size
            **context: Additional context information
        """
        log_data = {
            'operation': operation,
            'messages_per_second': messages_per_second,
        }
        
        if bytes_per_second is not None:
            log_data['bytes_per_second'] = bytes_per_second
        
        if window_size_ms is not None:
            log_data['window_size_ms'] = window_size_ms
        
        log_data.update(context)
        
        self.logger.info('Throughput measurement', **log_data)
    
    def log_resource_usage(
        self,
        cpu_percent: float,
        memory_bytes: int,
        memory_percent: float,
        **context
    ) -> None:
        """
        Log resource usage measurement.
        
        Args:
            cpu_percent: CPU usage percentage
            memory_bytes: Memory usage in bytes
            memory_percent: Memory usage percentage
            **context: Additional context information
        """
        log_data = {
            'cpu_percent': cpu_percent,
            'memory_bytes': memory_bytes,
            'memory_percent': memory_percent,
            'memory_mb': memory_bytes / (1024 * 1024),
        }
        
        log_data.update(context)
        
        self.logger.info('Resource usage', **log_data)


# Global performance logger instance
_performance_logger: Optional[PerformanceLogger] = None


def get_performance_logger() -> PerformanceLogger:
    """
    Get the global performance logger instance.
    
    Returns:
        PerformanceLogger instance
    """
    global _performance_logger
    if _performance_logger is None:
        _performance_logger = PerformanceLogger()
    return _performance_logger