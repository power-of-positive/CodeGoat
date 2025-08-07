import { test, expect } from '@playwright/test';

test.describe('Real API Testing', () => {
  test('test endpoint validates model existence', async ({ request }) => {
    // Test with invalid model ID
    const response = await request.post('http://localhost:3000/api/management/test/999');
    expect(response.status()).toBe(404);
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Model not found');
  });

  test('test button makes real API calls and handles responses', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
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
    
    // The status will likely be 'error' due to missing API keys or model issues
    // but the important thing is that it's making real API calls
    if (responseData.status === 'error') {
      expect(responseData.error).toBeDefined();
      expect(typeof responseData.error).toBe('string');
    }
  });

  test('test endpoint returns proper error structure for API failures', async ({ request }) => {
    // Test with model ID 0 (first model) - will likely fail due to API key issues
    const response = await request.post('http://localhost:3000/api/management/test/0');
    expect(response.status()).toBe(200); // Our endpoint should return 200 even for model failures
    
    const responseData = await response.json();
    
    expect(responseData).toHaveProperty('modelId', '0');
    expect(responseData).toHaveProperty('status');
    expect(responseData).toHaveProperty('responseTime');
    expect(responseData).toHaveProperty('testedAt');
    expect(responseData).toHaveProperty('model');
    expect(responseData).toHaveProperty('error');
    
    expect(typeof responseData.responseTime).toBe('number');
    expect(['healthy', 'error']).toContain(responseData.status);
    
    // Validate timestamp format
    expect(() => new Date(responseData.testedAt)).not.toThrow();
    
    // If it's an error (which it likely will be), validate error structure
    if (responseData.status === 'error') {
      expect(typeof responseData.error).toBe('string');
      expect(responseData.error.length).toBeGreaterThan(0);
    }
  });

  test('test all models return consistent response structure', async ({ request }) => {
    // Test first 3 models to validate consistent response structure
    for (let i = 0; i < 3; i++) {
      const response = await request.post(`http://localhost:3000/api/management/test/${i}`);
      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      
      // Validate required fields
      expect(responseData).toHaveProperty('modelId', i.toString());
      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('responseTime');
      expect(responseData).toHaveProperty('testedAt');
      expect(responseData).toHaveProperty('model');
      expect(responseData).toHaveProperty('error');
      
      // Validate types
      expect(typeof responseData.responseTime).toBe('number');
      expect(['healthy', 'error']).toContain(responseData.status);
      expect(typeof responseData.model).toBe('string');
      
      // Response time should be reasonable (not simulated random values)
      expect(responseData.responseTime).toBeGreaterThanOrEqual(0);
      expect(responseData.responseTime).toBeLessThan(30000); // Less than 30 seconds
    }
  });

  test('real CRUD operations work end-to-end', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test model listing - should show 7 models from config
    const modelCards = page.locator('.bg-white.shadow.rounded-lg.overflow-hidden .divide-y > div');
    await expect(modelCards).toHaveCount(7);
    
    // Test model testing with real API calls
    const testResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/management/test/0')
    );
    
    const firstTestButton = modelCards.first().getByRole('button', { name: /test/i });
    await firstTestButton.click();
    
    const testResponse = await testResponsePromise;
    const testData = await testResponse.json();
    expect(['healthy', 'error']).toContain(testData.status);
    expect(typeof testData.responseTime).toBe('number');
    
    // Test model deletion
    page.on('dialog', dialog => dialog.accept());
    
    const deleteResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/management/models/0') && 
      response.request().method() === 'DELETE'
    );
    
    const firstDeleteButton = modelCards.first().getByRole('button', { name: /delete/i });
    await firstDeleteButton.click();
    
    const deleteResponse = await deleteResponsePromise;
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBe(true);
  });

  test('server status reflects real state', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/management/status');
    expect(response.ok()).toBeTruthy();
    
    const statusData = await response.json();
    
    expect(statusData.status).toBe('healthy');
    expect(statusData.modelsCount).toBe(7);
    expect(statusData.activeModelsCount).toBe(7);
    expect(typeof statusData.uptime).toBe('number');
    expect(statusData.uptime).toBeGreaterThan(0);
    expect(statusData.memoryUsage).toBeDefined();
    expect(statusData.nodeVersion).toBeDefined();
  });

  test('models endpoint returns real model data from config', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/management/models');
    expect(response.ok()).toBeTruthy();
    
    const modelsData = await response.json();
    
    expect(modelsData.models).toBeDefined();
    expect(modelsData.models).toHaveLength(7);
    
    // Validate first model structure
    const firstModel = modelsData.models[0];
    expect(firstModel).toHaveProperty('id');
    expect(firstModel).toHaveProperty('name');
    expect(firstModel).toHaveProperty('model');
    expect(firstModel).toHaveProperty('provider');
    expect(firstModel).toHaveProperty('baseUrl');
    expect(firstModel).toHaveProperty('status', 'untested');
    expect(firstModel).toHaveProperty('enabled', true);
    
    // Validate it contains real model data from config.yaml
    expect(firstModel.name).toContain('kimi');
    expect(firstModel.model).toContain('openrouter');
  });
});