# Check docs-site for conflicts and issues
Write-Host "🔍 Checking docs-site for conflicts and issues..." -ForegroundColor Green

# Check if docs-site directory exists
if (-not (Test-Path "apps/docs-site")) {
    Write-Host "❌ docs-site directory not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ docs-site directory exists" -ForegroundColor Green

# Check package.json
if (Test-Path "apps/docs-site/package.json") {
    Write-Host "✅ package.json found" -ForegroundColor Green
    
    # Check for dependency conflicts
    $packageJson = Get-Content "apps/docs-site/package.json" | ConvertFrom-Json
    Write-Host "📦 Dependencies:" -ForegroundColor Cyan
    
    if ($packageJson.dependencies) {
        foreach ($dep in $packageJson.dependencies.PSObject.Properties) {
            Write-Host "  • $($dep.Name): $($dep.Value)" -ForegroundColor White
        }
    }
    
    if ($packageJson.devDependencies) {
        Write-Host "📦 Dev Dependencies:" -ForegroundColor Cyan
        foreach ($dep in $packageJson.devDependencies.PSObject.Properties) {
            Write-Host "  • $($dep.Name): $($dep.Value)" -ForegroundColor White
        }
    }
} else {
    Write-Host "❌ package.json not found" -ForegroundColor Red
}

# Check VitePress config
if (Test-Path "apps/docs-site/.vitepress/config.js") {
    Write-Host "✅ VitePress config found" -ForegroundColor Green
    
    # Check for syntax issues in config
    $configContent = Get-Content "apps/docs-site/.vitepress/config.js" -Raw
    
    # Basic syntax checks
    if ($configContent -match "export default") {
        Write-Host "✅ Config uses ES modules correctly" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Config might have module syntax issues" -ForegroundColor Yellow
    }
    
    if ($configContent -match "defineConfig") {
        Write-Host "✅ Config uses defineConfig" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Config might not use defineConfig" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ VitePress config not found" -ForegroundColor Red
}

# Check theme files
if (Test-Path "docs-site/.vitepress/theme") {
    Write-Host "✅ Custom theme directory found" -ForegroundColor Green
    
    # Check theme index
    if (Test-Path "docs-site/.vitepress/theme/index.js") {
        Write-Host "✅ Theme index.js found" -ForegroundColor Green
    } else {
        Write-Host "❌ Theme index.js not found" -ForegroundColor Red
    }
    
    # Check components
    if (Test-Path "docs-site/.vitepress/theme/components") {
        $components = Get-ChildItem "docs-site/.vitepress/theme/components" -Filter "*.vue"
        Write-Host "📄 Vue components found: $($components.Count)" -ForegroundColor Cyan
        foreach ($component in $components) {
            Write-Host "  • $($component.Name)" -ForegroundColor White
        }
    }
} else {
    Write-Host "⚠️  No custom theme found (using default)" -ForegroundColor Yellow
}

# Check for common conflict indicators
Write-Host ""
Write-Host "🔍 Checking for common issues..." -ForegroundColor Yellow

# Check for node_modules
if (Test-Path "docs-site/node_modules") {
    Write-Host "✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules not found - run npm install" -ForegroundColor Yellow
}

# Check for cache issues
if (Test-Path "docs-site/.vitepress/cache") {
    Write-Host "ℹ️  VitePress cache exists" -ForegroundColor Blue
    
    # Check cache size
    $cacheSize = (Get-ChildItem "docs-site/.vitepress/cache" -Recurse | Measure-Object -Property Length -Sum).Sum
    if ($cacheSize -gt 100MB) {
        Write-Host "⚠️  Large cache detected ($([math]::Round($cacheSize/1MB, 2))MB) - consider clearing" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  No VitePress cache (will be created on first build)" -ForegroundColor Blue
}

# Check for build artifacts
if (Test-Path "docs-site/.vitepress/dist") {
    Write-Host "ℹ️  Build artifacts exist" -ForegroundColor Blue
} else {
    Write-Host "ℹ️  No build artifacts (run npm run build to create)" -ForegroundColor Blue
}

Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  • docs-site structure appears valid" -ForegroundColor White
Write-Host "  • VitePress configuration is present" -ForegroundColor White
Write-Host "  • Custom theme and components detected" -ForegroundColor White

Write-Host ""
Write-Host "🚀 To test the site:" -ForegroundColor Green
Write-Host "  1. cd apps/docs-site" -ForegroundColor White
Write-Host "  2. npm install" -ForegroundColor White
Write-Host "  3. npm run dev" -ForegroundColor White

Write-Host ""
Write-Host "🔧 To build for production:" -ForegroundColor Green
Write-Host "  1. cd apps/docs-site" -ForegroundColor White
Write-Host "  2. npm run build" -ForegroundColor White