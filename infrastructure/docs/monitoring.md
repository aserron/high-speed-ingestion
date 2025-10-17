# Monitoring Stack Setup Guide

## Overview

The finance ingestion benchmark includes a comprehensive monitoring stack with Prometheus for metrics collection, Grafana for visualization, and Alertmanager for notifications.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Applications   │───▶│   Prometheus    │───▶│    Grafana      │
│                 │    │                 │    │                 │
│ • Python        │    │ • Metrics       │    │ • Dashboards    │
│ • Node.js       │    │ • Alerts        │    │ • Visualization │
│ • Dashboard     │    │ • Rules         │    │ • Notifications │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Alertmanager   │
                       │                 │
                       │ • Routing       │
                       │ • Grouping      │
                       │ • Notifications │
                       └─────────────────┘
```

## Components

### Prometheus (Port 9090)

**Purpose**: Metrics collection and alert rule evaluation

**Configuration**: `infrastructure/monitoring/prometheus/prometheus.yml`

**Key Features**:
- Scrapes metrics from all services every 5-15 seconds
- Evaluates alert rules continuously
- Stores time-series data for querying
- Provides PromQL query interface

**Endpoints**:
- Web UI: http://localhost:9090
- Metrics: http://localhost:9090/metrics
- Health: http://localhost:9090/-/healthy

### Grafana (Port 3000)

**Purpose**: Metrics visualization and dashboard management

**Configuration**: `infrastructure/monitoring/grafana/`

**Default Credentials**: admin/admin

**Key Features**:
- Pre-configured Prometheus datasource
- Automated dashboard provisioning
- Finance ingestion overview dashboard
- Alert notification management

**Endpoints**:
- Web UI: http://localhost:3000
- Health: http://localhost:3000/api/health

### Alertmanager

**Purpose**: Alert routing and notification management

**Configuration**: `infrastructure/monitoring/alerts/alertmanager.yml`

**Key Features**:
- Alert grouping and deduplication
- Notification routing
- Silence management
- Integration with external systems

## Setup Instructions

### 1. Start Monitoring Stack

The monitoring stack starts automatically with the infrastructure:

```bash
# Development environment
npm run docker:dev

# Production environment
npm run docker:prod
```

### 2. Access Monitoring Tools

**Grafana Dashboard**:
1. Open http://localhost:3000
2. Login with admin/admin
3. Navigate to "Finance Ingestion" folder
4. Open "Finance Ingestion Overview" dashboard

**Prometheus**:
1. Open http://localhost:9090
2. Use the query interface to explore metrics
3. Check "Status" → "Targets" to verify service discovery

### 3. Verify Metrics Collection

Check that all services are being scraped:

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query specific metrics
curl 'http://localhost:9090/api/v1/query?query=up'
```

## Available Metrics

### Application Metrics

**Python Ingestion Service**:
- `messages_processed_total` - Total messages processed
- `processing_duration_seconds` - Processing latency histogram
- `websocket_connections_active` - Active WebSocket connections
- `memory_usage_bytes` - Memory consumption
- `cpu_usage_percent` - CPU utilization

**Node.js Ingestion Service**:
- `messages_processed_total` - Total messages processed
- `processing_duration_seconds` - Processing latency histogram
- `websocket_connections_active` - Active WebSocket connections
- `heap_used_bytes` - Heap memory usage
- `event_loop_lag_seconds` - Event loop lag

**Dashboard Service**:
- `http_requests_total` - HTTP request count
- `http_request_duration_seconds` - Request duration
- `active_connections` - Active connections

### Infrastructure Metrics

**Redis**:
- `redis_connected_clients` - Connected clients
- `redis_used_memory_bytes` - Memory usage
- `redis_commands_processed_total` - Commands processed

**PostgreSQL**:
- `postgres_connections_active` - Active connections
- `postgres_queries_total` - Query count
- `postgres_database_size_bytes` - Database size

## Dashboards

### Finance Ingestion Overview

**Location**: `infrastructure/monitoring/grafana/dashboards/finance-ingestion-overview.json`

**Panels**:
1. **Service Health** - Up/down status of all services
2. **Message Processing Rate** - Messages per second
3. **Processing Latency** - 95th percentile latency
4. **Resource Usage** - CPU and memory consumption
5. **Error Rates** - Error percentage over time

### Custom Dashboards

To add custom dashboards:

1. Create JSON file in `infrastructure/monitoring/grafana/dashboards/`
2. Restart Grafana service
3. Dashboard will be automatically provisioned

Example dashboard structure:
```json
{
  "dashboard": {
    "title": "Custom Dashboard",
    "panels": [
      {
        "title": "Custom Panel",
        "type": "graph",
        "targets": [
          {
            "expr": "your_metric_query",
            "legendFormat": "Legend"
          }
        ]
      }
    ]
  }
}
```

## Alerting

### Alert Rules

**Location**: `infrastructure/monitoring/prometheus/rules/finance-ingestion-alerts.yml`

**Configured Alerts**:
- **ServiceDown**: Service unavailable for >30 seconds
- **HighProcessingLatency**: 95th percentile >1ms for >2 minutes
- **LowMessageRate**: <100 messages/sec for >5 minutes
- **RedisDown**: Redis unavailable for >30 seconds
- **PostgresDown**: PostgreSQL unavailable for >30 seconds

### Alert Configuration

To add new alerts:

1. Edit `infrastructure/monitoring/prometheus/rules/finance-ingestion-alerts.yml`
2. Add new rule to appropriate group
3. Restart Prometheus service

Example alert rule:
```yaml
- alert: HighMemoryUsage
  expr: memory_usage_bytes / memory_limit_bytes > 0.9
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage detected"
    description: "{{ $labels.job }} memory usage is {{ $value }}%"
```

### Notification Channels

**Webhook Integration**:
```yaml
receivers:
  - name: 'webhook'
    webhook_configs:
      - url: 'http://your-webhook-url'
        send_resolved: true
```

**Email Integration**:
```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@yourcompany.com'
        subject: 'Finance Ingestion Alert'
        body: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

## Troubleshooting

### Common Issues

**1. Metrics Not Appearing**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify service endpoints
curl http://localhost:8001/metrics
curl http://localhost:8002/metrics
```

**2. Grafana Dashboard Empty**
- Verify Prometheus datasource connection
- Check dashboard time range
- Confirm metrics are being collected

**3. Alerts Not Firing**
```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Verify alert expressions
curl 'http://localhost:9090/api/v1/query?query=up{job="python-ingestion"}'
```

### Log Analysis

**Prometheus Logs**:
```bash
docker-compose logs prometheus
```

**Grafana Logs**:
```bash
docker-compose logs grafana
```

### Performance Tuning

**Prometheus Configuration**:
- Adjust scrape intervals based on requirements
- Configure retention policies for storage
- Optimize query performance

**Grafana Optimization**:
- Use appropriate time ranges
- Limit dashboard refresh rates
- Optimize panel queries

## Advanced Configuration

### Custom Metrics

To add custom metrics to your application:

**Python (using prometheus_client)**:
```python
from prometheus_client import Counter, Histogram, start_http_server

# Define metrics
REQUEST_COUNT = Counter('requests_total', 'Total requests')
REQUEST_LATENCY = Histogram('request_duration_seconds', 'Request latency')

# Use metrics
REQUEST_COUNT.inc()
with REQUEST_LATENCY.time():
    # Your code here
    pass
```

**Node.js (using prom-client)**:
```javascript
const client = require('prom-client');

// Define metrics
const requestCount = new client.Counter({
  name: 'requests_total',
  help: 'Total requests'
});

const requestLatency = new client.Histogram({
  name: 'request_duration_seconds',
  help: 'Request latency'
});

// Use metrics
requestCount.inc();
const end = requestLatency.startTimer();
// Your code here
end();
```

### Service Discovery

For dynamic service discovery, configure Prometheus with:

```yaml
scrape_configs:
  - job_name: 'docker'
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        port: 8080
    relabel_configs:
      - source_labels: [__meta_docker_container_label_monitoring]
        target_label: __metrics_path__
        replacement: /metrics
```

### High Availability

For production high availability:

1. **Prometheus HA**: Deploy multiple Prometheus instances
2. **Grafana HA**: Use external database for Grafana
3. **Alertmanager Cluster**: Configure Alertmanager clustering
4. **Load Balancing**: Use load balancer for Grafana access

## Security

### Authentication

**Grafana**:
- Change default admin password
- Configure LDAP/OAuth integration
- Set up role-based access control

**Prometheus**:
- Enable basic authentication
- Configure TLS encryption
- Restrict network access

### Network Security

```yaml
# Restrict Prometheus access
prometheus:
  networks:
    - monitoring
  # Don't expose port to host in production
```

## Backup and Recovery

### Prometheus Data
```bash
# Backup Prometheus data
docker exec finance-prometheus tar -czf /tmp/prometheus-backup.tar.gz /prometheus

# Restore Prometheus data
docker exec finance-prometheus tar -xzf /tmp/prometheus-backup.tar.gz -C /
```

### Grafana Configuration
```bash
# Backup Grafana data
docker exec finance-grafana tar -czf /tmp/grafana-backup.tar.gz /var/lib/grafana

# Export dashboards
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/dashboards/db/finance-ingestion-overview
```