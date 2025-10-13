#!/usr/bin/env node

/**
 * Compare benchmark results between Python and Node.js implementations
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = 'benchmark-results';
const OUTPUT_FILE = 'benchmark-comparison.json';

function loadResults() {
  const resultsPath = path.join(process.cwd(), RESULTS_DIR);
  
  if (!fs.existsSync(resultsPath)) {
    console.error('❌ Benchmark results directory not found. Run benchmarks first.');
    process.exit(1);
  }

  const files = fs.readdirSync(resultsPath);
  const pythonResults = files.filter(f => f.includes('python')).map(f => 
    JSON.parse(fs.readFileSync(path.join(resultsPath, f), 'utf8'))
  );
  const nodeResults = files.filter(f => f.includes('node')).map(f => 
    JSON.parse(fs.readFileSync(path.join(resultsPath, f), 'utf8'))
  );

  return { pythonResults, nodeResults };
}

function compareMetrics(python, node) {
  const comparison = {
    timestamp: new Date().toISOString(),
    latency: {
      python: python.latency || {},
      node: node.latency || {},
      winner: null
    },
    throughput: {
      python: python.throughput || {},
      node: node.throughput || {},
      winner: null
    },
    memory: {
      python: python.memory || {},
      node: node.memory || {},
      winner: null
    },
    cpu: {
      python: python.cpu || {},
      node: node.cpu || {},
      winner: null
    }
  };

  // Determine winners (lower is better for latency and memory, higher for throughput)
  if (python.latency?.p99 && node.latency?.p99) {
    comparison.latency.winner = python.latency.p99 < node.latency.p99 ? 'python' : 'node';
  }
  
  if (python.throughput?.avg && node.throughput?.avg) {
    comparison.throughput.winner = python.throughput.avg > node.throughput.avg ? 'python' : 'node';
  }

  if (python.memory?.peak && node.memory?.peak) {
    comparison.memory.winner = python.memory.peak < node.memory.peak ? 'python' : 'node';
  }

  return comparison;
}

function generateReport(comparison) {
  console.log('🏆 Benchmark Comparison Report');
  console.log('================================');
  console.log();
  
  console.log('📊 Latency (P99):');
  console.log(`  Python: ${comparison.latency.python.p99 || 'N/A'}ms`);
  console.log(`  Node.js: ${comparison.latency.node.p99 || 'N/A'}ms`);
  console.log(`  Winner: ${comparison.latency.winner || 'N/A'}`);
  console.log();
  
  console.log('🚀 Throughput (avg):');
  console.log(`  Python: ${comparison.throughput.python.avg || 'N/A'} msg/s`);
  console.log(`  Node.js: ${comparison.throughput.node.avg || 'N/A'} msg/s`);
  console.log(`  Winner: ${comparison.throughput.winner || 'N/A'}`);
  console.log();
  
  console.log('💾 Memory (peak):');
  console.log(`  Python: ${comparison.memory.python.peak || 'N/A'}MB`);
  console.log(`  Node.js: ${comparison.memory.node.peak || 'N/A'}MB`);
  console.log(`  Winner: ${comparison.memory.winner || 'N/A'}`);
  console.log();
}

function main() {
  try {
    const { pythonResults, nodeResults } = loadResults();
    
    if (pythonResults.length === 0 || nodeResults.length === 0) {
      console.error('❌ Missing benchmark results for one or both implementations');
      process.exit(1);
    }

    // Use the latest results
    const latestPython = pythonResults[pythonResults.length - 1];
    const latestNode = nodeResults[nodeResults.length - 1];
    
    const comparison = compareMetrics(latestPython, latestNode);
    
    // Save comparison results
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(comparison, null, 2));
    
    generateReport(comparison);
    
    console.log(`📄 Detailed comparison saved to: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ Error comparing results:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { compareMetrics, generateReport };