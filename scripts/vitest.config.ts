import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/**/*.{test,spec}.{ts,js}'],
    // Performance tracking
    reporters: ['verbose'],
    logHeapUsage: true,
    exclude: [
      // Exclude tests that cause infinite recursion during coverage
      'lib/coverage-analysis.test.ts',
      'lib/coverage-analysis-errors.test.ts',
      '**/node_modules/**',
      '**/dist/**',
    ],
    // Use single thread to avoid mock interference between tests
    // TODO: Investigate parallel execution after isolating module mocks
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: true,
        // Optimize memory usage
        minThreads: 1,
        maxThreads: 1,
      },
    },
    // Set environment variables to prevent dotenv config loading issues
    env: {
      NODE_ENV: 'test',
      // Prevent dotenv from trying to load undefined paths
      DOTENV_CONFIG_PATH: '',
      // Skip coverage if already running to prevent recursion
      SKIP_COVERAGE: process.env.RUNNING_COVERAGE === 'true' ? 'true' : 'false',
    },
    coverage: {
      provider: 'v8',
      // Only output essential reports
      reporter: ['text'],
      // Include all lib files for coverage
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.{test,spec}.{ts,js}',
        'lib/**/*.d.ts',
        // Exclude files that cause recursion or memory issues during coverage
        'lib/coverage-analysis.ts',
        'lib/utils/review-processor.test.ts',
        'lib/precommit-llm.test.ts',
        'lib/review-processor.test.ts',
        'lib/precommit/precommit-handler.test.ts',
      ],
      thresholds: {
        // Global thresholds - temporarily reduced for large refactoring
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
      all: false,
      skipFull: true,
      clean: true,
      // More aggressive memory optimization
      processingConcurrency: 1,
      reportsDirectory: './coverage',
    },
  },
});
