# Dashboard App

Real-time monitoring dashboard for finance ingestion services.

## Features

- Real-time service health monitoring
- Auto-refresh every 30 seconds
- CORS-enabled for cross-origin requests
- Clean, responsive UI
- Direct links to service endpoints

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access dashboard
open http://localhost:8080
```

## Production

```bash
# Build and start
npm run build
npm start
```

## Docker

```bash
# Build image
docker build -t finance-dashboard .

# Run container
docker run -p 8080:8080 finance-dashboard
```

## Services Monitored

- Python Ingestion Service (port 8001)
- Node.js Ingestion Service (port 8002)
- Prometheus (port 9090)
- Grafana (port 3000)
- PostgreSQL (port 5432)
- Redis (port 6379)