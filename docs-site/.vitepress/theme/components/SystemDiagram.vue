<template>
  <div class="system-diagram">
    <div class="diagram-controls">
      <button 
        v-for="view in views" 
        :key="view.name"
        @click="setActiveView(view.name)"
        :class="['view-button', { active: activeView === view.name }]"
      >
        {{ view.label }}
      </button>
    </div>
    
    <div class="diagram-container">
      <div class="mermaid-wrapper">
        <div ref="mermaidContainer" class="mermaid-content"></div>
      </div>
      
      <div class="diagram-info">
        <div class="info-panel">
          <h4>{{ currentView.title }}</h4>
          <p>{{ currentView.description }}</p>
          
          <div class="component-list">
            <div 
              v-for="component in currentView.components" 
              :key="component.name"
              class="component-item"
              @click="highlightComponent(component.name)"
              :class="{ highlighted: highlightedComponent === component.name }"
            >
              <div class="component-icon">{{ component.icon }}</div>
              <div class="component-details">
                <div class="component-name">{{ component.name }}</div>
                <div class="component-desc">{{ component.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import mermaid from 'mermaid'

const mermaidContainer = ref(null)
const activeView = ref('overview')
const highlightedComponent = ref(null)

const views = [
  { name: 'overview', label: 'System Overview' },
  { name: 'dataflow', label: 'Data Flow' },
  { name: 'deployment', label: 'Deployment' },
  { name: 'monitoring', label: 'Monitoring' }
]

const viewConfigs = {
  overview: {
    title: 'System Architecture Overview',
    description: 'High-level view of the Finance Ingestion Benchmark system showing both Python and Node.js implementations.',
    components: [
      {
        name: 'WebSocket Feeds',
        icon: '🌐',
        description: 'Real-time market data sources'
      },
      {
        name: 'Python Implementation',
        icon: '🐍',
        description: 'asyncio + uvloop based processing'
      },
      {
        name: 'Node.js Implementation',
        icon: '🟢',
        description: 'Clustering + worker threads'
      },
      {
        name: 'Redis Cache',
        icon: '🗄️',
        description: 'Real-time data storage'
      },
      {
        name: 'PostgreSQL',
        icon: '🐘',
        description: 'Historical data persistence'
      }
    ],
    diagram: `
graph TB
    subgraph "Data Sources"
        WS1[WebSocket Feed 1]
        WS2[WebSocket Feed 2]
        WS3[WebSocket Feed N]
    end
    
    subgraph "Python Implementation"
        PC[Connection Manager<br/>websockets + asyncio]
        PP[Message Processor<br/>msgpack + uvloop]
        PS[Storage Manager<br/>aioredis + asyncpg]
        PM[Metrics Collector<br/>prometheus_client]
    end
    
    subgraph "Node.js Implementation"
        NC[Connection Manager<br/>ws + clustering]
        NP[Message Processor<br/>msgpack5 + workers]
        NS[Storage Manager<br/>ioredis + pg]
        NM[Metrics Collector<br/>prom-client]
    end
    
    subgraph "Storage Layer"
        Redis[(Redis<br/>Real-time Data)]
        PostgreSQL[(PostgreSQL<br/>Historical Data)]
    end
    
    subgraph "Monitoring"
        Prometheus[Prometheus<br/>Metrics Collection]
        Grafana[Grafana<br/>Visualization]
    end
    
    WS1 --> PC
    WS2 --> PC
    WS3 --> PC
    
    WS1 --> NC
    WS2 --> NC
    WS3 --> NC
    
    PC --> PP --> PS
    NC --> NP --> NS
    
    PS --> Redis
    PS --> PostgreSQL
    NS --> Redis
    NS --> PostgreSQL
    
    PM --> Prometheus
    NM --> Prometheus
    Prometheus --> Grafana
    
    PP --> PM
    NP --> NM
    
    classDef python fill:#3776ab,stroke:#2d5aa0,stroke-width:2px,color:#fff
    classDef nodejs fill:#339933,stroke:#2d7a2d,stroke-width:2px,color:#fff
    classDef storage fill:#ff6b6b,stroke:#e55555,stroke-width:2px,color:#fff
    classDef monitoring fill:#4ecdc4,stroke:#45b7aa,stroke-width:2px,color:#fff
    
    class PC,PP,PS,PM python
    class NC,NP,NS,NM nodejs
    class Redis,PostgreSQL storage
    class Prometheus,Grafana monitoring
    `
  },
  
  dataflow: {
    title: 'Message Processing Data Flow',
    description: 'Detailed view of how messages flow through the system from ingestion to storage.',
    components: [
      {
        name: 'WebSocket Client',
        icon: '📡',
        description: 'Receives real-time market data'
      },
      {
        name: 'Message Parser',
        icon: '⚙️',
        description: 'Parses and validates messages'
      },
      {
        name: 'Latency Tracker',
        icon: '⏱️',
        description: 'Measures processing latency'
      },
      {
        name: 'Circular Buffer',
        icon: '🔄',
        description: 'In-memory message buffer'
      },
      {
        name: 'Batch Processor',
        icon: '📦',
        description: 'Batches messages for efficiency'
      }
    ],
    diagram: `
graph LR
    subgraph "Ingestion"
        WS[WebSocket<br/>Client] --> CM[Connection<br/>Manager]
        CM --> MP[Message<br/>Parser]
    end
    
    subgraph "Processing"
        MP --> LT[Latency<br/>Tracker]
        LT --> CB[Circular<br/>Buffer]
        CB --> BP[Batch<br/>Processor]
        BP --> BPH[Backpressure<br/>Handler]
    end
    
    subgraph "Storage"
        BPH --> RC[Redis<br/>Cache]
        BPH --> PG[PostgreSQL<br/>Database]
        RC --> AGG[Aggregation<br/>Service]
        PG --> HIST[Historical<br/>Analytics]
    end
    
    subgraph "Monitoring"
        LT --> MET[Metrics<br/>Collector]
        MET --> PROM[Prometheus<br/>Export]
    end
    
    classDef ingestion fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef processing fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef storage fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef monitoring fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    
    class WS,CM,MP ingestion
    class LT,CB,BP,BPH processing
    class RC,PG,AGG,HIST storage
    class MET,PROM monitoring
    `
  },
  
  deployment: {
    title: 'Deployment Architecture',
    description: 'Container-based deployment showing how components are distributed across infrastructure.',
    components: [
      {
        name: 'Load Balancer',
        icon: '⚖️',
        description: 'Distributes traffic across instances'
      },
      {
        name: 'Application Containers',
        icon: '📦',
        description: 'Dockerized Python/Node.js apps'
      },
      {
        name: 'Redis Cluster',
        icon: '🔗',
        description: 'Distributed caching layer'
      },
      {
        name: 'Database Cluster',
        icon: '🗃️',
        description: 'PostgreSQL with replication'
      }
    ],
    diagram: `
graph TB
    subgraph "Load Balancer"
        LB[NGINX<br/>Load Balancer]
    end
    
    subgraph "Application Tier"
        PY1[Python App 1<br/>Container]
        PY2[Python App 2<br/>Container]
        JS1[Node.js App 1<br/>Container]
        JS2[Node.js App 2<br/>Container]
    end
    
    subgraph "Cache Tier"
        R1[Redis Master]
        R2[Redis Replica 1]
        R3[Redis Replica 2]
    end
    
    subgraph "Database Tier"
        PG1[PostgreSQL<br/>Primary]
        PG2[PostgreSQL<br/>Replica]
    end
    
    subgraph "Monitoring Tier"
        PROM[Prometheus]
        GRAF[Grafana]
        ALERT[AlertManager]
    end
    
    LB --> PY1
    LB --> PY2
    LB --> JS1
    LB --> JS2
    
    PY1 --> R1
    PY2 --> R1
    JS1 --> R1
    JS2 --> R1
    
    R1 --> R2
    R1 --> R3
    
    PY1 --> PG1
    PY2 --> PG1
    JS1 --> PG1
    JS2 --> PG1
    
    PG1 --> PG2
    
    PY1 --> PROM
    PY2 --> PROM
    JS1 --> PROM
    JS2 --> PROM
    
    PROM --> GRAF
    PROM --> ALERT
    
    classDef lb fill:#ff9800,stroke:#f57c00,stroke-width:2px,color:#fff
    classDef app fill:#2196f3,stroke:#1976d2,stroke-width:2px,color:#fff
    classDef cache fill:#e91e63,stroke:#c2185b,stroke-width:2px,color:#fff
    classDef db fill:#4caf50,stroke:#388e3c,stroke-width:2px,color:#fff
    classDef monitor fill:#9c27b0,stroke:#7b1fa2,stroke-width:2px,color:#fff
    
    class LB lb
    class PY1,PY2,JS1,JS2 app
    class R1,R2,R3 cache
    class PG1,PG2 db
    class PROM,GRAF,ALERT monitor
    `
  },
  
  monitoring: {
    title: 'Monitoring and Observability',
    description: 'Comprehensive monitoring setup with metrics collection, alerting, and visualization.',
    components: [
      {
        name: 'Application Metrics',
        icon: '📊',
        description: 'Custom business metrics'
      },
      {
        name: 'System Metrics',
        icon: '🖥️',
        description: 'CPU, memory, network stats'
      },
      {
        name: 'Log Aggregation',
        icon: '📝',
        description: 'Centralized logging'
      },
      {
        name: 'Alerting',
        icon: '🚨',
        description: 'Proactive issue detection'
      }
    ],
    diagram: `
graph TB
    subgraph "Applications"
        APP1[Python App<br/>Metrics Export]
        APP2[Node.js App<br/>Metrics Export]
    end
    
    subgraph "System Monitoring"
        NODE[Node Exporter<br/>System Metrics]
        REDIS_EXP[Redis Exporter<br/>Cache Metrics]
        PG_EXP[PostgreSQL Exporter<br/>DB Metrics]
    end
    
    subgraph "Log Collection"
        FLUENTD[Fluentd<br/>Log Collector]
        ELASTIC[Elasticsearch<br/>Log Storage]
        KIBANA[Kibana<br/>Log Analysis]
    end
    
    subgraph "Metrics & Alerting"
        PROM[Prometheus<br/>Metrics Storage]
        GRAF[Grafana<br/>Dashboards]
        ALERT[AlertManager<br/>Notifications]
    end
    
    subgraph "External Services"
        SLACK[Slack<br/>Notifications]
        EMAIL[Email<br/>Alerts]
        PAGER[PagerDuty<br/>Escalation]
    end
    
    APP1 --> PROM
    APP2 --> PROM
    NODE --> PROM
    REDIS_EXP --> PROM
    PG_EXP --> PROM
    
    APP1 --> FLUENTD
    APP2 --> FLUENTD
    FLUENTD --> ELASTIC
    ELASTIC --> KIBANA
    
    PROM --> GRAF
    PROM --> ALERT
    
    ALERT --> SLACK
    ALERT --> EMAIL
    ALERT --> PAGER
    
    classDef app fill:#2196f3,stroke:#1976d2,stroke-width:2px,color:#fff
    classDef system fill:#ff9800,stroke:#f57c00,stroke-width:2px,color:#fff
    classDef logs fill:#4caf50,stroke:#388e3c,stroke-width:2px,color:#fff
    classDef metrics fill:#9c27b0,stroke:#7b1fa2,stroke-width:2px,color:#fff
    classDef external fill:#607d8b,stroke:#455a64,stroke-width:2px,color:#fff
    
    class APP1,APP2 app
    class NODE,REDIS_EXP,PG_EXP system
    class FLUENTD,ELASTIC,KIBANA logs
    class PROM,GRAF,ALERT metrics
    class SLACK,EMAIL,PAGER external
    `
  }
}

const currentView = computed(() => viewConfigs[activeView.value])

function setActiveView(viewName) {
  activeView.value = viewName
  highlightedComponent.value = null
  nextTick(() => {
    renderDiagram()
  })
}

function highlightComponent(componentName) {
  highlightedComponent.value = highlightedComponent.value === componentName ? null : componentName
}

async function renderDiagram() {
  if (!mermaidContainer.value) return
  
  try {
    // Clear previous diagram
    mermaidContainer.value.innerHTML = ''
    
    // Create new diagram element
    const diagramElement = document.createElement('div')
    diagramElement.className = 'mermaid'
    diagramElement.textContent = currentView.value.diagram
    
    mermaidContainer.value.appendChild(diagramElement)
    
    // Render with mermaid
    await mermaid.run({
      querySelector: '.mermaid'
    })
  } catch (error) {
    console.error('Error rendering Mermaid diagram:', error)
    mermaidContainer.value.innerHTML = '<p>Error rendering diagram</p>'
  }
}

onMounted(async () => {
  // Initialize Mermaid
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#1d4ed8',
      lineColor: '#6b7280',
      sectionBkgColor: '#f8fafc',
      altSectionBkgColor: '#ffffff',
      gridColor: '#e5e7eb',
      secondaryColor: '#10b981',
      tertiaryColor: '#f59e0b'
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis'
    }
  })
  
  await nextTick()
  renderDiagram()
})
</script>

<style scoped>
.system-diagram {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  margin: 16px 0;
  background-color: var(--vp-c-bg-soft);
  overflow: hidden;
}

.diagram-controls {
  display: flex;
  gap: 0;
  background-color: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-border);
}

.view-button {
  padding: 12px 16px;
  border: none;
  background-color: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.25s;
  font-size: 0.875rem;
  border-right: 1px solid var(--vp-c-border);
}

.view-button:hover {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.view-button.active {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.view-button:last-child {
  border-right: none;
}

.diagram-container {
  display: grid;
  grid-template-columns: 1fr 300px;
  min-height: 500px;
}

.mermaid-wrapper {
  padding: 20px;
  overflow: auto;
  background-color: var(--vp-c-bg);
}

.mermaid-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.diagram-info {
  border-left: 1px solid var(--vp-c-border);
  background-color: var(--vp-c-bg-alt);
}

.info-panel {
  padding: 20px;
}

.info-panel h4 {
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
  font-size: 1.125rem;
}

.info-panel p {
  margin: 0 0 16px 0;
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
  line-height: 1.5;
}

.component-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.component-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background-color: var(--vp-c-bg);
  cursor: pointer;
  transition: all 0.25s;
}

.component-item:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
}

.component-item.highlighted {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
}

.component-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.component-details {
  flex: 1;
  min-width: 0;
}

.component-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  margin-bottom: 2px;
}

.component-desc {
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  line-height: 1.3;
}

@media (max-width: 1024px) {
  .diagram-container {
    grid-template-columns: 1fr;
  }
  
  .diagram-info {
    border-left: none;
    border-top: 1px solid var(--vp-c-border);
  }
  
  .mermaid-wrapper {
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .diagram-controls {
    flex-wrap: wrap;
  }
  
  .view-button {
    flex: 1;
    min-width: 120px;
    border-right: none;
    border-bottom: 1px solid var(--vp-c-border);
  }
  
  .view-button:nth-child(even) {
    border-right: 1px solid var(--vp-c-border);
  }
  
  .info-panel {
    padding: 16px;
  }
  
  .component-list {
    gap: 6px;
  }
  
  .component-item {
    padding: 8px;
  }
}

/* Mermaid diagram styling */
:deep(.mermaid) {
  max-width: 100%;
}

:deep(.mermaid svg) {
  max-width: 100%;
  height: auto;
}
</style>