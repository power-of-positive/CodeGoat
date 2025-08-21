# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NEVER disable validation checks - fix errors properly!! I don't care if failures are related to your changes, fix everything!!

## Project Overview

CodeGoat is a configurable AI proxy server with Claude worker orchestration system that provides:
- Claude Code worker management for automated task execution
- Model fallback capabilities with retry logic
- Request/response logging and analytics
- Configurable validation pipeline for development workflow
- Settings management API for runtime configuration
- Integration with vibe-kanban project management system

## Critical Commands

### After Making Changes - Always Run These
```bash
# Essential validation sequence
npm run lint                  # Code style and quality checks
npm run type-check            # TypeScript compilation and type safety
npm run typescript-check      # Ensure TypeScript is preferred over JavaScript
npm test                      # Backend unit tests

# Frontend validation (when UI changes made)
cd ui && npm run lint         # Frontend linting
cd ui && npm test             # Frontend unit tests (use --watchAll=false for CI)

# Build verification
npm run build                 # Backend build
cd ui && npm run build        # Frontend build
```

### Testing Commands
```bash
# Unit tests
npm test                                  # Backend unit tests
npm run test:unit:backend                 # Explicit backend tests
cd ui && npm test -- --watchAll=false     # Frontend unit tests (non-interactive)

# Coverage
npm run test:coverage:backend             # Backend coverage
cd ui && npm run test:coverage            # Frontend coverage

# E2E tests
npm run test:e2e                         # Standard E2E tests
npm run test:e2e:unified                 # Recommended - resolved CommonJS/ESM conflicts
npm run test:e2e:optimized               # Performance-focused E2E
cd ui && npm run test:e2e:robust         # UI E2E with automatic server management

# Playwright tests
npm run test:playwright                   # Headless Playwright tests
npm run test:playwright:ui               # Interactive Playwright UI
npm run test:playwright:debug            # Debug mode

# API tests
npm run test:api-e2e                     # API end-to-end tests
```

### Development Commands
```bash
# Development servers
npm run dev                               # Backend dev server (port 3001)
cd ui && npm run dev                      # Frontend dev server (port 5173)

# Log management
npm run logs:clean:optimized             # Clean old logs (optimized)
npm run logs:stats                       # View log statistics

# Code quality
npm run duplication-check                # Check for code duplication
npm run quality                          # Run all quality checks
```

### Single Test Execution
```bash
# Backend single test
npm test -- path/to/test.spec.ts

# Frontend single test
cd ui && npm test -- path/to/test.spec.tsx --watchAll=false

# Playwright single test
npx playwright test path/to/test.spec.ts
```

## Architecture

### Backend Structure
- **Express API Server** (port 3001)
  - `/api/claude-workers/*` - Claude worker management and orchestration
  - `/api/settings/*` - Runtime configuration management
  - `/api/analytics/*` - Metrics and analytics endpoints
  - `/api/tasks/*` - Task management (integrated with vibe-kanban)
  - `/api/permissions/*` - Permission management

- **Key Services:**
  - `ClaudeExecutor` - Manages Claude Code subprocess execution
  - `CommandInterceptor` - Validates and blocks dangerous commands
  - `WorktreeManager` - Git worktree isolation for parallel execution
  - `ValidationRunner` - Orchestrates validation pipeline stages
  - `ClaudeLogProcessor` - Parses and structures Claude output logs

- **Database:** SQLite via Prisma ORM
  - Shared database with vibe-kanban project
  - Models: Project, Task, TaskAttempt, TaskTemplate, TodoTask

### Frontend Structure (React + TypeScript)
- **Pages:**
  - `/workers` - Workers Dashboard for Claude worker monitoring
  - `/settings` - Settings management UI
  - `/analytics` - Analytics dashboard

- **Key Components:**
  - `WorkerDetail` - Real-time worker status and log streaming
  - `TaskLogs` - Structured log viewer with filtering
  - `ValidationRunsViewer` - Validation pipeline visualization
  - `BlockedCommandsViewer` - Security audit trail

- **Real-time Features:**
  - SSE (Server-Sent Events) for log streaming
  - WebSocket fallback for worker status updates
  - Virtual scrolling for large log files

### Validation Pipeline

Automated validation runs via `scripts/validate-task.ts` with configurable stages:

1. **Lint** - Code style checks
2. **Type Check** - TypeScript compilation
3. **Unit Tests** - Backend and frontend tests
4. **Coverage** - Code coverage thresholds
5. **Integration Tests** - API integration tests
6. **API E2E** - End-to-end API tests
7. **TypeScript Preference** - Ensures .ts over .js
8. **AI Code Review** - Automated code quality analysis
9. **Dead Code Detection** - Unused code identification
10. **Duplication Check** - Code duplication detection
11. **Vulnerability Scan** - npm audit for dependencies
12. **Playwright E2E** - Browser automation tests
13. **Uncommitted Files Check** - Git status validation
14. **Todo List Validation** - Ensures todos are completed

Each stage can be enabled/disabled and configured via `/api/settings/validation`.

## Claude Worker System

### Worker Lifecycle
1. **Task Assignment** - Worker receives task from todo list
2. **Worktree Creation** - Isolated git worktree for parallel execution
3. **Claude Execution** - Subprocess running Claude Code
4. **Command Interception** - Real-time command validation and blocking
5. **Log Processing** - Structured log parsing and storage
6. **Validation** - Automatic validation pipeline execution
7. **Cleanup** - Worktree removal and resource cleanup

### Security Features
- Command interception blocks dangerous operations (rm -rf, sudo, etc.)
- Worktree isolation prevents conflicts between parallel workers
- Validation enforcement before task completion
- Audit trail of all blocked commands

## Critical Configuration Files

- `settings.json` - Runtime configuration for validation, logging, and fallback behavior
- `settings-precommit.json` - Pre-commit hook configuration
- `validation-metrics.json` - Historical validation performance metrics
- `.env` - Environment variables (KANBAN_DATABASE_URL required)
- `prisma/schema.prisma` - Database schema shared with vibe-kanban

## Integration with vibe-kanban

This project integrates with the vibe-kanban task management system:
- Shared SQLite database for task tracking
- Todo tasks can be executed by Claude workers
- Task status syncs between systems
- Validation results affect task completion

## Hook Integration

Validation runs automatically on Claude Code stop attempts via configured hooks:
- Failed validation prevents task completion
- Success/failure tracked in metrics
- Custom stages can be added via API
- Hook script is Node.js based for cross-platform compatibility

## Environment Requirements

- Node.js 18+ (for native fetch API support)
- SQLite3
- Git (for worktree management)
- Claude Code CLI (for worker execution)

## Development Workflow

1. Make changes to code
2. Run essential validation commands (lint, type-check, test)
3. Claude Code automatically runs full validation before task completion
4. Fix any validation failures
5. Validation metrics collected for analysis
6. Task marked complete only after all checks pass