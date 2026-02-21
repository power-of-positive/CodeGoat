# Database Environment Audit & Standardization

## Executive Summary

Audit Date: 2025-10-31

**Status**: ⚠️ Issues Found - Inconsistencies across environments

**Critical Issues**:
1. Inconsistent environment variable naming (`KANBAN_DATABASE_URL` vs `DATABASE_URL`)
2. Multiple database files in wrong locations
3. Absolute paths in E2E configuration (non-portable)
4. Inconsistent fallback logic across codebase

## Current State Analysis

### Environment Files

| File | NODE_ENV | Database Variable | Database Path | Issues |
|------|----------|------------------|---------------|--------|
| `.env` | development | `KANBAN_DATABASE_URL` | `file:./prisma/kanban.db` | ✅ Correct |
| `.env.example` | development | `KANBAN_DATABASE_URL` | `file:./prisma/kanban-fresh.db` | ❌ References non-existent file |
| `.env.test` | test | `KANBAN_DATABASE_URL` + `DATABASE_URL` | `file:./prisma/kanban-test.db` | ⚠️ Duplicate vars |
| `.env.e2e` | e2e-test | `KANBAN_DATABASE_URL` + `DATABASE_URL` | Absolute path | ❌ Non-portable |

### Prisma Configuration

**Schema datasource** (`prisma/schema.prisma`):
```prisma
datasource db {
  provider = "sqlite"
  url      = env("KANBAN_DATABASE_URL")  // Only checks KANBAN_DATABASE_URL
}
```

**Issue**: Prisma only looks for `KANBAN_DATABASE_URL`, but some code uses `DATABASE_URL`

### Database Files Found

```
Location                                          Size      Status
─────────────────────────────────────────────────────────────────────
./prisma/kanban.db                               160KB     ✅ Primary dev DB
./prisma/kanban-test.db                          160KB     ✅ Test DB
./prisma/dev.db                                  0B        ❌ Empty, unused
./prisma/prisma/kanban.db                        ?         ❌ Nested folder (wrong)
./kanban.db                                      0B        ❌ Root level (wrong)
./database.db                                    0B        ❌ Root level (wrong)
./backups/*                                      ~2MB      ✅ Backup files
```

### Code Analysis

**Files with database URL handling**:

1. **`src/services/database.ts`**:
   ```typescript
   url: process.env.KANBAN_DATABASE_URL || 'file:../kanban.db'
   ```
   ❌ Uses relative path fallback (incorrect)

2. **`scripts/claude-stop-hook.ts`**:
   ```typescript
   if (process.env.KANBAN_DATABASE_URL && !process.env.DATABASE_URL) {
     process.env.DATABASE_URL = process.env.KANBAN_DATABASE_URL;
   }
   ```
   ⚠️ Manual synchronization needed

3. **`scripts/validate-task.ts`**:
   ```typescript
   if (isPreCommitContext && process.env.KANBAN_DATABASE_URL) {
     process.env.DATABASE_URL = process.env.KANBAN_DATABASE_URL;
   }
   ```
   ⚠️ Conditional synchronization

4. **`playwright.config.ts`**:
   ```typescript
   env: {
     KANBAN_DATABASE_URL: 'file:./prisma/kanban-test.db',
     DATABASE_URL: 'file:./prisma/kanban-test.db',
   }
   ```
   ⚠️ Hardcoded duplicate values

## Identified Issues

### 1. Variable Naming Inconsistency

**Problem**: Two different environment variables for the same purpose
- `KANBAN_DATABASE_URL` (Prisma schema)
- `DATABASE_URL` (Common convention)

**Impact**:
- Confusion for developers
- Need for manual synchronization in code
- Risk of using wrong database

**Recommendation**: Standardize on `DATABASE_URL` (industry standard)

### 2. Misplaced Database Files

**Problem**: Database files in multiple incorrect locations

**Root causes**:
- Wrong working directory during test execution
- Relative path resolution issues
- Inconsistent path specifications

**Impact**:
- Disk space waste
- Potential data corruption if wrong DB used
- Confusion about which DB is active

### 3. Non-Portable Configuration

**Problem**: `.env.e2e` uses absolute paths
```bash
KANBAN_DATABASE_URL="file:/Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat/prisma/kanban-test.db"
```

**Impact**:
- Breaks on other machines
- Breaks in CI/CD
- Not shareable

### 4. Inconsistent Test Database Setup

**Problem**: Different test types use databases inconsistently

| Test Type | Config File | Database Setup | Issues |
|-----------|-------------|----------------|--------|
| Unit tests | `jest.unit.config.js` | None explicit | ⚠️ No DB env set in setup |
| E2E tests | `.env.e2e` | Absolute path | ❌ Non-portable |
| Playwright | `playwright.config.ts` | Hardcoded | ⚠️ Duplicate vars |

### 5. Missing Database Initialization

**Problem**: No clear database setup/teardown for tests

**Missing**:
- Automated test DB creation
- Schema synchronization before tests
- Cleanup after tests
- Seed data management

## Recommended Standardization

### 1. Environment Variable Standard

**Primary Variable**: `DATABASE_URL` (industry standard)
**Legacy Support**: `KANBAN_DATABASE_URL` (for backward compatibility)

**Precedence Order**:
```
DATABASE_URL > KANBAN_DATABASE_URL > default
```

### 2. Database File Structure

```
prisma/
├── kanban.db              # Development database
├── kanban-test.db         # All test types (unit, e2e, playwright)
├── kanban-prod.db         # Production (not in repo)
└── schema.prisma          # Schema definition

backups/                   # Backup files
└── *.db                   # Timestamped backups

# Delete these (wrong locations):
./kanban.db                # Remove
./database.db              # Remove
./prisma/dev.db            # Remove
./prisma/prisma/           # Remove entire folder
```

### 3. Environment Configuration Standard

**`.env` (Development)**:
```bash
NODE_ENV=development
DATABASE_URL="file:./prisma/kanban.db"
PORT=3001

# Optional: Legacy compatibility
KANBAN_DATABASE_URL="${DATABASE_URL}"
```

**`.env.test` (All Tests)**:
```bash
NODE_ENV=test
DATABASE_URL="file:./prisma/kanban-test.db"
PORT=3001

# Test-specific
AI_REVIEWER_ENABLED=false
LOG_LEVEL=error
```

**`.env.production` (Production)**:
```bash
NODE_ENV=production
DATABASE_URL="file:./prisma/kanban-prod.db"
PORT=3001

# Production-specific
LOG_LEVEL=info
AI_REVIEWER_ENABLED=true
```

### 4. Prisma Schema Update

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // Changed from KANBAN_DATABASE_URL
}
```

### 5. Code Standardization

**Create utility function** (`src/config/database.ts`):
```typescript
/**
 * Get database URL with proper fallback logic
 * Precedence: DATABASE_URL > KANBAN_DATABASE_URL > default
 */
export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.KANBAN_DATABASE_URL ||
    'file:./prisma/kanban.db';

  // Validate URL format
  if (!url.startsWith('file:')) {
    throw new Error('Database URL must start with "file:"');
  }

  return url;
}

/**
 * Get environment-specific database URL
 */
export function getTestDatabaseUrl(): string {
  if (process.env.NODE_ENV === 'test') {
    return 'file:./prisma/kanban-test.db';
  }
  return getDatabaseUrl();
}
```

### 6. Test Setup Standardization

**Jest setup** (`jest-setup-unit.js`):
```javascript
// Set test database URL
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./prisma/kanban-test.db';
process.env.KANBAN_DATABASE_URL = process.env.DATABASE_URL; // Legacy
```

**Playwright config** (`playwright.config.ts`):
```typescript
use: {
  baseURL: 'http://localhost:3001',
},
projects: [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
    },
  },
],
// Global setup sets DATABASE_URL via .env.test
```

## Migration Plan

### Phase 1: Cleanup (Low Risk)

1. **Remove misplaced database files**:
   ```bash
   rm -f ./kanban.db ./database.db ./prisma/dev.db
   rm -rf ./prisma/prisma/
   ```

2. **Add to `.gitignore`**:
   ```
   # Database files
   *.db
   *.db-journal
   *.db-shm
   *.db-wal

   # Except test database schema
   !prisma/schema.prisma

   # Keep test DB structure but not data
   prisma/kanban-test.db
   ```

### Phase 2: Standardize Environment Files (Low Risk)

1. **Update `.env.example`**:
   ```bash
   DATABASE_URL="file:./prisma/kanban.db"
   KANBAN_DATABASE_URL="${DATABASE_URL}"  # Legacy support
   ```

2. **Update `.env.test`**:
   ```bash
   NODE_ENV=test
   DATABASE_URL="file:./prisma/kanban-test.db"
   KANBAN_DATABASE_URL="${DATABASE_URL}"  # Legacy support
   ```

3. **Update `.env.e2e`** (remove absolute paths):
   ```bash
   NODE_ENV=test
   DATABASE_URL="file:./prisma/kanban-test.db"
   KANBAN_DATABASE_URL="${DATABASE_URL}"  # Legacy support
   ```

### Phase 3: Update Prisma Schema (Medium Risk)

1. **Update `prisma/schema.prisma`**:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")  // Changed from KANBAN_DATABASE_URL
   }
   ```

2. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Test schema change**:
   ```bash
   npm test
   npm run test:e2e
   ```

### Phase 4: Update Code (Medium Risk)

1. **Create database config utility**:
   - Add `src/config/database.ts` with helper functions

2. **Update `src/services/database.ts`**:
   - Import and use `getDatabaseUrl()`
   - Remove hardcoded fallback

3. **Update test setup files**:
   - `jest-setup-unit.js`
   - `ui/scripts/test-setup.js`
   - `playwright.config.ts`

4. **Update scripts**:
   - `scripts/claude-stop-hook.ts`
   - `scripts/validate-task.ts`
   - `scripts/database-backup.ts`

### Phase 5: Documentation (Low Risk)

1. **Update documentation**:
   - `docs/database-management.md`
   - `deployment/README.md`
   - `CLAUDE.md`

2. **Add environment setup guide**

### Phase 6: Testing & Validation (Critical)

```bash
# 1. Clean environment
rm -f prisma/*.db
rm -rf node_modules/.prisma

# 2. Fresh install
npm install
npx prisma generate

# 3. Create databases
npx prisma db push

# 4. Run all tests
npm run lint
npm run type-check
npm test
npm run test:api-e2e
npm run test:playwright

# 5. Verify backups work
npm run backup:create "migration-test"
npm run backup:status
```

## Success Criteria

- [ ] Only 2 database files in `prisma/`: `kanban.db` and `kanban-test.db`
- [ ] No database files in project root
- [ ] All environment files use `DATABASE_URL` as primary
- [ ] All tests pass with new configuration
- [ ] Backup system works correctly
- [ ] Documentation updated
- [ ] No hardcoded paths in any config files
- [ ] Prisma schema uses `DATABASE_URL`

## Rollback Plan

If issues arise during migration:

1. **Revert Prisma schema**:
   ```bash
   git checkout prisma/schema.prisma
   npx prisma generate
   ```

2. **Revert environment files**:
   ```bash
   git checkout .env*
   ```

3. **Restore from backup**:
   ```bash
   npm run backup:restore <backup-filename>
   ```

## Timeline

- **Phase 1-2**: 30 minutes (Cleanup & env files)
- **Phase 3**: 15 minutes (Prisma schema)
- **Phase 4**: 1 hour (Code updates)
- **Phase 5**: 30 minutes (Documentation)
- **Phase 6**: 30 minutes (Testing)

**Total Estimated Time**: 3 hours

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|-----------|------------|
| Phase 1 | Low | Files are misplaced duplicates |
| Phase 2 | Low | Environment files are local only |
| Phase 3 | Medium | Test thoroughly, easy to revert |
| Phase 4 | Medium | Backward compatibility via fallback |
| Phase 5 | Low | Documentation only |
| Phase 6 | Low | Validation step |

**Overall Risk**: Low-Medium
**Recommendation**: Proceed with migration
