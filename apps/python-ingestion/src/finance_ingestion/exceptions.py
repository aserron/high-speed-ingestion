"""
Exception Hierarchy and Error Handling

Defines a comprehensive exception hierarchy for the financial data ingestion system
with proper error categorization and context preservation.
"""

from typing import Any, Dict, Optional, Union
import traceback
from datetime import datetime


class FinanceIngestionError(Exception):
    """
    Base exception class for all finance ingestion system errors.
    
    Provides structured error information including error codes, context,
    and timestamp for better debugging and monitoring.
    """
    
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ):
        """
        Initialize the exception.
        
        Args:
            message: Human-readable error message
            error_code: Machine-readable error code for categorization
            context: Additional context information
            cause: The underlying exception that caused this error
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code or self.__class__.__name__.upper()
        self.context = context or {}
        self.cause = cause
        self.timestamp = datetime.utcnow()
        
        # Preserve the original traceback if there's a cause
        if cause:
            self.__cause__ = cause
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the exception to a dictionary for structured logging.
        
        Returns:
            Dictionary representation of the exception
        """
        result = {
            "error_type": self.__class__.__name__,
            "error_code": self.error_code,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "context": self.context,
        }
        
        if self.cause:
            result["cause"] = {
                "type": self.cause.__class__.__name__,
                "message": str(self.cause),
            }
        
        return result
    
    def __str__(self) -> str:
        """String representation of the exception."""
        parts = [f"{self.error_code}: {self.message}"]
        
        if self.context:
            context_str = ", ".join(f"{k}={v}" for k, v in self.context.items())
            parts.append(f"Context: {context_str}")
        
        if self.cause:
            parts.append(f"Caused by: {self.cause}")
        
        return " | ".join(parts)


class ConfigurationError(FinanceIngestionError):
    """
    Raised when there are configuration-related errors.
    
    This includes invalid configuration values, missing required settings,
    or configuration validation failures.
    """
    
    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
        config_value: Optional[Any] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if config_key:
            context["config_key"] = config_key
        if config_value is not None:
            context["config_value"] = str(config_value)
        
        kwargs["context"] = context
        super().__init__(message, error_code="CONFIG_ERROR", **kwargs)


class ConnectionError(FinanceIngestionError):
    """
    Raised when there are connection-related errors.
    
    This includes WebSocket connection failures, database connection issues,
    Redis connection problems, and network-related errors.
    """
    
    def __init__(
        self,
        message: str,
        connection_type: Optional[str] = None,
        endpoint: Optional[str] = None,
        retry_count: Optional[int] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if connection_type:
            context["connection_type"] = connection_type
        if endpoint:
            context["endpoint"] = endpoint
        if retry_count is not None:
            context["retry_count"] = retry_count
        
        kwargs["context"] = context
        super().__init__(message, error_code="CONNECTION_ERROR", **kwargs)


class ProcessingError(FinanceIngestionError):
    """
    Raised when there are message processing errors.
    
    This includes message parsing failures, validation errors,
    serialization/deserialization issues, and processing pipeline failures.
    """
    
    def __init__(
        self,
        message: str,
        message_id: Optional[str] = None,
        processing_stage: Optional[str] = None,
        message_data: Optional[Dict[str, Any]] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if message_id:
            context["message_id"] = message_id
        if processing_stage:
            context["processing_stage"] = processing_stage
        if message_data:
            # Only include safe, non-sensitive data
            context["message_type"] = message_data.get("messageType")
            context["symbol"] = message_data.get("symbol")
            context["sequence_number"] = message_data.get("sequenceNumber")
        
        kwargs["context"] = context
        super().__init__(message, error_code="PROCESSING_ERROR", **kwargs)


class StorageError(FinanceIngestionError):
    """
    Raised when there are storage-related errors.
    
    This includes database write failures, Redis operation errors,
    buffer overflow conditions, and persistence issues.
    """
    
    def __init__(
        self,
        message: str,
        storage_type: Optional[str] = None,
        operation: Optional[str] = None,
        affected_records: Optional[int] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if storage_type:
            context["storage_type"] = storage_type
        if operation:
            context["operation"] = operation
        if affected_records is not None:
            context["affected_records"] = affected_records
        
        kwargs["context"] = context
        super().__init__(message, error_code="STORAGE_ERROR", **kwargs)


class ValidationError(FinanceIngestionError):
    """
    Raised when data validation fails.
    
    This includes schema validation errors, data type mismatches,
    and business rule violations.
    """
    
    def __init__(
        self,
        message: str,
        field_name: Optional[str] = None,
        field_value: Optional[Any] = None,
        validation_rule: Optional[str] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if field_name:
            context["field_name"] = field_name
        if field_value is not None:
            context["field_value"] = str(field_value)
        if validation_rule:
            context["validation_rule"] = validation_rule
        
        kwargs["context"] = context
        super().__init__(message, error_code="VALIDATION_ERROR", **kwargs)


class BackpressureError(FinanceIngestionError):
    """
    Raised when the system is under backpressure.
    
    This indicates that the system cannot keep up with the incoming
    message rate and needs to apply flow control.
    """
    
    def __init__(
        self,
        message: str,
        queue_size: Optional[int] = None,
        max_queue_size: Optional[int] = None,
        message_rate: Optional[float] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if queue_size is not None:
            context["queue_size"] = queue_size
        if max_queue_size is not None:
            context["max_queue_size"] = max_queue_size
        if message_rate is not None:
            context["message_rate"] = message_rate
        
        kwargs["context"] = context
        super().__init__(message, error_code="BACKPRESSURE_ERROR", **kwargs)


class MetricsError(FinanceIngestionError):
    """
    Raised when there are metrics collection or reporting errors.
    
    This includes Prometheus export failures, metrics calculation errors,
    and monitoring system issues.
    """
    
    def __init__(
        self,
        message: str,
        metric_name: Optional[str] = None,
        metric_type: Optional[str] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if metric_name:
            context["metric_name"] = metric_name
        if metric_type:
            context["metric_type"] = metric_type
        
        kwargs["context"] = context
        super().__init__(message, error_code="METRICS_ERROR", **kwargs)


class TimeoutError(FinanceIngestionError):
    """
    Raised when operations exceed their timeout limits.
    
    This includes connection timeouts, processing timeouts,
    and operation deadlines.
    """
    
    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        timeout_ms: Optional[int] = None,
        elapsed_ms: Optional[int] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if operation:
            context["operation"] = operation
        if timeout_ms is not None:
            context["timeout_ms"] = timeout_ms
        if elapsed_ms is not None:
            context["elapsed_ms"] = elapsed_ms
        
        kwargs["context"] = context
        super().__init__(message, error_code="TIMEOUT_ERROR", **kwargs)


class ResourceError(FinanceIngestionError):
    """
    Raised when there are system resource-related errors.
    
    This includes memory exhaustion, CPU overload,
    and other resource constraint violations.
    """
    
    def __init__(
        self,
        message: str,
        resource_type: Optional[str] = None,
        current_usage: Optional[Union[int, float]] = None,
        limit: Optional[Union[int, float]] = None,
        **kwargs
    ):
        context = kwargs.get("context", {})
        if resource_type:
            context["resource_type"] = resource_type
        if current_usage is not None:
            context["current_usage"] = current_usage
        if limit is not None:
            context["limit"] = limit
        
        kwargs["context"] = context
        super().__init__(message, error_code="RESOURCE_ERROR", **kwargs)


def handle_exception(
    exc: Exception,
    logger: Optional[Any] = None,
    context: Optional[Dict[str, Any]] = None,
    reraise: bool = True,
) -> Optional[FinanceIngestionError]:
    """
    Handle and optionally convert exceptions to FinanceIngestionError.
    
    This function provides centralized exception handling with logging
    and context preservation.
    
    Args:
        exc: The exception to handle
        logger: Optional logger instance for error logging
        context: Additional context to include
        reraise: Whether to reraise the exception after handling
    
    Returns:
        The converted FinanceIngestionError if not reraising
    
    Raises:
        The original or converted exception if reraise is True
    """
    # If it's already a FinanceIngestionError, just add context
    if isinstance(exc, FinanceIngestionError):
        if context:
            exc.context.update(context)
        finance_exc = exc
    else:
        # Convert to appropriate FinanceIngestionError subclass
        finance_exc = _convert_exception(exc, context)
    
    # Log the error if logger is provided
    if logger:
        logger.error(
            "Exception occurred",
            exc_info=exc,
            extra=finance_exc.to_dict()
        )
    
    if reraise:
        raise finance_exc
    
    return finance_exc


def _convert_exception(
    exc: Exception,
    context: Optional[Dict[str, Any]] = None
) -> FinanceIngestionError:
    """
    Convert a generic exception to an appropriate FinanceIngestionError subclass.
    
    Args:
        exc: The exception to convert
        context: Additional context to include
    
    Returns:
        The converted FinanceIngestionError
    """
    message = str(exc)
    
    # Map common exception types to our hierarchy
    if isinstance(exc, (ConnectionRefusedError, ConnectionResetError, OSError)):
        return ConnectionError(message, cause=exc, context=context)
    elif isinstance(exc, TimeoutError):
        return TimeoutError(message, cause=exc, context=context)
    elif isinstance(exc, (ValueError, TypeError)):
        return ValidationError(message, cause=exc, context=context)
    elif isinstance(exc, MemoryError):
        return ResourceError(
            message,
            resource_type="memory",
            cause=exc,
            context=context
        )
    else:
        # Generic conversion
        return FinanceIngestionError(message, cause=exc, context=context)


class ErrorContext:
    """
    Context manager for adding error context to exceptions.
    
    This allows for automatic context addition to any exceptions
    that occur within the context block.
    """
    
    def __init__(self, **context):
        """
        Initialize the error context.
        
        Args:
            **context: Context key-value pairs to add to exceptions
        """
        self.context = context
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val and not isinstance(exc_val, FinanceIngestionError):
            # Convert and add context
            finance_exc = _convert_exception(exc_val, self.context)
            # Replace the exception
            raise finance_exc from exc_val
        elif isinstance(exc_val, FinanceIngestionError):
            # Add context to existing FinanceIngestionError
            exc_val.context.update(self.context)
        
        # Don't suppress the exception
        return False