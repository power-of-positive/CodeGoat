import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
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

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.SKIP_WEB_SERVER ? undefined : [
    {
      command: 'cd .. && npm run build && npm start',
      port: 3000,
      timeout: 120000, // 2 minutes for backend to build and start
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      port: 5174,
      timeout: 60000, // 1 minute for frontend to start
      reuseExistingServer: !process.env.CI,
    },
  ],
});