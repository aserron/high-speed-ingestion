"""
Simple Chart Generator

Lightweight chart generation for benchmark reports without heavy dependencies.
Creates ASCII charts and simple HTML/SVG visualizations.
"""

import json
import statistics
from pathlib import Path
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass


@dataclass
class ChartData:
    """Chart data container"""
    title: str
    labels: List[str]
    values: List[float]
    units: str = ""
    colors: List[str] = None


class SimpleChartGenerator:
    """Simple chart generator using ASCII and basic HTML/SVG"""
    
    def __init__(self):
        self.default_colors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"]
    
    def generate_ascii_bar_chart(self, data: ChartData, width: int = 60) -> str:
        """Generate ASCII bar chart"""
        if not data.values:
            return f"{data.title}\nNo data available"
        
        max_value = max(data.values)
        if max_value == 0:
            return f"{data.title}\nAll values are zero"
        
        # Calculate bar lengths
        bar_lengths = [int((value / max_value) * width) for value in data.values]
        
        # Create chart
        chart_lines = [f"{data.title}", "=" * len(data.title), ""]
        
        for i, (label, value, bar_length) in enumerate(zip(data.labels, data.values, bar_lengths)):
            bar = "█" * bar_length
            padding = " " * (20 - len(label))  # Align values
            chart_lines.append(f"{label}{padding} |{bar} {value:.1f} {data.units}")
        
        return "\n".join(chart_lines)
    
    def generate_ascii_comparison_chart(self, python_values: List[float], 
                                      nodejs_values: List[float], 
                                      labels: List[str], title: str) -> str:
        """Generate ASCII comparison chart between Python and Node.js"""
        if len(python_values) != len(nodejs_values) or len(python_values) != len(labels):
            return f"{title}\nError: Mismatched data lengths"
        
        chart_lines = [title, "=" * len(title), ""]
        chart_lines.append("Legend: [P] Python  [N] Node.js")
        chart_lines.append("")
        
        for i, (py_val, js_val, label) in enumerate(zip(python_values, nodejs_values, labels)):
            # Determine winner
            if py_val > js_val:
                winner_symbol = "[P]"
                diff = ((py_val - js_val) / js_val * 100) if js_val > 0 else 0
            elif js_val > py_val:
                winner_symbol = "[N]"
                diff = ((js_val - py_val) / py_val * 100) if py_val > 0 else 0
            else:
                winner_symbol = "[=]"
                diff = 0
            
            chart_lines.append(f"{label}:")
            chart_lines.append(f"  Python:  {py_val:.1f}")
            chart_lines.append(f"  Node.js: {js_val:.1f}")
            chart_lines.append(f"  Winner:  {winner_symbol} (+{diff:.1f}%)")
            chart_lines.append("")
        
        return "\n".join(chart_lines)
    
    def generate_svg_bar_chart(self, data: ChartData, width: int = 600, height: int = 400) -> str:
        """Generate SVG bar chart"""
        if not data.values:
            return f'<svg><text x="10" y="20">No data available for {data.title}</text></svg>'
        
        max_value = max(data.values)
        if max_value == 0:
            return f'<svg><text x="10" y="20">All values are zero for {data.title}</text></svg>'
        
        # Chart dimensions
        margin = 60
        chart_width = width - 2 * margin
        chart_height = height - 2 * margin
        bar_width = chart_width / len(data.values) * 0.8
        bar_spacing = chart_width / len(data.values) * 0.2
        
        # SVG elements
        svg_elements = []
        
        # Background
        svg_elements.append(f'<rect width="{width}" height="{height}" fill="white" stroke="#ddd"/>')
        
        # Title
        svg_elements.append(f'<text x="{width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold">{data.title}</text>')
        
        # Bars
        colors = data.colors or self.default_colors
        
        for i, (label, value) in enumerate(zip(data.labels, data.values)):
            # Calculate bar dimensions
            bar_height = (value / max_value) * chart_height
            x = margin + i * (bar_width + bar_spacing)
            y = height - margin - bar_height
            
            color = colors[i % len(colors)]
            
            # Bar
            svg_elements.append(f'<rect x="{x}" y="{y}" width="{bar_width}" height="{bar_height}" fill="{color}" opacity="0.8"/>')
            
            # Value label on top of bar
            svg_elements.append(f'<text x="{x + bar_width/2}" y="{y - 5}" text-anchor="middle" font-size="12">{value:.1f}</text>')
            
            # X-axis label
            svg_elements.append(f'<text x="{x + bar_width/2}" y="{height - 10}" text-anchor="middle" font-size="10">{label}</text>')
        
        # Y-axis
        svg_elements.append(f'<line x1="{margin}" y1="{margin}" x2="{margin}" y2="{height - margin}" stroke="black"/>')
        
        # X-axis
        svg_elements.append(f'<line x1="{margin}" y1="{height - margin}" x2="{width - margin}" y2="{height - margin}" stroke="black"/>')
        
        # Y-axis labels
        for i in range(5):
            y_value = (max_value / 4) * i
            y_pos = height - margin - (chart_height / 4) * i
            svg_elements.append(f'<text x="{margin - 10}" y="{y_pos}" text-anchor="end" font-size="10">{y_value:.0f}</text>')
            svg_elements.append(f'<line x1="{margin - 5}" y1="{y_pos}" x2="{margin}" y2="{y_pos}" stroke="black"/>')
        
        # Units label
        if data.units:
            svg_elements.append(f'<text x="20" y="{height/2}" text-anchor="middle" font-size="12" transform="rotate(-90 20 {height/2})">{data.units}</text>')
        
        return f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">{"".join(svg_elements)}</svg>'
    
    def generate_html_dashboard(self, benchmark_results: List[Dict[str, Any]], 
                              output_file: Path) -> Path:
        """Generate simple HTML dashboard with embedded SVG charts"""
        
        # Extract data for charts
        throughput_data = self._extract_throughput_data(benchmark_results)
        latency_data = self._extract_latency_data(benchmark_results)
        resource_data = self._extract_resource_data(benchmark_results)
        
        # Generate charts
        throughput_chart = self.generate_svg_bar_chart(throughput_data)
        latency_chart = self.generate_svg_bar_chart(latency_data)
        cpu_chart = self.generate_svg_bar_chart(resource_data["cpu"])
        memory_chart = self.generate_svg_bar_chart(resource_data["memory"])
        
        # Generate ASCII summary
        ascii_summary = self._generate_ascii_summary(benchmark_results)
        
        # HTML template
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Benchmark Dashboard</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; }}
                .header {{ background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                .chart-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }}
                .chart-container {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .summary {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .ascii-chart {{ font-family: monospace; white-space: pre-line; background: #f8f9fa; padding: 15px; border-radius: 4px; }}
                @media (max-width: 768px) {{ .chart-grid {{ grid-template-columns: 1fr; }} }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Financial Data Ingestion Benchmark Dashboard</h1>
                    <p>Performance comparison between Python and Node.js implementations</p>
                </div>
                
                <div class="chart-grid">
                    <div class="chart-container">
                        <h3>Throughput Comparison</h3>
                        {throughput_chart}
                    </div>
                    
                    <div class="chart-container">
                        <h3>Latency Comparison</h3>
                        {latency_chart}
                    </div>
                    
                    <div class="chart-container">
                        <h3>CPU Usage</h3>
                        {cpu_chart}
                    </div>
                    
                    <div class="chart-container">
                        <h3>Memory Usage</h3>
                        {memory_chart}
                    </div>
                </div>
                
                <div class="summary">
                    <h3>Benchmark Summary</h3>
                    <div class="ascii-chart">{ascii_summary}</div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Save HTML file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return output_file
    
    def _extract_throughput_data(self, benchmark_results: List[Dict[str, Any]]) -> ChartData:
        """Extract throughput data for charting"""
        python_values = []
        nodejs_values = []
        labels = []
        
        for result in benchmark_results:
            if not result.get("success", False):
                continue
            
            python_metrics = result.get("python_metrics", {})
            nodejs_metrics = result.get("nodejs_metrics", {})
            
            if python_metrics and nodejs_metrics:
                python_values.append(python_metrics.get("throughput_mps", 0))
                nodejs_values.append(nodejs_metrics.get("throughput_mps", 0))
                labels.append(result.get("name", "Unknown"))
        
        # Combine for side-by-side comparison
        combined_values = []
        combined_labels = []
        
        for i, label in enumerate(labels):
            combined_values.extend([python_values[i], nodejs_values[i]])
            combined_labels.extend([f"{label} (Python)", f"{label} (Node.js)"])
        
        return ChartData(
            title="Throughput Comparison",
            labels=combined_labels,
            values=combined_values,
            units="msg/s",
            colors=["#3498db", "#e74c3c"] * len(labels)
        )
    
    def _extract_latency_data(self, benchmark_results: List[Dict[str, Any]]) -> ChartData:
        """Extract latency data for charting"""
        python_values = []
        nodejs_values = []
        labels = []
        
        for result in benchmark_results:
            if not result.get("success", False):
                continue
            
            python_metrics = result.get("python_metrics", {})
            nodejs_metrics = result.get("nodejs_metrics", {})
            
            if python_metrics and nodejs_metrics:
                python_values.append(python_metrics.get("latency_p95_ms", 0))
                nodejs_values.append(nodejs_metrics.get("latency_p95_ms", 0))
                labels.append(result.get("name", "Unknown"))
        
        # Combine for side-by-side comparison
        combined_values = []
        combined_labels = []
        
        for i, label in enumerate(labels):
            combined_values.extend([python_values[i], nodejs_values[i]])
            combined_labels.extend([f"{label} (Python)", f"{label} (Node.js)"])
        
        return ChartData(
            title="Latency P95 Comparison",
            labels=combined_labels,
            values=combined_values,
            units="ms",
            colors=["#3498db", "#e74c3c"] * len(labels)
        )
    
    def _extract_resource_data(self, benchmark_results: List[Dict[str, Any]]) -> Dict[str, ChartData]:
        """Extract resource usage data for charting"""
        python_cpu = []
        nodejs_cpu = []
        python_memory = []
        nodejs_memory = []
        labels = []
        
        for result in benchmark_results:
            if not result.get("success", False):
                continue
            
            python_metrics = result.get("python_metrics", {})
            nodejs_metrics = result.get("nodejs_metrics", {})
            
            if python_metrics and nodejs_metrics:
                python_cpu.append(python_metrics.get("cpu_percent", 0))
                nodejs_cpu.append(nodejs_metrics.get("cpu_percent", 0))
                python_memory.append(python_metrics.get("memory_mb", 0))
                nodejs_memory.append(nodejs_metrics.get("memory_mb", 0))
                labels.append(result.get("name", "Unknown"))
        
        # CPU data
        cpu_values = []
        cpu_labels = []
        for i, label in enumerate(labels):
            cpu_values.extend([python_cpu[i], nodejs_cpu[i]])
            cpu_labels.extend([f"{label} (Python)", f"{label} (Node.js)"])
        
        # Memory data
        memory_values = []
        memory_labels = []
        for i, label in enumerate(labels):
            memory_values.extend([python_memory[i], nodejs_memory[i]])
            memory_labels.extend([f"{label} (Python)", f"{label} (Node.js)"])
        
        return {
            "cpu": ChartData(
                title="CPU Usage Comparison",
                labels=cpu_labels,
                values=cpu_values,
                units="%",
                colors=["#3498db", "#e74c3c"] * len(labels)
            ),
            "memory": ChartData(
                title="Memory Usage Comparison",
                labels=memory_labels,
                values=memory_values,
                units="MB",
                colors=["#3498db", "#e74c3c"] * len(labels)
            )
        }
    
    def _generate_ascii_summary(self, benchmark_results: List[Dict[str, Any]]) -> str:
        """Generate ASCII summary of benchmark results"""
        successful_results = [r for r in benchmark_results if r.get("success", False)]
        
        if not successful_results:
            return "No successful benchmark results to display."
        
        summary_lines = ["BENCHMARK RESULTS SUMMARY", "=" * 50, ""]
        
        # Overall statistics
        total_benchmarks = len(benchmark_results)
        successful_benchmarks = len(successful_results)
        
        summary_lines.extend([
            f"Total Benchmarks: {total_benchmarks}",
            f"Successful: {successful_benchmarks}",
            f"Failed: {total_benchmarks - successful_benchmarks}",
            f"Success Rate: {successful_benchmarks/total_benchmarks*100:.1f}%",
            ""
        ])
        
        # Performance comparison
        python_throughputs = []
        nodejs_throughputs = []
        python_latencies = []
        nodejs_latencies = []
        
        for result in successful_results:
            python_metrics = result.get("python_metrics", {})
            nodejs_metrics = result.get("nodejs_metrics", {})
            
            if python_metrics:
                python_throughputs.append(python_metrics.get("throughput_mps", 0))
                python_latencies.append(python_metrics.get("latency_p95_ms", 0))
            
            if nodejs_metrics:
                nodejs_throughputs.append(nodejs_metrics.get("throughput_mps", 0))
                nodejs_latencies.append(nodejs_metrics.get("latency_p95_ms", 0))
        
        if python_throughputs and nodejs_throughputs:
            py_avg_throughput = statistics.mean(python_throughputs)
            js_avg_throughput = statistics.mean(nodejs_throughputs)
            py_avg_latency = statistics.mean(python_latencies)
            js_avg_latency = statistics.mean(nodejs_latencies)
            
            summary_lines.extend([
                "AVERAGE PERFORMANCE METRICS",
                "-" * 30,
                f"Throughput:",
                f"  Python:  {py_avg_throughput:.0f} msg/s",
                f"  Node.js: {js_avg_throughput:.0f} msg/s",
                f"  Winner:  {'Python' if py_avg_throughput > js_avg_throughput else 'Node.js'}",
                "",
                f"Latency P95:",
                f"  Python:  {py_avg_latency:.2f} ms",
                f"  Node.js: {js_avg_latency:.2f} ms",
                f"  Winner:  {'Python' if py_avg_latency < js_avg_latency else 'Node.js'}",
                ""
            ])
        
        # Individual benchmark results
        summary_lines.extend(["INDIVIDUAL RESULTS", "-" * 20])
        
        for result in successful_results:
            name = result.get("name", "Unknown")
            duration = result.get("duration_seconds", 0)
            
            python_metrics = result.get("python_metrics", {})
            nodejs_metrics = result.get("nodejs_metrics", {})
            
            summary_lines.append(f"{name} ({duration:.1f}s):")
            
            if python_metrics:
                py_throughput = python_metrics.get("throughput_mps", 0)
                py_latency = python_metrics.get("latency_p95_ms", 0)
                summary_lines.append(f"  Python:  {py_throughput:.0f} msg/s, {py_latency:.2f}ms")
            
            if nodejs_metrics:
                js_throughput = nodejs_metrics.get("throughput_mps", 0)
                js_latency = nodejs_metrics.get("latency_p95_ms", 0)
                summary_lines.append(f"  Node.js: {js_throughput:.0f} msg/s, {js_latency:.2f}ms")
            
            summary_lines.append("")
        
        return "\n".join(summary_lines)


def generate_simple_report(benchmark_results_file: Path, output_dir: Path = None) -> Path:
    """Generate simple benchmark report with ASCII and basic HTML charts"""
    if output_dir is None:
        output_dir = Path("benchmark_reports")
    
    output_dir.mkdir(exist_ok=True)
    
    # Load benchmark results
    with open(benchmark_results_file, 'r') as f:
        data = json.load(f)
    
    # Extract results
    if isinstance(data, dict) and "benchmark_results" in data:
        benchmark_results = data["benchmark_results"]
    elif isinstance(data, list):
        benchmark_results = data
    else:
        benchmark_results = [data]
    
    # Generate charts
    generator = SimpleChartGenerator()
    
    # Generate HTML dashboard
    html_file = output_dir / "simple_dashboard.html"
    generator.generate_html_dashboard(benchmark_results, html_file)
    
    return html_file


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Simple Chart Generator")
    parser.add_argument("results_file", type=Path, help="Benchmark results JSON file")
    parser.add_argument("--output-dir", type=Path, default=Path("benchmark_reports"),
                       help="Output directory")
    
    args = parser.parse_args()
    
    if not args.results_file.exists():
        print(f"Error: Results file not found: {args.results_file}")
        exit(1)
    
    try:
        output_file = generate_simple_report(args.results_file, args.output_dir)
        print(f"Simple report generated: {output_file}")
    except Exception as e:
        print(f"Error generating report: {e}")
        exit(1)