module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'scripts',
  testMatch: ['<rootDir>/lib/**/*.{test,spec}.{ts,js}'],
  testPathIgnorePatterns: [
    'node_modules',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // Enable ES modules support
        module: 'commonjs',
        target: 'es2020',
      },
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/../jest-setup-scripts.js'],
  forceExit: true,
  silent: false,
  verbose: true,
  maxWorkers: 1,
  detectOpenHandles: true,
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.{test,spec}.{ts,js}',
    '!lib/**/*.d.ts',
  ],
  coverageDirectory: '../coverage/scripts',
  coverageReporters: ['text', 'text-summary', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};