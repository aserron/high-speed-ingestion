# PowerShell script to create GitHub Project with proper Epic/Task/Issue structure
Write-Host "🚀 Creating GitHub Project for Finance Ingestion Benchmark..." -ForegroundColor Green

# First, let's create the GitHub Project
Write-Host "📋 Creating GitHub Project..." -ForegroundColor Yellow
$projectTitle = "Finance Ingestion Benchmark Development"
$projectDescription = "Complete development tracking for the Finance Ingestion Benchmark project comparing Python vs Node.js implementations"

# Create the project
$project = gh project create --title $projectTitle --owner "@me" --format json | ConvertFrom-Json

if ($project) {
    $projectNumber = $project.number
    Write-Host "✅ Created GitHub Project #$projectNumber" -ForegroundColor Green
    Write-Host "🌐 Project URL: $($project.url)" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to create GitHub Project" -ForegroundColor Red
    exit 1
}

# Define the Epic structure based on phases
$epics = @(
    @{
        title = "Epic: Foundation and Infrastructure"
        phase = "Phase 1"
        description = "Set up monorepo structure, containerization, and shared packages"
        labels = @("epic", "phase-1", "infrastructure")
        tasks = @(
            @{
                title = "Initialize monorepo with Turborepo"
                description = "Set up Turborepo for efficient monorepo management and caching"
                labels = @("task", "setup", "monorepo")
                issues = @(
                    "Initialize Turborepo configuration",
                    "Create root package.json with workspace configuration", 
                    "Set up turbo.json with build pipelines",
                    "Configure shared scripts for development and testing",
                    "Create comprehensive .gitignore file",
                    "Set up initial README.md with project overview",
                    "Create base directory structure",
                    "Initialize git repository and commit base structure"
                )
            },
            @{
                title = "Set up containerization infrastructure"
                description = "Create Docker configuration for development environment"
                labels = @("task", "docker", "infrastructure")
                issues = @(
                    "Create Docker Compose configuration for development",
                    "Write Dockerfile for Python application with multi-stage build",
                    "Write Dockerfile for Node.js application with multi-stage build",
                    "Configure Redis and PostgreSQL services in Docker Compose",
                    "Set up identical resource limits for fair comparison"
                )
            },
            @{
                title = "Create shared packages and data models"
                description = "Define common schemas and utilities for both implementations"
                labels = @("task", "shared", "schemas")
                issues = @(
                    "Create packages/shared/ directory structure",
                    "Define market data message format specification (JSON schema)",
                    "Create PostgreSQL database schema for historical data",
                    "Define Redis key patterns and data structures",
                    "Document serialization format (MessagePack) specification",
                    "Create shared configuration schemas",
                    "Set up shared TypeScript definitions"
                )
            }
        )
    },
    @{
        title = "Epic: Core Framework Implementation"
        phase = "Phase 2"
        description = "Implement foundation frameworks for both Python and Node.js"
        labels = @("epic", "phase-2", "framework")
        tasks = @(
            @{
                title = "Implement Python foundation framework"
                description = "Set up Python project structure with asyncio and uvloop"
                labels = @("task", "python", "framework")
                issues = @(
                    "Set up Python project structure with proper package organization",
                    "Configure asyncio with uvloop for maximum performance",
                    "Implement base configuration management system",
                    "Create logging infrastructure with structured JSON output",
                    "Set up error handling and exception management framework"
                )
            },
            @{
                title = "Implement Node.js foundation framework"
                description = "Set up Node.js project structure with clustering"
                labels = @("task", "nodejs", "framework")
                issues = @(
                    "Set up Node.js project structure with ES modules",
                    "Configure native clustering for multi-core utilization",
                    "Implement base configuration management system",
                    "Create logging infrastructure with Winston and JSON formatting",
                    "Set up error handling and exception management framework"
                )
            },
            @{
                title = "Implement storage layer infrastructure"
                description = "Create Redis and PostgreSQL connection managers"
                labels = @("task", "storage", "infrastructure")
                issues = @(
                    "Create Redis connection manager with connection pooling for Python",
                    "Create Redis connection manager with connection pooling for Node.js",
                    "Implement PostgreSQL connection manager with async pooling for Python",
                    "Implement PostgreSQL connection manager with pooling for Node.js",
                    "Create base storage interface contracts for both platforms"
                )
            }
        )
    },
    @{
        title = "Epic: Core Components Implementation"
        phase = "Phase 3"
        description = "Implement WebSocket management, message processing, and storage"
        labels = @("epic", "phase-3", "components")
        tasks = @(
            @{
                title = "Implement WebSocket connection management"
                description = "Create robust WebSocket clients with reconnection logic"
                labels = @("task", "websocket", "connection")
                issues = @(
                    "Create Python WebSocket connection manager with websockets library",
                    "Add connection health monitoring and heartbeat mechanism for Python",
                    "Implement exponential backoff reconnection strategy for Python",
                    "Add connection statistics tracking for Python",
                    "Create Node.js WebSocket connection manager with ws library",
                    "Add connection health monitoring and heartbeat mechanism for Node.js",
                    "Implement exponential backoff reconnection strategy for Node.js",
                    "Add connection statistics tracking for Node.js",
                    "Write unit tests for Python WebSocket connection manager",
                    "Write unit tests for Node.js WebSocket connection manager",
                    "Test reconnection logic and error handling scenarios"
                )
            },
            @{
                title = "Implement message processing engines"
                description = "Create high-performance message processors with latency tracking"
                labels = @("task", "processing", "performance")
                issues = @(
                    "Implement high-performance message parsing with MessagePack for Python",
                    "Add end-to-end latency measurement using time.perf_counter_ns",
                    "Implement backpressure handling with adaptive batching for Python",
                    "Create message validation and error handling for Python",
                    "Implement high-performance message parsing with msgpack5 for Node.js",
                    "Add end-to-end latency measurement using process.hrtime.bigint",
                    "Implement backpressure handling with adaptive batching for Node.js",
                    "Create message validation and error handling for Node.js",
                    "Write unit tests for Python message processing logic",
                    "Write unit tests for Node.js message processing logic",
                    "Test latency measurement accuracy and backpressure handling"
                )
            },
            @{
                title = "Implement storage and persistence layer"
                description = "Create storage managers for Redis and PostgreSQL"
                labels = @("task", "storage", "persistence")
                issues = @(
                    "Implement Redis real-time data storage with connection pooling for Python",
                    "Implement PostgreSQL historical data persistence with batch inserts for Python",
                    "Create in-memory circular buffer for high-frequency data for Python",
                    "Add storage performance monitoring and error handling for Python",
                    "Implement Redis real-time data storage with connection pooling for Node.js",
                    "Implement PostgreSQL historical data persistence with batch inserts for Node.js",
                    "Create in-memory circular buffer for high-frequency data for Node.js",
                    "Add storage performance monitoring and error handling for Node.js",
                    "Write unit tests for Python storage operations",
                    "Write unit tests for Node.js storage operations",
                    "Test buffer management and persistence logic"
                )
            }
        )
    },
    @{
        title = "Epic: Monitoring and Observability"
        phase = "Phase 4"
        description = "Implement comprehensive metrics collection and REST APIs"
        labels = @("epic", "phase-4", "monitoring")
        tasks = @(
            @{
                title = "Implement metrics and monitoring systems"
                description = "Create Prometheus metrics exporters and monitoring"
                labels = @("task", "metrics", "monitoring")
                issues = @(
                    "Implement Prometheus metrics exporter with custom metrics for Python",
                    "Add latency percentile tracking (p50, p95, p99, p99.9) for Python",
                    "Create throughput and resource utilization monitoring for Python",
                    "Implement structured logging with correlation IDs for Python",
                    "Implement Prometheus metrics exporter with prom-client for Node.js",
                    "Add latency percentile tracking (p50, p95, p99, p99.9) for Node.js",
                    "Create throughput and resource utilization monitoring for Node.js",
                    "Implement structured logging with correlation IDs for Node.js"
                )
            },
            @{
                title = "Implement REST API endpoints"
                description = "Create health checks, metrics, and stats endpoints"
                labels = @("task", "api", "rest")
                issues = @(
                    "Implement /health endpoint for health checks for Python",
                    "Implement /metrics endpoint for Prometheus scraping for Python",
                    "Implement /stats endpoint for real-time performance statistics for Python",
                    "Add OpenAPI 3.0 specification documentation for Python",
                    "Implement /health endpoint for health checks for Node.js",
                    "Implement /metrics endpoint for Prometheus scraping for Node.js",
                    "Implement /stats endpoint for real-time performance statistics for Node.js",
                    "Add OpenAPI 3.0 specification documentation for Node.js"
                )
            }
        )
    },
    @{
        title = "Epic: Integration and Testing"
        phase = "Phase 5"
        description = "Create comprehensive test suite and benchmarking system"
        labels = @("epic", "phase-5", "testing")
        tasks = @(
            @{
                title = "Create integration test suite"
                description = "Implement end-to-end integration tests and performance regression tests"
                labels = @("task", "testing", "integration")
                issues = @(
                    "Create WebSocket data feed simulator for testing",
                    "Implement integration tests for complete data flow",
                    "Add network failure simulation and recovery testing",
                    "Create load testing scenarios with realistic market data patterns",
                    "Create automated performance benchmarks",
                    "Implement latency regression detection",
                    "Add throughput regression testing"
                )
            },
            @{
                title = "Implement comprehensive benchmarking system"
                description = "Create benchmark orchestration and reporting"
                labels = @("task", "benchmarking", "performance")
                issues = @(
                    "Implement benchmark runner that tests both systems with identical conditions",
                    "Create realistic market data generator with configurable patterns",
                    "Add burst testing for market open simulation",
                    "Implement resource monitoring during benchmarks",
                    "Implement side-by-side performance comparison reports",
                    "Add latency distribution visualization and analysis",
                    "Create throughput and resource utilization comparison charts",
                    "Generate automated benchmark summary reports"
                )
            }
        )
    },
    @{
        title = "Epic: Production Readiness"
        phase = "Phase 6"
        description = "Production configuration, deployment, and documentation"
        labels = @("epic", "phase-6", "production")
        tasks = @(
            @{
                title = "Implement production configuration and deployment"
                description = "Create production-ready configuration and deployment automation"
                labels = @("task", "production", "deployment")
                issues = @(
                    "Implement environment-specific configuration for both systems",
                    "Add authentication support (API keys, JWT tokens) for both platforms",
                    "Create TLS/SSL configuration for secure WebSocket connections",
                    "Implement production logging and monitoring configuration",
                    "Create production Docker Compose configuration",
                    "Implement health check endpoints for container orchestration",
                    "Add graceful shutdown handling for both applications",
                    "Create deployment scripts and documentation"
                )
            },
            @{
                title = "Final integration and documentation"
                description = "Complete system integration and comprehensive documentation"
                labels = @("task", "integration", "documentation")
                issues = @(
                    "Wire all components together in both implementations",
                    "Implement complete data flow from WebSocket ingestion to storage",
                    "Add comprehensive error handling and recovery mechanisms",
                    "Perform final end-to-end testing with realistic workloads",
                    "Write deployment and operations guide",
                    "Create performance tuning recommendations",
                    "Document benchmark results and analysis methodology",
                    "Create troubleshooting guide for common issues"
                )
            },
            @{
                title = "Enhanced Documentation Platform"
                description = "Create modern interactive documentation website"
                labels = @("task", "documentation", "platform")
                issues = @(
                    "Set up documentation framework (VitePress)",
                    "Implement syntax-highlighted code snippets with copy functionality",
                    "Add interactive code examples and live demos",
                    "Create responsive design with modern UI/UX",
                    "Implement Mermaid diagrams for system architecture",
                    "Add interactive performance charts and graphs",
                    "Create visual API documentation with examples",
                    "Add system flow diagrams with clickable components",
                    "Add search functionality across all documentation",
                    "Create cross-references and internal linking system",
                    "Implement versioning for different releases",
                    "Add dark/light theme toggle",
                    "Create mobile-responsive navigation",
                    "Set up automated documentation deployment",
                    "Configure custom domain and SSL certificates",
                    "Implement CI/CD pipeline for documentation updates",
                    "Add analytics and user feedback collection",
                    "Create documentation maintenance procedures"
                )
            }
        )
    }
)

Write-Host "📝 Creating Epics, Tasks, and Issues..." -ForegroundColor Yellow

$epicNumber = 1
$taskNumber = 1
$issueNumber = 1

foreach ($epic in $epics) {
    Write-Host "🎯 Creating Epic $epicNumber`: $($epic.title)" -ForegroundColor Cyan
    
    # Create Epic as an Issue with epic label
    $epicBody = @"
## $($epic.phase): $($epic.title)

$($epic.description)

### Tasks in this Epic:
$($epic.tasks | ForEach-Object { "- [ ] $($_.title)" } | Out-String)

### Acceptance Criteria:
- [ ] All tasks in this epic are completed
- [ ] All related tests are passing
- [ ] Documentation is updated
- [ ] Performance benchmarks are verified

### Requirements:
This epic addresses the foundational requirements for the Finance Ingestion Benchmark project.
"@

    $epicLabels = $epic.labels -join ","
    $epicIssue = gh issue create --title $epic.title --body $epicBody --label $epicLabels --project $projectNumber --format json | ConvertFrom-Json
    
    if ($epicIssue) {
        Write-Host "  ✅ Created Epic Issue #$($epicIssue.number)" -ForegroundColor Green
        
        foreach ($task in $epic.tasks) {
            Write-Host "    📋 Creating Task $taskNumber`: $($task.title)" -ForegroundColor Yellow
            
            # Create Task as an Issue
            $taskBody = @"
## Task: $($task.title)

$($task.description)

### Issues in this Task:
$($task.issues | ForEach-Object { "- [ ] $_" } | Out-String)

### Acceptance Criteria:
- [ ] All implementation items are completed
- [ ] Unit tests are written and passing
- [ ] Integration tests are updated
- [ ] Code is reviewed and merged
- [ ] Documentation is updated

### Related Epic:
Closes #$($epicIssue.number)
"@

            $taskLabels = $task.labels -join ","
            $taskIssue = gh issue create --title $task.title --body $taskBody --label $taskLabels --project $projectNumber --format json | ConvertFrom-Json
            
            if ($taskIssue) {
                Write-Host "      ✅ Created Task Issue #$($taskIssue.number)" -ForegroundColor Green
                
                foreach ($issueTitle in $task.issues) {
                    Write-Host "        🔸 Creating Issue $issueNumber`: $issueTitle" -ForegroundColor Gray
                    
                    # Create individual implementation issues
                    $issueBody = @"
## Implementation Issue: $issueTitle

### Description:
This issue tracks the implementation of: $issueTitle

### Acceptance Criteria:
- [ ] Implementation is complete
- [ ] Code follows project standards
- [ ] Tests are added/updated
- [ ] Documentation is updated if needed

### Related Task:
Part of #$($taskIssue.number)

### Related Epic:
Part of #$($epicIssue.number)
"@

                    $issueLabels = "implementation," + ($task.labels -join ",")
                    $issue = gh issue create --title $issueTitle --body $issueBody --label $issueLabels --project $projectNumber --format json | ConvertFrom-Json
                    
                    if ($issue) {
                        Write-Host "          ✅ Created Issue #$($issue.number)" -ForegroundColor Green
                    } else {
                        Write-Host "          ❌ Failed to create issue: $issueTitle" -ForegroundColor Red
                    }
                    
                    $issueNumber++
                    Start-Sleep -Milliseconds 500  # Rate limiting
                }
            } else {
                Write-Host "      ❌ Failed to create task: $($task.title)" -ForegroundColor Red
            }
            
            $taskNumber++
            Start-Sleep -Milliseconds 500  # Rate limiting
        }
    } else {
        Write-Host "  ❌ Failed to create epic: $($epic.title)" -ForegroundColor Red
    }
    
    $epicNumber++
    Start-Sleep -Milliseconds 500  # Rate limiting
}

Write-Host ""
Write-Host "🎉 GitHub Project creation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  📋 Project: #$projectNumber - $projectTitle" -ForegroundColor White
Write-Host "  🎯 Epics: $($epics.Count)" -ForegroundColor White
Write-Host "  📋 Tasks: $(($epics | ForEach-Object { $_.tasks.Count } | Measure-Object -Sum).Sum)" -ForegroundColor White
Write-Host "  🔸 Issues: $(($epics | ForEach-Object { $_.tasks | ForEach-Object { $_.issues.Count } } | Measure-Object -Sum).Sum)" -ForegroundColor White
Write-Host ""
Write-Host "🌐 View your project at:" -ForegroundColor Cyan
Write-Host "https://github.com/aserron/high-speed-ingestion/projects/$projectNumber" -ForegroundColor Blue
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure project views and workflows" -ForegroundColor White
Write-Host "2. Create historical pull requests linking to issues" -ForegroundColor White
Write-Host "3. Apply SEMVER tags based on epic completion" -ForegroundColor White