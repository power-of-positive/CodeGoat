import { test, expect } from '@playwright/test';

test.describe('User Interactions Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('test button makes API calls and handles responses', async ({ page }) => {
    // Set up response listener for our management API
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/management/test/') && response.status() === 200
    );
    
    // Click the first test button
    const firstTestButton = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').first()
      .getByRole('button', { name: /test/i });
    
    await firstTestButton.click();
    
    // Verify our management API was called and returns real test results
    const response = await responsePromise;
    const responseData = await response.json();
    
    expect(responseData).toHaveProperty('modelId');
    expect(responseData).toHaveProperty('status');
    expect(responseData).toHaveProperty('responseTime');
    expect(responseData).toHaveProperty('testedAt');
    expect(responseData).toHaveProperty('model');
    expect(typeof responseData.responseTime).toBe('number');
    expect(['healthy', 'error']).toContain(responseData.status);
    
    // If it's an error (which it likely will be), validate error structure
    if (responseData.status === 'error') {
      expect(responseData.error).toBeDefined();
      expect(typeof responseData.error).toBe('string');
    }
  });

  test('delete button shows confirmation dialog', async ({ page }) => {
    // Mock the confirm dialog to test it shows up
    let dialogShown = false;
    page.on('dialog', dialog => {
      dialogShown = true;
      dialog.dismiss(); // Dismiss to avoid actual deletion
    });
    
    // Click the first delete button
    const firstDeleteButton = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').first()
      .getByRole('button', { name: /delete/i });
    
    await firstDeleteButton.click();
    
    // Verify confirmation dialog was shown
    expect(dialogShown).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page, context }) => {
    // Intercept API calls and return error
    await context.route('**/api/management/models', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for the error to show up and check for error message
    await page.waitForTimeout(2000);
    await expect(page.getByText('Failed to load models')).toBeVisible();
  });

});