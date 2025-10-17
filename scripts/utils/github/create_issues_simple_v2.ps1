# Create issues first, then add to project
Write-Host "📝 Creating issues for Finance Ingestion Benchmark..." -ForegroundColor Green

# Epic 1: Foundation and Infrastructure
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

$epic1 = gh issue create --title "Foundation and Infrastructure" --body $epic1Body --label "enhancement"
$epic1Number = ($epic1 -replace '.*/', '')
Write-Host "✅ Created Epic 1 (#$epic1Number)" -ForegroundColor Green

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

$epic2 = gh issue create --title "Core Framework Implementation" --body $epic2Body --label "enhancement"
$epic2Number = ($epic2 -replace '.*/', '')
Write-Host "✅ Created Epic 2 (#$epic2Number)" -ForegroundColor Green

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

$epic3 = gh issue create --title "Core Components Implementation" --body $epic3Body --label "enhancement"
$epic3Number = ($epic3 -replace '.*/', '')
Write-Host "✅ Created Epic 3 (#$epic3Number)" -ForegroundColor Green

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

$epic4 = gh issue create --title "Monitoring and Observability" --body $epic4Body --label "enhancement"
$epic4Number = ($epic4 -replace '.*/', '')
Write-Host "✅ Created Epic 4 (#$epic4Number)" -ForegroundColor Green

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

$epic5 = gh issue create --title "Integration and Testing" --body $epic5Body --label "enhancement"
$epic5Number = ($epic5 -replace '.*/', '')
Write-Host "✅ Created Epic 5 (#$epic5Number)" -ForegroundColor Green

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

$epic6 = gh issue create --title "Production Readiness" --body $epic6Body --label "enhancement"
$epic6Number = ($epic6 -replace '.*/', '')
Write-Host "✅ Created Epic 6 (#$epic6Number)" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Created 6 Epic Issues!" -ForegroundColor Green
Write-Host "📋 Issues Created:" -ForegroundColor Cyan
Write-Host "  #$epic1Number - Foundation and Infrastructure" -ForegroundColor White
Write-Host "  #$epic2Number - Core Framework Implementation" -ForegroundColor White
Write-Host "  #$epic3Number - Core Components Implementation" -ForegroundColor White
Write-Host "  #$epic4Number - Monitoring and Observability" -ForegroundColor White
Write-Host "  #$epic5Number - Integration and Testing" -ForegroundColor White
Write-Host "  #$epic6Number - Production Readiness" -ForegroundColor White
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "  • Add these issues to your GitHub Project manually" -ForegroundColor White
Write-Host "  • Create sub-tasks using GitHub's task lists" -ForegroundColor White
Write-Host "  • Set up parent/child relationships in the project" -ForegroundColor White