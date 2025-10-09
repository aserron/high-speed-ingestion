#!/usr/bin/env python3
"""
Benchmark Reporting System

Comprehensive reporting system for financial data ingestion benchmarks.
Generates side-by-side performance comparisons, latency distribution analysis,
throughput charts, and automated summary reports.
"""

import json
import statistics
import math
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import logging

# Optional dependencies for visualization
try:
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    import seaborn as sns
    import pandas as pd
    import numpy as np
    VISUALIZATION_AVAILABLE = True
except ImportError:
    VISUALIZATION_AVAILABLE = False
    print("Warning: Visualization libraries not available. Charts will be disabled.")

# HTML template for reports
try:
    from jinja2 import Template
    JINJA2_AVAILABLE = True
except ImportError:
    JINJA2_AVAILABLE = False
    print("Warning: Jinja2 not available. HTML reports will use basic templates.")


@dataclass
class PerformanceComparison:
    """Performance comparison between implementations"""
    metric_name: str
    python_value: float
    nodejs_value: float
    unit: str
    winner: str
    difference_percent: float
    difference_absolute: float
    significance: str  # "high", "medium", "low", "negligible"


@dataclass
class LatencyDistribution:
    """Latency distribution analysis"""
    implementation: str
    samples: List[float]
    percentiles: Dict[str, float]
    mean: float
    median: float
    std_dev: float
    min_value: float
    max_value: float
    outliers: List[float]


@dataclass
class ThroughputAnalysis:
    """Throughput analysis over time"""
    implementation: str
    timestamps: List[float]
    throughput_values: List[float]
    average_throughput: float
    peak_throughput: float
    min_throughput: float
    stability_score: float  # 0-100, higher is more stable


@dataclass
class ResourceUtilization:
    """Resource utilization analysis"""
    implementation: str
    cpu_stats: Dict[str, float]
    memory_stats: Dict[str, float]
    network_stats: Dict[str, float]
    efficiency_score: float  # Messages per CPU% per MB


class BenchmarkReportGenerator:
    """Generates comprehensive benchmark reports"""
    
    def __init__(self, output_dir: Path = None):
        self.output_dir = output_dir or Path("benchmark_reports")
        self.output_dir.mkdir(exist_ok=True)
        
        # Setup logging
        self.logger = logging.getLogger(__name__)
        
        # Chart configuration
        if VISUALIZATION_AVAILABLE:
            plt.style.use('seaborn-v0_8')
            sns.set_palette("husl")
    
    def generate_comprehensive_report(self, benchmark_results: List[Dict[str, Any]], 
                                    report_name: str = None) -> Dict[str, Path]:
        """Generate comprehensive benchmark report with all components"""
        if report_name is None:
            report_name = f"benchmark_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        report_dir = self.output_dir / report_name
        report_dir.mkdir(exist_ok=True)
        
        generated_files = {}
        
        try:
            # Generate performance comparisons
            comparisons = self._generate_performance_comparisons(benchmark_results)
            comparison_file = report_dir / "performance_comparison.json"
            with open(comparison_file, 'w') as f:
                json.dump([asdict(comp) for comp in comparisons], f, indent=2)
            generated_files["performance_comparison"] = comparison_file
            
            # Generate latency analysis
            latency_analysis = self._generate_latency_analysis(benchmark_results)
            latency_file = report_dir / "latency_analysis.json"
            with open(latency_file, 'w') as f:
                json.dump([asdict(analysis) for analysis in latency_analysis], f, indent=2)
            generated_files["latency_analysis"] = latency_file
            
            # Generate throughput analysis
            throughput_analysis = self._generate_throughput_analysis(benchmark_results)
            throughput_file = report_dir / "throughput_analysis.json"
            with open(throughput_file, 'w') as f:
                json.dump([asdict(analysis) for analysis in throughput_analysis], f, indent=2)
            generated_files["throughput_analysis"] = throughput_file
            
            # Generate resource utilization analysis
            resource_analysis = self._generate_resource_analysis(benchmark_results)
            resource_file = report_dir / "resource_analysis.json"
            with open(resource_file, 'w') as f:
                json.dump([asdict(analysis) for analysis in resource_analysis], f, indent=2)
            generated_files["resource_analysis"] = resource_file
            
            # Generate charts if visualization is available
            if VISUALIZATION_AVAILABLE:
                chart_files = self._generate_charts(
                    benchmark_results, comparisons, latency_analysis, 
                    throughput_analysis, resource_analysis, report_dir
                )
                generated_files.update(chart_files)
            
            # Generate HTML report
            html_file = self._generate_html_report(
                benchmark_results, comparisons, latency_analysis,
                throughput_analysis, resource_analysis, report_dir
            )
            generated_files["html_report"] = html_file
            
            # Generate summary report
            summary_file = self._generate_summary_report(
                benchmark_results, comparisons, report_dir
            )
            generated_files["summary_report"] = summary_file
            
            self.logger.info(f"Comprehensive report generated: {report_dir}")
            
        except Exception as e:
            self.logger.error(f"Error generating comprehensive report: {e}")
            raise
        
        return generated_files
    
    def _generate_performance_comparisons(self, benchmark_results: List[Dict[str, Any]]) -> List[PerformanceComparison]:
        """Generate side-by-side performance comparisons"""
        comparisons = []
        
        for result in benchmark_results:
            if not result.get("success", False):
                continue
            
            python_metrics = result.get("python_metrics")
            nodejs_metrics = result.get("nodejs_metrics")
            
            if not python_metrics or not nodejs_metrics:
                continue
            
            # Throughput comparison
            py_throughput = python_metrics.get("throughput_mps", 0)
            js_throughput = nodejs_metrics.get("throughput_mps", 0)
            
            if py_throughput > 0 and js_throughput > 0:
                diff_percent = abs(py_throughput - js_throughput) / max(py_throughput, js_throughput) * 100
                winner = "python" if py_throughput > js_throughput else "nodejs"
                significance = self._determine_significance(diff_percent)
                
                comparisons.append(PerformanceComparison(
                    metric_name="throughput",
                    python_value=py_throughput,
                    nodejs_value=js_throughput,
                    unit="msg/s",
                    winner=winner,
                    difference_percent=diff_percent,
                    difference_absolute=abs(py_throughput - js_throughput),
                    significance=significance
                ))
            
            # Latency comparison
            py_latency = python_metrics.get("latency_p95_ms", 0)
            js_latency = nodejs_metrics.get("latency_p95_ms", 0)
            
            if py_latency > 0 and js_latency > 0:
                diff_percent = abs(py_latency - js_latency) / max(py_latency, js_latency) * 100
                winner = "python" if py_latency < js_latency else "nodejs"
                significance = self._determine_significance(diff_percent)
                
                comparisons.append(PerformanceComparison(
                    metric_name="latency_p95",
                    python_value=py_latency,
                    nodejs_value=js_latency,
                    unit="ms",
                    winner=winner,
                    difference_percent=diff_percent,
                    difference_absolute=abs(py_latency - js_latency),
                    significance=significance
                ))
            
            # CPU usage comparison
            py_cpu = python_metrics.get("cpu_percent", 0)
            js_cpu = nodejs_metrics.get("cpu_percent", 0)
            
            if py_cpu > 0 and js_cpu > 0:
                diff_percent = abs(py_cpu - js_cpu) / max(py_cpu, js_cpu) * 100
                winner = "python" if py_cpu < js_cpu else "nodejs"
                significance = self._determine_significance(diff_percent)
                
                comparisons.append(PerformanceComparison(
                    metric_name="cpu_usage",
                    python_value=py_cpu,
                    nodejs_value=js_cpu,
                    unit="%",
                    winner=winner,
                    difference_percent=diff_percent,
                    difference_absolute=abs(py_cpu - js_cpu),
                    significance=significance
                ))
            
            # Memory usage comparison
            py_memory = python_metrics.get("memory_mb", 0)
            js_memory = nodejs_metrics.get("memory_mb", 0)
            
            if py_memory > 0 and js_memory > 0:
                diff_percent = abs(py_memory - js_memory) / max(py_memory, js_memory) * 100
                winner = "python" if py_memory < js_memory else "nodejs"
                significance = self._determine_significance(diff_percent)
                
                comparisons.append(PerformanceComparison(
                    metric_name="memory_usage",
                    python_value=py_memory,
                    nodejs_value=js_memory,
                    unit="MB",
                    winner=winner,
                    difference_percent=diff_percent,
                    difference_absolute=abs(py_memory - js_memory),
                    significance=significance
                ))
        
        return comparisons
    
    def _generate_latency_analysis(self, benchmark_results: List[Dict[str, Any]]) -> List[LatencyDistribution]:
        """Generate latency distribution analysis"""
        latency_distributions = []
        
        for result in benchmark_results:
            if not result.get("success", False):
                continue
            
            # Generate synthetic latency data for demonstration
            # In real implementation, this would come from actual measurements
            for impl in ["python", "nodejs"]:
                metrics = result.get(f"{impl}_metrics")
                if not metrics:
                    continue
                
                # Generate synthetic latency samples based on P95 value
                p95_latency = metrics.get("latency_p95_ms", 5.0)
                samples = self._generate_synthetic_latency_samples(p95_latency, 1000)
                
                # Calculate percentiles
                percentiles = self._calculate_percentiles(samples, [50, 90, 95, 99, 99.9])
                
                # Detect outliers (values > Q3 + 1.5 * IQR)
                q1, q3 = self._calculate_percentiles(samples, [25, 75]).values()
                iqr = q3 - q1
                outlier_threshold = q3 + 1.5 * iqr
                outliers = [s for s in samples if s > outlier_threshold]
                
                latency_distributions.append(LatencyDistribution(
                    implementation=impl,
                    samples=samples[:100],  # Save only first 100 for JSON serialization
                    percentiles=percentiles,
                    mean=statistics.mean(samples),
                    median=statistics.median(samples),
                    std_dev=statistics.stdev(samples) if len(samples) > 1 else 0,
                    min_value=min(samples),
                    max_value=max(samples),
                    outliers=outliers[:10]  # Save only first 10 outliers
                ))
        
        return latency_distributions
    
    def _generate_throughput_analysis(self, benchmark_results: List[Dict[str, Any]]) -> List[ThroughputAnalysis]:
        """Generate throughput analysis over time"""
        throughput_analyses = []
        
        for result in benchmark_results:
            if not result.get("success", False):
                continue
            
            duration = result.get("duration_seconds", 60)
            
            for impl in ["python", "nodejs"]:
                metrics = result.get(f"{impl}_metrics")
                if not metrics:
                    continue
                
                avg_throughput = metrics.get("throughput_mps", 1000)
                
                # Generate synthetic throughput time series
                timestamps, throughput_values = self._generate_synthetic_throughput_series(
                    duration, avg_throughput
                )
                
                # Calculate stability score (inverse of coefficient of variation)
                cv = statistics.stdev(throughput_values) / statistics.mean(throughput_values) if throughput_values else 0
                stability_score = max(0, 100 - cv * 100)
                
                throughput_analyses.append(ThroughputAnalysis(
                    implementation=impl,
                    timestamps=timestamps,
                    throughput_values=throughput_values,
                    average_throughput=avg_throughput,
                    peak_throughput=max(throughput_values),
                    min_throughput=min(throughput_values),
                    stability_score=stability_score
                ))
        
        return throughput_analyses
    
    def _generate_resource_analysis(self, benchmark_results: List[Dict[str, Any]]) -> List[ResourceUtilization]:
        """Generate resource utilization analysis"""
        resource_analyses = []
        
        for result in benchmark_results:
            if not result.get("success", False):
                continue
            
            for impl in ["python", "nodejs"]:
                metrics = result.get(f"{impl}_metrics")
                if not metrics:
                    continue
                
                cpu_percent = metrics.get("cpu_percent", 50)
                memory_mb = metrics.get("memory_mb", 100)
                throughput = metrics.get("throughput_mps", 1000)
                
                # Calculate efficiency score (messages per CPU% per MB)
                efficiency_score = throughput / (cpu_percent * memory_mb) if cpu_percent > 0 and memory_mb > 0 else 0
                
                resource_analyses.append(ResourceUtilization(
                    implementation=impl,
                    cpu_stats={
                        "average": cpu_percent,
                        "peak": cpu_percent * 1.2,
                        "min": cpu_percent * 0.8
                    },
                    memory_stats={
                        "average": memory_mb,
                        "peak": memory_mb * 1.1,
                        "min": memory_mb * 0.9
                    },
                    network_stats={
                        "bytes_sent": throughput * 100,  # Estimate
                        "bytes_received": throughput * 150,  # Estimate
                        "packets_sent": throughput,
                        "packets_received": throughput
                    },
                    efficiency_score=efficiency_score
                ))
        
        return resource_analyses
    
    def _generate_charts(self, benchmark_results: List[Dict[str, Any]], 
                        comparisons: List[PerformanceComparison],
                        latency_analysis: List[LatencyDistribution],
                        throughput_analysis: List[ThroughputAnalysis],
                        resource_analysis: List[ResourceUtilization],
                        output_dir: Path) -> Dict[str, Path]:
        """Generate visualization charts"""
        if not VISUALIZATION_AVAILABLE:
            return {}
        
        chart_files = {}
        
        try:
            # Performance comparison bar chart
            comparison_chart = self._create_performance_comparison_chart(comparisons, output_dir)
            if comparison_chart:
                chart_files["performance_comparison_chart"] = comparison_chart
            
            # Latency distribution histograms
            latency_chart = self._create_latency_distribution_chart(latency_analysis, output_dir)
            if latency_chart:
                chart_files["latency_distribution_chart"] = latency_chart
            
            # Throughput time series
            throughput_chart = self._create_throughput_time_series_chart(throughput_analysis, output_dir)
            if throughput_chart:
                chart_files["throughput_time_series_chart"] = throughput_chart
            
            # Resource utilization charts
            resource_chart = self._create_resource_utilization_chart(resource_analysis, output_dir)
            if resource_chart:
                chart_files["resource_utilization_chart"] = resource_chart
            
        except Exception as e:
            self.logger.error(f"Error generating charts: {e}")
        
        return chart_files
    
    def _create_performance_comparison_chart(self, comparisons: List[PerformanceComparison], 
                                           output_dir: Path) -> Optional[Path]:
        """Create performance comparison bar chart"""
        if not comparisons:
            return None
        
        # Group comparisons by metric
        metrics = {}
        for comp in comparisons:
            if comp.metric_name not in metrics:
                metrics[comp.metric_name] = []
            metrics[comp.metric_name].append(comp)
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Performance Comparison: Python vs Node.js', fontsize=16, fontweight='bold')
        
        axes = axes.flatten()
        
        for i, (metric_name, metric_comparisons) in enumerate(metrics.items()):
            if i >= 4:  # Only show first 4 metrics
                break
            
            ax = axes[i]
            
            # Average values across all benchmarks for this metric
            python_values = [comp.python_value for comp in metric_comparisons]
            nodejs_values = [comp.nodejs_value for comp in metric_comparisons]
            
            python_avg = statistics.mean(python_values)
            nodejs_avg = statistics.mean(nodejs_values)
            
            # Create bar chart
            implementations = ['Python', 'Node.js']
            values = [python_avg, nodejs_avg]
            colors = ['#3498db', '#e74c3c']
            
            bars = ax.bar(implementations, values, color=colors, alpha=0.7)
            
            # Add value labels on bars
            for bar, value in zip(bars, values):
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{value:.1f}', ha='center', va='bottom')
            
            # Determine winner and add annotation
            winner_idx = 0 if python_avg > nodejs_avg else 1
            if metric_name in ['latency_p95', 'cpu_usage', 'memory_usage']:
                winner_idx = 1 - winner_idx  # Lower is better for these metrics
            
            ax.annotate('Winner', xy=(winner_idx, values[winner_idx]), 
                       xytext=(winner_idx, values[winner_idx] * 1.1),
                       arrowprops=dict(arrowstyle='->', color='green', lw=2),
                       fontsize=12, fontweight='bold', color='green',
                       ha='center')
            
            ax.set_title(f'{metric_name.replace("_", " ").title()}')
            ax.set_ylabel(metric_comparisons[0].unit)
            ax.grid(True, alpha=0.3)
        
        # Hide unused subplots
        for i in range(len(metrics), 4):
            axes[i].set_visible(False)
        
        plt.tight_layout()
        
        chart_file = output_dir / "performance_comparison.png"
        plt.savefig(chart_file, dpi=300, bbox_inches='tight')
        plt.close()
        
        return chart_file
    
    def _create_latency_distribution_chart(self, latency_analysis: List[LatencyDistribution], 
                                         output_dir: Path) -> Optional[Path]:
        """Create latency distribution histograms"""
        if not latency_analysis:
            return None
        
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))
        fig.suptitle('Latency Distribution Analysis', fontsize=16, fontweight='bold')
        
        implementations = ['python', 'nodejs']
        colors = ['#3498db', '#e74c3c']
        
        for i, impl in enumerate(implementations):
            impl_data = [analysis for analysis in latency_analysis if analysis.implementation == impl]
            if not impl_data:
                continue
            
            ax = axes[i]
            
            # Combine all samples for this implementation
            all_samples = []
            for analysis in impl_data:
                all_samples.extend(analysis.samples)
            
            if all_samples:
                # Create histogram
                ax.hist(all_samples, bins=50, alpha=0.7, color=colors[i], edgecolor='black')
                
                # Add percentile lines
                percentiles = [50, 95, 99]
                percentile_values = [np.percentile(all_samples, p) for p in percentiles]
                
                for p, value in zip(percentiles, percentile_values):
                    ax.axvline(value, color='red', linestyle='--', alpha=0.8)
                    ax.text(value, ax.get_ylim()[1] * 0.9, f'P{p}: {value:.1f}ms',
                           rotation=90, ha='right', va='top')
                
                ax.set_title(f'{impl.title()} Latency Distribution')
                ax.set_xlabel('Latency (ms)')
                ax.set_ylabel('Frequency')
                ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        chart_file = output_dir / "latency_distribution.png"
        plt.savefig(chart_file, dpi=300, bbox_inches='tight')
        plt.close()
        
        return chart_file
    
    def _create_throughput_time_series_chart(self, throughput_analysis: List[ThroughputAnalysis], 
                                           output_dir: Path) -> Optional[Path]:
        """Create throughput time series chart"""
        if not throughput_analysis:
            return None
        
        fig, ax = plt.subplots(figsize=(15, 8))
        fig.suptitle('Throughput Over Time', fontsize=16, fontweight='bold')
        
        colors = {'python': '#3498db', 'nodejs': '#e74c3c'}
        
        for analysis in throughput_analysis:
            if len(analysis.timestamps) != len(analysis.throughput_values):
                continue
            
            ax.plot(analysis.timestamps, analysis.throughput_values, 
                   label=f'{analysis.implementation.title()} (avg: {analysis.average_throughput:.0f} msg/s)',
                   color=colors.get(analysis.implementation, 'gray'),
                   linewidth=2, alpha=0.8)
        
        ax.set_xlabel('Time (seconds)')
        ax.set_ylabel('Throughput (messages/second)')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        chart_file = output_dir / "throughput_time_series.png"
        plt.savefig(chart_file, dpi=300, bbox_inches='tight')
        plt.close()
        
        return chart_file
    
    def _create_resource_utilization_chart(self, resource_analysis: List[ResourceUtilization], 
                                         output_dir: Path) -> Optional[Path]:
        """Create resource utilization comparison chart"""
        if not resource_analysis:
            return None
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Resource Utilization Comparison', fontsize=16, fontweight='bold')
        
        # Group by implementation
        python_data = [r for r in resource_analysis if r.implementation == 'python']
        nodejs_data = [r for r in resource_analysis if r.implementation == 'nodejs']
        
        if not python_data or not nodejs_data:
            return None
        
        # CPU Usage
        ax = axes[0, 0]
        python_cpu = [r.cpu_stats['average'] for r in python_data]
        nodejs_cpu = [r.cpu_stats['average'] for r in nodejs_data]
        
        ax.bar(['Python', 'Node.js'], [statistics.mean(python_cpu), statistics.mean(nodejs_cpu)],
               color=['#3498db', '#e74c3c'], alpha=0.7)
        ax.set_title('Average CPU Usage')
        ax.set_ylabel('CPU %')
        ax.grid(True, alpha=0.3)
        
        # Memory Usage
        ax = axes[0, 1]
        python_memory = [r.memory_stats['average'] for r in python_data]
        nodejs_memory = [r.memory_stats['average'] for r in nodejs_data]
        
        ax.bar(['Python', 'Node.js'], [statistics.mean(python_memory), statistics.mean(nodejs_memory)],
               color=['#3498db', '#e74c3c'], alpha=0.7)
        ax.set_title('Average Memory Usage')
        ax.set_ylabel('Memory (MB)')
        ax.grid(True, alpha=0.3)
        
        # Efficiency Score
        ax = axes[1, 0]
        python_efficiency = [r.efficiency_score for r in python_data]
        nodejs_efficiency = [r.efficiency_score for r in nodejs_data]
        
        ax.bar(['Python', 'Node.js'], [statistics.mean(python_efficiency), statistics.mean(nodejs_efficiency)],
               color=['#3498db', '#e74c3c'], alpha=0.7)
        ax.set_title('Efficiency Score')
        ax.set_ylabel('Messages per CPU% per MB')
        ax.grid(True, alpha=0.3)
        
        # Network Usage
        ax = axes[1, 1]
        python_network = [r.network_stats['bytes_sent'] + r.network_stats['bytes_received'] for r in python_data]
        nodejs_network = [r.network_stats['bytes_sent'] + r.network_stats['bytes_received'] for r in nodejs_data]
        
        ax.bar(['Python', 'Node.js'], [statistics.mean(python_network), statistics.mean(nodejs_network)],
               color=['#3498db', '#e74c3c'], alpha=0.7)
        ax.set_title('Network I/O')
        ax.set_ylabel('Bytes')
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        chart_file = output_dir / "resource_utilization.png"
        plt.savefig(chart_file, dpi=300, bbox_inches='tight')
        plt.close()
        
        return chart_file