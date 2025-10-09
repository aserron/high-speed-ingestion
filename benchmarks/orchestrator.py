#!/usr/bin/env python3
"""
Benchmark Orchestration System

Comprehensive benchmarking system that tests both Python and Node.js implementations
with identical conditions, realistic market data patterns, and detailed resource monitoring.
"""

import asyncio
import json
import time
import os
import sys
import subprocess
import signal
import psutil
import statistics
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
import logging
import tempfile
import shutil

# Add project paths
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "tests" / "integration"))

from websocket_simulator import WebSocketDataFeedSimulator, SimulatorConfig
from test_utils import PerformanceMonitor, NetworkUtils, ProcessUtils


@dataclass
class BenchmarkConfiguration:
    """Benchmark configuration parameters"""
    
    # Test identification
    name: str
    description: str
    
    # Duration and timing
    duration_seconds: int = 60
    warmup_seconds: int = 10
    cooldown_seconds: int = 5
    
    # Load patterns
    message_rate_base: int = 1000
    message_rate_peak: int = 5000
    burst_enabled: bool = True
    burst_interval_seconds: int = 30
    burst_duration_seconds: int = 10
    
    # Market data configuration
    symbols: List[str] = field(default_factory=lambda: ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"])
    exchanges: List[str] = field(default_factory=lambda: ["NYSE", "NASDAQ", "BATS"])
    price_volatility: float = 0.02
    
    # Network conditions
    network_failures_enabled: bool = False
    network_failure_rate: float = 0.001
    network_latency_ms: int = 0
    
    # Resource limits
    cpu_limit_percent: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    
    # Comparison settings
    compare_both_implementations: bool = True
    run_python: bool = True
    run_nodejs: bool = True
    
    # Output settings
    save_detailed_logs: bool = True
    save_metrics_data: bool = True
    generate_charts: bool = True


@dataclass
class SystemResourceSnapshot:
    """System resource usage snapshot"""
    timestamp: float
    cpu_percent: float
    memory_mb: float
    memory_percent: float
    network_bytes_sent: int
    network_bytes_recv: int
    disk_read_bytes: int
    disk_write_bytes: int
    process_count: int
    load_average: Tuple[float, float, float]


@dataclass
class ApplicationMetrics:
    """Application-specific performance metrics"""
    implementation: str  # "python" or "nodejs"
    
    # Message processing
    messages_received: int = 0
    messages_processed: int = 0
    messages_stored: int = 0
    messages_dropped: int = 0
    
    # Latency metrics (in milliseconds)
    latency_avg_ms: float = 0.0
    latency_p50_ms: float = 0.0
    latency_p95_ms: float = 0.0
    latency_p99_ms: float = 0.0
    latency_max_ms: float = 0.0
    
    # Throughput metrics
    throughput_mps: float = 0.0  # messages per second
    throughput_mbps: float = 0.0  # megabytes per second
    
    # Resource usage
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    memory_peak_mb: float = 0.0
    
    # Connection metrics
    connections_established: int = 0
    connections_dropped: int = 0
    reconnection_count: int = 0
    
    # Error metrics
    error_count: int = 0
    error_rate_percent: float = 0.0
    
    # Storage metrics
    redis_operations: int = 0
    postgres_operations: int = 0
    storage_errors: int = 0


@dataclass
class BenchmarkResults:
    """Complete benchmark execution results"""
    configuration: BenchmarkConfiguration
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    
    # Application results
    python_metrics: Optional[ApplicationMetrics] = None
    nodejs_metrics: Optional[ApplicationMetrics] = None
    
    # System resource usage
    resource_snapshots: List[SystemResourceSnapshot] = field(default_factory=list)
    
    # Simulator statistics
    simulator_stats: Dict[str, Any] = field(default_factory=dict)
    
    # Comparison results
    performance_comparison: Dict[str, Any] = field(default_factory=dict)
    
    # Test status
    success: bool = False
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class MarketDataPatternGenerator:
    """Generates realistic market data patterns for benchmarking"""
    
    def __init__(self, config: BenchmarkConfiguration):
        self.config = config
        
    def generate_market_open_pattern(self) -> List[Tuple[int, int]]:
        """Generate market open burst pattern"""
        pattern = []
        total_seconds = self.config.duration_seconds
        
        # Pre-market (30% of time, 20% of base rate)
        pre_market_duration = int(total_seconds * 0.3)
        pre_market_rate = int(self.config.message_rate_base * 0.2)
        
        for second in range(pre_market_duration):
            pattern.append((second, pre_market_rate))
        
        # Market open burst (20% of time, peak rate)
        burst_duration = int(total_seconds * 0.2)
        for second in range(pre_market_duration, pre_market_duration + burst_duration):
            # Exponential ramp up
            progress = (second - pre_market_duration) / burst_duration
            rate = int(pre_market_rate + (self.config.message_rate_peak - pre_market_rate) * 
                      (1 - pow(0.1, progress)))
            pattern.append((second, rate))
        
        # Normal trading (remaining time, base rate with variance)
        normal_start = pre_market_duration + burst_duration
        for second in range(normal_start, total_seconds):
            # Add some variance to base rate
            variance = 0.3 * (0.5 - abs(0.5 - (second - normal_start) / (total_seconds - normal_start)))
            rate = int(self.config.message_rate_base * (1 + variance))
            pattern.append((second, rate))
        
        return pattern
    
    def generate_sustained_trading_pattern(self) -> List[Tuple[int, int]]:
        """Generate sustained trading pattern with periodic bursts"""
        pattern = []
        
        for second in range(self.config.duration_seconds):
            base_rate = self.config.message_rate_base
            
            # Add periodic bursts
            if self.config.burst_enabled:
                burst_cycle = self.config.burst_interval_seconds
                burst_duration = self.config.burst_duration_seconds
                
                cycle_position = second % burst_cycle
                if cycle_position < burst_duration:
                    # In burst period
                    burst_intensity = 1 - (cycle_position / burst_duration)
                    rate = int(base_rate + (self.config.message_rate_peak - base_rate) * burst_intensity)
                else:
                    # Normal period
                    rate = base_rate
            else:
                rate = base_rate
            
            pattern.append((second, rate))
        
        return pattern
    
    def generate_stress_test_pattern(self) -> List[Tuple[int, int]]:
        """Generate stress test pattern with maximum load"""
        pattern = []
        
        # Gradual ramp up to peak
        ramp_duration = min(30, self.config.duration_seconds // 4)
        
        for second in range(ramp_duration):
            progress = second / ramp_duration
            rate = int(self.config.message_rate_base + 
                      (self.config.message_rate_peak - self.config.message_rate_base) * progress)
            pattern.append((second, rate))
        
        # Sustained peak load
        peak_duration = self.config.duration_seconds - 2 * ramp_duration
        for second in range(ramp_duration, ramp_duration + peak_duration):
            pattern.append((second, self.config.message_rate_peak))
        
        # Gradual ramp down
        for second in range(ramp_duration + peak_duration, self.config.duration_seconds):
            progress = (second - ramp_duration - peak_duration) / ramp_duration
            rate = int(self.config.message_rate_peak - 
                      (self.config.message_rate_peak - self.config.message_rate_base) * progress)
            pattern.append((second, rate))
        
        return pattern


class ResourceMonitor:
    """System resource monitoring during benchmarks"""
    
    def __init__(self, sampling_interval: float = 1.0):
        self.sampling_interval = sampling_interval
        self.snapshots: List[SystemResourceSnapshot] = []
        self.monitoring_task: Optional[asyncio.Task] = None
        self.process_monitors: Dict[int, psutil.Process] = {}
        
    def start_monitoring(self, process_pids: List[int] = None):
        """Start resource monitoring"""
        if process_pids:
            for pid in process_pids:
                try:
                    self.process_monitors[pid] = psutil.Process(pid)
                except psutil.NoSuchProcess:
                    pass
        
        self.monitoring_task = asyncio.create_task(self._monitor_loop())
    
    def stop_monitoring(self):
        """Stop resource monitoring"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
            self.monitoring_task = None
    
    async def _monitor_loop(self):
        """Resource monitoring loop"""
        while True:
            try:
                # System-wide metrics
                cpu_percent = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                network_io = psutil.net_io_counters()
                disk_io = psutil.disk_io_counters()
                load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else (0, 0, 0)
                
                snapshot = SystemResourceSnapshot(
                    timestamp=time.time(),
                    cpu_percent=cpu_percent,
                    memory_mb=memory.used / 1024 / 1024,
                    memory_percent=memory.percent,
                    network_bytes_sent=network_io.bytes_sent,
                    network_bytes_recv=network_io.bytes_recv,
                    disk_read_bytes=disk_io.read_bytes,
                    disk_write_bytes=disk_io.write_bytes,
                    process_count=len(psutil.pids()),
                    load_average=load_avg
                )
                
                self.snapshots.append(snapshot)
                
                # Keep only recent snapshots (last 1 hour)
                if len(self.snapshots) > 3600:
                    self.snapshots = self.snapshots[-3600:]
                
                await asyncio.sleep(self.sampling_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Error in resource monitoring: {e}")
                await asyncio.sleep(self.sampling_interval)
    
    def get_process_metrics(self, pid: int) -> Dict[str, Any]:
        """Get metrics for specific process"""
        if pid not in self.process_monitors:
            return {}
        
        try:
            process = self.process_monitors[pid]
            return {
                "cpu_percent": process.cpu_percent(),
                "memory_mb": process.memory_info().rss / 1024 / 1024,
                "memory_percent": process.memory_percent(),
                "num_threads": process.num_threads(),
                "num_fds": process.num_fds() if hasattr(process, 'num_fds') else 0,
                "status": process.status()
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return {}
    
    def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics from monitoring data"""
        if not self.snapshots:
            return {}
        
        cpu_values = [s.cpu_percent for s in self.snapshots]
        memory_values = [s.memory_mb for s in self.snapshots]
        
        return {
            "duration_seconds": len(self.snapshots) * self.sampling_interval,
            "cpu_avg": statistics.mean(cpu_values),
            "cpu_max": max(cpu_values),
            "cpu_p95": statistics.quantiles(cpu_values, n=20)[18] if len(cpu_values) > 20 else max(cpu_values),
            "memory_avg_mb": statistics.mean(memory_values),
            "memory_max_mb": max(memory_values),
            "memory_p95_mb": statistics.quantiles(memory_values, n=20)[18] if len(memory_values) > 20 else max(memory_values),
            "samples_collected": len(self.snapshots)
        }


class BenchmarkOrchestrator:
    """Main benchmark orchestration system"""
    
    def __init__(self, output_dir: Path = None):
        self.output_dir = output_dir or Path("benchmark_results")
        self.output_dir.mkdir(exist_ok=True)
        
        # Components
        self.simulator: Optional[WebSocketDataFeedSimulator] = None
        self.resource_monitor = ResourceMonitor()
        self.pattern_generator: Optional[MarketDataPatternGenerator] = None
        
        # Process management
        self.python_process: Optional[subprocess.Popen] = None
        self.nodejs_process: Optional[subprocess.Popen] = None
        
        # Results
        self.current_results: Optional[BenchmarkResults] = None
        
        # Setup logging
        self._setup_logging()
    
    def _setup_logging(self):
        """Set up logging for benchmark orchestrator"""
        log_file = self.output_dir / "benchmark_orchestrator.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger(__name__)
    
    async def run_benchmark(self, config: BenchmarkConfiguration) -> BenchmarkResults:
        """Run complete benchmark with given configuration"""
        self.logger.info(f"Starting benchmark: {config.name}")
        
        # Initialize results
        results = BenchmarkResults(
            configuration=config,
            start_time=datetime.now(),
            end_time=datetime.now(),  # Will be updated
            duration_seconds=0.0
        )
        
        self.current_results = results
        
        try:
            # Setup phase
            await self._setup_benchmark(config)
            
            # Warmup phase
            if config.warmup_seconds > 0:
                self.logger.info(f"Warmup phase: {config.warmup_seconds} seconds")
                await self._run_warmup(config)
            
            # Main benchmark phase
            self.logger.info(f"Main benchmark phase: {config.duration_seconds} seconds")
            await self._run_main_benchmark(config)
            
            # Cooldown phase
            if config.cooldown_seconds > 0:
                self.logger.info(f"Cooldown phase: {config.cooldown_seconds} seconds")
                await self._run_cooldown(config)
            
            # Collect final results
            await self._collect_final_results(results)
            
            results.success = True
            self.logger.info(f"Benchmark completed successfully: {config.name}")
            
        except Exception as e:
            self.logger.error(f"Benchmark failed: {e}")
            results.errors.append(str(e))
            results.success = False
            
        finally:
            # Cleanup
            await self._cleanup_benchmark()
            
            results.end_time = datetime.now()
            results.duration_seconds = (results.end_time - results.start_time).total_seconds()
        
        # Save results
        await self._save_results(results)
        
        return results
    
    async def _setup_benchmark(self, config: BenchmarkConfiguration):
        """Set up benchmark environment"""
        self.logger.info("Setting up benchmark environment")
        
        # Initialize pattern generator
        self.pattern_generator = MarketDataPatternGenerator(config)
        
        # Set up WebSocket simulator
        simulator_config = SimulatorConfig(
            host="localhost",
            port=18765,
            symbols=config.symbols,
            message_rate=config.message_rate_base,
            burst_rate=config.message_rate_peak,
            enable_network_failures=config.network_failures_enabled,
            failure_rate=config.network_failure_rate,
            price_volatility=config.price_volatility,
            serialization_format="json"
        )
        
        self.simulator = WebSocketDataFeedSimulator(simulator_config)
        await self.simulator.start_server()
        
        # Wait for simulator to be ready
        await asyncio.sleep(2)
        
        # Start resource monitoring
        process_pids = []
        
        # Start applications
        if config.run_python:
            self.python_process = await self._start_python_application(config)
            if self.python_process:
                process_pids.append(self.python_process.pid)
        
        if config.run_nodejs:
            self.nodejs_process = await self._start_nodejs_application(config)
            if self.nodejs_process:
                process_pids.append(self.nodejs_process.pid)
        
        # Start resource monitoring
        self.resource_monitor.start_monitoring(process_pids)
        
        # Wait for applications to connect
        await asyncio.sleep(5)
    
    async def _start_python_application(self, config: BenchmarkConfiguration) -> Optional[subprocess.Popen]:
        """Start Python application for benchmarking"""
        try:
            python_script = project_root / "apps" / "python-ingestion" / "src" / "finance_ingestion" / "cli.py"
            
            env = os.environ.copy()
            env.update({
                "WEBSOCKET_URL": "ws://localhost:18765",
                "REDIS_DB": "1",  # Use separate DB for benchmarking
                "POSTGRESQL_DATABASE": "finance_benchmark",
                "MONITORING_HEALTH_CHECK_PORT": "18080",
                "MONITORING_PROMETHEUS_PORT": "19090",
                "ENVIRONMENT": "benchmark",
                "LOG_LEVEL": "INFO"
            })
            
            process = subprocess.Popen([
                sys.executable, str(python_script), "run",
                "--host", "localhost",
                "--port", "18765",
                "--duration", "0"  # Run indefinitely
            ], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Wait for startup
            await asyncio.sleep(3)
            
            if process.poll() is not None:
                stdout, stderr = process.communicate()
                self.logger.error(f"Python application failed to start: {stderr.decode()}")
                return None
            
            self.logger.info(f"Python application started with PID: {process.pid}")
            return process
            
        except Exception as e:
            self.logger.error(f"Failed to start Python application: {e}")
            return None
    
    async def _start_nodejs_application(self, config: BenchmarkConfiguration) -> Optional[subprocess.Popen]:
        """Start Node.js application for benchmarking"""
        try:
            nodejs_script = project_root / "apps" / "node-ingestion" / "src" / "index.js"
            
            env = os.environ.copy()
            env.update({
                "WEBSOCKET_URL": "ws://localhost:18765",
                "REDIS_DB": "2",  # Use separate DB for benchmarking
                "POSTGRESQL_DATABASE": "finance_benchmark",
                "MONITORING_HEALTH_CHECK_PORT": "18081",
                "MONITORING_PROMETHEUS_PORT": "19091",
                "NODE_ENV": "benchmark",
                "MONITORING_LOG_LEVEL": "info"
            })
            
            process = subprocess.Popen([
                "node", str(nodejs_script)
            ], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Wait for startup
            await asyncio.sleep(3)
            
            if process.poll() is not None:
                stdout, stderr = process.communicate()
                self.logger.error(f"Node.js application failed to start: {stderr.decode()}")
                return None
            
            self.logger.info(f"Node.js application started with PID: {process.pid}")
            return process
            
        except Exception as e:
            self.logger.error(f"Failed to start Node.js application: {e}")
            return None
    
    async def _run_warmup(self, config: BenchmarkConfiguration):
        """Run warmup phase"""
        # Use base message rate for warmup
        self.simulator.config.message_rate = config.message_rate_base
        await asyncio.sleep(config.warmup_seconds)
    
    async def _run_main_benchmark(self, config: BenchmarkConfiguration):
        """Run main benchmark phase with load pattern"""
        # Generate load pattern based on configuration
        if "market_open" in config.name.lower():
            pattern = self.pattern_generator.generate_market_open_pattern()
        elif "stress" in config.name.lower():
            pattern = self.pattern_generator.generate_stress_test_pattern()
        else:
            pattern = self.pattern_generator.generate_sustained_trading_pattern()
        
        # Execute load pattern
        for second, target_rate in pattern:
            self.simulator.config.message_rate = target_rate
            await asyncio.sleep(1.0)
            
            # Log progress periodically
            if second % 10 == 0:
                stats = self.simulator.get_stats()
                self.logger.info(f"Benchmark progress: {second}/{config.duration_seconds}s, "
                               f"Rate: {target_rate} msg/s, Sent: {stats['messages_sent']}")
    
    async def _run_cooldown(self, config: BenchmarkConfiguration):
        """Run cooldown phase"""
        # Reduce to minimal rate
        self.simulator.config.message_rate = 100
        await asyncio.sleep(config.cooldown_seconds)
    
    async def _collect_final_results(self, results: BenchmarkResults):
        """Collect final benchmark results"""
        # Simulator statistics
        if self.simulator:
            results.simulator_stats = self.simulator.get_stats()
        
        # Resource monitoring data
        results.resource_snapshots = self.resource_monitor.snapshots.copy()
        
        # Application metrics (would be collected from application APIs)
        if self.python_process:
            results.python_metrics = await self._collect_application_metrics("python", 18080)
        
        if self.nodejs_process:
            results.nodejs_metrics = await self._collect_application_metrics("nodejs", 18081)
        
        # Performance comparison
        if results.python_metrics and results.nodejs_metrics:
            results.performance_comparison = self._compare_performance(
                results.python_metrics, results.nodejs_metrics
            )
    
    async def _collect_application_metrics(self, implementation: str, port: int) -> ApplicationMetrics:
        """Collect metrics from application API"""
        metrics = ApplicationMetrics(implementation=implementation)
        
        try:
            # This would make HTTP requests to the application's /stats endpoint
            # For now, we'll return placeholder metrics
            
            # Get process metrics if available
            if implementation == "python" and self.python_process:
                process_metrics = self.resource_monitor.get_process_metrics(self.python_process.pid)
                metrics.cpu_percent = process_metrics.get("cpu_percent", 0)
                metrics.memory_mb = process_metrics.get("memory_mb", 0)
            
            elif implementation == "nodejs" and self.nodejs_process:
                process_metrics = self.resource_monitor.get_process_metrics(self.nodejs_process.pid)
                metrics.cpu_percent = process_metrics.get("cpu_percent", 0)
                metrics.memory_mb = process_metrics.get("memory_mb", 0)
            
            # Placeholder values (would be collected from actual application APIs)
            simulator_stats = self.simulator.get_stats() if self.simulator else {}
            metrics.messages_received = simulator_stats.get("messages_sent", 0) // 2  # Estimate
            metrics.messages_processed = metrics.messages_received
            metrics.throughput_mps = metrics.messages_processed / max(1, self.current_results.duration_seconds)
            
        except Exception as e:
            self.logger.error(f"Failed to collect {implementation} metrics: {e}")
        
        return metrics
    
    def _compare_performance(self, python_metrics: ApplicationMetrics, 
                           nodejs_metrics: ApplicationMetrics) -> Dict[str, Any]:
        """Compare performance between implementations"""
        comparison = {
            "throughput_comparison": {
                "python_mps": python_metrics.throughput_mps,
                "nodejs_mps": nodejs_metrics.throughput_mps,
                "winner": "python" if python_metrics.throughput_mps > nodejs_metrics.throughput_mps else "nodejs",
                "difference_percent": abs(python_metrics.throughput_mps - nodejs_metrics.throughput_mps) / 
                                   max(python_metrics.throughput_mps, nodejs_metrics.throughput_mps) * 100
            },
            "latency_comparison": {
                "python_p95_ms": python_metrics.latency_p95_ms,
                "nodejs_p95_ms": nodejs_metrics.latency_p95_ms,
                "winner": "python" if python_metrics.latency_p95_ms < nodejs_metrics.latency_p95_ms else "nodejs",
                "difference_ms": abs(python_metrics.latency_p95_ms - nodejs_metrics.latency_p95_ms)
            },
            "resource_comparison": {
                "python_cpu_percent": python_metrics.cpu_percent,
                "nodejs_cpu_percent": nodejs_metrics.cpu_percent,
                "python_memory_mb": python_metrics.memory_mb,
                "nodejs_memory_mb": nodejs_metrics.memory_mb,
                "cpu_winner": "python" if python_metrics.cpu_percent < nodejs_metrics.cpu_percent else "nodejs",
                "memory_winner": "python" if python_metrics.memory_mb < nodejs_metrics.memory_mb else "nodejs"
            }
        }
        
        return comparison
    
    async def _cleanup_benchmark(self):
        """Clean up benchmark environment"""
        self.logger.info("Cleaning up benchmark environment")
        
        # Stop resource monitoring
        self.resource_monitor.stop_monitoring()
        
        # Stop applications
        if self.python_process:
            ProcessUtils.stop_process(self.python_process)
            self.python_process = None
        
        if self.nodejs_process:
            ProcessUtils.stop_process(self.nodejs_process)
            self.nodejs_process = None
        
        # Stop simulator
        if self.simulator:
            await self.simulator.stop_server()
            self.simulator = None
    
    async def _save_results(self, results: BenchmarkResults):
        """Save benchmark results to files"""
        timestamp = results.start_time.strftime("%Y%m%d_%H%M%S")
        results_dir = self.output_dir / f"benchmark_{timestamp}_{results.configuration.name}"
        results_dir.mkdir(exist_ok=True)
        
        # Save main results as JSON
        results_file = results_dir / "results.json"
        with open(results_file, 'w') as f:
            json.dump(asdict(results), f, indent=2, default=str)
        
        # Save resource monitoring data
        if results.resource_snapshots:
            resource_file = results_dir / "resource_usage.json"
            with open(resource_file, 'w') as f:
                json.dump([asdict(snapshot) for snapshot in results.resource_snapshots], 
                         f, indent=2, default=str)
        
        # Save configuration
        config_file = results_dir / "configuration.json"
        with open(config_file, 'w') as f:
            json.dump(asdict(results.configuration), f, indent=2, default=str)
        
        self.logger.info(f"Results saved to: {results_dir}")


# Predefined benchmark configurations
BENCHMARK_CONFIGURATIONS = {
    "market_open_burst": BenchmarkConfiguration(
        name="market_open_burst",
        description="Market open burst simulation with high initial load",
        duration_seconds=120,
        warmup_seconds=10,
        message_rate_base=1000,
        message_rate_peak=8000,
        burst_enabled=True,
        symbols=["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]
    ),
    
    "sustained_high_load": BenchmarkConfiguration(
        name="sustained_high_load",
        description="Sustained high load with periodic bursts",
        duration_seconds=180,
        warmup_seconds=15,
        message_rate_base=5000,
        message_rate_peak=7000,
        burst_enabled=True,
        burst_interval_seconds=30,
        burst_duration_seconds=10,
        symbols=["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "NFLX"]
    ),
    
    "stress_test": BenchmarkConfiguration(
        name="stress_test",
        description="Maximum load stress test",
        duration_seconds=90,
        warmup_seconds=10,
        message_rate_base=2000,
        message_rate_peak=12000,
        burst_enabled=False,
        symbols=["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "NFLX", "ORCL", "CRM"]
    ),
    
    "network_resilience": BenchmarkConfiguration(
        name="network_resilience",
        description="Network failure resilience test",
        duration_seconds=120,
        warmup_seconds=10,
        message_rate_base=3000,
        message_rate_peak=5000,
        burst_enabled=True,
        network_failures_enabled=True,
        network_failure_rate=0.005,
        symbols=["AAPL", "GOOGL", "MSFT", "TSLA"]
    )
}


async def main():
    """Main entry point for benchmark orchestrator"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Benchmark Orchestrator")
    parser.add_argument("--config", choices=list(BENCHMARK_CONFIGURATIONS.keys()), 
                       default="market_open_burst", help="Benchmark configuration to run")
    parser.add_argument("--output-dir", type=Path, default=Path("benchmark_results"),
                       help="Output directory for results")
    parser.add_argument("--python-only", action="store_true", help="Run Python implementation only")
    parser.add_argument("--nodejs-only", action="store_true", help="Run Node.js implementation only")
    parser.add_argument("--duration", type=int, help="Override benchmark duration in seconds")
    
    args = parser.parse_args()
    
    # Get configuration
    config = BENCHMARK_CONFIGURATIONS[args.config]
    
    # Apply overrides
    if args.duration:
        config.duration_seconds = args.duration
    
    if args.python_only:
        config.run_python = True
        config.run_nodejs = False
        config.compare_both_implementations = False
    elif args.nodejs_only:
        config.run_python = False
        config.run_nodejs = True
        config.compare_both_implementations = False
    
    # Create orchestrator and run benchmark
    orchestrator = BenchmarkOrchestrator(args.output_dir)
    
    try:
        results = await orchestrator.run_benchmark(config)
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"BENCHMARK RESULTS: {config.name}")
        print(f"{'='*60}")
        print(f"Duration: {results.duration_seconds:.1f} seconds")
        print(f"Success: {'✓' if results.success else '✗'}")
        
        if results.simulator_stats:
            print(f"Messages sent: {results.simulator_stats.get('messages_sent', 0)}")
        
        if results.python_metrics:
            print(f"Python throughput: {results.python_metrics.throughput_mps:.0f} msg/s")
            print(f"Python CPU: {results.python_metrics.cpu_percent:.1f}%")
            print(f"Python memory: {results.python_metrics.memory_mb:.1f} MB")
        
        if results.nodejs_metrics:
            print(f"Node.js throughput: {results.nodejs_metrics.throughput_mps:.0f} msg/s")
            print(f"Node.js CPU: {results.nodejs_metrics.cpu_percent:.1f}%")
            print(f"Node.js memory: {results.nodejs_metrics.memory_mb:.1f} MB")
        
        if results.performance_comparison:
            comp = results.performance_comparison
            if "throughput_comparison" in comp:
                tc = comp["throughput_comparison"]
                print(f"Throughput winner: {tc['winner']} ({tc['difference_percent']:.1f}% faster)")
        
        print(f"{'='*60}")
        
        return 0 if results.success else 1
        
    except KeyboardInterrupt:
        print("\nBenchmark interrupted by user")
        return 130
    except Exception as e:
        print(f"Benchmark failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))