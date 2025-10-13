# PowerShell script to push all branches to GitHub
Write-Host "🚀 Pushing all branches to GitHub..." -ForegroundColor Green

# List of all local branches
$branches = @(
    "main",
    "feat/P03-T07-python-websocket-manager",
    "feat/P03-T07-websocket-connection-management",
    "feat/P03-T08-python-message-processor",
    "feat/P03T08.3-unit-tests-message-processors",
    "feat/P03T09-storage-and-persistence-layer",
    "feat/P04T11-node-rest-api",
    "feat/P04T11-python-rest-api",
    "feat/P05T12-integration-tests",
    "feat/P05T12.2-performance-regression-tests",
    "feat/P05T13-benchmarking-system",
    "feat/P06T14-deployment-automation",
    "feat/P06T14-production-config",
    "feat/P06T15-final-integration",
    "feature/nodejs-foundation-framework",
    "feature/python-foundation-framework",
    "feature/storage-layer-infrastructure",
    "hotfix/complete-python-websocket-manager",
    "test/07-connection-manager-unit-tests"
)

$successCount = 0
$failCount = 0

# Push each branch
foreach ($branch in $branches) {
    Write-Host "📤 Pushing branch: $branch" -ForegroundColor Yellow
    
    git push origin $branch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pushed: $branch" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "❌ Failed to push: $branch" -ForegroundColor Red
        $failCount++
    }
    Write-Host ""
}

Write-Host "🎉 Branch push completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red
Write-Host "📝 Total branches: $($branches.Count)" -ForegroundColor White
Write-Host ""
Write-Host "🌐 View your repository at:" -ForegroundColor Cyan
Write-Host "https://github.com/aserron/high-speed-ingestion" -ForegroundColor Blue