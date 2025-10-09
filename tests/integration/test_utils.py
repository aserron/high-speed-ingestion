"""
Integration Test Utilities

Provides utility functions and helper classes for integration testing,
including network testing, data validation, and performance measurement.
"""

import asyncio
import json
import time
import socket
import subprocess
import sys
import psutil
import aiohttp
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
import websockets
import redis.asyncio as redis
import asyncpg


@dataclass
class PerformanceMetrics:
    """Performance metrics container"""
    timestamp: float
    latency_ms: float
    throughput_mps: float
    cpu_percent: float
    memory_mb: float
    network_bytes_sent: int
    network_bytes_recv: int
    error_count: int


@dataclass
class TestValidationResult:
    """Test validation result"""
    passed: bool
    message: str
    details: Dict[str, Any]
    metrics: Optional[PerformanceMetrics] = None


class NetworkUtils:
    """Network utility functions"""
    
    @staticmethod
    def is_port_available(host: str, port: int) -> bool:
        """Check if a port is available"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                return result != 0
        except Exception:
            return False
    
    @staticmethod
    def find_available_port(start_port: int = 8000, end_port: int = 9000) -> int:
        """Find an available port in the given range"""
        for port in range(start_port, end_port):
            if NetworkUtils.is_port_available("localhost", port):
                return port
        raise RuntimeError(f"No available ports found in range {start_port}-{end_port}")
    
    @staticmethod
    async def wait_for_port(host: str, port: int, timeout: float = 30.0) -> bool:
        """Wait for a port to become available (service to start)"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(host, port),
                    timeout=1.0
                )
                writer.close()
                await writer.wait_closed()
                return True
            except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
                await asyncio.sleep(0.5)
        
        return False
    
    @staticmethod
    async def check_websocket_connection(url: str, timeout: float = 5.0) -> bool:
        """Check if WebSocket connection is possible"""
        try:
            async with asyncio.wait_for(websockets.connect(url), timeout=timeout):
                return True
        except Exception:
            return False
    
    @staticmethod
    async def check_http_endpoint(url: str, timeout: float = 5.0) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Check HTTP endpoint and return response"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        try:
                            data = await response.json()
                            return True, data
                        except Exception:
                            return True, {"status": "ok"}
                    else:
                        return False, {"status_code": response.status}
        except Exception as e:
            return False, {"error": str(e)}


class DatabaseUtils:
    """Database utility functions"""
    
    @staticmethod
    async def test_redis_connection(host: str, port: int, db: int, password: Optional[str] = None) -> TestValidationResult:
        """Test Redis connection"""
        try:
            client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=True
            )
            
            # Test basic operations
            await client.ping()
            await client.set("test_key", "test_value", ex=10)
            value = await client.get("test_key")
            await client.delete("test_key")
            
            await client.close()
            
            return TestValidationResult(
                passed=True,
                message="Redis connection successful",
                details={
                    "host": host,
                    "port": port,
                    "db": db,
                    "test_value_retrieved": value == "test_value"
                }
            )
            
        except Exception as e:
            return TestValidationResult(
                passed=False,
                message=f"Redis connection failed: {str(e)}",
                details={"host": host, "port": port, "db": db, "error": str(e)}
            )
    
    @staticmethod
    async def test_postgres_connection(host: str, port: int, database: str, 
                                     username: str, password: str) -> TestValidationResult:
        """Test PostgreSQL connection"""
        try:
            conn = await asyncpg.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password
            )
            
            # Test basic query
            result = await conn.fetchval("SELECT 1")
            
            # Test table existence
            table_exists = await conn.fetchval(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'market_data')"
            )
            
            await conn.close()
            
            return TestValidationResult(
                passed=True,
                message="PostgreSQL connection successful",
                details={
                    "host": host,
                    "port": port,
                    "database": database,
                    "test_query_result": result,
                    "market_data_table_exists": table_exists
                }
            )
            
        except Exception as e:
            return TestValidationResult(
                passed=False,
                message=f"PostgreSQL connection failed: {str(e)}",
                details={
                    "host": host,
                    "port": port,
                    "database": database,
                    "username": username,
                    "error": str(e)
                }
            )
    
    @staticmethod
    async def clear_test_data(redis_client: redis.Redis, postgres_pool: Optional[asyncpg.Pool] = None):
        """Clear test data from databases"""
        # Clear Redis
        if redis_client:
            await redis_client.flushdb()
        
        # Clear PostgreSQL
        if postgres_pool:
            async with postgres_pool.acquire() as conn:
                await conn.execute("TRUNCATE TABLE market_data")
    
    @staticmethod
    async def get_data_counts(redis_client: redis.Redis, 
                            postgres_pool: Optional[asyncpg.Pool] = None) -> Dict[str, int]:
        """Get data counts from databases"""
        counts = {"redis": 0, "postgres": 0}
        
        # Count Redis keys
        if redis_client:
            try:
                keys = await redis_client.keys("market:*")
                counts["redis"] = len(keys)
            except Exception:
                pass
        
        # Count PostgreSQL rows
        if postgres_pool:
            try:
                async with postgres_pool.acquire() as conn:
                    result = await conn.fetchval("SELECT COUNT(*) FROM market_data")
                    counts["postgres"] = result or 0
            except Exception:
                pass
        
        return counts


class ProcessUtils:
    """Process management utilities"""
    
    @staticmethod
    def start_process(command: List[str], env: Optional[Dict[str, str]] = None, 
                     cwd: Optional[Path] = None) -> subprocess.Popen:
        """Start a subprocess with proper configuration"""
        return subprocess.Popen(
            command,
            env=env,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
    
    @staticmethod
    async def wait_for_process_ready(process: subprocess.Popen, 
                                   ready_check_func, timeout: float = 30.0) -> bool:
        """Wait for process to be ready using a check function"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if process.poll() is not None:
                # Process has terminated
                return False
            
            if await ready_check_func():
                return True
            
            await asyncio.sleep(1.0)
        
        return False
    
    @staticmethod
    def stop_process(process: subprocess.Popen, timeout: float = 10.0) -> bool:
        """Stop a process gracefully"""
        if process.poll() is not None:
            return True  # Already stopped
        
        try:
            process.terminate()
            process.wait(timeout=timeout)
            return True
        except subprocess.TimeoutExpired:
            try:
                process.kill()
                process.wait(timeout=5.0)
                return True
            except subprocess.TimeoutExpired:
                return False
    
    @staticmethod
    def get_process_info(process: subprocess.Popen) -> Dict[str, Any]:
        """Get process information"""
        try:
            proc = psutil.Process(process.pid)
            return {
                "pid": process.pid,
                "status": proc.status(),
                "cpu_percent": proc.cpu_percent(),
                "memory_mb": proc.memory_info().rss / 1024 / 1024,
                "create_time": proc.create_time(),
                "cmdline": proc.cmdline()
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return {
                "pid": process.pid,
                "status": "unknown",
                "error": "Process not accessible"
            }


class DataValidationUtils:
    """Data validation utilities"""
    
    @staticmethod
    def validate_market_data_message(message: Dict[str, Any]) -> TestValidationResult:
        """Validate market data message format"""
        required_fields = ["messageId", "timestamp", "symbol", "messageType", "data", "sequenceNumber"]
        
        # Check required fields
        missing_fields = [field for field in required_fields if field not in message]
        if missing_fields:
            return TestValidationResult(
                passed=False,
                message=f"Missing required fields: {missing_fields}",
                details={"missing_fields": missing_fields, "message": message}
            )
        
        # Validate message types
        valid_message_types = ["TRADE", "QUOTE", "BOOK_UPDATE"]
        if message["messageType"] not in valid_message_types:
            return TestValidationResult(
                passed=False,
                message=f"Invalid message type: {message['messageType']}",
                details={"valid_types": valid_message_types, "received_type": message["messageType"]}
            )
        
        # Validate data structure based on message type
        data = message.get("data", {})
        if message["messageType"] == "TRADE":
            required_data_fields = ["price", "quantity", "side", "exchange"]
        elif message["messageType"] == "QUOTE":
            required_data_fields = ["bid", "ask", "bidSize", "askSize", "exchange"]
        else:  # BOOK_UPDATE
            required_data_fields = ["levels", "exchange"]
        
        missing_data_fields = [field for field in required_data_fields if field not in data]
        if missing_data_fields:
            return TestValidationResult(
                passed=False,
                message=f"Missing data fields for {message['messageType']}: {missing_data_fields}",
                details={"missing_data_fields": missing_data_fields, "data": data}
            )
        
        return TestValidationResult(
            passed=True,
            message="Message validation passed",
            details={"message_type": message["messageType"], "symbol": message["symbol"]}
        )
    
    @staticmethod
    def validate_performance_metrics(metrics: PerformanceMetrics, 
                                   thresholds: Dict[str, float]) -> TestValidationResult:
        """Validate performance metrics against thresholds"""
        violations = []
        
        if "max_latency_ms" in thresholds and metrics.latency_ms > thresholds["max_latency_ms"]:
            violations.append(f"Latency {metrics.latency_ms}ms exceeds threshold {thresholds['max_latency_ms']}ms")
        
        if "min_throughput_mps" in thresholds and metrics.throughput_mps < thresholds["min_throughput_mps"]:
            violations.append(f"Throughput {metrics.throughput_mps} below threshold {thresholds['min_throughput_mps']}")
        
        if "max_cpu_percent" in thresholds and metrics.cpu_percent > thresholds["max_cpu_percent"]:
            violations.append(f"CPU usage {metrics.cpu_percent}% exceeds threshold {thresholds['max_cpu_percent']}%")
        
        if "max_memory_mb" in thresholds and metrics.memory_mb > thresholds["max_memory_mb"]:
            violations.append(f"Memory usage {metrics.memory_mb}MB exceeds threshold {thresholds['max_memory_mb']}MB")
        
        if violations:
            return TestValidationResult(
                passed=False,
                message=f"Performance threshold violations: {'; '.join(violations)}",
                details={"violations": violations, "metrics": asdict(metrics)},
                metrics=metrics
            )
        
        return TestValidationResult(
            passed=True,
            message="Performance metrics within thresholds",
            details={"metrics": asdict(metrics)},
            metrics=metrics
        )


class TestReportUtils:
    """Test reporting utilities"""
    
    @staticmethod
    def generate_test_summary(test_results: List[TestValidationResult]) -> Dict[str, Any]:
        """Generate test summary from results"""
        total_tests = len(test_results)
        passed_tests = sum(1 for result in test_results if result.passed)
        failed_tests = total_tests - passed_tests
        
        # Collect performance metrics if available
        performance_metrics = [result.metrics for result in test_results if result.metrics]
        
        summary = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "test_results": [
                {
                    "passed": result.passed,
                    "message": result.message,
                    "details": result.details
                }
                for result in test_results
            ]
        }
        
        if performance_metrics:
            summary["performance_summary"] = {
                "avg_latency_ms": sum(m.latency_ms for m in performance_metrics) / len(performance_metrics),
                "avg_throughput_mps": sum(m.throughput_mps for m in performance_metrics) / len(performance_metrics),
                "avg_cpu_percent": sum(m.cpu_percent for m in performance_metrics) / len(performance_metrics),
                "avg_memory_mb": sum(m.memory_mb for m in performance_metrics) / len(performance_metrics)
            }
        
        return summary
    
    @staticmethod
    def save_test_report(report: Dict[str, Any], file_path: Path):
        """Save test report to file"""
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
    
    @staticmethod
    def print_test_summary(summary: Dict[str, Any]):
        """Print test summary to console"""
        print("\n" + "="*60)
        print("INTEGRATION TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed_tests']}")
        print(f"Failed: {summary['failed_tests']}")
        print(f"Success Rate: {summary['success_rate']:.1f}%")
        
        if "performance_summary" in summary:
            perf = summary["performance_summary"]
            print("\nPerformance Summary:")
            print(f"  Average Latency: {perf['avg_latency_ms']:.2f}ms")
            print(f"  Average Throughput: {perf['avg_throughput_mps']:.0f} msg/sec")
            print(f"  Average CPU Usage: {perf['avg_cpu_percent']:.1f}%")
            print(f"  Average Memory Usage: {perf['avg_memory_mb']:.1f}MB")
        
        print("\nTest Results:")
        for i, result in enumerate(summary["test_results"], 1):
            status = "✓" if result["passed"] else "✗"
            print(f"  {i}. {status} {result['message']}")
        
        print("="*60)


class PerformanceMonitor:
    """Performance monitoring utility"""
    
    def __init__(self, sampling_interval: float = 1.0):
        self.sampling_interval = sampling_interval
        self.metrics_history: List[PerformanceMetrics] = []
        self.monitoring_task: Optional[asyncio.Task] = None
        self.start_time: Optional[float] = None
    
    def start_monitoring(self):
        """Start performance monitoring"""
        self.start_time = time.time()
        self.monitoring_task = asyncio.create_task(self._monitor_loop())
    
    def stop_monitoring(self):
        """Stop performance monitoring"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
            self.monitoring_task = None
    
    async def _monitor_loop(self):
        """Performance monitoring loop"""
        while True:
            try:
                # Collect system metrics
                cpu_percent = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                network_io = psutil.net_io_counters()
                
                metrics = PerformanceMetrics(
                    timestamp=time.time(),
                    latency_ms=0.0,  # Would be set by application
                    throughput_mps=0.0,  # Would be set by application
                    cpu_percent=cpu_percent,
                    memory_mb=memory.used / 1024 / 1024,
                    network_bytes_sent=network_io.bytes_sent,
                    network_bytes_recv=network_io.bytes_recv,
                    error_count=0  # Would be set by application
                )
                
                self.metrics_history.append(metrics)
                
                # Keep only recent metrics (last 1000 samples)
                if len(self.metrics_history) > 1000:
                    self.metrics_history = self.metrics_history[-1000:]
                
                await asyncio.sleep(self.sampling_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in performance monitoring: {e}")
                await asyncio.sleep(self.sampling_interval)
    
    def get_current_metrics(self) -> Optional[PerformanceMetrics]:
        """Get the most recent metrics"""
        return self.metrics_history[-1] if self.metrics_history else None
    
    def get_average_metrics(self, duration_seconds: Optional[float] = None) -> Optional[PerformanceMetrics]:
        """Get average metrics over specified duration"""
        if not self.metrics_history:
            return None
        
        if duration_seconds is None:
            metrics_to_average = self.metrics_history
        else:
            cutoff_time = time.time() - duration_seconds
            metrics_to_average = [m for m in self.metrics_history if m.timestamp >= cutoff_time]
        
        if not metrics_to_average:
            return None
        
        return PerformanceMetrics(
            timestamp=time.time(),
            latency_ms=sum(m.latency_ms for m in metrics_to_average) / len(metrics_to_average),
            throughput_mps=sum(m.throughput_mps for m in metrics_to_average) / len(metrics_to_average),
            cpu_percent=sum(m.cpu_percent for m in metrics_to_average) / len(metrics_to_average),
            memory_mb=sum(m.memory_mb for m in metrics_to_average) / len(metrics_to_average),
            network_bytes_sent=max(m.network_bytes_sent for m in metrics_to_average),
            network_bytes_recv=max(m.network_bytes_recv for m in metrics_to_average),
            error_count=sum(m.error_count for m in metrics_to_average)
        )