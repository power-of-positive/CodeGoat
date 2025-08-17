NEVER disable validation checks - fix errors properly!! I don't care if failures are related to your changes, fix everything!!

# Claude Code Configuration

This file configures Claude Code behavior for this project, including validation hooks and project-specific settings.

## Project Context

CodeGoat is a configurable AI proxy server that provides:

- Model fallback capabilities with retry logic
- Request/response logging and analytics
- Configurable validation pipeline for development workflow
- Settings management API for runtime configuration

## Commands to Remember

Always run these commands after making changes:

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# TypeScript preference check
npm run typescript-check

# Unit tests
npm test

# E2E tests (unified - recommended for resolved CommonJS/ESM conflicts)
npm run test:e2e:unified

# E2E tests (optimized - performance focused)
npm run test:e2e:optimized

# E2E tests (standard Jest-based)
npm run test:e2e

# Build
npm run build

# Log management (optimized)
npm run logs:clean:optimized
npm run logs:stats
```

## Validation Hook Configuration

Claude Code will automatically run validation steps before completing tasks using the configured hook script.

### Stop Hook

This hook runs validation stages when Claude Code attempts to complete a task:

```bash
npx ts-node scripts/validate-task.ts
```

The validation runner:

1. Loads validation stages from `settings.json`
2. Executes enabled stages in order (lint → typecheck → test → e2e)
3. Tracks timing and success metrics
4. Saves analytics to `validation-metrics.json`
5. Exits with code 0 (success) or 1 (failure)

### Validation Stages

Default validation stages (can be customized via settings API):

1. **Lint** (`npm run lint`) - Code style and quality checks
2. **Type Check** (`npm run type-check`) - TypeScript compilation and type safety
3. **Test** (`npm test`) - Unit test suite
4. **TypeScript Preference** (`npm run typescript-check`) - Ensures TypeScript is preferred over JavaScript
5. **E2E** (`cd ui && npm run test:e2e`) - End-to-end tests (disabled by default)

Each stage can be:

- Enabled/disabled individually
- Configured with custom timeouts
- Set to continue or stop on failure
- Ordered by priority

### Metrics Collection

When `enableMetrics: true` in validation settings:

- Execution time per stage
- Success/failure rates
- Historical trends
- Development workflow analytics

Access metrics via:

- `validation-metrics.json` - Raw data
- `/api/settings/validation` - API endpoint
- Future: Visualization dashboard

## Project Structure

```
src/
├── routes/          # API route handlers
├── services/        # Business logic services
├── utils/           # Utility functions
├── __tests__/       # Unit tests
├── types.ts         # TypeScript type definitions
├── proxy-handler.ts # Core proxy functionality
└── server.ts        # Express server setup

tests/              # E2E test suites
scripts/            # Build and validation scripts
ui/                 # React frontend application
```

## Development Workflow

1. Make changes to code
2. Claude Code automatically runs validation hook before stopping
3. If validation fails, Claude Code continues working to fix issues
4. If validation passes, task is marked complete
5. Metrics are collected for workflow analysis

## Settings Management

Runtime configuration via REST API:

- `GET /api/settings` - View all settings
- `PUT /api/settings/fallback` - Update fallback behavior
- `POST /api/settings/validation/stages` - Add validation stage
- `DELETE /api/settings/validation/stages/:id` - Remove stage

Settings persist in `settings.json` and affect:

- Proxy fallback behavior
- Validation pipeline configuration
- Retry logic and timeouts
- Metrics collection

## Hook Integration Notes

- Validation runs automatically on Claude Code stop attempts
- Failed validation prevents task completion
- Success/failure tracked in metrics
- Custom stages can be added via API
- Hook script is Node.js based for cross-platform compatibility
