# PowerShell script to clean up merged branches on GitHub
Write-Host "🧹 Cleaning up merged branches on GitHub..." -ForegroundColor Green

# List of branches that are fully merged into main
$mergedBranches = @(
    "feature/python-foundation-framework",
    "feature/nodejs-foundation-framework", 
    "feature/storage-layer-infrastructure",
    "feat/P03-T07-python-websocket-manager",
    "feat/P03-T07-websocket-connection-management",
    "feat/P03-T08-python-message-processor",
    "feat/P03T08.3-unit-tests-message-processors",
    "feat/P03T09-storage-and-persistence-layer",
    "feat/P04T11-python-rest-api",
    "feat/P04T11-node-rest-api",
    "feat/P05T12-integration-tests",
    "feat/P05T13-benchmarking-system",
    "feat/P06T14-production-config",
    "feat/P06T14-deployment-automation",
    "feat/P05T12.2-performance-regression-tests",
    "feat/P06T15-final-integration"
)

Write-Host "📋 Found $($mergedBranches.Count) merged branches to clean up" -ForegroundColor Yellow
Write-Host ""

foreach ($branch in $mergedBranches) {
    Write-Host "🗑️  Deleting remote branch: $branch" -ForegroundColor Yellow
    
    # Delete the remote branch
    git push origin --delete $branch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deleted remote branch: $branch" -ForegroundColor Green
        
        # Also delete local branch if it exists
        git branch -D $branch 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "🏠 Also deleted local branch: $branch" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ Failed to delete: $branch" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "🎉 Branch cleanup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Repository now has a clean main branch with all features merged" -ForegroundColor Cyan
Write-Host "🌐 View at: https://github.com/aserron/high-speed-ingestion" -ForegroundColor Blue