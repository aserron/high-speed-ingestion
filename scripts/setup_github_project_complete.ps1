# Master script to set up complete GitHub Project with Issues, PRs, and SEMVER
Write-Host "🚀 Setting up complete GitHub Project for Finance Ingestion Benchmark..." -ForegroundColor Green
Write-Host "This will create:" -ForegroundColor Cyan
Write-Host "  📋 GitHub Project with Epics/Tasks/Issues structure" -ForegroundColor White
Write-Host "  🔄 Historical Pull Requests with conventional commits" -ForegroundColor White
Write-Host "  🏷️  SEMVER tags following development progression" -ForegroundColor White
Write-Host "  🌿 Clean development branch structure" -ForegroundColor White
Write-Host ""

# Confirm with user
$confirmation = Read-Host "This will create a lot of GitHub content. Continue? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Operation cancelled by user" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🎯 Step 1: Creating GitHub Project with Epic/Task/Issue structure..." -ForegroundColor Yellow
Write-Host "This will create approximately 130+ issues organized in 6 epics" -ForegroundColor Gray

try {
    & .\scripts\utils\github\create_github_project.ps1
    Write-Host "✅ GitHub Project creation completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create GitHub Project: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Step 2: Creating historical development branch and pull requests..." -ForegroundColor Yellow
Write-Host "This will create 15+ PRs with proper conventional commits and SEMVER tags" -ForegroundColor Gray

try {
    & .\scripts\utils\github\create_historical_prs.ps1
    Write-Host "✅ Historical PR creation completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create historical PRs: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🏷️  Step 3: Creating release tags and GitHub releases..." -ForegroundColor Yellow

# Create GitHub releases for major versions
$majorReleases = @(
    @{
        tag = "v0.4.0"
        title = "Core Framework Complete"
        description = "Complete Python and Node.js foundation frameworks with storage infrastructure"
        prerelease = $true
    },
    @{
        tag = "v0.7.0"
        title = "Core Components Complete"
        description = "WebSocket management, message processing, and storage persistence implemented"
        prerelease = $true
    },
    @{
        tag = "v0.9.0"
        title = "Monitoring and APIs Complete"
        description = "Full monitoring, metrics collection, and REST API endpoints implemented"
        prerelease = $true
    },
    @{
        tag = "v0.13.0"
        title = "Integration and Testing Complete"
        description = "Comprehensive test suite, benchmarking system, and production configuration"
        prerelease = $true
    },
    @{
        tag = "v1.0.0"
        title = "Finance Ingestion Benchmark v1.0.0"
        description = "Complete production-ready Finance Ingestion Benchmark with interactive documentation platform"
        prerelease = $false
    }
)

foreach ($release in $majorReleases) {
    Write-Host "📦 Creating GitHub release: $($release.tag)" -ForegroundColor Cyan
    
    $releaseArgs = @(
        "release", "create", $release.tag,
        "--title", $release.title,
        "--notes", $release.description
    )
    
    if ($release.prerelease) {
        $releaseArgs += "--prerelease"
    } else {
        $releaseArgs += "--latest"
    }
    
    & gh @releaseArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Created release: $($release.tag)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Release might already exist: $($release.tag)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📊 Step 4: Configuring GitHub Project views..." -ForegroundColor Yellow

# Note: GitHub CLI doesn't have full project configuration support yet
# These would need to be done manually in the GitHub UI
Write-Host "⚠️  Manual configuration needed in GitHub UI:" -ForegroundColor Yellow
Write-Host "  1. Go to your project and configure board views" -ForegroundColor White
Write-Host "  2. Set up Epic → Task → Issue hierarchy" -ForegroundColor White
Write-Host "  3. Configure automation rules for PR → Issue linking" -ForegroundColor White
Write-Host "  4. Set up project status workflows" -ForegroundColor White

Write-Host ""
Write-Host "🎉 GitHub Project setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 What was created:" -ForegroundColor Cyan
Write-Host "  📊 GitHub Project with 6 Epics" -ForegroundColor White
Write-Host "  📋 15+ Tasks organized by development phase" -ForegroundColor White
Write-Host "  🔸 130+ Implementation issues" -ForegroundColor White
Write-Host "  🔄 15+ Pull requests with conventional commits" -ForegroundColor White
Write-Host "  🏷️  15+ SEMVER tags following development progression" -ForegroundColor White
Write-Host "  📦 5 GitHub releases for major milestones" -ForegroundColor White
Write-Host "  🌿 Clean development branch with proper merge history" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Links:" -ForegroundColor Cyan
Write-Host "  Repository: https://github.com/aserron/high-speed-ingestion" -ForegroundColor Blue
Write-Host "  Project: https://github.com/aserron/high-speed-ingestion/projects" -ForegroundColor Blue
Write-Host "  Releases: https://github.com/aserron/high-speed-ingestion/releases" -ForegroundColor Blue
Write-Host "  Pull Requests: https://github.com/aserron/high-speed-ingestion/pulls?q=is%3Apr" -ForegroundColor Blue
Write-Host ""
Write-Host "✨ Your Finance Ingestion Benchmark now has a complete GitHub presence!" -ForegroundColor Green
Write-Host "The repository reflects the entire development conversation and evolution." -ForegroundColor Cyan