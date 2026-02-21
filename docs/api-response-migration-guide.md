# API Response Format Migration Guide

## Overview

This guide documents the migration from inconsistent response formats to standardized API responses following REST best practices.

## Current State (Before Migration)

### Existing Utilities

**Location**: `src/utils/error-handler.ts`
- `handleApiError()` - Basic error handler
- Returns: `{ error: string }`

**Location**: `src/shared/schemas/common.schema.ts`
- `createApiResponseSchema()` - Generic response wrapper
- `ApiErrorResponseSchema` - Error response schema
- Format: `{ success: boolean, data?: T, error?: string, details?: [...] }`

**Problem**: These utilities are defined but **NOT ACTUALLY USED** in routes!

### Current Route Patterns (Inconsistent)

Routes currently use various response formats:

```typescript
// Pattern 1: Direct data
res.json({ id: '123', status: 'running' });

// Pattern 2: Message + data
res.json({ message: 'Success', settings: {...} });

// Pattern 3: Wrapped in field
res.json({ sessions: [...] });

// Pattern 4: Simple error
res.status(404).json({ error: 'Not found' });

// Pattern 5: Error with details
res.status(400).json({ error: 'Invalid', details: [...] });
```

## New Standardized Format (After Migration)

### New Utilities

**Location**: `src/utils/api-response.ts`
- `createErrorResponse()` - Standardized errors
- `createDataResponse()` - Single resource responses
- `createCollectionResponse()` - Paginated collections

**Location**: `src/middleware/error-handler.ts`
- `createErrorHandler()` - Global error middleware
- `AppError` class - Custom errors
- `asyncHandler()` - Async route wrapper
- Helper throw functions

### Standardized Response Formats

#### 1. Single Resource Response

```typescript
import { createDataResponse } from '../utils/api-response';

// GET /api/workers/123
res.json(createDataResponse(
  worker,
  { message: 'Worker retrieved successfully' },
  { self: `/api/workers/${worker.id}` }
));

// Output:
{
  "data": {
    "id": "123",
    "status": "running",
    ...
  },
  "meta": {
    "timestamp": "2025-10-31T...",
    "message": "Worker retrieved successfully"
  },
  "links": {
    "self": "/api/workers/123"
  }
}
```

#### 2. Collection Response (Paginated)

```typescript
import { createCollectionResponse } from '../utils/api-response';

// GET /api/workers?page=1&perPage=20
const workers = await db.worker.findMany({ skip: 0, take: 20 });
const total = await db.worker.count();

res.json(createCollectionResponse(
  workers,
  total,
  1,
  20,
  '/api/workers'
));

// Output:
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "links": {
    "self": "/api/workers?page=1&perPage=20",
    "first": "/api/workers?page=1&perPage=20",
    "last": "/api/workers?page=5&perPage=20",
    "next": "/api/workers?page=2&perPage=20",
    "prev": null
  }
}
```

#### 3. Error Response

```typescript
import { createErrorResponse, ErrorCode } from '../utils/api-response';

// Validation error
res.status(422).json(createErrorResponse(
  ErrorCode.VALIDATION_ERROR,
  'Request validation failed',
  {
    email: 'Invalid email format',
    age: 'Must be a positive number'
  },
  req.path
));

// Output:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": "Invalid email format",
      "age": "Must be a positive number"
    },
    "timestamp": "2025-10-31T...",
    "path": "/api/tasks"
  }
}
```

#### 4. Using Custom Errors

```typescript
import { AppError, ErrorCode, asyncHandler } from '../middleware/error-handler';
import { createDataResponse } from '../utils/api-response';

router.get('/:id', asyncHandler(async (req, res) => {
  const worker = await workerService.getById(req.params.id);

  if (!worker) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Worker not found');
  }

  res.json(createDataResponse(worker));
}));

// Error automatically handled by global error handler
```

## Migration Steps

### Step 1: Register Global Error Handler

**File**: `src/index.ts`

```typescript
import { createErrorHandler } from './middleware/error-handler';

// ... after all routes ...

// Register global error handler (MUST be last)
app.use(createErrorHandler(logger));
```

### Step 2: Migrate Individual Routes

#### Before:
```typescript
router.get('/:id', async (req, res) => {
  try {
    const worker = await workerService.getById(req.params.id);

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    res.json(worker);
  } catch (error) {
    logger.error('Failed to get worker', error as Error);
    res.status(500).json({ error: 'Failed to get worker' });
  }
});
```

#### After:
```typescript
import { asyncHandler, AppError, ErrorCode } from '../middleware/error-handler';
import { createDataResponse } from '../utils/api-response';

router.get('/:id', asyncHandler(async (req, res) => {
  const worker = await workerService.getById(req.params.id);

  if (!worker) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Worker not found');
  }

  res.json(createDataResponse(worker));
}));
```

**Benefits**:
- ✅ No try-catch needed (asyncHandler handles it)
- ✅ Consistent error format
- ✅ Less code duplication
- ✅ Automatic error logging
- ✅ Standardized response envelope

### Step 3: Migrate Collection Endpoints

#### Before:
```typescript
router.get('/', async (req, res) => {
  try {
    const workers = await db.worker.findMany();
    res.json({ workers });
  } catch (error) {
    logger.error('Failed to get workers', error as Error);
    res.status(500).json({ error: 'Failed to get workers' });
  }
});
```

#### After:
```typescript
import { asyncHandler } from '../middleware/error-handler';
import { createCollectionResponse } from '../utils/api-response';
import { parsePagination } from '../middleware/pagination';

router.get('/', parsePagination, asyncHandler(async (req, res) => {
  const { page, perPage, offset } = req.pagination;

  const [workers, total] = await Promise.all([
    db.worker.findMany({ skip: offset, take: perPage }),
    db.worker.count(),
  ]);

  res.json(createCollectionResponse(workers, total, page, perPage, req.baseUrl));
}));
```

## Migration Checklist

### Phase 1: Foundation (Week 1)
- [x] Create new response utilities (`src/utils/api-response.ts`)
- [x] Create global error handler (`src/middleware/error-handler.ts`)
- [ ] Register global error handler in `src/index.ts`
- [ ] Create pagination middleware
- [ ] Document migration guide

### Phase 2: High-Traffic Routes (Week 2)
- [ ] Migrate `/api/workers` routes
- [ ] Migrate `/api/tasks` routes
- [ ] Migrate `/api/settings` routes
- [ ] Update tests for migrated routes

### Phase 3: Remaining Routes (Week 3)
- [ ] Migrate `/api/analytics` routes
- [ ] Migrate `/api/validation-runs` routes
- [ ] Migrate `/api/orchestrator` routes
- [ ] Migrate remaining routes

### Phase 4: Cleanup (Week 4)
- [ ] Remove old `handleApiError` utility
- [ ] Update all route tests
- [ ] Update API documentation
- [ ] Measure API consistency (should be 100%)

## Backward Compatibility

During migration:
1. **Keep both formats working** - New format is additive
2. **Migrate route-by-route** - No big-bang migration
3. **Update clients gradually** - Both formats work during transition
4. **Deprecate old format** - Add deprecation warnings after full migration

## Testing Migrated Routes

### Unit Tests

```typescript
describe('GET /api/workers/:id', () => {
  it('should return worker with standard response format', async () => {
    const response = await request(app)
      .get('/api/workers/123')
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        id: '123',
        status: 'running',
      },
      meta: {
        timestamp: expect.any(String),
      },
    });
  });

  it('should return standard error format for not found', async () => {
    const response = await request(app)
      .get('/api/workers/nonexistent')
      .expect(404);

    expect(response.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: 'Worker not found',
        timestamp: expect.any(String),
        path: '/api/workers/nonexistent',
      },
    });
  });
});
```

## Helper Functions for Common Errors

```typescript
import {
  throwNotFound,
  throwBadRequest,
  throwConflict,
  throwUnauthorized,
  throwForbidden,
  throwValidationError,
} from '../middleware/error-handler';

// Instead of:
if (!worker) {
  return res.status(404).json({ error: 'Worker not found' });
}

// Use:
if (!worker) {
  throwNotFound('Worker not found');
}

// Automatically throws AppError with correct status and code
// Caught by asyncHandler and processed by global error handler
```

## Common Patterns

### 1. Create Resource
```typescript
router.post('/', asyncHandler(async (req, res) => {
  const worker = await workerService.create(req.body);

  res.status(201).json(
    createDataResponse(
      worker,
      { message: 'Worker created successfully' },
      {
        self: `/api/workers/${worker.id}`,
        logs: `/api/workers/${worker.id}/logs`,
      }
    )
  );
}));
```

### 2. Update Resource
```typescript
router.put('/:id', asyncHandler(async (req, res) => {
  const worker = await workerService.update(req.params.id, req.body);

  if (!worker) {
    throwNotFound(`Worker ${req.params.id} not found`);
  }

  res.json(
    createDataResponse(
      worker,
      { message: 'Worker updated successfully' }
    )
  );
}));
```

### 3. Delete Resource
```typescript
router.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await workerService.delete(req.params.id);

  if (!deleted) {
    throwNotFound(`Worker ${req.params.id} not found`);
  }

  res.status(204).end(); // No content for successful deletion
}));
```

### 4. Validation Errors
```typescript
router.post('/', asyncHandler(async (req, res) => {
  // Validation happens in middleware via validateRequest()
  // If validation fails, ZodError is thrown automatically
  // Global error handler converts it to standard format

  const worker = await workerService.create(req.body);
  res.status(201).json(createDataResponse(worker));
}));
```

## Benefits of New Format

1. **Consistency** - All responses follow the same pattern
2. **Type Safety** - TypeScript types for all responses
3. **Discoverability** - HATEOAS links guide API usage
4. **Pagination** - Built-in pagination metadata
5. **Error Handling** - Machine-readable error codes
6. **Logging** - Centralized error logging
7. **Testing** - Predictable response shapes
8. **Documentation** - Clear API contracts

## FAQ

**Q: Do I need to migrate all routes at once?**
A: No! Migrate route-by-route. Both formats work during transition.

**Q: What about existing clients?**
A: The new format is mostly additive. The `data` field contains what they expect. Clients can gradually upgrade to use `meta` and `links`.

**Q: How do I handle custom errors?**
A: Use `AppError` class or the helper throw functions (`throwNotFound`, etc.)

**Q: What about streaming responses (SSE)?**
A: SSE responses don't use this format. They're event streams, not REST responses.

**Q: Should I use this for health check endpoint?**
A: No. Health checks should stay simple: `{ status: 'ok' }`

## Next Steps

1. Register global error handler in `src/index.ts`
2. Create pagination middleware
3. Start migrating high-traffic routes
4. Update route tests
5. Update API documentation

---

**Version**: 1.0
**Last Updated**: 2025-10-31
