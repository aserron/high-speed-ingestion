# Development Linting Script
# Runs linting checks for both Python and Node.js services

Write-Host "🔍 Running linting checks..." -ForegroundColor Cyan

# Python linting
Write-Host "`n📝 Python Service Linting:" -ForegroundColor Yellow
Push-Location "apps/python-ingestion"

# Check if ruff is available
if (Get-Command ruff -ErrorAction SilentlyContinue) {
    Write-Host "Running ruff..." -ForegroundColor Green
    ruff check src/ --output-format=github
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Python linting passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Python linting failed" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  ruff not installed. Install with: pip install ruff" -ForegroundColor Yellow
    
    # Fallback to basic Python syntax check
    Write-Host "Running basic Python syntax check..." -ForegroundColor Yellow
    Get-ChildItem -Path "src" -Filter "*.py" -Recurse | ForEach-Object {
        python -m py_compile $_.FullName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Syntax error in: $($_.FullName)" -ForegroundColor Red
        }
    }
}

Pop-Location

# Node.js linting
Write-Host "`n🟨 Node.js Service Linting:" -ForegroundColor Yellow
Push-Location "apps/node-ingestion"

# Check if we have node_modules
if (Test-Path "node_modules") {
    Write-Host "Running ESLint..." -ForegroundColor Green
    npx eslint src/ --ext .js --format=stylish
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js linting passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js linting failed" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  node_modules not found. Run: npm install" -ForegroundColor Yellow
    
    # Fallback to basic Node.js syntax check
    Write-Host "Running basic Node.js syntax check..." -ForegroundColor Yellow
    Get-ChildItem -Path "src" -Filter "*.js" -Recurse | ForEach-Object {
        node --check $_.FullName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Syntax error in: $($_.FullName)" -ForegroundColor Red
        }
    }
}

Pop-Location

Write-Host "`n🔍 Linting check complete!" -ForegroundColor Cyan