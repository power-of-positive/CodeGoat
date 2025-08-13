# Database Setup Guide

CodeGoat now uses separate databases for development and testing to prevent test data pollution in the development environment.

## Database Configuration

### Development Database
- **File**: `./prisma/kanban.db`
- **Environment Variable**: `KANBAN_DATABASE_URL="file:./prisma/kanban.db"`
- **Usage**: Used during normal development and when running the application

### Test Database
- **File**: `./prisma/kanban-test.db`
- **Environment Variable**: `KANBAN_DATABASE_URL="file:./prisma/kanban-test.db"` (when using `.env.test`)
- **Usage**: Used during E2E tests and unit tests

## Quick Setup

Run the database setup script to initialize both databases:

```bash
npm run db:setup
```

This will:
1. Generate Prisma client
2. Ensure development database exists
3. Create a fresh test database
4. Set up proper migrations

## Database Management Commands

### Development Database
```bash
npm run db:generate          # Generate Prisma client
npm run db:migrate          # Run migrations for dev DB
npm run db:push             # Push schema changes to dev DB
npm run db:studio           # Open dev database in Prisma Studio
```

### Test Database
```bash
npm run db:test:migrate     # Run migrations for test DB
npm run db:test:push        # Push schema changes to test DB
npm run db:test:reset       # Reset test database (fresh start)
npm run db:test:studio      # Open test database in Prisma Studio
npm run db:test:seed        # Seed test database with data
```

### Maintenance
```bash
npm run db:clean-test-data  # Remove test projects from dev database
```

## Environment Configuration

### `.env` (Development)
```bash
# Development database
KANBAN_DATABASE_URL="file:./prisma/kanban.db"
```

### `.env.test` (Testing)
```bash
# Test Database Configuration
KANBAN_DATABASE_URL="file:./prisma/kanban-test.db"

# Disable external services in tests
AI_REVIEWER_ENABLED=false
LOG_LEVEL=warn
```

## How It Works

1. **Development**: Uses the standard `.env` file with the development database
2. **Testing**: E2E and unit tests use `dotenv-cli` to load `.env.test` which overrides the database URL
3. **Isolation**: Test data never pollutes the development database
4. **Clean Up**: Test database is reset before each test suite run

## Benefits

- ✅ **No Test Data Pollution**: Development database stays clean
- ✅ **Predictable Tests**: Each test run starts with a clean database
- ✅ **Easy Reset**: Test database can be reset without losing dev data
- ✅ **Performance**: Tests don't slow down from accumulated test data
- ✅ **Debugging**: Can inspect test database separately from dev data

## Migration Workflow

When you create a new migration:

1. **Development**: Run `npm run db:migrate` to update the dev database
2. **Testing**: The test database will automatically get the migration when reset
3. **Production**: Use `npm run db:migrate:deploy` for production deployments

## Troubleshooting

### "Database file not found"
Run `npm run db:setup` to ensure both databases are properly initialized.

### "Migration failed"
1. Check if you have conflicting data in your database
2. For test database: `npm run db:test:reset`
3. For dev database: Check the migration files and resolve conflicts

### "Test data in development"
Run `npm run db:clean-test-data` to remove test projects from the dev database.

## Test Data Patterns

The cleanup script identifies test projects by these patterns:
- Names containing "Test" or "test"
- Names containing "PROJECT"
- Names starting with "Attempt", "Valid", "Dependent"
- Names containing timestamp patterns like "1755079"

If you create test data, use these naming conventions for automatic cleanup.