import { test, expect } from '@playwright/test';

test.describe('Basic Smoke Tests', () => {
  test('should load the application successfully', async ({ page }) => {
    // Navigate to the root
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Just verify the page loads without errors
    await expect(page).toHaveTitle(/Vite \+ React \+ TS/);
    
    // Verify we have the React root div
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should have the basic HTML structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for HTML elements
    const html = page.locator('html');
    await expect(html).toBeVisible();
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});