# API Schema Validation Implementation Plan

## Executive Summary

This document outlines a phased approach to implement type-safe API contracts using Zod schemas shared between frontend and backend. This will prevent API mismatches like the recent `startWorker` bug where the backend expected `taskContent` but the frontend didn't send it.

**Timeline:** Phase 1 can be completed in ~2-4 hours
**Risk Level:** Low (incremental, non-breaking changes)
**Expected Impact:** Eliminates entire class of API contract bugs

---

## Problem Statement

### Current State
- Backend routes manually validate request parameters using inline checks
- Frontend API clients use hand-written TypeScript interfaces
- No shared type definitions between frontend and backend
- Changes to API contracts require manual updates in multiple places
- Runtime errors occur when frontend/backend get out of sync

### The Bug We're Fixing
```typescript
// Backend expected:
{ taskId: string, taskContent: string }

// Frontend sent:
{ taskId: string }  // Missing taskContent!

// Result: 400 error at runtime
```

### Desired State
- Single source of truth for API contracts
- Compile-time type checking on frontend
- Runtime validation on backend
- Automatic detection of mismatches
- Easy to maintain and extend

---

## Phase 1: Zod + Shared Types (IMMEDIATE)

### Goals
1. Create shared schema definitions using Zod
2. Add runtime validation to backend routes
3. Update frontend to use typed schemas
4. Prove the concept works end-to-end

### Scope
Focus on `/api/claude-workers/*` endpoints as proof of concept:
- `POST /claude-workers/start` - Start a worker
- `POST /claude-workers/:workerId/stop` - Stop a worker
- `GET /claude-workers/status` - Get workers status
- `POST /claude-workers/:workerId/message` - Send message
- `POST /claude-workers/:workerId/merge` - Merge changes

### Directory Structure
```
src/
  shared/
    schemas/
      api/
        claude-workers.schema.ts    # Worker-related schemas
        tasks.schema.ts              # Task-related schemas
        validation.schema.ts         # Validation-related schemas
        common.schema.ts             # Shared/common schemas
      index.ts                       # Re-export all schemas
  routes/
    claude-workers.ts                # Updated with validation
ui/
  src/
    shared/
      schemas/                       # Symlink to backend schemas
        -> ../../../src/shared/schemas
      lib/
        workers-api.ts               # Updated to use schemas
```

### Implementation Steps

#### Step 1: Set Up Infrastructure (15 min)
- [ ] Create `src/shared/schemas` directory
- [ ] Install any missing dependencies
- [ ] Create symlink from `ui/src/shared/schemas` to backend schemas
- [ ] Create barrel export file (`index.ts`)

#### Step 2: Define Schemas (30 min)
- [ ] Create `common.schema.ts` with shared types (Worker, ValidationRun, etc.)
- [ ] Create `claude-workers.schema.ts` with request/response schemas:
  - `StartWorkerRequestSchema`
  - `StartWorkerResponseSchema`
  - `StopWorkerRequestSchema`
  - `SendMessageRequestSchema`
  - `MergeWorkerRequestSchema`
- [ ] Export all schemas with `z.infer` types

#### Step 3: Backend Integration (45 min)
- [ ] Create validation middleware helper
- [ ] Update `POST /claude-workers/start` with Zod validation
- [ ] Update other critical endpoints
- [ ] Add better error messages for validation failures
- [ ] Test validation with invalid requests

#### Step 4: Frontend Integration (30 min)
- [ ] Update `workers-api.ts` to import and use schemas
- [ ] Update TypeScript interfaces to use inferred types
- [ ] Update function signatures to use schema types
- [ ] Remove duplicate type definitions

#### Step 5: Testing & Verification (30 min)
- [ ] Update backend tests to use schemas
- [ ] Update frontend tests to use schemas
- [ ] Add tests for validation edge cases
- [ ] Manual testing of API endpoints
- [ ] Verify TypeScript compilation catches errors

#### Step 6: Documentation (15 min)
- [ ] Add JSDoc comments to schemas
- [ ] Update README with schema usage examples
- [ ] Document validation error format
- [ ] Add migration guide for other endpoints

---

## Technical Design

### Schema Definition Pattern
```typescript
// src/shared/schemas/api/claude-workers.schema.ts
import { z } from 'zod';

// Request schema with validation rules
export const StartWorkerRequestSchema = z.object({
  taskId: z.string()
    .min(1, 'Task ID is required')
    .describe('Unique identifier for the task'),

  taskContent: z.string()
    .min(1, 'Task content is required')
    .describe('Description of the task to execute'),

  workingDirectory: z.string()
    .optional()
    .describe('Optional working directory path'),
});

// Infer TypeScript type from schema
export type StartWorkerRequest = z.infer<typeof StartWorkerRequestSchema>;

// Response schema
export const WorkerSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  taskContent: z.string(),
  status: z.enum(['starting', 'running', 'completed', 'failed', 'stopped', 'validating']),
  startTime: z.string(),
  endTime: z.string().optional(),
  pid: z.number().optional(),
  logFile: z.string(),
  blockedCommands: z.number(),
  hasPermissionSystem: z.boolean(),
  validationPassed: z.boolean().optional(),
  validationRuns: z.number().optional(),
});

export type Worker = z.infer<typeof WorkerSchema>;
```

### Backend Validation Pattern
```typescript
// src/shared/middleware/validate.ts
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validateRequest<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

// Usage in route
router.post('/start',
  validateRequest(StartWorkerRequestSchema),
  async (req, res) => {
    // req.body is now typed and validated!
    const { taskId, taskContent, workingDirectory } = req.body;
    // ...
  }
);
```

### Frontend Type Safety Pattern
```typescript
// ui/src/shared/lib/workers-api.ts
import { StartWorkerRequest, Worker } from '@/shared/schemas';

export const claudeWorkersApi = {
  // TypeScript now enforces all required fields!
  async startWorker(request: StartWorkerRequest): Promise<Worker> {
    return apiRequest<Worker>('/claude-workers/start', {
      method: 'POST',
      body: request, // Type-checked at compile time
    });
  },
};

// Usage - TypeScript error if missing fields!
await claudeWorkersApi.startWorker({
  taskId: 'task-1',
  taskContent: 'Do something', // Required - compiler error if missing!
  // workingDirectory is optional
});
```

---

## Phase 2: OpenAPI Generation (FUTURE)

### Goals
- Auto-generate OpenAPI 3.0 specification
- Set up Swagger UI for API documentation
- Optionally generate type-safe client

### Dependencies to Add
```json
{
  "@asteasolutions/zod-to-openapi": "^7.0.0",
  "swagger-ui-express": "^5.0.0"
}
```

### Implementation
1. Annotate Zod schemas with OpenAPI metadata
2. Create OpenAPI spec generator script
3. Set up Swagger UI endpoint at `/api-docs`
4. Integrate into build pipeline
5. Consider client code generation

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All claude-workers endpoints use Zod validation
- ✅ Frontend API client uses inferred types
- ✅ Tests pass with new schemas
- ✅ TypeScript compilation fails for invalid API calls
- ✅ Invalid API requests return detailed validation errors
- ✅ Documentation exists for adding new schemas

### Metrics to Track:
- Number of endpoints with schema validation (target: 100%)
- API validation errors caught (should increase initially, then stabilize)
- TypeScript compilation errors for API mismatches (good thing!)
- Time to add validation to new endpoint (should be < 10 minutes)

---

## Rollout Strategy

### Week 1: Proof of Concept
- Implement schemas for claude-workers endpoints
- Validate approach works end-to-end
- Get team feedback
- Document patterns

### Week 2-3: Gradual Migration
- Add schemas for other endpoint groups:
  - Tasks API (`/api/tasks/*`)
  - Analytics API (`/api/analytics/*`)
  - Settings API (`/api/settings/*`)
  - Orchestrator API (`/api/orchestrator/*`)
- Update tests as we go
- No breaking changes to API

### Week 4: OpenAPI Layer (Optional)
- Evaluate if OpenAPI generation is needed
- If yes, implement Phase 2
- If no, consider alternative documentation approaches

---

## Risk Mitigation

### Risk: Breaking Existing Code
**Mitigation:**
- Make changes incrementally, one endpoint at a time
- Run full test suite after each change
- Keep old validation in place until schemas tested
- Add schemas alongside existing code first

### Risk: Performance Impact
**Mitigation:**
- Zod is very fast (~1ms per validation)
- Can cache compiled schemas
- Only validate on API boundaries, not internal functions
- Monitor response times

### Risk: Learning Curve
**Mitigation:**
- Start with simple schemas
- Provide clear examples and documentation
- Pair programming sessions for first few schemas
- Create templates for common patterns

### Risk: Frontend Build Complexity
**Mitigation:**
- Use symlinks instead of complex monorepo setup
- Keep schemas in plain TypeScript (no build step needed)
- Fallback: npm link or workspace setup if symlinks don't work
- Document setup process clearly

---

## Alternative Approaches Considered

### 1. TSOA (Decorators + Code Generation)
**Pros:** Full end-to-end type safety, auto-generates everything
**Cons:** Requires class-based controllers, steeper learning curve
**Decision:** Save for future if we want to completely restructure

### 2. GraphQL
**Pros:** Schema-first by design, amazing tooling
**Cons:** Major rewrite, probably overkill for REST API
**Decision:** Not appropriate for this project

### 3. tRPC
**Pros:** End-to-end type safety with minimal boilerplate
**Cons:** Requires buy-in to tRPC ecosystem, works best with Next.js
**Decision:** Too opinionated for Express backend

### 4. Manual TypeScript Interfaces
**Pros:** Simple, no dependencies
**Cons:** No runtime validation, easy to drift
**Decision:** This is what we have now - not sufficient

---

## Appendix: Example Schemas

### Common Types
```typescript
// src/shared/schemas/common.schema.ts
import { z } from 'zod';

export const WorkerStatusSchema = z.enum([
  'starting',
  'running',
  'completed',
  'failed',
  'stopped',
  'validating',
]);

export const ValidationStageSchema = z.object({
  name: z.string(),
  command: z.string(),
  status: z.enum(['pending', 'running', 'passed', 'failed', 'skipped']),
  duration: z.number().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
});

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });
```

All validation stage payloads must reference a `stage_id` that exists in `ValidationStageConfig`, so runtime reports stay in sync with the configured pipeline.

### Complete Endpoint Schema
```typescript
// src/shared/schemas/api/claude-workers.schema.ts
import { z } from 'zod';
import { WorkerStatusSchema } from '../common.schema';

// POST /claude-workers/start
export const StartWorkerRequestSchema = z.object({
  taskId: z.string().min(1),
  taskContent: z.string().min(1),
  workingDirectory: z.string().optional(),
});

export const StartWorkerResponseSchema = z.object({
  workerId: z.string(),
  taskId: z.string(),
  status: WorkerStatusSchema,
  pid: z.number().optional(),
  logFile: z.string(),
  startTime: z.string().datetime(),
});

// POST /claude-workers/:workerId/message
export const SendMessageRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
});

export const SendMessageResponseSchema = z.object({
  workerId: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
  status: z.literal('sent'),
});

// Export inferred types
export type StartWorkerRequest = z.infer<typeof StartWorkerRequestSchema>;
export type StartWorkerResponse = z.infer<typeof StartWorkerResponseSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
```

---

## Next Steps

1. **Review this plan** with the team
2. **Get approval** to proceed with Phase 1
3. **Start implementation** following the steps above
4. **Iterate and improve** based on learnings
5. **Scale to all endpoints** once pattern is proven

---

## Questions & Answers

**Q: Why Zod instead of other validation libraries?**
A: Zod is TypeScript-first, has great error messages, is widely adopted, and you already have it installed.

**Q: Why not just use TypeScript interfaces?**
A: TypeScript types are erased at runtime - they don't provide runtime validation. Zod gives us both.

**Q: Will this slow down API requests?**
A: No meaningful impact. Zod validation adds ~0.5-1ms per request. The network latency is 100x that.

**Q: Can we add schemas gradually?**
A: Yes! That's the whole point. Start with critical endpoints, expand over time.

**Q: What if schemas get out of sync with implementation?**
A: That's literally impossible - the schema IS the contract. If it's in the schema, it's validated. If it's not, it won't pass validation.

**Q: How do we handle breaking changes?**
A: Version the schemas (v1, v2) or make changes backward-compatible (add optional fields, don't remove required ones without coordination).

---

*Document created: 2025-10-30*
*Author: Claude + Rustam*
*Status: READY FOR IMPLEMENTATION*
