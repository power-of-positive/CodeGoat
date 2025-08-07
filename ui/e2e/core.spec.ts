import { test, expect } from '@playwright/test';

test.describe('Core Functionality Tests', () => {
  test('API endpoints are accessible and working', async ({ request }) => {
    // Test models endpoint
    const modelsResponse = await request.get('http://localhost:3000/api/management/models');
    expect(modelsResponse.ok()).toBeTruthy();
    const modelsData = await modelsResponse.json();
    expect(modelsData.models).toBeDefined();
    expect(modelsData.models.length).toBe(7); // We have 7 models in config.yaml
    
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
    expect(['healthy', 'error']).toContain(testData.status);
    
    // Test the delete endpoint
    const deleteResponse = await request.delete('http://localhost:3000/api/management/models/0');
    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBe(true);
    expect(deleteData.deletedModelId).toBe('0');
  });

  test('UI loads and displays models from backend', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Verify the model list container is visible
    await expect(page.locator('.bg-white.shadow.rounded-lg.overflow-hidden')).toBeVisible();
    
    // Verify we have the expected number of models displayed
    const modelCards = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div');
    await expect(modelCards).toHaveCount(7);
    
    // Verify each model has the required buttons
    for (let i = 0; i < 7; i++) {
      const modelCard = modelCards.nth(i);
      await expect(modelCard.getByRole('button', { name: /test/i })).toBeVisible();
      await expect(modelCard.getByRole('button', { name: /edit/i })).toBeVisible();
      await expect(modelCard.getByRole('button', { name: /delete/i })).toBeVisible();
    }
  });

  test('test button makes API calls', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/management/test/') && response.status() === 200
    );
    
    // Click the first test button
    const firstTestButton = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').first()
      .getByRole('button', { name: /test/i });
    
    await firstTestButton.click();
    
    // Verify API call was made successfully
    const response = await responsePromise;
    const responseData = await response.json();
    
    expect(responseData).toHaveProperty('modelId');
    expect(responseData).toHaveProperty('status');
    expect(['healthy', 'error']).toContain(responseData.status);
  });

  test('delete button makes API calls', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Mock the confirm dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/management/models/') && 
      response.request().method() === 'DELETE'
    );
    
    // Click delete on first model
    const firstDeleteButton = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').first()
      .getByRole('button', { name: /delete/i });
    
    await firstDeleteButton.click();
    
    // Verify API call was made successfully
    const response = await responsePromise;
    const responseData = await response.json();
    
    expect(responseData.success).toBe(true);
  });

  test('add model dialog opens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click Add Model button
    await page.getByRole('button', { name: /add model/i }).click();
    
    // Check dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add New Model')).toBeVisible();
  });

  test('server status section is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check server status section exists
    await expect(page.getByText('Server Status')).toBeVisible();
  });

  test('page maintains state after refresh', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Count initial models
    const initialCount = await page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').count();
    expect(initialCount).toBe(7);
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Count should be the same
    const afterRefreshCount = await page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div').count();
    expect(afterRefreshCount).toBe(initialCount);
  });
});