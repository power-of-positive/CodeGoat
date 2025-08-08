import request from 'supertest';
import express from 'express';
import { ConfigLoader } from '../../config';
import { ILogger } from '../../logger-interface';
import { createModelRoutes } from '../../routes/models';

// Mock dependencies
jest.mock('../../config');
jest.mock('../../logger-interface');

const mockConfigLoader = {
  getAllModels: jest.fn(),
  addModel: jest.fn(),
  updateModel: jest.fn(),
  deleteModel: jest.fn(),
} as unknown as ConfigLoader;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as ILogger;

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Models Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/models', createModelRoutes(mockConfigLoader, mockLogger));
    jest.clearAllMocks();
  });

  describe('GET /models', () => {
    it('should return all models with status information', async () => {
      const mockModels = [
        {
          id: 'test-model',
          name: 'Test Model',
          baseUrl: 'https://api.test.com',
          model: 'test/model',
          apiKey: 'test-key',
          provider: 'test',
          enabled: true,
          isDefault: false,
        },
      ];

      (mockConfigLoader.getAllModels as jest.Mock).mockReturnValue(mockModels);

      const response = await request(app).get('/models');

      expect(response.status).toBe(200);
      expect(response.body.models).toHaveLength(1);
      expect(response.body.models[0]).toMatchObject({
        id: 'test-model',
        name: 'Test Model',
        apiKey: '***', // Should mask the API key
        status: 'untested',
      });
    });

    it('should handle errors when loading models fails', async () => {
      (mockConfigLoader.getAllModels as jest.Mock).mockImplementation(() => {
        throw new Error('Config load failed');
      });

      const response = await request(app).get('/models');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to load models');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('POST /models', () => {
    it('should add a new model successfully', async () => {
      const newModel = {
        name: 'New Model',
        model: 'provider/new-model',
        apiKey: 'new-api-key',
        provider: 'openrouter',
      };

      (mockConfigLoader.addModel as jest.Mock).mockImplementation(() => {});

      const response = await request(app).post('/models').send(newModel);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Model added successfully');
      expect(response.body.model.name).toBe(newModel.name);
      expect(response.body.model.apiKey).toBe('***'); // Should mask API key
      expect(mockConfigLoader.addModel).toHaveBeenCalledWith(newModel);
    });

    it('should validate required fields', async () => {
      const incompleteModel = {
        name: 'Incomplete Model',
        // Missing required fields
      };

      const response = await request(app).post('/models').send(incompleteModel);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    it('should handle config loader errors', async () => {
      const newModel = {
        name: 'New Model',
        model: 'provider/new-model',
        apiKey: 'new-api-key',
        provider: 'openrouter',
      };

      (mockConfigLoader.addModel as jest.Mock).mockImplementation(() => {
        throw new Error('Config add failed');
      });

      const response = await request(app).post('/models').send(newModel);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to add model');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('PUT /models/:id', () => {
    it('should update an existing model', async () => {
      const updateData = {
        name: 'Updated Model',
        model: 'provider/updated-model',
        apiKey: 'updated-api-key',
        provider: 'openrouter',
      };

      (mockConfigLoader.updateModel as jest.Mock).mockImplementation(() => {});

      const response = await request(app).put('/models/test-model').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Model updated successfully');
      expect(response.body.model.name).toBe(updateData.name);
      expect(mockConfigLoader.updateModel).toHaveBeenCalledWith('test-model', updateData);
    });

    it('should handle model not found error', async () => {
      (mockConfigLoader.updateModel as jest.Mock).mockImplementation(() => {
        throw new Error('Model not found');
      });

      const response = await request(app)
        .put('/models/nonexistent-model')
        .send({ name: 'Updated Model' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Model not found');
    });
  });

  describe('DELETE /models/:id', () => {
    it('should delete a model successfully', async () => {
      (mockConfigLoader.deleteModel as jest.Mock).mockImplementation(() => {});

      const response = await request(app).delete('/models/test-model');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Model deleted successfully');
      expect(mockConfigLoader.deleteModel).toHaveBeenCalledWith('test-model');
    });

    it('should handle model not found error', async () => {
      (mockConfigLoader.deleteModel as jest.Mock).mockImplementation(() => {
        throw new Error('Model not found');
      });

      const response = await request(app).delete('/models/nonexistent-model');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Model not found');
    });
  });

  describe('POST /models/test/:id', () => {
    it('should test a model successfully', async () => {
      const mockModels = [
        {
          id: 'test-model',
          name: 'test-model',
          model: 'provider/test-model',
          apiKey: 'test-key',
          enabled: true,
        },
      ];

      (mockConfigLoader.getAllModels as jest.Mock).mockReturnValue(mockModels);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('{"response": "test"}'),
      });

      const response = await request(app).post('/models/test/test-model');

      expect(response.status).toBe(200);
      expect(response.body.modelId).toBe('test-model');
      expect(response.body.status).toBe('healthy');
      expect(response.body.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle model not found', async () => {
      (mockConfigLoader.getAllModels as jest.Mock).mockReturnValue([]);

      const response = await request(app).post('/models/test/nonexistent-model');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Model not found');
    });

    it('should handle test failures', async () => {
      const mockModels = [
        {
          id: 'test-model',
          name: 'test-model',
          model: 'provider/test-model',
          apiKey: 'test-key',
          enabled: true,
        },
      ];

      (mockConfigLoader.getAllModels as jest.Mock).mockReturnValue(mockModels);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      });

      const response = await request(app).post('/models/test/test-model');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('error');
      expect(response.body.error).toContain('HTTP 400');
    });
  });
});
