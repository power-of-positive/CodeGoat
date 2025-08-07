import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('API endpoints are accessible and working', async ({ request }) => {
    // Test models endpoint
    const modelsResponse = await request.get('http://localhost:3000/api/management/models');
    expect(modelsResponse.ok()).toBeTruthy();
    const modelsData = await modelsResponse.json();
    expect(modelsData.models).toBeDefined();
    expect(modelsData.models.length).toBeGreaterThanOrEqual(8); // At least 8 default models
    
    // Test status endpoint
    const statusResponse = await request.get('http://localhost:3000/api/management/status');
    expect(statusResponse.ok()).toBeTruthy();
    const statusData = await statusResponse.json();
    expect(statusData.status).toBe('healthy');
  });

  test('test endpoint validates model existence', async ({ request }) => {
    // Test with invalid model ID
    const response = await request.post('http://localhost:3000/api/management/test/999');
    expect(response.status()).toBe(404);
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Model not found');
  });

  test('test endpoint returns consistent response structure', async ({ request }) => {
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

  test('model CRUD operations work correctly', async ({ request }) => {
    // Test add model
    const addResponse = await request.post('http://localhost:3000/api/management/models', {
      data: {
        name: 'test-model-for-delete',
        model: 'test/delete-model',
        apiKey: 'test-key',
        provider: 'openrouter'
      }
    });
    expect(addResponse.ok()).toBeTruthy();
    const addData = await addResponse.json();
    expect(addData.success).toBe(true);
    const newModelId = addData.model.id;
    
    // Test delete model with the user-added model
    const deleteResponse = await request.delete(`http://localhost:3000/api/management/models/${newModelId}`);
    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBe(true);
  });

  test('models endpoint returns real model data from config', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/management/models');
    expect(response.ok()).toBeTruthy();
    
    const modelsData = await response.json();
    
    expect(modelsData.models).toBeDefined();
    expect(modelsData.models.length).toBeGreaterThanOrEqual(8); // At least 8 default models
    
    // Validate first model structure
    const firstModel = modelsData.models[0];
    expect(firstModel).toHaveProperty('id');
    expect(firstModel).toHaveProperty('name');
    expect(firstModel).toHaveProperty('model');
    expect(firstModel).toHaveProperty('provider');
    expect(firstModel).toHaveProperty('baseUrl');
    expect(['healthy', 'error', 'untested']).toContain(firstModel.status);
    expect(firstModel).toHaveProperty('enabled', true);
    
    // Validate it contains real model data from config.yaml
    expect(firstModel.name).toContain('kimi');
    expect(firstModel.model).toContain('openrouter');
  });
});