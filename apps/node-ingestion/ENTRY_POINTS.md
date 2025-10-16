# Application Entry Points

## Single Source of Truth: `src/app.js`

This application now uses a **unified entry point** that supports multiple modes through configuration rather than separate files.

## Application Modes

### 1. Simple Mode (`APP_MODE=simple`)
- Basic HTTP server with minimal dependencies
- No complex configuration or logging
- Perfect for development and testing
- Uses Node.js built-in modules only

### 2. Full Mode (`APP_MODE=full`) - **Default**
- Complete application with all features
- Full configuration system with joi validation
- Structured logging with winston
- Error handling and recovery
- Service management

### 3. Cluster Mode (`APP_MODE=cluster`)
- Multi-process clustering for production
- Automatic worker management
- Graceful shutdown handling
- Load balancing across CPU cores

## Usage

### Command Line
```bash
# Default (full mode)
npm start

# Specific modes
npm run start:simple
npm run start:full
npm run start:cluster

# Development with debugging
npm run dev
```

### Environment Variable
```bash
# Set mode via environment
APP_MODE=simple node src/app.js
APP_MODE=full node src/app.js
APP_MODE=cluster node src/app.js
```

### Docker
```bash
# Default mode (full)
docker run my-app

# Override mode
docker run -e APP_MODE=simple my-app
docker run -e APP_MODE=cluster my-app
```

### Docker Compose
```yaml
services:
  app-simple:
    environment:
      - APP_MODE=simple
  
  app-cluster:
    environment:
      - APP_MODE=cluster
      - CLUSTER_WORKERS=4
```

## Benefits

✅ **Single source of truth** - One entry point, no confusion  
✅ **Environment-driven** - Mode controlled by configuration  
✅ **Consistent deployment** - Same Docker image, different modes  
✅ **Easy testing** - Simple mode for quick tests  
✅ **Production ready** - Cluster mode for high performance  
✅ **Maintainable** - No duplicate code across entry points  

## Migration from Old Entry Points

| Old File | New Equivalent |
|----------|----------------|
| `simple-app.js` | `APP_MODE=simple src/app.js` |
| `src/index.js` | `APP_MODE=full src/app.js` |
| `src/cluster.js` | `APP_MODE=cluster src/app.js` |

## Configuration

All modes respect the same environment variables:
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (for full/cluster modes)
- `REDIS_URL` - Redis connection (for full/cluster modes)
- `POSTGRES_URL` - PostgreSQL connection (for full/cluster modes)