module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts'],
  testMatch: ['<rootDir>/scripts/**/*.test.ts', '<rootDir>/scripts/**/*.test.js'],
  collectCoverageFrom: [
    'scripts/**/*.ts',
    'scripts/**/*.js',
    '!scripts/**/*.test.ts',
    '!scripts/**/*.test.js',
    '!scripts/**/*.d.ts',
  ],
  coverageDirectory: 'coverage/scripts',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  forceExit: true,
  silent: true,
  verbose: false,
  maxWorkers: 1,
  detectOpenHandles: false,
};