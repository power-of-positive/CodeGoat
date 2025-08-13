import { defineConfig } from 'vitest/config';
import { join } from 'path';

/**
 * Optimized Vitest configuration for E2E tests performance
 */
export default defineConfig({
  test: {
    globalSetup: ['./setup/global-setup.ts'],
    globals: true,

    // Performance optimizations
    hookTimeout: 30000, // Increased for setup/teardown
    testTimeout: 8000, // Reduced from 10000ms
    teardownTimeout: 5000, // Reduced from 10000ms

    // Improved isolation and parallelization
    isolate: false, // Faster execution with shared context
    pool: 'threads', // Use threads instead of forks for better performance
    poolOptions: {
      threads: {
        singleThread: false, // Enable parallel execution
        maxThreads: Math.min(4, require('os').cpus().length), // Limit threads
        minThreads: 1,
      },
    },

    // Test environment optimizations
    env: {
      NODE_ENV: 'test',
      BACKEND_PORT: '3001',
      DATABASE_URL: '../../prisma/kanban.db',
      // Optimize Node.js performance
      NODE_OPTIONS: '--max-old-space-size=2048 --expose-gc',
    },

    // Optimized reporting and logging
    reporters: [
      [
        'default',
        {
          summary: false, // Disable summary for faster execution
        },
      ],
      ['junit', { outputFile: 'test-results.xml' }], // For CI/CD integration
    ],

    // Suppress noisy logs for better performance
    onConsoleLog: (log, type) => {
      // Suppress common noisy logs that slow down test execution
      const suppressPatterns = [
        '[Backend]',
        'dotenv',
        'winston',
        'prisma:query',
        'prisma:info',
        'Socket.IO',
        'WebSocket',
        'HTTP',
        'Express',
      ];

      if (suppressPatterns.some(pattern => log.includes(pattern))) {
        return false;
      }

      // Suppress debug and trace level logs
      if (type === 'debug' || type === 'trace') {
        return false;
      }

      return true;
    },

    // Performance monitoring
    passWithNoTests: true,

    // Test execution optimization
    sequence: {
      concurrent: true, // Enable concurrent test execution
      shuffle: false, // Deterministic execution for better debugging
    },

    // Memory optimization
    maxConcurrency: 4, // Limit concurrent tests to avoid memory pressure

    // Coverage optimization (disable during regular testing for speed)
    coverage: {
      enabled: false, // Enable only when needed
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: ['node_modules/**', 'dist/**', 'coverage/**', '**/*.d.ts', 'setup/**'],
    },
  },

  resolve: {
    alias: {
      '@': join(__dirname, '../../src'),
      '~': join(__dirname, './setup'),
    },
  },

  // Define globals for better performance
  define: {
    __TEST_ENV__: true,
    __DEV__: false,
  },
});
