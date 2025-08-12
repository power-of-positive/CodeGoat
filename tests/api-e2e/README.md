# API E2E Tests for Backend Migration Validation

Comprehensive End-to-End tests to validate API compatibility and database state consistency during backend migration from Rust.

## Overview

The API E2E tests ensure:
- **API Compatibility** - All endpoints work correctly before/after migration
- **Database State Validation** - Database states are captured and compared
- **Referential Integrity** - Foreign key constraints and cascade deletions
- **Migration Safety** - Schema changes don't break functionality

## Test Structure

### Core Test Files
- **`projects.spec.ts`** - Project management API tests
- **`tasks.spec.ts`** - Task management API tests  
- **`task-attempts.spec.ts`** - Task attempt lifecycle tests
- **`workflows.spec.ts`** - End-to-end workflow tests
- **`referential-integrity.spec.ts`** - Database constraint tests
- **`migration-validation.spec.ts`** - Schema validation tests

### Support Infrastructure
- **`setup/test-database.ts`** - Isolated SQLite database management
- **`setup/api-client.ts`** - Enhanced API client with logging
- **`setup/database-snapshot.ts`** - Database state capture/comparison
- **`setup/fixtures.ts`** - Test data factories and scenarios

## Key Features

### Database State Validation
Tests capture before/after database snapshots to ensure:
- No unexpected changes during read operations
- Correct modifications during write operations
- Proper cleanup during delete operations

```typescript
const beforeSnapshot = await captureDbSnapshot(db, 'before-operation');
// ... perform API operation
const afterSnapshot = await captureDbSnapshot(db, 'after-operation');
const diff = compareDbSnapshots(beforeSnapshot, afterSnapshot);
```

### Isolated Test Environments
Each test runs with its own SQLite database for:
- No test pollution
- Consistent starting state
- Proper cleanup
- Parallel execution safety

## Running Tests

### Prerequisites
1. Backend built: `npm run backend:build:single`
2. Dependencies: `npm install`
3. Playwright: `npx playwright install chromium`

### Local Development
```bash
# Run all API E2E tests with backend auto-start
npm run test:e2e

# Run specific test
./scripts/run-api-e2e-tests.sh tests/api-e2e/projects.spec.ts

# Debug mode
npm run test:e2e:debug
```

### Manual Backend Control
```bash
# Start backend manually
npm run backend:run

# Run tests against running backend
npm run test:e2e:raw
```

## Test Scenarios

### Predefined Scenarios
- **`EMPTY_DATABASE`** - Clean slate for creation workflows
- **`SINGLE_PROJECT`** - Basic project setup
- **`MULTIPLE_PROJECTS`** - Multi-project isolation
- **`COMPLETE_PROJECT_STRUCTURE`** - Full hierarchy with tasks/attempts
- **`NESTED_TASKS`** - Parent-child relationships
- **`WITH_TEMPLATES`** - Template-based workflows

### Migration Validation
Tests validate:
- **Schema Validation** - Tables, indexes, constraints exist
- **Foreign Key Enforcement** - Referential integrity works
- **Data Type Compatibility** - Datetime, JSON, enum handling
- **Transaction Safety** - Rollback/recovery scenarios
- **API Compatibility** - All endpoints work post-migration

## Debugging

### Database Snapshots
```bash
# View snapshots in test-databases/ directory
ls test-databases/

# Check diff reports in test output
npm run test:e2e 2>&1 | grep -A 20 "Database state changes"
```

### Request Logs
```typescript
// Access API request logs in tests
const logs = apiClient.getRequestLogs();
console.log('API requests:', logs);
```

## Migration Checklist

- [ ] All API E2E tests pass
- [ ] Database state validation shows no unexpected changes  
- [ ] Referential integrity tests pass
- [ ] Migration validation tests pass
- [ ] Workflow tests complete successfully
- [ ] Error handling maintains same behavior

This test suite ensures backend migration maintains full compatibility and data integrity.