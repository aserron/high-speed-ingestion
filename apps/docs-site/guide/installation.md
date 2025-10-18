# Installation Guide

This comprehensive installation guide will help you set up the Finance Ingestion Benchmark project on your development machine.

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Linux, macOS, or Windows 10+ |
| **CPU** | 2+ cores, 2.0GHz+ |
| **Memory** | 8GB RAM |
| **Storage** | 10GB free space (SSD recommended) |
| **Network** | Stable internet connection |

### Recommended Requirements

| Component | Recommendation |
|-----------|----------------|
| **Operating System** | Ubuntu 22.04 LTS or macOS 12+ |
| **CPU** | 4+ cores, 3.0GHz+ |
| **Memory** | 16GB RAM |
| **Storage** | 20GB free space on NVMe SSD |
| **Network** | 100Mbps+ connection |

## Prerequisites Installation

### 1. Node.js and npm

The project requires Node.js 18+ and npm 8+.

::: code-group

```bash [Ubuntu/Debian]
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher
```

```bash [macOS (Homebrew)]
# Install Node.js
brew install node@18

# Add to PATH if needed
echo 'export PATH="/opt/homebrew/opt/node@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
node --version
npm --version
```

```powershell [Windows]
# Download and install from nodejs.org
# Or use Chocolatey
choco install nodejs --version=18.19.0

# Or use winget
winget install OpenJS.NodeJS

# Verify installation
node --version
npm --version
```

:::

### 2. Python 3.11+

::: code-group

```bash [Ubuntu/Debian]
# Install Python 3.11
sudo apt update
sudo apt install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev

# Install pip
sudo apt install python3-pip

# Verify installation
python3.11 --version
pip3 --version
```

```bash [macOS (Homebrew)]
# Install Python 3.11
brew install python@3.11

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
python3.11 --version
pip3 --version
```

```powershell [Windows]
# Download from python.org or use Microsoft Store
# Or use Chocolatey
choco install python --version=3.11.7

# Or use winget
winget install Python.Python.3.11

# Verify installation
python --version
pip --version
```

:::

### 3. Docker and Docker Compose

::: code-group

```bash [Ubuntu/Debian]
# Install Docker
sudo apt update
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

```bash [macOS]
# Install Docker Desktop
brew install --cask docker

# Or download from docker.com
# Start Docker Desktop application

# Verify installation
docker --version
docker compose version
```

```powershell [Windows]
# Install Docker Desktop
# Download from docker.com and run installer
# Or use Chocolatey
choco install docker-desktop

# Or use winget
winget install Docker.DockerDesktop

# Verify installation (after restart)
docker --version
docker compose version
```

:::

### 4. Git

::: code-group

```bash [Ubuntu/Debian]
sudo apt update
sudo apt install git

git --version
```

```bash [macOS]
# Git is usually pre-installed
# Or install via Homebrew
brew install git

git --version
```

```powershell [Windows]
# Download from git-scm.com
# Or use Chocolatey
choco install git

# Or use winget
winget install Git.Git

git --version
```

:::

## Project Installation

### 1. Clone the Repository

```bash
# Clone the project
git clone <repository-url>
cd finance-ingestion-benchmark

# Verify project structure
ls -la
```

Expected output:
```
drwxr-xr-x  apps/
drwxr-xr-x  docs/
drwxr-xr-x  packages/
drwxr-xr-x  scripts/
drwxr-xr-x  tests/
-rw-r--r--  docker-compose.yml
-rw-r--r--  package.json
-rw-r--r--  README.md
-rw-r--r--  turbo.json
```

### 2. Install Node.js Dependencies

```bash
# Install root dependencies (includes Turborepo)
npm install

# This will also install dependencies for all workspaces
# Equivalent to running:
# - npm install in apps/node-ingestion/
# - npm install in packages/shared/
```

### 3. Install Python Dependencies

```bash
# Navigate to Python application
cd apps/python-ingestion

# Create virtual environment (recommended)
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Return to project root
cd ../..
```

### 4. Set Up Environment Variables

Create environment configuration files:

```bash
# Copy example environment files
cp .env.example .env
cp apps/python-ingestion/.env.example apps/python-ingestion/.env
cp apps/node-ingestion/.env.example apps/node-ingestion/.env
```

Edit the `.env` files with your configuration:

::: code-group

```bash [Root .env]
# Infrastructure settings
REDIS_HOST=localhost
REDIS_PORT=6379
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=finance_benchmark
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Application settings
PYTHON_APP_PORT=3001
NODE_APP_PORT=3002

# WebSocket settings
WEBSOCKET_URLS=wss://demo-feed.example.com/market-data

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
```

```bash [Python .env]
# Python-specific settings
HOST=0.0.0.0
PORT=3001
LOG_LEVEL=INFO
LOG_FORMAT=json

# Performance settings
ENABLE_BATCHING=true
BATCH_SIZE=100
MAX_LATENCY_MS=1.0

# WebSocket settings
WEBSOCKET_MAX_RETRIES=10
WEBSOCKET_PING_INTERVAL=20
```

```bash [Node.js .env]
# Node.js-specific settings
HOST=0.0.0.0
PORT=3002
LOG_LEVEL=info
NODE_ENV=development

# Performance settings
CLUSTER_WORKERS=0  # 0 = auto-detect CPU cores
ENABLE_BATCHING=true
BATCH_SIZE=100

# WebSocket settings
WEBSOCKET_MAX_RETRIES=10
WEBSOCKET_PING_INTERVAL=20000
```

:::

## Infrastructure Setup

### 1. Start Infrastructure Services

Start Redis and PostgreSQL using Docker Compose:

```bash
# Start infrastructure services
npm run docker:up

# Or manually:
docker compose up -d redis postgres

# Verify services are running
docker compose ps
```

Expected output:
```
NAME                    COMMAND                  SERVICE             STATUS              PORTS
finance-benchmark-postgres-1   "docker-entrypoint.s…"   postgres            running             0.0.0.0:5432->5432/tcp
finance-benchmark-redis-1      "docker-entrypoint.s…"   redis               running             0.0.0.0:6379->6379/tcp
```

### 2. Initialize Database

Set up the PostgreSQL database schema:

```bash
# Run database initialization
npm run db:init

# Or manually:
docker compose exec postgres psql -U postgres -d finance_benchmark -f /docker-entrypoint-initdb.d/init.sql
```

### 3. Verify Infrastructure

Test connections to infrastructure services:

```bash
# Test Redis connection
redis-cli ping
# Expected: PONG

# Test PostgreSQL connection
docker compose exec postgres psql -U postgres -d finance_benchmark -c "SELECT version();"
# Expected: PostgreSQL version information
```

## Application Setup

### 1. Build Applications

Build both Python and Node.js applications:

```bash
# Build all applications
npm run build

# Or build individually:
npm run build:python
npm run build:node
```

### 2. Initialize Applications

Set up application-specific configuration and dependencies:

```bash
# Initialize both applications
npm run setup

# This runs:
# - Database schema creation
# - Initial configuration setup
# - Dependency verification
```

### 3. Verify Installation

Run health checks to verify everything is working:

```bash
# Start applications in development mode
npm run dev

# In another terminal, check health endpoints
curl http://localhost:3001/health  # Python app
curl http://localhost:3002/health  # Node.js app
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.123,
  "connections": {
    "redis": "connected",
    "postgresql": "connected",
    "websocket": "disconnected"
  }
}
```

## Development Tools Setup

### 1. IDE Configuration

#### Visual Studio Code

Install recommended extensions:

```bash
# Install VS Code extensions
code --install-extension ms-python.python
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension ms-vscode.vscode-json
code --install-extension redhat.vscode-yaml
code --install-extension ms-vscode.docker
```

#### PyCharm/IntelliJ

1. Open the project root directory
2. Configure Python interpreter to use the virtual environment
3. Enable Node.js plugin
4. Configure code style settings

### 2. Git Hooks Setup

Set up pre-commit hooks for code quality:

```bash
# Install pre-commit (if using Python)
pip install pre-commit

# Install hooks
pre-commit install

# Or use npm-based hooks
npm run prepare
```

### 3. Debugging Setup

#### Python Debugging

Create `.vscode/launch.json` for Python debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Finance Ingestion",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/apps/python-ingestion/src/finance_ingestion/main.py",
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}/apps/python-ingestion",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/apps/python-ingestion/src"
      }
    }
  ]
}
```

#### Node.js Debugging

Add Node.js debugging configuration:

```json
{
  "name": "Node.js: Finance Ingestion",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/apps/node-ingestion/src/index.js",
  "cwd": "${workspaceFolder}/apps/node-ingestion",
  "env": {
    "NODE_ENV": "development"
  }
}
```

## Troubleshooting Installation Issues

### Common Issues and Solutions

#### Node.js Version Issues

```bash
# Check Node.js version
node --version

# If version is too old, update:
# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS:
brew upgrade node

# Windows:
# Download latest from nodejs.org
```

#### Python Version Issues

```bash
# Check Python version
python3.11 --version

# If not available, install:
# Ubuntu/Debian:
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.11

# macOS:
brew install python@3.11

# Windows:
# Download from python.org
```

#### Docker Issues

```bash
# Check Docker status
docker --version
docker compose version

# If Docker daemon not running:
# Linux:
sudo systemctl start docker

# macOS/Windows:
# Start Docker Desktop application

# Permission issues (Linux):
sudo usermod -aG docker $USER
newgrp docker
```

#### Port Conflicts

```bash
# Check what's using ports
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379

# Kill processes if needed
sudo kill -9 <PID>

# Or change ports in .env files
```

#### Database Connection Issues

```bash
# Check PostgreSQL logs
docker compose logs postgres

# Check Redis logs
docker compose logs redis

# Reset database
docker compose down
docker volume rm finance-benchmark_postgres_data
docker compose up -d
npm run db:init
```

#### Python Virtual Environment Issues

```bash
# Remove and recreate virtual environment
cd apps/python-ingestion
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Performance Optimization

#### System Tuning for Benchmarking

```bash
# Increase file descriptor limits (Linux)
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize network settings
echo "net.core.rmem_max = 16777216" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max = 16777216" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Disable swap for consistent performance
sudo swapoff -a
```

#### Docker Resource Allocation

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  python-ingestion:
    cpus: '2.0'
    memory: 4G
    
  node-ingestion:
    cpus: '2.0'
    memory: 4G
    
  redis:
    cpus: '1.0'
    memory: 2G
    
  postgres:
    cpus: '1.0'
    memory: 2G
```

## Verification Checklist

After installation, verify everything is working:

- [ ] Node.js 18+ installed and accessible
- [ ] Python 3.11+ installed and accessible
- [ ] Docker and Docker Compose working
- [ ] Git installed and configured
- [ ] Project cloned successfully
- [ ] Node.js dependencies installed
- [ ] Python dependencies installed in virtual environment
- [ ] Environment variables configured
- [ ] Infrastructure services (Redis, PostgreSQL) running
- [ ] Database schema initialized
- [ ] Applications build successfully
- [ ] Health endpoints respond correctly
- [ ] Development tools configured

## Next Steps

Once installation is complete:

1. **[Getting Started Guide](/guide/getting-started)** - Run your first benchmark
2. **[Configuration Guide](/guide/configuration)** - Customize settings
3. **[Development Guide](/guide/development)** - Start developing
4. **[Architecture Overview](/architecture/overview)** - Understand the system

## Getting Help

If you encounter issues during installation:

1. Check the [Troubleshooting Guide](/guide/troubleshooting)
2. Review [GitHub Issues](https://github.com/finance-ingestion-benchmark/issues)
3. Join our [Discord Community](https://discord.gg/finance-ingestion-benchmark)
4. Read the [FAQ](/guide/faq)

::: tip Pro Tip
For the best development experience, use a Unix-like environment (Linux, macOS, or WSL2 on Windows) as it provides better performance and compatibility with the development tools.
:::