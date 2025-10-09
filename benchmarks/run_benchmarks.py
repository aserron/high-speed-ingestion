#!/usr/bin/env python3
"""
Benchmark Runner

Convenient entry point for running financial data ingestion benchmarks.
Provides simplified interface for common benchmark scenarios.
"""

import asyncio
import sys
import argparse
from pathlib import Path
from typing import List, Optional

# Add project paths
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from benchmarks.orchestrator import (
    run_single_benchmark,
    run_benchmark_suite,
    generate_benchmark_summary,
    print_benchmark_summary,
    BENCHMARK_CONFIGURATIONS
)


def print_available_benchmarks():
    """Print available benchmark configurations"""
    print("Available benchmark configurations:")
    print("=" * 50)
    
    for name, config in BENCHMARK_CONFIGURATIONS.items():
        print(f"\n{name}:")
        print(f"  Description: {config.description}")
        print(f"  Duration: {config.duration_seconds}s")
        print(f"  Message rate: {config.message_rate_base}-{config.message_rate_peak} msg/s")
        print(f"  Symbols: {', '.join(config.symbols[:3])}{'...' if len(config.symbols) > 3 else ''}")
        print(f"  Burst enabled: {config.burst_enabled}")
        print(f"  Network failures: {config.network_failures_enabled}")


async def run_quick_comparison():
    """Run a quick comparison between Python and Node.js"""
    print("Running quick comparison benchmark...")
    
    config_name = "comparison_baseline"
    result = await run_single_benchmark(config_name)
    
    if result.success:
        print(f"\n{'='*60}")
        print("QUICK COMPARISON RESULTS")
        print(f"{'='*60}")
        
        if result.python_metrics and result.nodejs_metrics:
            py = result.python_metrics
            js = result.nodejs_metrics
            
            print(f"Python Implementation:")
            print(f"  Throughput: {py.throughput_mps:.0f} messages/second")
            print(f"  Latency P95: {py.latency_p95_ms:.2f} ms")
            print(f"  CPU Usage: {py.cpu_percent:.1f}%")
            print(f"  Memory Usage: {py.memory_mb:.1f} MB")
            print(f"  Errors: {py.error_count}")
            
            print(f"\nNode.js Implementation:")
            print(f"  Throughput: {js.throughput_mps:.0f} messages/second")
            print(f"  Latency P95: {js.latency_p95_ms:.2f} ms")
            print(f"  CPU Usage: {js.cpu_percent:.1f}%")
            print(f"  Memory Usage: {js.memory_mb:.1f} MB")
            print(f"  Errors: {js.error_count}")
            
            if result.performance_comparison:
                comp = result.performance_comparison
                throughput_winner = comp["throughput_comparison"]["winner"]
                throughput_diff = comp["throughput_comparison"]["difference_percent"]
                
                latency_winner = comp["latency_comparison"]["winner"]
                latency_diff = comp["latency_comparison"]["difference_ms"]
                
                print(f"\nComparison Summary:")
                print(f"  Throughput winner: {throughput_winner} (+{throughput_diff:.1f}%)")
                print(f"  Latency winner: {latency_winner} (-{latency_diff:.2f} ms)")
                print(f"  CPU winner: {comp['resource_comparison']['cpu_winner']}")
                print(f"  Memory winner: {comp['resource_comparison']['memory_winner']}")
        else:
            print("Warning: Could not collect metrics from both implementations")
    else:
        print(f"Benchmark failed: {', '.join(result.errors)}")
        return False
    
    return True


async def run_stress_test():
    """Run stress test benchmark"""
    print("Running stress test benchmark...")
    
    config_name = "stress_test"
    result = await run_single_benchmark(config_name)
    
    if result.success:
        print(f"\n{'='*60}")
        print("STRESS TEST RESULTS")
        print(f"{'='*60}")
        
        print(f"Test Duration: {result.duration_seconds:.1f} seconds")
        print(f"Simulator sent: {result.simulator_stats.get('messages_sent', 0)} messages")
        
        if result.python_metrics:
            py = result.python_metrics
            print(f"\nPython under stress:")
            print(f"  Peak throughput: {py.throughput_mps:.0f} msg/s")
            print(f"  Peak CPU: {py.cpu_percent:.1f}%")
            print(f"  Peak memory: {py.memory_peak_mb:.1f} MB")
            print(f"  Error rate: {py.error_rate_percent:.2f}%")
        
        if result.nodejs_metrics:
            js = result.nodejs_metrics
            print(f"\nNode.js under stress:")
            print(f"  Peak throughput: {js.throughput_mps:.0f} msg/s")
            print(f"  Peak CPU: {js.cpu_percent:.1f}%")
            print(f"  Peak memory: {js.memory_peak_mb:.1f} MB")
            print(f"  Error rate: {js.error_rate_percent:.2f}%")
        
        # Resource usage summary
        if result.resource_snapshots:
            cpu_values = [s.cpu_percent for s in result.resource_snapshots]
            memory_values = [s.memory_mb for s in result.resource_snapshots]
            
            print(f"\nSystem Resource Usage:")
            print(f"  Average CPU: {sum(cpu_values)/len(cpu_values):.1f}%")
            print(f"  Peak CPU: {max(cpu_values):.1f}%")
            print(f"  Average Memory: {sum(memory_values)/len(memory_values):.1f} MB")
            print(f"  Peak Memory: {max(memory_values):.1f} MB")
    else:
        print(f"Stress test failed: {', '.join(result.errors)}")
        return False
    
    return True


async def run_market_simulation():
    """Run market open simulation"""
    print("Running market open simulation...")
    
    config_name = "market_open_burst"
    result = await run_single_benchmark(config_name)
    
    if result.success:
        print(f"\n{'='*60}")
        print("MARKET OPEN SIMULATION RESULTS")
        print(f"{'='*60}")
        
        print(f"Simulation Duration: {result.duration_seconds:.1f} seconds")
        print(f"Market data patterns: Burst at open, then sustained trading")
        
        if result.python_metrics and result.nodejs_metrics:
            py = result.python_metrics
            js = result.nodejs_metrics
            
            print(f"\nMarket Open Performance:")
            print(f"  Python handled: {py.messages_processed} messages")
            print(f"  Node.js handled: {js.messages_processed} messages")
            print(f"  Python avg throughput: {py.throughput_mps:.0f} msg/s")
            print(f"  Node.js avg throughput: {js.throughput_mps:.0f} msg/s")
            
            if result.performance_comparison:
                winner = result.performance_comparison["throughput_comparison"]["winner"]
                diff = result.performance_comparison["throughput_comparison"]["difference_percent"]
                print(f"  Better performer: {winner} (+{diff:.1f}%)")
    else:
        print(f"Market simulation failed: {', '.join(result.errors)}")
        return False
    
    return True


async def run_comprehensive_suite():
    """Run comprehensive benchmark suite"""
    print("Running comprehensive benchmark suite...")
    print("This will take several minutes to complete.")
    
    # Run all benchmarks except the longest ones
    benchmark_names = [
        "comparison_baseline",
        "market_open_burst", 
        "sustained_high_load",
        "stress_test",
        "network_resilience"
    ]
    
    results = await run_benchmark_suite(benchmark_names)
    
    # Generate comprehensive summary
    summary = generate_benchmark_summary(results)
    print_benchmark_summary(summary)
    
    return all(r.success for r in results)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Financial Data Ingestion Benchmark Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_benchmarks.py --quick          # Quick comparison
  python run_benchmarks.py --stress         # Stress test
  python run_benchmarks.py --market         # Market simulation
  python run_benchmarks.py --comprehensive  # Full suite
  python run_benchmarks.py --list           # List configurations
  python run_benchmarks.py --custom stress_test  # Run specific config
        """
    )
    
    # Predefined benchmark modes
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Run quick comparison benchmark (1 minute)"
    )
    
    parser.add_argument(
        "--stress",
        action="store_true", 
        help="Run stress test benchmark"
    )
    
    parser.add_argument(
        "--market",
        action="store_true",
        help="Run market open simulation"
    )
    
    parser.add_argument(
        "--comprehensive",
        action="store_true",
        help="Run comprehensive benchmark suite"
    )
    
    # Custom benchmark
    parser.add_argument(
        "--custom",
        choices=list(BENCHMARK_CONFIGURATIONS.keys()),
        help="Run specific benchmark configuration"
    )
    
    # Utility options
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available benchmark configurations"
    )
    
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("benchmark_results"),
        help="Output directory for results"
    )
    
    args = parser.parse_args()
    
    # Handle list option
    if args.list:
        print_available_benchmarks()
        return 0
    
    # Ensure output directory exists
    args.output_dir.mkdir(exist_ok=True)
    
    # Determine which benchmark to run
    async def run_selected_benchmark():
        if args.quick:
            return await run_quick_comparison()
        elif args.stress:
            return await run_stress_test()
        elif args.market:
            return await run_market_simulation()
        elif args.comprehensive:
            return await run_comprehensive_suite()
        elif args.custom:
            result = await run_single_benchmark(args.custom, args.output_dir)
            return result.success
        else:
            # Default to quick comparison
            print("No specific benchmark selected, running quick comparison...")
            return await run_quick_comparison()
    
    # Run the selected benchmark
    try:
        success = asyncio.run(run_selected_benchmark())
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\nBenchmark interrupted by user")
        return 130
    except Exception as e:
        print(f"Benchmark runner failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())