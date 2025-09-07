import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('dashboard initial state', async ({ page }) => {
    // Wait for the main dashboard to load
    await page.waitForSelector('[data-testid="main-content"], main, .dashboard', { 
      timeout: 10000 
    });
    
    // Take a screenshot for visual regression
    await expect(page).toHaveScreenshot('dashboard-initial.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 100
    });
  });

  test('dashboard with request logs', async ({ page }) => {
    // Navigate to workers dashboard
    await page.goto('http://localhost:5173/workers');
    
    // Wait for the workers dashboard to load
    await page.waitForSelector('[data-testid="workers-dashboard"], .workers-dashboard, main', { 
      timeout: 10000 
    });
    
    // Take a screenshot for visual regression
    await expect(page).toHaveScreenshot('dashboard-request-logs.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 100
    });
  });
});