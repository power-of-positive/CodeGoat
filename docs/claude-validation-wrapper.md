# Claude Validation Wrapper

The Claude Validation Wrapper provides an automatic quality control layer for Claude Code execution by running validation pipelines after Claude completes its work. This ensures that any changes Claude makes meet your project's quality standards.

## Features

- **Automatic Validation**: Runs validation pipeline after Claude execution
- **Configurable**: Supports custom validation settings and timeouts
- **Permission Integration**: Includes permission checking for security
- **Error Handling**: Graceful handling of validation failures
- **Multiple Modes**: Development, production, and custom configurations
- **Detailed Results**: Returns both Claude output and validation results

## Quick Start

### Basic Usage

```typescript
import { ClaudeValidationFactory } from '../src/utils/claude-validation-factory';

// Create a wrapper for development
const wrapper = ClaudeValidationFactory.createForDevelopment(
  '/path/to/your/project',
  logger
);

// Execute Claude with automatic validation
const result = await wrapper.execute('Your prompt here');

console.log('Claude output:', result.stdout);
console.log('Validation passed:', result.validationResults?.success);
```

### Production Usage

```typescript
// Create a wrapper for production with restrictive permissions
const wrapper = ClaudeValidationFactory.createForProduction(
  '/path/to/your/project',
  logger
);

const result = await wrapper.execute('Implement new feature');

if (result.exitCode === 0 && result.validationResults?.success) {
  console.log('✅ Claude execution and validation successful');
} else {
  console.log('❌ Issues detected:', {
    claudeExitCode: result.exitCode,
    validationPassed: result.validationResults?.success,
    validationError: result.validationError
  });
}
```

## Configuration Options

### Factory Methods

#### Development Configuration
```typescript
const wrapper = ClaudeValidationFactory.createForDevelopment(worktreeDir, logger);
```
- Validation enabled
- 5-minute timeout
- Development permissions (more permissive)
- Does not skip validation on Claude failure

#### Production Configuration
```typescript
const wrapper = ClaudeValidationFactory.createForProduction(worktreeDir, logger);
```
- Validation enabled
- 3-minute timeout
- Restrictive permissions
- Skips validation if Claude fails

#### No Validation
```typescript
const wrapper = ClaudeValidationFactory.createWithoutValidation(worktreeDir, logger);
```
- Validation disabled
- No permissions
- Direct Claude execution only

### Custom Configuration

```typescript
const wrapper = ClaudeValidationFactory.create({
  worktreeDir: '/path/to/project',
  claudeCommand: 'claude-code --model sonnet',
  enableValidation: true,
  validationSettings: '/path/to/custom-settings.json',
  skipValidationOnFailure: false,
  validationTimeout: 240000, // 4 minutes
  permissionMode: 'development',
  logger
});
```

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `worktreeDir` | string | required | Working directory for Claude execution |
| `claudeCommand` | string | auto-detected | Command to run Claude |
| `enableValidation` | boolean | true | Whether to run validation |
| `validationSettings` | string | auto-detected | Path to validation settings file |
| `skipValidationOnFailure` | boolean | false | Skip validation if Claude fails |
| `validationTimeout` | number | 180000ms | Timeout for validation pipeline |
| `permissionMode` | string | 'disabled' | Permission mode (restrictive/permissive/development) |

## Validation Results

The wrapper returns detailed results including both Claude output and validation information:

```typescript
interface WrappedExecutorResult {
  // Claude execution results
  stdout: string;
  stderr: string;
  exitCode: number;
  
  // Validation results
  validationResults?: {
    success: boolean;
    totalStages: number;
    passed: number;
    failed: number;
    totalTime: number;
    stages: Array<{
      id: string;
      name: string;
      success: boolean;
      duration: number;
      error?: string;
    }>;
  };
  
  // Validation metadata
  validationSkipped?: boolean;
  validationError?: string;
}
```

## Manual Validation

You can run validation without executing Claude:

```typescript
const wrapper = ClaudeValidationFactory.createForDevelopment('/path/to/project');

try {
  const results = await wrapper.runValidationOnly();
  console.log(`Validation completed: ${results.passed}/${results.totalStages} stages passed`);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

## Permission Integration

The wrapper integrates with the permission system to control what Claude can do:

```typescript
const wrapper = ClaudeValidationFactory.create({
  worktreeDir: '/path/to/project',
  permissionMode: 'restrictive' // or 'permissive', 'development'
});

// Check permissions before execution
if (!wrapper.isExecutionPermitted()) {
  console.log('Claude execution not permitted');
  return;
}

// Check specific permissions
const canReadFile = wrapper.checkPermission('FILE_READ', 'sensitive-file.json');
const canWriteFile = wrapper.checkPermission('FILE_WRITE', 'output.txt');
```

## Validation Settings

The wrapper uses the same validation settings as the main validation pipeline. Settings are auto-detected from:

1. `{worktreeDir}/settings.json`
2. `{worktreeDir}/claude-settings.json`
3. `{worktreeDir}/.claude/validation.json`
4. `{projectRoot}/settings.json`

### Example Settings File

```json
{
  "validation": {
    "stages": [
      {
        "id": "lint",
        "name": "Code Linting",
        "command": "npm run lint",
        "enabled": true,
        "continueOnFailure": false,
        "timeout": 30000,
        "priority": 0
      },
      {
        "id": "test",
        "name": "Unit Tests",
        "command": "npm test",
        "enabled": true,
        "continueOnFailure": false,
        "timeout": 60000,
        "priority": 1
      }
    ],
    "enableMetrics": true,
    "maxAttempts": 5
  }
}
```

## Error Handling

The wrapper handles various error conditions gracefully:

- **Claude execution failure**: Can optionally skip validation
- **Validation timeout**: Configurable timeout with clear error messages
- **Validation stage failure**: Detailed error information per stage
- **Permission denied**: Clear feedback on permission violations

## Advanced Usage

### Custom Claude Command

```typescript
const wrapper = ClaudeValidationFactory.create({
  worktreeDir: '/path/to/project',
  claudeCommand: 'claude-code --model gpt-4 --temperature 0.7'
});
```

### Environment-Specific Wrappers

```typescript
// Create different wrappers for different environments
const createWrapper = (env: string) => {
  switch (env) {
    case 'development':
      return ClaudeValidationFactory.createForDevelopment(process.cwd());
    case 'staging':
      return ClaudeValidationFactory.create({
        worktreeDir: process.cwd(),
        permissionMode: 'restrictive',
        skipValidationOnFailure: false,
        validationTimeout: 300000 // 5 minutes for thorough staging validation
      });
    case 'production':
      return ClaudeValidationFactory.createForProduction(process.cwd());
    default:
      return ClaudeValidationFactory.createWithoutValidation(process.cwd());
  }
};
```

### Integration with CI/CD

```typescript
// In your CI/CD pipeline
const wrapper = ClaudeValidationFactory.create({
  worktreeDir: process.env.CI_PROJECT_DIR,
  enableValidation: true,
  skipValidationOnFailure: false,
  validationTimeout: 600000, // 10 minutes for CI
  permissionMode: 'restrictive'
});

const result = await wrapper.execute(process.env.CLAUDE_PROMPT);

if (!result.validationResults?.success) {
  console.error('❌ Validation failed in CI');
  process.exit(1);
}
```

## Best Practices

1. **Use appropriate modes**: Development for local work, production for deployments
2. **Set reasonable timeouts**: Balance thoroughness with execution time
3. **Handle errors gracefully**: Check both Claude and validation results
4. **Log comprehensively**: Use the logger for debugging and monitoring
5. **Test your configuration**: Use `runValidationOnly()` to test validation setup
6. **Secure sensitive operations**: Use restrictive permissions for production
7. **Monitor validation metrics**: Track validation success rates over time

## Troubleshooting

### Common Issues

1. **Validation timeout**: Increase `validationTimeout` or optimize validation stages
2. **Permission denied**: Check permission mode and rules
3. **Claude command not found**: Specify full path in `claudeCommand`
4. **Settings file not found**: Provide explicit path in `validationSettings`

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
const wrapper = ClaudeValidationFactory.create({
  worktreeDir: '/path/to/project',
  logger: yourLogger // Make sure logger is configured with debug level
});
```

The wrapper provides detailed logging for:
- Wrapper initialization
- Permission checks
- Validation pipeline execution
- Error conditions
- Performance metrics