module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testPathIgnorePatterns: [
    'node_modules',
    'tests/api-e2e',
    'ui',
    // Exclude ALL server-dependent integration tests that require running server
    'tests/fallback-behavior.test.ts',
    'tests/payload-handling.test.ts', 
    'tests/comprehensive.test.ts',
    'tests/validation-e2e.test.ts',
    'tests/api-endpoints.test.ts',
    'tests/e2e.test.ts',
    'tests/request-logging.test.ts',
    'tests/routes/api-settings.e2e.test.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: false,
  maxWorkers: 1,
};