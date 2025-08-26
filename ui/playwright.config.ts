import { defineConfig, devices } from '@playwright/test';

// Dynamic port detection for better server management
const FRONTEND_PORT = process.env.FRONTEND_PORT || process.env.VITE_PORT || '5173';
const BACKEND_PORT = process.env.BACKEND_PORT || '3001';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/api-integration-pactum.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Use single worker for better test stability
  maxFailures: process.env.CI ? 5 : undefined, // Allow up to 5 failures in CI
  reporter: 'html',
  timeout: 30 * 1000, // 30 seconds per test - increased for stability
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    // Ignore HTTPS errors and other connection issues
    ignoreHTTPSErrors: true,
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

  // Simplified: No automatic server management
  // Tests assume servers are already running or use mocked endpoints
  webServer: undefined,
});
