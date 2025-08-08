# Test Utilities

This directory contains common mock utilities that can be reused across test files to reduce duplication.

## Usage

```typescript
import { createMockLogger, createMockConfigLoader } from './test-utils';

describe('My Test', () => {
  const mockLogger = createMockLogger();
  const mockConfigLoader = createMockConfigLoader();
  
  // Use in tests...
});
```

## Available Utilities

- **createMockLogger()** - Mock ILogger interface
- **createMockConfigLoader()** - Mock ConfigLoader with all methods
- **createMockRequest(overrides?)** - Mock Express Request object
- **createMockResponse()** - Mock Express Response object  
- **createMockNext()** - Mock Express NextFunction
- **createMockAxios()** - Mock axios with isAxiosError
- **createMockFs()** - Mock fs module with common implementations
- **createMockFetch()** - Mock global fetch function

## Notes

These utilities provide a starting point for common mocks but may need customization for specific test cases. Existing tests have not been modified to preserve their specific mock implementations and avoid breaking changes.