# Create issues using GitHub's native task hierarchy - Fixed version
Write-Host "📝 Creating issues with proper GitHub task hierarchy for Project #7..." -ForegroundColor Green

# Epic 1: Foundation and Infrastructure (Parent Issue)
Write-Host "🎯 Creating Epic 1: Foundation and Infrastructure" -ForegroundColor Cyan

$epic1Body = @"
Set up monorepo structure, containerization, and shared packages

## Overview
This epic covers the foundational infrastructure needed for the Finance Ingestion Benchmark project.

## Tasks
- [ ] Initialize monorepo with Turborepo
- [ ] Set up containerization infrastructure  
- [ ] Create shared packages and data models

## Acceptance Criteria
- [ ] All sub-tasks are completed
- [ ] All related tests are passing
- [ ] Documentation is updated
- [ ] Performance benchmarks are verified
"@

try {
    $epic1Result = gh issue create --title "Foundation and Infrastructure" --body $epic1Body --label "enhancement" --project 7 2>&1
    if ($LASTEXITCODE -eq 0) {
        $epic1Number = ($epic1Result -replace '.*/', '')
        Write-Host "✅ Created Epic 1 (#$epic1Number)" -ForegroundColor Green
        
        # Task 1.1: Initialize monorepo with Turborepo
        $task1Body = @"
Set up Turborepo for efficient monorepo management and caching

## Implementation Items
- [ ] Initialize Turborepo configuration
- [ ] Create root package.json with workspace configuration
- [ ] Set up turbo.json with build pipelines
- [ ] Configure shared scripts for development and testing
- [ ] Create comprehensive .gitignore file
- [ ] Set up initial README.md with project overview
- [ ] Create base directory structure
- [ ] Initialize git repository and commit base structure

## Acceptance Criteria
- [ ] All implementation items are completed
- [ ] Unit tests are written and passing
- [ ] Integration tests are updated
- [ ] Code is reviewed and merged
- [ ] Documentation is updated

Parent: #$epic1Number
"@

        $task1Result = gh issue create --title "Initialize monorepo with Turborepo" --body $task1Body --project 7 2>&1
        if ($LASTEXITCODE -eq 0) {
            $task1Number = ($task1Result -replace '.*/', '')
            Write-Host "✅ Created Task 1.1 (#$task1Number)" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to create Task 1.1: $task1Result" -ForegroundColor Red
        }

        # Task 1.2: Set up containerization infrastructure
        $task2Body = @"
Create Docker configuration for development environment

## Implementation Items
- [ ] Create Docker Compose configuration for development
- [ ] Write Dockerfile for Python application with multi-stage build
- [ ] Write Dockerfile for Node.js application with multi-stage build
- [ ] Configure Redis and PostgreSQL services in Docker Compose
- [ ] Set up identical resource limits for fair comparison

## Acceptance Criteria
- [ ] All implementation items are completed
- [ ] Docker containers build successfully
- [ ] Services start and connect properly
- [ ] Resource limits are properly configured
- [ ] Documentation is updated

Parent: #$epic1Number
"@

        $task2Result = gh issue create --title "Set up containerization infrastructure" --body $task2Body --project 7 2>&1
        if ($LASTEXITCODE -eq 0) {
            $task2Number = ($task2Result -replace '.*/', '')
            Write-Host "✅ Created Task 1.2 (#$task2Number)" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to create Task 1.2: $task2Result" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Failed to create Epic 1: $epic1Result" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error creating Epic 1: $_" -ForegroundColor Red
}

# Epic 2: Core Framework Implementation
Write-Host "🎯 Creating Epic 2: Core Framework Implementation" -ForegroundColor Cyan

$epic2Body = @"
Implement foundation frameworks for both Python and Node.js

## Overview
Build high-performance foundation frameworks optimized for financial data ingestion.

## Tasks
- [ ] Implement Python foundation framework with asyncio
- [ ] Implement Node.js foundation framework with clustering
- [ ] Implement storage layer infrastructure

## Acceptance Criteria
- [ ] Both frameworks are fully functional
- [ ] Storage layer is properly integrated
- [ ] Performance targets are met (< 1ms P99 latency)
"@

try {
    $epic2Result = gh issue create --title "Core Framework Implementation" --body $epic2Body --label "enhancement" --project 7 2>&1
    if ($LASTEXITCODE -eq 0) {
        $epic2Number = ($epic2Result -replace '.*/', '')
        Write-Host "✅ Created Epic 2 (#$epic2Number)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create Epic 2: $epic2Result" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error creating Epic 2: $_" -ForegroundColor Red
}

# Epic 3: Core Components Implementation
Write-Host "🎯 Creating Epic 3: Core Components Implementation" -ForegroundColor Cyan

$epic3Body = @"
Implement WebSocket management, message processing, and storage

## Overview
Build robust WebSocket clients and high-performance message processors.

## Tasks
- [ ] Implement WebSocket connection management
- [ ] Implement message processing engines
- [ ] Implement storage and persistence layer

## Acceptance Criteria
- [ ] WebSocket connections are stable with auto-reconnect
- [ ] Message processing meets latency targets (< 1ms P99)
- [ ] Storage layer handles high throughput (10,000+ msg/sec)
"@

try {
    $epic3Result = gh issue create --title "Core Components Implementation" --body $epic3Body --label "enhancement" --project 7 2>&1
    if ($LASTEXITCODE -eq 0) {
        $epic3Number = ($epic3Result -replace '.*/', '')
        Write-Host "✅ Created Epic 3 (#$epic3Number)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create Epic 3: $epic3Result" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error creating Epic 3: $_" -ForegroundColor Red
}

# Epic 4: Monitoring and Observability
Write-Host "🎯 Creating Epic 4: Monitoring and Observability" -ForegroundColor Cyan

$epic4Body = @"
Implement comprehensive metrics collection and REST APIs

## Overview
Add comprehensive monitoring, metrics, and REST API endpoints.

## Tasks
- [ ] Implement Prometheus metrics and monitoring
- [ ] Implement REST API endpoints
- [ ] Add structured logging and observability

## Acceptance Criteria
- [ ] Prometheus metrics are exported
- [ ] REST APIs are functional and documented
- [ ] Monitoring dashboards are available
- [ ] Observability covers all critical paths
"@

try {
    $epic4Result = gh issue create --title "Monitoring and Observability" --body $epic4Body --label "enhancement" --project 7 2>&1
    if ($LASTEXITCODE -eq 0) {
        $epic4Number = ($epic4Result -replace '.*/', '')
        Write-Host "✅ Created Epic 4 (#$epic4Number)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create Epic 4: $epic4Result" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error creating Epic 4: $_" -ForegroundColor Red
}

# Epic 5: Integration and Testing
Write-Host "🎯 Creating Epic 5: Integration and Testing" -ForegroundColor Cyan

$epic5Body = @"
Create comprehensive test suite and benchmarking system

## Overview
Build complete testing infrastructure and performance benchmarking.

## Tasks
- [ ] Create integration test suite
- [ ] Implement comprehensive benchmarking system
- [ ] Add performance regression testing

## Acceptance Criteria
- [ ] All integration tests pass
- [ ] Benchmarking system is complete
- [ ] Performance regression tests prevent degradation
- [ ] Test coverage is comprehensive (>90%)
"@

try {
    $epic5Result = gh issue create --title "Integration and Testing" --body $epic5Body --label "enhancement" --project 7 2>&1
    if ($LASTEXITCODE -eq 0) {
        $epic5Number = ($epic5Result -replace '.*/', '')
        Write-Host "✅ Created Epic 5 (#$epic5Number)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create Epic 5: $epic5Result" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error creating Epic 5: $_" -ForegroundColor Red
}

# Epic 6: Production Readiness
Write-Host "🎯 Creating Epic 6: Production Readiness" -ForegroundColor Cyan

$epic6Body = @"
Production configuration, deployment, and documentation

## Overview
Complete production deployment setup and comprehensive documentation.

## Tasks
- [ ] Implement production configuration and deployment
- [ ] Create comprehensive documentation platform
- [ ] Add deployment automation and monitoring

## Acceptance Criteria
- [ ] Production deployment is ready and tested
- [ ] Documentation is comprehensive and interactive
- [ ] System is production-ready with monitoring
- [ ] All requirements are met and verified
"@

try {
    $epic6Result = gh issue create --title "Production Readiness" --body $epic6Body --label "enhancement" --project 7 2>&1
    if ($LASTEXITCODE -eq 0) {
        $epic6Number = ($epic6Result -replace '.*/', '')
        Write-Host "✅ Created Epic 6 (#$epic6Number)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create Epic 6: $epic6Result" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error creating Epic 6: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Created Parent Issues (Epics) with GitHub task hierarchy!" -ForegroundColor Green
Write-Host "🌐 View at: https://github.com/users/aserron/projects/7" -ForegroundColor Blue
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "  • Check the project board to see all issues" -ForegroundColor White
Write-Host "  • Add more sub-tasks using GitHub's task lists" -ForegroundColor White
Write-Host "  • Link pull requests to specific tasks" -ForegroundColor White
Write-Host "  • Use the Parent/Sub-issue fields in the project" -ForegroundColor White