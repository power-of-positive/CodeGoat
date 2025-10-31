# Phase 2 Progress: /api/claude-workers Complete Migration

**Date:** October 30, 2025
**Status:** 🟡 IN PROGRESS
**Completion:** Schemas 100% | Routes 7% (1/15) | Frontend 20% (1/5 methods)

---

## Summary

All Zod schemas for `/api/claude-workers` endpoints have been created. Next step is to apply `validateParams()` and `validateRequest()` middleware to each route handler.

---

## ✅ Completed

### 1. Schema Definitions (100%)
All 15 endpoint schemas defined in `src/shared/schemas/api/claude-workers.schema.ts`:

- ✅ `POST /start` - Start worker
- ✅ `POST /:workerId/stop` - Stop worker
- ✅ `POST /:workerId/message` - Send message
- ✅ `POST /:workerId/follow-up` - Send follow-up
- ✅ `POST /:workerId/merge` - Merge changes
- ✅ `POST /:workerId/merge-worktree` - Merge worktree
- ✅ `POST /:workerId/open-vscode` - Open VS Code
- ✅ `POST /stop-all` - Stop all workers
- ✅ `POST /clear` - Clear logs
- ✅ `POST /cleanup-worktrees` - Cleanup worktrees
- ✅ `GET /status` - Get workers status
- ✅ `GET /:workerId` - Get worker details
- ✅ `GET /:workerId/logs` - Get logs
- ✅ `GET /:workerId/entries` - Get log entries
- ✅ `GET /:workerId/enhanced-logs` - SSE log stream (no validation needed)
- ✅ `GET /:workerId/blocked-commands` - Get blocked commands
- ✅ `GET /:workerId/validation-runs` - Get validation runs
- ✅ `GET /:workerId/validation-runs/:runId` - Get specific run
- ✅ `GET /logs/stats` - Get log statistics
- ✅ `POST /logs/cleanup` - Cleanup old logs

### 2. Backend Validation (7% - 1/15)
- ✅ `POST /start` - Uses `validateRequest(StartWorkerRequestSchema)`

### 3. Frontend API Client (20% - 1/5)
- ✅ `startWorker()` - Uses typed `StartWorkerRequest`

---

## ⏳ Remaining Work

### Backend Routes (14 remaining)

Each route needs middleware added in this pattern:

```typescript
// For routes with params:
router.post('/:workerId/stop',
  validateParams(StopWorkerParamsSchema),  // <-- ADD THIS
  (req, res) => { ... }
);

// For routes with request body:
router.post('/:workerId/message',
  validateParams(SendMessageParamsSchema),  // <-- ADD THIS
  validateRequest(SendMessageRequestSchema),  // <-- AND THIS
  (req, res) => { ... }
);
```

**Routes to update:**
1. `POST /:workerId/stop` - Add `validateParams(StopWorkerParamsSchema)`
2. `POST /:workerId/message` - Add both params & request validation
3. `POST /:workerId/follow-up` - Add both params & request validation
4. `POST /:workerId/merge` - Add both params & request validation
5. `POST /:workerId/merge-worktree` - Add both params & request validation
6. `POST /:workerId/open-vscode` - Add `validateParams(OpenVSCodeParamsSchema)`
7. `POST /stop-all` - No validation needed (no params/body)
8. `POST /clear` - No validation needed
9. `POST /cleanup-worktrees` - No validation needed
10. `GET /:workerId` - Add `validateParams(GetWorkerParamsSchema)`
11. `GET /:workerId/logs` - Add `validateParams(GetWorkerLogsParamsSchema)`
12. `GET /:workerId/entries` - Add `validateParams(GetLogEntriesParamsSchema)`
13. `GET /:workerId/blocked-commands` - Add `validateParams(GetBlockedCommandsParamsSchema)`
14. `GET /:workerId/validation-runs` - Add `validateParams(GetValidationRunsParamsSchema)`
15. `GET /:workerId/validation-runs/:runId` - Add `validateParams(GetValidationRunParamsSchema)`
16. `POST /logs/cleanup` - Add `validateRequest(CleanupLogsRequestSchema)` (optional body)

**Estimated time:** 2-3 hours

---

### Frontend API Client Updates

File: `ui/src/shared/lib/workers-api.ts`

**Methods to update:**

```typescript
// 1. stopWorker - Currently takes workerId string
async stopWorker(workerId: string) {
  // Change to use params object if needed, or keep as is
}

// 2. sendMessage - Update signature
async sendMessage(workerId: string, message: string) {
  // Change to:
  async sendMessage(params: SendMessageParams, request: SendMessageRequest)
}

// 3. sendFollowUp - Update signature
async sendFollowUp(workerId: string, prompt: string) {
  // Change to:
  async sendFollowUp(params: SendFollowUpParams, request: SendFollowUpRequest)
}

// 4. mergeWorker - Update signature
async mergeWorkerChanges(workerId: string, commitMessage?: string) {
  // Change to:
  async mergeWorker(params: MergeWorkerParams, request?: MergeWorkerRequest)
}

// 5. Add new methods for missing endpoints:
async mergeWorktree(params: MergeWorktreeParams, request?: MergeWorktreeRequest)
async openVSCode(params: OpenVSCodeParams)
async stopAllWorkers()
async clearLogs()
async cleanupWorktrees()
async getWorkerLogs(params: GetWorkerLogsParams)
async getLogEntries(params: GetLogEntriesParams)
async getBlockedCommands(params: GetBlockedCommandsParams)
async getValidationRuns(params: GetValidationRunsParams)
async getValidationRun(params: GetValidationRunParams)
async getLogStats()
async cleanupLogs(request?: CleanupLogsRequest)
```

**Estimated time:** 2 hours

---

### Test Updates

Files to update:
- `ui/src/shared/lib/api.test.ts`
- `ui/src/pages/TaskManagement.test.tsx` (already done for startWorker)
- `ui/src/features/workers/components/WorkerDetail.test.tsx` (already done for startWorker)
- `ui/src/features/workers/components/WorkerDetail.test.tsx` (other methods)
- Any E2E tests that call worker APIs

**Estimated time:** 2 hours

---

## Quick Implementation Guide

### Step 1: Add Validation to Backend Routes (2-3 hours)

Open `src/routes/claude-workers.ts` and update each route:

```typescript
// Before:
router.post('/:workerId/stop', (req, res) => {
  const { workerId } = req.params;
  // ...
});

// After:
router.post('/:workerId/stop',
  validateParams(StopWorkerParamsSchema),
  (req, res) => {
    const { workerId } = req.params;  // Now validated!
    // ...
  }
);
```

**Pro tip:** Search for each route in the file and add validation middleware. The imports are already added at the top of the file.

---

### Step 2: Update Frontend API Client (2 hours)

Open `ui/src/shared/lib/workers-api.ts`:

```typescript
// Import types at top:
import type {
  SendMessageRequest,
  SendMessageParams,
  SendFollowUpRequest,
  SendFollowUpParams,
  // ... etc
} from '../schemas';

// Update method signatures:
async sendMessage(
  params: SendMessageParams,
  request: SendMessageRequest
): Promise<MessageResponse> {
  return apiRequest(`/claude-workers/${params.workerId}/message`, {
    method: 'POST',
    body: request,
  });
}
```

---

### Step 3: Update Tests (2 hours)

Update test expectations to match new API signatures:

```typescript
// Before:
await claudeWorkersApi.sendMessage('worker-123', 'hello');

// After:
await claudeWorkersApi.sendMessage(
  { workerId: 'worker-123' },
  { message: 'hello' }
);
```

---

### Step 4: Verify (30 minutes)

```bash
# Run TypeScript compilation
npx tsc --noEmit

# Run tests
npm test

# Run frontend tests
cd ui && npm test -- --watchAll=false

# Build
npm run build
```

---

## Total Remaining Time Estimate

| Task | Time |
|------|------|
| Backend route validation | 2-3h |
| Frontend API client | 2h |
| Test updates | 2h |
| Verification & fixes | 0.5h |
| **TOTAL** | **6.5-7.5h** |

Can be split into:
- **Day 1 (3-4h):** Complete backend validation
- **Day 2 (3-4h):** Update frontend & tests

---

## Success Criteria

- [ ] All 15 worker endpoints have validation middleware
- [ ] TypeScript compilation passes with no errors
- [ ] All tests pass
- [ ] Frontend API client uses typed requests
- [ ] Can successfully call all endpoints from UI
- [ ] Invalid requests return clear 400 errors with details

---

## Notes

- SSE endpoints (enhanced-logs, stream) don't need request/response validation
- Some routes like `stop-all`, `clear` don't have request bodies to validate
- Param validation is more important than we initially thought - prevents invalid worker IDs

---

*Next: After completing /api/claude-workers, move to /api/tasks (Phase 2, Day 2)*
