module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  // Exclude E2E tests from default test run (they need a running server)
  testPathIgnorePatterns: [
    'node_modules',
    'tests/.*\\.test\\.ts$',  // Exclude E2E tests in tests/ directory
    'tests/routes/.*\\.e2e\\.test\\.ts$',  // Exclude E2E route tests
    'tests/api-e2e/.*',  // Exclude api-e2e tests (they use Vitest, not Jest)
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Exclude main entry point from coverage
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: false,
  maxWorkers: 1,
  bail: false,
};