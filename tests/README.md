# Comprehensive E2E Test Suite

This directory contains a full end-to-end test suite for the proxy server, covering all API endpoints, payload handling, fallback behavior, and integration scenarios.

## Test Structure

### 🧪 Individual Test Suites

1. **`api-endpoints.test.ts`** - Tests all API endpoints
   - Management API (`/api/models`, `/api/status`, `/api/logs`)
   - OpenAI Compatible API (`/v1/models`, `/v1/chat/completions`)
   - Internal endpoints (`/internal/health`, `/internal/test`)
   - UI and static content endpoints
   - Error handling and edge cases
   - Performance and reliability tests

2. **`payload-handling.test.ts`** - Comprehensive payload testing
   - Small payloads (< 1KB) 
   - Medium payloads (1-10KB)
   - Large payloads (100KB+) without 413 errors
   - Extremely large payloads (1MB+) graceful handling
   - Streaming requests with large payloads
   - Error recovery and resilience testing
   - Server timeout handling

3. **`fallback-behavior.test.ts`** - Model fallback testing
   - Context length exceeded fallback triggers
   - Rate limiting fallback scenarios  
   - Multiple model fallback sequences
   - Fallback configuration validation
   - Performance during fallbacks
   - Request context preservation

4. **`e2e.test.ts`** - Original comprehensive tests
   - Basic chat completions
   - Parameter handling
   - Streaming functionality
   - Model-specific behaviors
   - Config-driven behavior

5. **`comprehensive.test.ts`** - Integration testing
   - Full workflow testing (Health → Models → Chat → Logs)
   - Cross-component error handling
   - Performance under concurrent load
   - System-wide integration verification

## 📋 Test Coverage

### ✅ API Endpoints Covered
- `GET /api/models` - Model configuration management
- `GET /api/status` - Server health and status  
- `POST /api/status/reload` - Configuration reloading
- `GET /api/logs/requests` - Request log retrieval
- `GET /api/logs/errors` - Error log retrieval
- `GET /v1/models` - OpenAI-compatible model listing
- `POST /v1/chat/completions` - Chat completion requests
- `GET /internal/health` - Internal health checks
- `GET /internal/test` - Internal test endpoints
- `GET /ui/*` - Static UI content serving
- `GET /test` - Test route compatibility

### 🔧 Functionality Tested

**Payload Handling:**
- ✅ Small payloads (bytes to KB)
- ✅ Medium payloads (KB to MB)  
- ✅ Large payloads (MB+)
- ✅ 413 PayloadTooLargeError prevention
- ✅ Circular reference error handling
- ✅ Malformed payload recovery
- ✅ Streaming large payloads
- ✅ Server timeout handling

**Fallback Behavior:**
- ✅ Context length exceeded detection
- ✅ Model capability error fallbacks
- ✅ Rate limiting fallbacks (429 errors)
- ✅ Sequential fallback attempts
- ✅ Fallback configuration validation
- ✅ Performance during fallbacks
- ✅ Request context preservation

**Error Handling:**
- ✅ Invalid model names (400 errors)
- ✅ Missing required fields (400 errors) 
- ✅ Malformed JSON (400 errors)
- ✅ Nonexistent endpoints (404 errors)
- ✅ Server error prevention (no 500 crashes)
- ✅ Proper error response formatting

**Performance & Reliability:**
- ✅ Concurrent request handling
- ✅ Response time validation
- ✅ Server stability under load
- ✅ Memory leak prevention
- ✅ Request isolation
- ✅ Graceful degradation

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# API endpoints only
npm test -- --testPathPatterns=api-endpoints

# Payload handling only  
npm test -- --testPathPatterns=payload-handling

# Fallback behavior only
npm test -- --testPathPatterns=fallback-behavior

# Integration tests only
npm test -- --testPathPatterns=comprehensive

# Original E2E tests
npm test -- --testPathPatterns=e2e
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run E2E Tests (requires running server)
```bash
# Start server in one terminal
npm run dev

# Run E2E tests in another terminal  
npm run test:e2e
```

## 🛠️ Test Configuration

Tests use the configuration from `tests/fixtures/e2e-fixtures.ts`:
- **Base URL**: `http://localhost:3000` (configurable via `TEST_BASE_URL`)
- **Test Models**: Uses models configured in `config.yaml`
- **Timeouts**: Appropriate for different test types (5s-120s)
- **Retries**: Built-in retry logic for flaky provider APIs

## 📊 Expected Results

### ✅ What Should Pass
- All API endpoints return correct status codes and data structures
- Small to medium payloads process without errors
- Large payloads are handled gracefully (no 413 or 500 errors)
- Fallback logic triggers on appropriate errors
- Error responses are properly formatted
- Server remains stable under concurrent load

### ⚠️ Expected Failures (Provider-Dependent)
- Some models may hit rate limits (429 errors)
- Free tier models may have context length restrictions
- Provider downtime may cause temporary failures
- Network timeouts during large payload testing

### 🚫 Unacceptable Failures
- 413 PayloadTooLargeError responses
- 500 Internal Server Error responses  
- Server crashes or hangs
- Memory leaks during testing
- Circular reference JSON errors
- Response format inconsistencies

## 🔧 Test Maintenance

### Adding New Tests
1. Create test file in appropriate category
2. Use existing fixtures from `e2e-fixtures.ts`
3. Follow naming conventions
4. Add timeout specifications for longer tests
5. Update this README

### Debugging Test Failures
1. Check server logs for detailed error messages
2. Verify test configuration matches server setup
3. Confirm all required models are configured
4. Check network connectivity and timeouts
5. Review provider API status for service issues

## 📈 Future Enhancements

- **Load Testing**: Add tests for high concurrent load scenarios
- **Security Testing**: Add authentication and authorization tests  
- **Monitoring Integration**: Add metrics collection during tests
- **Chaos Testing**: Add failure injection and recovery tests
- **Performance Benchmarking**: Add response time benchmarks
- **Contract Testing**: Add API contract validation

---

This test suite ensures the proxy server is production-ready with comprehensive coverage of all critical functionality, error handling, and edge cases.