# Development environment setup script for Windows
param(
    [switch]$SkipDocker = $false
)

Write-Host "🚀 Setting up Finance Ingestion Benchmark development environment..." -ForegroundColor Green

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js version
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        Write-Host "❌ Node.js version 18+ required. Current version: $nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check Python version
try {
    $pythonVersion = python --version 2>$null
    if (-not $pythonVersion) {
        $pythonVersion = python3 --version
    }
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python 3 is not installed. Please install Python 3.11+ first." -ForegroundColor Red
    exit 1
}

# Check Docker (optional)
if (-not $SkipDocker) {
    try {
        docker --version | Out-Null
        docker-compose --version | Out-Null
        Write-Host "✅ Docker and Docker Compose available" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Docker not available. Use -SkipDocker to continue without Docker services." -ForegroundColor Yellow
        Write-Host "   You'll need to provide Redis and PostgreSQL services manually." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ All prerequisites satisfied" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install npm dependencies" -ForegroundColor Red
    exit 1
}

# Setup Python virtual environments
Write-Host "🐍 Setting up Python environments..." -ForegroundColor Yellow

if (Test-Path "apps/python-ingestion") {
    Push-Location "apps/python-ingestion"
    
    if (-not (Test-Path "venv")) {
        python -m venv venv
    }
    
    # Activate virtual environment
    if (Test-Path "venv/Scripts/Activate.ps1") {
        & "venv/Scripts/Activate.ps1"
    } else {
        Write-Host "⚠️  Could not activate Python virtual environment" -ForegroundColor Yellow
    }
    
    # Upgrade pip and install requirements
    python -m pip install --upgrade pip
    
    if (Test-Path "requirements.txt") {
        pip install -r requirements.txt
    }
    
    # Deactivate virtual environment
    if (Get-Command deactivate -ErrorAction SilentlyContinue) {
        deactivate
    }
    
    Pop-Location
    Write-Host "✅ Python environment setup complete" -ForegroundColor Green
}

# Start infrastructure services
if (-not $SkipDocker) {
    Write-Host "🐳 Starting infrastructure services..." -ForegroundColor Yellow
    docker-compose up -d redis postgres
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
        exit 1
    }
    
    # Wait for services to be ready
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Test connections
    Write-Host "🔍 Testing service connections..." -ForegroundColor Yellow
    
    # Test Redis
    try {
        $redisTest = docker-compose exec -T redis redis-cli ping 2>$null
        if ($redisTest -match "PONG") {
            Write-Host "✅ Redis is ready" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Redis connection test failed" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Could not test Redis connection" -ForegroundColor Yellow
    }
    
    # Test PostgreSQL
    try {
        $pgTest = docker-compose exec -T postgres pg_isready -U postgres 2>$null
        if ($pgTest -match "accepting connections") {
            Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
        } else {
            Write-Host "⚠️  PostgreSQL connection test failed" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Could not test PostgreSQL connection" -ForegroundColor Yellow
    }
}

# Run setup tasks
Write-Host "⚙️  Running setup tasks..." -ForegroundColor Yellow
npm run setup

Write-Host ""
Write-Host "🎉 Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "  • Run 'npm run dev' to start development servers" -ForegroundColor White
Write-Host "  • Run 'npm run test' to execute tests" -ForegroundColor White
Write-Host "  • Run 'npm run benchmark' to run performance tests" -ForegroundColor White
Write-Host "  • Visit http://localhost:3000 for the web interface" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  • README.md - Project overview and quick start" -ForegroundColor White
Write-Host "  • docs/ - Detailed documentation" -ForegroundColor White
Write-Host ""