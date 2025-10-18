#!/bin/bash

# Documentation deployment script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV=${1:-production}
BUILD_DIR=".vitepress/dist"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${GREEN}🚀 Starting documentation deployment for ${DEPLOY_ENV}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    echo "Installing dependencies..."
    npm ci --only=production
    print_status "Dependencies installed"
}

# Run tests
run_tests() {
    echo "Running tests..."
    
    # Link checking
    if command -v markdown-link-check &> /dev/null; then
        find . -name "*.md" -not -path "./node_modules/*" -exec markdown-link-check {} \;
        print_status "Link checking completed"
    else
        print_warning "markdown-link-check not found, skipping link validation"
    fi
    
    # Lighthouse CI (if configured)
    if [ -f ".lighthouserc.json" ] && command -v lhci &> /dev/null; then
        npm run build
        npm run preview &
        SERVER_PID=$!
        sleep 10
        lhci autorun || print_warning "Lighthouse CI failed"
        kill $SERVER_PID
    fi
}

# Build documentation
build_docs() {
    echo "Building documentation..."
    
    # Clean previous build
    rm -rf $BUILD_DIR
    
    # Build
    npm run build
    
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build failed - output directory not found"
        exit 1
    fi
    
    print_status "Documentation built successfully"
}

# Create backup
create_backup() {
    if [ "$DEPLOY_ENV" = "production" ] && [ -d "current" ]; then
        echo "Creating backup..."
        mkdir -p "$BACKUP_DIR"
        cp -r current/* "$BACKUP_DIR/"
        print_status "Backup created at $BACKUP_DIR"
    fi
}

# Deploy to different environments
deploy_github_pages() {
    echo "Deploying to GitHub Pages..."
    
    # This would typically be handled by GitHub Actions
    # But we can prepare the deployment
    
    if [ ! -f ".github/workflows/deploy-docs.yml" ]; then
        print_error "GitHub Actions workflow not found"
        exit 1
    fi
    
    print_status "GitHub Pages deployment configured"
}

deploy_netlify() {
    echo "Deploying to Netlify..."
    
    if command -v netlify &> /dev/null; then
        netlify deploy --prod --dir=$BUILD_DIR
        print_status "Deployed to Netlify"
    else
        print_warning "Netlify CLI not found. Please deploy manually or install netlify-cli"
    fi
}

deploy_vercel() {
    echo "Deploying to Vercel..."
    
    if command -v vercel &> /dev/null; then
        vercel --prod
        print_status "Deployed to Vercel"
    else
        print_warning "Vercel CLI not found. Please deploy manually or install vercel"
    fi
}

deploy_docker() {
    echo "Building and deploying Docker container..."
    
    # Build Docker image
    docker build -t finance-ingestion-docs:latest .
    
    # Tag for registry
    if [ -n "$DOCKER_REGISTRY" ]; then
        docker tag finance-ingestion-docs:latest $DOCKER_REGISTRY/finance-ingestion-docs:latest
        docker push $DOCKER_REGISTRY/finance-ingestion-docs:latest
        print_status "Docker image pushed to registry"
    fi
    
    # Deploy with docker-compose
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d docs
        print_status "Docker container deployed"
    fi
}

deploy_s3() {
    echo "Deploying to AWS S3..."
    
    if [ -z "$AWS_S3_BUCKET" ]; then
        print_error "AWS_S3_BUCKET environment variable not set"
        exit 1
    fi
    
    if command -v aws &> /dev/null; then
        aws s3 sync $BUILD_DIR s3://$AWS_S3_BUCKET --delete
        
        # Invalidate CloudFront if configured
        if [ -n "$AWS_CLOUDFRONT_DISTRIBUTION_ID" ]; then
            aws cloudfront create-invalidation --distribution-id $AWS_CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
            print_status "CloudFront cache invalidated"
        fi
        
        print_status "Deployed to S3"
    else
        print_error "AWS CLI not found"
        exit 1
    fi
}

# Post-deployment tasks
post_deployment() {
    echo "Running post-deployment tasks..."
    
    # Send notification to Slack (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"📚 Documentation deployed successfully to ${DEPLOY_ENV}\"}" \
            $SLACK_WEBHOOK_URL
        print_status "Slack notification sent"
    fi
    
    # Update status page (if configured)
    if [ -n "$STATUS_PAGE_API" ]; then
        curl -X POST "$STATUS_PAGE_API/deployments" \
            -H "Content-Type: application/json" \
            -d "{\"environment\":\"$DEPLOY_ENV\",\"status\":\"success\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
        print_status "Status page updated"
    fi
}

# Rollback function
rollback() {
    if [ -d "$BACKUP_DIR" ]; then
        echo "Rolling back to previous version..."
        rm -rf current
        cp -r "$BACKUP_DIR" current
        print_status "Rollback completed"
    else
        print_error "No backup found for rollback"
        exit 1
    fi
}

# Main deployment flow
main() {
    case "$DEPLOY_ENV" in
        "production"|"prod")
            check_prerequisites
            install_dependencies
            run_tests
            build_docs
            create_backup
            
            # Deploy based on configuration
            if [ -n "$GITHUB_ACTIONS" ]; then
                deploy_github_pages
            elif [ -f "netlify.toml" ]; then
                deploy_netlify
            elif [ -f "vercel.json" ]; then
                deploy_vercel
            elif [ -f "Dockerfile" ]; then
                deploy_docker
            elif [ -n "$AWS_S3_BUCKET" ]; then
                deploy_s3
            else
                print_error "No deployment method configured"
                exit 1
            fi
            
            post_deployment
            ;;
            
        "staging"|"stage")
            check_prerequisites
            install_dependencies
            build_docs
            
            # Deploy to staging (typically a different branch or subdomain)
            print_status "Staging deployment completed"
            ;;
            
        "development"|"dev")
            check_prerequisites
            install_dependencies
            npm run dev
            ;;
            
        "rollback")
            rollback
            ;;
            
        *)
            print_error "Unknown deployment environment: $DEPLOY_ENV"
            echo "Usage: $0 [production|staging|development|rollback]"
            exit 1
            ;;
    esac
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Documentation Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Environments:"
    echo "  production   Deploy to production environment"
    echo "  staging      Deploy to staging environment"
    echo "  development  Start development server"
    echo "  rollback     Rollback to previous version"
    echo ""
    echo "Options:"
    echo "  --help, -h   Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DOCKER_REGISTRY              Docker registry URL"
    echo "  AWS_S3_BUCKET               S3 bucket for deployment"
    echo "  AWS_CLOUDFRONT_DISTRIBUTION_ID  CloudFront distribution ID"
    echo "  SLACK_WEBHOOK_URL           Slack webhook for notifications"
    echo "  STATUS_PAGE_API             Status page API endpoint"
    exit 0
fi

# Run main function
main