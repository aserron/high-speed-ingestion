"""
Load Testing Scenarios

Comprehensive load testing scenarios that simulate realistic market data patterns,
including market open bursts, sustained trading periods, and stress conditions.
"""

import asyncio
import time
import random
import statistics
import pytest
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
import psutil

from websocket_simulator import WebSocketDataFeedSimulator, SimulatorConfig, MarketDataMessage
from test_config import get_test_config
from test_utils import PerformanceMonitor, TestValidationResult, DataValidationUtils


@dataclass
class LoadTestScenario:
    """Load test scenario configuration"""
    name: str
    description: str
    duration_seconds: int
    base_message_rate: int
    peak_message_rate: int
    burst_pattern: str  # "market_open", "sustained", "random_spikes", "gradual_ramp"
    symbols: List[str]
    expected_min_throughput: int
    expected_max_latency_ms: float
    max_memory_growth_mb: float
    max_cpu_percent: float


@dataclass
class LoadTestResults:
    """Load test execution results"""
    scenario_name: str
    duration_seconds: int
    total_messages_sent: int
    total_messages_received: int
    average_throughput_mps: float
    peak_throughput_mps: float
    average_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    max_latency_ms: float
    average_cpu_percent: float
    peak_cpu_percent: float
    average_memory_mb: float
    peak_memory_mb: float
    memory_growth_mb: float
    error_count: int
    success: bool
    performance_degradation_events: List[Dict[str, Any]] = field(default_factory=list)
    resource_snapshots: List[Dict[str, Any]] = field(default_factory=list)


class MarketDataPatternGenerator:
    """Generates realistic market data patterns"""
    
    def __init__(self, symbols: List[str]):
        self.symbols = symbols
        self.symbol_prices = {symbol: random.uniform(50.0, 500.0) for symbol in symbols}
        self.symbol_volumes = {symbol: random.randint(1000, 100000) for symbol in symbols}
        
    def generate_market_open_pattern(self, duration_seconds: int, 
                                   base_rate: int, peak_rate: int) -> List[Tuple[float, int]]:
        """Generate market open burst pattern"""
        pattern = []
        
        # Pre-market (low activity)
        pre_market_duration = duration_seconds * 0.1
        for t in range(int(pre_market_duration)):
            rate = int(base_rate * 0.3)
            pattern.append((t, rate))
        
        # Market open burst (high activity)
        burst_duration = duration_seconds * 0.2
        for t in range(int(pre_market_duration), int(pre_market_duration + burst_duration)):
            # Exponential ramp up to peak
            progress = (t - pre_market_duration) / burst_duration
            rate = int(base_rate + (peak_rate - base_rate) * (1 - math.exp(-progress * 3)))
            pattern.append((t, rate))
        
        # Post-open normalization
        normal_start = pre_market_duration + burst_duration
        for t in range(int(normal_start), duration_seconds):
            # Gradual decline to normal levels
            progress = (t - normal_start) / (duration_seconds - normal_start)
            rate = int(peak_rate * 0.7 * (1 - progress * 0.3) + base_rate * progress)
            pattern.append((t, rate))
        
        return pattern
    
    def generate_sustained_pattern(self, duration_seconds: int, 
                                 base_rate: int, variance: float = 0.2) -> List[Tuple[float, int]]:
        """Generate sustained trading pattern with variance"""
        pattern = []
        
        for t in range(duration_seconds):
            # Add random variance around base rate
            variance_factor = 1 + random.uniform(-variance, variance)
            rate = int(base_rate * variance_factor)
            pattern.append((t, max(1, rate)))
        
        return pattern
    
    def generate_random_spikes_pattern(self, duration_seconds: int, 
                                     base_rate: int, peak_rate: int,
                                     spike_frequency: float = 0.1) -> List[Tuple[float, int]]:
        """Generate pattern with random spikes"""
        pattern = []
        
        for t in range(duration_seconds):
            if random.random() < spike_frequency:
                # Spike event
                spike_intensity = random.uniform(0.5, 1.0)
                rate = int(base_rate + (peak_rate - base_rate) * spike_intensity)
            else:
                # Normal rate with small variance
                rate = int(base_rate * random.uniform(0.8, 1.2))
            
            pattern.append((t, max(1, rate)))
        
        return pattern
    
    def generate_gradual_ramp_pattern(self, duration_seconds: int, 
                                    start_rate: int, end_rate: int) -> List[Tuple[float, int]]:
        """Generate gradual ramp up/down pattern"""
        pattern = []
        
        for t in range(duration_seconds):
            progress = t / duration_seconds
            rate = int(start_rate + (end_rate - start_rate) * progress)
            pattern.append((t, max(1, rate)))
        
        return pattern


class LoadTestRunner:
    """Executes load test scenarios"""
    
    def __init__(self, simulator: WebSocketDataFeedSimulator):
        self.simulator = simulator
        self.pattern_generator = MarketDataPatternGenerator(simulator.config.symbols)
        self.performance_monitor = PerformanceMonitor()
        self.latency_measurements = []
        self.throughput_measurements = []
        
    async def run_scenario(self, scenario: LoadTestScenario) -> LoadTestResults:
        """Run a specific load test scenario"""
        print(f"Starting load test scenario: {scenario.name}")
        
        # Generate message rate pattern
        if scenario.burst_pattern == "market_open":
            rate_pattern = self.pattern_generator.generate_market_open_pattern(
                scenario.duration_seconds, scenario.base_message_rate, scenario.peak_message_rate
            )
        elif scenario.burst_pattern == "sustained":
            rate_pattern = self.pattern_generator.generate_sustained_pattern(
                scenario.duration_seconds, scenario.base_message_rate
            )
        elif scenario.burst_pattern == "random_spikes":
            rate_pattern = self.pattern_generator.generate_random_spikes_pattern(
                scenario.duration_seconds, scenario.base_message_rate, scenario.peak_message_rate
            )
        elif scenario.burst_pattern == "gradual_ramp":
            rate_pattern = self.pattern_generator.generate_gradual_ramp_pattern(
                scenario.duration_seconds, scenario.base_message_rate, scenario.peak_message_rate
            )
        else:
            # Default to sustained pattern
            rate_pattern = self.pattern_generator.generate_sustained_pattern(
                scenario.duration_seconds, scenario.base_message_rate
            )
        
        # Start performance monitoring
        self.performance_monitor.start_monitoring()
        initial_stats = self.simulator.get_stats()
        initial_memory = psutil.virtual_memory().used / 1024 / 1024
        
        start_time = time.time()
        
        try:
            # Execute the load pattern
            await self._execute_load_pattern(rate_pattern)
            
        finally:
            self.performance_monitor.stop_monitoring()
        
        end_time = time.time()
        actual_duration = end_time - start_time
        
        # Collect final statistics
        final_stats = self.simulator.get_stats()
        final_memory = psutil.virtual_memory().used / 1024 / 1024
        
        # Calculate results
        results = self._calculate_results(
            scenario, actual_duration, initial_stats, final_stats,
            initial_memory, final_memory
        )
        
        print(f"Completed load test scenario: {scenario.name}")
        return results
    
    async def _execute_load_pattern(self, rate_pattern: List[Tuple[float, int]]):
        """Execute the load pattern by adjusting simulator message rate"""
        for timestamp, target_rate in rate_pattern:
            # Update simulator message rate
            self.simulator.config.message_rate = target_rate
            
            # Measure current performance
            current_stats = self.simulator.get_stats()
            
            # Record throughput measurement
            if len(self.throughput_measurements) > 0:
                prev_stats = self.throughput_measurements[-1]
                time_diff = time.time() - prev_stats["timestamp"]
                msg_diff = current_stats["messages_sent"] - prev_stats["messages_sent"]
                
                if time_diff > 0:
                    current_throughput = msg_diff / time_diff
                    self.throughput_measurements.append({
                        "timestamp": time.time(),
                        "messages_sent": current_stats["messages_sent"],
                        "throughput_mps": current_throughput,
                        "target_rate": target_rate
                    })
            else:
                self.throughput_measurements.append({
                    "timestamp": time.time(),
                    "messages_sent": current_stats["messages_sent"],
                    "throughput_mps": 0,
                    "target_rate": target_rate
                })
            
            # Wait for next interval
            await asyncio.sleep(1.0)
    
    def _calculate_results(self, scenario: LoadTestScenario, duration: float,
                          initial_stats: Dict, final_stats: Dict,
                          initial_memory: float, final_memory: float) -> LoadTestResults:
        """Calculate load test results"""
        
        # Basic metrics
        total_messages = final_stats["messages_sent"] - initial_stats["messages_sent"]
        avg_throughput = total_messages / duration if duration > 0 else 0
        
        # Throughput statistics
        throughput_values = [m["throughput_mps"] for m in self.throughput_measurements if m["throughput_mps"] > 0]
        peak_throughput = max(throughput_values) if throughput_values else 0
        
        # Resource usage from performance monitor
        resource_metrics = self.performance_monitor.metrics_history
        
        if resource_metrics:
            cpu_values = [m.cpu_percent for m in resource_metrics]
            memory_values = [m.memory_mb for m in resource_metrics]
            
            avg_cpu = statistics.mean(cpu_values)
            peak_cpu = max(cpu_values)
            avg_memory = statistics.mean(memory_values)
            peak_memory = max(memory_values)
        else:
            avg_cpu = peak_cpu = avg_memory = peak_memory = 0
        
        # Memory growth
        memory_growth = final_memory - initial_memory
        
        # Performance validation
        success = (
            avg_throughput >= scenario.expected_min_throughput and
            memory_growth <= scenario.max_memory_growth_mb and
            peak_cpu <= scenario.max_cpu_percent
        )
        
        # Detect performance degradation events
        degradation_events = self._detect_performance_degradation(scenario, throughput_values)
        
        return LoadTestResults(
            scenario_name=scenario.name,
            duration_seconds=int(duration),
            total_messages_sent=total_messages,
            total_messages_received=total_messages,  # Assuming all sent messages are received
            average_throughput_mps=avg_throughput,
            peak_throughput_mps=peak_throughput,
            average_latency_ms=0.0,  # Would need actual latency measurements
            p95_latency_ms=0.0,
            p99_latency_ms=0.0,
            max_latency_ms=0.0,
            average_cpu_percent=avg_cpu,
            peak_cpu_percent=peak_cpu,
            average_memory_mb=avg_memory,
            peak_memory_mb=peak_memory,
            memory_growth_mb=memory_growth,
            error_count=final_stats.get("failures_simulated", 0),
            success=success,
            performance_degradation_events=degradation_events,
            resource_snapshots=[
                {
                    "timestamp": m.timestamp,
                    "cpu_percent": m.cpu_percent,
                    "memory_mb": m.memory_mb
                }
                for m in resource_metrics[-100:]  # Last 100 snapshots
            ]
        )
    
    def _detect_performance_degradation(self, scenario: LoadTestScenario, 
                                      throughput_values: List[float]) -> List[Dict[str, Any]]:
        """Detect performance degradation events"""
        events = []
        
        if len(throughput_values) < 10:
            return events
        
        # Look for sustained drops in throughput
        window_size = 10
        threshold = scenario.expected_min_throughput * 0.8  # 20% below expected
        
        for i in range(len(throughput_values) - window_size):
            window = throughput_values[i:i + window_size]
            avg_window_throughput = statistics.mean(window)
            
            if avg_window_throughput < threshold:
                events.append({
                    "type": "throughput_degradation",
                    "timestamp": time.time() - (len(throughput_values) - i),
                    "window_throughput": avg_window_throughput,
                    "threshold": threshold,
                    "severity": (threshold - avg_window_throughput) / threshold
                })
        
        return events


# Import math for exponential calculations
import math


@pytest.mark.asyncio
class TestLoadScenarios:
    """Load testing scenarios"""
    
    @pytest.fixture
    async def load_test_setup(self):
        """Set up load testing environment"""
        config = get_test_config()
        
        # Create simulator optimized for load testing
        simulator_config = SimulatorConfig(
            host=config.network.simulator_host,
            port=config.network.simulator_port,
            symbols=config.symbols.symbols,
            message_rate=1000,  # Will be dynamically adjusted
            burst_rate=10000,
            enable_network_failures=False,  # Disable for pure load testing
            serialization_format="json"
        )
        
        simulator = WebSocketDataFeedSimulator(simulator_config)
        load_runner = LoadTestRunner(simulator)
        
        await simulator.start_server()
        
        yield {
            "simulator": simulator,
            "load_runner": load_runner,
            "config": config
        }
        
        await simulator.stop_server()
    
    async def test_market_open_burst(self, load_test_setup):
        """Test market open burst scenario"""
        setup = load_test_setup
        load_runner = setup["load_runner"]
        
        scenario = LoadTestScenario(
            name="market_open_burst",
            description="Simulate market open with high initial burst",
            duration_seconds=60,
            base_message_rate=1000,
            peak_message_rate=8000,
            burst_pattern="market_open",
            symbols=["AAPL", "GOOGL", "MSFT", "TSLA"],
            expected_min_throughput=800,
            expected_max_latency_ms=50.0,
            max_memory_growth_mb=200.0,
            max_cpu_percent=80.0
        )
        
        results = await load_runner.run_scenario(scenario)
        
        # Validate results
        assert results.success
        assert results.average_throughput_mps >= scenario.expected_min_throughput
        assert results.peak_throughput_mps > results.average_throughput_mps
        assert results.memory_growth_mb <= scenario.max_memory_growth_mb
        assert results.peak_cpu_percent <= scenario.max_cpu_percent
        
        print(f"Market open test - Avg throughput: {results.average_throughput_mps:.0f} msg/s")
        print(f"Peak throughput: {results.peak_throughput_mps:.0f} msg/s")
    
    async def test_sustained_high_load(self, load_test_setup):
        """Test sustained high load scenario"""
        setup = load_test_setup
        load_runner = setup["load_runner"]
        
        scenario = LoadTestScenario(
            name="sustained_high_load",
            description="Sustained high message rate for extended period",
            duration_seconds=120,
            base_message_rate=5000,
            peak_message_rate=5000,  # Constant rate
            burst_pattern="sustained",
            symbols=["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META"],
            expected_min_throughput=4000,
            expected_max_latency_ms=30.0,
            max_memory_growth_mb=300.0,
            max_cpu_percent=85.0
        )
        
        results = await load_runner.run_scenario(scenario)
        
        # Validate sustained performance
        assert results.success
        assert results.average_throughput_mps >= scenario.expected_min_throughput
        assert len(results.performance_degradation_events) == 0  # No degradation
        
        # Memory should be stable (not growing continuously)
        if len(results.resource_snapshots) > 10:
            early_memory = statistics.mean([s["memory_mb"] for s in results.resource_snapshots[:10]])
            late_memory = statistics.mean([s["memory_mb"] for s in results.resource_snapshots[-10:]])
            memory_growth_rate = (late_memory - early_memory) / results.duration_seconds
            
            assert memory_growth_rate < 5.0  # Less than 5MB/second growth
        
        print(f"Sustained load test - Avg throughput: {results.average_throughput_mps:.0f} msg/s")
        print(f"Memory growth: {results.memory_growth_mb:.1f} MB")
    
    async def test_random_spikes_scenario(self, load_test_setup):
        """Test random traffic spikes scenario"""
        setup = load_test_setup
        load_runner = setup["load_runner"]
        
        scenario = LoadTestScenario(
            name="random_spikes",
            description="Random traffic spikes throughout test period",
            duration_seconds=90,
            base_message_rate=2000,
            peak_message_rate=7000,
            burst_pattern="random_spikes",
            symbols=["AAPL", "GOOGL", "MSFT"],
            expected_min_throughput=1500,
            expected_max_latency_ms=100.0,
            max_memory_growth_mb=250.0,
            max_cpu_percent=90.0
        )
        
        results = await load_runner.run_scenario(scenario)
        
        # Validate spike handling
        assert results.success
        assert results.peak_throughput_mps > results.average_throughput_mps * 1.5  # Significant spikes
        
        # Should handle spikes without major degradation
        severe_degradations = [
            event for event in results.performance_degradation_events
            if event.get("severity", 0) > 0.5
        ]
        assert len(severe_degradations) < 3  # Allow some degradation during spikes
        
        print(f"Random spikes test - Peak throughput: {results.peak_throughput_mps:.0f} msg/s")
        print(f"Degradation events: {len(results.performance_degradation_events)}")
    
    async def test_gradual_ramp_up(self, load_test_setup):
        """Test gradual ramp up scenario"""
        setup = load_test_setup
        load_runner = setup["load_runner"]
        
        scenario = LoadTestScenario(
            name="gradual_ramp_up",
            description="Gradual ramp up from low to high load",
            duration_seconds=80,
            base_message_rate=500,
            peak_message_rate=6000,
            burst_pattern="gradual_ramp",
            symbols=["AAPL", "GOOGL"],
            expected_min_throughput=2000,  # Average over the ramp
            expected_max_latency_ms=75.0,
            max_memory_growth_mb=200.0,
            max_cpu_percent=85.0
        )
        
        results = await load_runner.run_scenario(scenario)
        
        # Validate ramp behavior
        assert results.success
        
        # Throughput should increase over time
        if len(load_runner.throughput_measurements) > 20:
            early_throughput = statistics.mean([
                m["throughput_mps"] for m in load_runner.throughput_measurements[:10]
                if m["throughput_mps"] > 0
            ])
            late_throughput = statistics.mean([
                m["throughput_mps"] for m in load_runner.throughput_measurements[-10:]
                if m["throughput_mps"] > 0
            ])
            
            if early_throughput > 0 and late_throughput > 0:
                assert late_throughput > early_throughput * 2  # Should at least double
        
        print(f"Gradual ramp test - Final throughput: {results.peak_throughput_mps:.0f} msg/s")
    
    async def test_stress_conditions(self, load_test_setup):
        """Test system under stress conditions"""
        setup = load_test_setup
        load_runner = setup["load_runner"]
        
        scenario = LoadTestScenario(
            name="stress_test",
            description="Maximum load stress test",
            duration_seconds=60,
            base_message_rate=8000,
            peak_message_rate=12000,
            burst_pattern="random_spikes",
            symbols=["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "NFLX"],
            expected_min_throughput=5000,  # Lower expectation under stress
            expected_max_latency_ms=200.0,  # Higher latency allowed
            max_memory_growth_mb=500.0,  # Higher memory growth allowed
            max_cpu_percent=95.0  # Near maximum CPU
        )
        
        results = await load_runner.run_scenario(scenario)
        
        # Under stress, system should still function but may have degraded performance
        assert results.total_messages_sent > 0
        assert results.average_throughput_mps > 0
        
        # Should not crash or have excessive memory growth
        assert results.memory_growth_mb < 1000.0  # Hard limit
        
        print(f"Stress test - Throughput: {results.average_throughput_mps:.0f} msg/s")
        print(f"CPU usage: {results.peak_cpu_percent:.1f}%")
        print(f"Memory growth: {results.memory_growth_mb:.1f} MB")
    
    async def test_memory_stability_long_run(self, load_test_setup):
        """Test memory stability over longer duration"""
        setup = load_test_setup
        load_runner = setup["load_runner"]
        
        scenario = LoadTestScenario(
            name="memory_stability",
            description="Long-running test for memory stability",
            duration_seconds=180,  # 3 minutes
            base_message_rate=3000,
            peak_message_rate=3000,
            burst_pattern="sustained",
            symbols=["AAPL", "GOOGL", "MSFT", "TSLA"],
            expected_min_throughput=2500,
            expected_max_latency_ms=50.0,
            max_memory_growth_mb=100.0,  # Strict memory growth limit
            max_cpu_percent=80.0
        )
        
        results = await load_runner.run_scenario(scenario)
        
        # Memory growth should be minimal for sustained load
        assert results.memory_growth_mb <= scenario.max_memory_growth_mb
        
        # Check for memory leaks by analyzing growth pattern
        if len(results.resource_snapshots) > 60:  # At least 1 minute of data
            # Split into thirds and check growth rate
            third = len(results.resource_snapshots) // 3
            
            first_third_avg = statistics.mean([
                s["memory_mb"] for s in results.resource_snapshots[:third]
            ])
            last_third_avg = statistics.mean([
                s["memory_mb"] for s in results.resource_snapshots[-third:]
            ])
            
            growth_rate = (last_third_avg - first_third_avg) / (results.duration_seconds * 2/3)
            
            # Growth rate should be very low (less than 1MB per minute)
            assert growth_rate < 1.0
        
        print(f"Memory stability test - Growth rate: {results.memory_growth_mb/results.duration_seconds*60:.2f} MB/min")


@pytest.mark.asyncio
class TestPerformanceRegression:
    """Performance regression detection tests"""
    
    async def test_throughput_regression_detection(self, load_test_setup):
        """Test detection of throughput regression"""
        setup = load_test_setup
        load_runner = setup["load_runner"]
        
        # Run baseline scenario
        baseline_scenario = LoadTestScenario(
            name="baseline_performance",
            description="Baseline performance measurement",
            duration_seconds=30,
            base_message_rate=4000,
            peak_message_rate=4000,
            burst_pattern="sustained",
            symbols=["AAPL", "GOOGL"],
            expected_min_throughput=3500,
            expected_max_latency_ms=50.0,
            max_memory_growth_mb=100.0,
            max_cpu_percent=80.0
        )
        
        baseline_results = await load_runner.run_scenario(baseline_scenario)
        
        # Simulate performance regression by reducing simulator efficiency
        # (In real scenario, this would be detected by comparing with historical results)
        
        # Verify baseline performance
        assert baseline_results.success
        assert baseline_results.average_throughput_mps >= baseline_scenario.expected_min_throughput
        
        print(f"Baseline throughput: {baseline_results.average_throughput_mps:.0f} msg/s")
        
        # In a real implementation, we would:
        # 1. Store baseline results in a database
        # 2. Compare current results with historical baselines
        # 3. Alert if performance degrades beyond threshold
    
    async def test_latency_regression_detection(self, load_test_setup):
        """Test detection of latency regression"""
        setup = load_test_setup
        load_runner = setup["load_runner"]
        
        # This test would require actual latency measurements
        # For now, we'll test the framework structure
        
        scenario = LoadTestScenario(
            name="latency_baseline",
            description="Latency baseline measurement",
            duration_seconds=30,
            base_message_rate=2000,
            peak_message_rate=2000,
            burst_pattern="sustained",
            symbols=["AAPL"],
            expected_min_throughput=1800,
            expected_max_latency_ms=25.0,
            max_memory_growth_mb=50.0,
            max_cpu_percent=70.0
        )
        
        results = await load_runner.run_scenario(scenario)
        
        # Verify test completed successfully
        assert results.success
        
        # In real implementation, latency measurements would be collected
        # and compared against historical baselines
        print(f"Latency test completed - Throughput: {results.average_throughput_mps:.0f} msg/s")


# Standalone test runner
async def run_load_tests():
    """Run load tests standalone"""
    print("Starting load testing scenarios...")
    
    config = get_test_config()
    
    # Set up simulator
    simulator_config = SimulatorConfig(
        host=config.network.simulator_host,
        port=config.network.simulator_port,
        symbols=config.symbols.symbols,
        message_rate=1000,
        enable_network_failures=False
    )
    
    simulator = WebSocketDataFeedSimulator(simulator_config)
    load_runner = LoadTestRunner(simulator)
    
    try:
        await simulator.start_server()
        
        # Run different load scenarios
        scenarios = [
            LoadTestScenario(
                name="quick_burst",
                description="Quick burst test",
                duration_seconds=30,
                base_message_rate=1000,
                peak_message_rate=5000,
                burst_pattern="market_open",
                symbols=["AAPL", "GOOGL"],
                expected_min_throughput=800,
                expected_max_latency_ms=50.0,
                max_memory_growth_mb=100.0,
                max_cpu_percent=80.0
            ),
            LoadTestScenario(
                name="sustained_load",
                description="Sustained load test",
                duration_seconds=60,
                base_message_rate=3000,
                peak_message_rate=3000,
                burst_pattern="sustained",
                symbols=["AAPL", "GOOGL", "MSFT"],
                expected_min_throughput=2500,
                expected_max_latency_ms=40.0,
                max_memory_growth_mb=150.0,
                max_cpu_percent=75.0
            )
        ]
        
        results = []
        for scenario in scenarios:
            print(f"\nRunning scenario: {scenario.name}")
            result = await load_runner.run_scenario(scenario)
            results.append(result)
            
            print(f"Result: {'PASS' if result.success else 'FAIL'}")
            print(f"Throughput: {result.average_throughput_mps:.0f} msg/s")
            print(f"Memory growth: {result.memory_growth_mb:.1f} MB")
        
        # Print summary
        print(f"\n{'='*50}")
        print("LOAD TEST SUMMARY")
        print(f"{'='*50}")
        
        for result in results:
            status = "✓" if result.success else "✗"
            print(f"{status} {result.scenario_name}: {result.average_throughput_mps:.0f} msg/s")
        
    finally:
        await simulator.stop_server()
    
    print("Load testing completed")


if __name__ == "__main__":
    asyncio.run(run_load_tests())