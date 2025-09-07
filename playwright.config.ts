import { defineConfig, devices } from '@playwright/test';

const GLOBAL_TIMEOUT_SECONDS = 120;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './ui/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Fail the build if you accidentally left test.skip in the source code. */
  forbidSkip: true,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Optimize parallel workers for better performance */
  workers: process.env.CI ? 2 : 6,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only on failure */
    screenshot: 'only-on-failure',

    /* Record video only on failure */
    video: 'retain-on-failure',

    /* Ignore HTTPS errors for local development */
    ignoreHTTPSErrors: true,

    /* Wait for network idle before proceeding */
    actionTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Enable headless mode for faster execution */
        headless: true,
        /* Optimize viewport */
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./ui/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./ui/e2e/global-teardown.ts'),

  /* Global test timeout */
  timeout: GLOBAL_TIMEOUT_SECONDS * 1000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 15 * 1000,
  },

  /* Web server configuration - Playwright automatically manages server lifecycle */
  webServer: [
    {
      command: 'npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'e2e-test',
        KANBAN_DATABASE_URL: 'file:./prisma/kanban-test.db',
        DATABASE_URL: 'file:./prisma/kanban-test.db',
        AI_REVIEWER_ENABLED: 'false',
        LOG_LEVEL: 'error',
        PORT: '3001',
      },
    },
    {
      command: 'cd ui && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        VITE_API_URL: 'http://localhost:3001',
      },
    },
  ],
});
