# Validation Retry System Documentation

## Overview
CodeGoat includes an intelligent validation retry system that automatically re-triggers Claude Code when validation fails, providing detailed feedback about what went wrong.

## How It Works

### 1. Validation Loop with Feedback
When Claude Code completes a task, the system:
1. Runs comprehensive validation (lint, tests, type-check, etc.)
2. If validation fails, analyzes which stages failed and why
3. Generates detailed error feedback
4. Re-triggers Claude with specific instructions to fix the failures
5. Repeats until validation passes or max retries reached

### 2. Retry Configuration

#### Settings Location
The retry count is configured in `settings.json`:

```json
{
  "validation": {
    "maxAttempts": 3,
    "stages": [...],
    "enableMetrics": true,
    "executionMode": "sequential"
  }
}
```

#### What `maxAttempts` Controls
- **Default**: 3 attempts total (1 initial + 2 retries)
- **Range**: 1-10 attempts
- **Behavior**: After reaching max attempts without passing validation, the task is marked as failed

### 3. Intelligent Feedback Generation

When validation fails, the system generates context-specific feedback:

```typescript
// Example feedback provided to Claude on retry:
`
VALIDATION FAILED - Attempt 2/3

Failed Stages:
- lint: Code style errors detected
  Error: Expected semicolons, found 12 violations

- unit-tests-backend: 3 test failures
  Error: TypeError: Cannot read property 'foo' of undefined

Please fix these issues:
1. Add missing semicolons in affected files
2. Fix the undefined property access in the failing tests
3. Re-run validation to verify fixes

Previous attempt duration: 45.2s
`
```

## Configuration via API

### Get Current Settings
```bash
GET /api/settings
```

Response includes:
```json
{
  "validation": {
    "maxAttempts": 3,
    "stages": [...],
    ...
  }
}
```

### Update Max Attempts
```bash
PUT /api/settings
Content-Type: application/json

{
  "validation": {
    "maxAttempts": 5
  }
}
```

**Validation Rules**:
- Must be a number
- Minimum: 1
- Maximum: 10
- Invalid values will be rejected with a 400 error

## Usage in Claude Workers

### Orchestrator Configuration
When starting a Claude worker via the orchestrator:

```typescript
POST /api/orchestrator/start
{
  "prompt": "Fix the failing tests",
  "maxTaskRetries": 3,  // Same as validation.maxAttempts
  "enableValidation": true,
  "validationTimeout": 300000
}
```

### Worker Creation
When creating workers via `/api/claude-workers`:

```typescript
POST /api/claude-workers
{
  "taskId": "CODEGOAT-001",
  "taskContent": "Add authentication",
  "validationEnabled": true,
  "maxValidationRetries": 3  // Uses settings.validation.maxAttempts
}
```

## Monitoring Retry Attempts

### Via Worker Status
```bash
GET /api/claude-workers/:workerId
```

Response includes validation attempt tracking:
```json
{
  "id": "worker-123",
  "status": "validating",
  "validationRuns": 2,  // Current attempt number
  "validationHistory": [
    {
      "attempt": 1,
      "success": false,
      "timestamp": "2025-11-02T10:00:00Z",
      "failedStages": ["lint", "unit-tests"],
      "feedback": "Fix linting errors..."
    },
    {
      "attempt": 2,
      "success": true,
      "timestamp": "2025-11-02T10:15:00Z"
    }
  ]
}
```

### Via Validation Runs API
```bash
GET /api/validation-runs
```

Shows all validation attempts with detailed stage results.

## Best Practices

### Recommended Settings

**Development** (Fast iteration):
```json
{
  "validation": {
    "maxAttempts": 2,  // Quick feedback loop
    "stages": [/* Enable only critical stages */]
  }
}
```

**CI/CD** (Thorough validation):
```json
{
  "validation": {
    "maxAttempts": 5,  // More chances to fix issues
    "stages": [/* All stages enabled */]
  }
}
```

**Production** (Strict quality):
```json
{
  "validation": {
    "maxAttempts": 1,  // No retries, must be perfect
    "strictMode": true
  }
}
```

### Performance Considerations

- **Higher maxAttempts** = More chances to fix issues, but longer total time
- **Lower maxAttempts** = Faster feedback, but may fail on complex issues
- Each retry includes full validation pipeline execution
- Average retry time: 30-120 seconds depending on enabled stages

### Cost Considerations

Each retry attempt:
- Spawns a new Claude Code subprocess
- Executes the full validation pipeline
- Consumes API credits (if using Claude API)
- Generates logs and metrics

Recommended: Start with `maxAttempts: 3` and adjust based on:
- Your validation pipeline complexity
- Average fix time for typical failures
- API cost tolerance

## Troubleshooting

### Issue: Too Many Retries Without Success
**Symptoms**: Worker keeps retrying but never passes validation

**Solutions**:
1. Check validation stage configurations - are timeouts too short?
2. Review validation feedback - is Claude receiving clear error messages?
3. Reduce `maxAttempts` temporarily to fail faster
4. Check if specific stages always fail - disable or fix them

### Issue: Not Enough Retry Attempts
**Symptoms**: Worker fails before fixing all issues

**Solutions**:
1. Increase `maxAttempts` to 5 or higher
2. Review failed stages - are they too strict?
3. Enable `continueOnFailure` for non-critical stages
4. Provide clearer task descriptions to Claude

### Issue: Validation Feedback Not Clear
**Symptoms**: Claude retries but makes wrong fixes

**Solutions**:
1. Improve validation stage error messages
2. Add stage descriptions in settings
3. Review validation logs for clarity
4. Consider custom feedback generation

## Advanced Features

### Conditional Retry Logic
The system automatically adjusts retry behavior based on:
- **Transient failures** (network, timeouts): Retry immediately
- **Code errors** (lint, tests): Provide detailed feedback
- **Permission errors**: Skip retry, fail immediately
- **Timeout errors**: Increase timeout on retry

### Retry Budget Management
Workers track retry "budget":
```typescript
{
  "retriesRemaining": 2,  // Out of maxAttempts: 3
  "retriesUsed": 1,
  "estimatedTimeRemaining": "4-8 minutes"
}
```

### Smart Feedback Generation
The system analyzes failure patterns:
- Repeated failures on same stage → More detailed guidance
- New failures on retry → Highlight regression
- Partial progress → Encourage continuation
- No progress → Suggest different approach

## Metrics & Analytics

### Retry Success Rate
Track via `/api/analytics/validation-metrics`:
```json
{
  "retryMetrics": {
    "totalRetries": 145,
    "successfulRetries": 98,
    "successRate": 67.6,
    "averageAttemptsToSuccess": 2.1
  }
}
```

### Stage-Specific Retry Patterns
Identify which stages cause most retries:
```json
{
  "stageRetryRates": {
    "lint": { "retries": 12, "successRate": 91.7 },
    "unit-tests": { "retries": 45, "successRate": 73.3 },
    "e2e-tests": { "retries": 8, "successRate": 62.5 }
  }
}
```

## Future Enhancements

Planned improvements:
- [ ] Adaptive retry limits based on historical success rates
- [ ] Smart timeout adjustment on retries
- [ ] Retry budget pooling across multiple workers
- [ ] Machine learning-based feedback optimization
- [ ] Retry pause/resume functionality
- [ ] Retry cost estimation and limits

## Summary

The validation retry system is a powerful feature that:
✅ Automatically fixes validation failures
✅ Provides intelligent feedback to Claude
✅ Configurable retry limits (1-10 attempts)
✅ Tracks all retry attempts with detailed logs
✅ Optimizes development workflow

**Current Configuration**: `maxAttempts: 3` (Default)
**Recommendation**: Keep at 3 for most use cases, adjust based on your needs
**UI Access**: Settings → Stage Management (coming soon)
