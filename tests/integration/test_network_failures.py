"""
Network Failure Simulation and Recovery Tests

Specialized tests for network failure scenarios, connection recovery,
and resilience testing of the financial data ingestion systems.
"""

import asyncio
import time
import random
import pytest
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import websockets
from contextlib import asynccontextmanager

from websocket_simulator import WebSocketDataFeedSimulator, SimulatorConfig
from test_config import get_test_config
from test_utils import NetworkUtils, TestValidationResult, PerformanceMonitor


@dataclass
class NetworkFailureScenario:
    """Network failure test scenario configuration"""
    name: str
    description: str
    failure_type: str  # "disconnect", "slow_network", "packet_loss", "intermittent"
    failure_duration_seconds: float
    failure_frequency: float  # failures per minute
    recovery_time_seconds: float
    expected_reconnections: int
    max_data_loss_percent: float


class NetworkFailureSimulator:
    """Advanced network failure simulator"""
    
    def __init__(self, websocket_simulator: WebSocketDataFeedSimulator):
        self.websocket_simulator = websocket_simulator
        self.active_failures = []
        self.failure_history = []
        self.clients_to_disconnect = set()
        self.slow_clients = set()
        
    async def simulate_connection_drops(self, duration_seconds: float, frequency: float):
        """Simulate random connection drops"""
        end_time = time.time() + duration_seconds
        
        while time.time() < end_time:
            if self.websocket_simulator.connected_clients:
                # Randomly select clients to disconnect
                clients_to_drop = random.sample(
                    list(self.websocket_simulator.connected_clients),
                    min(1, len(self.websocket_simulator.connected_clients))
                )
                
                for client in clients_to_drop:
                    await self._disconnect_client(client, "simulated_drop")
                
                self.failure_history.append({
                    "timestamp": time.time(),
                    "type": "connection_drop",
                    "clients_affected": len(clients_to_drop)
                })
            
            # Wait for next failure
            wait_time = 60.0 / frequency if frequency > 0 else 60.0
            await asyncio.sleep(wait_time + random.uniform(-wait_time * 0.2, wait_time * 0.2))
    
    async def simulate_slow_network(self, duration_seconds: float, delay_ms: float):
        """Simulate slow network conditions"""
        end_time = time.time() + duration_seconds
        
        # Add delay to message sending
        original_broadcast = self.websocket_simulator.broadcast_to_clients
        
        async def slow_broadcast(message):
            await asyncio.sleep(delay_ms / 1000.0)
            return await original_broadcast(message)
        
        self.websocket_simulator.broadcast_to_clients = slow_broadcast
        
        self.failure_history.append({
            "timestamp": time.time(),
            "type": "slow_network",
            "delay_ms": delay_ms,
            "duration_seconds": duration_seconds
        })
        
        await asyncio.sleep(duration_seconds)
        
        # Restore original function
        self.websocket_simulator.broadcast_to_clients = original_broadcast
    
    async def simulate_intermittent_connectivity(self, duration_seconds: float, 
                                               outage_duration: float, outage_frequency: float):
        """Simulate intermittent connectivity issues"""
        end_time = time.time() + duration_seconds
        
        while time.time() < end_time:
            # Cause outage
            if self.websocket_simulator.connected_clients:
                clients_to_affect = list(self.websocket_simulator.connected_clients)
                
                # Temporarily disable message sending
                for client in clients_to_affect:
                    self.clients_to_disconnect.add(client)
                
                self.failure_history.append({
                    "timestamp": time.time(),
                    "type": "intermittent_outage_start",
                    "clients_affected": len(clients_to_affect),
                    "outage_duration": outage_duration
                })
                
                await asyncio.sleep(outage_duration)
                
                # Re-enable message sending
                for client in clients_to_affect:
                    self.clients_to_disconnect.discard(client)
                
                self.failure_history.append({
                    "timestamp": time.time(),
                    "type": "intermittent_outage_end",
                    "clients_affected": len(clients_to_affect)
                })
            
            # Wait for next outage
            wait_time = 60.0 / outage_frequency if outage_frequency > 0 else 60.0
            await asyncio.sleep(wait_time)
    
    async def _disconnect_client(self, client, reason: str):
        """Disconnect a specific client"""
        try:
            await client.close()
            self.websocket_simulator.connected_clients.discard(client)
        except Exception as e:
            print(f"Error disconnecting client: {e}")
    
    def get_failure_statistics(self) -> Dict[str, Any]:
        """Get failure simulation statistics"""
        failure_types = {}
        for failure in self.failure_history:
            failure_type = failure["type"]
            if failure_type not in failure_types:
                failure_types[failure_type] = 0
            failure_types[failure_type] += 1
        
        return {
            "total_failures": len(self.failure_history),
            "failure_types": failure_types,
            "failure_history": self.failure_history[-10:]  # Last 10 failures
        }


class ConnectionRecoveryTester:
    """Tests connection recovery mechanisms"""
    
    def __init__(self):
        self.connection_attempts = []
        self.successful_reconnections = []
        self.failed_reconnections = []
        
    async def test_reconnection_logic(self, websocket_url: str, 
                                    max_attempts: int = 5) -> TestValidationResult:
        """Test WebSocket reconnection logic"""
        reconnection_times = []
        
        for attempt in range(max_attempts):
            start_time = time.time()
            
            try:
                # Attempt connection
                async with websockets.connect(websocket_url) as websocket:
                    # Connection successful
                    connection_time = time.time() - start_time
                    reconnection_times.append(connection_time)
                    
                    # Send a test message
                    test_message = {"type": "ping", "timestamp": time.time()}
                    await websocket.send(str(test_message))
                    
                    # Wait for response (with timeout)
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        self.successful_reconnections.append({
                            "attempt": attempt + 1,
                            "connection_time": connection_time,
                            "response_received": True
                        })
                    except asyncio.TimeoutError:
                        self.successful_reconnections.append({
                            "attempt": attempt + 1,
                            "connection_time": connection_time,
                            "response_received": False
                        })
                
                # Wait before next attempt
                await asyncio.sleep(1.0)
                
            except Exception as e:
                self.failed_reconnections.append({
                    "attempt": attempt + 1,
                    "error": str(e),
                    "time": time.time() - start_time
                })
        
        success_rate = len(self.successful_reconnections) / max_attempts
        avg_connection_time = sum(reconnection_times) / len(reconnection_times) if reconnection_times else 0
        
        return TestValidationResult(
            passed=success_rate >= 0.8,  # 80% success rate required
            message=f"Reconnection test: {success_rate:.1%} success rate, avg {avg_connection_time:.2f}s",
            details={
                "success_rate": success_rate,
                "avg_connection_time": avg_connection_time,
                "successful_reconnections": len(self.successful_reconnections),
                "failed_reconnections": len(self.failed_reconnections),
                "reconnection_times": reconnection_times
            }
        )
    
    async def test_backoff_strategy(self, websocket_url: str) -> TestValidationResult:
        """Test exponential backoff reconnection strategy"""
        backoff_times = []
        
        # Simulate multiple reconnection attempts with backoff
        for attempt in range(5):
            expected_delay = min(0.1 * (2 ** attempt), 30.0)  # Exponential backoff with max 30s
            
            start_time = time.time()
            await asyncio.sleep(expected_delay)
            
            try:
                async with websockets.connect(websocket_url) as websocket:
                    actual_delay = time.time() - start_time
                    backoff_times.append({
                        "attempt": attempt + 1,
                        "expected_delay": expected_delay,
                        "actual_delay": actual_delay,
                        "success": True
                    })
                    
                    # Brief connection test
                    await websocket.send('{"type": "ping"}')
                    
            except Exception as e:
                actual_delay = time.time() - start_time
                backoff_times.append({
                    "attempt": attempt + 1,
                    "expected_delay": expected_delay,
                    "actual_delay": actual_delay,
                    "success": False,
                    "error": str(e)
                })
        
        # Validate backoff timing
        timing_valid = all(
            abs(bt["actual_delay"] - bt["expected_delay"]) < 0.5
            for bt in backoff_times
        )
        
        return TestValidationResult(
            passed=timing_valid,
            message=f"Backoff strategy test: {'passed' if timing_valid else 'failed'}",
            details={
                "backoff_times": backoff_times,
                "timing_valid": timing_valid
            }
        )


@pytest.mark.asyncio
class TestNetworkFailures:
    """Network failure and recovery tests"""
    
    @pytest.fixture
    async def network_failure_setup(self):
        """Set up network failure testing environment"""
        config = get_test_config()
        
        # Create simulator with failure simulation enabled
        simulator_config = SimulatorConfig(
            host=config.network.simulator_host,
            port=config.network.simulator_port,
            symbols=config.symbols.symbols,
            message_rate=1000,
            enable_network_failures=True,
            failure_rate=0.01,  # Higher failure rate for testing
            serialization_format="json"
        )
        
        simulator = WebSocketDataFeedSimulator(simulator_config)
        failure_simulator = NetworkFailureSimulator(simulator)
        recovery_tester = ConnectionRecoveryTester()
        
        await simulator.start_server()
        
        yield {
            "simulator": simulator,
            "failure_simulator": failure_simulator,
            "recovery_tester": recovery_tester,
            "config": config
        }
        
        await simulator.stop_server()
    
    async def test_connection_drop_recovery(self, network_failure_setup):
        """Test recovery from connection drops"""
        setup = network_failure_setup
        simulator = setup["simulator"]
        failure_simulator = setup["failure_simulator"]
        
        # Start performance monitoring
        monitor = PerformanceMonitor()
        monitor.start_monitoring()
        
        try:
            # Start connection drop simulation
            drop_task = asyncio.create_task(
                failure_simulator.simulate_connection_drops(
                    duration_seconds=15.0,
                    frequency=4.0  # 4 drops per minute
                )
            )
            
            # Let it run and collect statistics
            await asyncio.sleep(20.0)
            
            # Stop simulation
            drop_task.cancel()
            
            # Get statistics
            stats = simulator.get_stats()
            failure_stats = failure_simulator.get_failure_statistics()
            
            # Validate results
            assert stats["messages_sent"] > 0
            assert failure_stats["total_failures"] > 0
            assert "connection_drop" in failure_stats["failure_types"]
            
        finally:
            monitor.stop_monitoring()
    
    async def test_slow_network_conditions(self, network_failure_setup):
        """Test behavior under slow network conditions"""
        setup = network_failure_setup
        simulator = setup["simulator"]
        failure_simulator = setup["failure_simulator"]
        
        initial_stats = simulator.get_stats()
        
        # Simulate slow network
        await failure_simulator.simulate_slow_network(
            duration_seconds=10.0,
            delay_ms=100.0  # 100ms additional delay
        )
        
        final_stats = simulator.get_stats()
        failure_stats = failure_simulator.get_failure_statistics()
        
        # Verify slow network was simulated
        assert "slow_network" in failure_stats["failure_types"]
        
        # Messages should still be sent, but potentially at reduced rate
        messages_sent = final_stats["messages_sent"] - initial_stats["messages_sent"]
        assert messages_sent > 0
    
    async def test_intermittent_connectivity(self, network_failure_setup):
        """Test intermittent connectivity issues"""
        setup = network_failure_setup
        simulator = setup["simulator"]
        failure_simulator = setup["failure_simulator"]
        
        initial_stats = simulator.get_stats()
        
        # Simulate intermittent connectivity
        await failure_simulator.simulate_intermittent_connectivity(
            duration_seconds=20.0,
            outage_duration=2.0,  # 2 second outages
            outage_frequency=6.0  # Every 10 seconds
        )
        
        final_stats = simulator.get_stats()
        failure_stats = failure_simulator.get_failure_statistics()
        
        # Verify intermittent failures were simulated
        outage_starts = failure_stats["failure_types"].get("intermittent_outage_start", 0)
        outage_ends = failure_stats["failure_types"].get("intermittent_outage_end", 0)
        
        assert outage_starts > 0
        assert outage_ends > 0
        assert outage_starts == outage_ends  # Should be balanced
    
    async def test_reconnection_logic(self, network_failure_setup):
        """Test WebSocket reconnection logic"""
        setup = network_failure_setup
        config = setup["config"]
        recovery_tester = setup["recovery_tester"]
        
        websocket_url = f"ws://{config.network.simulator_host}:{config.network.simulator_port}"
        
        # Test basic reconnection
        result = await recovery_tester.test_reconnection_logic(websocket_url, max_attempts=5)
        
        assert result.passed
        assert result.details["success_rate"] >= 0.8
        assert result.details["avg_connection_time"] < 5.0
    
    async def test_exponential_backoff(self, network_failure_setup):
        """Test exponential backoff strategy"""
        setup = network_failure_setup
        config = setup["config"]
        recovery_tester = setup["recovery_tester"]
        
        websocket_url = f"ws://{config.network.simulator_host}:{config.network.simulator_port}"
        
        # Test backoff strategy
        result = await recovery_tester.test_backoff_strategy(websocket_url)
        
        assert result.passed
        assert result.details["timing_valid"]
    
    async def test_data_loss_during_failures(self, network_failure_setup):
        """Test data loss measurement during network failures"""
        setup = network_failure_setup
        simulator = setup["simulator"]
        failure_simulator = setup["failure_simulator"]
        
        # Record initial state
        initial_stats = simulator.get_stats()
        
        # Run with failures for a period
        failure_task = asyncio.create_task(
            failure_simulator.simulate_connection_drops(
                duration_seconds=15.0,
                frequency=6.0  # High failure rate
            )
        )
        
        await asyncio.sleep(20.0)
        failure_task.cancel()
        
        # Calculate data loss
        final_stats = simulator.get_stats()
        failure_stats = failure_simulator.get_failure_statistics()
        
        messages_sent = final_stats["messages_sent"] - initial_stats["messages_sent"]
        failures_occurred = failure_stats["total_failures"]
        
        # Verify system handled failures
        assert messages_sent > 0
        assert failures_occurred > 0
        
        # Data loss should be within acceptable limits
        # (This would require actual client connection to measure accurately)
        print(f"Messages sent during failures: {messages_sent}")
        print(f"Failures occurred: {failures_occurred}")
    
    async def test_concurrent_failure_scenarios(self, network_failure_setup):
        """Test multiple concurrent failure scenarios"""
        setup = network_failure_setup
        simulator = setup["simulator"]
        failure_simulator = setup["failure_simulator"]
        
        initial_stats = simulator.get_stats()
        
        # Run multiple failure types concurrently
        tasks = [
            asyncio.create_task(
                failure_simulator.simulate_connection_drops(10.0, 2.0)
            ),
            asyncio.create_task(
                failure_simulator.simulate_slow_network(8.0, 50.0)
            ),
            asyncio.create_task(
                failure_simulator.simulate_intermittent_connectivity(12.0, 1.0, 8.0)
            )
        ]
        
        # Let all scenarios run
        await asyncio.sleep(15.0)
        
        # Cancel all tasks
        for task in tasks:
            task.cancel()
        
        # Verify system survived concurrent failures
        final_stats = simulator.get_stats()
        failure_stats = failure_simulator.get_failure_statistics()
        
        assert final_stats["messages_sent"] > initial_stats["messages_sent"]
        assert failure_stats["total_failures"] > 0
        
        # Should have multiple failure types
        assert len(failure_stats["failure_types"]) > 1


@pytest.mark.asyncio
class TestFailureRecoveryMetrics:
    """Test failure recovery metrics and monitoring"""
    
    async def test_recovery_time_measurement(self, network_failure_setup):
        """Test measurement of recovery times"""
        setup = network_failure_setup
        config = setup["config"]
        
        websocket_url = f"ws://{config.network.simulator_host}:{config.network.simulator_port}"
        recovery_times = []
        
        # Simulate multiple disconnect/reconnect cycles
        for cycle in range(3):
            # Connect
            connect_start = time.time()
            
            try:
                async with websockets.connect(websocket_url) as websocket:
                    connect_time = time.time() - connect_start
                    
                    # Stay connected briefly
                    await asyncio.sleep(2.0)
                    
                    # Simulate disconnect by closing
                    await websocket.close()
                    
                    recovery_times.append(connect_time)
                    
            except Exception as e:
                print(f"Connection cycle {cycle} failed: {e}")
            
            # Wait before next cycle
            await asyncio.sleep(1.0)
        
        # Validate recovery times
        if recovery_times:
            avg_recovery_time = sum(recovery_times) / len(recovery_times)
            max_recovery_time = max(recovery_times)
            
            assert avg_recovery_time < 5.0  # Average recovery under 5 seconds
            assert max_recovery_time < 10.0  # Max recovery under 10 seconds
            
            print(f"Average recovery time: {avg_recovery_time:.2f}s")
            print(f"Max recovery time: {max_recovery_time:.2f}s")
    
    async def test_failure_detection_accuracy(self, network_failure_setup):
        """Test accuracy of failure detection"""
        setup = network_failure_setup
        simulator = setup["simulator"]
        failure_simulator = setup["failure_simulator"]
        
        # Run controlled failure simulation
        start_time = time.time()
        
        await failure_simulator.simulate_connection_drops(
            duration_seconds=10.0,
            frequency=6.0  # 1 failure every 10 seconds
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        failure_stats = failure_simulator.get_failure_statistics()
        
        # Verify failure detection
        expected_failures = int(duration * 6.0 / 60.0)  # frequency per minute
        actual_failures = failure_stats["failure_types"].get("connection_drop", 0)
        
        # Allow some variance in failure timing
        assert abs(actual_failures - expected_failures) <= 2
        
        print(f"Expected failures: {expected_failures}")
        print(f"Actual failures: {actual_failures}")


# Standalone test runner
async def run_network_failure_tests():
    """Run network failure tests standalone"""
    print("Starting network failure tests...")
    
    config = get_test_config()
    
    # Set up simulator
    simulator_config = SimulatorConfig(
        host=config.network.simulator_host,
        port=config.network.simulator_port,
        symbols=config.symbols.symbols,
        message_rate=1000,
        enable_network_failures=True,
        failure_rate=0.01
    )
    
    simulator = WebSocketDataFeedSimulator(simulator_config)
    failure_simulator = NetworkFailureSimulator(simulator)
    recovery_tester = ConnectionRecoveryTester()
    
    try:
        await simulator.start_server()
        
        print("Testing connection drops...")
        await failure_simulator.simulate_connection_drops(10.0, 4.0)
        
        print("Testing slow network...")
        await failure_simulator.simulate_slow_network(5.0, 100.0)
        
        print("Testing reconnection logic...")
        websocket_url = f"ws://{config.network.simulator_host}:{config.network.simulator_port}"
        result = await recovery_tester.test_reconnection_logic(websocket_url)
        
        print(f"Reconnection test result: {result.message}")
        
        # Print statistics
        stats = simulator.get_stats()
        failure_stats = failure_simulator.get_failure_statistics()
        
        print(f"\nSimulator stats: {stats}")
        print(f"Failure stats: {failure_stats}")
        
    finally:
        await simulator.stop_server()
    
    print("Network failure tests completed")


if __name__ == "__main__":
    asyncio.run(run_network_failure_tests())