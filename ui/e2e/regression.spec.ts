import { test, expect } from '@playwright/test';

test.describe('Regression Tests', () => {
  test('should always display models from backend', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Verify API calls are made
    const modelsResponse = await page.waitForResponse(
      response => response.url().includes('/api/management/models') && response.status() === 200,
      { timeout: 10000 }
    );
    
    const modelsData = await modelsResponse.json();
    expect(modelsData.models).toBeDefined();
    expect(modelsData.models.length).toBeGreaterThan(0);
    
    // Verify models are displayed in UI
    const modelCards = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div');
    await expect(modelCards).toHaveCount(modelsData.models.length);
  });

  test('test button should trigger API call', async ({ page }) => {
    await page.goto('/');
    
    // Wait for models to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.bg-white.shadow.rounded-lg.overflow-hidden');
    
    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/management/test/') && response.status() === 200
    );
    
    // Click the first test button
    const testButton = page.locator('button:has-text("Test")').first();
    await testButton.click();
    
    // Verify API call was made
    const response = await responsePromise;
    const responseData = await response.json();
    
    expect(responseData).toHaveProperty('modelId');
    expect(responseData).toHaveProperty('status');
    expect(['healthy', 'error']).toContain(responseData.status);
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
    
    // Should show error message
    await expect(page.getByText('Failed to load models')).toBeVisible();
  });

  test('should maintain UI state after refresh', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.bg-white.shadow.rounded-lg.overflow-hidden');
    
    // Count initial models
    const initialCount = await page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').count();
    
    // Refresh the page
    await page.reload();
    
    // Wait for models to load again
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.bg-white.shadow.rounded-lg.overflow-hidden');
    
    // Count should be the same
    const afterRefreshCount = await page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').count();
    expect(afterRefreshCount).toBe(initialCount);
  });

  test('API endpoints should be accessible', async ({ request }) => {
    // Test models endpoint
    const modelsResponse = await request.get('http://localhost:3000/api/management/models');
    expect(modelsResponse.ok()).toBeTruthy();
    const modelsData = await modelsResponse.json();
    expect(modelsData.models).toBeDefined();
    
    // Test status endpoint
    const statusResponse = await request.get('http://localhost:3000/api/management/status');
    expect(statusResponse.ok()).toBeTruthy();
    const statusData = await statusResponse.json();
    expect(statusData.status).toBe('healthy');
    
    // Test the test endpoint
    const testResponse = await request.post('http://localhost:3000/api/management/test/0');
    expect(testResponse.ok()).toBeTruthy();
    const testData = await testResponse.json();
    expect(testData.modelId).toBe('0');
    
    // Test the delete endpoint
    const deleteResponse = await request.delete('http://localhost:3000/api/management/models/0');
    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBe(true);
  });
});