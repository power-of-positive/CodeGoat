# API Improvements Backlog

**Project**: CodeGoat API Improvements
**Last Updated**: 2025-10-31
**Status**: Phase 1 Complete - Foundation Laid

---

## Completed ✅

### Phase 1: Foundation (Complete)

1. **✅ Mount Backup API** - `src/routes/backup.ts` now registered at `/api/backups`
2. **✅ Create Response Utilities** - `src/utils/api-response.ts`
   - `createDataResponse()` for single resources
   - `createCollectionResponse()` for paginated collections
   - `createErrorResponse()` for errors
   - Standard error codes enum

3. **✅ Global Error Handler** - `src/middleware/error-handler.ts`
   - `createErrorHandler()` middleware registered in app
   - `AppError` class for custom errors
   - `asyncHandler()` wrapper for async routes
   - Helper throw functions (`throwNotFound`, etc.)

4. **✅ Pagination Middleware** - `src/middleware/pagination.ts`
   - `parsePagination()` middleware
   - Extracts `page` and `perPage` from query
   - Calculates `offset` for database queries
   - Helper functions for pagination metadata

5. **✅ Query Parser Middleware** - `src/middleware/query-parser.ts`
   - `parseQueryOptions()` middleware
   - Filtering: `?filter[field]=value`
   - Sorting: `?sort=-field1,+field2`
   - Field selection: `?fields=id,title`
   - Include relations: `?include=scenarios`
   - Helper functions for Prisma queries

6. **✅ Migration Guide** - `docs/api-response-migration-guide.md`
   - Comprehensive guide for migrating routes
   - Before/after examples
   - Testing strategies

---

## In Progress 🚧

### Phase 2: Route Migration (Not Started)

**Goal**: Migrate existing routes to use new standardized format

#### Priority 1: High-Traffic Routes

- [ ] **Migrate `/api/workers` routes**
  - [ ] GET `/api/workers` - List workers with pagination
  - [ ] POST `/api/workers` - Create worker (refactor from `/start`)
  - [ ] GET `/api/workers/:id` - Get worker details
  - [ ] DELETE `/api/workers/:id` - Stop/remove worker (refactor from `/:id/stop`)
  - [ ] GET `/api/workers/:id/logs` - Get worker logs
  - [ ] Update tests

- [ ] **Migrate `/api/tasks` routes**
  - [ ] GET `/api/tasks` - List tasks with pagination
  - [ ] POST `/api/tasks` - Create task
  - [ ] GET `/api/tasks/:id` - Get task details
  - [ ] PUT `/api/tasks/:id` - Update task
  - [ ] DELETE `/api/tasks/:id` - Delete task
  - [ ] Update tests

- [ ] **Migrate `/api/settings` routes**
  - [ ] GET `/api/settings` - Get settings
  - [ ] PUT `/api/settings` - Update settings
  - [ ] GET `/api/settings/fallback` - Get fallback settings
  - [ ] PUT `/api/settings/fallback` - Update fallback
  - [ ] Update tests

#### Priority 2: Medium-Traffic Routes

- [ ] **Migrate `/api/analytics` routes**
  - [ ] Consolidate analytics endpoints
  - [ ] Move `/api/tasks/analytics` to `/api/analytics/tasks`
  - [ ] Add pagination to sessions list
  - [ ] Standardize all analytics responses
  - [ ] Update tests

- [ ] **Migrate `/api/validation-runs` routes**
  - [ ] GET `/api/validation-runs` - List with pagination
  - [ ] GET `/api/validation-runs/:id` - Get run details
  - [ ] Update tests

- [ ] **Migrate `/api/orchestrator` routes**
  - [ ] Refactor action-based URLs to resources
  - [ ] Update tests

#### Priority 3: Remaining Routes

- [ ] **Migrate `/api/permissions` routes**
- [ ] **Migrate `/api/e2e` routes**
- [ ] **Migrate `/api/bdd-scenarios` routes**
- [ ] **Migrate `/api/validation-stage-configs` routes**
- [ ] **Migrate `/api/backups` routes** (newly mounted)

---

## Planned 📋

### Phase 3: API Versioning (High Priority)

**Goal**: Add `/api/v1` versioning to support future breaking changes

1. [ ] **Create v1 namespace**
   - [ ] Create `src/routes/v1/index.ts`
   - [ ] Mount all routes under `/api/v1`

2. [ ] **Update route organization**

   ```
   src/routes/
   ├── v1/
   │   ├── index.ts           # Route aggregator
   │   ├── workers.ts         # Refactored from claude-workers
   │   ├── tasks.ts
   │   ├── settings.ts
   │   └── ...
   └── (legacy routes)
   ```

3. [ ] **Documentation**
   - [ ] Add versioning to API docs
   - [ ] Document version lifecycle
   - [ ] Create deprecation strategy

**Estimated Effort**: 2-3 days

---

### Phase 4: OpenAPI/Swagger Documentation (Medium Priority)

**Goal**: Add interactive API documentation

1. [ ] **Install dependencies**

   ```bash
   npm install swagger-jsdoc swagger-ui-express
   npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
   ```

2. [ ] **Create Swagger configuration**
   - [ ] `src/swagger.ts` - Swagger setup
   - [ ] OpenAPI 3.0 specification
   - [ ] Auto-generate from JSDoc comments

3. [ ] **Add JSDoc annotations to routes**

   ```typescript
   /**
    * @openapi
    * /workers:
    *   get:
    *     summary: List all workers
    *     parameters:
    *       - in: query
    *         name: page
    *         schema:
    *           type: integer
    *     responses:
    *       200:
    *         description: Workers list
    */
   ```

4. [ ] **Mount Swagger UI**
   - [ ] Serve at `/api/docs`
   - [ ] Interactive playground
   - [ ] Auto-generated client SDKs

**Estimated Effort**: 3-4 days

---

### Phase 5: Advanced Features (Nice-to-Have)

#### 5.1 Rate Limiting

- [ ] Install `express-rate-limit`
- [ ] Add rate limiting middleware
- [ ] Configure per-endpoint limits
- [ ] Return `X-RateLimit-*` headers
- [ ] Document rate limits

**Estimated Effort**: 1 day

#### 5.2 ETag Support

- [ ] Add ETag middleware for GET requests
- [ ] Support `If-None-Match` conditional requests
- [ ] Return `304 Not Modified` when appropriate
- [ ] Test caching behavior

**Estimated Effort**: 1 day

#### 5.3 HATEOAS Links

- [ ] Add hypermedia links to all responses
- [ ] Include `links` object with related resources
- [ ] Document link relations
- [ ] Improve API discoverability

**Estimated Effort**: 2-3 days

#### 5.4 Request Validation Middleware

- [ ] Enhance existing Zod validation
- [ ] Add request body size limits
- [ ] Add content-type validation
- [ ] Improve error messages

**Estimated Effort**: 1 day

#### 5.5 Response Compression

- [ ] Add `compression` middleware
- [ ] Configure compression thresholds
- [ ] Test performance improvements

**Estimated Effort**: 0.5 day

---

## Deferred / Future Considerations 🔮

### API Gateway

- [ ] Consider API gateway for advanced routing
- [ ] Request/response transformation
- [ ] Advanced rate limiting
- [ ] API key management

**Effort**: 1-2 weeks

### GraphQL API

- [ ] Evaluate GraphQL alongside REST
- [ ] Create GraphQL schema
- [ ] Set up Apollo Server
- [ ] Migrate complex queries

**Effort**: 2-3 weeks

### Real-time Subscriptions

- [ ] WebSocket support for real-time updates
- [ ] GraphQL subscriptions
- [ ] Server-Sent Events enhancement

**Effort**: 1-2 weeks

### API Analytics

- [ ] Track API usage metrics
- [ ] Monitor endpoint performance
- [ ] Identify slow queries
- [ ] Dashboard for API health

**Effort**: 1 week

---

## Major Refactorings (Requires Design Discussion)

### 1. Claude Workers API Refactoring

**Problem**: Heavy use of action-based URLs

**Current**:

```
POST /api/claude-workers/start
POST /api/claude-workers/:id/stop
POST /api/claude-workers/stop-all
POST /api/claude-workers/cleanup-worktrees
```

**Proposed**:

```
POST   /api/workers                    # Create (and start) worker
DELETE /api/workers/:id                # Stop and remove worker
DELETE /api/workers?all=true           # Stop all workers
DELETE /api/workers/worktrees          # Cleanup worktrees
```

**Impact**: Breaking changes for clients

**Effort**: 2-3 days + testing

### 2. Orchestrator API Refactoring

**Problem**: RPC-style with action URLs

**Current**:

```
POST /api/orchestrator/start
POST /api/orchestrator/stop
POST /api/orchestrator/execute
POST /api/orchestrator/cycle
```

**Proposed**:

```
GET   /api/orchestrator                # Get state
PATCH /api/orchestrator                # Update state (start/stop)
POST  /api/orchestrator/executions     # Create execution
POST  /api/orchestrator/cycles         # Create cycle
```

**Impact**: Breaking changes for clients

**Effort**: 2 days + testing

### 3. Analytics Consolidation

**Problem**: Inconsistent nesting

**Current**:

```
GET /api/tasks/analytics
GET /api/analytics/tasks         # Duplicate!
GET /api/analytics/validation-metrics
```

**Proposed**:

```
GET /api/analytics/tasks
GET /api/analytics/workers
GET /api/analytics/validation/metrics
```

**Impact**: Breaking changes, but can maintain aliases

**Effort**: 1-2 days

---

## Testing Strategy

### Unit Tests

- [ ] Test response utilities (`api-response.ts`)
- [ ] Test error handler middleware
- [ ] Test pagination middleware
- [ ] Test query parser middleware
- [ ] Achieve 90%+ coverage on new utilities

### Integration Tests

- [ ] Test migrated routes with new format
- [ ] Test pagination with actual database
- [ ] Test filtering and sorting
- [ ] Test error handling end-to-end

### E2E Tests

- [ ] Update Playwright tests for new format
- [ ] Test API versioning
- [ ] Test backwards compatibility
- [ ] Performance benchmarks

---

## Documentation Tasks

- [x] API Design Review (`docs/api-design-review.md`)
- [x] Migration Guide (`docs/api-response-migration-guide.md`)
- [x] Improvements Backlog (`docs/api-improvements-backlog.md`)
- [ ] Update `CLAUDE.md` with new utilities
- [ ] Create API usage examples
- [ ] Update route-specific README files
- [ ] Create video tutorials (optional)

---

## Metrics & Success Criteria

### API Consistency Score

**Target**: 90%+ routes follow standard format

**Current**: ~40%

- Settings API: 100% ✅
- Tasks API: 80% ⚠️
- Analytics API: 60% ⚠️
- Workers API: 30% ❌
- Orchestrator API: 20% ❌

### Performance Metrics

- **Response time**: < 100ms for simple GET requests
- **Pagination overhead**: < 10ms
- **Error handling overhead**: < 5ms

### Developer Experience

- **Time to add new endpoint**: < 30 minutes
- **Time to understand API**: < 1 hour
- **Test coverage**: > 85%

---

## Dependencies

### Internal

- None currently - foundation is complete

### External

- `swagger-jsdoc` (for OpenAPI docs)
- `swagger-ui-express` (for API playground)
- `express-rate-limit` (for rate limiting)
- `compression` (for response compression)

---

## Risk Assessment

### Low Risk ✅

- Adding new utilities (done)
- Adding middleware (done)
- Documentation updates

### Medium Risk ⚠️

- Migrating routes incrementally
- Adding API versioning
- Testing at scale

### High Risk ❌

- Breaking changes to action-based URLs
- Major route refactorings
- Removing old utilities

**Mitigation**: Use API versioning, maintain backwards compatibility during transition

---

## Timeline Estimate

| Phase                      | Duration    | Dependencies |
| -------------------------- | ----------- | ------------ |
| Phase 1: Foundation        | ✅ Complete | None         |
| Phase 2: Route Migration   | 2-3 weeks   | Phase 1      |
| Phase 3: API Versioning    | 3-5 days    | Phase 2      |
| Phase 4: OpenAPI Docs      | 3-4 days    | Phase 2      |
| Phase 5: Advanced Features | 1-2 weeks   | Phase 3      |

**Total Estimated Time**: 6-8 weeks for full completion

---

## Questions & Decisions Needed

1. **API Versioning Strategy**
   - URL-based (`/api/v1`) or header-based?
   - **Decision**: URL-based (simpler, more visible)

2. **Breaking Changes Timeline**
   - When to deprecate old action-based URLs?
   - **Decision**: After v1 stabilizes (Phase 3 complete)

3. **OpenAPI vs Alternative**
   - Stick with OpenAPI or consider API Blueprint?
   - **Decision**: OpenAPI (industry standard)

4. **Route Migration Order**
   - Which routes to migrate first?
   - **Decision**: High-traffic routes first (workers, tasks, settings)

---

## Next Actions

**Immediate (This Week)**:

1. ✅ Foundation complete
2. Run tests to verify no breakage
3. Update CLAUDE.md documentation
4. Begin Phase 2: Start migrating `/api/workers` routes

**Short-term (Next 2 Weeks)**:

1. Complete high-priority route migrations
2. Add comprehensive tests
3. Update client code to use new format

**Medium-term (Next Month)**:

1. Add API versioning
2. Set up OpenAPI documentation
3. Plan deprecation strategy for old format

**Long-term (Next Quarter)**:

1. Complete all route migrations
2. Add advanced features (rate limiting, ETags, HATEOAS)
3. Performance optimization

---

**Status**: Foundation complete, ready to proceed with Phase 2
**Owner**: Development Team
**Priority**: High
