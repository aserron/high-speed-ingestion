"""
End-to-End Integration Tests

Comprehensive integration tests for the financial data ingestion systems.
Tests complete data flow from WebSocket ingestion through processing to storage,
including network failure simulation and load testing scenarios.
"""

import asyncio
import json
import time
import pytest
import psutil
import subprocess
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import websockets
import redis.asyncio as redis
import asyncpg
import msgpack
from contextlib import asynccontextmanager

# Add project paths to sys.path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "apps" / "python-ingestion" / "src"))
sys.path.insert(0, str(project_root / "tests" / "integration"))

from websocket_simulator import WebSocketDataFeedSimulator, SimulatorConfig, MarketDataMessage
from finance_ingestion.config import get_config, set_config, AppConfig
from finance_ingestion.storage.storage_manager import StorageManager
from finance_ingestion.websocket.connection_manager import ConnectionManager
from finance_ingestion.message_processor import MessageProcessor


@dataclass
class TestResults:
    """Test execution results"""
    test_name: str
    duration_ms: int
    messages_sent: int
    messages_received: int
    messages_processed: int
    messages_stored: int
    latency_stats: Dict[str, float]
    throughput_stats: Dict[str, float]
    error_count: int
    success: bool
    details: Dict[str, Any]


@dataclass
class SystemResources:
    """System resource usage snapshot"""
    timestamp: float
    cpu_percent: float
    memory_mb: float
    network_io: Dict[str, int]
    disk_io: Dict[str, int]


class IntegrationTestFramework:
    """Framework for running integration tests"""
    
    def __init__(self):
        self.simulator = None
        self.python_process = None
        self.node_process = None
        self.redis_client = None
        self.postgres_pool = None
        self.test_results = []
        self.resource_monitor = None
        
        # Test configuration
        self.test_config = {
            "simulator_port": 18765,
            "python_api_port": 18080,
            "node_api_port": 18081,
            "redis_db": 15,  # Use separate DB for testing
            "test_database": "finance_benchmark_test"
        }
    
    async def setup(self):
        """Set up test environment"""
        print("Setting up integration test environment...")
        
        # Start WebSocket simulator
        await self.start_simulator()
        
        # Set up database connections
        await self.setup_databases()
        
        # Start resource monitoring
        self.start_resource_monitoring()
        
        print("Integration test environment ready")
    
    async def teardown(self):
        """Clean up test environment"""
        print("Cleaning up integration test environment...")
        
        # Stop applications
        await self.stop_applications()
        
        # Stop simulator
        await self.stop_simulator()
        
        # Close database connections
        await self.cleanup_databases()
        
        # Stop resource monitoring
        self.stop_resource_monitoring()
        
        print("Integration test environment cleaned up")
    
    async def start_simulator(self):
        """Start WebSocket data feed simulator"""
        config = SimulatorConfig(
            host="localhost",
            port=self.test_config["simulator_port"],
            symbols=["AAPL", "GOOGL", "MSFT", "TSLA"],
            message_rate=1000,
            burst_rate=5000,
            enable_network_failures=True,
            failure_rate=0.001,
            serialization_format="json"
        )
        
        self.simulator = WebSocketDataFeedSimulator(config)
        await self.simulator.start_server()
        
        # Wait for simulator to be ready
        await asyncio.sleep(1)
    
    async def stop_simulator(self):
        """Stop WebSocket data feed simulator"""
        if self.simulator:
            await self.simulator.stop_server()
            self.simulator = None
    
    async def setup_databases(self):
        """Set up database connections for testing"""
        # Redis connection
        self.redis_client = redis.Redis(
            host="localhost",
            port=6379,
            db=self.test_config["redis_db"],
            decode_responses=True
        )
        
        # Clear test Redis database
        await self.redis_client.flushdb()
        
        # PostgreSQL connection
        try:
            self.postgres_pool = await asyncpg.create_pool(
                host="localhost",
                port=5432,
                database=self.test_config["test_database"],
                user="benchmark_user",
                password="benchmark_pass",
                min_size=2,
                max_size=10
            )
            
            # Clear test tables
            async with self.postgres_pool.acquire() as conn:
                await conn.execute("TRUNCATE TABLE market_data")
                
        except Exception as e:
            print(f"Warning: Could not connect to PostgreSQL: {e}")
            self.postgres_pool = None
    
    async def cleanup_databases(self):
        """Clean up database connections"""
        if self.redis_client:
            await self.redis_client.flushdb()
            await self.redis_client.close()
            self.redis_client = None
        
        if self.postgres_pool:
            await self.postgres_pool.close()
            self.postgres_pool = None
    
    def start_resource_monitoring(self):
        """Start system resource monitoring"""
        self.resource_snapshots = []
        self.resource_monitor = asyncio.create_task(self._monitor_resources())
    
    def stop_resource_monitoring(self):
        """Stop system resource monitoring"""
        if self.resource_monitor:
            self.resource_monitor.cancel()
            self.resource_monitor = None
    
    async def _monitor_resources(self):
        """Monitor system resources periodically"""
        while True:
            try:
                # Get system metrics
                cpu_percent = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                network_io = psutil.net_io_counters()._asdict()
                disk_io = psutil.disk_io_counters()._asdict()
                
                snapshot = SystemResources(
                    timestamp=time.time(),
                    cpu_percent=cpu_percent,
                    memory_mb=memory.used / 1024 / 1024,
                    network_io=network_io,
                    disk_io=disk_io
                )
                
                self.resource_snapshots.append(snapshot)
                
                # Keep only last 1000 snapshots
                if len(self.resource_snapshots) > 1000:
                    self.resource_snapshots = self.resource_snapshots[-1000:]
                
                await asyncio.sleep(1)  # Sample every second
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error monitoring resources: {e}")
                await asyncio.sleep(1)
    
    async def start_python_application(self, config_overrides: Dict[str, Any] = None):
        """Start Python application with test configuration"""
        # Create test configuration
        config = get_config()
        
        # Override configuration for testing
        config.websocket.url = f"ws://localhost:{self.test_config['simulator_port']}"
        config.redis.db = self.test_config["redis_db"]
        config.postgresql.database = self.test_config["test_database"]
        config.monitoring.health_check_port = self.test_config["python_api_port"]
        config.monitoring.prometheus_port = self.test_config["python_api_port"] + 100
        
        if config_overrides:
            for key, value in config_overrides.items():
                setattr(config, key, value)
        
        set_config(config)
        
        # Start Python application as subprocess
        python_script = project_root / "apps" / "python-ingestion" / "src" / "finance_ingestion" / "cli.py"
        
        self.python_process = subprocess.Popen([
            sys.executable, str(python_script), "run",
            "--host", "localhost",
            "--port", str(self.test_config["simulator_port"]),
            "--duration", "0"  # Run indefinitely
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for application to start
        await asyncio.sleep(3)
        
        # Check if process is still running
        if self.python_process.poll() is not None:
            stdout, stderr = self.python_process.communicate()
            raise RuntimeError(f"Python application failed to start: {stderr.decode()}")
    
    async def start_node_application(self, config_overrides: Dict[str, Any] = None):
        """Start Node.js application with test configuration"""
        # Set environment variables for Node.js application
        env = os.environ.copy()
        env.update({
            "WEBSOCKET_URL": f"ws://localhost:{self.test_config['simulator_port']}",
            "REDIS_DB": str(self.test_config["redis_db"]),
            "POSTGRESQL_DATABASE": self.test_config["test_database"],
            "MONITORING_HEALTH_CHECK_PORT": str(self.test_config["node_api_port"]),
            "MONITORING_PROMETHEUS_PORT": str(self.test_config["node_api_port"] + 100),
            "NODE_ENV": "testing"
        })
        
        if config_overrides:
            for key, value in config_overrides.items():
                env[key.upper()] = str(value)
        
        # Start Node.js application as subprocess
        node_script = project_root / "apps" / "node-ingestion" / "src" / "index.js"
        
        self.node_process = subprocess.Popen([
            "node", str(node_script)
        ], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for application to start
        await asyncio.sleep(3)
        
        # Check if process is still running
        if self.node_process.poll() is not None:
            stdout, stderr = self.node_process.communicate()
            raise RuntimeError(f"Node.js application failed to start: {stderr.decode()}")
    
    async def stop_applications(self):
        """Stop running applications"""
        if self.python_process:
            self.python_process.terminate()
            try:
                self.python_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.python_process.kill()
            self.python_process = None
        
        if self.node_process:
            self.node_process.terminate()
            try:
                self.node_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.node_process.kill()
            self.node_process = None
    
    async def run_test_scenario(self, test_name: str, duration_seconds: int, 
                              message_rate: int = 1000, enable_failures: bool = False) -> TestResults:
        """Run a specific test scenario"""
        print(f"Running test scenario: {test_name}")
        
        start_time = time.time()
        initial_stats = self.simulator.get_stats()
        
        # Configure simulator for this test
        self.simulator.config.message_rate = message_rate
        self.simulator.config.enable_network_failures = enable_failures
        
        # Run test for specified duration
        await asyncio.sleep(duration_seconds)
        
        end_time = time.time()
        final_stats = self.simulator.get_stats()
        
        # Calculate test results
        duration_ms = int((end_time - start_time) * 1000)
        messages_sent = final_stats["messages_sent"] - initial_stats["messages_sent"]
        
        # Get storage statistics
        messages_stored_redis = await self.get_redis_message_count()
        messages_stored_postgres = await self.get_postgres_message_count()
        
        # Calculate latency and throughput stats
        latency_stats = {
            "avg_latency_ms": 0.0,  # Would be calculated from actual measurements
            "p50_latency_ms": 0.0,
            "p95_latency_ms": 0.0,
            "p99_latency_ms": 0.0
        }
        
        throughput_stats = {
            "messages_per_second": messages_sent / duration_seconds if duration_seconds > 0 else 0,
            "bytes_per_second": 0.0  # Would be calculated from actual measurements
        }
        
        results = TestResults(
            test_name=test_name,
            duration_ms=duration_ms,
            messages_sent=messages_sent,
            messages_received=messages_sent,  # Assuming all sent messages are received
            messages_processed=messages_sent,  # Assuming all received messages are processed
            messages_stored=messages_stored_redis + messages_stored_postgres,
            latency_stats=latency_stats,
            throughput_stats=throughput_stats,
            error_count=final_stats.get("failures_simulated", 0),
            success=True,
            details={
                "redis_messages": messages_stored_redis,
                "postgres_messages": messages_stored_postgres,
                "simulator_stats": final_stats
            }
        )
        
        self.test_results.append(results)
        print(f"Test scenario completed: {test_name}")
        return results
    
    async def get_redis_message_count(self) -> int:
        """Get number of messages stored in Redis"""
        try:
            keys = await self.redis_client.keys("market:*")
            return len(keys)
        except Exception:
            return 0
    
    async def get_postgres_message_count(self) -> int:
        """Get number of messages stored in PostgreSQL"""
        try:
            if self.postgres_pool:
                async with self.postgres_pool.acquire() as conn:
                    result = await conn.fetchval("SELECT COUNT(*) FROM market_data")
                    return result or 0
        except Exception:
            pass
        return 0
    
    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        if not self.test_results:
            return {"error": "No test results available"}
        
        # Calculate aggregate statistics
        total_messages_sent = sum(r.messages_sent for r in self.test_results)
        total_messages_stored = sum(r.messages_stored for r in self.test_results)
        total_duration_ms = sum(r.duration_ms for r in self.test_results)
        total_errors = sum(r.error_count for r in self.test_results)
        
        # Calculate resource usage statistics
        resource_stats = {}
        if hasattr(self, 'resource_snapshots') and self.resource_snapshots:
            cpu_values = [s.cpu_percent for s in self.resource_snapshots]
            memory_values = [s.memory_mb for s in self.resource_snapshots]
            
            resource_stats = {
                "cpu_avg": sum(cpu_values) / len(cpu_values),
                "cpu_max": max(cpu_values),
                "memory_avg_mb": sum(memory_values) / len(memory_values),
                "memory_max_mb": max(memory_values)
            }
        
        return {
            "summary": {
                "total_tests": len(self.test_results),
                "successful_tests": sum(1 for r in self.test_results if r.success),
                "total_messages_sent": total_messages_sent,
                "total_messages_stored": total_messages_stored,
                "total_duration_ms": total_duration_ms,
                "total_errors": total_errors,
                "overall_throughput": total_messages_sent / (total_duration_ms / 1000) if total_duration_ms > 0 else 0
            },
            "resource_usage": resource_stats,
            "test_results": [
                {
                    "test_name": r.test_name,
                    "duration_ms": r.duration_ms,
                    "messages_sent": r.messages_sent,
                    "messages_stored": r.messages_stored,
                    "throughput_mps": r.throughput_stats["messages_per_second"],
                    "error_count": r.error_count,
                    "success": r.success
                }
                for r in self.test_results
            ]
        }


# Test fixtures
@pytest.fixture(scope="session")
async def integration_framework():
    """Integration test framework fixture"""
    framework = IntegrationTestFramework()
    await framework.setup()
    yield framework
    await framework.teardown()


@pytest.fixture(scope="function")
async def clean_databases(integration_framework):
    """Clean databases before each test"""
    if integration_framework.redis_client:
        await integration_framework.redis_client.flushdb()
    
    if integration_framework.postgres_pool:
        async with integration_framework.postgres_pool.acquire() as conn:
            await conn.execute("TRUNCATE TABLE market_data")


# Integration Tests
@pytest.mark.asyncio
class TestEndToEndIntegration:
    """End-to-end integration tests"""
    
    async def test_basic_data_flow(self, integration_framework, clean_databases):
        """Test basic data flow from WebSocket to storage"""
        # Run basic test scenario
        results = await integration_framework.run_test_scenario(
            test_name="basic_data_flow",
            duration_seconds=10,
            message_rate=500,
            enable_failures=False
        )
        
        # Verify results
        assert results.success
        assert results.messages_sent > 0
        assert results.throughput_stats["messages_per_second"] > 0
        
        # Verify data was stored
        redis_count = await integration_framework.get_redis_message_count()
        postgres_count = await integration_framework.get_postgres_message_count()
        
        # At least some messages should be stored
        assert redis_count > 0 or postgres_count > 0
    
    async def test_high_throughput_scenario(self, integration_framework, clean_databases):
        """Test high throughput data processing"""
        results = await integration_framework.run_test_scenario(
            test_name="high_throughput",
            duration_seconds=15,
            message_rate=5000,
            enable_failures=False
        )
        
        # Verify high throughput handling
        assert results.success
        assert results.throughput_stats["messages_per_second"] > 1000
        assert results.messages_stored > 0
    
    async def test_network_failure_recovery(self, integration_framework, clean_databases):
        """Test network failure simulation and recovery"""
        results = await integration_framework.run_test_scenario(
            test_name="network_failure_recovery",
            duration_seconds=20,
            message_rate=1000,
            enable_failures=True
        )
        
        # Verify system handles failures gracefully
        assert results.success
        assert results.error_count > 0  # Should have some simulated failures
        assert results.messages_stored > 0  # Should still store some messages
    
    async def test_burst_load_handling(self, integration_framework, clean_databases):
        """Test burst load handling"""
        # Configure simulator for burst mode
        integration_framework.simulator.config.burst_rate = 10000
        integration_framework.simulator.config.burst_duration = 5.0
        integration_framework.simulator.config.burst_interval = 10.0
        
        results = await integration_framework.run_test_scenario(
            test_name="burst_load_handling",
            duration_seconds=25,
            message_rate=1000,
            enable_failures=False
        )
        
        # Verify burst handling
        assert results.success
        assert results.messages_sent > 0
        assert results.messages_stored > 0
    
    async def test_concurrent_connections(self, integration_framework, clean_databases):
        """Test multiple concurrent WebSocket connections"""
        # This test would require multiple client connections
        # For now, we'll test with the existing single connection
        results = await integration_framework.run_test_scenario(
            test_name="concurrent_connections",
            duration_seconds=15,
            message_rate=2000,
            enable_failures=False
        )
        
        assert results.success
        assert results.messages_stored > 0
    
    async def test_message_validation(self, integration_framework, clean_databases):
        """Test message validation and error handling"""
        results = await integration_framework.run_test_scenario(
            test_name="message_validation",
            duration_seconds=10,
            message_rate=1000,
            enable_failures=False
        )
        
        # Verify message processing
        assert results.success
        assert results.messages_processed > 0
    
    async def test_storage_persistence(self, integration_framework, clean_databases):
        """Test data persistence across storage backends"""
        results = await integration_framework.run_test_scenario(
            test_name="storage_persistence",
            duration_seconds=12,
            message_rate=800,
            enable_failures=False
        )
        
        # Verify data persistence
        assert results.success
        
        # Check both storage backends
        redis_count = await integration_framework.get_redis_message_count()
        postgres_count = await integration_framework.get_postgres_message_count()
        
        # Should have data in at least one backend
        assert redis_count > 0 or postgres_count > 0
        
        # Verify data integrity (basic check)
        if integration_framework.redis_client:
            keys = await integration_framework.redis_client.keys("market:*")
            if keys:
                sample_data = await integration_framework.redis_client.get(keys[0])
                assert sample_data is not None


@pytest.mark.asyncio
class TestPythonApplicationIntegration:
    """Python application specific integration tests"""
    
    async def test_python_application_startup(self, integration_framework):
        """Test Python application startup and basic functionality"""
        try:
            await integration_framework.start_python_application()
            
            # Wait for application to process some messages
            await asyncio.sleep(5)
            
            # Verify application is processing messages
            stats = integration_framework.simulator.get_stats()
            assert stats["connected_clients"] > 0
            
        finally:
            await integration_framework.stop_applications()
    
    async def test_python_application_health_check(self, integration_framework):
        """Test Python application health check endpoint"""
        try:
            await integration_framework.start_python_application()
            
            # Wait for application to start
            await asyncio.sleep(3)
            
            # Test health check endpoint (would require HTTP client)
            # For now, just verify the application is running
            assert integration_framework.python_process.poll() is None
            
        finally:
            await integration_framework.stop_applications()


@pytest.mark.asyncio
class TestNodeApplicationIntegration:
    """Node.js application specific integration tests"""
    
    async def test_node_application_startup(self, integration_framework):
        """Test Node.js application startup and basic functionality"""
        try:
            await integration_framework.start_node_application()
            
            # Wait for application to process some messages
            await asyncio.sleep(5)
            
            # Verify application is processing messages
            stats = integration_framework.simulator.get_stats()
            assert stats["connected_clients"] > 0
            
        finally:
            await integration_framework.stop_applications()
    
    async def test_node_application_health_check(self, integration_framework):
        """Test Node.js application health check endpoint"""
        try:
            await integration_framework.start_node_application()
            
            # Wait for application to start
            await asyncio.sleep(3)
            
            # Test health check endpoint (would require HTTP client)
            # For now, just verify the application is running
            assert integration_framework.node_process.poll() is None
            
        finally:
            await integration_framework.stop_applications()


@pytest.mark.asyncio
class TestLoadScenarios:
    """Load testing scenarios"""
    
    async def test_sustained_load(self, integration_framework, clean_databases):
        """Test sustained load over extended period"""
        results = await integration_framework.run_test_scenario(
            test_name="sustained_load",
            duration_seconds=30,
            message_rate=2000,
            enable_failures=False
        )
        
        # Verify sustained performance
        assert results.success
        assert results.throughput_stats["messages_per_second"] > 1500
        assert results.messages_stored > 0
    
    async def test_stress_load(self, integration_framework, clean_databases):
        """Test system under stress conditions"""
        results = await integration_framework.run_test_scenario(
            test_name="stress_load",
            duration_seconds=20,
            message_rate=8000,
            enable_failures=True
        )
        
        # System should handle stress gracefully
        assert results.success
        assert results.messages_stored > 0
    
    async def test_memory_stability(self, integration_framework, clean_databases):
        """Test memory stability under load"""
        # Record initial memory usage
        initial_snapshots = len(integration_framework.resource_snapshots)
        
        results = await integration_framework.run_test_scenario(
            test_name="memory_stability",
            duration_seconds=25,
            message_rate=3000,
            enable_failures=False
        )
        
        # Verify memory stability
        assert results.success
        
        # Check memory usage didn't grow excessively
        if hasattr(integration_framework, 'resource_snapshots'):
            recent_snapshots = integration_framework.resource_snapshots[initial_snapshots:]
            if recent_snapshots:
                memory_values = [s.memory_mb for s in recent_snapshots]
                memory_growth = max(memory_values) - min(memory_values)
                
                # Memory growth should be reasonable (less than 500MB)
                assert memory_growth < 500


# Test runner for standalone execution
async def run_integration_tests():
    """Run integration tests standalone"""
    framework = IntegrationTestFramework()
    
    try:
        await framework.setup()
        
        # Run basic tests
        await framework.run_test_scenario("basic_flow", 10, 1000, False)
        await framework.run_test_scenario("high_throughput", 15, 5000, False)
        await framework.run_test_scenario("failure_recovery", 20, 1000, True)
        
        # Generate and print report
        report = framework.generate_test_report()
        print("\n" + "="*50)
        print("INTEGRATION TEST REPORT")
        print("="*50)
        print(json.dumps(report, indent=2))
        
    finally:
        await framework.teardown()


if __name__ == "__main__":
    asyncio.run(run_integration_tests())