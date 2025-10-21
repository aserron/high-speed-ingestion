# Spec Implementation Workflow

This document defines the standardized workflow for implementing specs with proper GitHub issue management and branching strategy.

## Overview

This workflow ensures proper tracking, organization, and implementation of complex features through a structured spec-driven development process.

## Workflow Steps

### 1. Create Main Spec Issue

Create the primary issue that represents the entire spec:

```bash
gh issue create \
  --title "feat: [Spec Name]" \
  --body "## Overview
[Brief description of the spec and its purpose]

## Problems Addressed
- [Problem 1]
- [Problem 2]
- [Problem 3]

## Deliverables
- [ ] [Major deliverable 1]
- [ ] [Major deliverable 2]
- [ ] [Major deliverable 3]

## Spec Files
- Requirements: .kiro/specs/[spec-name]/requirements.md
- Design: .kiro/specs/[spec-name]/design.md
- Tasks: .kiro/specs/[spec-name]/tasks.md

## Branch Strategy
Main spec branch: feat/[spec-name]-[issue-id]
Sub-task branches: feat/[spec-name]-[issue-id]-[task-id]-[description]

Closes when all sub-tasks are completed and merged to main." \
  --label "enhancement"
```

### 2. Create Sub-task Issues

For each major task group in the implementation plan, create a sub-issue:

```bash
gh issue create \
  --title "feat: [Task Group Name]" \
  --body "## Task [N]: [Task Group Name]

[Brief description of what this task group accomplishes]

### Sub-tasks
- [ ] [N.1] [Sub-task 1]
- [ ] [N.2] [Sub-task 2]
- [ ] [N.3] [Sub-task 3]

### Requirements
- [Requirement references from spec]

### Branch
feat/[spec-name]-[main-issue-id]-[task-id]-[description]

### Parent Issue
Closes #[main-issue-id]" \
  --label "enhancement"
```

### 3. Create Main Spec Branch

Create and set up the main spec branch:

```bash
# Create main spec branch
git checkout -b feat/[spec-name]-[issue-id]

# Add spec files
git add .kiro/specs/[spec-name]/

# Commit with conventional commit format
git commit -m "feat: add [spec name] spec

- Add comprehensive requirements document with [N] user stories
- Add detailed design document with [key architecture points]
- Add implementation plan with [N] actionable tasks
- Address [key problems being solved]

Closes #[issue-id]"

# Push to remote
git push -u origin feat/[spec-name]-[issue-id]
```

### 4. Implement Sub-tasks

For each sub-task group:

#### 4.1 Create Sub-task Branch

```bash
# Ensure you're on the updated spec branch
git checkout feat/[spec-name]-[main-issue-id]
git pull origin feat/[spec-name]-[main-issue-id]

# Create sub-task branch
git checkout -b feat/[spec-name]-[main-issue-id]-[task-id]-[description]
```

#### 4.2 Implement Sub-tasks

Work on the individual sub-tasks within the group, making commits with conventional commit format:

```bash
# Example commits
git commit -m "feat: create configuration directory structure

- Add configs/ directory with base/, environments/, and local/ subdirectories
- Create base configuration templates for app, services, and infrastructure
- Add environment-specific configs for dev, staging, and production

Addresses #[sub-task-issue-id]"

git commit -m "feat: implement Python configuration management

- Add Pydantic settings classes for database, Redis, and app configs
- Implement hierarchical configuration loading with env var support
- Add secure handling for sensitive values using SecretStr

Addresses #[sub-task-issue-id]"
```

#### 4.3 Merge Sub-task to Spec Branch

```bash
# Push sub-task branch
git push -u origin feat/[spec-name]-[main-issue-id]-[task-id]-[description]

# Switch to spec branch
git checkout feat/[spec-name]-[main-issue-id]

# Merge sub-task (normal merge to preserve individual commits)
git merge feat/[spec-name]-[main-issue-id]-[task-id]-[description]

# Push updated spec branch
git push origin feat/[spec-name]-[main-issue-id]

# Close the sub-task issue
gh issue close [sub-task-issue-id] --comment "Completed and merged to spec branch"

# Delete the sub-task branch (optional)
git branch -d feat/[spec-name]-[main-issue-id]-[task-id]-[description]
git push origin --delete feat/[spec-name]-[main-issue-id]-[task-id]-[description]
```

### 5. Final Integration

When all sub-tasks are complete:

#### 5.1 Create Final PR

```bash
# Ensure spec branch is up to date
git checkout feat/[spec-name]-[main-issue-id]
git pull origin feat/[spec-name]-[main-issue-id]

# Create PR to main
gh pr create \
  --title "feat: [Spec Name]" \
  --body "## Overview
[Brief description of the complete implementation]

## Changes
- [Major change 1]
- [Major change 2]
- [Major change 3]

## Testing
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Issues
Closes #[main-issue-id]
Closes #[sub-issue-1]
Closes #[sub-issue-2]
[... all sub-issues]

## Spec Files
- Requirements: .kiro/specs/[spec-name]/requirements.md
- Design: .kiro/specs/[spec-name]/design.md
- Tasks: .kiro/specs/[spec-name]/tasks.md" \
  --base main \
  --head feat/[spec-name]-[main-issue-id]
```

#### 5.2 Merge to Main

After review and approval:

```bash
# Merge PR (can be done via GitHub UI or CLI)
gh pr merge [pr-number] --merge --delete-branch
```

## Branch Naming Convention

- **Main Spec Branch**: `feat/[spec-name]-[main-issue-id]`
- **Sub-task Branch**: `feat/[spec-name]-[main-issue-id]-[sub-issue-id]-[short-description]`

Examples:
- `feat/cicd-config-environment-51`
- `feat/cicd-config-environment-51-52-config-management`
- `feat/cicd-config-environment-51-53-code-quality`

## Commit Message Convention

Use conventional commits with the following format:

```
<type>: <description>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: add centralized configuration management

- Implement Pydantic-based config validation for Python services
- Add Joi-based config validation for Node.js services
- Create hierarchical configuration structure

Addresses #52

fix: resolve regression test baseline comparison

- Fix baseline loading logic for missing files
- Add proper error handling for corrupted baselines
- Improve baseline validation and recovery

Fixes #54

docs: update configuration management guide

- Document new hierarchical configuration structure
- Add examples for all supported environment variables
- Create troubleshooting guide for common config issues

Closes #56
```

## Issue Management

### Issue Labels

Use consistent labels:
- `enhancement`: New features and improvements
- `bug`: Bug fixes
- `documentation`: Documentation updates
- `testing`: Test-related changes

### Issue Linking

- **Sub-issues**: Reference parent issue with "Closes #[parent-issue-id]"
- **Commits**: Reference issues with "Addresses #[issue-id]" or "Fixes #[issue-id]"
- **PRs**: List all related issues in the PR description

### Issue Closure

- **Sub-issues**: Close when merged to spec branch
- **Main issue**: Close when final PR is merged to main

## Best Practices

1. **Keep commits atomic**: Each commit should represent a single logical change
2. **Write descriptive commit messages**: Include what was changed and why
3. **Reference issues consistently**: Always link commits and PRs to relevant issues
4. **Preserve commit history**: Use normal merge (not squash) for sub-task branches
5. **Clean up branches**: Delete merged sub-task branches to keep repository clean
6. **Update spec branch regularly**: Pull latest changes before creating new sub-task branches
7. **Test before merging**: Ensure all tests pass before merging sub-tasks
8. **Document decisions**: Update spec documents if implementation differs from design

## Troubleshooting

### Common Issues

**Branch conflicts:**
```bash
# Resolve conflicts in sub-task branch
git checkout feat/[spec-name]-[main-issue-id]-[task-id]-[description]
git rebase feat/[spec-name]-[main-issue-id]
# Resolve conflicts, then:
git rebase --continue
```

**Missing issue references:**
```bash
# Amend last commit to add issue reference
git commit --amend -m "feat: [description]

[body]

Addresses #[issue-id]"
```

**Wrong branch:**
```bash
# Move commits to correct branch
git checkout correct-branch
git cherry-pick [commit-hash]
git checkout wrong-branch
git reset --hard HEAD~1
```

This workflow ensures consistent, trackable, and organized implementation of complex specs while maintaining proper Git history and issue management.