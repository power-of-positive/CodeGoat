# Backend Test Reorganization Plan

## Current Issues
1. **Test Duplication**: Unit tests in `src/__tests__/routes/` and E2E tests in `tests/` overlap significantly
2. **Poor Organization**: E2E tests are grouped by feature rather than by route structure
3. **Missing Route Tests**: No unit tests for `logs.ts` and `settings.ts` routes
4. **Inconsistent Structure**: Test files don't mirror the source code structure
5. **Legacy Test Files**: JavaScript test files (`test-*.js`) should be migrated to TypeScript

## Proposed Structure

### Unit Tests (src/__tests__/)
Mirror the source code structure exactly:

```
src/__tests__/
├── routes/
│   ├── internal.test.ts        ✅ (exists)
│   ├── logs.test.ts            ❌ (missing - needs creation)
│   ├── models.test.ts          ✅ (exists)
│   ├── openrouter-stats.test.ts ✅ (exists)
│   ├── settings.test.ts        ❌ (missing - needs creation)
│   └── status.test.ts          ✅ (exists)
├── services/
│   ├── model.service.test.ts   ✅ (exists)
│   └── openrouter.service.test.ts ✅ (exists)
├── utils/
│   ├── log-cleaner.test.ts     ✅ (exists)
│   └── settings-loader.test.ts ❌ (missing - needs creation)
├── management/
│   └── api.test.ts            ✅ (exists)
├── tools/
│   └── ai-code-reviewer.test.ts ✅ (exists)
├── config.test.ts             ✅ (exists)
├── logger-winston.test.ts     ✅ (exists)
├── matcher.test.ts            ✅ (exists)
├── proxy-handler.test.ts      ✅ (exists)
└── proxy.test.ts              ✅ (exists)
```

### E2E Tests (tests/)
Organize by API endpoint groups, focusing on integration testing:

```
tests/
├── routes/
│   ├── api-models.e2e.test.ts      # Tests for /api/models endpoints
│   ├── api-status.e2e.test.ts      # Tests for /api/status endpoints  
│   ├── api-logs.e2e.test.ts        # Tests for /api/logs endpoints
│   ├── api-settings.e2e.test.ts    # Tests for /api/settings endpoints
│   ├── api-openrouter-stats.e2e.test.ts # Tests for /api/openrouter-stats
│   ├── internal.e2e.test.ts        # Tests for /internal endpoints
│   └── proxy.e2e.test.ts           # Tests for proxy functionality (/v1/*)
├── integration/
│   ├── comprehensive.test.ts        # Full workflow integration tests
│   ├── payload-handling.test.ts     # Large payload handling
│   └── fallback-behavior.test.ts    # Model fallback scenarios
├── fixtures/
│   └── e2e-fixtures.ts             ✅ (exists)
└── setup.ts                       ✅ (exists)
```

## Migration Tasks

### 1. Create Missing Unit Tests
- [ ] `src/__tests__/routes/logs.test.ts`
- [ ] `src/__tests__/routes/settings.test.ts` 
- [ ] `src/__tests__/utils/settings-loader.test.ts`

### 2. Reorganize E2E Tests
- [ ] Extract route-specific tests from `api-endpoints.test.ts` into individual files
- [ ] Move proxy-related tests from `e2e.test.ts` to `proxy.e2e.test.ts`
- [ ] Keep `comprehensive.test.ts` for integration scenarios
- [ ] Keep `payload-handling.test.ts` and `fallback-behavior.test.ts` as they're well-organized

### 3. Remove Duplicated Test Cases
- [ ] Remove API endpoint tests that duplicate unit tests
- [ ] Focus E2E tests on integration scenarios, not basic CRUD operations
- [ ] Keep E2E tests for complex workflows and edge cases

### 4. Clean Up Legacy Files
- [ ] Evaluate `test-fallback.js`, `test-configurable-fallback.js`, `test-server.js`
- [ ] Migrate useful test cases to TypeScript E2E tests
- [ ] Remove redundant JavaScript test files

## Test Coverage Goals

### Unit Tests Should Cover:
- Route handler logic (request/response processing)
- Business logic functions
- Error handling
- Input validation
- Mocked external dependencies

### E2E Tests Should Cover:
- Complete request/response cycles
- Integration between components
- Real API behavior
- Complex workflows
- Performance scenarios
- Fallback mechanisms
- Error recovery

## Implementation Priority
1. **High**: Create missing unit tests for routes
2. **Medium**: Reorganize E2E tests by route structure  
3. **Low**: Clean up legacy test files