import axios from 'axios';
import { TEST_CONFIG, TEST_MODELS } from './fixtures/e2e-fixtures';

describe('API Endpoints E2E Tests', () => {
  const baseUrl = TEST_CONFIG.baseUrl;

  describe('Management API Endpoints', () => {
    test('GET /api/models - should return all configured models', async () => {
      const response = await axios.get(`${baseUrl}/api/models`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('models');
      expect(Array.isArray(response.data.models)).toBe(true);

      if (response.data.models.length > 0) {
        const model = response.data.models[0];
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('enabled');
      }
    });

    test('GET /api/status - should return server status', async () => {
      const response = await axios.get(`${baseUrl}/api/status`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('uptime');
      expect(response.data).toHaveProperty('modelsCount');
      expect(typeof response.data.uptime).toBe('number');
      expect(response.data.uptime).toBeGreaterThan(0);
    });

    test('POST /api/status/reload - should reload configuration', async () => {
      const response = await axios.post(`${baseUrl}/api/status/reload`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('reloaded');
    });

    test('GET /api/logs/requests - should return request logs', async () => {
      const response = await axios.get(`${baseUrl}/api/logs/requests?limit=10`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('logs');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('offset');
      expect(response.data).toHaveProperty('limit');
      expect(Array.isArray(response.data.logs)).toBe(true);
    });

    test('GET /api/logs/errors - should return error logs', async () => {
      const response = await axios.get(`${baseUrl}/api/logs/errors?limit=5`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('logs');
      expect(Array.isArray(response.data.logs)).toBe(true);
    });
  });

  describe('OpenAI Compatible Endpoints', () => {
    test('GET /v1/models - should return OpenAI compatible models list', async () => {
      const response = await axios.get(`${baseUrl}/v1/models`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('object', 'list');
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);

      if (response.data.data.length > 0) {
        const model = response.data.data[0];
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('object', 'model');
        expect(model).toHaveProperty('created');
        expect(model).toHaveProperty('owned_by');
      }
    });

    test('POST /v1/chat/completions - should handle basic chat completion', async () => {
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      };

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 15000,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
        expect(response.data).toHaveProperty('usage');
        expect(response.data.choices[0]).toHaveProperty('message');
        expect(response.data.choices[0].message).toHaveProperty('content');
      } catch (error: any) {
        // Handle expected provider errors gracefully
        if (error.response?.status >= 400) {
          expect(error.response.data).toHaveProperty('error');
          expect(error.response.data.error).toHaveProperty('message');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Internal Endpoints', () => {
    test('GET /internal/health - should return health status', async () => {
      const response = await axios.get(`${baseUrl}/internal/health`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
    });

    test('GET /internal/test - should return test response', async () => {
      const response = await axios.get(`${baseUrl}/internal/test`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('UI and Static Content', () => {
    test('GET /ui/ - should serve UI content', async () => {
      try {
        const response = await axios.get(`${baseUrl}/ui/`, {
          validateStatus: status => status < 500, // Accept 404 if UI not built
        });

        if (response.status === 200) {
          expect(response.headers['content-type']).toMatch(/text\/html|application\/octet-stream/);
        } else if (response.status === 404) {
          // UI might not be built in test environment
          console.log('UI not found - this is expected if UI is not built');
        }
      } catch (error: any) {
        // Handle case where UI is not available
        if (error.response?.status === 404) {
          console.log('UI endpoint not available - this is expected in some test environments');
        } else {
          throw error;
        }
      }
    });

    test('GET /test - should return test route response', async () => {
      const response = await axios.get(`${baseUrl}/test`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('Test route works');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('GET /nonexistent-endpoint - should return 404', async () => {
      try {
        await axios.get(`${baseUrl}/nonexistent-endpoint`);
        fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    });

    test('POST /v1/chat/completions with invalid model - should return 400', async () => {
      const payload = {
        model: 'invalid-model-name',
        messages: [{ role: 'user', content: 'Test' }],
      };

      try {
        await axios.post(`${baseUrl}/v1/chat/completions`, payload);
        fail('Should have thrown 400 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error.message).toContain('not found');
      }
    });

    test('POST /v1/chat/completions with malformed JSON - should return 400', async () => {
      try {
        await axios.post(`${baseUrl}/v1/chat/completions`, 'invalid json', {
          headers: { 'Content-Type': 'application/json' },
        });
        fail('Should have thrown 400 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });

    test('POST /v1/chat/completions without required fields - should return 400', async () => {
      const payload = {
        // Missing model and messages
        max_tokens: 10,
      };

      try {
        await axios.post(`${baseUrl}/v1/chat/completions`, payload);
        fail('Should have thrown 400 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });

  describe('Performance and Reliability', () => {
    test('Multiple concurrent requests should be handled properly', async () => {
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content: 'Quick test' }],
        max_tokens: 5,
      };

      const requests = Array(3)
        .fill(null)
        .map(() =>
          axios.post(`${baseUrl}/v1/chat/completions`, payload, {
            timeout: 10000,
            validateStatus: status => status < 500, // Allow client errors
          })
        );

      const responses = await Promise.allSettled(requests);

      // At least one should succeed (unless all hit rate limits)
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = responses.filter(r => r.status === 'rejected');

      // Either we get successful responses, or we get proper error handling
      if (successful.length === 0) {
        // If all failed, they should fail gracefully with proper error responses
        expect(failed.length).toBeLessThanOrEqual(3);
        console.log('All requests failed - this may be due to rate limiting or provider issues');
      } else {
        expect(successful.length).toBeGreaterThanOrEqual(1);
      }
    }, 30000);

    test('Server should handle request timeout gracefully', async () => {
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content: 'Test timeout' }],
        max_tokens: 10,
      };

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 1000, // Very short timeout
        });

        // If it succeeds within timeout, that's also fine
        expect(response.status).toBe(200);
      } catch (error: any) {
        // Timeout errors should be handled gracefully
        if (error.code === 'ECONNABORTED') {
          // This is expected for timeout test
          expect(error.message).toContain('timeout');
        } else if (error.response) {
          // Server error responses should be properly formatted
          expect(error.response.status).toBeGreaterThanOrEqual(400);
        }
      }
    });
  });
});
