# PowerShell script to create release tags for major milestones
Write-Host "🏷️  Creating release tags for project milestones..." -ForegroundColor Green

# Define major milestones and their corresponding commits/branches
$releases = @(
    @{
        tag = "v0.1.0-foundation"
        title = "Foundation and Infrastructure"
        description = "Initial project setup with monorepo structure, Docker configuration, and shared packages"
        branch = "feature/storage-layer-infrastructure"
    },
    @{
        tag = "v0.2.0-core-framework"
        title = "Core Framework Implementation"
        description = "Complete Python and Node.js foundation frameworks with configuration and logging"
        branch = "feature/nodejs-foundation-framework"
    },
    @{
        tag = "v0.3.0-components"
        title = "Core Components Implementation"
        description = "WebSocket connection management, message processing, and storage layer implementation"
        branch = "feat/P03T09-storage-and-persistence-layer"
    },
    @{
        tag = "v0.4.0-monitoring"
        title = "Monitoring and Observability"
        description = "Metrics collection, REST APIs, and comprehensive monitoring implementation"
        branch = "feat/P04T11-node-rest-api"
    },
    @{
        tag = "v0.5.0-testing"
        title = "Integration and Testing"
        description = "Complete test suite with integration tests, benchmarking, and performance regression testing"
        branch = "feat/P05T12.2-performance-regression-tests"
    },
    @{
        tag = "v1.0.0"
        title = "Production Release"
        description = "Complete Finance Ingestion Benchmark with documentation platform and production deployment"
        branch = "main"
    }
)

foreach ($release in $releases) {
    Write-Host "🏷️  Creating tag: $($release.tag)" -ForegroundColor Yellow
    
    # Get the commit hash for the branch
    $commitHash = git rev-parse $release.branch
    
    if ($LASTEXITCODE -eq 0) {
        # Create annotated tag
        git tag -a $release.tag $commitHash -m "$($release.title)

$($release.description)

This release represents a major milestone in the Finance Ingestion Benchmark project development."
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Created tag: $($release.tag)" -ForegroundColor Green
            
            # Push the tag to GitHub
            git push origin $release.tag
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "📤 Pushed tag to GitHub: $($release.tag)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "❌ Failed to create tag: $($release.tag)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Could not find branch: $($release.branch)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "🎉 Release tagging completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to GitHub Releases: https://github.com/aserron/high-speed-ingestion/releases" -ForegroundColor White
Write-Host "2. Create release notes for each tag" -ForegroundColor White
Write-Host "3. Mark v1.0.0 as the latest release" -ForegroundColor White