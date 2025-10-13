# Performance Regression Test Runner Script for Windows
param(
    [switch]$Help,
    [switch]$NoSetup,
    [switch]$Cleanup
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"

function Write-Status {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Red
}

function Show-Help {
    Write-Host "Performance Regression Test Runner" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Usage: .\run_regression_tests.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Help        Show this help message"
    Write-Host "  -NoSetup     Skip environment setup (use existing services)"
    Write-Host "  -Cleanup     Only run cleanup and exit"
    Write-Host ""
    Write-Host "This script runs automated performance regression tests for both"
    Write-Host "Python and Node.js implementations of the Finance Ingestion Benchmark."
}

function Test-Prerequisites {
    Write-Host "Checking prerequisites..."
    
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Write-Error "Python is not installed or not in PATH"
        exit 1
    }
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not installed or not in PATH"
        exit 1
    }
    
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose is not installed or not in PATH"
        exit 1
    }
    
    Write-Status "Prerequisites check passed"
}

function Set-TestEnvironment {
    Write-Host "Setting up test environment..."
    
    # Install Python dependencies for regression testing
    if (Test-Path "tests\performance\requirements.txt") {
        pip install -r tests\performance\requirements.txt
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install Python dependencies"
            exit 1
        }
        Write-Status "Python dependencies installed"
    }
    
    # Start infrastructure services
    Write-Host "Starting infrastructure services..."
    docker-compose up -d redis postgres
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start infrastructure services"
        exit 1
    }
    
    # Wait for services to be ready
    Write-Host "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    
    # Verify services are running
    $services = docker-compose ps
    if (-not ($services -match "redis.*Up")) {
        Write-Error "Redis service is not running"
        exit 1
    }
    
    if (-not ($services -match "postgres.*Up")) {
        Write-Error "PostgreSQL service is not running"
        exit 1
    }
    
    Write-Status "Infrastructure services are ready"
}

function Install-Dependencies {
    Write-Host "Installing application dependencies..."
    
    # Install Python application dependencies
    Push-Location "apps\python-ingestion"
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Error "Failed to install Python application dependencies"
        exit 1
    }
    Pop-Location
    
    # Install Node.js application dependencies
    Push-Location "apps\node-ingestion"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Error "Failed to install Node.js application dependencies"
        exit 1
    }
    Pop-Location
    
    Write-Status "Application dependencies installed"
}

function Invoke-Tests {
    Write-Host "Running performance regression tests..."
    
    Push-Location "tests\performance"
    
    # Set environment variables for testing
    $env:PYTHONPATH = "..\..\apps\python-ingestion\src;$env:PYTHONPATH"
    $env:NODE_PATH = "..\..\apps\node-ingestion\node_modules;$env:NODE_PATH"
    
    # Run the regression test suite
    python regression_runner.py
    $exitCode = $LASTEXITCODE
    
    Pop-Location
    
    return $exitCode
}

function Invoke-Cleanup {
    Write-Host "Cleaning up test environment..."
    
    # Stop any running applications
    Get-Process | Where-Object { $_.ProcessName -like "*python*" -and $_.CommandLine -like "*finance_ingestion*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*finance*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Stop infrastructure services
    docker-compose down
    
    Write-Status "Cleanup completed"
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

if ($Cleanup) {
    Invoke-Cleanup
    exit 0
}

Write-Host "🧪 Starting Performance Regression Tests" -ForegroundColor $Green

try {
    if (-not $NoSetup) {
        Test-Prerequisites
        Set-TestEnvironment
        Install-Dependencies
    } else {
        Write-Host "Skipping environment setup..."
    }
    
    $testResult = Invoke-Tests
    
    if ($testResult -eq 0) {
        Write-Status "All regression tests passed!"
        Write-Host "🎉 Performance regression testing completed successfully" -ForegroundColor $Green
        exit 0
    } else {
        Write-Error "Some regression tests failed!"
        Write-Host "❌ Performance regressions detected" -ForegroundColor $Red
        exit 1
    }
} finally {
    if (-not $NoSetup) {
        Invoke-Cleanup
    }
}