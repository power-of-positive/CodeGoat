# API E2E Tests

## Known Issues

### Memory Issue with Direct Import
The original test file `validation-analytics-api.spec.ts` experiences memory issues when directly importing the Express app due to:
1. Multiple PrismaClient instances being created (fixed)
2. Circular dependencies in module imports
3. Large buffer output during test execution

### Workaround
Use the `run-tests-with-server.sh` script which:
1. Builds the project
2. Starts the server as a separate process
3. Runs the tests against the running server
4. Cleans up the server process

### Running Tests
```bash
# Run with the workaround script
./run-tests-with-server.sh

# Or run simplified test
NODE_ENV=test npx jest simple-test.spec.ts
```

## TODO
- Investigate and fix the root cause of memory issues with direct app import
- Consider using supertest with a test server instance instead of pactum
- Implement proper test isolation and cleanup