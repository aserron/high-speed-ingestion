# Production Deployment Script for Finance Ingestion Benchmark (PowerShell)
# 
# This script handles the deployment of both Python and Node.js
# financial data ingestion systems with proper health checks,
# graceful shutdown, and monitoring setup.

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "status", "stop", "rollback", "health")]
    [string]$Action = "deploy"
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot "infrastructure/docker/docker-compose.base.yml"
$ProdComposeFile = Join-Path $ProjectRoot "infrastructure/docker/docker-compose.prod.yml"
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "deployment.log"

# Ensure logs directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Logging function
function Write-Log {
    param(
        [string]$Level,
        [string]$Message
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    # Log to file
    Add-Content -Path $LogFile -Value $LogEntry
    
    # Log to console with colors
    switch ($Level) {
        "INFO" { Write-Host "[INFO] $Message" -ForegroundColor Green }
        "WARN" { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
        "ERROR" { Write-Host "[ERROR] $Message" -ForegroundColor Red }
        "DEBUG" { Write-Host "[DEBUG] $Message" -ForegroundColor Blue }
        default { Write-Host "[$Level] $Message" }
    }
}

# Error handler
function Exit-WithError {
    param([string]$Message)
    Write-Log "ERROR" $Message
    exit 1
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "INFO" "Checking prerequisites..."
    
    # Check if Docker is installed and running
    try {
        $null = docker --version
    } catch {
        Exit-WithError "Docker is not installed or not in PATH"
    }
    
    try {
        $null = docker info 2>$null
    } catch {
        Exit-WithError "Docker daemon is not running"
    }
    
    # Check if Docker Compose is available
    $composeAvailable = $false
    try {
        $null = docker-compose --version 2>$null
        $composeAvailable = $true
    } catch {
        try {
            $null = docker compose version 2>$null
            $composeAvailable = $true
        } catch {
            Exit-WithError "Docker Compose is not installed"
        }
    }
    
    # Check if compose files exist
    if (-not (Test-Path $ComposeFile)) {
        Exit-WithError "Base compose file not found: $ComposeFile"
    }
    
    if (-not (Test-Path $ProdComposeFile)) {
        Exit-WithError "Production compose file not found: $ProdComposeFile"
    }
    
    Write-Log "INFO" "Prerequisites check passed"
}

# Build images
function Build-Images {
    Write-Log "INFO" "Building Docker images..."
    
    Push-Location $ProjectRoot
    try {
        # Build with production optimizations
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
            & docker-compose -f $ComposeFile -f $ProdComposeFile build --no-cache
        } else {
            & docker compose -f $ComposeFile -f $ProdComposeFile build --no-cache
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed"
        }
        
        Write-Log "INFO" "Docker images built successfully"
    } finally {
        Pop-Location
    }
}

# Deploy services
function Deploy-Services {
    Write-Log "INFO" "Deploying services..."
    
    Push-Location $ProjectRoot
    try {
        # Deploy with production configuration
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
            & docker-compose -f $ComposeFile -f $ProdComposeFile up -d
        } else {
            & docker compose -f $ComposeFile -f $ProdComposeFile up -d
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Service deployment failed"
        }
        
        Write-Log "INFO" "Services deployed successfully"
    } finally {
        Pop-Location
    }
}

# Wait for services to be healthy
function Wait-ForHealth {
    Write-Log "INFO" "Waiting for services to become healthy..."
    
    $MaxAttempts = 60  # 5 minutes with 5-second intervals
    $Attempt = 0
    
    while ($Attempt -lt $MaxAttempts) {
        $AllHealthy = $true
        
        # Check each service health
        $Services = @("python-ingestion", "node-ingestion", "redis", "postgres")
        foreach ($Service in $Services) {
            try {
                if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
                    $ContainerId = & docker-compose -f $ComposeFile -f $ProdComposeFile ps -q $Service 2>$null
                } else {
                    $ContainerId = & docker compose -f $ComposeFile -f $ProdComposeFile ps -q $Service 2>$null
                }
                
                if ($ContainerId) {
                    $HealthStatus = & docker inspect --format='{{.State.Health.Status}}' $ContainerId 2>$null
                    if ($HealthStatus -ne "healthy") {
                        $AllHealthy = $false
                        Write-Log "DEBUG" "Service $Service is not healthy yet (status: $HealthStatus)"
                        break
                    }
                } else {
                    $AllHealthy = $false
                    Write-Log "DEBUG" "Service $Service container not found"
                    break
                }
            } catch {
                $AllHealthy = $false
                Write-Log "DEBUG" "Error checking health for service $Service"
                break
            }
        }
        
        if ($AllHealthy) {
            Write-Log "INFO" "All services are healthy"
            return $true
        }
        
        $Attempt++
        Write-Log "DEBUG" "Health check attempt $Attempt/$MaxAttempts"
        Start-Sleep -Seconds 5
    }
    
    Write-Log "WARN" "Some services may not be fully healthy after $MaxAttempts attempts"
    return $false
}

# Verify deployment
function Test-Deployment {
    Write-Log "INFO" "Verifying deployment..."
    
    # Test API endpoints
    Write-Log "INFO" "Testing API endpoints..."
    
    # Test Python API
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 10 -UseBasicParsing
        if ($Response.StatusCode -eq 200) {
            Write-Log "INFO" "Python API health check: OK"
        } else {
            Write-Log "WARN" "Python API health check: FAILED (Status: $($Response.StatusCode))"
        }
    } catch {
        Write-Log "WARN" "Python API health check: FAILED (Error: $($_.Exception.Message))"
    }
    
    # Test Node.js API
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8002/health" -TimeoutSec 10 -UseBasicParsing
        if ($Response.StatusCode -eq 200) {
            Write-Log "INFO" "Node.js API health check: OK"
        } else {
            Write-Log "WARN" "Node.js API health check: FAILED (Status: $($Response.StatusCode))"
        }
    } catch {
        Write-Log "WARN" "Node.js API health check: FAILED (Error: $($_.Exception.Message))"
    }
    
    # Test Prometheus
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -TimeoutSec 10 -UseBasicParsing
        if ($Response.StatusCode -eq 200) {
            Write-Log "INFO" "Prometheus health check: OK"
        } else {
            Write-Log "WARN" "Prometheus health check: FAILED (Status: $($Response.StatusCode))"
        }
    } catch {
        Write-Log "WARN" "Prometheus health check: FAILED (Error: $($_.Exception.Message))"
    }
    
    # Test Grafana
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -UseBasicParsing
        if ($Response.StatusCode -eq 200) {
            Write-Log "INFO" "Grafana health check: OK"
        } else {
            Write-Log "WARN" "Grafana health check: FAILED (Status: $($Response.StatusCode))"
        }
    } catch {
        Write-Log "WARN" "Grafana health check: FAILED (Error: $($_.Exception.Message))"
    }
    
    Write-Log "INFO" "Deployment verification completed"
}

# Show deployment status
function Show-Status {
    Write-Log "INFO" "Deployment Status:"
    Write-Host ""
    
    Push-Location $ProjectRoot
    try {
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
            & docker-compose -f $ComposeFile -f $ProdComposeFile ps
        } else {
            & docker compose -f $ComposeFile -f $ProdComposeFile ps
        }
    } finally {
        Pop-Location
    }
    
    Write-Host ""
    Write-Log "INFO" "Service URLs:"
    Write-Host "  Python API:    http://localhost:8001"
    Write-Host "  Node.js API:   http://localhost:8002"
    Write-Host "  Prometheus:    http://localhost:9090"
    Write-Host "  Grafana:       http://localhost:3000 (admin/admin)"
    Write-Host ""
    Write-Log "INFO" "Logs: Get-Content -Path '$LogFile' -Tail 50 -Wait"
}

# Graceful shutdown
function Stop-Services {
    Write-Log "INFO" "Performing graceful shutdown..."
    
    Push-Location $ProjectRoot
    try {
        # Stop services gracefully
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
            & docker-compose -f $ComposeFile -f $ProdComposeFile stop
        } else {
            & docker compose -f $ComposeFile -f $ProdComposeFile stop
        }
        
        Write-Log "INFO" "Graceful shutdown completed"
    } finally {
        Pop-Location
    }
}

# Rollback deployment
function Invoke-Rollback {
    Write-Log "INFO" "Rolling back deployment..."
    
    Push-Location $ProjectRoot
    try {
        # Stop current deployment
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
            & docker-compose -f $ComposeFile -f $ProdComposeFile down
        } else {
            & docker compose -f $ComposeFile -f $ProdComposeFile down
        }
        
        Write-Log "INFO" "Rollback completed"
    } finally {
        Pop-Location
    }
}

# Main deployment function
function Invoke-Main {
    param([string]$Action)
    
    Write-Log "INFO" "Starting deployment script with action: $Action"
    
    try {
        switch ($Action) {
            "deploy" {
                Test-Prerequisites
                Build-Images
                Deploy-Services
                Wait-ForHealth
                Test-Deployment
                Show-Status
            }
            "status" {
                Show-Status
            }
            "stop" {
                Stop-Services
            }
            "rollback" {
                Invoke-Rollback
            }
            "health" {
                Wait-ForHealth
            }
            default {
                Write-Host "Usage: .\deploy.ps1 {deploy|status|stop|rollback|health}"
                Write-Host ""
                Write-Host "Commands:"
                Write-Host "  deploy   - Full deployment with health checks"
                Write-Host "  status   - Show current deployment status"
                Write-Host "  stop     - Graceful shutdown of services"
                Write-Host "  rollback - Rollback current deployment"
                Write-Host "  health   - Wait for services to become healthy"
                exit 1
            }
        }
        
        Write-Log "INFO" "Deployment script completed successfully"
    } catch {
        Write-Log "ERROR" "Deployment script failed: $($_.Exception.Message)"
        exit 1
    }
}

# Handle script interruption
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Log "WARN" "Deployment script interrupted"
}

# Run main function
Invoke-Main -Action $Action