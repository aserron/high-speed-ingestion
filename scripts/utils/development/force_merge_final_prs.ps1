# Force merge the final 8 PRs with unique content
Write-Host "🚀 Force merging final 8 PRs with unique content..." -ForegroundColor Green

$finalPRs = @(19, 20, 21, 22, 23, 24, 25, 26)

foreach ($prId in $finalPRs) {
    Write-Host ""
    Write-Host "🔄 Processing PR #$prId..." -ForegroundColor Cyan
    
    try {
        # Get PR info
        $prInfo = gh pr view $prId --repo aserron/high-speed-ingestion --json headRefName,state 2>$null | ConvertFrom-Json
        
        if ($prInfo.state -ne "OPEN") {
            Write-Host "ℹ️  PR #$prId is $($prInfo.state), skipping..." -ForegroundColor Blue
            continue
        }
        
        $branchName = $prInfo.headRefName
        Write-Host "🌿 Branch: $branchName" -ForegroundColor Gray
        
        # Update dev first
        git checkout dev 2>$null
        git pull origin dev 2>$null
        
        # Try direct merge first
        $mergeResult = gh pr merge $prId --squash --repo aserron/high-speed-ingestion 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully merged PR #$prId directly" -ForegroundColor Green
            continue
        }
        
        Write-Host "⚠️  Direct merge failed, attempting rebase..." -ForegroundColor Yellow
        
        # Checkout and rebase
        git checkout $branchName 2>$null
        git rebase dev 2>$null
        
        # Handle conflicts automatically
        while ($LASTEXITCODE -ne 0) {
            Write-Host "🔧 Resolving conflicts..." -ForegroundColor Yellow
            
            # Auto-resolve common conflicts
            git checkout dev -- .kiro/specs/finance-ingestion-benchmark/tasks.md 2>$null
            git add . 2>$null
            git rebase --continue 2>$null
            
            if ($LASTEXITCODE -ne 0) {
                # If continue fails, try skip
                git rebase --skip 2>$null
            }
        }
        
        # Push rebased branch
        git push origin $branchName --force-with-lease 2>$null
        Start-Sleep -Seconds 3
        
        # Try merge again
        $mergeResult = gh pr merge $prId --squash --repo aserron/high-speed-ingestion 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully merged PR #$prId after rebase" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to merge PR #$prId`: $mergeResult" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ Error processing PR #$prId`: $_" -ForegroundColor Red
    }
}

# Final status
git checkout dev 2>$null
git pull origin dev 2>$null

Write-Host ""
Write-Host "🎉 Final merge process completed!" -ForegroundColor Green
Write-Host "📊 Final dev branch status:" -ForegroundColor Cyan
git log --oneline -20

Write-Host ""
Write-Host "📋 Remaining open PRs:" -ForegroundColor Cyan
gh pr list --repo aserron/high-speed-ingestion --state open