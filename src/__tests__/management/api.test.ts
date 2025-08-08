import request from 'supertest';
import express from 'express';
import { ILogger } from '../../logger-interface';
import { initializeManagementAPI } from '../../management/api';
import managementRouter from '../../management/api';

// Mock ConfigLoader and ILogger
const mockConfigLoader = {
  load: jest.fn(),
  getConfig: jest.fn(),
  reload: jest.fn(),
  addModel: jest.fn(),
  updateModel: jest.fn(),
  deleteModel: jest.fn(),
  getAllModels: jest.fn(),
} as jest.Mocked<{
  load: () => unknown;
  getConfig: () => unknown;
  reload: () => unknown;
  addModel: (data: unknown) => unknown;
  updateModel: (id: string, data: unknown) => unknown;
  deleteModel: (id: string) => unknown;
  getAllModels: () => unknown[];
}>;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as jest.Mocked<ILogger>;

describe('Management API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Initialize management API with mocks
    initializeManagementAPI(mockConfigLoader as any, mockLogger);

    // Mount router after initialization
    app.use('/api/management', managementRouter);

    jest.clearAllMocks();
  });

  describe('GET /api/management/models', () => {
    it('should return list of all models with masked API keys', async () => {
      const mockModels = [
        {
          id: 'model-1',
          name: 'Test Model 1',
          baseUrl: 'https://api.example.com/v1',
          model: 'test-model-1',
          apiKey: 'secret-key-1',
          provider: 'openai',
          enabled: true,
          isDefault: false,
        },
        {
          id: 'model-2',
          name: 'Test Model 2',
          baseUrl: 'https://api.example.com/v1',
          model: 'test-model-2',
          apiKey: 'secret-key-2',
          provider: 'openrouter',
          enabled: false,
          isDefault: false,
        },
      ];

      mockConfigLoader.getAllModels.mockReturnValue(mockModels);

      const response = await request(app).get('/api/management/models').expect(200);

      expect(response.body.models).toEqual([
        {
          id: 'model-1',
          name: 'Test Model 1',
          baseUrl: 'https://api.example.com/v1',
          model: 'test-model-1',
          apiKey: '***',
          provider: 'openai',
          enabled: true,
          status: 'untested',
          lastTested: null,
        },
        {
          id: 'model-2',
          name: 'Test Model 2',
          baseUrl: 'https://api.example.com/v1',
          model: 'test-model-2',
          apiKey: '***',
          provider: 'openrouter',
          enabled: false,
          status: 'untested',
          lastTested: null,
        },
      ]);

      expect(mockConfigLoader.getAllModels).toHaveBeenCalled();
    });

    it('should handle models without API keys', async () => {
      const mockModels = [
        {
          id: 'model-1',
          name: 'Test Model',
          baseUrl: 'https://api.example.com/v1',
          model: 'test-model',
          apiKey: '',
          provider: 'openai',
          enabled: true,
          isDefault: false,
        },
      ];

      mockConfigLoader.getAllModels.mockReturnValue(mockModels);

      const response = await request(app).get('/api/management/models').expect(200);

      expect(response.body.models[0].apiKey).toBe('');
    });

    it('should handle errors when loading models fails', async () => {
      mockConfigLoader.getAllModels.mockImplementation(() => {
        throw new Error('Config loading failed');
      });

      const response = await request(app).get('/api/management/models').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to load models',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load models', expect.any(Error));
    });
  });

  describe('POST /api/management/models', () => {
    const validModelData = {
      name: 'New Model',
      baseUrl: 'https://api.example.com/v1',
      model: 'new-model',
      apiKey: 'test-api-key',
      provider: 'openai',
      enabled: true,
    };

    it('should add a new model successfully', async () => {
      mockConfigLoader.addModel.mockResolvedValue(undefined as never);

      const response = await request(app)
        .post('/api/management/models')
        .send(validModelData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Model added successfully',
        model: {
          id: 'new-model',
          ...validModelData,
          apiKey: '***', // API key should be masked in response
          status: 'untested',
          lastTested: null,
        },
      });

      expect(mockConfigLoader.addModel).toHaveBeenCalledWith({
        name: validModelData.name,
        model: validModelData.model,
        apiKey: validModelData.apiKey,
        provider: validModelData.provider,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Adding new model: New Model');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        baseUrl: 'invalid-url',
        model: '',
        apiKey: '',
        provider: 'invalid-provider',
      };

      const response = await request(app)
        .post('/api/management/models')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
      expect(mockConfigLoader.addModel).not.toHaveBeenCalled();
    });

    it('should handle provider validation', async () => {
      const dataWithInvalidProvider = {
        ...validModelData,
        provider: 'invalid-provider',
      };

      const response = await request(app)
        .post('/api/management/models')
        .send(dataWithInvalidProvider)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle config loader errors', async () => {
      mockConfigLoader.addModel.mockImplementation(() => {
        throw new Error('Config write failed');
      });

      const response = await request(app)
        .post('/api/management/models')
        .send(validModelData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to add model',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to add model', expect.any(Error));
    });
  });

  describe('PUT /api/management/models/:id', () => {
    const updateData = {
      name: 'Updated Model',
      enabled: false,
    };

    it('should update an existing model successfully', async () => {
      mockConfigLoader.updateModel.mockResolvedValue(undefined as never);

      const response = await request(app)
        .put('/api/management/models/test-model-id')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Model updated successfully',
        model: {
          id: 'test-model-id',
          name: 'Updated Model',
          enabled: false,
          apiKey: '***',
          status: 'untested',
          lastTested: null,
        },
      });

      expect(mockConfigLoader.updateModel).toHaveBeenCalledWith('test-model-id', {
        name: 'Updated Model',
        model: '',
        apiKey: '',
        provider: 'openrouter',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Updating model: test-model-id');
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        baseUrl: 'invalid-url',
        provider: 'invalid-provider',
      };

      const response = await request(app)
        .put('/api/management/models/test-model-id')
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle model not found', async () => {
      mockConfigLoader.updateModel = jest.fn().mockImplementation(() => {
        throw new Error('Model not found');
      });

      const response = await request(app)
        .put('/api/management/models/non-existent-id')
        .send(updateData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to update model',
      });
    });
  });

  describe('DELETE /api/management/models/:id', () => {
    it('should delete a model successfully', async () => {
      mockConfigLoader.deleteModel.mockResolvedValue(undefined as never);

      const response = await request(app)
        .delete('/api/management/models/test-model-id')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Model deleted successfully',
      });

      expect(mockConfigLoader.deleteModel).toHaveBeenCalledWith('test-model-id');
      expect(mockLogger.info).toHaveBeenCalledWith('Deleting model: test-model-id');
    });

    it('should handle model not found', async () => {
      mockConfigLoader.deleteModel.mockImplementation(() => {
        throw new Error('Model not found');
      });

      const response = await request(app)
        .delete('/api/management/models/non-existent-id')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to delete model',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete model', expect.any(Error));
    });
  });

  describe('POST /api/management/reload', () => {
    it('should reload configuration successfully', async () => {
      mockConfigLoader.reload.mockReturnValue({
        proxy: { host: 'localhost', port: 3000 },
        routes: [],
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      });

      const response = await request(app).post('/api/management/reload').expect(200);

      expect(response.body).toEqual({
        message: 'Configuration reloaded successfully',
        timestamp: expect.any(String),
      });

      expect(mockConfigLoader.reload).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Configuration reloaded via API');
    });

    it('should handle reload errors', async () => {
      mockConfigLoader.reload.mockImplementation(() => {
        throw new Error('Config reload failed');
      });

      const response = await request(app).post('/api/management/reload').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to reload configuration',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to reload configuration',
        expect.any(Error)
      );
    });
  });

  describe('POST /api/management/test/:id', () => {
    beforeEach(() => {
      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should test a model and return healthy status', async () => {
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.8) // > 0.3, so healthy
        .mockReturnValueOnce(0.5); // response time multiplier

      const response = await request(app).post('/api/management/test/test-model-id').expect(200);

      expect(response.body).toMatchObject({
        modelId: 'test-model-id',
        status: 'healthy',
        responseTime: expect.any(Number),
        error: null,
        testedAt: expect.any(String),
      });

      expect(response.body.responseTime).toBeGreaterThan(100);
      expect(response.body.responseTime).toBeLessThan(1100);
    });

    it('should test a model and return error status', async () => {
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.1) // < 0.3, so error
        .mockReturnValueOnce(0.5); // response time multiplier

      const response = await request(app).post('/api/management/test/test-model-id').expect(200);

      expect(response.body).toMatchObject({
        modelId: 'test-model-id',
        status: 'error',
        responseTime: expect.any(Number),
        error: 'Connection timeout',
        testedAt: expect.any(String),
      });
    });

    it('should handle test endpoint errors', async () => {
      // Force an error by mocking Math.random to throw
      jest.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Math.random failed');
      });

      const response = await request(app).post('/api/management/test/test-model-id').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to test model',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to test model', expect.any(Error));
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle non-ZodError in POST /models', async () => {
      const validModelData = {
        name: 'Test Model',
        baseUrl: 'https://api.example.com/v1',
        model: 'test-model',
        apiKey: 'test-key',
        provider: 'openai',
        enabled: true,
      };

      // Mock addModel to throw a non-ZodError
      mockConfigLoader.addModel.mockImplementation(() => {
        throw new Error('Generic error');
      });

      const response = await request(app)
        .post('/api/management/models')
        .send(validModelData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to add model',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to add model', expect.any(Error));
    });

    it('should handle non-ZodError in PUT /models/:id', async () => {
      const updateData = {
        name: 'Updated Model',
        enabled: false,
      };

      // Mock updateModel to throw a non-ZodError
      mockConfigLoader.updateModel.mockImplementation(() => {
        throw new Error('Generic error');
      });

      const response = await request(app)
        .put('/api/management/models/test-model-id')
        .send(updateData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to update model',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update model', expect.any(Error));
    });

    it('should handle errors in DELETE /models/:id', async () => {
      mockConfigLoader.deleteModel.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const response = await request(app)
        .delete('/api/management/models/test-model-id')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to delete model',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete model', expect.any(Error));
    });
  });
});
