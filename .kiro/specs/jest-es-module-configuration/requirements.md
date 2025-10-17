# Jest ES Module Configuration Fix - Requirements Document

## Introduction

The Finance Ingestion Benchmark project's Node.js implementation is experiencing Jest test configuration issues that prevent the test suite from running. The application uses ES modules (`"type": "module"` in package.json), but Jest is not properly configured to handle ES module syntax, causing test failures with "Cannot use import statement outside a module" errors.

This specification addresses the technical debt of fixing the Jest configuration to support ES modules while maintaining the existing test structure and ensuring compatibility with the Turbo monorepo setup.

## Git Workflow

This project follows the established Git workflow from the main Finance Ingestion Benchmark specification:

- **Base Branch**: `dev` is the primary development branch
- **Commit Style**: Conventional Commits format (feat:, fix:, chore:, etc.)
- **Feature Branches**: Use `feat/` prefix with task-based naming
- **Branch Naming**: `feat/jest-es-module-fix-{description}` format
- **Commit Strategy**: Notable solution changes should be committed individually to create a coherent development story
- **Issue Isolation**: Problems should be isolated and resolved within their own dedicated issues
- **Development Process**:
  1. Create feature branch from `dev`
  2. Implement changes with meaningful, individual commits for each solution component
  3. Ensure tests pass and no linter errors
  4. Create Pull Request for code review
  5. Perform squash merge to `dev` after approval
  6. Keep branches for historical record (do NOT delete)

## GitHub CLI Integration

This specification defines a complete problem-to-solution workflow using GitHub CLI (`gh`) throughout:

### Complete Workflow Process

1. **Problem Identification & Definition**
   - When a problem is identified, it gets reported and defined
   - Problem definition triggers the automated workflow

2. **GitHub Project Issue Creation**
   - Use `gh issue create` to document the problem with detailed description
   - Apply appropriate labels (`bug`, `testing`, `node.js`, `configuration`)
   - Assign to team members and link to project board
   - Move issue to "In Progress" status

3. **Branch Creation**
   - Create feature branch from `dev` using standardized naming
   - Link branch to GitHub issue for traceability

4. **Solution Implementation with Notable Commits**
   - Implement solution with individual commits for each notable change
   - Each commit follows Conventional Commits format
   - Commits create a coherent development story

5. **Fix, Check, Quality & Pushing**
   - Run tests to ensure fix works (`npm run test`)
   - Run linting and quality checks (`npm run lint`)
   - Push commits to feature branch

6. **Open PR into Dev**
   - Use `gh pr create` to open Pull Request targeting `dev` branch
   - Link PR to original issue
   - Include comprehensive description and testing evidence
   - Request code review through GitHub CLI

### GitHub CLI Usage Throughout

- **Issue Management**: `gh issue create`, `gh issue edit`, `gh issue close`
- **Project Board**: `gh project item-add`, `gh project item-edit`
- **Branch Operations**: Integration with `gh` for branch linking
- **Pull Requests**: `gh pr create`, `gh pr review`, `gh pr merge`
- **Status Tracking**: `gh pr status`, `gh issue status`

### System Prompt Integration

GitHub CLI workflow information and project context will be available in system prompts, including:
- Current project board status
- Active issues and their states  
- Branch naming conventions
- PR templates and review requirements
- Quality gates and CI/CD status

## Problem Statement

**Current Issue:** Jest test runner fails with ES module syntax errors when attempting to run the Node.js application test suite.

**Error Details:**
- `SyntaxError: Cannot use import statement outside a module`
- Empty test files causing "Test suite must contain at least one test" failures
- Jest configuration incompatible with `"type": "module"` package.json setting

**Impact:** 
- Continuous integration pipeline fails
- Developers cannot run unit tests locally
- Code quality assurance is compromised
- Turbo monorepo `npm run test` command fails

## Requirements

### Requirement 1

**User Story:** As a Node.js developer, I want to run Jest tests using ES module syntax, so that I can maintain consistency with the application's module system.

#### Acceptance Criteria

1. WHEN running `npm run test` in the node-ingestion directory THEN Jest SHALL successfully execute all test files without ES module syntax errors
2. WHEN using `import` statements in test files THEN Jest SHALL properly resolve and execute the imports
3. WHEN running tests THEN the existing ES module application code SHALL be testable without modification
4. WHEN Jest processes test files THEN it SHALL support both `.js` test files and ES module imports from the main application

### Requirement 2

**User Story:** As a developer, I want Jest to work seamlessly with the Turbo monorepo setup, so that the entire project test suite runs without configuration conflicts.

#### Acceptance Criteria

1. WHEN running `npm run test` from the project root THEN Turbo SHALL successfully execute the Node.js test suite alongside other package tests
2. WHEN Jest runs in the monorepo context THEN it SHALL not interfere with other package test configurations
3. WHEN using shared packages THEN Jest SHALL properly resolve imports from `@finance-benchmark/shared` package
4. WHEN running in CI/CD THEN the test configuration SHALL work consistently across different environments

### Requirement 3

**User Story:** As a test engineer, I want comprehensive test coverage reporting, so that I can monitor code quality and identify untested code paths.

#### Acceptance Criteria

1. WHEN running tests with coverage THEN Jest SHALL generate accurate coverage reports for ES module code
2. WHEN collecting coverage THEN Jest SHALL include all source files in `src/` directory except test files and benchmark scripts
3. WHEN generating reports THEN Jest SHALL output coverage in multiple formats (text, lcov, html)
4. WHEN measuring coverage THEN Jest SHALL properly handle ES module imports and exports

### Requirement 4

**User Story:** As a developer, I want to write modern JavaScript tests, so that I can use current testing patterns and maintain code consistency.

#### Acceptance Criteria

1. WHEN writing test files THEN developers SHALL be able to use ES6+ syntax including async/await, destructuring, and arrow functions
2. WHEN importing test utilities THEN Jest SHALL support imports from `@jest/globals` for modern Jest APIs
3. WHEN mocking modules THEN Jest SHALL provide ES module-compatible mocking capabilities
4. WHEN running tests THEN Jest SHALL support modern JavaScript features without additional transpilation

### Requirement 5

**User Story:** As a CI/CD engineer, I want reliable test execution in automated pipelines, so that I can ensure code quality gates work consistently.

#### Acceptance Criteria

1. WHEN tests run in GitHub Actions THEN Jest SHALL execute successfully without environment-specific configuration
2. WHEN running in different Node.js versions (18+) THEN Jest SHALL maintain compatibility
3. WHEN executing in Windows, macOS, and Linux environments THEN Jest SHALL work consistently across platforms
4. WHEN tests fail THEN Jest SHALL provide clear error messages and exit codes for CI/CD integration

### Requirement 6

**User Story:** As a developer, I want fast test execution during development, so that I can maintain rapid feedback loops.

#### Acceptance Criteria

1. WHEN running tests in watch mode THEN Jest SHALL detect file changes and re-run relevant tests quickly
2. WHEN using Jest cache THEN subsequent test runs SHALL be faster than initial runs
3. WHEN running individual test files THEN Jest SHALL execute only the specified tests without full suite overhead
4. WHEN debugging tests THEN Jest SHALL support Node.js debugging capabilities with ES modules

### Requirement 7

**User Story:** As a project maintainer, I want to follow the complete GitHub CLI-driven workflow for this Jest configuration fix, so that I can maintain full traceability and project management integration.

#### Acceptance Criteria

1. WHEN a problem is identified THEN it SHALL be reported, defined, and trigger the automated GitHub CLI workflow
2. WHEN creating the issue THEN `gh issue create` SHALL be used with comprehensive description, appropriate labels, and project board integration
3. WHEN starting development THEN a feature branch SHALL be created and linked to the GitHub issue for full traceability
4. WHEN implementing the solution THEN each notable change SHALL be committed individually using Conventional Commits format
5. WHEN the solution is ready THEN quality checks (tests, linting) SHALL pass before pushing to the feature branch
6. WHEN opening a pull request THEN `gh pr create` SHALL be used to target `dev` branch with issue linking and comprehensive description
7. WHEN the fix is complete THEN the PR SHALL be merged and the issue SHALL be closed with appropriate project board status updates

### Requirement 8

**User Story:** As a team member, I want to follow the established Git workflow for this Jest configuration fix, so that I maintain consistency with project development practices.

#### Acceptance Criteria

1. WHEN starting the fix THEN a feature branch SHALL be created from `dev` using the naming pattern `feat/jest-es-module-fix-{description}`
2. WHEN making changes THEN commits SHALL follow Conventional Commits format with clear, descriptive messages for each notable solution change
3. WHEN implementing the solution THEN each significant configuration change SHALL be committed individually to create a coherent development story
4. WHEN encountering related problems THEN they SHALL be isolated and resolved within their own dedicated GitHub issues
5. WHEN the fix is ready THEN a Pull Request SHALL be created for code review before merging
6. WHEN merging THEN a squash merge SHALL be performed to `dev` branch and the feature branch SHALL be preserved for historical record

## Technical Constraints

### Jest Configuration Requirements

1. **ES Module Support**: Jest configuration must enable ES module support through either:
   - `preset: 'es-modules'` or equivalent
   - `transform: {}` with `extensionsToTreatAsEsm: ['.js']`
   - `globals: { 'ts-jest': { useESM: true } }` if using TypeScript

2. **Module Resolution**: Jest must properly resolve:
   - Relative imports (`./`, `../`)
   - Absolute imports from `src/`
   - Monorepo package imports (`@finance-benchmark/shared`)

3. **Test Environment**: Jest must run in Node.js environment with ES module support

4. **File Extensions**: Jest must handle `.js` files as ES modules when `"type": "module"` is set

### Compatibility Requirements

1. **Node.js Version**: Configuration must work with Node.js 18+ as specified in package.json engines
2. **Turbo Integration**: Configuration must not conflict with Turbo's test pipeline caching
3. **Existing Code**: Configuration must not require changes to existing application code
4. **Development Tools**: Configuration must work with existing ESLint and Prettier setup

## Success Criteria

### Functional Success

- ✅ All existing test files execute without syntax errors
- ✅ New test files can be written using ES module syntax
- ✅ Test coverage reports generate accurately
- ✅ Turbo monorepo test pipeline completes successfully

### Performance Success

- ✅ Test execution time remains under 10 seconds for the full suite
- ✅ Watch mode provides feedback within 2 seconds of file changes
- ✅ CI/CD test execution completes within 30 seconds

### Quality Success

- ✅ Test coverage reporting accuracy matches or exceeds current expectations
- ✅ Error messages provide clear debugging information
- ✅ Configuration is maintainable and well-documented

## Out of Scope

This specification does NOT include:

- ❌ Converting existing CommonJS code to ES modules (application is already ES modules)
- ❌ Adding new test cases or improving test coverage (focus is on configuration)
- ❌ Changing the overall testing strategy or framework
- ❌ Modifying Python application test configuration
- ❌ Implementing new testing utilities or helpers
- ❌ Performance optimization beyond basic Jest configuration

## References

- [Jest ES Modules Documentation](https://jestjs.io/docs/ecmascript-modules)
- [Node.js ES Modules Guide](https://nodejs.org/api/esm.html)
- [Turbo Testing Documentation](https://turbo.build/repo/docs/handbook/testing)
- [Finance Ingestion Benchmark Main Spec](./../finance-ingestion-benchmark/requirements.md)