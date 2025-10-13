# Force merge PRs by resolving task.md conflicts
Write-Host "🔧 Force merging PRs with conflict resolution..." -ForegroundColor Green

$prsToMerge = @(14, 15, 16, 17, 18, 10)

foreach ($prId in $prsToMerge) {
    Write-Host ""
    Write-Host "📋 Force merging PR #$prId..." -ForegroundColor Cyan
    
    try {
        # Get PR info
        $prInfo = gh pr view $prId --repo aserron/high-speed-ingestion --json headRefName,state 2>$null | ConvertFrom-Json
        
        if ($prInfo.state -ne "OPEN") {
            Write-Host "ℹ️  PR #$prId is $($prInfo.state), skipping..." -ForegroundColor Blue
            continue
        }
        
        $branchName = $prInfo.headRefName
        
        # Update dev
        git checkout dev 2>$null
        git pull origin dev 2>$null
        
        # Checkout PR branch
        git checkout $branchName 2>$null
        
        # Start rebase
        git rebase dev 2>$null
        
        # If there are conflicts, resolve them automatically
        if ($LASTEXITCODE -ne 0) {
            Write-Host "🔧 Resolving conflicts..." -ForegroundColor Yellow
            
            # Check for conflicts in tasks.md
            $conflictFiles = git diff --name-only --diff-filter=U 2>$null
            
            if ($conflictFiles -contains ".kiro/specs/finance-ingestion-benchmark/tasks.md") {
                # Use the dev version of tasks.md (accept incoming changes)
                git checkout dev -- .kiro/specs/finance-ingestion-benchmark/tasks.md 2>$null
                git add .kiro/specs/finance-ingestion-benchmark/tasks.md 2>$null
            }
            
            # Add any other resolved files
            git add . 2>$null
            
            # Continue rebase
            git rebase --continue 2>$null
            
            # If still conflicts, skip
            while ($LASTEXITCODE -ne 0) {
                git rebase --skip 2>$null
            }
        }
        
        # Push the rebased branch
        git push origin $branchName --force-with-lease 2>$null
        
        # Wait for GitHub to process
        Start-Sleep -Seconds 2
        
        # Merge the PR
        $mergeResult = gh pr merge $prId --squash --repo aserron/high-speed-ingestion 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully merged PR #$prId" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to merge PR #$prId`: $mergeResult" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ Error processing PR #$prId`: $_" -ForegroundColor Red
    }
}

# Return to dev and show final status
git checkout dev 2>$null
git pull origin dev 2>$null

Write-Host ""
Write-Host "🎉 Force merge completed!" -ForegroundColor Green
Write-Host "📊 Final status:" -ForegroundColor Cyan
git log --oneline -10