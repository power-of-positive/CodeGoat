import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/api-integration-pactum.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Use single worker for better test stability
  maxFailures: process.env.CI ? 5 : undefined, // Allow up to 5 failures in CI
  reporter: 'html',
  timeout: 30 * 1000, // 30 seconds per test
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },

  // Visual regression testing configuration
  expect: {
    // Configure screenshot comparison
    toHaveScreenshot: {
      // Threshold for pixel differences (0.0 = identical, 1.0 = completely different)
      threshold: 0.3,
      // Animation handling
      animations: 'disabled',
    },
    // Configure visual comparison behavior
    toMatchSnapshot: {
      threshold: 0.2,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual regression testing
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer:
    process.env.SKIP_WEB_SERVER || process.env.CI
      ? undefined
      : [
          {
            command: 'cd .. && npm run build && npm start',
            port: 3000,
            timeout: 60000, // 1 minute for backend to build and start
            reuseExistingServer: true,
            env: {
              NODE_ENV: 'test',
            },
          },
          {
            command: 'npm run dev',
            port: 5174,
            timeout: 60000, // 1 minute for frontend to start
            reuseExistingServer: true,
          },
        ],
});
