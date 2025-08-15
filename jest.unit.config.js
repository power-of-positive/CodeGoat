module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    'node_modules',
    '<rootDir>/src/__tests__/payload-limits.test.ts', // Integration test, not unit test
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // No setup files - run tests without any global setup
  forceExit: true,
  silent: true,
  verbose: false,
  maxWorkers: 1,
  detectOpenHandles: false,
  // Suppress warnings that cause non-zero exit codes
  setupFilesAfterEnv: ['<rootDir>/jest-setup-unit.js'],
};