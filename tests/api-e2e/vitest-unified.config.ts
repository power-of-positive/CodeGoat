import { defineConfig } from 'vitest/config';
import { join } from 'path';

/**
 * Unified Vitest configuration resolving CommonJS/ESM and Jest conflicts
 */
export default defineConfig({
  test: {
    globalSetup: ['tests/api-e2e/setup/global-setup.ts'],
    globals: true,

    // Performance optimizations
    hookTimeout: 30000,
    testTimeout: 8000,
    teardownTimeout: 5000,

    // Improved isolation and parallelization
    isolate: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: Math.min(4, require('os').cpus().length),
        minThreads: 1,
      },
    },

    // Test environment optimizations
    env: {
      NODE_ENV: 'test',
      BACKEND_PORT: '3001',
      DATABASE_URL: '../../prisma/kanban.db',
      NODE_OPTIONS: '--max-old-space-size=2048 --expose-gc',
    },

    // CRITICAL: Exclude Jest-based tests to prevent framework conflicts
    exclude: [
      // Default exclusions
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      
      // Jest-specific exclusions to prevent CommonJS/ESM conflicts
      '**/shared/__tests__/**/*.test.ts',  // All shared Jest tests
      '**/shared/**/*.test.js',            // Any JS Jest tests in shared
      '**/src/__tests__/**',               // Main source Jest tests
      '**/__tests__/**',                   // Any __tests__ directories (Jest convention)
      
      // Pattern-based exclusions for Jest files
      '**/*.jest.{ts,js}',                 // Files with .jest extension
      '**/jest.*',                         // Jest config files
      
      // Specific problematic files identified
      '**/internal-routes.test.ts',        // Known Jest syntax conflicts
      '**/shared/**/utils/**/*.test.ts',   // Shared utils tests (Jest-based)
    ],

    // Include patterns - be specific about what Vitest should run
    include: [
      '**/*.{test,spec}.ts',               // TypeScript test files
      '!**/shared/**',                     // Explicitly exclude shared directory
      '!**/__tests__/**',                  // Explicitly exclude Jest __tests__ dirs
    ],

    // Optimized reporting and logging
    reporters: [
      [
        'default',
        {
          summary: false,
        },
      ],
      ['junit', { outputFile: 'test-results.xml' }],
    ],

    // Suppress noisy logs for better performance
    onConsoleLog: (log, type) => {
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
        // Jest-related suppressions
        'jest',
        'jsdom',
      ];

      if (suppressPatterns.some(pattern => log.includes(pattern))) {
        return false;
      }

      if (type === 'debug' || type === 'trace') {
        return false;
      }

      return true;
    },

    // Test execution optimization
    sequence: {
      concurrent: true,
      shuffle: false,
    },

    // Memory optimization
    maxConcurrency: 4,

    // Coverage optimization
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        'setup/**',
        'shared/**',         // Exclude shared from coverage to avoid Jest conflicts
        '__tests__/**',      // Exclude Jest test directories
      ],
    },
  },

  resolve: {
    alias: {
      '@': join(__dirname, '../../src'),
      '~': join(__dirname, './setup'),
    },
  },

  // Define globals for better performance and Jest compatibility shim
  define: {
    __TEST_ENV__: true,
    __DEV__: false,
    // Jest compatibility shims for any remaining Jest references
    'global.jest': 'undefined',
  },

  // ESM/CommonJS resolution improvements
  esbuild: {
    target: 'node18',
    format: 'esm',
  },

  // Ensure proper module resolution
  optimizeDeps: {
    include: [
      'vitest',
      'pactum',
      'better-sqlite3',
    ],
    exclude: [
      'jest',           // Prevent Jest from being optimized as a dependency
    ],
  },
});