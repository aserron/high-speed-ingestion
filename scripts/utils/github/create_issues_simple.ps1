# Create issues using GitHub's native task hierarchy
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

$epic1 = gh issue create --title "Foundation and Infrastructure" --body $epic1Body --label "enhancement,phase-1" --project 7
$epic1Number = ($epic1 -split '/')[-1]
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

$task1 = gh issue create --title "Initialize monorepo with Turborepo" --body $task1Body --label "task,setup" --project 7
$task1Number = ($task1 -split '/')[-1]
Write-Host "✅ Created Task 1.1 (#$task1Number)" -ForegroundColor Green

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

$task2 = gh issue create --title "Set up containerization infrastructure" --body $task2Body --label "task,docker" --project 7
$task2Number = ($task2 -split '/')[-1]
Write-Host "✅ Created Task 1.2 (#$task2Number)" -ForegroundColor Green

# Epic 2: Core Framework Implementation (Parent Issue)
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

$epic2 = gh issue create --title "Core Framework Implementation" --body $epic2Body --label "enhancement,phase-2" --project 7
$epic2Number = ($epic2 -split '/')[-1]
Write-Host "✅ Created Epic 2 (#$epic2Number)" -ForegroundColor Green

# Epic 3: Core Components Implementation (Parent Issue)
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

$epic3 = gh issue create --title "Core Components Implementation" --body $epic3Body --label "enhancement,phase-3" --project 7
$epic3Number = ($epic3 -split '/')[-1]
Write-Host "✅ Created Epic 3 (#$epic3Number)" -ForegroundColor Green

# Epic 4: Monitoring and Observability (Parent Issue)
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

$epic4 = gh issue create --title "Monitoring and Observability" --body $epic4Body --label "enhancement,phase-4" --project 7
$epic4Number = ($epic4 -split '/')[-1]
Write-Host "✅ Created Epic 4 (#$epic4Number)" -ForegroundColor Green

# Epic 5: Integration and Testing (Parent Issue)
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

$epic5 = gh issue create --title "Integration and Testing" --body $epic5Body --label "enhancement,phase-5" --project 7
$epic5Number = ($epic5 -split '/')[-1]
Write-Host "✅ Created Epic 5 (#$epic5Number)" -ForegroundColor Green

# Epic 6: Production Readiness (Parent Issue)
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

$epic6 = gh issue create --title "Production Readiness" --body $epic6Body --label "enhancement,phase-6" --project 7
$epic6Number = ($epic6 -split '/')[-1]
Write-Host "✅ Created Epic 6 (#$epic6Number)" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Created 6 Parent Issues (Epics) with proper GitHub hierarchy!" -ForegroundColor Green
Write-Host "🌐 View at: https://github.com/users/aserron/projects/7" -ForegroundColor Blue
Write-Host ""
Write-Host "📋 Structure Created:" -ForegroundColor Cyan
Write-Host "  📁 Epic 1: Foundation and Infrastructure (#$epic1Number)" -ForegroundColor White
Write-Host "    └── Task 1.1: Initialize monorepo (#$task1Number)" -ForegroundColor Gray
Write-Host "    └── Task 1.2: Containerization (#$task2Number)" -ForegroundColor Gray
Write-Host "  📁 Epic 2: Core Framework Implementation (#$epic2Number)" -ForegroundColor White
Write-Host "  📁 Epic 3: Core Components Implementation (#$epic3Number)" -ForegroundColor White
Write-Host "  📁 Epic 4: Monitoring and Observability (#$epic4Number)" -ForegroundColor White
Write-Host "  📁 Epic 5: Integration and Testing (#$epic5Number)" -ForegroundColor White
Write-Host "  📁 Epic 6: Production Readiness (#$epic6Number)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "  • Add more sub-tasks to each epic as needed" -ForegroundColor White
Write-Host "  • Use GitHub's task lists within issue descriptions" -ForegroundColor White
Write-Host "  • Link pull requests to specific tasks" -ForegroundColor White