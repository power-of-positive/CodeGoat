# API Design Review and Recommendations

**CodeGoat AI Proxy Server**
**Review Date**: 2025-10-31
**Version**: 1.0.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current API Endpoints](#current-api-endpoints)
3. [Design Pattern Analysis](#design-pattern-analysis)
4. [Identified Issues](#identified-issues)
5. [Recommendations](#recommendations)
6. [Proposed Improvements with Examples](#proposed-improvements-with-examples)
7. [Migration Strategy](#migration-strategy)
8. [References](#references)

---

## Executive Summary

### Overall Assessment

The CodeGoat API demonstrates **good separation of concerns** with well-organized route modules, **consistent error handling**, and **proper validation middleware**. However, there are several areas where adherence to REST principles and API design best practices could be improved.

### Key Strengths ✅

- **Modular route organization** - Clear separation by domain (settings, tasks, analytics, etc.)
- **Zod validation** - Strong type validation with `validateRequest`, `validateParams`, `validateQuery` middleware
- **Consistent error handling** - HTTP status codes defined as constants
- **Structured responses** - JSON responses with clear success/error formats

### Key Weaknesses ⚠️

- **Inconsistent REST principles** - Mixing of RESTful and RPC-style endpoints
- **Nested resource inconsistencies** - Irregular patterns for sub-resources
- **No API versioning** - No strategy for breaking changes
- **Action-based URLs** - Some endpoints use verbs in URLs (anti-pattern)
- **Mixed naming conventions** - Inconsistency between kebab-case and camelCase in URLs

### Impact Rating

| Category | Current Score | Target Score |
|----------|--------------|--------------|
| REST Compliance | 6/10 | 9/10 |
| Consistency | 7/10 | 9/10 |
| Maintainability | 8/10 | 9/10 |
| Developer Experience | 7/10 | 9/10 |
| Scalability | 7/10 | 9/10 |

---

## Current API Endpoints

### 1. Settings API (`/api/settings`)

**Purpose**: Manage application configuration, fallback settings, and validation stages.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/settings` | Get all settings | ✅ Good |
| `PUT` | `/api/settings` | Update settings | ✅ Good |
| `GET` | `/api/settings/fallback` | Get fallback settings | ✅ Good |
| `PUT` | `/api/settings/fallback` | Update fallback | ✅ Good |
| `GET` | `/api/settings/validation` | Get validation settings | ✅ Good |
| `PUT` | `/api/settings/validation` | Update validation | ✅ Good |
| `GET` | `/api/settings/validation/stages` | List validation stages | ✅ Good |
| `POST` | `/api/settings/validation/stages` | Add validation stage | ✅ Good |
| `GET` | `/api/settings/validation/stages/:id` | Get stage by ID | ✅ Good |
| `PUT` | `/api/settings/validation/stages/:id` | Update stage | ✅ Good |
| `DELETE` | `/api/settings/validation/stages/:id` | Remove stage | ✅ Good |

**Assessment**: ✅ **Excellent** - This API follows REST principles well. Proper use of HTTP methods, logical resource nesting, and clear hierarchy.

---

### 2. Tasks API (`/api/tasks`)

**Purpose**: Manage todo tasks and BDD scenarios.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/tasks` | List all tasks | ✅ Good |
| `GET` | `/api/tasks/analytics` | Get task analytics | ⚠️ Should be `/api/analytics/tasks` |
| `GET` | `/api/tasks/:id` | Get task by ID | ✅ Good |
| `POST` | `/api/tasks` | Create task | ✅ Good |
| `PUT` | `/api/tasks/:id` | Update task | ✅ Good |
| `DELETE` | `/api/tasks/:id` | Delete task | ✅ Good |
| `POST` | `/api/tasks/:id/scenarios` | Create scenario | ✅ Good nesting |
| `PUT` | `/api/tasks/:id/scenarios/:scenarioId` | Update scenario | ✅ Good nesting |
| `DELETE` | `/api/tasks/:id/scenarios/:scenarioId` | Delete scenario | ✅ Good nesting |
| `GET` | `/api/tasks/:id/executions` | Get executions | ✅ Good nesting |
| `POST` | `/api/tasks/:id/scenarios/:scenarioId/execute` | Execute scenario | ⚠️ Action in URL |
| `GET` | `/api/tasks/:id/scenarios/:scenarioId/analytics` | Get analytics | ⚠️ Inconsistent nesting |

**Assessment**: ⚠️ **Good with Issues** - Mostly RESTful but has action-based endpoints (`/execute`) and analytics endpoints mixed in resources.

**Pros**:
- Proper resource nesting for scenarios under tasks
- Clear CRUD operations

**Cons**:
- `/analytics` endpoint mixed with CRUD operations
- Action verb `/execute` in URL (should use POST to a resource)

---

### 3. Analytics API (`/api/analytics`)

**Purpose**: Track validation sessions and metrics.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/analytics` | Get analytics overview | ✅ Good |
| `GET` | `/api/analytics/sessions` | List recent sessions | ✅ Good |
| `GET` | `/api/analytics/sessions/:sessionId` | Get session details | ✅ Good |
| `POST` | `/api/analytics/sessions` | Start session | ✅ Good (implicit start) |
| `PUT` | `/api/analytics/sessions/:sessionId` | End session | ⚠️ Uses PUT for action |
| `POST` | `/api/analytics/sessions/:sessionId/attempts` | Record attempt | ✅ Good nesting |
| `DELETE` | `/api/analytics/sessions` | Cleanup old sessions | ⚠️ DELETE without ID |
| `GET` | `/api/analytics/stages/:stageId/history` | Get stage history | ✅ Good |
| `GET` | `/api/analytics/stages/:stageId/statistics` | Get stage stats | ✅ Good |
| `GET` | `/api/analytics/validation/runs` | List validation runs | ✅ Good |
| `GET` | `/api/analytics/validation/statistics` | Get validation stats | ✅ Good |
| `GET` | `/api/analytics/validation-metrics` | Get validation metrics | ⚠️ Inconsistent naming |

**Assessment**: ⚠️ **Good with Issues** - Mostly good structure but inconsistent patterns.

**Pros**:
- Good use of sub-resources (sessions, attempts, stages)
- Logical grouping of related endpoints

**Cons**:
- `PUT` used to "end" session (should be POST to a sub-resource like `/sessions/:id/completions`)
- `DELETE /sessions` without ID for cleanup (should be POST to `/sessions/cleanup` or use query params)
- Inconsistent naming: `validation-metrics` vs `validation/metrics`

---

### 4. Claude Workers API (`/api/claude-workers`)

**Purpose**: Manage Claude worker processes for automated task execution.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `POST` | `/api/claude-workers/start` | Start new worker | ⚠️ Action in URL |
| `GET` | `/api/claude-workers/status` | Get all workers status | ⚠️ Should be GET / |
| `GET` | `/api/claude-workers/:workerId` | Get worker details | ✅ Good |
| `POST` | `/api/claude-workers/stop-all` | Stop all workers | ⚠️ Action in URL |
| `POST` | `/api/claude-workers/clear` | Clear worker history | ⚠️ Action in URL |
| `POST` | `/api/claude-workers/:workerId/stop` | Stop worker | ⚠️ Action in URL |
| `GET` | `/api/claude-workers/:workerId/logs` | Get worker logs | ✅ Good nesting |
| `POST` | `/api/claude-workers/:workerId/logs/stream` | Stream logs (SSE) | ⚠️ Should be GET |
| `GET` | `/api/claude-workers/:workerId/entries` | Get log entries | ⚠️ Ambiguous name |
| `POST` | `/api/claude-workers/cleanup-worktrees` | Cleanup git worktrees | ⚠️ Action in URL |
| `POST` | `/api/claude-workers/:workerId/validate-custom` | Custom validation | ⚠️ Action in URL |
| `POST` | `/api/claude-workers/:workerId/open-vscode` | Open VS Code | ⚠️ Action in URL |
| `GET` | `/api/claude-workers/:workerId/blocked-commands` | Get blocked commands | ✅ Good nesting |
| `GET` | `/api/claude-workers/:workerId/command-stats` | Get command stats | ✅ Good nesting |
| `GET` | `/api/claude-workers/:workerId/validation-results` | Get validation results | ✅ Good nesting |
| `GET` | `/api/claude-workers/logs/stats` | Get log statistics | ⚠️ Inconsistent nesting |
| `POST` | `/api/claude-workers/logs/cleanup` | Cleanup logs | ⚠️ Action in URL |
| `GET` | `/api/claude-workers/:workerId/enhanced-logs` | Get enhanced logs | ⚠️ vs regular logs? |
| `POST` | `/api/claude-workers/:workerId/terminate-with-validation` | Terminate worker | ⚠️ Very long action URL |
| `POST` | `/api/claude-workers/:workerId/interrupt` | Interrupt worker | ⚠️ Action in URL |

**Assessment**: ❌ **Needs Improvement** - Heavy use of action-based URLs, inconsistent patterns, mixing of concerns.

**Pros**:
- Good nesting for worker-specific resources (logs, commands, validation)
- Consistent use of `:workerId` param

**Cons**:
- **Major**: Many action verbs in URLs (`/start`, `/stop`, `/stop-all`, `/clear`, `/cleanup-worktrees`, `/open-vscode`, etc.)
- Should use HTTP methods and resource states instead
- Inconsistent: `/status` vs GET `/` for collection
- Inconsistent: `POST /logs/stream` should be `GET` for SSE
- `/enhanced-logs` vs `/logs` - should be query param

---

### 5. Orchestrator API (`/api/orchestrator`)

**Purpose**: Manage Claude worker orchestration and task cycles.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/orchestrator/stream` | Stream orchestrator events | ✅ Good (SSE) |
| `GET` | `/api/orchestrator/stream/info` | Get stream info | ✅ Good |
| `GET` | `/api/orchestrator/status` | Get orchestrator status | ⚠️ Should be GET / |
| `POST` | `/api/orchestrator/start` | Start orchestrator | ⚠️ Action in URL |
| `POST` | `/api/orchestrator/stop` | Stop orchestrator | ⚠️ Action in URL |
| `POST` | `/api/orchestrator/execute` | Execute prompt | ⚠️ Action in URL |
| `POST` | `/api/orchestrator/cycle` | Run execution cycle | ⚠️ Action in URL |
| `GET` | `/api/orchestrator/metrics` | Get metrics | ✅ Good |

**Assessment**: ⚠️ **Needs Improvement** - RPC-style API with action URLs.

**Pros**:
- Good use of SSE for streaming
- Clear separation of metrics

**Cons**:
- Should model as a resource with state transitions
- Actions like `/start`, `/stop`, `/execute`, `/cycle` should be state changes

---

### 6. Validation Runs API (`/api/validation-runs`)

**Purpose**: Track validation execution history.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/validation-runs` | List validation runs | ✅ Good |
| `GET` | `/api/validation-runs/:runId` | Get run details | ✅ Good |
| `GET` | `/api/validation-runs/:runId/stages` | Get run stages | ✅ Good nesting |
| `POST` | `/api/validation-runs` | Create new run | ✅ Good |
| `GET` | `/api/validation-runs/:runId/summary` | Get run summary | ✅ Good |
| `GET` | `/api/validation-runs/:runId/logs` | Get run logs | ✅ Good |
| `GET` | `/api/validation-runs/:runId/logs/stream` | Stream logs | ✅ Good (SSE) |

**Assessment**: ✅ **Excellent** - Well-designed RESTful API with proper nesting.

---

### 7. Validation Stage Configs API (`/api/validation-stage-configs`)

**Purpose**: Configure validation pipeline stages.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/validation-stage-configs` | List stage configs | ✅ Good |
| `GET` | `/api/validation-stage-configs/:stageId` | Get stage config | ✅ Good |
| `POST` | `/api/validation-stage-configs` | Create stage config | ✅ Good |
| `PUT` | `/api/validation-stage-configs/:stageId` | Update stage config | ✅ Good |
| `DELETE` | `/api/validation-stage-configs/:stageId` | Delete stage config | ✅ Good |
| `POST` | `/api/validation-stage-configs/:stageId/reset` | Reset stage config | ⚠️ Action in URL |
| `POST` | `/api/validation-stage-configs/reorder` | Reorder stages | ⚠️ Action in URL |

**Assessment**: ⚠️ **Good with Minor Issues** - Mostly RESTful with couple action endpoints.

**Pros**:
- Standard CRUD operations
- Clear resource naming

**Cons**:
- `/reset` and `/reorder` are actions (could use PATCH or sub-resources)

---

### 8. BDD Scenarios API (`/api/bdd-scenarios`)

**Purpose**: Manage BDD test scenarios.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/bdd-scenarios` | List all scenarios | ✅ Good |
| `GET` | `/api/bdd-scenarios/task/:taskId` | Get task scenarios | ⚠️ Inconsistent nesting |
| `GET` | `/api/bdd-scenarios/stats` | Get execution stats | ✅ Good |
| `POST` | `/api/bdd-scenarios/comprehensive` | Create comprehensive | ⚠️ Unclear |
| `POST` | `/api/bdd-scenarios` | Create scenario | ✅ Good |
| `PUT` | `/api/bdd-scenarios/:scenarioId` | Update scenario | ✅ Good |
| `POST` | `/api/bdd-scenarios/:scenarioId/execute` | Execute scenario | ⚠️ Action in URL |
| `GET` | `/api/bdd-scenarios/:scenarioId/executions` | Get executions | ✅ Good nesting |
| `PUT` | `/api/bdd-scenarios/:scenarioId/status` | Update status | ✅ Good sub-resource |
| `POST` | `/api/bdd-scenarios/execute-all` | Execute all scenarios | ⚠️ Action in URL |

**Assessment**: ⚠️ **Mixed** - Some good RESTful patterns, some RPC-style.

**Pros**:
- Good use of sub-resources for executions
- Status as sub-resource

**Cons**:
- `/execute` and `/execute-all` are actions
- Inconsistent: `/task/:taskId` vs nested under `/api/tasks/:taskId/scenarios`

---

### 9. E2E Testing API (`/api/e2e`)

**Purpose**: Manage end-to-end test suites and execution.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/e2e/suites` | List test suites | ✅ Good |
| `GET` | `/api/e2e/suites/:suiteId` | Get suite details | ✅ Good |
| `GET` | `/api/e2e/history` | Get execution history | ✅ Good |
| `GET` | `/api/e2e/analytics` | Get E2E analytics | ✅ Good |
| `POST` | `/api/e2e/run` | Run E2E tests | ⚠️ Action in URL |
| `GET` | `/api/e2e/runs/:runId` | Get run details | ✅ Good |
| `POST` | `/api/e2e/tasks/:taskId/scenarios/:scenarioId/link-test` | Link test to scenario | ⚠️ Action + nesting issue |
| `GET` | `/api/e2e/test-files` | List test files | ✅ Good |
| `GET` | `/api/e2e/coverage` | Get code coverage | ✅ Good |
| `GET` | `/api/e2e/scenario-suggestions` | Get suggestions | ✅ Good |
| `POST` | `/api/e2e/cucumber/run` | Run Cucumber tests | ⚠️ Action in URL |
| `GET` | `/api/e2e/cucumber/results/:runId` | Get Cucumber results | ✅ Good nesting |
| `POST` | `/api/e2e/gherkin/validate` | Validate Gherkin | ⚠️ Action in URL |
| `POST` | `/api/e2e/step-definitions/generate` | Generate step defs | ⚠️ Action in URL |

**Assessment**: ⚠️ **Mixed** - Good resource structure but too many action endpoints.

---

### 10. Permissions API (`/api/permissions`)

**Purpose**: Manage permission rules and configurations.

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/permissions/config` | Get permission config | ✅ Good |
| `PUT` | `/api/permissions/config` | Update config | ✅ Good |
| `GET` | `/api/permissions/rules` | List permission rules | ✅ Good |
| `POST` | `/api/permissions/rules` | Create rule | ✅ Good |
| `PUT` | `/api/permissions/rules/:ruleId` | Update rule | ✅ Good |
| `DELETE` | `/api/permissions/rules/:ruleId` | Delete rule | ✅ Good |
| `POST` | `/api/permissions/test` | Test permissions | ⚠️ Action in URL |
| `GET` | `/api/permissions/default-configs` | Get default configs | ✅ Good |
| `GET` | `/api/permissions/actions` | List available actions | ✅ Good |
| `GET` | `/api/permissions/scopes` | List available scopes | ✅ Good |
| `POST` | `/api/permissions/import-claude-settings` | Import Claude settings | ⚠️ Action in URL |

**Assessment**: ⚠️ **Good with Minor Issues** - Well-structured with a few action endpoints.

---

### 11. Backup API (`/api/backup`) ⚠️ **Not Mounted**

| Method | Endpoint | Purpose | Issues |
|--------|----------|---------|--------|
| `GET` | `/api/backup` | List backups | ⚠️ Not mounted in app |
| `GET` | `/api/backup/status` | Get backup status | ⚠️ Not mounted |
| `POST` | `/api/backup/create` | Create backup | ⚠️ Not mounted + action |
| `POST` | `/api/backup/restore/:filename` | Restore backup | ⚠️ Not mounted + action |
| `DELETE` | `/api/backup/:filename` | Delete backup | ⚠️ Not mounted |

**Assessment**: ❌ **Critical** - Route file exists but **not registered** in `src/index.ts`!

---

## Design Pattern Analysis

### 1. **Resource vs Action-Based URLs**

#### Current Issues

The API mixes RESTful resource-based URLs with RPC-style action-based URLs:

**RESTful (Good)** ✅:
```
GET    /api/tasks/:id
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

**Action-Based (Anti-pattern)** ❌:
```
POST /api/claude-workers/start
POST /api/claude-workers/stop-all
POST /api/orchestrator/execute
POST /api/bdd-scenarios/:id/execute
POST /api/e2e/run
```

#### Why This Matters

- **Breaks REST principles** - URLs should represent resources, not actions
- **Reduces discoverability** - Actions are hidden in URL structure
- **Harder to cache** - Actions on resources are less predictable
- **Violates HTTP semantics** - POST should create resources, not trigger arbitrary actions

#### Recommendation

Model actions as **resource state transitions** or **sub-resources**:

```
❌ POST /api/orchestrator/start
✅ PUT  /api/orchestrator/state { "status": "running" }
   OR
✅ POST /api/orchestrator/sessions

❌ POST /api/workers/:id/stop
✅ DELETE /api/workers/:id
   OR
✅ PUT  /api/workers/:id/state { "status": "stopped" }

❌ POST /api/scenarios/:id/execute
✅ POST /api/scenarios/:id/executions
```

---

### 2. **Inconsistent Resource Nesting**

#### Current Issues

Sub-resources are nested inconsistently:

**Consistent (Good)** ✅:
```
/api/tasks/:taskId/scenarios
/api/tasks/:taskId/scenarios/:scenarioId
/api/analytics/sessions/:sessionId/attempts
```

**Inconsistent** ⚠️:
```
/api/tasks/analytics              # Should be /api/analytics/tasks
/api/bdd-scenarios/task/:taskId   # Should be /api/tasks/:taskId/scenarios
/api/analytics/validation-metrics # Should be /api/analytics/validation/metrics
```

#### Recommendation

Follow a **consistent nesting strategy**:

1. **Primary resources** at top level: `/api/tasks`, `/api/workers`
2. **Sub-resources** nested under parent: `/api/tasks/:id/scenarios`
3. **Cross-cutting concerns** in own namespace: `/api/analytics/*`
4. **Max 2-3 levels** of nesting to avoid deep URLs

**Proposed Structure**:
```
✅ /api/analytics/tasks              # Analytics about tasks
✅ /api/tasks/:taskId/scenarios      # Scenarios belong to task
✅ /api/analytics/validation/metrics # Consistent hierarchy
```

---

### 3. **HTTP Method Usage**

#### Current Issues

Some endpoints misuse HTTP methods:

**Good Examples** ✅:
- `GET` for reads
- `POST` for creates
- `PUT` for full updates
- `DELETE` for deletes

**Problematic Examples** ⚠️:
```
PUT /api/analytics/sessions/:sessionId  # Used to "end" session
  → Should be: POST /api/sessions/:id/completions

DELETE /api/analytics/sessions          # Bulk delete without ID
  → Should be: POST /api/sessions/cleanups?before=date

POST /api/claude-workers/:id/logs/stream # SSE endpoint
  → Should be: GET /api/workers/:id/logs?stream=true
```

#### Recommendation

**HTTP Method Semantics**:

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| `GET` | Retrieve resource(s) | Yes | Yes |
| `POST` | Create resource, non-idempotent actions | No | No |
| `PUT` | Replace entire resource | Yes | No |
| `PATCH` | Partial update | Yes* | No |
| `DELETE` | Remove resource | Yes | No |

**Examples**:
```
✅ GET    /api/workers/:id              # Get worker
✅ POST   /api/workers                  # Create worker
✅ PATCH  /api/workers/:id              # Update worker fields
✅ DELETE /api/workers/:id              # Stop/remove worker

✅ POST   /api/sessions                 # Start session
✅ POST   /api/sessions/:id/completions # End session
✅ GET    /api/workers/:id/logs?stream=true # Stream logs (SSE)
```

---

### 4. **Naming Conventions**

#### Current Issues

Mix of kebab-case and inconsistent patterns:

```
✅ /api/claude-workers           # kebab-case (good)
✅ /api/validation-runs          # kebab-case (good)
⚠️ /api/validation-stage-configs # very long kebab-case
⚠️ /api/bdd-scenarios            # acronym in kebab-case
⚠️ /api/e2e                      # acronym
```

#### Recommendation

**Consistent URL Naming**:
- Use **kebab-case** for URLs: `/api/validation-runs`
- Keep URLs **short** and **intuitive**: `/api/stage-configs` vs `/api/validation-stage-configs`
- Expand **acronyms** for clarity: `/api/end-to-end` vs `/api/e2e`
- Use **plural** for collections: `/api/workers` not `/api/worker`

**Examples**:
```
✅ /api/workers                # Short, plural
✅ /api/validation-runs        # Clear, kebab-case
❌ /api/validation-stage-configs # Too long
✅ /api/stage-configs          # Better
```

---

### 5. **Error Handling**

#### Current Strengths ✅

- Consistent HTTP status codes defined as constants
- Structured error responses with `{ error: string }`
- Zod validation errors include `details` field
- Proper error logging

**Example**:
```typescript
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error response
res.status(HTTP_STATUS.BAD_REQUEST).json({
  error: 'Invalid settings format',
  details: zodError.issues,
});
```

#### Areas for Improvement ⚠️

1. **Inconsistent error format**:
```typescript
// Some endpoints
{ error: 'Message' }

// Others
{ error: 'Message', details: [...] }

// Should standardize to:
{
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid settings format',
    details: [...]
  }
}
```

2. **No error codes**:
- Clients have to parse error messages (fragile)
- Should add machine-readable error codes

3. **Missing field-level errors**:
```typescript
// Current
{ error: 'Invalid settings format', details: [...zodErrors] }

// Better
{
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request body',
    fields: {
      'email': 'Invalid email format',
      'age': 'Must be greater than 0'
    }
  }
}
```

---

### 6. **Response Format Consistency**

#### Current Patterns

**Success responses**:
```typescript
// Some endpoints return data directly
GET /api/tasks/:id
{ id: '123', content: '...', status: 'pending' }

// Others wrap in a field
GET /api/tasks/analytics
{ sessions: [...], stages: [...] }

// Some include metadata
POST /api/settings
{ message: 'Settings updated successfully', settings: {...} }
```

#### Recommendation

**Standardize response envelope**:

```typescript
// Single resource
{
  data: { id: '123', content: '...', status: 'pending' }
}

// Collection
{
  data: [...],
  meta: {
    total: 100,
    page: 1,
    perPage: 20
  }
}

// Creation
{
  data: { id: '123', ... },
  meta: { message: 'Successfully created' }
}
```

**Benefits**:
- Consistent shape for all responses
- Room for metadata (pagination, timestamps)
- Easier client-side parsing
- Future-proof for adding fields

---

### 7. **API Versioning**

#### Current State

❌ **No versioning strategy** in place.

#### Why This Matters

- Breaking changes will break all clients
- No way to deprecate old endpoints
- Cannot evolve API independently

#### Recommendation

**URL-based versioning** (simplest for REST APIs):

```
/api/v1/tasks
/api/v1/workers
/api/v2/workers  # Breaking changes in v2
```

**Alternative**: Header-based versioning:
```
GET /api/tasks
Accept: application/vnd.codegoat.v1+json
```

**Recommendation**: Use **URL versioning** for this API:
- More visible
- Easier to test
- Better for browser/curl usage
- Industry standard (Stripe, Twilio, GitHub)

**Migration Path**:
1. Add `/api/v1` prefix to all current endpoints
2. Keep `/api/*` as alias to `/api/v1/*` for backwards compatibility
3. For breaking changes, create `/api/v2/*`
4. Document deprecation timeline for old versions

---

### 8. **Pagination & Filtering**

#### Current State

Some endpoints support pagination:
```typescript
GET /api/analytics/sessions?limit=10
GET /api/validation-runs?limit=10
```

But it's **inconsistent** and **incomplete**.

#### Issues

- No `offset` or `cursor` support
- No total count returned
- Inconsistent query params
- No filtering support

#### Recommendation

**Standard pagination params**:
```
?page=1           # Page number (1-indexed)
?perPage=20       # Items per page
?offset=0         # Alternative: offset-based
?cursor=abc123    # Alternative: cursor-based (better for real-time)
```

**Response format**:
```json
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
    "self": "/api/tasks?page=1&perPage=20",
    "next": "/api/tasks?page=2&perPage=20",
    "prev": null,
    "first": "/api/tasks?page=1&perPage=20",
    "last": "/api/tasks?page=5&perPage=20"
  }
}
```

**Standard filtering**:
```
?filter[status]=completed
?filter[priority]=high
?sort=-createdAt          # - prefix for descending
?fields=id,title,status   # Sparse fieldsets
```

---

## Identified Issues

### Critical Issues 🔴

1. **Backup API not mounted** - Route file exists (`src/routes/backup.ts`) but not registered in `src/index.ts`
2. **No API versioning** - Breaking changes will break all clients
3. **Heavy use of action-based URLs** - Violates REST principles (especially in `/api/claude-workers` and `/api/orchestrator`)

### Major Issues 🟠

4. **Inconsistent resource nesting** - Analytics and sub-resources are inconsistently organized
5. **Mixed HTTP method semantics** - PUT used for actions, POST for streams, DELETE without IDs
6. **Inconsistent error formats** - No standard error response shape or error codes
7. **No standardized pagination** - Different patterns across endpoints
8. **Missing response envelopes** - Direct data vs wrapped responses

### Minor Issues 🟡

9. **Verbose endpoint names** - `/api/validation-stage-configs` is too long
10. **Inconsistent naming** - Mix of `validation-metrics` vs `validation/metrics`
11. **No HATEOAS links** - Missing discoverability through hypermedia
12. **No rate limiting headers** - No X-RateLimit-* headers
13. **No ETag support** - No conditional requests for caching
14. **No CORS preflight optimization** - Could cache OPTIONS requests longer

---

## Recommendations

### Priority 1: Critical Fixes (Do Immediately)

#### 1.1 Mount Backup API

**File**: `src/index.ts`

```typescript
// Add import
import { createBackupRoutes } from './routes/backup';

// Add route mounting
app.use('/api/backups', createBackupRoutes(logger));
```

#### 1.2 Add API Versioning

**Step 1**: Create version namespace

```typescript
// src/routes/v1/index.ts
import express from 'express';
import { ILogger } from '../../logger-interface';
// ... import all route creators

export function createV1Routes(logger: ILogger): express.Router {
  const router = express.Router();

  // Mount all v1 routes
  router.use('/settings', createSettingsRoutes(logger));
  router.use('/tasks', createTasksRoutes(logger));
  router.use('/analytics', createAnalyticsRoutes(logger));
  // ... all other routes

  return router;
}
```

**Step 2**: Update `src/index.ts`

```typescript
import { createV1Routes } from './routes/v1';

// Mount v1 routes
app.use('/api/v1', createV1Routes(logger));

// Backwards compatibility - redirect to v1
app.use('/api', createV1Routes(logger));
```

#### 1.3 Fix Action-Based URLs

**Example**: Convert `/api/claude-workers` actions to resources

**Before** ❌:
```typescript
POST /api/claude-workers/start
POST /api/claude-workers/:id/stop
POST /api/claude-workers/stop-all
POST /api/claude-workers/clear
```

**After** ✅:
```typescript
// Starting a worker creates a new worker resource
POST /api/workers
Body: { taskId: '123', prompt: '...' }
Response: { data: { id: 'worker-1', status: 'running', ... } }

// Stopping a worker deletes the resource
DELETE /api/workers/:id
Response: { data: { id: 'worker-1', status: 'stopped', stoppedAt: '...' } }

// Stop all workers - batch delete
DELETE /api/workers?all=true
Response: { data: { stopped: ['worker-1', 'worker-2'], count: 2 } }

// Clear history - delete completed workers
DELETE /api/workers?status=completed
Response: { data: { deleted: 5 } }
```

**Implementation**:

```typescript
// src/routes/claude-workers.ts

// Old: POST /start
router.post('/start', async (req, res) => {
  const worker = await startWorker(req.body);
  res.status(201).json({ data: worker });
});

// New: POST / (create worker - it starts automatically)
router.post('/', async (req, res) => {
  const worker = await createWorker(req.body); // Creates and starts
  res.status(201).json({
    data: worker,
    meta: { message: 'Worker created and started' }
  });
});

// Old: POST /:id/stop
router.post('/:id/stop', async (req, res) => {
  await stopWorker(req.params.id);
  res.json({ message: 'Worker stopped' });
});

// New: DELETE /:id (delete worker - stops it)
router.delete('/:id', async (req, res) => {
  const worker = await deleteWorker(req.params.id); // Stops and removes
  res.json({
    data: worker,
    meta: { message: 'Worker stopped and removed' }
  });
});

// Old: POST /stop-all
router.post('/stop-all', async (req, res) => {
  const stopped = await stopAllWorkers();
  res.json({ stopped });
});

// New: DELETE /?all=true
router.delete('/', async (req, res) => {
  if (req.query.all === 'true') {
    const result = await deleteAllWorkers();
    res.json({ data: result });
  } else if (req.query.status) {
    const result = await deleteWorkersByStatus(req.query.status);
    res.json({ data: result });
  } else {
    res.status(400).json({ error: 'Invalid query parameters' });
  }
});
```

**Benefits**:
- RESTful resource modeling
- Idempotent DELETE operations
- Standard HTTP semantics
- Cleaner URLs
- Better caching

---

### Priority 2: Major Improvements (Do Soon)

#### 2.1 Standardize Error Responses

**Create error response utility**:

```typescript
// src/utils/api-response.ts

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, string> | unknown[];
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, string> | unknown[],
  path?: string
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: path || '',
    },
  };
}

// Usage in route handlers
res.status(400).json(
  createErrorResponse(
    ErrorCode.VALIDATION_ERROR,
    'Invalid request body',
    { email: 'Invalid email format', age: 'Must be positive' },
    req.path
  )
);
```

**Global error middleware**:

```typescript
// src/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createErrorResponse, ErrorCode } from '../utils/api-response';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Zod validation errors
  if (error instanceof ZodError) {
    const details = error.issues.reduce((acc, issue) => {
      const path = issue.path.join('.');
      acc[path] = issue.message;
      return acc;
    }, {} as Record<string, string>);

    res.status(400).json(
      createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Request validation failed',
        details,
        req.path
      )
    );
    return;
  }

  // Not found errors
  if (error.message.includes('not found')) {
    res.status(404).json(
      createErrorResponse(
        ErrorCode.NOT_FOUND,
        error.message,
        undefined,
        req.path
      )
    );
    return;
  }

  // Generic errors
  logger.error('Unhandled error', error);
  res.status(500).json(
    createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      undefined,
      req.path
    )
  );
}

// Register in src/index.ts
app.use(errorHandler);
```

#### 2.2 Standardize Success Responses

```typescript
// src/utils/api-response.ts

export interface ApiDataResponse<T> {
  data: T;
  meta?: {
    message?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export interface ApiCollectionResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  links?: {
    self: string;
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
  };
}

export function createDataResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): ApiDataResponse<T> {
  return {
    data,
    meta: meta ? { timestamp: new Date().toISOString(), ...meta } : undefined,
  };
}

export function createCollectionResponse<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
  baseUrl: string
): ApiCollectionResponse<T> {
  const totalPages = Math.ceil(total / perPage);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data,
    meta: {
      total,
      page,
      perPage,
      totalPages,
      hasNext,
      hasPrev,
    },
    links: {
      self: `${baseUrl}?page=${page}&perPage=${perPage}`,
      first: `${baseUrl}?page=1&perPage=${perPage}`,
      last: `${baseUrl}?page=${totalPages}&perPage=${perPage}`,
      next: hasNext ? `${baseUrl}?page=${page + 1}&perPage=${perPage}` : null,
      prev: hasPrev ? `${baseUrl}?page=${page - 1}&perPage=${perPage}` : null,
    },
  };
}

// Usage
res.json(createDataResponse(worker, { message: 'Worker created' }));
res.json(createCollectionResponse(workers, 100, 1, 20, '/api/workers'));
```

#### 2.3 Standardize Pagination

```typescript
// src/middleware/pagination.ts
import { Request, Response, NextFunction } from 'express';

export interface PaginationParams {
  page: number;
  perPage: number;
  offset: number;
}

export function parsePagination(req: Request, res: Response, next: NextFunction): void {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string) || 20));
  const offset = (page - 1) * perPage;

  req.pagination = { page, perPage, offset };
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      pagination: PaginationParams;
    }
  }
}

// Usage in routes
router.get('/', parsePagination, async (req, res) => {
  const { page, perPage, offset } = req.pagination;

  const [workers, total] = await Promise.all([
    db.worker.findMany({ skip: offset, take: perPage }),
    db.worker.count(),
  ]);

  res.json(createCollectionResponse(workers, total, page, perPage, req.baseUrl));
});
```

#### 2.4 Consolidate Inconsistent Nesting

**Reorganize analytics endpoints**:

**Before** ❌:
```
GET /api/tasks/analytics
GET /api/analytics/tasks  # Duplicate!
```

**After** ✅:
```
GET /api/analytics/tasks
GET /api/analytics/workers
GET /api/analytics/validation
```

**Reorganize scenario endpoints**:

**Before** ❌:
```
GET /api/bdd-scenarios/task/:taskId  # Inconsistent nesting
POST /api/tasks/:id/scenarios        # Correct nesting
```

**After** ✅:
```
GET  /api/tasks/:taskId/scenarios
POST /api/tasks/:taskId/scenarios
GET  /api/tasks/:taskId/scenarios/:scenarioId
```

---

### Priority 3: Nice-to-Have Improvements (Future)

#### 3.1 Add HATEOAS Links

Include hypermedia links for discoverability:

```json
{
  "data": {
    "id": "worker-123",
    "status": "running",
    "taskId": "CODEGOAT-001"
  },
  "links": {
    "self": "/api/workers/worker-123",
    "logs": "/api/workers/worker-123/logs",
    "task": "/api/tasks/CODEGOAT-001",
    "stop": {
      "href": "/api/workers/worker-123",
      "method": "DELETE"
    }
  }
}
```

#### 3.2 Add Rate Limiting Headers

```typescript
// src/middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      createErrorResponse(
        ErrorCode.RATE_LIMITED,
        'Too many requests, please try again later',
        undefined,
        req.path
      )
    );
  },
});

// Apply to all routes
app.use('/api/', apiLimiter);
```

#### 3.3 Add ETags for Caching

```typescript
// src/middleware/etag.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function etagMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send;

  res.send = function (body): Response {
    if (req.method === 'GET' && res.statusCode === 200) {
      const etag = crypto.createHash('md5').update(JSON.stringify(body)).digest('hex');
      res.setHeader('ETag', `"${etag}"`);

      if (req.headers['if-none-match'] === `"${etag}"`) {
        res.status(304).end();
        return res;
      }
    }

    return originalSend.call(this, body);
  };

  next();
}

// Apply to all routes
app.use(etagMiddleware);
```

#### 3.4 Add OpenAPI/Swagger Documentation

```bash
npm install swagger-jsdoc swagger-ui-express
```

```typescript
// src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CodeGoat API',
      version: '1.0.0',
      description: 'CodeGoat AI Proxy Server API',
    },
    servers: [
      { url: 'http://localhost:3001/api/v1', description: 'Development' },
      { url: 'https://api.codegoat.dev/v1', description: 'Production' },
    ],
  },
  apis: ['./src/routes/**/*.ts'],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: express.Application): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
}
```

---

## Proposed Improvements with Examples

### Example 1: Refactor Claude Workers API

**Current (Action-Based)** ❌:
```typescript
// src/routes/claude-workers.ts

router.post('/start', async (req, res) => {
  const { taskId, prompt } = req.body;
  const worker = await startWorker(taskId, prompt);
  res.status(201).json({ workerId: worker.id, status: 'started' });
});

router.post('/:workerId/stop', async (req, res) => {
  await stopWorker(req.params.workerId);
  res.json({ message: 'Worker stopped' });
});

router.post('/stop-all', async (req, res) => {
  const count = await stopAllWorkers();
  res.json({ message: 'All workers stopped', count });
});

router.post('/cleanup-worktrees', async (req, res) => {
  await cleanupWorktrees();
  res.json({ message: 'Worktrees cleaned up' });
});
```

**Proposed (Resource-Based)** ✅:
```typescript
// src/routes/v2/workers.ts

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
 *             required: [taskId, prompt]
 *             properties:
 *               taskId:
 *                 type: string
 *                 example: CODEGOAT-001
 *               prompt:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       201:
 *         description: Worker created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Worker'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                 links:
 *                   type: object
 */
router.post('/', validateRequest(CreateWorkerSchema), async (req, res) => {
  const worker = await workerService.create(req.body);

  res.status(201).json(
    createDataResponse(worker, {
      message: 'Worker created and started successfully',
    })
  );
});

/**
 * @openapi
 * /workers/{workerId}:
 *   delete:
 *     summary: Stop and remove a worker
 *     description: Gracefully stops the worker and removes its resources
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Worker stopped successfully
 */
router.delete('/:workerId', validateParams(WorkerIdSchema), async (req, res) => {
  const worker = await workerService.stop(req.params.workerId);

  res.json(
    createDataResponse(worker, {
      message: 'Worker stopped and removed',
    })
  );
});

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
 *           enum: [running, failed, completed]
 *     responses:
 *       200:
 *         description: Workers stopped successfully
 */
router.delete('/', validateQuery(BulkStopSchema), async (req, res) => {
  let result;

  if (req.query.all === 'true') {
    result = await workerService.stopAll();
  } else if (req.query.status) {
    result = await workerService.stopByStatus(req.query.status as string);
  } else {
    return res.status(400).json(
      createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Must specify either all=true or status filter',
        undefined,
        req.path
      )
    );
  }

  res.json(createDataResponse(result));
});

/**
 * @openapi
 * /workers/worktrees:
 *   delete:
 *     summary: Clean up orphaned worktrees
 *     description: Removes worktrees from stopped or failed workers
 *     responses:
 *       200:
 *         description: Worktrees cleaned up
 */
router.delete('/worktrees', async (req, res) => {
  const result = await worktreeService.cleanup();

  res.json(
    createDataResponse(result, {
      message: 'Worktrees cleaned up successfully',
    })
  );
});
```

**Benefits of This Refactor**:

| Aspect | Before | After |
|--------|--------|-------|
| **REST Compliance** | ❌ Action URLs | ✅ Resource URLs |
| **HTTP Semantics** | ❌ POST for everything | ✅ POST create, DELETE remove |
| **Idempotency** | ❌ Not idempotent | ✅ DELETE is idempotent |
| **Caching** | ❌ Hard to cache | ✅ Cacheable responses |
| **Discoverability** | ❌ Hidden actions | ✅ Standard CRUD |
| **Documentation** | ⚠️ Manual docs | ✅ OpenAPI annotations |

---

### Example 2: Refactor Orchestrator API

**Current (RPC-Style)** ❌:
```typescript
router.post('/start', (req, res) => { ... });
router.post('/stop', (req, res) => { ... });
router.post('/execute', (req, res) => { ... });
router.post('/cycle', (req, res) => { ... });
router.get('/status', (req, res) => { ... });
```

**Proposed (Resource with State)** ✅:
```typescript
// Model orchestrator as a singleton resource with state

/**
 * GET /orchestrator
 * Get current orchestrator state
 */
router.get('/', async (req, res) => {
  const state = await orchestratorService.getState();
  res.json(createDataResponse(state));
});

/**
 * PATCH /orchestrator
 * Update orchestrator state (start/stop)
 */
router.patch('/', validateRequest(UpdateOrchestratorSchema), async (req, res) => {
  const { status } = req.body; // 'running' or 'stopped'

  const newState = await orchestratorService.updateState(status);
  res.json(
    createDataResponse(newState, {
      message: `Orchestrator ${status}`,
    })
  );
});

/**
 * POST /orchestrator/executions
 * Create a new execution (run prompt)
 */
router.post('/executions', validateRequest(CreateExecutionSchema), async (req, res) => {
  const execution = await orchestratorService.execute(req.body);
  res.status(201).json(
    createDataResponse(execution, {
      message: 'Execution started',
    })
  );
});

/**
 * POST /orchestrator/cycles
 * Create a new cycle execution
 */
router.post('/cycles', validateRequest(CreateCycleSchema), async (req, res) => {
  const cycle = await orchestratorService.runCycle(req.body);
  res.status(201).json(
    createDataResponse(cycle, {
      message: 'Cycle started',
    })
  );
});

/**
 * GET /orchestrator/metrics
 * Get orchestrator metrics
 */
router.get('/metrics', async (req, res) => {
  const metrics = await orchestratorService.getMetrics();
  res.json(createDataResponse(metrics));
});
```

**API Usage Comparison**:

```bash
# Before (Action-based)
POST /api/orchestrator/start
POST /api/orchestrator/stop
POST /api/orchestrator/execute
  Body: { prompt: "..." }
POST /api/orchestrator/cycle
  Body: { count: 5 }

# After (Resource-based)
PATCH /api/orchestrator
  Body: { "status": "running" }

PATCH /api/orchestrator
  Body: { "status": "stopped" }

POST /api/orchestrator/executions
  Body: { "prompt": "..." }

POST /api/orchestrator/cycles
  Body: { "iterations": 5 }
```

**Why This is Better**:
- **State Management**: Orchestrator modeled as resource with state
- **Sub-Resources**: Executions and cycles are sub-resources
- **Idempotency**: PATCH to set state is idempotent
- **Semantics**: POST creates executions (correct HTTP semantics)

---

### Example 3: Refactor Analytics Endpoints

**Current (Inconsistent)** ❌:
```
GET /api/analytics
GET /api/analytics/sessions
GET /api/analytics/sessions/:id
GET /api/analytics/stages/:id/history
GET /api/analytics/validation/runs
GET /api/analytics/validation/statistics
GET /api/analytics/validation-metrics
GET /api/tasks/analytics              # Inconsistent!
```

**Proposed (Consistent Hierarchy)** ✅:
```
GET /api/analytics                        # Overview/dashboard
GET /api/analytics/sessions               # Session list
GET /api/analytics/sessions/:id           # Session details
GET /api/analytics/sessions/:id/attempts  # Session sub-resource

GET /api/analytics/stages                 # Stage list
GET /api/analytics/stages/:id             # Stage details
GET /api/analytics/stages/:id/history     # Stage history
GET /api/analytics/stages/:id/statistics  # Stage stats

GET /api/analytics/validation             # Validation overview
GET /api/analytics/validation/runs        # Validation runs
GET /api/analytics/validation/metrics     # Validation metrics
GET /api/analytics/validation/statistics  # Validation stats

GET /api/analytics/tasks                  # Task analytics
GET /api/analytics/tasks/:id              # Single task analytics

GET /api/analytics/workers                # Worker analytics
GET /api/analytics/workers/:id            # Single worker analytics
```

**Benefits**:
- **Consistent nesting** - All analytics under `/api/analytics`
- **Logical hierarchy** - Clear parent-child relationships
- **Predictability** - Easy to guess endpoint structure
- **Discoverability** - Browse API by exploring hierarchy

---

### Example 4: Add Comprehensive Filtering & Sorting

**Current (Limited)** ❌:
```typescript
router.get('/tasks', async (req, res) => {
  // No filtering, no sorting, limited pagination
  const tasks = await db.task.findMany();
  res.json(tasks);
});
```

**Proposed (Full-Featured)** ✅:
```typescript
// src/middleware/query-parser.ts

export interface QueryOptions {
  filter: Record<string, string | string[]>;
  sort: Array<{ field: string; order: 'asc' | 'desc' }>;
  fields: string[];
  include: string[];
}

export function parseQueryOptions(req: Request): QueryOptions {
  // Parse filter[field]=value
  const filter: Record<string, string | string[]> = {};
  Object.keys(req.query).forEach(key => {
    const match = key.match(/^filter\[(.+)\]$/);
    if (match) {
      const field = match[1];
      const value = req.query[key];
      filter[field] = Array.isArray(value) ? value : String(value);
    }
  });

  // Parse sort=-field,+field
  const sortParam = req.query.sort as string;
  const sort = sortParam
    ? sortParam.split(',').map(field => ({
        field: field.replace(/^[+-]/, ''),
        order: field.startsWith('-') ? ('desc' as const) : ('asc' as const),
      }))
    : [];

  // Parse fields=id,title,status
  const fieldsParam = req.query.fields as string;
  const fields = fieldsParam ? fieldsParam.split(',') : [];

  // Parse include=scenarios,attempts
  const includeParam = req.query.include as string;
  const include = includeParam ? includeParam.split(',') : [];

  return { filter, sort, fields, include };
}

// Usage in route
router.get('/', parsePagination, async (req, res) => {
  const { page, perPage, offset } = req.pagination;
  const { filter, sort, fields, include } = parseQueryOptions(req);

  // Build Prisma query
  const where: any = {};

  if (filter.status) {
    where.status = { in: Array.isArray(filter.status) ? filter.status : [filter.status] };
  }

  if (filter.priority) {
    where.priority = { in: Array.isArray(filter.priority) ? filter.priority : [filter.priority] };
  }

  if (filter.createdAfter) {
    where.createdAt = { gte: new Date(filter.createdAfter) };
  }

  const orderBy = sort.map(s => ({ [s.field]: s.order }));

  const selectFields = fields.length > 0
    ? fields.reduce((acc, field) => ({ ...acc, [field]: true }), {})
    : undefined;

  const includeRelations = include.reduce((acc, rel) => ({ ...acc, [rel]: true }), {});

  const [tasks, total] = await Promise.all([
    db.task.findMany({
      where,
      orderBy,
      select: selectFields,
      include: includeRelations,
      skip: offset,
      take: perPage,
    }),
    db.task.count({ where }),
  ]);

  res.json(createCollectionResponse(tasks, total, page, perPage, req.baseUrl));
});
```

**Usage Examples**:

```bash
# Filter by status
GET /api/tasks?filter[status]=completed

# Multiple statuses
GET /api/tasks?filter[status]=pending&filter[status]=in_progress

# Filter by priority
GET /api/tasks?filter[priority]=high

# Filter by date range
GET /api/tasks?filter[createdAfter]=2025-01-01

# Sort by multiple fields
GET /api/tasks?sort=-priority,createdAt

# Sparse fieldsets (only return specific fields)
GET /api/tasks?fields=id,title,status

# Include related resources
GET /api/tasks?include=scenarios,attempts

# Combine all
GET /api/tasks?filter[status]=completed&sort=-createdAt&page=2&perPage=20&fields=id,title,status&include=scenarios
```

---

## Migration Strategy

### Phase 1: Immediate Fixes (Week 1)

**Goal**: Fix critical issues without breaking existing clients.

1. **Mount backup API**
   - Add to `src/index.ts`
   - Test endpoints

2. **Add API versioning structure**
   - Create `/api/v1` namespace
   - Keep `/api/*` as alias for backwards compat
   - Update documentation

3. **Standardize error responses**
   - Implement error response utilities
   - Add global error handler
   - Update all routes to use standard format

4. **Fix inconsistent analytics nesting**
   - Move `/api/tasks/analytics` to `/api/analytics/tasks`
   - Keep old endpoint with deprecation warning

**Testing**: Ensure all existing tests pass.

---

### Phase 2: Major Refactors (Weeks 2-3)

**Goal**: Refactor action-based endpoints to resource-based.

1. **Refactor Claude Workers API**
   - Create new resource-based endpoints
   - Keep old endpoints with deprecation headers
   - Update client code
   - Add OpenAPI docs

2. **Refactor Orchestrator API**
   - Model as stateful resource
   - Update endpoint structure
   - Maintain backwards compatibility

3. **Standardize pagination**
   - Implement pagination middleware
   - Update all list endpoints
   - Add response envelope with meta

4. **Add filtering & sorting**
   - Implement query parser
   - Update database queries
   - Document query syntax

**Testing**: E2E tests for all new endpoints.

---

### Phase 3: Documentation & Tooling (Week 4)

**Goal**: Improve developer experience.

1. **OpenAPI/Swagger docs**
   - Add swagger annotations
   - Generate interactive docs
   - Host at `/api/docs`

2. **Add rate limiting**
   - Implement rate limiter middleware
   - Add headers
   - Document limits

3. **Add caching headers**
   - ETag support
   - Cache-Control headers
   - Conditional requests

4. **Client SDK generation**
   - Generate TypeScript SDK from OpenAPI
   - Publish to npm

**Testing**: Load testing and performance benchmarks.

---

### Phase 4: Deprecation & Cleanup (Weeks 5-6)

**Goal**: Remove old endpoints and finalize v1 API.

1. **Deprecation notices**
   - Add `Deprecation` headers to old endpoints
   - Log deprecation warnings
   - Update docs

2. **Sunset old endpoints**
   - Set sunset dates
   - Remove deprecated endpoints
   - Release v1.0.0 stable

3. **Performance optimization**
   - Database query optimization
   - Response caching
   - Compression

**Testing**: Final QA and security audit.

---

## References

### REST API Design Best Practices

1. **RFC 9110**: HTTP Semantics
   - https://www.rfc-editor.org/rfc/rfc9110.html

2. **REST API Guidelines** (Microsoft)
   - https://github.com/microsoft/api-guidelines

3. **Google API Design Guide**
   - https://cloud.google.com/apis/design

4. **API Design Patterns** (Google)
   - Resource-oriented design
   - Standard methods
   - Custom methods

### Industry Standards

5. **JSON:API Specification**
   - https://jsonapi.org/

6. **OpenAPI Specification 3.0**
   - https://spec.openapis.org/oas/v3.0.0

7. **OAuth 2.0** (RFC 6749)
   - https://datatracker.ietf.org/doc/html/rfc6749

### Tools & Libraries

8. **Swagger/OpenAPI**
   - https://swagger.io/

9. **API Blueprint**
   - https://apiblueprint.org/

10. **Postman**
    - https://www.postman.com/

### Books

11. **RESTful Web APIs** (Richardson & Ruby)
12. **API Design Patterns** (JJ Geewax)
13. **Building Microservices** (Sam Newman)

---

## Appendix: HTTP Status Code Reference

### Success (2xx)

- **200 OK** - Request succeeded, response body contains data
- **201 Created** - Resource created successfully, Location header with new resource URL
- **202 Accepted** - Request accepted for processing (async)
- **204 No Content** - Request succeeded, no response body (DELETE success)

### Redirection (3xx)

- **301 Moved Permanently** - Resource permanently moved
- **304 Not Modified** - Resource not modified (ETag match)

### Client Errors (4xx)

- **400 Bad Request** - Invalid request syntax or validation error
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Authenticated but not authorized
- **404 Not Found** - Resource doesn't exist
- **405 Method Not Allowed** - HTTP method not supported for resource
- **409 Conflict** - Resource conflict (e.g., duplicate ID)
- **422 Unprocessable Entity** - Semantic validation failed
- **429 Too Many Requests** - Rate limit exceeded

### Server Errors (5xx)

- **500 Internal Server Error** - Generic server error
- **502 Bad Gateway** - Invalid response from upstream
- **503 Service Unavailable** - Server temporarily unavailable
- **504 Gateway Timeout** - Upstream timeout

---

**End of API Design Review**
