# Code Quality Standards and Tools

This document outlines the code quality standards, tools, and processes used in the Finance Ingestion Benchmark project.

## Overview

The project maintains high code quality through:
- **Comprehensive linting** with modern rule sets
- **Automatic code formatting** for consistency
- **Type checking** for Python (MyPy) and optional for Node.js
- **Security scanning** for vulnerabilities
- **Pre-commit hooks** for automated quality checks
- **Unified commands** for easy quality management

## Quality Tools by Language

### Python (apps/python-ingestion/)

#### Tools Used
- **Ruff**: Modern, fast linter and formatter (replaces flake8, isort, black)
- **MyPy**: Static type checking
- **Bandit**: Security vulnerability scanner
- **Safety**: Dependency vulnerability checker
- **Pytest**: Testing framework with coverage

#### Configuration Files
- `pyproject.toml`: Main configuration for all Python tools
- `scripts/quality.py`: Quality control script

#### Standards
- **Line length**: 100 characters
- **Python version**: 3.11+
- **Type hints**: Required for all public functions
- **Docstrings**: Google style for all public modules, classes, and functions
- **Import sorting**: Automatic with Ruff
- **Security**: Bandit security checks enabled

### Node.js (apps/node-ingestion/)

#### Tools Used
- **ESLint**: Modern linting with @eslint/js recommended configuration
- **Prettier**: Code formatting
- **audit-ci**: Security vulnerability scanning
- **Jest**: Testing framework with coverage

#### Configuration Files
- `eslint.config.js`: Modern flat config format
- `package.json`: Prettier and other tool configurations
- `scripts/quality.js`: Quality control script

#### Standards
- **Line length**: 100 characters
- **Node.js version**: 18+
- **ES modules**: Required (type: "module")
- **Code style**: Prettier with single quotes, no semicolons
- **Security**: npm audit with moderate level threshold

## Unified Quality Commands

All quality commands can be run from the project root and will execute for both Python and Node.js applications.

### Check Commands (CI-friendly, exit codes)

```bash
# Run all quality checks for both applications
npm run quality:check

# Run specific checks
npm run lint:check          # Linting only
npm run format:check        # Formatting only  
npm run type:check          # Type checking only
npm run security:check      # Security scanning only
```

### Fix Commands (Developer-friendly, auto-fix)

```bash
# Run all auto-fixes for both applications
npm run quality:fix

# Run specific fixes
npm run lint:fix           # Fix linting issues
npm run format:fix         # Fix formatting issues
```

### Language-Specific Commands

```bash
# Python only
npm run quality:python:check
npm run quality:python:fix

# Node.js only  
npm run quality:node:check
npm run quality:node:fix
```

### Individual Application Commands

```bash
# Python application
cd apps/python-ingestion
python scripts/quality.py check
python scripts/quality.py fix

# Node.js application
cd apps/node-ingestion
node scripts/quality.js check
node scripts/quality.js fix
```

## Quality Standards

### Code Style

#### Python
- **Line length**: 100 characters
- **Indentation**: 4 spaces
- **Quotes**: Double quotes for strings, single for docstrings
- **Imports**: Sorted automatically by Ruff
- **Trailing commas**: Required in multi-line structures

#### Node.js
- **Line length**: 100 characters
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Not required (Prettier removes them)
- **Trailing commas**: ES5 style

### Linting Rules

#### Python (Ruff)
Enabled rule categories:
- `E`, `W`: pycodestyle errors and warnings
- `F`: pyflakes
- `I`: isort import sorting
- `B`: flake8-bugbear
- `C4`: flake8-comprehensions
- `UP`: pyupgrade
- `N`: pep8-naming
- `S`: bandit security
- `T20`: flake8-print (warnings)
- `PT`: flake8-pytest-style
- `RET`: flake8-return
- `SIM`: flake8-simplify
- `ARG`: flake8-unused-arguments
- `PL`: pylint rules
- `RUF`: ruff-specific rules

#### Node.js (ESLint)
Based on @eslint/js recommended with additional rules:
- **Code quality**: prefer-const, no-var, no-unused-vars
- **Best practices**: eqeqeq, curly, no-eval
- **ES6+**: arrow-spacing, object-shorthand, prefer-template
- **Node.js**: no-process-exit, no-sync (warnings)
- **Async/await**: require-await, no-return-await
- **Security**: no-new-require, no-path-concat

### Type Checking

#### Python (MyPy)
- **Strict mode**: Enabled
- **Type hints**: Required for all public functions
- **Third-party stubs**: Configured for major dependencies
- **Test files**: Less strict type checking allowed

#### Node.js
- TypeScript not currently configured
- JSDoc type annotations encouraged
- Consider adding TypeScript in future iterations

### Security Standards

#### Python
- **Bandit**: Security vulnerability scanning
- **Safety**: Dependency vulnerability checking
- **Hardcoded secrets**: Detected and flagged
- **SQL injection**: Prevented through parameterized queries

#### Node.js
- **npm audit**: Dependency vulnerability scanning
- **audit-ci**: Automated security checks in CI
- **Moderate threshold**: Fails on moderate+ vulnerabilities

## Pre-commit Hooks

Pre-commit hooks automatically run quality checks before each commit:

```bash
# Install pre-commit hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

### Configured Hooks
- **Ruff**: Python linting and formatting
- **ESLint**: JavaScript linting
- **Prettier**: JavaScript formatting (via ESLint)
- **General**: trailing whitespace, end-of-file-fixer, check-yaml, check-json
- **Security**: Bandit for Python, basic checks for secrets

## CI/CD Integration

Quality checks are integrated into the CI/CD pipeline:

### Pull Request Checks
- All quality checks must pass
- Security scans must pass
- Test coverage requirements must be met
- No linting errors allowed

### Pre-merge Requirements
- Code review approval required
- All quality gates must pass
- Documentation must be updated if needed

## IDE Integration

### VS Code
Recommended extensions:
- **Python**: Pylance, Ruff
- **JavaScript**: ESLint, Prettier
- **General**: EditorConfig, GitLens

### Settings
```json
{
  "python.defaultInterpreterPath": "./apps/python-ingestion/.venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "eslint.workingDirectories": ["apps/node-ingestion"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  }
}
```

## Quality Metrics

### Coverage Requirements
- **Python**: 90% code coverage minimum
- **Node.js**: 90% code coverage minimum
- **Critical paths**: 100% coverage required

### Performance Standards
- **Linting**: Must complete in under 30 seconds
- **Type checking**: Must complete in under 60 seconds
- **Security scans**: Must complete in under 2 minutes

## Troubleshooting

### Common Issues

#### Python
```bash
# Ruff not found
pip install ruff

# MyPy cache issues
mypy --clear-cache

# Import sorting conflicts
ruff check --fix src/
```

#### Node.js
```bash
# ESLint configuration issues
npm install --save-dev @eslint/js globals

# Prettier conflicts
npm run format:fix

# Security audit failures
npm audit fix
```

### Quality Check Failures

#### Linting Errors
1. Run auto-fix: `npm run lint:fix`
2. Review remaining errors manually
3. Update code to meet standards
4. Re-run checks: `npm run lint:check`

#### Formatting Issues
1. Run auto-format: `npm run format:fix`
2. Check for any remaining issues: `npm run format:check`
3. Manually fix any complex formatting

#### Security Vulnerabilities
1. Review security report
2. Update vulnerable dependencies: `npm update`
3. For Python: `pip install --upgrade package-name`
4. If no fix available, add to ignore list with justification

#### Type Checking Errors
1. Add missing type hints (Python)
2. Fix type mismatches
3. Add type ignores only as last resort with comments

## Continuous Improvement

### Regular Reviews
- Monthly review of quality standards
- Quarterly update of tool versions
- Annual review of rule sets and standards

### Metrics Tracking
- Quality check execution times
- Error rates and types
- Developer productivity impact
- Security vulnerability trends

### Tool Updates
- Monitor for new versions of quality tools
- Test updates in development environment
- Gradual rollout of new rules and standards
- Document breaking changes and migration paths