"""
Metrics Collection and Monitoring for Financial Data Ingestion

Provides Prometheus metrics exporter, latency tracking, throughput monitoring,
and structured logging with correlation IDs for performance analysis.
"""

import time
import threading
import logging
import uuid
from collections import defaultdict, deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
import json
import asyncio

try:
    from prometheus_client import (
        Counter, Histogram, Gauge, Summary, Info,
        CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST,
        start_http_server
    )
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    # Mock classes for when prometheus_client is not available
    class Counter:
        def __init__(self, *args, **kwargs): pass
        def inc(self, *args, **kwargs): pass
        def labels(self, *args, **kwargs): return self
    
    class Histogram:
        def __init__(self, *args, **kwargs): pass
        def observe(self, *args, **kwargs): pass
        def labels(self, *args, **kwargs): return self
        def time(self): return contextmanager(lambda: iter([None]))()
    
    class Gauge:
        def __init__(self, *args, **kwargs): pass
        def set(self, *args, **kwargs): pass
        def inc(self, *args, **kwargs): pass
        def dec(self, *args, **kwargs): pass
        def labels(self, *args, **kwargs): return self
    
    class Summary:
        def __init__(self, *args, **kwargs): pass
        def observe(self, *args, **kwargs): pass
        def labels(self, *args, **kwargs): return self
    
    class Info:
        def __init__(self, *args, **kwargs): pass
        def info(self, *args, **kwargs): pass
    
    class CollectorRegistry:
        def __init__(self): pass
    
    def generate_latest(*args): return b""
    CONTENT_TYPE_LATEST = "text/plain"
    def start_http_server(*args, **kwargs): pass


@dataclass
class LatencyStats:
    """Latency statistics container"""
    count: int = 0
    total_ns: int = 0
    min_ns: int = float('inf')
    max_ns: int = 0
    p50_ns: int = 0
    p95_ns: int = 0
    p99_ns: int = 0
    p999_ns: int = 0
    samples: deque = field(default_factory=lambda: deque(maxlen=10000))
    
    def add_sample(self, latency_ns: int):
        """Add a latency sample"""
        self.count += 1
        self.total_ns += latency_ns
        self.min_ns = min(self.min_ns, latency_ns)
        self.max_ns = max(self.max_ns, latency_ns)
        self.samples.append(latency_ns)
        
        # Update percentiles every 100 samples for performance
        if self.count % 100 == 0:
            self._update_percentiles()
    
    def _update_percentiles(self):
        """Update percentile calculations"""
        if not self.samples:
            return
            
        sorted_samples = sorted(self.samples)
        n = len(sorted_samples)
        
        if n > 0:
            self.p50_ns = sorted_samples[int(n * 0.50)]
            self.p95_ns = sorted_samples[int(n * 0.95)]
            self.p99_ns = sorted_samples[int(n * 0.99)]
            self.p999_ns = sorted_samples[int(n * 0.999)]
    
    @property
    def avg_ns(self) -> float:
        """Average latency in nanoseconds"""
        return self.total_ns / self.count if self.count > 0 else 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'count': self.count,
            'avg_ns': self.avg_ns,
            'min_ns': self.min_ns if self.min_ns != float('inf') else 0,
            'max_ns': self.max_ns,
            'p50_ns': self.p50_ns,
            'p95_ns': self.p95_ns,
            'p99_ns': self.p99_ns,
            'p999_ns': self.p999_ns
        }


class MetricsCollector:
    """Central metrics collection and monitoring system"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        
        # Prometheus registry
        self.registry = CollectorRegistry() if PROMETHEUS_AVAILABLE else None
        
        # Metrics storage
        self.latency_stats = defaultdict(LatencyStats)
        self.throughput_counters = defaultdict(int)
        self.resource_gauges = {}
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Correlation ID tracking
        self._correlation_ids = {}
        
        # Initialize Prometheus metrics
        self._init_prometheus_metrics()
        
        # Start background tasks
        self._start_background_tasks()
    
    def _init_prometheus_metrics(self):
        """Initialize Prometheus metrics"""
        if not PROMETHEUS_AVAILABLE:
            self.logger.warning("Prometheus client not available, metrics will be limited")
            return
        
        # Message processing metrics
        self.message_counter = Counter(
            'finance_messages_processed_total',
            'Total number of messages processed',
            ['symbol', 'message_type', 'status'],
            registry=self.registry
        )
        
        self.message_latency = Histogram(
            'finance_message_latency_seconds',
            'Message processing latency in seconds',
            ['symbol', 'message_type'],
            buckets=[0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
            registry=self.registry
        )
        
        self.throughput_gauge = Gauge(
            'finance_throughput_messages_per_second',
            'Current throughput in messages per second',
            ['symbol'],
            registry=self.registry
        )
        
        # Storage metrics
        self.storage_operations = Counter(
            'finance_storage_operations_total',
            'Total storage operations',
            ['operation', 'backend', 'status'],
            registry=self.registry
        )
        
        self.storage_latency = Histogram(
            'finance_storage_latency_seconds',
            'Storage operation latency in seconds',
            ['operation', 'backend'],
            buckets=[0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
            registry=self.registry
        )
        
        # Connection metrics
        self.connection_status = Gauge(
            'finance_connection_status',
            'Connection status (1=connected, 0=disconnected)',
            ['endpoint', 'protocol'],
            registry=self.registry
        )
        
        self.connection_latency = Histogram(
            'finance_connection_latency_seconds',
            'Connection latency in seconds',
            ['endpoint'],
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
            registry=self.registry
        )
        
        # Resource utilization metrics
        self.cpu_usage = Gauge(
            'finance_cpu_usage_percent',
            'CPU usage percentage',
            registry=self.registry
        )
        
        self.memory_usage = Gauge(
            'finance_memory_usage_bytes',
            'Memory usage in bytes',
            registry=self.registry
        )
        
        self.network_bytes = Counter(
            'finance_network_bytes_total',
            'Network bytes transferred',
            ['direction'],
            registry=self.registry
        )
        
        # Application info
        self.app_info = Info(
            'finance_app_info',
            'Application information',
            registry=self.registry
        )
        
        # Set application info
        self.app_info.info({
            'version': '1.0.0',
            'python_version': f"{__import__('sys').version_info.major}.{__import__('sys').version_info.minor}",
            'prometheus_available': str(PROMETHEUS_AVAILABLE)
        })
    
    def _start_background_tasks(self):
        """Start background monitoring tasks"""
        # Start resource monitoring
        if self.config.get('enable_resource_monitoring', True):
            self._start_resource_monitoring()
        
        # Start metrics cleanup
        self._start_metrics_cleanup()
    
    def _start_resource_monitoring(self):
        """Start resource monitoring in background thread"""
        def monitor_resources():
            try:
                import psutil
                process = psutil.Process()
                
                while True:
                    try:
                        # CPU usage
                        cpu_percent = process.cpu_percent()
                        self.set_gauge('cpu_usage_percent', cpu_percent)
                        
                        # Memory usage
                        memory_info = process.memory_info()
                        self.set_gauge('memory_usage_bytes', memory_info.rss)
                        
                        # Network I/O
                        net_io = psutil.net_io_counters()
                        if net_io:
                            self.set_gauge('network_bytes_sent', net_io.bytes_sent)
                            self.set_gauge('network_bytes_recv', net_io.bytes_recv)
                        
                    except Exception as e:
                        self.logger.error(f"Error monitoring resources: {e}")
                    
                    time.sleep(5)  # Monitor every 5 seconds
                    
            except ImportError:
                self.logger.warning("psutil not available, resource monitoring disabled")
        
        thread = threading.Thread(target=monitor_resources, daemon=True)
        thread.start()
    
    def _start_metrics_cleanup(self):
        """Start metrics cleanup in background thread"""
        def cleanup_metrics():
            while True:
                try:
                    with self._lock:
                        # Clean up old latency samples (keep last hour)
                        cutoff_time = time.time_ns() - (3600 * 1_000_000_000)  # 1 hour in ns
                        
                        for stats in self.latency_stats.values():
                            # Remove old samples
                            while (stats.samples and 
                                   len(stats.samples) > 0 and 
                                   stats.samples[0] < cutoff_time):
                                stats.samples.popleft()
                        
                        # Clean up old correlation IDs
                        current_time = time.time()
                        expired_ids = [
                            cid for cid, timestamp in self._correlation_ids.items()
                            if current_time - timestamp > 3600  # 1 hour
                        ]
                        for cid in expired_ids:
                            del self._correlation_ids[cid]
                    
                except Exception as e:
                    self.logger.error(f"Error cleaning up metrics: {e}")
                
                time.sleep(300)  # Cleanup every 5 minutes
        
        thread = threading.Thread(target=cleanup_metrics, daemon=True)
        thread.start()
    
    def generate_correlation_id(self) -> str:
        """Generate a new correlation ID"""
        correlation_id = str(uuid.uuid4())
        with self._lock:
            self._correlation_ids[correlation_id] = time.time()
        return correlation_id
    
    @contextmanager
    def track_latency(self, operation: str, **labels):
        """Context manager for tracking operation latency"""
        start_time = time.perf_counter_ns()
        correlation_id = self.generate_correlation_id()
        
        try:
            yield correlation_id
        finally:
            end_time = time.perf_counter_ns()
            latency_ns = end_time - start_time
            
            # Record latency
            self.record_latency(operation, latency_ns, **labels)
    
    def record_latency(self, operation: str, latency_ns: int, **labels):
        """Record latency measurement"""
        with self._lock:
            # Update internal stats
            key = f"{operation}:{':'.join(f'{k}={v}' for k, v in labels.items())}"
            self.latency_stats[key].add_sample(latency_ns)
            
            # Update Prometheus metrics
            if PROMETHEUS_AVAILABLE:
                latency_seconds = latency_ns / 1_000_000_000
                
                if operation.startswith('message'):
                    self.message_latency.labels(**labels).observe(latency_seconds)
                elif operation.startswith('storage'):
                    self.storage_latency.labels(**labels).observe(latency_seconds)
                elif operation.startswith('connection'):
                    self.connection_latency.labels(**labels).observe(latency_seconds)
    
    def increment_counter(self, metric: str, value: int = 1, **labels):
        """Increment a counter metric"""
        with self._lock:
            key = f"{metric}:{':'.join(f'{k}={v}' for k, v in labels.items())}"
            self.throughput_counters[key] += value
            
            # Update Prometheus metrics
            if PROMETHEUS_AVAILABLE:
                if metric.startswith('message'):
                    self.message_counter.labels(**labels).inc(value)
                elif metric.startswith('storage'):
                    self.storage_operations.labels(**labels).inc(value)
                elif metric.startswith('network'):
                    self.network_bytes.labels(**labels).inc(value)
    
    def set_gauge(self, metric: str, value: float, **labels):
        """Set a gauge metric value"""
        with self._lock:
            key = f"{metric}:{':'.join(f'{k}={v}' for k, v in labels.items())}"
            self.resource_gauges[key] = value
            
            # Update Prometheus metrics
            if PROMETHEUS_AVAILABLE:
                if metric == 'cpu_usage_percent':
                    self.cpu_usage.set(value)
                elif metric == 'memory_usage_bytes':
                    self.memory_usage.set(value)
                elif metric.startswith('throughput'):
                    self.throughput_gauge.labels(**labels).set(value)
                elif metric.startswith('connection'):
                    self.connection_status.labels(**labels).set(value)
    
    def get_latency_stats(self, operation: str = None) -> Dict[str, Any]:
        """Get latency statistics"""
        with self._lock:
            if operation:
                # Get stats for specific operation
                matching_stats = {
                    k: v.to_dict() for k, v in self.latency_stats.items()
                    if k.startswith(operation)
                }
            else:
                # Get all stats
                matching_stats = {k: v.to_dict() for k, v in self.latency_stats.items()}
            
            return matching_stats
    
    def get_throughput_stats(self) -> Dict[str, int]:
        """Get throughput statistics"""
        with self._lock:
            return dict(self.throughput_counters)
    
    def get_resource_stats(self) -> Dict[str, float]:
        """Get resource utilization statistics"""
        with self._lock:
            return dict(self.resource_gauges)
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get all metrics statistics"""
        return {
            'latency': self.get_latency_stats(),
            'throughput': self.get_throughput_stats(),
            'resources': self.get_resource_stats(),
            'timestamp': time.time(),
            'correlation_ids_active': len(self._correlation_ids)
        }
    
    def export_prometheus_metrics(self) -> bytes:
        """Export metrics in Prometheus format"""
        if not PROMETHEUS_AVAILABLE:
            return b"# Prometheus client not available\n"
        
        return generate_latest(self.registry)
    
    def start_prometheus_server(self, port: int = 8000):
        """Start Prometheus metrics HTTP server"""
        if not PROMETHEUS_AVAILABLE:
            self.logger.warning("Cannot start Prometheus server: client not available")
            return
        
        try:
            start_http_server(port, registry=self.registry)
            self.logger.info(f"Prometheus metrics server started on port {port}")
        except Exception as e:
            self.logger.error(f"Failed to start Prometheus server: {e}")


class StructuredLogger:
    """Structured logging with correlation IDs"""
    
    def __init__(self, name: str, metrics_collector: Optional[MetricsCollector] = None):
        self.logger = logging.getLogger(name)
        self.metrics_collector = metrics_collector
    
    def _log_with_context(self, level: int, message: str, correlation_id: str = None, **kwargs):
        """Log with structured context"""
        log_data = {
            'message': message,
            'timestamp': datetime.utcnow().isoformat(),
            'correlation_id': correlation_id,
            **kwargs
        }
        
        # Remove None values
        log_data = {k: v for k, v in log_data.items() if v is not None}
        
        self.logger.log(level, json.dumps(log_data))
    
    def info(self, message: str, correlation_id: str = None, **kwargs):
        """Log info message with context"""
        self._log_with_context(logging.INFO, message, correlation_id, **kwargs)
    
    def error(self, message: str, correlation_id: str = None, **kwargs):
        """Log error message with context"""
        self._log_with_context(logging.ERROR, message, correlation_id, **kwargs)
    
    def warning(self, message: str, correlation_id: str = None, **kwargs):
        """Log warning message with context"""
        self._log_with_context(logging.WARNING, message, correlation_id, **kwargs)
    
    def debug(self, message: str, correlation_id: str = None, **kwargs):
        """Log debug message with context"""
        self._log_with_context(logging.DEBUG, message, correlation_id, **kwargs)


# Global metrics collector instance
_global_metrics_collector: Optional[MetricsCollector] = None


def get_metrics_collector(config: Optional[Dict[str, Any]] = None) -> MetricsCollector:
    """Get or create global metrics collector"""
    global _global_metrics_collector
    
    if _global_metrics_collector is None:
        _global_metrics_collector = MetricsCollector(config)
    
    return _global_metrics_collector


def get_structured_logger(name: str) -> StructuredLogger:
    """Get structured logger with metrics integration"""
    metrics_collector = get_metrics_collector()
    return StructuredLogger(name, metrics_collector)


# Convenience functions
def track_latency(operation: str, **labels):
    """Convenience function for tracking latency"""
    return get_metrics_collector().track_latency(operation, **labels)


def record_latency(operation: str, latency_ns: int, **labels):
    """Convenience function for recording latency"""
    get_metrics_collector().record_latency(operation, latency_ns, **labels)


def increment_counter(metric: str, value: int = 1, **labels):
    """Convenience function for incrementing counters"""
    get_metrics_collector().increment_counter(metric, value, **labels)


def set_gauge(metric: str, value: float, **labels):
    """Convenience function for setting gauges"""
    get_metrics_collector().set_gauge(metric, value, **labels)