<template>
  <div class="interactive-chart">
    <div class="chart-controls">
      <button 
        v-for="dataset in datasets" 
        :key="dataset.name"
        @click="toggleDataset(dataset.name)"
        :class="['chart-button', { active: activeDatasets.includes(dataset.name) }]"
      >
        {{ dataset.label }}
      </button>
      <button @click="resetChart" class="chart-button reset">Reset</button>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas" :id="chartId"></canvas>
    </div>
    <div class="chart-info">
      <div class="metric-cards">
        <div v-for="metric in currentMetrics" :key="metric.name" class="metric-card">
          <div class="metric-label">{{ metric.label }}</div>
          <div class="metric-value" :class="metric.type">{{ metric.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import 'chartjs-adapter-date-fns'

Chart.register(...registerables)

const props = defineProps({
  chartId: {
    type: String,
    default: 'performance-chart'
  },
  type: {
    type: String,
    default: 'latency' // 'latency', 'throughput', 'memory'
  }
})

const chartCanvas = ref(null)
const chart = ref(null)
const activeDatasets = ref(['python', 'nodejs'])

const datasets = computed(() => {
  if (props.type === 'latency') {
    return [
      {
        name: 'python',
        label: 'Python',
        data: generateLatencyData('python'),
        borderColor: '#3776ab',
        backgroundColor: 'rgba(55, 118, 171, 0.1)'
      },
      {
        name: 'nodejs',
        label: 'Node.js',
        data: generateLatencyData('nodejs'),
        borderColor: '#339933',
        backgroundColor: 'rgba(51, 153, 51, 0.1)'
      }
    ]
  } else if (props.type === 'throughput') {
    return [
      {
        name: 'python',
        label: 'Python',
        data: generateThroughputData('python'),
        borderColor: '#3776ab',
        backgroundColor: 'rgba(55, 118, 171, 0.1)'
      },
      {
        name: 'nodejs',
        label: 'Node.js',
        data: generateThroughputData('nodejs'),
        borderColor: '#339933',
        backgroundColor: 'rgba(51, 153, 51, 0.1)'
      }
    ]
  } else {
    return [
      {
        name: 'python',
        label: 'Python Memory',
        data: generateMemoryData('python'),
        borderColor: '#3776ab',
        backgroundColor: 'rgba(55, 118, 171, 0.1)'
      },
      {
        name: 'nodejs',
        label: 'Node.js Memory',
        data: generateMemoryData('nodejs'),
        borderColor: '#339933',
        backgroundColor: 'rgba(51, 153, 51, 0.1)'
      }
    ]
  }
})

const currentMetrics = computed(() => {
  if (props.type === 'latency') {
    return [
      { name: 'p50', label: 'P50 Latency', value: '0.45ms', type: 'latency' },
      { name: 'p95', label: 'P95 Latency', value: '0.78ms', type: 'latency' },
      { name: 'p99', label: 'P99 Latency', value: '1.23ms', type: 'latency' }
    ]
  } else if (props.type === 'throughput') {
    return [
      { name: 'current', label: 'Current Rate', value: '12,000 msg/s', type: 'throughput' },
      { name: 'peak', label: 'Peak Rate', value: '15,000 msg/s', type: 'throughput' },
      { name: 'average', label: 'Average Rate', value: '8,500 msg/s', type: 'throughput' }
    ]
  } else {
    return [
      { name: 'current', label: 'Current Usage', value: '145MB', type: 'memory' },
      { name: 'peak', label: 'Peak Usage', value: '180MB', type: 'memory' },
      { name: 'average', label: 'Average Usage', value: '125MB', type: 'memory' }
    ]
  }
})

function generateLatencyData(implementation) {
  const baseLatency = implementation === 'python' ? 0.45 : 0.38
  const data = []
  
  for (let i = 0; i < 100; i++) {
    const load = i * 100 // messages per second
    const latency = baseLatency + (load / 10000) * Math.random() * 2
    data.push({ x: load, y: latency })
  }
  
  return data
}

function generateThroughputData(implementation) {
  const maxThroughput = implementation === 'python' ? 12000 : 15000
  const data = []
  
  for (let i = 0; i < 60; i++) {
    const time = i
    const throughput = maxThroughput * (0.8 + 0.2 * Math.sin(i / 10) + Math.random() * 0.1)
    data.push({ x: time, y: Math.max(0, throughput) })
  }
  
  return data
}

function generateMemoryData(implementation) {
  const baseMemory = implementation === 'python' ? 145 : 120
  const data = []
  
  for (let i = 0; i < 60; i++) {
    const time = i
    const memory = baseMemory + (i * 0.5) + Math.random() * 10
    data.push({ x: time, y: memory })
  }
  
  return data
}

function createChart() {
  if (!chartCanvas.value) return
  
  const ctx = chartCanvas.value.getContext('2d')
  
  const config = {
    type: 'line',
    data: {
      datasets: datasets.value.filter(d => activeDatasets.value.includes(d.name))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || ''
              const value = props.type === 'latency' 
                ? `${context.parsed.y.toFixed(3)}ms`
                : props.type === 'throughput'
                ? `${Math.round(context.parsed.y).toLocaleString()} msg/s`
                : `${Math.round(context.parsed.y)}MB`
              return `${label}: ${value}`
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          display: true,
          title: {
            display: true,
            text: props.type === 'latency' 
              ? 'Load (messages/second)'
              : props.type === 'throughput'
              ? 'Time (seconds)'
              : 'Time (minutes)'
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: props.type === 'latency' 
              ? 'Latency (ms)'
              : props.type === 'throughput'
              ? 'Throughput (msg/s)'
              : 'Memory Usage (MB)'
          },
          beginAtZero: props.type !== 'latency'
        }
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      }
    }
  }
  
  chart.value = new Chart(ctx, config)
}

function toggleDataset(datasetName) {
  const index = activeDatasets.value.indexOf(datasetName)
  if (index > -1) {
    if (activeDatasets.value.length > 1) {
      activeDatasets.value.splice(index, 1)
    }
  } else {
    activeDatasets.value.push(datasetName)
  }
  updateChart()
}

function resetChart() {
  activeDatasets.value = ['python', 'nodejs']
  updateChart()
}

function updateChart() {
  if (!chart.value) return
  
  chart.value.data.datasets = datasets.value.filter(d => activeDatasets.value.includes(d.name))
  chart.value.update()
}

onMounted(() => {
  createChart()
})

onUnmounted(() => {
  if (chart.value) {
    chart.value.destroy()
  }
})
</script>

<style scoped>
.interactive-chart {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  background-color: var(--vp-c-bg-soft);
}

.chart-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.chart-button {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.25s;
  font-size: 0.875rem;
}

.chart-button:hover {
  border-color: var(--vp-c-brand-1);
}

.chart-button.active {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
}

.chart-button.reset {
  margin-left: auto;
  background-color: var(--vp-c-bg-alt);
}

.chart-container {
  height: 400px;
  position: relative;
  margin-bottom: 16px;
}

.chart-info {
  border-top: 1px solid var(--vp-c-border);
  padding-top: 16px;
}

.metric-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.metric-card {
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.metric-value.latency {
  color: var(--vp-c-brand-1);
}

.metric-value.throughput {
  color: var(--vp-c-warning-1);
}

.metric-value.memory {
  color: var(--vp-c-danger-1);
}

@media (max-width: 768px) {
  .chart-controls {
    justify-content: center;
  }
  
  .chart-button.reset {
    margin-left: 0;
    order: -1;
    width: 100%;
  }
  
  .chart-container {
    height: 300px;
  }
}
</style>