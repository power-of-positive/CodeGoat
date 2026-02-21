# Claude Workers API Migration Plan

**Status**: Phase 2 - Route Migration
**Priority**: High (Most Complex API)
**Estimated Effort**: 3-4 days
**Date**: 2025-10-31

---

## Current State Analysis

### File: `src/routes/claude-workers.ts`
- **Size**: 1,850 lines
- **Complexity**: High (worker lifecycle management, git worktrees, validation)
- **Mount Point**: `/api/claude-workers`
- **Total Endpoints**: 19 endpoints

### Current Endpoint Inventory

| Method | Current Endpoint | Issue | Proposed Endpoint | Priority |
|--------|-----------------|-------|------------------|----------|
| `POST` | `/start` | Action verb | `POST /` | P0 |
| `GET` | `/status` | Should be root | `GET /` | P0 |
| `GET` | `/:workerId` | ✅ Good | Keep as-is | - |
| `POST` | `/stop-all` | Action verb | `DELETE /?all=true` | P0 |
| `POST` | `/clear` | Action verb | `DELETE /?status=completed` | P0 |
| `POST` | `/:workerId/stop` | Action verb | `DELETE /:workerId` | P0 |
| `GET` | `/:workerId/logs` | ✅ Good | Keep as-is | - |
| `POST` | `/:workerId/logs/stream` | Should be GET | `GET /:workerId/logs?stream=true` | P1 |
| `GET` | `/:workerId/entries` | ✅ Good | Keep as-is | - |
| `POST` | `/cleanup-worktrees` | Action verb | `DELETE /worktrees` | P1 |
| `POST` | `/:workerId/validate-custom` | Action verb | `POST /:workerId/validations` | P2 |
| `POST` | `/:workerId/open-vscode` | Action verb | External action, maybe OK | P3 |
| `GET` | `/:workerId/blocked-commands` | ✅ Good | Keep as-is | - |
| `GET` | `/:workerId/command-stats` | ✅ Good | Keep as-is | - |
| `GET` | `/:workerId/validation-results` | ✅ Good | Keep as-is | - |
| `GET` | `/logs/stats` | ✅ Good | Keep as-is | - |
| `POST` | `/logs/cleanup` | Action verb | `DELETE /logs?before=date` | P2 |
| `GET` | `/:workerId/enhanced-logs` | Query param | `GET /:workerId/logs?enhanced=true` | P2 |
| `POST` | `/:workerId/terminate-with-validation` | Action verb | Part of DELETE | P2 |
| `POST` | `/:workerId/interrupt` | Action verb | `DELETE /:workerId?force=true` | P2 |

### Key Issues

1. **Action-based URLs**: 10+ endpoints use action verbs
2. **No Response Standardization**: Direct JSON responses
3. **No Pagination**: List endpoints return all workers
4. **No Error Handling**: Try-catch in every handler
5. **Mixed Concerns**: Massive file with everything together

---

## Migration Strategy

### Option A: Gradual In-Place Migration (Recommended)

**Pros**:
- Minimal disruption
- Can test incrementally
- Maintain backwards compatibility

**Cons**:
- File stays large
- Two patterns coexist temporarily

**Approach**:
1. Add new response utilities to existing handlers
2. Keep old URLs but deprecate with headers
3. Add new RESTful URLs alongside old ones
4. Migrate clients gradually
5. Remove old URLs in v2

### Option B: Create New v1/workers.ts

**Pros**:
- Clean slate
- Modern patterns from start
- Easier to review

**Cons**:
- Big-bang migration
- Risk of missing edge cases
- Breaking change for clients

**Approach**:
1. Create `src/routes/v1/workers.ts`
2. Implement RESTful design
3. Use all new utilities
4. Keep old route as alias
5. Deprecate old route

### Option C: Hybrid Approach (Recommended)

**Pros**:
- Best of both worlds
- Clear migration path
- Testable

**Cons**:
- More work upfront
- Need to maintain both temporarily

**Approach**:
1. Extract worker business logic to service layer
2. Create slim route handlers using new utilities
3. Create new endpoints alongside old ones
4. Add deprecation warnings to old endpoints
5. Migrate clients endpoint by endpoint
6. Remove old endpoints in v2

---

## Recommended Approach: Hybrid

### Phase 2.1: Extract Business Logic (Day 1)

**Goal**: Separate concerns, create service layer

1. **Create WorkerService** (`src/services/worker.service.ts`)
   ```typescript
   export class WorkerService {
     // All worker business logic extracted here
     async createWorker(taskId: string, taskContent: string): Promise<ClaudeWorker>
     async getWorker(workerId: string): Promise<ClaudeWorker | null>
     async listWorkers(): Promise<ClaudeWorker[]>
     async stopWorker(workerId: string): Promise<ClaudeWorker>
     async stopAllWorkers(): Promise<{ stopped: string[]; count: number }>
     // ... etc
   }
   ```

2. **Benefits**:
   - Testable business logic
   - Reusable across routes
   - Easier to maintain

**Estimated Effort**: 4-6 hours

### Phase 2.2: Create New Route Handlers (Day 2)

**Goal**: Create RESTful endpoints using new utilities

1. **Create slim route file** (`src/routes/claude-workers-v2.ts` or refactor existing)

2. **Migrate core CRUD operations first**:
   ```typescript
   // New RESTful endpoints
   POST   /api/workers              // Create worker (was POST /start)
   GET    /api/workers              // List workers (was GET /status)
   GET    /api/workers/:id          // Get worker (unchanged)
   DELETE /api/workers/:id          // Stop worker (was POST /:id/stop)
   DELETE /api/workers              // Bulk operations (was POST /stop-all, /clear)
   ```

3. **Use new utilities**:
   ```typescript
   import { asyncHandler, throwNotFound } from '../middleware/error-handler';
   import { createDataResponse, createCollectionResponse } from '../utils/api-response';
   import { parsePagination } from '../middleware/pagination';

   router.post('/', asyncHandler(async (req, res) => {
     const worker = await workerService.createWorker(req.body.taskId, req.body.taskContent);
     res.status(201).json(
       createDataResponse(worker,
         { message: 'Worker created and started' },
         { self: `/api/workers/${worker.id}`, logs: `/api/workers/${worker.id}/logs` }
       )
     );
   }));

   router.get('/', parsePagination, asyncHandler(async (req, res) => {
     const { page, perPage, offset } = req.pagination;
     const [workers, total] = await Promise.all([
       workerService.listWorkers(offset, perPage),
       workerService.countWorkers()
     ]);
     res.json(createCollectionResponse(workers, total, page, perPage, req.baseUrl));
   }));

   router.delete('/:id', asyncHandler(async (req, res) => {
     const worker = await workerService.stopWorker(req.params.id);
     if (!worker) throwNotFound(`Worker ${req.params.id} not found`);
     res.json(createDataResponse(worker, { message: 'Worker stopped' }));
   }));
   ```

**Estimated Effort**: 6-8 hours

### Phase 2.3: Add Backward Compatibility Aliases (Day 3)

**Goal**: Keep old endpoints working with deprecation warnings

1. **Add deprecation middleware**:
   ```typescript
   function deprecated(newEndpoint: string) {
     return (req: Request, res: Response, next: NextFunction) => {
       res.setHeader('Deprecation', 'true');
       res.setHeader('Sunset', '2026-01-31');
       res.setHeader('Link', `<${newEndpoint}>; rel="successor-version"`);
       next();
     };
   }
   ```

2. **Create aliases for old endpoints**:
   ```typescript
   // Old endpoint redirects to new logic
   router.post('/start', deprecated('/api/workers'), asyncHandler(async (req, res) => {
     const worker = await workerService.createWorker(req.body.taskId, req.body.taskContent);
     // Old response format for compatibility
     res.status(201).json({
       workerId: worker.id,
       status: 'started',
       message: 'Worker started successfully'
     });
   }));

   router.post('/:workerId/stop', deprecated('/api/workers/:id'), asyncHandler(async (req, res) => {
     const worker = await workerService.stopWorker(req.params.workerId);
     if (!worker) throwNotFound(`Worker not found`);
     // Old response format
     res.json({ message: 'Worker stopped successfully', workerId: worker.id });
   }));
   ```

3. **Log deprecation warnings**:
   ```typescript
   logger.warn('Deprecated endpoint used', {
     oldEndpoint: req.path,
     newEndpoint: res.getHeader('Link'),
     clientIP: req.ip
   });
   ```

**Estimated Effort**: 3-4 hours

### Phase 2.4: Update Tests (Day 3-4)

**Goal**: Comprehensive test coverage for new endpoints

1. **Unit tests for WorkerService**
2. **Integration tests for new endpoints**
3. **Backward compatibility tests**
4. **Update existing E2E tests**

**Estimated Effort**: 4-6 hours

### Phase 2.5: Update Documentation & Clients (Day 4)

**Goal**: Complete migration

1. **Update API documentation**
2. **Update UI client code**
3. **Add migration guide**
4. **Announce deprecation**

**Estimated Effort**: 2-3 hours

---

## Detailed Example: Migrating POST /start

### Current Implementation (Simplified)

```typescript
router.post('/start', validateRequest(StartWorkerRequestSchema), async (req, res) => {
  try {
    const { taskId, taskContent } = req.body;

    // Validation
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Business logic (100+ lines)
    const workerId = generateWorkerId();
    const logFile = path.join(logsDir, `worker-${workerId}.log`);
    const worktree = await worktreeManager.createWorktree(workerId);
    const process = spawn('claude', ['--prompt', taskContent], { cwd: worktree });

    // Store worker
    const worker = {
      id: workerId,
      taskId,
      taskContent,
      process,
      status: 'running',
      startTime: new Date(),
      logFile,
      // ... many more fields
    };
    activeWorkers.set(workerId, worker);

    res.status(201).json({
      workerId,
      status: 'started',
      message: 'Worker started successfully'
    });
  } catch (error) {
    console.error('Failed to start worker:', error);
    res.status(500).json({ error: 'Failed to start worker' });
  }
});
```

**Issues**:
- Try-catch boilerplate
- Business logic in route handler
- Inconsistent response format
- Error handling duplicated
- No response envelope
- Action-based URL

### New Implementation (Service + Route)

#### 1. Service Layer (`src/services/worker.service.ts`)

```typescript
import { ClaudeWorker } from '../types';
import { WorktreeManager } from '../utils/worktree-manager';
import { AppError, ErrorCode } from '../middleware/error-handler';

export class WorkerService {
  private activeWorkers = new Map<string, ClaudeWorker>();
  private worktreeManager = new WorktreeManager();

  async createWorker(taskId: string, taskContent: string): Promise<ClaudeWorker> {
    // Validate
    if (!taskId) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Task ID is required');
    }

    // Generate ID
    const workerId = this.generateWorkerId();

    // Create worktree
    const worktree = await this.worktreeManager.createWorktree(workerId);

    // Create log file
    const logFile = path.join(logsDir, `worker-${workerId}.log`);

    // Spawn process
    const process = spawn('claude', ['--prompt', taskContent], { cwd: worktree });

    // Create worker object
    const worker: ClaudeWorker = {
      id: workerId,
      taskId,
      taskContent,
      process,
      status: 'running',
      startTime: new Date(),
      logFile,
      pid: process.pid,
      blockedCommands: 0,
      blockedCommandsList: [],
      structuredEntries: [],
      // ... all fields
    };

    // Store
    this.activeWorkers.set(workerId, worker);

    // Set up event handlers
    this.setupWorkerHandlers(worker);

    return worker;
  }

  async getWorker(workerId: string): Promise<ClaudeWorker | null> {
    return this.activeWorkers.get(workerId) || null;
  }

  async listWorkers(offset = 0, limit = 20): Promise<ClaudeWorker[]> {
    const workers = Array.from(this.activeWorkers.values());
    return workers.slice(offset, offset + limit);
  }

  async countWorkers(): Promise<number> {
    return this.activeWorkers.size;
  }

  async stopWorker(workerId: string): Promise<ClaudeWorker | null> {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) return null;

    // Stop process
    if (worker.process) {
      worker.process.kill('SIGTERM');
    }

    // Update status
    worker.status = 'stopped';
    worker.endTime = new Date();

    // Cleanup worktree
    if (worker.worktreePath) {
      await this.worktreeManager.removeWorktree(worker.worktreePath);
    }

    // Remove from active workers
    this.activeWorkers.delete(workerId);

    return worker;
  }

  private generateWorkerId(): string {
    return `worker-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private setupWorkerHandlers(worker: ClaudeWorker): void {
    // Event handlers for process stdout, stderr, exit, etc.
    // ... implementation
  }
}
```

#### 2. Route Layer (`src/routes/claude-workers-v2.ts`)

```typescript
import express from 'express';
import { WorkerService } from '../services/worker.service';
import { asyncHandler, throwNotFound } from '../middleware/error-handler';
import { createDataResponse, createCollectionResponse } from '../utils/api-response';
import { parsePagination } from '../middleware/pagination';
import { validateRequest, validateParams } from '../middleware/validate';
import { StartWorkerRequestSchema } from '../shared/schemas';

const router = express.Router();
const workerService = new WorkerService();

/**
 * @openapi
 * /workers:
 *   post:
 *     summary: Create a new worker
 *     description: Creates and starts a new Claude worker for task execution
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId, taskContent]
 *             properties:
 *               taskId:
 *                 type: string
 *               taskContent:
 *                 type: string
 *     responses:
 *       201:
 *         description: Worker created successfully
 */
router.post(
  '/',
  validateRequest(StartWorkerRequestSchema),
  asyncHandler(async (req, res) => {
    const { taskId, taskContent } = req.body;

    const worker = await workerService.createWorker(taskId, taskContent);

    res.status(201).json(
      createDataResponse(
        worker,
        { message: 'Worker created and started successfully' },
        {
          self: `/api/workers/${worker.id}`,
          logs: `/api/workers/${worker.id}/logs`,
          stop: `/api/workers/${worker.id}`,
        }
      )
    );
  })
);

/**
 * @openapi
 * /workers:
 *   get:
 *     summary: List all workers
 *     description: Get paginated list of all active workers
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workers list
 */
router.get(
  '/',
  parsePagination,
  asyncHandler(async (req, res) => {
    const { page, perPage, offset } = req.pagination;

    const [workers, total] = await Promise.all([
      workerService.listWorkers(offset, perPage),
      workerService.countWorkers(),
    ]);

    res.json(createCollectionResponse(workers, total, page, perPage, req.baseUrl));
  })
);

/**
 * @openapi
 * /workers/{workerId}:
 *   get:
 *     summary: Get worker details
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Worker details
 *       404:
 *         description: Worker not found
 */
router.get(
  '/:workerId',
  validateParams(GetWorkerParamsSchema),
  asyncHandler(async (req, res) => {
    const worker = await workerService.getWorker(req.params.workerId);

    if (!worker) {
      throwNotFound(`Worker ${req.params.workerId} not found`);
    }

    res.json(
      createDataResponse(worker, undefined, {
        self: `/api/workers/${worker.id}`,
        logs: `/api/workers/${worker.id}/logs`,
        entries: `/api/workers/${worker.id}/entries`,
        blockedCommands: `/api/workers/${worker.id}/blocked-commands`,
      })
    );
  })
);

/**
 * @openapi
 * /workers/{workerId}:
 *   delete:
 *     summary: Stop and remove a worker
 *     description: Gracefully stops the worker and cleans up resources
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Worker stopped successfully
 *       404:
 *         description: Worker not found
 */
router.delete(
  '/:workerId',
  validateParams(GetWorkerParamsSchema),
  asyncHandler(async (req, res) => {
    const worker = await workerService.stopWorker(req.params.workerId);

    if (!worker) {
      throwNotFound(`Worker ${req.params.workerId} not found`);
    }

    res.json(
      createDataResponse(worker, {
        message: 'Worker stopped and removed successfully',
      })
    );
  })
);

/**
 * @openapi
 * /workers:
 *   delete:
 *     summary: Bulk stop workers
 *     description: Stop multiple workers based on filters
 *     parameters:
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, failed, stopped]
 *     responses:
 *       200:
 *         description: Workers stopped
 */
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    let result;

    if (req.query.all === 'true') {
      result = await workerService.stopAllWorkers();
    } else if (req.query.status) {
      result = await workerService.stopWorkersByStatus(req.query.status as string);
    } else {
      throw new AppError(
        400,
        ErrorCode.BAD_REQUEST,
        'Must specify either all=true or status filter'
      );
    }

    res.json(
      createDataResponse(result, {
        message: `Stopped ${result.count} worker(s)`,
      })
    );
  })
);

export default router;
```

#### 3. Backward Compatibility (`src/routes/claude-workers.ts`)

```typescript
// Add at end of existing file

// ========================================
// DEPRECATED ENDPOINTS - Use /api/workers
// ========================================

function deprecated(newEndpoint: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', '2026-01-31');
    res.setHeader('Link', `<${newEndpoint}>; rel="successor-version"`);
    logger.warn('Deprecated endpoint used', {
      oldEndpoint: req.path,
      newEndpoint,
      clientIP: req.ip,
    });
    next();
  };
}

// Redirect old /start to new POST /
router.post('/start-v2', deprecated('/api/workers'), validateRequest(StartWorkerRequestSchema), async (req, res) => {
  const worker = await workerService.createWorker(req.body.taskId, req.body.taskContent);
  // OLD response format for compatibility
  res.status(201).json({
    workerId: worker.id,
    status: 'started',
    message: 'Worker started successfully',
  });
});

// More aliases...
```

**Benefits**:
- ✅ Clean separation of concerns
- ✅ Testable business logic
- ✅ Consistent error handling
- ✅ Standard response format
- ✅ Pagination built-in
- ✅ RESTful URLs
- ✅ Backward compatibility
- ✅ OpenAPI documentation
- ✅ HATEOAS links
- ✅ No try-catch boilerplate

---

## Testing Strategy

### Unit Tests

```typescript
// tests/services/worker.service.test.ts
describe('WorkerService', () => {
  let service: WorkerService;

  beforeEach(() => {
    service = new WorkerService();
  });

  describe('createWorker', () => {
    it('should create worker with valid inputs', async () => {
      const worker = await service.createWorker('TASK-001', 'Test task');
      expect(worker.id).toBeDefined();
      expect(worker.status).toBe('running');
    });

    it('should throw validation error for missing taskId', async () => {
      await expect(service.createWorker('', 'Test')).rejects.toThrow('Task ID is required');
    });
  });

  // More tests...
});
```

### Integration Tests

```typescript
// tests/routes/workers.test.ts
describe('POST /api/workers', () => {
  it('should create worker with standard response format', async () => {
    const response = await request(app)
      .post('/api/workers')
      .send({ taskId: 'TASK-001', taskContent: 'Test' })
      .expect(201);

    expect(response.body).toMatchObject({
      data: {
        id: expect.any(String),
        status: 'running',
      },
      meta: {
        message: expect.any(String),
        timestamp: expect.any(String),
      },
      links: {
        self: expect.stringContaining('/api/workers/'),
        logs: expect.stringContaining('/logs'),
      },
    });
  });
});
```

---

## Migration Checklist

### Day 1: Service Layer
- [ ] Create `src/services/worker.service.ts`
- [ ] Extract `createWorker()` business logic
- [ ] Extract `getWorker()` business logic
- [ ] Extract `listWorkers()` business logic
- [ ] Extract `stopWorker()` business logic
- [ ] Extract `stopAllWorkers()` business logic
- [ ] Write unit tests for service
- [ ] Verify all tests pass

### Day 2: New Routes
- [ ] Create `src/routes/claude-workers-v2.ts` (or refactor existing)
- [ ] Implement `POST /` - Create worker
- [ ] Implement `GET /` - List workers
- [ ] Implement `GET /:id` - Get worker
- [ ] Implement `DELETE /:id` - Stop worker
- [ ] Implement `DELETE /` - Bulk operations
- [ ] Add pagination to list endpoint
- [ ] Write integration tests
- [ ] Verify all tests pass

### Day 3: Backward Compatibility
- [ ] Add deprecation middleware
- [ ] Create aliases for old endpoints
- [ ] Add deprecation headers
- [ ] Log deprecation warnings
- [ ] Test old endpoints still work
- [ ] Update deprecation documentation

### Day 4: Documentation & Polish
- [ ] Update API documentation
- [ ] Add OpenAPI annotations
- [ ] Update client code (UI)
- [ ] Run E2E tests
- [ ] Performance testing
- [ ] Code review
- [ ] Merge and deploy

---

## Rollback Plan

If migration fails:
1. **Revert route changes** - Old endpoints still work
2. **Keep service layer** - Still useful for testing
3. **Document learnings** - What went wrong?
4. **Adjust plan** - Try smaller scope

---

## Success Metrics

- ✅ All tests passing
- ✅ Zero breaking changes
- ✅ API consistency score > 80%
- ✅ Response time < 100ms
- ✅ Error rate < 1%
- ✅ Code coverage > 85%

---

## Next Steps

1. **Review this plan** with team
2. **Get approval** for breaking changes
3. **Schedule work** (4 days)
4. **Start with Day 1** - Service extraction
5. **Review after each day**
6. **Iterate based on learnings**

---

**Status**: Ready to begin
**Owner**: Development Team
**Timeline**: 4 days
