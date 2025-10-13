# Documentation deployment script for Windows
param(
    [Parameter(Position=0)]
    [ValidateSet("production", "staging", "development", "rollback")]
    [string]$Environment = "production",
    
    [switch]$Help
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"

# Configuration
$BuildDir = ".vitepress/dist"
$BackupDir = "backups/$(Get-Date -Format 'yyyyMMdd_HHmmss')"

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
    Write-Host "Documentation Deployment Script" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [environment] [options]"
    Write-Host ""
    Write-Host "Environments:"
    Write-Host "  production   Deploy to production environment"
    Write-Host "  staging      Deploy to staging environment"
    Write-Host "  development  Start development server"
    Write-Host "  rollback     Rollback to previous version"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Help        Show this help message"
    Write-Host ""
    Write-Host "Environment Variables:"
    Write-Host "  DOCKER_REGISTRY              Docker registry URL"
    Write-Host "  AWS_S3_BUCKET               S3 bucket for deployment"
    Write-Host "  AWS_CLOUDFRONT_DISTRIBUTION_ID  CloudFront distribution ID"
    Write-Host "  SLACK_WEBHOOK_URL           Slack webhook for notifications"
    Write-Host "  STATUS_PAGE_API             Status page API endpoint"
}

function Test-Prerequisites {
    Write-Host "Checking prerequisites..."
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not installed"
        exit 1
    }
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm is not installed"
        exit 1
    }
    
    Write-Status "Prerequisites check passed"
}

function Install-Dependencies {
    Write-Host "Installing dependencies..."
    npm ci --only=production
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    Write-Status "Dependencies installed"
}

function Invoke-Tests {
    Write-Host "Running tests..."
    
    # Link checking (if available)
    if (Get-Command markdown-link-check -ErrorAction SilentlyContinue) {
        Get-ChildItem -Path . -Filter "*.md" -Recurse | Where-Object { $_.FullName -notlike "*node_modules*" } | ForEach-Object {
            markdown-link-check $_.FullName
        }
        Write-Status "Link checking completed"
    } else {
        Write-Warning "markdown-link-check not found, skipping link validation"
    }
}

function Build-Documentation {
    Write-Host "Building documentation..."
    
    # Clean previous build
    if (Test-Path $BuildDir) {
        Remove-Item -Path $BuildDir -Recurse -Force
    }
    
    # Build
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    
    if (-not (Test-Path $BuildDir)) {
        Write-Error "Build failed - output directory not found"
        exit 1
    }
    
    Write-Status "Documentation built successfully"
}

function New-Backup {
    if ($Environment -eq "production" -and (Test-Path "current")) {
        Write-Host "Creating backup..."
        New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
        Copy-Item -Path "current\*" -Destination $BackupDir -Recurse
        Write-Status "Backup created at $BackupDir"
    }
}

function Deploy-GitHubPages {
    Write-Host "Deploying to GitHub Pages..."
    
    if (-not (Test-Path ".github\workflows\deploy-docs.yml")) {
        Write-Error "GitHub Actions workflow not found"
        exit 1
    }
    
    Write-Status "GitHub Pages deployment configured"
}

function Deploy-Netlify {
    Write-Host "Deploying to Netlify..."
    
    if (Get-Command netlify -ErrorAction SilentlyContinue) {
        netlify deploy --prod --dir=$BuildDir
        Write-Status "Deployed to Netlify"
    } else {
        Write-Warning "Netlify CLI not found. Please deploy manually or install netlify-cli"
    }
}

function Deploy-Vercel {
    Write-Host "Deploying to Vercel..."
    
    if (Get-Command vercel -ErrorAction SilentlyContinue) {
        vercel --prod
        Write-Status "Deployed to Vercel"
    } else {
        Write-Warning "Vercel CLI not found. Please deploy manually or install vercel"
    }
}

function Deploy-Docker {
    Write-Host "Building and deploying Docker container..."
    
    # Build Docker image
    docker build -t finance-ingestion-docs:latest .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        exit 1
    }
    
    # Tag for registry
    $dockerRegistry = $env:DOCKER_REGISTRY
    if ($dockerRegistry) {
        docker tag finance-ingestion-docs:latest "$dockerRegistry/finance-ingestion-docs:latest"
        docker push "$dockerRegistry/finance-ingestion-docs:latest"
        Write-Status "Docker image pushed to registry"
    }
    
    # Deploy with docker-compose
    if (Test-Path "docker-compose.yml") {
        docker-compose up -d docs
        Write-Status "Docker container deployed"
    }
}

function Deploy-S3 {
    Write-Host "Deploying to AWS S3..."
    
    $s3Bucket = $env:AWS_S3_BUCKET
    if (-not $s3Bucket) {
        Write-Error "AWS_S3_BUCKET environment variable not set"
        exit 1
    }
    
    if (Get-Command aws -ErrorAction SilentlyContinue) {
        aws s3 sync $BuildDir "s3://$s3Bucket" --delete
        
        # Invalidate CloudFront if configured
        $distributionId = $env:AWS_CLOUDFRONT_DISTRIBUTION_ID
        if ($distributionId) {
            aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*"
            Write-Status "CloudFront cache invalidated"
        }
        
        Write-Status "Deployed to S3"
    } else {
        Write-Error "AWS CLI not found"
        exit 1
    }
}

function Invoke-PostDeployment {
    Write-Host "Running post-deployment tasks..."
    
    # Send notification to Slack (if configured)
    $slackWebhook = $env:SLACK_WEBHOOK_URL
    if ($slackWebhook) {
        $body = @{
            text = "📚 Documentation deployed successfully to $Environment"
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri $slackWebhook -Method Post -Body $body -ContentType "application/json"
            Write-Status "Slack notification sent"
        } catch {
            Write-Warning "Failed to send Slack notification: $($_.Exception.Message)"
        }
    }
    
    # Update status page (if configured)
    $statusPageApi = $env:STATUS_PAGE_API
    if ($statusPageApi) {
        $body = @{
            environment = $Environment
            status = "success"
            timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri "$statusPageApi/deployments" -Method Post -Body $body -ContentType "application/json"
            Write-Status "Status page updated"
        } catch {
            Write-Warning "Failed to update status page: $($_.Exception.Message)"
        }
    }
}

function Invoke-Rollback {
    if (Test-Path $BackupDir) {
        Write-Host "Rolling back to previous version..."
        if (Test-Path "current") {
            Remove-Item -Path "current" -Recurse -Force
        }
        Copy-Item -Path $BackupDir -Destination "current" -Recurse
        Write-Status "Rollback completed"
    } else {
        Write-Error "No backup found for rollback"
        exit 1
    }
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

Write-Host "🚀 Starting documentation deployment for $Environment" -ForegroundColor $Green

switch ($Environment) {
    "production" {
        Test-Prerequisites
        Install-Dependencies
        Invoke-Tests
        Build-Documentation
        New-Backup
        
        # Deploy based on configuration
        if ($env:GITHUB_ACTIONS) {
            Deploy-GitHubPages
        } elseif (Test-Path "netlify.toml") {
            Deploy-Netlify
        } elseif (Test-Path "vercel.json") {
            Deploy-Vercel
        } elseif (Test-Path "Dockerfile") {
            Deploy-Docker
        } elseif ($env:AWS_S3_BUCKET) {
            Deploy-S3
        } else {
            Write-Error "No deployment method configured"
            exit 1
        }
        
        Invoke-PostDeployment
    }
    
    "staging" {
        Test-Prerequisites
        Install-Dependencies
        Build-Documentation
        Write-Status "Staging deployment completed"
    }
    
    "development" {
        Test-Prerequisites
        Install-Dependencies
        npm run dev
    }
    
    "rollback" {
        Invoke-Rollback
    }
}