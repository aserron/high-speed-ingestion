"""
Benchmark Utilities

Utility functions and helpers for the benchmark orchestration system.
"""

import asyncio
import json
import time
import statistics
import subprocess
import psutil
import aiohttp
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import asdict


async def wait_for_application_ready(host: str, port: int, timeout: float = 30.0) -> bool:
    """Wait for application to be ready by checking health endpoint"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=2.0)) as session:
                async with session.get(f"http://{host}:{port}/health") as response:
                    if response.status == 200:
                        return True
        except Exception:
            pass
        
        await asyncio.sleep(1.0)
    
    return False


async def collect_application_metrics(host: str, port: int) -> Dict[str, Any]:
    """Collect metrics from application API"""
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5.0)) as session:
            async with session.get(f"http://{host}:{port}/stats") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"HTTP {response.status}"}
    except Exception as e:
        return {"error": str(e)}


def calculate_percentiles(values: List[float], percentiles: List[float] = None) -> Dict[str, float]:
    """Calculate percentiles for a list of values"""
    if not values:
        return {}
    
    if percentiles is None:
        percentiles = [50, 95, 99, 99.9]
    
    sorted_values = sorted(values)
    result = {}
    
    for p in percentiles:
        if p == 50:
            result["p50"] = statistics.median(sorted_values)
        else:
            # Calculate percentile index
            index = (p / 100) * (len(sorted_values) - 1)
            lower_index = int(index)
            upper_index = min(lower_index + 1, len(sorted_values) - 1)
            
            if lower_index == upper_index:
                value = sorted_values[lower_index]
            else:
                # Linear interpolation
                weight = index - lower_index
                value = sorted_values[lower_index] * (1 - weight) + sorted_values[upper_index] * weight
            
            result[f"p{p}".replace(".", "_")] = value
    
    return result


def calculate_throughput_stats(message_counts: List[Tuple[float, int]], 
                             window_seconds: float = 1.0) -> Dict[str, float]:
    """Calculate throughput statistics from message count data"""
    if len(message_counts) < 2:
        return {"avg_mps": 0.0, "peak_mps": 0.0, "min_mps": 0.0}
    
    # Calculate throughput for each time window
    throughputs = []
    
    for i in range(1, len(message_counts)):
        prev_time, prev_count = message_counts[i-1]
        curr_time, curr_count = message_counts[i]
        
        time_diff = curr_time - prev_time
        message_diff = curr_count - prev_count
        
        if time_diff > 0:
            throughput = message_diff / time_diff
            throughputs.append(throughput)
    
    if not throughputs:
        return {"avg_mps": 0.0, "peak_mps": 0.0, "min_mps": 0.0}
    
    return {
        "avg_mps": statistics.mean(throughputs),
        "peak_mps": max(throughputs),
        "min_mps": min(throughputs),
        "median_mps": statistics.median(throughputs)
    }


def analyze_resource_usage(snapshots: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze resource usage from monitoring snapshots"""
    if not snapshots:
        return {}
    
    # Extract time series data
    timestamps = [s["timestamp"] for s in snapshots]
    cpu_values = [s["cpu_percent"] for s in snapshots]
    memory_values = [s["memory_mb"] for s in snapshots]
    
    # Calculate statistics
    duration = max(timestamps) - min(timestamps) if len(timestamps) > 1 else 0
    
    analysis = {
        "duration_seconds": duration,
        "sample_count": len(snapshots),
        "cpu_stats": {
            "avg": statistics.mean(cpu_values),
            "max": max(cpu_values),
            "min": min(cpu_values),
            "median": statistics.median(cpu_values),
            **calculate_percentiles(cpu_values)
        },
        "memory_stats": {
            "avg_mb": statistics.mean(memory_values),
            "max_mb": max(memory_values),
            "min_mb": min(memory_values),
            "median_mb": statistics.median(memory_values),
            "growth_mb": max(memory_values) - min(memory_values),
            **{f"{k}_mb": v for k, v in calculate_percentiles(memory_values).items()}
        }
    }
    
    # Detect resource spikes
    cpu_threshold = statistics.mean(cpu_values) + 2 * statistics.stdev(cpu_values) if len(cpu_values) > 1 else 100
    memory_threshold = statistics.mean(memory_values) + 2 * statistics.stdev(memory_values) if len(memory_values) > 1 else float('inf')
    
    cpu_spikes = [i for i, cpu in enumerate(cpu_values) if cpu > cpu_threshold]
    memory_spikes = [i for i, mem in enumerate(memory_values) if mem > memory_threshold]
    
    analysis["anomalies"] = {
        "cpu_spikes": len(cpu_spikes),
        "memory_spikes": len(memory_spikes),
        "cpu_spike_timestamps": [timestamps[i] for i in cpu_spikes[:10]],  # First 10
        "memory_spike_timestamps": [timestamps[i] for i in memory_spikes[:10]]
    }
    
    return analysis


def detect_performance_degradation(metrics_history: List[Dict[str, Any]], 
                                 window_size: int = 10,
                                 degradation_threshold: float = 0.2) -> List[Dict[str, Any]]:
    """Detect performance degradation events"""
    if len(metrics_history) < window_size * 2:
        return []
    
    degradation_events = []
    
    # Analyze throughput degradation
    throughput_values = [m.get("throughput_mps", 0) for m in metrics_history]
    
    for i in range(window_size, len(throughput_values) - window_size):
        # Compare current window with previous window
        prev_window = throughput_values[i-window_size:i]
        curr_window = throughput_values[i:i+window_size]
        
        prev_avg = statistics.mean(prev_window)
        curr_avg = statistics.mean(curr_window)
        
        if prev_avg > 0:
            degradation = (prev_avg - curr_avg) / prev_avg
            
            if degradation > degradation_threshold:
                degradation_events.append({
                    "type": "throughput_degradation",
                    "timestamp": metrics_history[i].get("timestamp", time.time()),
                    "previous_avg": prev_avg,
                    "current_avg": curr_avg,
                    "degradation_percent": degradation * 100,
                    "severity": "high" if degradation > 0.5 else "medium" if degradation > 0.3 else "low"
                })
    
    return degradation_events


def compare_benchmark_results(results_a: Dict[str, Any], results_b: Dict[str, Any], 
                            label_a: str = "A", label_b: str = "B") -> Dict[str, Any]:
    """Compare two benchmark results"""
    comparison = {
        "labels": {"a": label_a, "b": label_b},
        "metrics": {}
    }
    
    # Compare throughput
    throughput_a = results_a.get("throughput_mps", 0)
    throughput_b = results_b.get("throughput_mps", 0)
    
    if throughput_a > 0 and throughput_b > 0:
        comparison["metrics"]["throughput"] = {
            f"{label_a}_mps": throughput_a,
            f"{label_b}_mps": throughput_b,
            "winner": label_a if throughput_a > throughput_b else label_b,
            "difference_percent": abs(throughput_a - throughput_b) / max(throughput_a, throughput_b) * 100,
            "ratio": throughput_a / throughput_b if throughput_b > 0 else float('inf')
        }
    
    # Compare latency
    latency_a = results_a.get("latency_p95_ms", 0)
    latency_b = results_b.get("latency_p95_ms", 0)
    
    if latency_a > 0 and latency_b > 0:
        comparison["metrics"]["latency"] = {
            f"{label_a}_p95_ms": latency_a,
            f"{label_b}_p95_ms": latency_b,
            "winner": label_a if latency_a < latency_b else label_b,
            "difference_ms": abs(latency_a - latency_b),
            "difference_percent": abs(latency_a - latency_b) / max(latency_a, latency_b) * 100
        }
    
    # Compare resource usage
    cpu_a = results_a.get("cpu_percent", 0)
    cpu_b = results_b.get("cpu_percent", 0)
    memory_a = results_a.get("memory_mb", 0)
    memory_b = results_b.get("memory_mb", 0)
    
    if cpu_a > 0 and cpu_b > 0:
        comparison["metrics"]["cpu"] = {
            f"{label_a}_percent": cpu_a,
            f"{label_b}_percent": cpu_b,
            "winner": label_a if cpu_a < cpu_b else label_b,
            "difference_percent": abs(cpu_a - cpu_b)
        }
    
    if memory_a > 0 and memory_b > 0:
        comparison["metrics"]["memory"] = {
            f"{label_a}_mb": memory_a,
            f"{label_b}_mb": memory_b,
            "winner": label_a if memory_a < memory_b else label_b,
            "difference_mb": abs(memory_a - memory_b),
            "difference_percent": abs(memory_a - memory_b) / max(memory_a, memory_b) * 100
        }
    
    return comparison


def generate_benchmark_id(config_name: str, timestamp: Optional[float] = None) -> str:
    """Generate unique benchmark ID"""
    if timestamp is None:
        timestamp = time.time()
    
    from datetime import datetime
    dt = datetime.fromtimestamp(timestamp)
    return f"{config_name}_{dt.strftime('%Y%m%d_%H%M%S')}"


def save_benchmark_artifacts(results: Dict[str, Any], output_dir: Path, 
                           benchmark_id: str) -> Dict[str, Path]:
    """Save benchmark artifacts to files"""
    output_dir = output_dir / benchmark_id
    output_dir.mkdir(parents=True, exist_ok=True)
    
    saved_files = {}
    
    # Save main results
    results_file = output_dir / "results.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    saved_files["results"] = results_file
    
    # Save configuration
    if "configuration" in results:
        config_file = output_dir / "configuration.json"
        with open(config_file, 'w') as f:
            json.dump(results["configuration"], f, indent=2, default=str)
        saved_files["configuration"] = config_file
    
    # Save resource snapshots
    if "resource_snapshots" in results and results["resource_snapshots"]:
        resource_file = output_dir / "resource_usage.json"
        with open(resource_file, 'w') as f:
            json.dump(results["resource_snapshots"], f, indent=2, default=str)
        saved_files["resource_usage"] = resource_file
    
    # Save metrics data
    if "python_metrics" in results or "nodejs_metrics" in results:
        metrics_file = output_dir / "metrics.json"
        metrics_data = {}
        
        if "python_metrics" in results:
            metrics_data["python"] = results["python_metrics"]
        
        if "nodejs_metrics" in results:
            metrics_data["nodejs"] = results["nodejs_metrics"]
        
        with open(metrics_file, 'w') as f:
            json.dump(metrics_data, f, indent=2, default=str)
        saved_files["metrics"] = metrics_file
    
    # Save performance comparison
    if "performance_comparison" in results:
        comparison_file = output_dir / "comparison.json"
        with open(comparison_file, 'w') as f:
            json.dump(results["performance_comparison"], f, indent=2, default=str)
        saved_files["comparison"] = comparison_file
    
    return saved_files


def cleanup_old_benchmark_results(output_dir: Path, max_results: int = 100):
    """Clean up old benchmark result directories"""
    if not output_dir.exists():
        return
    
    # Get all benchmark result directories
    result_dirs = [d for d in output_dir.iterdir() if d.is_dir() and d.name.startswith("benchmark_")]
    
    # Sort by modification time (newest first)
    result_dirs.sort(key=lambda d: d.stat().st_mtime, reverse=True)
    
    # Remove old directories
    for old_dir in result_dirs[max_results:]:
        try:
            import shutil
            shutil.rmtree(old_dir)
            print(f"Cleaned up old benchmark results: {old_dir.name}")
        except Exception as e:
            print(f"Failed to clean up {old_dir.name}: {e}")


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format"""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        remaining_seconds = seconds % 60
        return f"{minutes}m {remaining_seconds:.1f}s"
    else:
        hours = int(seconds // 3600)
        remaining_minutes = int((seconds % 3600) // 60)
        return f"{hours}h {remaining_minutes}m"


def format_throughput(mps: float) -> str:
    """Format throughput in human-readable format"""
    if mps >= 1000000:
        return f"{mps/1000000:.1f}M msg/s"
    elif mps >= 1000:
        return f"{mps/1000:.1f}K msg/s"
    else:
        return f"{mps:.0f} msg/s"


def format_memory(mb: float) -> str:
    """Format memory in human-readable format"""
    if mb >= 1024:
        return f"{mb/1024:.1f} GB"
    else:
        return f"{mb:.1f} MB"


def validate_benchmark_results(results: Dict[str, Any]) -> List[str]:
    """Validate benchmark results and return list of issues"""
    issues = []
    
    # Check required fields
    required_fields = ["configuration", "start_time", "end_time", "success"]
    for field in required_fields:
        if field not in results:
            issues.append(f"Missing required field: {field}")
    
    # Check if benchmark was successful
    if not results.get("success", False):
        if not results.get("errors"):
            issues.append("Benchmark failed but no errors reported")
    
    # Check metrics data
    if results.get("success", False):
        if not results.get("python_metrics") and not results.get("nodejs_metrics"):
            issues.append("No application metrics collected")
        
        # Validate metrics structure
        for impl in ["python_metrics", "nodejs_metrics"]:
            if impl in results:
                metrics = results[impl]
                if not isinstance(metrics, dict):
                    issues.append(f"{impl} is not a dictionary")
                elif "throughput_mps" not in metrics:
                    issues.append(f"{impl} missing throughput_mps")
    
    # Check resource snapshots
    if "resource_snapshots" in results:
        snapshots = results["resource_snapshots"]
        if not isinstance(snapshots, list):
            issues.append("resource_snapshots is not a list")
        elif len(snapshots) == 0:
            issues.append("No resource snapshots collected")
    
    return issues


if __name__ == "__main__":
    # Test utility functions
    print("Testing benchmark utilities...")
    
    # Test percentile calculation
    test_values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    percentiles = calculate_percentiles(test_values)
    print(f"Percentiles: {percentiles}")
    
    # Test throughput calculation
    message_data = [(0, 0), (1, 100), (2, 250), (3, 380), (4, 520)]
    throughput_stats = calculate_throughput_stats(message_data)
    print(f"Throughput stats: {throughput_stats}")
    
    # Test formatting functions
    print(f"Duration: {format_duration(3661.5)}")
    print(f"Throughput: {format_throughput(12500)}")
    print(f"Memory: {format_memory(1536)}")
    
    print("Utility tests completed")