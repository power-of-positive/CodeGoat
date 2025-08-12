import { defineConfig } from 'vitest/config'
import { join } from 'path'

export default defineConfig({
  test: {
    globalSetup: [
      './setup/global-setup.ts'
    ],
    globals: true,
    hookTimeout: 20000,
    testTimeout: 10000,
    teardownTimeout: 10000,
    isolate: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      NODE_ENV: 'test',
      BACKEND_PORT: '3001',
      DATABASE_URL: '../../prisma/kanban.db',
    },
    reporters: ['basic'],
    onConsoleLog: (log, type) => {
      // Suppress noisy logs during tests
      if (log.includes('[Backend]') || log.includes('dotenv')) {
        return false
      }
      return true
    },
    // Force exit to prevent hanging
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': join(__dirname, '../../src'),
      '~': join(__dirname, './setup'),
    }
  }
})