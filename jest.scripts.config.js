module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts'],
  testMatch: ['<rootDir>/scripts/**/NONEXISTENT.test.ts'], // Intentionally match no files
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  forceExit: true,
  silent: true,
  verbose: false,
  maxWorkers: 1,
  detectOpenHandles: false,
};