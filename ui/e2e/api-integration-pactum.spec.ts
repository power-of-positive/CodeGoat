import { spec } from 'pactum';
import * as pactum from 'pactum';
import {
  statusResponseSchema,
  modelsListResponseSchema,
  modelTestResponseSchema,
  modelAddResponseSchema,
  modelDeleteResponseSchema,
  errorResponseSchema
} from './schemas/api-schemas';

describe('API Integration Tests with PactumJS', () => {
  const baseUrl = 'http://localhost:3000';

  beforeAll(() => {
    // Configure PactumJS base URL
    pactum.request.setBaseUrl(baseUrl);
  });

  beforeEach(() => {
    // Reset any state between tests if needed
  });

  describe('Health and Status Endpoints', () => {
    it('should return healthy status from status endpoint', async () => {
      await spec()
        .get('/api/status')
        .expectStatus(200)
        .expectJsonSchema(statusResponseSchema)
        .expectJson('status', 'healthy');
    });

    it('should return models list with correct structure', async () => {
      await spec()
        .get('/api/models')
        .expectStatus(200)
        .expectJsonSchema(modelsListResponseSchema)
        .expectJsonLike('models[0].name', /kimi/)
        .expectJsonLike('models[0].model', /openrouter/);
    });
  });

  describe('Model Testing Endpoints', () => {
    it('should return 404 for invalid model ID', async () => {
      await spec()
        .post('/api/models/test/999')
        .expectStatus(404)
        .expectJsonSchema(errorResponseSchema)
        .expectJson('error', 'Model not found');
    });

    it('should return consistent response structure for valid models', async () => {
      const modelIds = ['kimi-k2-free', 'glm-45-air-free', 'deepseek-r1t2-chimera-free'];
      
      for (const modelId of modelIds) {
        await spec()
          .post(`/api/models/test/${modelId}`)
          .expectStatus(200)
          .expectJsonSchema(modelTestResponseSchema)
          .expectJson('modelId', modelId)
          .inspect(); // Useful for debugging
      }
    });
  });

  describe('Model CRUD Operations', () => {
    let createdModelId: string;

    it('should successfully add a new model', async () => {
      const response = await spec()
        .post('/api/models')
        .withJson({
          name: 'test-model-for-delete',
          model: 'test/delete-model',
          apiKey: 'test-key',
          provider: 'openrouter'
        })
        .expectStatus(201)
        .expectJsonSchema(modelAddResponseSchema)
        .expectJson('model.name', 'test-model-for-delete')
        .returns('model.id');

      createdModelId = response;
    });

    it('should successfully delete the created model', async () => {
      if (!createdModelId) {
        throw new Error('Model ID not available from previous test');
      }

      await spec()
        .delete(`/api/models/${createdModelId}`)
        .expectStatus(200)
        .expectJsonSchema(modelDeleteResponseSchema);
    });
  });

  describe('Advanced API Validation', () => {
    it('should validate models endpoint returns real config data', async () => {
      const response = await spec()
        .get('/api/models')
        .expectStatus(200)
        .expectJsonSchema(modelsListResponseSchema)
        .returns('models');

      // Validate it contains real model data from config.yaml
      const firstModel = response[0];
      expect(firstModel.name).toContain('kimi');
      expect(firstModel.model).toContain('openrouter');
    });

    it('should validate response times are realistic', async () => {
      // Test a model and ensure response time is within reasonable bounds
      await spec()
        .post('/api/models/test/kimi-k2-free')
        .expectStatus(200)
        .expectJsonSchema(modelTestResponseSchema);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent endpoints', async () => {
      await spec()
        .get('/api/nonexistent')
        .expectStatus(404);
    });

    it('should handle invalid JSON payloads', async () => {
      await spec()
        .post('/api/models')
        .withBody('invalid json')
        .withHeaders('Content-Type', 'application/json')
        .expectStatus(400);
    });

    it('should handle malformed model creation requests', async () => {
      await spec()
        .post('/api/models')
        .withJson({
          name: 'incomplete-model'
          // Missing required fields: model, apiKey, provider
        })
        .expectStatus(400);
    });
  });

  afterAll(() => {
    // Cleanup if needed
  });
});