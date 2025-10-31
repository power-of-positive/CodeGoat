# Complete API Schema Migration Plan

**Created:** October 30, 2025
**Status:** 📋 PLANNING
**Phase 1 Status:** ✅ COMPLETE (`/api/claude-workers/start`)
**Remaining Work:** 10 API groups, ~120 endpoints

---

## Executive Summary

This document provides a detailed plan to migrate **ALL** API endpoints to use Zod schema validation, ensuring type safety between frontend and backend. This will eliminate entire classes of bugs like the `taskContent` mismatch we fixed.

### Current State
- ✅ **1 endpoint** validated: `/api/claude-workers/start`
- ⏳ **~120 endpoints** remaining across 10 API groups
- ⏳ **4 frontend API clients** need type safety

### Target State
- ✅ **100% of endpoints** with Zod validation
- ✅ **All frontend API calls** use shared types
- ✅ **Single source of truth** for API contracts
- ✅ **Runtime + compile-time** safety everywhere

---

## API Inventory

### Mounted API Routes (from `src/index.ts`)

| Route Path | Source File | Status | Priority | Est. Endpoints |
|------------|-------------|--------|----------|----------------|
| `/api/claude-workers` | `claude-workers.ts` | 🟡 Partial (1/15) | 🔴 HIGH | 15 |
| `/api/tasks` | `tasks.ts` | ❌ Todo | 🔴 HIGH | 12 |
| `/api/analytics` | `analytics.ts` | ❌ Todo | 🟡 MEDIUM | 20 |
| `/api/settings` | `settings.ts` | ❌ Todo | 🟡 MEDIUM | 8 |
| `/api/permissions` | `permissions.ts` | ❌ Todo | 🟠 LOW | 5 |
| `/api/orchestrator` | `orchestrator.ts` | ❌ Todo | 🟡 MEDIUM | 10 |
| `/api/bdd-scenarios` | `bdd-scenarios.ts` | ❌ Todo | 🟠 LOW | 15 |
| `/api/validation-runs` | `validation-runs.ts` | ❌ Todo | 🟡 MEDIUM | 10 |
| `/api/validation-stage-configs` | `validation-stage-configs.ts` | ❌ Todo | 🟡 MEDIUM | 8 |
| `/api/e2e` | `e2e.ts` | ❌ Todo | 🟠 LOW | 12 |
| **TOTAL** | **10 groups** | **1% done** | | **~120** |

### Frontend API Clients

| Client File | Corresponds To | Status | Lines | Complexity |
|-------------|----------------|--------|-------|------------|
| `workers-api.ts` | `/api/claude-workers` | 🟡 Partial | ~150 | Medium |
| `tasks-api.ts` | `/api/tasks` | ❌ Todo | ~200 | High |
| `analytics-api.ts` | `/api/analytics` | ❌ Todo | ~180 | High |
| `settings-api.ts` | `/api/settings` | ❌ Todo | ~120 | Medium |

---

## Detailed Endpoint Analysis

### 🔴 HIGH PRIORITY - Core User Workflows

#### 1. `/api/claude-workers` (Workers Management)
**Status:** 🟡 1/15 complete
**Frontend Client:** `ui/src/shared/lib/workers-api.ts`

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| POST | `/start` | `{taskId, taskContent}` | Worker | ✅ DONE |
| POST | `/:workerId/stop` | None | `{status}` | ❌ Todo |
| POST | `/:workerId/message` | `{message}` | `{status}` | ❌ Todo |
| POST | `/:workerId/follow-up` | `{prompt}` | `{status}` | ❌ Todo |
| POST | `/:workerId/merge` | `{commitMessage?}` | `{commitHash}` | ❌ Todo |
| POST | `/:workerId/merge-worktree` | None | `{success}` | ❌ Todo |
| POST | `/:workerId/open-vscode` | None | `{success}` | ❌ Todo |
| POST | `/stop-all` | None | `{stopped}` | ❌ Todo |
| POST | `/cleanup-worktrees` | None | `{cleaned}` | ❌ Todo |
| GET | `/` | - | `Worker[]` | ❌ Todo |
| GET | `/status` | - | `WorkersStatus` | ❌ Todo |
| GET | `/:workerId` | - | `Worker` | ❌ Todo |
| GET | `/:workerId/logs` | - | `{logs}` | ❌ Todo |
| GET | `/:workerId/blocked-commands` | - | `BlockedCommand[]` | ❌ Todo |
| GET | `/:workerId/validation-runs` | - | `ValidationRun[]` | ❌ Todo |

**Estimated Time:** 4 hours

---

#### 2. `/api/tasks` (Task Management - vibe-kanban integration)
**Status:** ❌ 0/12 complete
**Frontend Client:** `ui/src/shared/lib/tasks-api.ts`

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| GET | `/` | Query: `{status?, type?}` | `Task[]` | ❌ Todo |
| GET | `/:id` | - | `Task` | ❌ Todo |
| GET | `/task/:taskId` | - | `Task` | ❌ Todo |
| POST | `/` | `CreateTaskDto` | `Task` | ❌ Todo |
| PUT | `/:id` | `UpdateTaskDto` | `Task` | ❌ Todo |
| DELETE | `/:id` | - | `{success}` | ❌ Todo |
| GET | `/:id/scenarios/:scenarioId/analytics` | - | `Analytics` | ❌ Todo |
| GET | `/:id/scenarios/:scenarioId/executions` | - | `Execution[]` | ❌ Todo |
| POST | `/:id/scenarios` | `CreateScenarioDto` | `Scenario` | ❌ Todo |
| PUT | `/:id/scenarios/:scenarioId` | `UpdateScenarioDto` | `Scenario` | ❌ Todo |
| DELETE | `/:id/scenarios/:scenarioId` | - | `{success}` | ❌ Todo |
| POST | `/tasks/:taskId/scenarios/:scenarioId/link-test` | `{testFile}` | `{success}` | ❌ Todo |

**Estimated Time:** 5 hours

---

### 🟡 MEDIUM PRIORITY - Analytics & Configuration

#### 3. `/api/analytics` (Validation & Performance Analytics)
**Status:** ❌ 0/20 complete
**Frontend Client:** `ui/src/shared/lib/analytics-api.ts`

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| GET | `/` | - | `AnalyticsOverview` | ❌ Todo |
| GET | `/validation-metrics` | - | `ValidationMetrics` | ❌ Todo |
| GET | `/validation-runs` | - | `ValidationRun[]` | ❌ Todo |
| GET | `/validation-statistics` | - | `Statistics` | ❌ Todo |
| GET | `/analytics/summary` | - | `Summary` | ❌ Todo |
| GET | `/analytics/history` | - | `HistoryData` | ❌ Todo |
| GET | `/analytics/comparison` | - | `ComparisonData` | ❌ Todo |
| GET | `/analytics/stages` | - | `StageData[]` | ❌ Todo |
| GET | `/stages/:stageId/history` | - | `StageHistory` | ❌ Todo |
| GET | `/stages/:stageId/statistics` | - | `StageStatistics` | ❌ Todo |
| GET | `/sessions` | - | `Session[]` | ❌ Todo |
| GET | `/sessions/:sessionId` | - | `Session` | ❌ Todo |
| POST | `/sessions` | `CreateSessionDto` | `Session` | ❌ Todo |
| PUT | `/sessions/:sessionId/end` | `{result}` | `Session` | ❌ Todo |
| POST | `/sessions/:sessionId/attempts` | `AttemptDto` | `Attempt` | ❌ Todo |
| DELETE | `/cleanup` | - | `{cleaned}` | ❌ Todo |
| GET | `/analytics` | - | `FullAnalytics` | ❌ Todo |
| GET | `/coverage` | - | `CoverageData` | ❌ Todo |
| GET | `/metrics` | - | `Metrics` | ❌ Todo |
| GET | `/config` | - | `AnalyticsConfig` | ❌ Todo |

**Estimated Time:** 6 hours

---

#### 4. `/api/settings` (Configuration Management)
**Status:** ❌ 0/8 complete
**Frontend Client:** `ui/src/shared/lib/settings-api.ts`

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| GET | `/` | - | `Settings` | ❌ Todo |
| PUT | `/` | `Settings` | `Settings` | ❌ Todo |
| GET | `/validation` | - | `ValidationSettings` | ❌ Todo |
| PUT | `/validation` | `ValidationSettings` | `ValidationSettings` | ❌ Todo |
| GET | `/validation/stages` | - | `Stage[]` | ❌ Todo |
| GET | `/validation/stages/:id` | - | `Stage` | ❌ Todo |
| POST | `/validation/stages` | `CreateStageDto` | `Stage` | ❌ Todo |
| PUT | `/validation/stages/:id` | `UpdateStageDto` | `Stage` | ❌ Todo |
| DELETE | `/validation/stages/:id` | - | `{success}` | ❌ Todo |
| GET | `/fallback` | - | `FallbackConfig` | ❌ Todo |
| PUT | `/fallback` | `FallbackConfig` | `FallbackConfig` | ❌ Todo |
| POST | `/import-claude-settings` | `{path}` | `{imported}` | ❌ Todo |

**Estimated Time:** 3 hours

---

#### 5. `/api/orchestrator` (Task Orchestration)
**Status:** ❌ 0/10 complete
**Frontend Client:** None (consider creating)

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| POST | `/start` | `{options}` | `{orchestratorId}` | ❌ Todo |
| POST | `/stop` | - | `{success}` | ❌ Todo |
| POST | `/execute` | `{prompt, options}` | `{result}` | ❌ Todo |
| POST | `/cycle` | - | `{cycleResult}` | ❌ Todo |
| POST | `/test` | `{config}` | `{testResult}` | ❌ Todo |
| GET | `/status` | - | `OrchestratorStatus` | ❌ Todo |
| GET | `/stream` | - | SSE stream | ❌ Todo |
| GET | `/stream/info` | - | `{connected}` | ❌ Todo |
| GET | `/config` | - | `OrchestratorConfig` | ❌ Todo |
| PUT | `/config` | `OrchestratorConfig` | `OrchestratorConfig` | ❌ Todo |

**Estimated Time:** 4 hours

---

#### 6. `/api/validation-runs` (Validation Run History)
**Status:** ❌ 0/10 complete
**Frontend Client:** Integrated in `analytics-api.ts`

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| GET | `/` | - | `ValidationRun[]` | ❌ Todo |
| GET | `/runs/:runId` | - | `ValidationRun` | ❌ Todo |
| GET | `/history` | - | `RunHistory` | ❌ Todo |
| GET | `/analytics` | - | `RunAnalytics` | ❌ Todo |
| POST | `/comprehensive` | `{includeAll}` | `ComprehensiveRun` | ❌ Todo |
| POST | `/execute-all` | - | `{results}` | ❌ Todo |
| POST | `/clear` | - | `{cleared}` | ❌ Todo |
| GET | `/cucumber/results/:runId` | - | `CucumberResults` | ❌ Todo |
| GET | `/logs/stats` | - | `LogStatistics` | ❌ Todo |
| POST | `/logs/cleanup` | - | `{cleaned}` | ❌ Todo |

**Estimated Time:** 3 hours

---

#### 7. `/api/validation-stage-configs` (Stage Configuration)
**Status:** ❌ 0/8 complete
**Frontend Client:** Integrated in `settings-api.ts`

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| POST | `/` | `CreateStageDto` | `Stage` | ❌ Todo |
| GET | `/` | - | `Stage[]` | ❌ Todo |
| GET | `/default-configs` | - | `StageConfig[]` | ❌ Todo |
| GET | `/scopes` | - | `string[]` | ❌ Todo |
| GET | `/stats` | - | `StageStats` | ❌ Todo |
| GET | `/actions` | - | `Action[]` | ❌ Todo |
| PUT | `/config` | `StageConfig` | `StageConfig` | ❌ Todo |
| POST | `/run` | `{stageId}` | `{result}` | ❌ Todo |

**Estimated Time:** 3 hours

---

### 🟠 LOW PRIORITY - Specialized Features

#### 8. `/api/permissions` (Permission Management)
**Status:** ❌ 0/5 complete
**Frontend Client:** None (accessed directly)

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| GET | `/rules` | - | `PermissionRule[]` | ❌ Todo |
| POST | `/rules` | `CreateRuleDto` | `PermissionRule` | ❌ Todo |
| PUT | `/rules/:id` | `UpdateRuleDto` | `PermissionRule` | ❌ Todo |
| DELETE | `/rules/:id` | - | `{success}` | ❌ Todo |
| POST | `/test` | `{command, context}` | `{allowed, reason}` | ❌ Todo |

**Estimated Time:** 2 hours

---

#### 9. `/api/bdd-scenarios` (BDD Test Management)
**Status:** ❌ 0/15 complete
**Frontend Client:** None

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| GET | `/` | - | `BDDScenario[]` | ❌ Todo |
| GET | `/:scenarioId/history` | - | `ExecutionHistory[]` | ❌ Todo |
| POST | `/:scenarioId/execute` | `{options}` | `{result}` | ❌ Todo |
| PUT | `/:scenarioId/status` | `{status}` | `Scenario` | ❌ Todo |
| PUT | `/:scenarioId/link-test` | `{testFile}` | `{success}` | ❌ Todo |
| GET | `/suites` | - | `Suite[]` | ❌ Todo |
| GET | `/suites/:suiteId` | - | `Suite` | ❌ Todo |
| GET | `/test-files` | - | `TestFile[]` | ❌ Todo |
| GET | `/scenario-suggestions` | - | `Suggestion[]` | ❌ Todo |
| POST | `/gherkin/validate` | `{gherkin}` | `{valid, errors}` | ❌ Todo |
| POST | `/step-definitions/generate` | `{scenario}` | `{code}` | ❌ Todo |
| POST | `/cucumber/run` | `{features}` | `{results}` | ❌ Todo |

**Estimated Time:** 5 hours

---

#### 10. `/api/e2e` (E2E Testing Support)
**Status:** ❌ 0/12 complete
**Frontend Client:** None (test infrastructure)

| Method | Endpoint | Request Body | Response | Status |
|--------|----------|--------------|----------|--------|
| POST | `/start` | `{config}` | `{sessionId}` | ❌ Todo |
| POST | `/stop` | - | `{success}` | ❌ Todo |
| GET | `/status` | - | `E2EStatus` | ❌ Todo |
| POST | `/execute` | `{command}` | `{result}` | ❌ Todo |
| GET | `/logs/stats` | - | `LogStats` | ❌ Todo |
| POST | `/logs/cleanup` | - | `{cleaned}` | ❌ Todo |

**Estimated Time:** 2 hours

---

## Implementation Strategy

### Phase-Based Approach

#### ✅ Phase 1: Foundation (COMPLETE)
- [x] Create schema infrastructure
- [x] Build validation middleware
- [x] Implement first endpoint (`/claude-workers/start`)
- [x] Document patterns
- [x] Verify approach

**Time Invested:** 3 hours
**Status:** ✅ COMPLETE

---

#### 🔄 Phase 2: High Priority APIs (NEXT)
**Target:** User-facing core workflows
**Estimated Time:** 18 hours over 3 days

**Day 1 (6 hours):**
- [ ] Complete `/api/claude-workers` (14 remaining endpoints)
- [ ] Test all worker operations

**Day 2 (6 hours):**
- [ ] Complete `/api/tasks` (12 endpoints)
- [ ] Test CRUD operations

**Day 3 (6 hours):**
- [ ] Complete `/api/analytics` (20 endpoints)
- [ ] Test analytics queries

**Deliverables:**
- 46 endpoints with validation
- 3 frontend API clients updated
- All tests passing

---

#### 🔄 Phase 3: Medium Priority APIs
**Target:** Configuration & monitoring
**Estimated Time:** 14 hours over 2 days

**Day 4 (7 hours):**
- [ ] `/api/settings` (8 endpoints)
- [ ] `/api/orchestrator` (10 endpoints)

**Day 5 (7 hours):**
- [ ] `/api/validation-runs` (10 endpoints)
- [ ] `/api/validation-stage-configs` (8 endpoints)

**Deliverables:**
- 36 endpoints with validation
- Settings API client updated
- Configuration management tested

---

#### 🔄 Phase 4: Low Priority APIs
**Target:** Specialized features
**Estimated Time:** 9 hours over 1.5 days

**Day 6 (6 hours):**
- [ ] `/api/permissions` (5 endpoints)
- [ ] `/api/bdd-scenarios` (15 endpoints)

**Day 7 (3 hours):**
- [ ] `/api/e2e` (12 endpoints)
- [ ] Final verification

**Deliverables:**
- 32 endpoints with validation
- 100% coverage achieved
- Complete documentation

---

## Total Effort Estimate

| Phase | Endpoints | Time | Complexity |
|-------|-----------|------|------------|
| Phase 1 (Done) | 1 | 3h | Medium |
| Phase 2 | 46 | 18h | High |
| Phase 3 | 36 | 14h | Medium |
| Phase 4 | 32 | 9h | Low |
| **TOTAL** | **115** | **44h** | - |

**Calendar Time:** ~6-7 working days (at 6-7 hours/day)

---

## Schema Organization

### Directory Structure
```
src/shared/schemas/
├── common.schema.ts              # Shared types (done)
├── api/
│   ├── claude-workers.schema.ts  # Workers API (partial)
│   ├── tasks.schema.ts           # Tasks CRUD
│   ├── analytics.schema.ts       # Analytics queries
│   ├── settings.schema.ts        # Configuration
│   ├── orchestrator.schema.ts    # Orchestration
│   ├── validation.schema.ts      # Validation runs
│   ├── permissions.schema.ts     # Permissions
│   ├── bdd.schema.ts            # BDD scenarios
│   └── e2e.schema.ts            # E2E testing
└── index.ts                      # Barrel export

ui/src/shared/schemas -> symlink
```

### Naming Conventions

**Request Schemas:**
```typescript
export const CreateTaskRequestSchema = z.object({...});
export const UpdateTaskRequestSchema = z.object({...});
export const GetTasksQuerySchema = z.object({...});
```

**Response Schemas:**
```typescript
export const TaskResponseSchema = z.object({...});
export const TaskListResponseSchema = z.object({...});
```

**Types:**
```typescript
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type TaskResponse = z.infer<typeof TaskResponseSchema>;
```

---

## Success Metrics

### Coverage
- **Target:** 100% of user-facing endpoints
- **Current:** 1% (1/115 endpoints)
- **Track:** Coverage percentage per API group

### Quality
- **Zero runtime API mismatches** (caught at compile-time)
- **Zero missing required fields** (TypeScript errors)
- **Clear validation errors** (< 1s to understand problem)

### Developer Experience
- **Time to add endpoint validation:** < 10 minutes
- **Time to update API call:** < 5 minutes
- **Test update time:** < 5 minutes per test

---

## Risk Mitigation

### Risk: Too Much Work
**Mitigation:**
- Implement incrementally (one API group at a time)
- Can pause after any phase
- Each phase delivers value

### Risk: Breaking Changes
**Mitigation:**
- Keep old validation in parallel initially
- Deploy with feature flag
- Roll out API group by API group

### Risk: Performance
**Mitigation:**
- Benchmark validation overhead
- Cache compiled schemas
- Monitor response times

### Risk: Team Coordination
**Mitigation:**
- Clear documentation
- Code review checklist
- Pair programming sessions

---

## Next Steps

### Immediate (Today)
1. **Get approval** for this plan
2. **Start Phase 2:** Complete `/api/claude-workers`
3. **Set up tracking:** Create GitHub project or Jira board

### Short Term (This Week)
4. Complete high-priority APIs
5. Update frontend clients
6. Update all tests

### Medium Term (Next Week)
7. Complete medium & low priority APIs
8. Achieve 100% coverage
9. Consider OpenAPI generation

---

## Checklist for Each API Group

- [ ] Create schema file
- [ ] Define all request/response schemas
- [ ] Export types
- [ ] Add to barrel export (`index.ts`)
- [ ] Update backend routes with validation
- [ ] Update frontend API client
- [ ] Update all tests
- [ ] Run full test suite
- [ ] Verify TypeScript compilation
- [ ] Update documentation

---

## Appendix: Quick Reference

### Template for New Endpoint Schema

```typescript
// src/shared/schemas/api/my-api.schema.ts
import { z } from 'zod';

// Request schema
export const MyRequestSchema = z.object({
  field1: z.string().min(1, 'Field1 is required'),
  field2: z.number().optional(),
});

export type MyRequest = z.infer<typeof MyRequestSchema>;

// Response schema
export const MyResponseSchema = z.object({
  id: z.string(),
  data: z.string(),
});

export type MyResponse = z.infer<typeof MyResponseSchema>;
```

### Template for Backend Route Update

```typescript
// src/routes/my-route.ts
import { validateRequest } from '../middleware/validate';
import { MyRequestSchema } from '../shared/schemas';

router.post('/endpoint',
  validateRequest(MyRequestSchema),
  async (req, res) => {
    const { field1, field2 } = req.body;  // Typed!
    // ...
  }
);
```

### Template for Frontend API Client Update

```typescript
// ui/src/shared/lib/my-api.ts
import type { MyRequest, MyResponse } from '../schemas';

export const myApi = {
  async myMethod(request: MyRequest): Promise<MyResponse> {
    return apiRequest('/endpoint', {
      method: 'POST',
      body: request,
    });
  },
};
```

---

*Document created: 2025-10-30*
*Status: Ready for Implementation*
*Next Action: Get approval and start Phase 2*
