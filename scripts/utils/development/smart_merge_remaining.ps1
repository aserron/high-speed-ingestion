# Smart merge - only merge branches with unique content not already in dev
Write-Host "🧠 Smart merge: Analyzing branches for unique content..." -ForegroundColor Green

# Get current dev commit
git checkout dev 2>$null
git pull origin dev 2>$null
$devCommit = git rev-parse HEAD

Write-Host "📍 Current dev HEAD: $devCommit" -ForegroundColor Cyan

# Define branches to check
$branchesToCheck = @(
    "feat/P04T11-python-rest-api",
    "feat/P04T11-node-rest-api", 
    "feat/P05T12-integration-tests",
    "feat/P05T12.2-performance-regression-tests",
    "feat/P05T13-benchmarking-system",
    "feat/P06T14-production-config",
    "feat/P06T14-deployment-automation",
    "feat/P06T15-final-integration"
)

$uniqueBranches = @()
$duplicateBranches = @()

foreach ($branch in $branchesToCheck) {
    Write-Host ""
    Write-Host "🔍 Analyzing branch: $branch" -ForegroundColor Yellow
    
    # Check if branch exists
    $branchExists = git branch -a | Select-String $branch
    if (-not $branchExists) {
        Write-Host "❌ Branch not found: $branch" -ForegroundColor Red
        continue
    }
    
    # Checkout the branch
    git checkout $branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Could not checkout: $branch" -ForegroundColor Red
        continue
    }
    
    # Get the unique commits in this branch that are not in dev
    $uniqueCommits = git rev-list $branch --not dev 2>$null
    
    if ($uniqueCommits) {
        Write-Host "✅ Has unique content ($($uniqueCommits.Count) commits)" -ForegroundColor Green
        
        # Check if the content is meaningful (not just package-lock.json updates)
        $meaningfulChanges = $false
        
        foreach ($commit in $uniqueCommits) {
            $changedFiles = git diff-tree --no-commit-id --name-only -r $commit 2>$null
            
            # Filter out non-meaningful files
            $meaningfulFiles = $changedFiles | Where-Object { 
                $_ -notmatch "package-lock\.json" -and 
                $_ -notmatch "\.kiro/specs.*tasks\.md" -and
                $_ -notmatch "node_modules" 
            }
            
            if ($meaningfulFiles) {
                $meaningfulChanges = $true
                Write-Host "  📄 Meaningful files: $($meaningfulFiles -join ', ')" -ForegroundColor Gray
                break
            }
        }
        
        if ($meaningfulChanges) {
            $uniqueBranches += $branch
            Write-Host "  ✅ KEEP: Has meaningful unique content" -ForegroundColor Green
        } else {
            $duplicateBranches += $branch
            Write-Host "  ⚠️  SKIP: Only has package-lock/config updates" -ForegroundColor Yellow
        }
    } else {
        $duplicateBranches += $branch
        Write-Host "  ❌ SKIP: No unique content (already in dev)" -ForegroundColor Red
    }
}

# Return to dev
git checkout dev 2>$null

Write-Host ""
Write-Host "📊 Analysis Results:" -ForegroundColor Cyan
Write-Host "✅ Branches with unique content ($($uniqueBranches.Count)):" -ForegroundColor Green
foreach ($branch in $uniqueBranches) {
    Write-Host "  • $branch" -ForegroundColor White
}

Write-Host ""
Write-Host "⚠️  Branches to skip ($($duplicateBranches.Count)):" -ForegroundColor Yellow
foreach ($branch in $duplicateBranches) {
    Write-Host "  • $branch" -ForegroundColor Gray
}

if ($uniqueBranches.Count -eq 0) {
    Write-Host ""
    Write-Host "🎉 All content is already integrated! No additional merges needed." -ForegroundColor Green
    Write-Host "📋 Current dev branch represents complete project state." -ForegroundColor Cyan
    
    # Show final dev history
    Write-Host ""
    Write-Host "📜 Final dev branch history:" -ForegroundColor Cyan
    git log --oneline -15
    
    exit 0
}

Write-Host ""
$proceed = Read-Host "Proceed with merging $($uniqueBranches.Count) unique branches? (y/N)"

if ($proceed -ne 'y' -and $proceed -ne 'Y') {
    Write-Host "❌ Cancelled by user" -ForegroundColor Red
    exit 0
}

# Merge only unique branches
foreach ($branch in $uniqueBranches) {
    Write-Host ""
    Write-Host "🔄 Processing unique branch: $branch" -ForegroundColor Cyan
    
    # Check if PR exists
    $existingPR = gh pr list --head $branch --repo aserron/high-speed-ingestion --state all 2>$null
    
    if ($existingPR) {
        $prNumber = ($existingPR -split '\s+')[0] -replace '#', ''
        Write-Host "📋 Found existing PR #$prNumber" -ForegroundColor Blue
        
        # Check PR state
        $prInfo = gh pr view $prNumber --repo aserron/high-speed-ingestion --json state 2>$null | ConvertFrom-Json
        
        if ($prInfo.state -eq "OPEN") {
            Write-Host "🔄 Attempting to merge PR #$prNumber..." -ForegroundColor Yellow
            
            # Try direct merge first
            $mergeResult = gh pr merge $prNumber --squash --repo aserron/high-speed-ingestion 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Successfully merged PR #$prNumber" -ForegroundColor Green
                git pull origin dev 2>$null
            } else {
                Write-Host "⚠️  Direct merge failed, attempting rebase..." -ForegroundColor Yellow
                
                # Rebase approach
                git checkout $branch 2>$null
                git rebase dev 2>$null
                
                # Handle conflicts
                while ($LASTEXITCODE -ne 0) {
                    # Auto-resolve common conflicts
                    git checkout dev -- .kiro/specs/finance-ingestion-benchmark/tasks.md 2>$null
                    git add . 2>$null
                    git rebase --continue 2>$null
                    
                    if ($LASTEXITCODE -ne 0) {
                        git rebase --skip 2>$null
                    }
                }
                
                git push origin $branch --force-with-lease 2>$null
                Start-Sleep -Seconds 3
                
                $mergeResult = gh pr merge $prNumber --squash --repo aserron/high-speed-ingestion 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Successfully merged PR #$prNumber after rebase" -ForegroundColor Green
                    git checkout dev 2>$null
                    git pull origin dev 2>$null
                } else {
                    Write-Host "❌ Failed to merge PR #$prNumber`: $mergeResult" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "ℹ️  PR #$prNumber is already $($prInfo.state)" -ForegroundColor Blue
        }
    } else {
        Write-Host "📝 Creating new PR for $branch..." -ForegroundColor Cyan
        
        # Determine appropriate title and description based on branch name
        $title = "feat: implement " + ($branch -replace "feat/P\d+T?\d*-?", "" -replace "-", " ")
        $description = "This PR implements functionality from branch $branch with unique content not present in the current dev branch."
        
        $newPR = gh pr create --title $title --body $description --base dev --head $branch --assignee aserron --label "enhancement" --repo aserron/high-speed-ingestion 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Created PR: $newPR" -ForegroundColor Green
            
            $prNumber = ($newPR -split '/')[-1]
            Start-Sleep -Seconds 2
            
            $mergeResult = gh pr merge $prNumber --squash --repo aserron/high-speed-ingestion 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Successfully merged new PR #$prNumber" -ForegroundColor Green
                git pull origin dev 2>$null
            } else {
                Write-Host "⚠️  Manual merge needed for PR #$prNumber" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Failed to create PR: $newPR" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "🎉 Smart merge completed!" -ForegroundColor Green
Write-Host "📜 Final dev branch history:" -ForegroundColor Cyan
git log --oneline -15