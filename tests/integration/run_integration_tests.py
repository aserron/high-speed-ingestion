#!/usr/bin/env python3
"""
Integration Test Runner

Comprehensive test runner for financial data ingestion integration tests.
Provides options for running different test suites, generating reports,
and managing test environments.
"""

import asyncio
import argparse
import sys
import os
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
import subprocess

# Add project paths
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "tests" / "integration"))

from test_config import get_test_config, set_test_config, IntegrationTestConfig
from test_utils import NetworkUtils, DatabaseUtils, TestReportUtils
from test_end_to_end import IntegrationTestFramework
from test_network_failures import run_network_failure_tests
from test_load_scenarios import run_load_tests


class IntegrationTestSuite:
    """Main integration test suite runner"""
    
    def __init__(self, config: IntegrationTestConfig):
        self.config = config
        self.test_results = []
        self.start_time = None
        self.end_time = None
        
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all integration test suites"""
        print("Starting comprehensive integration test suite...")
        self.start_time = time.time()
        
        try:
            # Pre-flight checks
            await self._run_preflight_checks()
            
            # Run test suites
            if self.config.simulator_enabled:
                await self._run_simulator_tests()
            
            if self.config.python_app_enabled:
                await self._run_python_app_tests()
            
            if self.config.node_app_enabled:
                await self._run_node_app_tests()
            
            # Run specialized test suites
            await self._run_network_failure_tests()
            await self._run_load_tests()
            await self._run_end_to_end_tests()
            
        except Exception as e:
            print(f"Test suite execution failed: {e}")
            self.test_results.append({
                "suite": "execution_error",
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            })
        
        finally:
            self.end_time = time.time()
        
        # Generate final report
        return self._generate_final_report()
    
    async def _run_preflight_checks(self):
        """Run pre-flight checks before starting tests"""
        print("Running pre-flight checks...")
        
        checks = []
        
        # Check network ports availability
        if not NetworkUtils.is_port_available(
            self.config.network.simulator_host, 
            self.config.network.simulator_port
        ):
            print(f"Warning: Simulator port {self.config.network.simulator_port} is not available")
        
        # Check database connectivity
        redis_result = await DatabaseUtils.test_redis_connection(
            self.config.database.redis_host,
            self.config.database.redis_port,
            self.config.database.redis_test_db
        )
        checks.append(("Redis", redis_result))
        
        postgres_result = await DatabaseUtils.test_postgres_connection(
            self.config.database.postgres_host,
            self.config.database.postgres_port,
            self.config.database.postgres_database,
            self.config.database.postgres_username,
            self.config.database.postgres_password
        )
        checks.append(("PostgreSQL", postgres_result))
        
        # Report check results
        for name, result in checks:
            status = "✓" if result.passed else "✗"
            print(f"  {status} {name}: {result.message}")
            
            if not result.passed and name == "Redis":
                print("    Warning: Redis tests may fail")
            elif not result.passed and name == "PostgreSQL":
                print("    Warning: PostgreSQL tests may fail")
    
    async def _run_simulator_tests(self):
        """Run WebSocket simulator tests"""
        print("Running WebSocket simulator tests...")
        
        try:
            # Basic simulator functionality test
            from websocket_simulator import WebSocketDataFeedSimulator, SimulatorConfig
            
            config = SimulatorConfig(
                host=self.config.network.simulator_host,
                port=self.config.network.simulator_port + 1,  # Use different port
                symbols=["TEST"],
                message_rate=100,
                enable_network_failures=False
            )
            
            simulator = WebSocketDataFeedSimulator(config)
            await simulator.start_server()
            
            # Let it run briefly
            await asyncio.sleep(2)
            
            stats = simulator.get_stats()
            await simulator.stop_server()
            
            success = stats["messages_sent"] > 0
            
            self.test_results.append({
                "suite": "simulator_basic",
                "success": success,
                "details": stats,
                "timestamp": time.time()
            })
            
            print(f"  Simulator basic test: {'PASS' if success else 'FAIL'}")
            
        except Exception as e:
            print(f"  Simulator test failed: {e}")
            self.test_results.append({
                "suite": "simulator_basic",
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            })
    
    async def _run_python_app_tests(self):
        """Run Python application tests"""
        print("Running Python application tests...")
        
        # This would involve starting the Python application and testing it
        # For now, we'll just check if the application can be imported
        try:
            sys.path.insert(0, str(project_root / "apps" / "python-ingestion" / "src"))
            
            from finance_ingestion.config import get_config
            from finance_ingestion.cli import main
            
            # Test configuration loading
            config = get_config()
            
            success = config is not None
            
            self.test_results.append({
                "suite": "python_app_basic",
                "success": success,
                "details": {"config_loaded": success},
                "timestamp": time.time()
            })
            
            print(f"  Python app basic test: {'PASS' if success else 'FAIL'}")
            
        except Exception as e:
            print(f"  Python app test failed: {e}")
            self.test_results.append({
                "suite": "python_app_basic",
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            })
    
    async def _run_node_app_tests(self):
        """Run Node.js application tests"""
        print("Running Node.js application tests...")
        
        # Check if Node.js application files exist
        try:
            node_app_path = project_root / "apps" / "node-ingestion" / "src" / "index.js"
            
            success = node_app_path.exists()
            
            self.test_results.append({
                "suite": "node_app_basic",
                "success": success,
                "details": {"app_file_exists": success},
                "timestamp": time.time()
            })
            
            print(f"  Node.js app basic test: {'PASS' if success else 'FAIL'}")
            
        except Exception as e:
            print(f"  Node.js app test failed: {e}")
            self.test_results.append({
                "suite": "node_app_basic",
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            })
    
    async def _run_network_failure_tests(self):
        """Run network failure tests"""
        print("Running network failure tests...")
        
        try:
            # Run a subset of network failure tests
            await run_network_failure_tests()
            
            self.test_results.append({
                "suite": "network_failures",
                "success": True,
                "details": {"completed": True},
                "timestamp": time.time()
            })
            
            print("  Network failure tests: PASS")
            
        except Exception as e:
            print(f"  Network failure tests failed: {e}")
            self.test_results.append({
                "suite": "network_failures",
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            })
    
    async def _run_load_tests(self):
        """Run load tests"""
        print("Running load tests...")
        
        try:
            # Run a subset of load tests
            await run_load_tests()
            
            self.test_results.append({
                "suite": "load_tests",
                "success": True,
                "details": {"completed": True},
                "timestamp": time.time()
            })
            
            print("  Load tests: PASS")
            
        except Exception as e:
            print(f"  Load tests failed: {e}")
            self.test_results.append({
                "suite": "load_tests",
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            })
    
    async def _run_end_to_end_tests(self):
        """Run end-to-end tests"""
        print("Running end-to-end tests...")
        
        try:
            # Run basic end-to-end test
            framework = IntegrationTestFramework()
            await framework.setup()
            
            try:
                # Run a simple test scenario
                results = await framework.run_test_scenario(
                    test_name="basic_e2e",
                    duration_seconds=10,
                    message_rate=500,
                    enable_failures=False
                )
                
                success = results.success and results.messages_sent > 0
                
                self.test_results.append({
                    "suite": "end_to_end",
                    "success": success,
                    "details": {
                        "messages_sent": results.messages_sent,
                        "messages_stored": results.messages_stored,
                        "throughput": results.throughput_stats["messages_per_second"]
                    },
                    "timestamp": time.time()
                })
                
                print(f"  End-to-end tests: {'PASS' if success else 'FAIL'}")
                
            finally:
                await framework.teardown()
            
        except Exception as e:
            print(f"  End-to-end tests failed: {e}")
            self.test_results.append({
                "suite": "end_to_end",
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            })
    
    def _generate_final_report(self) -> Dict[str, Any]:
        """Generate final test report"""
        duration = self.end_time - self.start_time if self.end_time and self.start_time else 0
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        report = {
            "summary": {
                "total_suites": total_tests,
                "passed_suites": passed_tests,
                "failed_suites": failed_tests,
                "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                "duration_seconds": duration,
                "timestamp": time.time()
            },
            "suite_results": self.test_results,
            "configuration": {
                "simulator_enabled": self.config.simulator_enabled,
                "python_app_enabled": self.config.python_app_enabled,
                "node_app_enabled": self.config.node_app_enabled,
                "cleanup_after_tests": self.config.cleanup_after_tests
            }
        }
        
        return report


def run_pytest_suite(test_pattern: str = "test_*.py", markers: Optional[str] = None,
                    verbose: bool = True) -> int:
    """Run pytest test suite"""
    cmd = ["python", "-m", "pytest"]
    
    if verbose:
        cmd.append("-v")
    
    if markers:
        cmd.extend(["-m", markers])
    
    cmd.append(test_pattern)
    
    print(f"Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, cwd=Path(__file__).parent, capture_output=False)
        return result.returncode
    except Exception as e:
        print(f"Failed to run pytest: {e}")
        return 1


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Integration Test Runner")
    
    parser.add_argument(
        "--suite",
        choices=["all", "basic", "network", "load", "e2e", "pytest"],
        default="basic",
        help="Test suite to run"
    )
    
    parser.add_argument(
        "--config-file",
        type=Path,
        help="Path to test configuration file"
    )
    
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("test_results"),
        help="Output directory for test results"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    parser.add_argument(
        "--no-cleanup",
        action="store_true",
        help="Skip cleanup after tests"
    )
    
    parser.add_argument(
        "--markers",
        type=str,
        help="Pytest markers to filter tests (e.g., 'not slow')"
    )
    
    args = parser.parse_args()
    
    # Load configuration
    if args.config_file and args.config_file.exists():
        # Load custom configuration (would need implementation)
        config = get_test_config()
    else:
        config = get_test_config()
    
    # Override configuration with command line options
    if args.no_cleanup:
        config.cleanup_after_tests = False
    
    if args.verbose:
        config.verbose_logging = True
    
    # Create output directory
    args.output_dir.mkdir(exist_ok=True)
    
    # Run selected test suite
    if args.suite == "pytest":
        # Run pytest-based tests
        exit_code = run_pytest_suite(markers=args.markers, verbose=args.verbose)
        sys.exit(exit_code)
    
    elif args.suite == "all":
        # Run comprehensive test suite
        suite = IntegrationTestSuite(config)
        report = await suite.run_all_tests()
        
        # Save report
        report_file = args.output_dir / f"integration_test_report_{int(time.time())}.json"
        TestReportUtils.save_test_report(report, report_file)
        
        # Print summary
        TestReportUtils.print_test_summary(report["summary"])
        
        print(f"\nDetailed report saved to: {report_file}")
        
        # Exit with appropriate code
        sys.exit(0 if report["summary"]["failed_suites"] == 0 else 1)
    
    elif args.suite == "basic":
        # Run basic functionality tests
        suite = IntegrationTestSuite(config)
        
        print("Running basic integration tests...")
        await suite._run_preflight_checks()
        await suite._run_simulator_tests()
        
        report = suite._generate_final_report()
        
        # Print results
        for result in suite.test_results:
            status = "✓" if result["success"] else "✗"
            print(f"{status} {result['suite']}")
        
        sys.exit(0 if all(r["success"] for r in suite.test_results) else 1)
    
    elif args.suite == "network":
        # Run network failure tests
        print("Running network failure tests...")
        try:
            await run_network_failure_tests()
            print("Network failure tests completed successfully")
            sys.exit(0)
        except Exception as e:
            print(f"Network failure tests failed: {e}")
            sys.exit(1)
    
    elif args.suite == "load":
        # Run load tests
        print("Running load tests...")
        try:
            await run_load_tests()
            print("Load tests completed successfully")
            sys.exit(0)
        except Exception as e:
            print(f"Load tests failed: {e}")
            sys.exit(1)
    
    elif args.suite == "e2e":
        # Run end-to-end tests
        print("Running end-to-end tests...")
        try:
            framework = IntegrationTestFramework()
            await framework.setup()
            
            try:
                results = await framework.run_test_scenario(
                    "e2e_basic", 15, 1000, False
                )
                
                print(f"E2E test result: {'PASS' if results.success else 'FAIL'}")
                print(f"Messages processed: {results.messages_sent}")
                
                sys.exit(0 if results.success else 1)
                
            finally:
                await framework.teardown()
                
        except Exception as e:
            print(f"End-to-end tests failed: {e}")
            sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nTest execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"Test runner failed: {e}")
        sys.exit(1)