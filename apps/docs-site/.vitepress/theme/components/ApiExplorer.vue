<template>
  <div class="api-explorer">
    <div class="explorer-header">
      <h3>Interactive API Explorer</h3>
      <div class="implementation-toggle">
        <button 
          @click="setImplementation('python')"
          :class="['impl-button', { active: activeImplementation === 'python' }]"
        >
          🐍 Python
        </button>
        <button 
          @click="setImplementation('nodejs')"
          :class="['impl-button', { active: activeImplementation === 'nodejs' }]"
        >
          🟢 Node.js
        </button>
      </div>
    </div>
    
    <div class="explorer-content">
      <div class="endpoint-list">
        <div 
          v-for="endpoint in endpoints" 
          :key="endpoint.path"
          @click="selectEndpoint(endpoint)"
          :class="['endpoint-item', { active: selectedEndpoint?.path === endpoint.path }]"
        >
          <span :class="['method', endpoint.method.toLowerCase()]">{{ endpoint.method }}</span>
          <span class="path">{{ endpoint.path }}</span>
        </div>
      </div>
      
      <div class="endpoint-details" v-if="selectedEndpoint">
        <div class="endpoint-header">
          <span :class="['method-badge', selectedEndpoint.method.toLowerCase()]">
            {{ selectedEndpoint.method }}
          </span>
          <span class="endpoint-path">{{ selectedEndpoint.path }}</span>
        </div>
        
        <div class="endpoint-description">
          <p>{{ selectedEndpoint.description }}</p>
        </div>
        
        <div class="try-it-section">
          <div class="request-section">
            <h4>Request</h4>
            <div class="url-bar">
              <span class="base-url">{{ baseUrl }}</span>
              <span class="endpoint-url">{{ selectedEndpoint.path }}</span>
              <button @click="sendRequest" class="try-button" :disabled="loading">
                {{ loading ? 'Sending...' : 'Try it' }}
              </button>
            </div>
            
            <div v-if="selectedEndpoint.parameters" class="parameters">
              <h5>Parameters</h5>
              <div v-for="param in selectedEndpoint.parameters" :key="param.name" class="parameter">
                <label>{{ param.name }} <span v-if="param.required" class="required">*</span></label>
                <input 
                  v-model="parameterValues[param.name]"
                  :type="param.type"
                  :placeholder="param.example"
                  class="param-input"
                />
                <small>{{ param.description }}</small>
              </div>
            </div>
          </div>
          
          <div class="response-section">
            <h4>Response</h4>
            <div class="response-container">
              <div v-if="loading" class="loading">
                <div class="spinner"></div>
                <span>Sending request...</span>
              </div>
              
              <div v-else-if="response" class="response-content">
                <div class="response-status" :class="getStatusClass(response.status)">
                  {{ response.status }} {{ response.statusText }}
                </div>
                <pre class="response-body">{{ formatResponse(response.data) }}</pre>
              </div>
              
              <div v-else class="no-response">
                Click "Try it" to send a request
              </div>
            </div>
          </div>
        </div>
        
        <div class="code-examples">
          <h4>Code Examples</h4>
          <div class="code-tabs">
            <button 
              v-for="lang in codeLanguages" 
              :key="lang"
              @click="activeCodeLang = lang"
              :class="['code-tab', { active: activeCodeLang === lang }]"
            >
              {{ lang }}
            </button>
          </div>
          <div class="code-content">
            <pre><code>{{ getCodeExample(selectedEndpoint, activeCodeLang) }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

const activeImplementation = ref('python')
const selectedEndpoint = ref(null)
const loading = ref(false)
const response = ref(null)
const activeCodeLang = ref('curl')
const parameterValues = reactive({})

const codeLanguages = ['curl', 'python', 'javascript', 'go']

const baseUrl = computed(() => {
  return activeImplementation.value === 'python' 
    ? 'http://localhost:3001' 
    : 'http://localhost:3002'
})

const endpoints = [
  {
    method: 'GET',
    path: '/health',
    description: 'Get application health status and connection information',
    response: {
      status: 'healthy',
      timestamp: '2024-01-15T10:30:00.000Z',
      uptime: 3600.123,
      connections: {
        redis: 'connected',
        postgresql: 'connected',
        websocket: 'connected'
      }
    }
  },
  {
    method: 'GET',
    path: '/metrics',
    description: 'Get Prometheus-formatted metrics for monitoring',
    response: `# HELP finance_ingestion_messages_total Total messages processed
# TYPE finance_ingestion_messages_total counter
finance_ingestion_messages_total 150000

# HELP finance_ingestion_latency_seconds Processing latency
# TYPE finance_ingestion_latency_seconds histogram
finance_ingestion_latency_seconds_bucket{le="0.001"} 120000`
  },
  {
    method: 'GET',
    path: '/stats',
    description: 'Get detailed performance statistics in human-readable format',
    response: {
      latency: {
        p50: 0.45,
        p95: 0.78,
        p99: 1.23,
        unit: 'milliseconds'
      },
      throughput: {
        current: 2500,
        peak: 12000,
        average: 8500,
        unit: 'messages_per_second'
      }
    }
  },
  {
    method: 'GET',
    path: '/config',
    description: 'Get current application configuration',
    response: {
      websocket: {
        urls: ['wss://feed1.example.com'],
        maxRetries: 10
      },
      processing: {
        batchSize: 100,
        maxLatencyMs: 1.0
      }
    }
  },
  {
    method: 'POST',
    path: '/config',
    description: 'Update application configuration',
    parameters: [
      {
        name: 'batchSize',
        type: 'number',
        required: false,
        example: '100',
        description: 'Number of messages to batch together'
      },
      {
        name: 'maxLatencyMs',
        type: 'number',
        required: false,
        example: '1.0',
        description: 'Maximum acceptable latency in milliseconds'
      }
    ],
    response: {
      success: true,
      message: 'Configuration updated successfully'
    }
  }
]

function setImplementation(impl) {
  activeImplementation.value = impl
  response.value = null
}

function selectEndpoint(endpoint) {
  selectedEndpoint.value = endpoint
  response.value = null
  
  // Initialize parameter values
  if (endpoint.parameters) {
    endpoint.parameters.forEach(param => {
      if (!(param.name in parameterValues)) {
        parameterValues[param.name] = param.example || ''
      }
    })
  }
}

async function sendRequest() {
  if (!selectedEndpoint.value) return
  
  loading.value = true
  
  // Simulate API request
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Mock response based on endpoint
  response.value = {
    status: 200,
    statusText: 'OK',
    data: selectedEndpoint.value.response
  }
  
  loading.value = false
}

function getStatusClass(status) {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 400 && status < 500) return 'client-error'
  if (status >= 500) return 'server-error'
  return 'info'
}

function formatResponse(data) {
  if (typeof data === 'string') return data
  return JSON.stringify(data, null, 2)
}

function getCodeExample(endpoint, language) {
  const url = `${baseUrl.value}${endpoint.path}`
  
  switch (language) {
    case 'curl':
      if (endpoint.method === 'GET') {
        return `curl -X GET "${url}" \\
  -H "Accept: application/json"`
      } else {
        return `curl -X ${endpoint.method} "${url}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '${JSON.stringify(getRequestBody(endpoint), null, 2)}'`
      }
      
    case 'python':
      if (endpoint.method === 'GET') {
        return `import requests

response = requests.get("${url}")
print(response.json())`
      } else {
        return `import requests

data = ${JSON.stringify(getRequestBody(endpoint), null, 2)}
response = requests.${endpoint.method.toLowerCase()}("${url}", json=data)
print(response.json())`
      }
      
    case 'javascript':
      if (endpoint.method === 'GET') {
        return `fetch('${url}')
  .then(response => response.json())
  .then(data => console.log(data))`
      } else {
        return `fetch('${url}', {
  method: '${endpoint.method}',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${JSON.stringify(getRequestBody(endpoint), null, 2)})
})
.then(response => response.json())
.then(data => console.log(data))`
      }
      
    case 'go':
      return `package main

import (
    "fmt"
    "net/http"
    "io/ioutil"
)

func main() {
    resp, err := http.Get("${url}")
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
    
    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        panic(err)
    }
    
    fmt.Println(string(body))
}`
      
    default:
      return 'Code example not available for this language'
  }
}

function getRequestBody(endpoint) {
  if (!endpoint.parameters) return {}
  
  const body = {}
  endpoint.parameters.forEach(param => {
    if (parameterValues[param.name]) {
      body[param.name] = parameterValues[param.name]
    }
  })
  return body
}

// Select first endpoint by default
if (endpoints.length > 0) {
  selectEndpoint(endpoints[0])
}
</script>

<style scoped>
.api-explorer {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  margin: 16px 0;
  background-color: var(--vp-c-bg-soft);
  overflow: hidden;
}

.explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-border);
}

.explorer-header h3 {
  margin: 0;
  color: var(--vp-c-text-1);
}

.implementation-toggle {
  display: flex;
  gap: 8px;
}

.impl-button {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.25s;
  font-size: 0.875rem;
}

.impl-button:hover {
  border-color: var(--vp-c-brand-1);
}

.impl-button.active {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
}

.explorer-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  min-height: 600px;
}

.endpoint-list {
  background-color: var(--vp-c-bg);
  border-right: 1px solid var(--vp-c-border);
  overflow-y: auto;
}

.endpoint-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.25s;
  border-bottom: 1px solid var(--vp-c-border);
}

.endpoint-item:hover {
  background-color: var(--vp-c-bg-soft);
}

.endpoint-item.active {
  background-color: var(--vp-c-brand-soft);
  border-left: 3px solid var(--vp-c-brand-1);
}

.method {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
  min-width: 45px;
  text-align: center;
}

.method.get { background-color: #10b981; }
.method.post { background-color: #3b82f6; }
.method.put { background-color: #f59e0b; }
.method.delete { background-color: #ef4444; }

.path {
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}

.endpoint-details {
  padding: 20px;
  overflow-y: auto;
}

.endpoint-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.method-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
}

.method-badge.get { background-color: #10b981; }
.method-badge.post { background-color: #3b82f6; }
.method-badge.put { background-color: #f59e0b; }
.method-badge.delete { background-color: #ef4444; }

.endpoint-path {
  font-family: var(--vp-font-family-mono);
  font-size: 1.125rem;
  color: var(--vp-c-text-1);
}

.endpoint-description {
  margin-bottom: 24px;
}

.endpoint-description p {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.try-it-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.request-section h4,
.response-section h4 {
  margin: 0 0 12px 0;
  color: var(--vp-c-text-1);
}

.url-bar {
  display: flex;
  align-items: center;
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
}

.base-url {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
}

.endpoint-url {
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  flex: 1;
}

.try-button {
  padding: 6px 12px;
  background-color: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-left: 12px;
}

.try-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.parameters {
  margin-top: 16px;
}

.parameters h5 {
  margin: 0 0 12px 0;
  color: var(--vp-c-text-1);
}

.parameter {
  margin-bottom: 12px;
}

.parameter label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}

.required {
  color: var(--vp-c-danger-1);
}

.param-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}

.parameter small {
  display: block;
  margin-top: 4px;
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
}

.response-container {
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  min-height: 200px;
  padding: 16px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--vp-c-text-2);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--vp-c-border);
  border-top: 2px solid var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.response-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 12px;
  display: inline-block;
}

.response-status.success {
  background-color: #10b981;
  color: white;
}

.response-status.client-error {
  background-color: #f59e0b;
  color: white;
}

.response-status.server-error {
  background-color: #ef4444;
  color: white;
}

.response-body {
  background-color: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  padding: 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  color: var(--vp-c-text-1);
}

.no-response {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.code-examples h4 {
  margin: 0 0 12px 0;
  color: var(--vp-c-text-1);
}

.code-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--vp-c-border);
}

.code-tab {
  padding: 8px 16px;
  border: none;
  background-color: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.25s;
  border-bottom: 2px solid transparent;
}

.code-tab:hover {
  color: var(--vp-c-text-1);
}

.code-tab.active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}

.code-content {
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
}

.code-content pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
}

.code-content code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}

@media (max-width: 1024px) {
  .explorer-content {
    grid-template-columns: 1fr;
  }
  
  .endpoint-list {
    border-right: none;
    border-bottom: 1px solid var(--vp-c-border);
    max-height: 200px;
  }
  
  .try-it-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .explorer-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .implementation-toggle {
    justify-content: center;
  }
  
  .endpoint-details {
    padding: 16px;
  }
  
  .url-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .try-button {
    margin-left: 0;
  }
}
</style>