#!/usr/bin/env python3
"""
Performance Regression Test Runner

This module implements automated performance regression testing for the
Finance Ingestion Benchmark project. It runs standardized performance
tests and compares results against baseline metrics to detect regressions.
"""

import asyncio
import json
import logging
import os
import statistics
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import subprocess
import psutil
import aiohttp
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """Performance metrics collected during testing."""
    latency_p50: float
    latency_p95: float
    latency_p99: float
    latency_p999: float
    throughput_avg: float
    throughput_peak: float
    memory_avg_mb: float
    memory_peak_mb: float
    cpu_avg_percent: float
    cpu_peak_percent: float
    error_count: int
    total_messages: int
    test_duration: float
    timestamp: str

@dataclass
class RegressionResult:
    """Result of regression analysis."""
    test_name: str
    implementation: str
    passed: bool
    regressions: List[str]
    improvements: List[str]
    current_metrics: PerformanceMetrics
    baseline_metrics: Optional[PerformanceMetrics]
    comparison_summary: Dict[str, float]

class PerformanceRegressionRunner:
    """Main class for running performance regression tests."""
    
    def __init__(self, config_path: str = "tests/performance/regression_config.json"):
        """Initialize the regression runner with configuration."""
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.baseline_dir = Path("tests/performance/baselines")
        self.results_dir = Path("tests/performance/results")
        self.baseline_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
    def _load_config(self) -> Dict:
        """Load configuration from JSON file."""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {self.config_path}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in configuration file: {e}")
            raise
    
    async def run_all_regression_tests(self) -> List[RegressionResult]:
        """Run all configured regression tests."""
        logger.info("Starting performance regression test suite")
        results = []
        
        # Test both implementations
        implementations = ["python", "nodejs"]
        
        for impl in implementations:
            logger.info(f"Testing {impl} implementation")
            
            # Start the application
            process = await self._start_application(impl)
            
            try:
                # Wait for application to be ready
                await self._wait_for_application_ready(impl)
                
                # Run each test scenario
                for scenario in self.config["test_scenarios"]:
                    logger.info(f"Running scenario: {scenario['name']} for {impl}")
                    
                    result = await self._run_single_test(impl, scenario)
                    results.append(result)
                    
                    # Brief pause between tests
                    await asyncio.sleep(5)
                    
            finally:
                # Clean shutdown
                await self._stop_application(process)
                await asyncio.sleep(2)
        
        # Generate regression report
        await self._generate_regression_report(results)
        
        return results
    
    async def _start_application(self, implementation: str) -> subprocess.Popen:
        """Start the specified application implementation."""
        if implementation == "python":
            cmd = ["python", "-m", "finance_ingestion.main"]
            cwd = "apps/python-ingestion"
            env = os.environ.copy()
            env.update({
                "PORT": "3001",
                "LOG_LEVEL": "WARNING",  # Reduce log noise during testing
                "ENABLE_METRICS": "true"
            })
        else:  # nodejs
            cmd = ["node", "src/index.js"]
            cwd = "apps/node-ingestion"
            env = os.environ.copy()
            env.update({
                "PORT": "3002",
                "LOG_LEVEL": "warn",
                "NODE_ENV": "test"
            })
        
        logger.info(f"Starting {implementation} application: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        return process
    
    async def _wait_for_application_ready(self, implementation: str) -> None:
        """Wait for application to be ready to accept requests."""
        port = 3001 if implementation == "python" else 3002
        url = f"http://localhost:{port}/health"
        
        max_attempts = 30
        for attempt in range(max_attempts):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=2)) as response:
                        if response.status == 200:
                            logger.info(f"{implementation} application is ready")
                            return
            except Exception:
                pass
            
            await asyncio.sleep(1)
        
        raise RuntimeError(f"{implementation} application failed to start within {max_attempts} seconds")
    
    async def _stop_application(self, process: subprocess.Popen) -> None:
        """Gracefully stop the application process."""
        try:
            process.terminate()
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            logger.warning("Application did not terminate gracefully, killing process")
            process.kill()
            process.wait()
    
    async def _run_single_test(self, implementation: str, scenario: Dict) -> RegressionResult:
        """Run a single performance test scenario."""
        port = 3001 if implementation == "python" else 3002
        
        # Start performance monitoring
        monitor_task = asyncio.create_task(
            self._monitor_performance(port, scenario["duration_seconds"])
        )
        
        # Start load generation
        load_task = asyncio.create_task(
            self._generate_load(scenario)
        )
        
        # Wait for both tasks to complete
        performance_data, load_results = await asyncio.gather(monitor_task, load_task)
        
        # Calculate metrics
        current_metrics = self._calculate_metrics(performance_data, load_results, scenario)
        
        # Load baseline metrics
        baseline_metrics = self._load_baseline_metrics(implementation, scenario["name"])
        
        # Perform regression analysis
        result = self._analyze_regression(
            scenario["name"], 
            implementation, 
            current_metrics, 
            baseline_metrics
        )
        
        # Store current metrics as potential new baseline
        if self.config["reporting"]["store_baseline"]:
            self._store_baseline_metrics(implementation, scenario["name"], current_metrics)
        
        return result
    
    async def _monitor_performance(self, port: int, duration: int) -> Dict:
        """Monitor application performance during test execution."""
        metrics_url = f"http://localhost:{port}/stats"
        performance_data = {
            "latencies": [],
            "throughputs": [],
            "memory_usage": [],
            "cpu_usage": [],
            "timestamps": []
        }
        
        start_time = time.time()
        
        while time.time() - start_time < duration:
            try:
                # Get application metrics
                async with aiohttp.ClientSession() as session:
                    async with session.get(metrics_url, timeout=aiohttp.ClientTimeout(total=1)) as response:
                        if response.status == 200:
                            stats = await response.json()
                            
                            # Extract latency metrics
                            if "latency" in stats:
                                performance_data["latencies"].append(stats["latency"])
                            
                            # Extract throughput metrics
                            if "throughput" in stats:
                                performance_data["throughputs"].append(stats["throughput"]["current"])
                            
                            performance_data["timestamps"].append(time.time())
                
                # Get system resource usage
                try:
                    # Find the application process
                    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                        cmdline = proc.info.get('cmdline', [])
                        if any('finance_ingestion' in str(arg) or 'node' in str(arg) for arg in cmdline):
                            if proc.info['pid'] != os.getpid():  # Not this script
                                memory_mb = proc.memory_info().rss / 1024 / 1024
                                cpu_percent = proc.cpu_percent()
                                
                                performance_data["memory_usage"].append(memory_mb)
                                performance_data["cpu_usage"].append(cpu_percent)
                                break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                
            except Exception as e:
                logger.warning(f"Error collecting performance data: {e}")
            
            await asyncio.sleep(1)  # Sample every second
        
        return performance_data
    
    async def _generate_load(self, scenario: Dict) -> Dict:
        """Generate load according to the test scenario."""
        # Use the existing benchmark orchestrator
        cmd = [
            "python", "run_benchmarks.py",
            "--duration", str(scenario["duration_seconds"]),
            "--rate", str(scenario["message_rate"]),
            "--quiet"  # Reduce output noise
        ]
        
        if scenario.get("burst_enabled", False):
            cmd.extend([
                "--burst-rate", str(scenario.get("burst_rate", 10000)),
                "--burst-duration", str(scenario.get("burst_duration", 30)),
                "--burst-interval", str(scenario.get("burst_interval", 120))
            ])
        
        logger.info(f"Starting load generation: {' '.join(cmd)}")
        
        start_time = time.time()
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd="benchmarks",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        end_time = time.time()
        
        return {
            "duration": end_time - start_time,
            "return_code": process.returncode,
            "stdout": stdout.decode() if stdout else "",
            "stderr": stderr.decode() if stderr else ""
        }
    
    def _calculate_metrics(self, performance_data: Dict, load_results: Dict, scenario: Dict) -> PerformanceMetrics:
        """Calculate performance metrics from collected data."""
        # Calculate latency percentiles
        all_latencies = []
        for latency_sample in performance_data["latencies"]:
            if isinstance(latency_sample, dict):
                # Extract p99 as representative latency
                all_latencies.append(latency_sample.get("p99", 0))
        
        if all_latencies:
            latency_p50 = np.percentile(all_latencies, 50)
            latency_p95 = np.percentile(all_latencies, 95)
            latency_p99 = np.percentile(all_latencies, 99)
            latency_p999 = np.percentile(all_latencies, 99.9)
        else:
            latency_p50 = latency_p95 = latency_p99 = latency_p999 = 0
        
        # Calculate throughput metrics
        throughputs = performance_data["throughputs"]
        throughput_avg = statistics.mean(throughputs) if throughputs else 0
        throughput_peak = max(throughputs) if throughputs else 0
        
        # Calculate resource usage
        memory_usage = performance_data["memory_usage"]
        memory_avg_mb = statistics.mean(memory_usage) if memory_usage else 0
        memory_peak_mb = max(memory_usage) if memory_usage else 0
        
        cpu_usage = performance_data["cpu_usage"]
        cpu_avg_percent = statistics.mean(cpu_usage) if cpu_usage else 0
        cpu_peak_percent = max(cpu_usage) if cpu_usage else 0
        
        # Estimate total messages processed
        total_messages = int(scenario["message_rate"] * scenario["duration_seconds"])
        
        return PerformanceMetrics(
            latency_p50=latency_p50,
            latency_p95=latency_p95,
            latency_p99=latency_p99,
            latency_p999=latency_p999,
            throughput_avg=throughput_avg,
            throughput_peak=throughput_peak,
            memory_avg_mb=memory_avg_mb,
            memory_peak_mb=memory_peak_mb,
            cpu_avg_percent=cpu_avg_percent,
            cpu_peak_percent=cpu_peak_percent,
            error_count=1 if load_results["return_code"] != 0 else 0,
            total_messages=total_messages,
            test_duration=scenario["duration_seconds"],
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    
    def _load_baseline_metrics(self, implementation: str, test_name: str) -> Optional[PerformanceMetrics]:
        """Load baseline metrics for comparison."""
        baseline_file = self.baseline_dir / f"{implementation}_{test_name}_baseline.json"
        
        if not baseline_file.exists():
            logger.info(f"No baseline found for {implementation} {test_name}")
            return None
        
        try:
            with open(baseline_file, 'r') as f:
                data = json.load(f)
                return PerformanceMetrics(**data)
        except Exception as e:
            logger.error(f"Error loading baseline metrics: {e}")
            return None
    
    def _store_baseline_metrics(self, implementation: str, test_name: str, metrics: PerformanceMetrics) -> None:
        """Store current metrics as baseline for future comparisons."""
        baseline_file = self.baseline_dir / f"{implementation}_{test_name}_baseline.json"
        
        try:
            with open(baseline_file, 'w') as f:
                json.dump(asdict(metrics), f, indent=2)
            logger.info(f"Stored baseline metrics for {implementation} {test_name}")
        except Exception as e:
            logger.error(f"Error storing baseline metrics: {e}")
    
    def _analyze_regression(self, test_name: str, implementation: str, 
                          current: PerformanceMetrics, baseline: Optional[PerformanceMetrics]) -> RegressionResult:
        """Analyze current metrics against baseline to detect regressions."""
        regressions = []
        improvements = []
        comparison_summary = {}
        
        if baseline is None:
            # No baseline to compare against
            return RegressionResult(
                test_name=test_name,
                implementation=implementation,
                passed=True,
                regressions=[],
                improvements=[],
                current_metrics=current,
                baseline_metrics=None,
                comparison_summary={}
            )
        
        thresholds = self.config["regression_detection"]
        
        # Check latency regressions
        latency_metrics = [
            ("p50", current.latency_p50, baseline.latency_p50),
            ("p95", current.latency_p95, baseline.latency_p95),
            ("p99", current.latency_p99, baseline.latency_p99),
            ("p999", current.latency_p999, baseline.latency_p999)
        ]
        
        for metric_name, current_val, baseline_val in latency_metrics:
            if baseline_val > 0:
                change_percent = ((current_val - baseline_val) / baseline_val) * 100
                comparison_summary[f"latency_{metric_name}_change_percent"] = change_percent
                
                if change_percent > thresholds["latency_degradation_threshold_percent"]:
                    regressions.append(f"Latency {metric_name} increased by {change_percent:.1f}%")
                elif change_percent < -5:  # Improvement threshold
                    improvements.append(f"Latency {metric_name} improved by {abs(change_percent):.1f}%")
        
        # Check throughput regressions
        if baseline.throughput_avg > 0:
            throughput_change = ((current.throughput_avg - baseline.throughput_avg) / baseline.throughput_avg) * 100
            comparison_summary["throughput_change_percent"] = throughput_change
            
            if throughput_change < -thresholds["throughput_degradation_threshold_percent"]:
                regressions.append(f"Throughput decreased by {abs(throughput_change):.1f}%")
            elif throughput_change > 5:  # Improvement threshold
                improvements.append(f"Throughput improved by {throughput_change:.1f}%")
        
        # Check memory usage regressions
        if baseline.memory_avg_mb > 0:
            memory_change = ((current.memory_avg_mb - baseline.memory_avg_mb) / baseline.memory_avg_mb) * 100
            comparison_summary["memory_change_percent"] = memory_change
            
            if memory_change > thresholds["memory_increase_threshold_percent"]:
                regressions.append(f"Memory usage increased by {memory_change:.1f}%")
            elif memory_change < -5:  # Improvement threshold
                improvements.append(f"Memory usage improved by {abs(memory_change):.1f}%")
        
        # Check error rate
        current_error_rate = (current.error_count / current.total_messages) * 100 if current.total_messages > 0 else 0
        baseline_error_rate = (baseline.error_count / baseline.total_messages) * 100 if baseline.total_messages > 0 else 0
        
        if current_error_rate > baseline_error_rate + thresholds["error_rate_increase_threshold_percent"]:
            regressions.append(f"Error rate increased from {baseline_error_rate:.2f}% to {current_error_rate:.2f}%")
        
        passed = len(regressions) == 0
        
        return RegressionResult(
            test_name=test_name,
            implementation=implementation,
            passed=passed,
            regressions=regressions,
            improvements=improvements,
            current_metrics=current,
            baseline_metrics=baseline,
            comparison_summary=comparison_summary
        )
    
    async def _generate_regression_report(self, results: List[RegressionResult]) -> None:
        """Generate comprehensive regression test report."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        report_file = self.results_dir / f"regression_report_{timestamp}.json"
        
        # Prepare report data
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_tests": len(results),
                "passed_tests": sum(1 for r in results if r.passed),
                "failed_tests": sum(1 for r in results if not r.passed),
                "total_regressions": sum(len(r.regressions) for r in results),
                "total_improvements": sum(len(r.improvements) for r in results)
            },
            "results": [asdict(result) for result in results]
        }
        
        # Write report to file
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate human-readable summary
        summary_file = self.results_dir / f"regression_summary_{timestamp}.txt"
        with open(summary_file, 'w') as f:
            f.write("Performance Regression Test Report\n")
            f.write("=" * 40 + "\n\n")
            f.write(f"Test Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
            f.write(f"Total Tests: {report['summary']['total_tests']}\n")
            f.write(f"Passed: {report['summary']['passed_tests']}\n")
            f.write(f"Failed: {report['summary']['failed_tests']}\n")
            f.write(f"Total Regressions: {report['summary']['total_regressions']}\n")
            f.write(f"Total Improvements: {report['summary']['total_improvements']}\n\n")
            
            for result in results:
                f.write(f"Test: {result.test_name} ({result.implementation})\n")
                f.write(f"Status: {'PASS' if result.passed else 'FAIL'}\n")
                
                if result.regressions:
                    f.write("Regressions:\n")
                    for regression in result.regressions:
                        f.write(f"  - {regression}\n")
                
                if result.improvements:
                    f.write("Improvements:\n")
                    for improvement in result.improvements:
                        f.write(f"  + {improvement}\n")
                
                f.write("\n")
        
        logger.info(f"Regression report generated: {report_file}")
        logger.info(f"Summary report generated: {summary_file}")
        
        # Print summary to console
        print("\n" + "=" * 50)
        print("PERFORMANCE REGRESSION TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {report['summary']['total_tests']}")
        print(f"Passed: {report['summary']['passed_tests']}")
        print(f"Failed: {report['summary']['failed_tests']}")
        
        if report['summary']['failed_tests'] > 0:
            print("\nFAILED TESTS:")
            for result in results:
                if not result.passed:
                    print(f"  - {result.test_name} ({result.implementation})")
                    for regression in result.regressions:
                        print(f"    * {regression}")
        
        if report['summary']['total_improvements'] > 0:
            print("\nIMPROVEMENTS:")
            for result in results:
                for improvement in result.improvements:
                    print(f"  + {result.test_name} ({result.implementation}): {improvement}")

async def main():
    """Main entry point for regression testing."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Performance Regression Test Runner')
    parser.add_argument('--config', default='regression_config.json', 
                       help='Configuration file path')
    parser.add_argument('--baseline-dir', default='baselines',
                       help='Directory containing baseline metrics')
    parser.add_argument('--results-dir', default='results',
                       help='Directory to store test results')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    runner = PerformanceRegressionRunner(args.config)
    runner.baseline_dir = Path(args.baseline_dir)
    runner.results_dir = Path(args.results_dir)
    runner.baseline_dir.mkdir(parents=True, exist_ok=True)
    runner.results_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        results = await runner.run_all_regression_tests()
        
        # Exit with error code if any tests failed
        failed_tests = sum(1 for r in results if not r.passed)
        if failed_tests > 0:
            logger.error(f"Regression tests failed: {failed_tests} test(s) detected performance regressions")
            exit(1)
        else:
            logger.info("All regression tests passed successfully")
            exit(0)
            
    except Exception as e:
        logger.error(f"Regression testing failed with error: {e}")
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())