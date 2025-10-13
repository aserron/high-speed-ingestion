#!/bin/bash

# Script to push all branches to GitHub
echo "🚀 Pushing all branches to GitHub..."

# List of all local branches
branches=(
    "main"
    "feat/P03-T07-python-websocket-manager"
    "feat/P03-T07-websocket-connection-management"
    "feat/P03-T08-python-message-processor"
    "feat/P03T08.3-unit-tests-message-processors"
    "feat/P03T09-storage-and-persistence-layer"
    "feat/P04T11-node-rest-api"
    "feat/P04T11-python-rest-api"
    "feat/P05T12-integration-tests"
    "feat/P05T12.2-performance-regression-tests"
    "feat/P05T13-benchmarking-system"
    "feat/P06T14-deployment-automation"
    "feat/P06T14-production-config"
    "feat/P06T15-final-integration"
    "feature/nodejs-foundation-framework"
    "feature/python-foundation-framework"
    "feature/storage-layer-infrastructure"
    "hotfix/complete-python-websocket-manager"
    "test/07-connection-manager-unit-tests"
)

# Push each branch
for branch in "${branches[@]}"; do
    echo "📤 Pushing branch: $branch"
    git push origin "$branch"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pushed: $branch"
    else
        echo "❌ Failed to push: $branch"
    fi
    echo ""
done

echo "🎉 All branches pushed to GitHub!"
echo ""
echo "📊 Branch Summary:"
echo "Total branches: ${#branches[@]}"
echo ""
echo "🌐 View your repository at:"
echo "https://github.com/aserron/high-speed-ingestion"