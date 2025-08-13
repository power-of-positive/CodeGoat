import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/api-integration-pactum.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
      // Clip screenshots to content area to avoid OS-specific chrome
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    },
    // Configure visual comparison behavior
    toMatchSnapshot: {
      threshold: 0.2,
      animations: 'disabled',
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

  webServer: process.env.SKIP_WEB_SERVER ? undefined : [
    {
      command: 'cd .. && cp .env.test .env && npm run build && npm start',
      port: 3001,
      timeout: 120000, // 2 minutes for backend to build and start
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        KANBAN_DATABASE_URL: 'file:./prisma/kanban-test.db',
      },
    },
    {
      command: 'npm run dev',
      port: 5174,
      timeout: 60000, // 1 minute for frontend to start
      reuseExistingServer: !process.env.CI,
    },
  ],
});