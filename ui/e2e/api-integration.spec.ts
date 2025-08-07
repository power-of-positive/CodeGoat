import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('API endpoints are accessible and working', async ({ request }) => {
    // Test models endpoint
    const modelsResponse = await request.get('http://localhost:3000/api/management/models');
    expect(modelsResponse.ok()).toBeTruthy();
    const modelsData = await modelsResponse.json();
    expect(modelsData.models).toBeDefined();
    expect(modelsData.models).toHaveLength(8);
    
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

  test('server status reflects real state', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/management/status');
    expect(response.ok()).toBeTruthy();
    
    const statusData = await response.json();
    
    expect(statusData.status).toBe('healthy');
    expect(statusData.modelsCount).toBe(8);
    expect(statusData.activeModelsCount).toBe(8);
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
    expect(modelsData.models).toHaveLength(8);
    
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