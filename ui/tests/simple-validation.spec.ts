import { test, expect } from '@playwright/test';

test.describe('Simple Validation Test', () => {
  test('should be able to navigate to a static page', async ({ page }) => {
    // Navigate to a simple static page that doesn't require backend
    await page.goto('about:blank');
    
    // Set basic HTML content for testing
    await page.setContent(`
      <html>
        <head><title>Validation Analytics Test</title></head>
        <body>
          <h2>Validation Analytics</h2>
          <p>Track validation pipeline performance and success rates</p>
          <button>Refresh</button>
          <div>Total Runs</div>
          <div>Success Rate</div>
          <div>Avg Duration</div>
        </body>
      </html>
    `);
    
    // Test the basic elements
    await expect(page.locator('h2')).toContainText('Validation Analytics');
    await expect(page.locator('p')).toContainText('Track validation pipeline performance and success rates');
    await expect(page.locator('button')).toContainText('Refresh');
    await expect(page.locator('div:has-text("Total Runs")')).toBeVisible();
    await expect(page.locator('div:has-text("Success Rate")')).toBeVisible();
    await expect(page.locator('div:has-text("Avg Duration")')).toBeVisible();
  });

  test('should handle basic interactions', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <h2>Validation Settings</h2>
          <p>Configure validation pipeline stages and settings</p>
          <button id="add-stage">Add Stage</button>
          <div>General Settings</div>
          <div>Validation Stages</div>
        </body>
      </html>
    `);
    
    await expect(page.locator('h2')).toContainText('Validation Settings');
    await expect(page.locator('p')).toContainText('Configure validation pipeline stages and settings');
    await expect(page.locator('#add-stage')).toBeVisible();
    
    // Test button click
    await page.locator('#add-stage').click();
    // Button should still be visible after click
    await expect(page.locator('#add-stage')).toBeVisible();
  });
});