# Set up proper workflow for Project 8 with dev branch targeting
Write-Host "🚀 Setting up Finance Ingestion Benchmark workflow for Project #8..." -ForegroundColor Green
Write-Host "🎯 Target branch: dev" -ForegroundColor Cyan
Write-Host "👤 Assignee: aserron" -ForegroundColor Cyan

# Check existing issues in project 8
Write-Host ""
Write-Host "📋 Checking existing issues in Project #8..." -ForegroundColor Yellow

$existingIssues = @(1, 2, 3, 4, 5, 6)
foreach ($issueNum in $existingIssues) {
    try {
        $issueInfo = gh issue view $issueNum --json title,state,assignees 2>$null
        if ($issueInfo) {
            $issue = $issueInfo | ConvertFrom-Json
            Write-Host "✅ Issue #$issueNum exists: $($issue.title)" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Issue #$issueNum not found" -ForegroundColor Red
    }
}

# Assign all issues to aserron
Write-Host ""
Write-Host "👤 Assigning issues to aserron..." -ForegroundColor Yellow
foreach ($issueNum in $issues) {
    try {
        gh issue edit $issueNum --add-assignee aserron
        Write-Host "✅ Assigned issue #$issueNum to aserron" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not assign issue #$issueNum" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎯 Phase 1: Foundation and Infrastructure (Issue #1)" -ForegroundColor Cyan
Write-Host "This phase will create the basic monorepo structure and containerization." -ForegroundColor White

# Create subtasks for Phase 1 as separate issues
Write-Host ""
Write-Host "📝 Creating Phase 1 subtasks..." -ForegroundColor Yellow

# Subtask 1.1: Monorepo Setup
$task1_1Body = @"
Set up Turborepo for efficient monorepo management and caching

## Parent Issue
This is a subtask of #1 - Foundation and Infrastructure

## Implementation Items
- [ ] Initialize Turborepo configuration
- [ ] Create root package.json with workspace configuration  
- [ ] Set up turbo.json with build pipelines
- [ ] Configure shared scripts for development and testing
- [ ] Create comprehensive .gitignore file
- [ ] Set up initial README.md with project overview
- [ ] Create base directory structure

## Acceptance Criteria
- [ ] Turborepo is properly configured
- [ ] All workspaces are recognized
- [ ] Build pipelines work correctly
- [ ] Documentation is updated

## Branch Strategy
- Create feature branch from \`dev\`
- Target \`dev\` branch for PR
- Merge after review and testing
"@

$task1_1 = gh issue create --title "Task 1.1: Initialize monorepo with Turborepo" --body $task1_1Body --label "task,phase-1" --assignee aserron
$task1_1Number = ($task1_1 -replace '.*/', '')
Write-Host "✅ Created Task 1.1 (#$task1_1Number)" -ForegroundColor Green

# Add to project
gh project item-add 8 --url "https://github.com/aserron/high-speed-ingestion/issues/$task1_1Number"

# Subtask 1.2: Containerization
$task1_2Body = @"
Create Docker configuration for development environment

## Parent Issue  
This is a subtask of #1 - Foundation and Infrastructure

## Implementation Items
- [ ] Create Docker Compose configuration for development
- [ ] Write Dockerfile for Python application with multi-stage build
- [ ] Write Dockerfile for Node.js application with multi-stage build  
- [ ] Configure Redis and PostgreSQL services in Docker Compose
- [ ] Set up identical resource limits for fair comparison
- [ ] Create development scripts for container management

## Acceptance Criteria
- [ ] Docker containers build successfully
- [ ] Services start and connect properly
- [ ] Resource limits are properly configured
- [ ] Development workflow is streamlined

## Branch Strategy
- Create feature branch from \`dev\`
- Target \`dev\` branch for PR
- Merge after review and testing
"@

$task1_2 = gh issue create --title "Task 1.2: Set up containerization infrastructure" --body $task1_2Body --label "task,phase-1" --assignee aserron
$task1_2Number = ($task1_2 -replace '.*/', '')
Write-Host "✅ Created Task 1.2 (#$task1_2Number)" -ForegroundColor Green

# Add to project
gh project item-add 8 --url "https://github.com/aserron/high-speed-ingestion/issues/$task1_2Number"

# Subtask 1.3: Shared Packages
$task1_3Body = @"
Create shared packages and data models

## Parent Issue
This is a subtask of #1 - Foundation and Infrastructure

## Implementation Items
- [ ] Create shared TypeScript/JavaScript packages
- [ ] Define common data models and interfaces
- [ ] Set up shared utilities and helpers
- [ ] Create configuration management system
- [ ] Set up shared testing utilities
- [ ] Document package architecture

## Acceptance Criteria
- [ ] Shared packages are properly structured
- [ ] Data models are consistent across implementations
- [ ] Utilities are reusable and well-tested
- [ ] Configuration system is flexible

## Branch Strategy
- Create feature branch from \`dev\`
- Target \`dev\` branch for PR
- Merge after review and testing
"@

$task1_3 = gh issue create --title "Task 1.3: Create shared packages and data models" --body $task1_3Body --label "task,phase-1" --assignee aserron
$task1_3Number = ($task1_3 -replace '.*/', '')
Write-Host "✅ Created Task 1.3 (#$task1_3Number)" -ForegroundColor Green

# Add to project
gh project item-add 8 --url "https://github.com/aserron/high-speed-ingestion/issues/$task1_3Number"

Write-Host ""
Write-Host "🎉 Project #8 workflow setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  🎯 Target Branch: dev" -ForegroundColor White
Write-Host "  👤 Assignee: aserron" -ForegroundColor White
Write-Host "  📋 Project: #8 (Finance Ingestion Benchmark Development)" -ForegroundColor White
Write-Host "  📝 Phase 1 Tasks Created:" -ForegroundColor White
Write-Host "    • Task 1.1: Monorepo Setup (#$task1_1Number)" -ForegroundColor Gray
Write-Host "    • Task 1.2: Containerization (#$task1_2Number)" -ForegroundColor Gray
Write-Host "    • Task 1.3: Shared Packages (#$task1_3Number)" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review Phase 1 tasks in Project #8" -ForegroundColor White
Write-Host "  2. Start with Task 1.1 (Monorepo Setup)" -ForegroundColor White
Write-Host "  3. Create feature branch from dev" -ForegroundColor White
Write-Host "  4. Implement and create PR targeting dev" -ForegroundColor White
Write-Host ""
Write-Host "🌐 View Project: https://github.com/users/aserron/projects/8" -ForegroundColor Blue