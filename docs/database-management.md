# Database Management Guide

Comprehensive guide for managing, inspecting, debugging, and testing the CodeGoat database system.

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Backup and Versioning](#backup-and-versioning)
4. [Inspection and Debugging](#inspection-and-debugging)
5. [Testing with Database](#testing-with-database)
6. [Common Operations](#common-operations)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

## Overview

CodeGoat uses SQLite as its primary database, managed through Prisma ORM. The database contains:

- **Projects** - Project definitions and configuration
- **Tasks** - Unified task tracking with full lifecycle management
- **TaskTemplates** - Reusable task templates
- **ValidationRuns** - Validation pipeline execution history
- **BDDScenarios** - Behavior-driven development test scenarios
- **ExecutionProcesses** - Worker execution lifecycle metadata
- **ExecutionProcessLogs** - Streaming stdout/stderr captured as append-only records

### Key Database Files

```
prisma/
├── kanban.db              # Production database
├── kanban-test.db         # Test database (isolated)
├── schema.prisma          # Prisma schema definition
└── migrations/            # Database migrations

backups/
├── *-backup-manual-*.db   # Manual backups
└── *-backup-auto-*.db     # Automated backups
```

### Environment Configuration

Database paths are configured via environment variables following industry standards:

**Standard Variable (Primary)**: `DATABASE_URL`
**Legacy Variable (Backward Compatibility)**: `KANBAN_DATABASE_URL`

```bash
# Development (.env)
NODE_ENV=development
DATABASE_URL="file:./prisma/kanban.db"
KANBAN_DATABASE_URL="file:./prisma/kanban.db"  # Legacy support

# Test (.env.test)
NODE_ENV=test
DATABASE_URL="file:./prisma/kanban-test.db"
KANBAN_DATABASE_URL="file:./prisma/kanban-test.db"  # Legacy support

# Production (.env.production)
NODE_ENV=production
DATABASE_URL="file:./prisma/kanban-prod.db"
KANBAN_DATABASE_URL="file:./prisma/kanban-prod.db"  # Legacy support
```

**Resolution Order**: `DATABASE_URL` > `KANBAN_DATABASE_URL` > environment-specific default

**Helper Functions** (`src/config/database.ts`):
- `getDatabaseUrl()` - Get database URL with fallback logic
- `getTestDatabaseUrl()` - Always returns test database
- `ensureDatabaseUrl()` - Synchronize DATABASE_URL and KANBAN_DATABASE_URL

## Database Architecture

### Database Design

CodeGoat uses a unified database design that enables:
- Comprehensive task tracking across the system
- Advanced analytics and reporting capabilities
- Seamless task assignment between AI workers and developers
- Integrated validation tracking
- Project-based task organization

### Unified Task Model

The `Task` model provides a flexible task management system:

```typescript
model Task {
  id                 String    // UUID or CODEGOAT-XXX format
  projectId          String?   // Optional for standalone tasks
  title              String
  description        String?
  status             String    // todo, inprogress, inreview, done, cancelled
  priority           String    // low, medium, high, urgent

  // Task metadata
  taskType           String?   // story, task, bug, feature
  executorId         String?   // Executor ID (AI or human)
  content            String?   // Additional content/notes

  // Relations
  validationRuns     ValidationRun[]
  bddScenarios       BDDScenario[]
  executionProcesses ExecutionProcess[]
}
```

### Key Relationships

```
Project
  ├── Tasks (many)
  └── TaskTemplates (many)

Task
  ├── ValidationRuns (many)
  ├── BDDScenarios (many)
  └── ExecutionProcesses (many)

ExecutionProcess
  └── ExecutionProcessLogs (many)

ValidationRun
  ├── ValidationStages (many)
  └── ValidationLogs (many)

> Indexed fields: `timestamp`, `success`, `environment`, `session_id`, `git_commit`, `git_branch`

Validation stages are keyed by `stage_id` and now enforce a foreign-key link to `ValidationStageConfig.stage_id`, guaranteeing that recorded results map back to a canonical configuration entry.
```

## Backup and Versioning

### Automatic Backup System

CodeGoat implements a comprehensive backup system with versioning and retention policies.

#### Backup Types

**Manual Backups (50 kept)**
```bash
# Create manual backup
npm run backup:create "Before major update"

# Format: {dbname}-backup-manual-2025-10-31T14-30-00-000Z-description.db
```

**Automated Backups (10 kept)**
```bash
# Create automated backup
npm run backup:auto

# Format: {dbname}-backup-auto-2025-10-31T14-30-00-000Z-scheduled.db
```

#### Production Deployment

For production environments, use systemd timers for automatic backups:

1. **Copy service files:**
   ```bash
   sudo cp deployment/database-backup.service /etc/systemd/system/
   sudo cp deployment/database-backup.timer /etc/systemd/system/
   ```

2. **Configure paths:**
   ```bash
   # Edit /etc/systemd/system/database-backup.service
   # Update WorkingDirectory to your production path
   sudo nano /etc/systemd/system/database-backup.service
   ```

3. **Enable and start:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable database-backup.timer
   sudo systemctl start database-backup.timer

   # Check status
   sudo systemctl status database-backup.timer
   sudo journalctl -u database-backup.service -n 50
   ```

#### Backup Operations

```bash
# List all backups
npm run backup:list

# Check backup status
npm run backup:status

# Verify backup integrity
npm run backup:verify <filename>
npm run backup:verify-all

# Restore from backup
npm run backup:restore <filename>

# Clean up old backups
npm run backup:cleanup
```

#### Versioning Strategy

Backups use ISO 8601 timestamps for industry-standard versioning:
- **Filename**: `{dbname}-backup-{type}-{timestamp}-{description}.db`
- **Timestamp format**: `YYYY-MM-DDTHH-mm-ss-sssZ` (ISO 8601)
- **Automatic retention**: Old backups are automatically deleted based on policy
- **Pre-restore backup**: System automatically creates backup before any restore operation
- **Incremental naming**: Each backup has a unique timestamp to prevent collisions

#### API Access

Backups can be managed via REST API:

```bash
# Get backup status
curl http://localhost:3001/api/backup/status

# List backups
curl http://localhost:3001/api/backup

# Create backup
curl -X POST http://localhost:3001/api/backup/create \
  -H "Content-Type: application/json" \
  -d '{"description": "API backup"}'

# Restore backup
curl -X POST http://localhost:3001/api/backup/restore/{backup-filename}.db

# Delete backup
curl -X DELETE http://localhost:3001/api/backup/{backup-filename}.db
```

See [backup-system.md](./backup-system.md) for complete backup documentation.

## Inspection and Debugging

### Using Prisma Studio

Prisma Studio provides a GUI for database inspection:

```bash
# Launch Prisma Studio
npx prisma studio

# Opens browser at http://localhost:5555
```

Features:
- Browse all tables and relationships
- Filter and search records
- Edit data directly
- View related records

### SQLite CLI Tools

#### Direct Database Access

```bash
# Open database in SQLite CLI
sqlite3 prisma/kanban.db

# Industry-standard SQLite commands:
.tables                  # List all tables
.schema tasks            # Show CREATE TABLE statement for table
.mode column             # Set column display mode
.headers on              # Show column headers
.output query.txt        # Redirect output to file
.width 10 20 30          # Set column widths
.separator ","           # Set CSV separator
```

#### Useful Queries

**Inspect Tasks**
```sql
-- List all tasks with their status
SELECT id, title, status, priority, "createdAt"
FROM tasks
ORDER BY "createdAt" DESC
LIMIT 10;

-- Find tasks by ID pattern
SELECT * FROM tasks WHERE id LIKE 'CODEGOAT-%';

-- Count tasks by status
SELECT status, COUNT(*) as count
FROM tasks
GROUP BY status;
```

**Inspect Task Attempts**
```sql
-- Recent task attempts with status
SELECT
  ta.id,
  t.title as task_title,
  ta.executor,
  ta.status,
  ta."createdAt",
  ta."completedAt"
FROM task_attempts ta
JOIN tasks t ON ta."taskId" = t.id
ORDER BY ta."createdAt" DESC
LIMIT 10;

-- Failed task attempts
SELECT * FROM task_attempts
WHERE status = 'failed'
ORDER BY "createdAt" DESC;
```

**Inspect Validation Runs**
```sql
-- Recent validation runs
SELECT
  id,
  "taskId",
  success,
  "totalStages",
  "passedStages",
  "failedStages",
  "totalTime",
  timestamp
FROM validation_runs
ORDER BY timestamp DESC
LIMIT 10;

-- Failed validation stages
SELECT
  vr.id as run_id,
  vr."taskId",
  vs."stageName",
  vs."errorMessage",
  vs.duration
FROM validation_runs vr
JOIN validation_stages vs ON vr.id = vs."runId"
WHERE vs.success = 0
ORDER BY vr.timestamp DESC;
```

### Database Debugging Tools

#### Check Database Integrity

```bash
# Verify database integrity
sqlite3 prisma/kanban.db "PRAGMA integrity_check;"

# Should return: ok

# Check foreign key constraints
sqlite3 prisma/kanban.db "PRAGMA foreign_key_check;"

# Empty result means no violations
```

#### Analyze Database Size

```bash
# Get database size
du -h prisma/kanban.db

# Analyze table sizes
sqlite3 prisma/kanban.db <<EOF
SELECT
    name,
    COUNT(*) as row_count
FROM sqlite_master sm
JOIN pragma_table_info(sm.name)
WHERE sm.type = 'table'
GROUP BY name;
EOF
```

#### Export Database to SQL

```bash
# Export entire database
sqlite3 prisma/kanban.db .dump > database-export.sql

# Export specific table
sqlite3 prisma/kanban.db ".dump tasks" > tasks-export.sql

# Import from SQL
sqlite3 prisma/kanban-new.db < database-export.sql
```

### Debugging with Prisma

#### Enable Query Logging

```typescript
// In your code
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

#### View Generated SQL

```bash
# Show SQL for migrations
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

## Testing with Database

### Test Database Isolation

Tests use a separate database to prevent interference:

```typescript
// jest.unit.config.js
process.env.KANBAN_DATABASE_URL = 'file:./prisma/kanban-test.db';
```

### Database Test Utilities

#### Setup and Teardown

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clear test database
  await prisma.$executeRaw`DELETE FROM tasks`;
  await prisma.$executeRaw`DELETE FROM projects`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean slate for each test
  await prisma.task.deleteMany();
});
```

#### Seed Test Data

```typescript
async function seedTestData() {
  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'Test project description',
      gitRepoPath: '/tmp/test-repo',
    },
  });

  const task = await prisma.task.create({
    data: {
      id: 'CODEGOAT-001',
      projectId: project.id,
      title: 'Test task',
      status: 'pending',
      priority: 'medium',
    },
  });

  return { project, task };
}
```

#### Test Database Operations

```typescript
describe('Task Operations', () => {
  it('should create a task', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Test Task',
        status: 'pending',
        priority: 'high',
      },
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
  });

  it('should update task status', async () => {
    const task = await seedTestData().then(d => d.task);

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: 'inprogress' },
    });

    expect(updated.status).toBe('inprogress');
  });

  it('should cascade delete', async () => {
    const { project, task } = await seedTestData();

    await prisma.project.delete({
      where: { id: project.id },
    });

    const deletedTask = await prisma.task.findUnique({
      where: { id: task.id },
    });

    expect(deletedTask).toBeNull();
  });
});
```

#### API E2E Tests with Database

```typescript
import request from 'supertest';
import app from '../src/app';

describe('Task API', () => {
  beforeEach(async () => {
    // Clear test database
    await prisma.task.deleteMany();
  });

  it('should create task via API', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'API Test Task',
        status: 'pending',
        priority: 'high',
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.title).toBe('API Test Task');

    // Verify in database
    const task = await prisma.task.findUnique({
      where: { id: response.body.data.id },
    });
    expect(task).not.toBeNull();
  });
});
```

### Database Test Best Practices

1. **Use test database**: Always use separate database for tests
2. **Clean state**: Clear data between tests for isolation
3. **Transaction rollback**: Use transactions when possible
4. **Factory functions**: Create reusable data factories
5. **Seed minimal data**: Only create data needed for each test
6. **Test constraints**: Verify foreign keys and unique constraints
7. **Test edge cases**: Null values, empty strings, max lengths

### Running Tests

```bash
# Backend unit tests (uses test DB)
npm test

# API E2E tests (uses test DB)
npm run test:api-e2e

# With coverage
npm run test:coverage:backend

# Single test file
npm test -- path/to/test.spec.ts
```

## Common Operations

### Schema Changes

#### Creating Migrations

```bash
# Create migration after schema changes
npx prisma migrate dev --name add_new_field

# Apply migrations to production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

#### Viewing Schema

```bash
# View current schema
cat prisma/schema.prisma

# Generate Prisma Client after schema changes
npx prisma generate
```

### Data Operations

#### Bulk Operations

```typescript
// Bulk insert
await prisma.task.createMany({
  data: [
    { title: 'Task 1', status: 'pending', priority: 'high' },
    { title: 'Task 2', status: 'pending', priority: 'medium' },
    { title: 'Task 3', status: 'pending', priority: 'low' },
  ],
});

// Bulk update
await prisma.task.updateMany({
  where: { status: 'pending' },
  data: { status: 'pending' },
});

// Bulk delete
await prisma.task.deleteMany({
  where: {
    status: 'completed',
    updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  },
});
```

#### Complex Queries

```typescript
// Nested includes
const task = await prisma.task.findUnique({
  where: { id: 'CODEGOAT-001' },
  include: {
    project: true,
    attempts: {
      include: {
        metrics: true,
        executionProcesses: true,
      },
    },
    validationRuns: {
      include: {
        stages: true,
      },
    },
  },
});

// Aggregations
const stats = await prisma.task.groupBy({
  by: ['status', 'priority'],
  _count: true,
  orderBy: {
    _count: {
      status: 'desc',
    },
  },
});

// Raw SQL for complex queries
const result = await prisma.$queryRaw`
  SELECT
    status,
    priority,
    COUNT(*) as count,
    AVG(duration) as avg_duration
  FROM tasks
  WHERE "createdAt" >= datetime('now', '-7 days')
  GROUP BY status, priority
`;
```

## Production Deployment

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export DATABASE_URL="file:./prisma/kanban.db"
export NODE_ENV="production"

# 3. Run database migrations
npx prisma migrate deploy

# 4. Generate Prisma Client
npx prisma generate

# 5. Verify database integrity
sqlite3 prisma/kanban.db "PRAGMA integrity_check;"

# 6. Create initial backup
npm run backup:create "initial-production-deployment"

# 7. Start application
npm start
```

### Backup Configuration

```bash
# 1. Copy systemd files
sudo cp deployment/database-backup.service /etc/systemd/system/
sudo cp deployment/database-backup.timer /etc/systemd/system/

# 2. Edit service file with production paths
sudo nano /etc/systemd/system/database-backup.service

# 3. Enable and start
sudo systemctl daemon-reload
sudo systemctl enable database-backup.timer
sudo systemctl start database-backup.timer
```

### Monitoring

```bash
# Check backup status
sudo systemctl status database-backup.timer

# View backup logs
sudo journalctl -u database-backup.service -n 100

# List backups
npm run backup:list

# Check database health
sqlite3 prisma/kanban.db "PRAGMA integrity_check;"
```

## Troubleshooting

### Database Locked Errors

**Problem**: `Error: database is locked`

**Solutions**:
```bash
# 1. Check for long-running queries
lsof prisma/kanban.db

# 2. Restart application
pm2 restart codegoat

# 3. Increase timeout in Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.KANBAN_DATABASE_URL + '?connection_limit=1&pool_timeout=20',
    },
  },
});
```

### Migration Failures

**Problem**: Migration fails or gets stuck

**Solutions**:
```bash
# 1. Check migration status
npx prisma migrate status

# 2. Resolve failed migration
npx prisma migrate resolve --applied <migration_name>

# 3. If all else fails, backup and reset
npm run backup:create "before-migration-reset"
npx prisma migrate reset
```

### Foreign Key Violations

**Problem**: Foreign key constraint errors

**Solutions**:
```bash
# 1. Check violations
sqlite3 prisma/kanban.db "PRAGMA foreign_key_check;"

# 2. Fix orphaned records
# Delete records that reference non-existent parents

# 3. Disable FK temporarily (development only!)
sqlite3 prisma/kanban.db "PRAGMA foreign_keys = OFF;"
```

### Performance Issues

**Problem**: Slow database queries

**Solutions**:
```bash
# 1. Analyze query plan
sqlite3 prisma/kanban.db
> EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE status = 'pending';

# 2. Add indexes
npx prisma migrate dev --name add_performance_indexes

# 3. Vacuum database
sqlite3 prisma/kanban.db "VACUUM;"

# 4. Analyze tables
sqlite3 prisma/kanban.db "ANALYZE;"
```

### Data Corruption

**Problem**: Database corruption or inconsistencies

**Solutions**:
```bash
# 1. Check integrity
sqlite3 prisma/kanban.db "PRAGMA integrity_check;"

# 2. Restore from backup
npm run backup:list
npm run backup:restore <latest-good-backup>

# 3. Export and reimport
sqlite3 prisma/kanban.db .dump > export.sql
mv prisma/kanban.db prisma/kanban.db.corrupt
sqlite3 prisma/kanban.db < export.sql
```

## Additional Resources

### Official Documentation
- [Prisma Documentation](https://www.prisma.io/docs/) - ORM and database toolkit
- [SQLite Documentation](https://www.sqlite.org/docs.html) - SQLite reference
- [SQLite Best Practices](https://www.sqlite.org/bestpractice.html) - Performance and reliability

### Project Documentation
- [Backup System Guide](./backup-system.md) - Detailed backup documentation
- [Database Schema](./database-schema.md) - Complete schema reference
- [API Schema](./api-schema.md) - API endpoint documentation
- [Deployment Guide](../deployment/README.md) - Production deployment

### Industry Standards
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) - Date and time format
- [Database Naming Conventions](https://en.wikipedia.org/wiki/Database_design#Naming_conventions)
- [ACID Properties](https://en.wikipedia.org/wiki/ACID) - Transaction guarantees

## Support

For database issues:
1. **Check this guide** for common problems and solutions
2. **Review application logs**: `tail -f logs/app.log` or `journalctl -u codegoat`
3. **Check backup status**: `npm run backup:status`
4. **Verify database integrity**: `sqlite3 prisma/kanban.db "PRAGMA integrity_check;"`
5. **Create backup** before any major operations: `npm run backup:create "before-fix"`
6. **Report issues** at https://github.com/anthropics/claude-code/issues
