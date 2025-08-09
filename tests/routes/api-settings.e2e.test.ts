import axios from 'axios';
import { TEST_CONFIG } from '../fixtures/e2e-fixtures';

describe('Settings API E2E Tests', () => {
  const baseUrl = TEST_CONFIG.baseUrl;

  beforeEach(() => {
    // Reset any test state if needed
    jest.setTimeout(30000);
  });

  describe('GET /api/settings', () => {
    it('should return current settings with default fallback values', async () => {
      const response = await axios.get(`${baseUrl}/api/settings`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('fallback');
      expect(response.data).toHaveProperty('validation');

      // Verify fallback settings structure
      expect(response.data.fallback).toEqual({
        maxRetries: expect.any(Number),
        retryDelay: expect.any(Number),
        enableFallbacks: expect.any(Boolean),
        fallbackOnContextLength: expect.any(Boolean),
        fallbackOnRateLimit: expect.any(Boolean),
        fallbackOnServerError: expect.any(Boolean),
      });

      // Verify validation settings structure
      expect(response.data.validation).toHaveProperty('stages');
      expect(response.data.validation).toHaveProperty('enableMetrics');
      expect(response.data.validation).toHaveProperty('maxAttempts');
      expect(Array.isArray(response.data.validation.stages)).toBe(true);
    });
  });

  describe('GET /api/settings/fallback', () => {
    it('should return fallback settings', async () => {
      const response = await axios.get(`${baseUrl}/api/settings/fallback`);

      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        maxRetries: expect.any(Number),
        retryDelay: expect.any(Number),
        enableFallbacks: expect.any(Boolean),
        fallbackOnContextLength: expect.any(Boolean),
        fallbackOnRateLimit: expect.any(Boolean),
        fallbackOnServerError: expect.any(Boolean),
      });

      // Verify default values are reasonable
      expect(response.data.maxRetries).toBeGreaterThan(0);
      expect(response.data.maxRetries).toBeLessThanOrEqual(10);
      expect(response.data.retryDelay).toBeGreaterThanOrEqual(100);
      expect(response.data.retryDelay).toBeLessThanOrEqual(10000);
    });
  });

  describe('PUT /api/settings/fallback', () => {
    let originalSettings: any;

    beforeEach(async () => {
      // Save original settings to restore later
      const response = await axios.get(`${baseUrl}/api/settings/fallback`);
      originalSettings = response.data;
    });

    afterEach(async () => {
      // Restore original settings
      if (originalSettings) {
        await axios.put(`${baseUrl}/api/settings/fallback`, originalSettings);
      }
    });

    it('should update fallback settings successfully', async () => {
      const newSettings = {
        maxRetries: 5,
        retryDelay: 2000,
        enableFallbacks: true,
        fallbackOnContextLength: false,
        fallbackOnRateLimit: true,
        fallbackOnServerError: true,
      };

      const response = await axios.put(`${baseUrl}/api/settings/fallback`, newSettings);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Fallback settings updated successfully');
      expect(response.data).toHaveProperty('fallback');
      expect(response.data.fallback).toEqual(newSettings);

      // Verify the settings were actually saved
      const verifyResponse = await axios.get(`${baseUrl}/api/settings/fallback`);
      expect(verifyResponse.data).toEqual(newSettings);
    });

    it('should validate fallback settings and reject invalid values', async () => {
      const invalidSettings = {
        maxRetries: 15, // Too high (max is 10)
        retryDelay: 50, // Too low (min is 100)
        enableFallbacks: 'invalid', // Wrong type
      };

      try {
        await axios.put(`${baseUrl}/api/settings/fallback`, invalidSettings);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error', 'Invalid fallback settings');
        expect(error.response?.data).toHaveProperty('details');
        expect(Array.isArray(error.response?.data.details)).toBe(true);
      }
    });

    it('should handle partial updates correctly', async () => {
      const partialUpdate = {
        maxRetries: 2,
        enableFallbacks: false,
      };

      const response = await axios.put(`${baseUrl}/api/settings/fallback`, partialUpdate);

      expect(response.status).toBe(200);
      expect(response.data.fallback.maxRetries).toBe(2);
      expect(response.data.fallback.enableFallbacks).toBe(false);

      // Other settings should be preserved
      expect(response.data.fallback).toHaveProperty('retryDelay');
      expect(response.data.fallback).toHaveProperty('fallbackOnContextLength');
    });
  });

  describe('GET /api/settings/validation', () => {
    it('should return validation settings with stages', async () => {
      const response = await axios.get(`${baseUrl}/api/settings/validation`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('stages');
      expect(response.data).toHaveProperty('enableMetrics');
      expect(response.data).toHaveProperty('maxAttempts');

      expect(Array.isArray(response.data.stages)).toBe(true);
      expect(typeof response.data.enableMetrics).toBe('boolean');
      expect(typeof response.data.maxAttempts).toBe('number');

      // Check that default stages exist
      const stageIds = response.data.stages.map((stage: any) => stage.id);
      expect(stageIds).toContain('lint');
      expect(stageIds).toContain('typecheck');
      expect(stageIds).toContain('test');
    });
  });

  describe('POST /api/settings/validation/stages', () => {
    const testStageId = 'e2e-test-stage';

    afterEach(async () => {
      // Clean up test stage
      try {
        await axios.delete(`${baseUrl}/api/settings/validation/stages/${testStageId}`);
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should add new validation stage successfully', async () => {
      const newStage = {
        id: testStageId,
        name: 'E2E Test Stage',
        command: 'echo "test stage"',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        order: 99,
      };

      const response = await axios.post(`${baseUrl}/api/settings/validation/stages`, newStage);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message', 'Validation stage added successfully');
      expect(response.data).toHaveProperty('stage');
      expect(response.data.stage).toEqual(newStage);

      // Verify the stage was added
      const verifyResponse = await axios.get(`${baseUrl}/api/settings/validation`);
      const addedStage = verifyResponse.data.stages.find((stage: any) => stage.id === testStageId);
      expect(addedStage).toEqual(newStage);
    });

    it('should reject duplicate stage IDs', async () => {
      const duplicateStage = {
        id: 'lint', // This should already exist
        name: 'Duplicate Lint',
        command: 'echo "duplicate"',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        order: 1,
      };

      try {
        await axios.post(`${baseUrl}/api/settings/validation/stages`, duplicateStage);
        fail('Should have rejected duplicate stage ID');
      } catch (error: any) {
        expect(error.response?.status).toBe(409);
        expect(error.response?.data).toHaveProperty('error', 'Stage with this ID already exists');
      }
    });
  });

  describe('DELETE /api/settings/validation/stages/:id', () => {
    it('should handle deleting non-existent stage', async () => {
      const nonExistentId = 'non-existent-stage-id';

      try {
        await axios.delete(`${baseUrl}/api/settings/validation/stages/${nonExistentId}`);
        fail('Should have returned 404 for non-existent stage');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data).toHaveProperty('error', 'Validation stage not found');
      }
    });
  });

  describe('Integration: Settings affect proxy behavior', () => {
    let originalSettings: any;

    beforeAll(async () => {
      // Save original settings
      const response = await axios.get(`${baseUrl}/api/settings/fallback`);
      originalSettings = response.data;
    });

    afterAll(async () => {
      // Restore original settings
      if (originalSettings) {
        await axios.put(`${baseUrl}/api/settings/fallback`, originalSettings);
      }
    });

    it('should apply updated fallback settings to proxy requests', async () => {
      // Update settings to have very low retry count
      const testSettings = {
        maxRetries: 1,
        retryDelay: 100,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      };

      await axios.put(`${baseUrl}/api/settings/fallback`, testSettings);

      // Wait a moment for settings to be applied
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify settings were applied
      const verifyResponse = await axios.get(`${baseUrl}/api/settings/fallback`);
      expect(verifyResponse.data.maxRetries).toBe(1);
      expect(verifyResponse.data.retryDelay).toBe(100);

      // Note: Testing actual proxy behavior would require a payload that triggers
      // fallback, which depends on model configuration and availability.
      // This test just verifies that settings can be updated and retrieved.
    });
  });
});
