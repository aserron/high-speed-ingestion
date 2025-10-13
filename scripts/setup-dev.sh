#!/bin/bash

# Development environment setup script
set -e

echo "🚀 Setting up Finance Ingestion Benchmark development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)"; then
    echo "❌ Python 3.11+ required. Current version: $(python3 --version)"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ All prerequisites satisfied"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup Python virtual environments for each app
echo "🐍 Setting up Python environments..."

if [ -d "apps/python-ingestion" ]; then
    cd apps/python-ingestion
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install --upgrade pip
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    deactivate
    cd ../..
    echo "✅ Python environment setup complete"
fi

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose up -d redis postgres

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Test connections
echo "🔍 Testing service connections..."

# Test Redis
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis connection test failed"
fi

# Test PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres | grep -q "accepting connections"; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL connection test failed"
fi

# Run setup tasks
echo "⚙️  Running setup tasks..."
npm run setup

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "🚀 Next steps:"
echo "  • Run 'npm run dev' to start development servers"
echo "  • Run 'npm run test' to execute tests"
echo "  • Run 'npm run benchmark' to run performance tests"
echo "  • Visit http://localhost:3000 for the web interface"
echo ""
echo "📚 Documentation:"
echo "  • README.md - Project overview and quick start"
echo "  • docs/ - Detailed documentation"
echo ""