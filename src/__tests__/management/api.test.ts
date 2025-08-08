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

      expect(response.body).toEqual([
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

      expect(response.body[0].apiKey).toBe('');
    });

    it('should handle errors when loading models fails', async () => {
      mockConfigLoader.getAllModels.mockImplementation(() => {
        throw new Error('Config loading failed');
      });

      const response = await request(app).get('/api/management/models').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to load models: Config loading failed',
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
          ...validModelData,
          apiKey: '***', // API key should be masked in response
        },
      });

      expect(mockConfigLoader.addModel).toHaveBeenCalledWith(validModelData);
      expect(mockLogger.info).toHaveBeenCalledWith('Added new model: New Model');
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

      expect(response.body.error).toContain('Validation error');
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

      expect(response.body.error).toContain('Validation error');
    });

    it('should handle config loader errors', async () => {
      mockConfigLoader.addModel.mockRejectedValue(new Error('Config write failed') as never);

      const response = await request(app)
        .post('/api/management/models')
        .send(validModelData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to add model: Config write failed',
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
      });

      expect(mockConfigLoader.updateModel).toHaveBeenCalledWith('test-model-id', updateData);
      expect(mockLogger.info).toHaveBeenCalledWith('Updated model: test-model-id');
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

      expect(response.body.error).toContain('Validation error');
    });

    it('should handle model not found', async () => {
      mockConfigLoader.updateModel = jest
        .fn()
        .mockRejectedValue(new Error('Model not found') as never);

      const response = await request(app)
        .put('/api/management/models/non-existent-id')
        .send(updateData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to update model: Model not found',
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
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted model: test-model-id');
    });

    it('should handle model not found', async () => {
      mockConfigLoader.deleteModel.mockRejectedValue(new Error('Model not found') as never);

      const response = await request(app)
        .delete('/api/management/models/non-existent-id')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to delete model: Model not found',
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
        error: 'Failed to reload configuration: Config reload failed',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to reload configuration',
        expect.any(Error)
      );
    });
  });
});
