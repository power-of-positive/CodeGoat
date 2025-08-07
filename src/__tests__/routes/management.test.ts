import request from 'supertest';
import express from 'express';
import { createManagementRoutes } from '../../routes/management';
import { ConfigLoader } from '../../config';
import { Logger } from '../../logger';

jest.mock('../../config');
jest.mock('../../logger');

describe('Management Routes', () => {
  let app: express.Application;
  let mockConfigLoader: jest.Mocked<ConfigLoader>;
  let mockLogger: jest.Mocked<Logger>;

  const mockConfig = {
    proxy: { port: 3000, host: '0.0.0.0' },
    routes: [],
    settings: {
      logging: { level: 'info', format: 'json' },
      timeout: { request: 30000, idle: 120000 },
      retries: { attempts: 3, backoff: 'exponential' },
    },
    modelConfig: {
      models: {
        'test-model': {
          name: 'test-model',
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          enabled: true,
        },
      },
    },
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Create proper mocks
    mockConfigLoader = {
      load: jest.fn().mockReturnValue(mockConfig),
      getConfig: jest.fn().mockReturnValue(mockConfig),
      reload: jest.fn().mockReturnValue(mockConfig),
      addModel: jest.fn().mockImplementation(() => {}),
      updateModel: jest.fn().mockImplementation(() => {}),
      deleteModel: jest.fn().mockImplementation(() => {}),
      getAllModels: jest.fn().mockReturnValue([
        {
          id: 'test-model',
          name: 'test-model',
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          enabled: true,
          isDefault: false,
        },
      ]),
    } as unknown as jest.Mocked<ConfigLoader>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    const managementRouter = createManagementRoutes(mockConfigLoader, mockLogger);
    app.use('/api/management', managementRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/management/models', () => {
    it('should return list of models', async () => {
      const response = await request(app).get('/api/management/models').expect(200);

      expect(response.body).toHaveProperty('models');
      expect(response.body.models).toHaveLength(1);
      expect(response.body.models[0]).toMatchObject({
        id: 'test-model',
        name: 'test-model',
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        enabled: true,
        status: 'untested',
      });
    });

    it('should handle config loading errors', async () => {
      // Override the mock to throw an error for this test
      mockConfigLoader.getAllModels.mockImplementationOnce(() => {
        throw new Error('Config error');
      });

      const response = await request(app).get('/api/management/models').expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to load models');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load models', expect.any(Error));
    });
  });

  describe('GET /api/management/status', () => {
    it('should return server status', async () => {
      const response = await request(app).get('/api/management/status').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        modelsCount: 1,
        activeModelsCount: 1,
      });
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/management/models', () => {
    it('should create a new model', async () => {
      // No need to mock config changes as addModel handles it internally

      const modelData = {
        name: 'new-model',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        apiKey: 'new-key',
        provider: 'openai',
        enabled: true,
      };

      const response = await request(app)
        .post('/api/management/models')
        .send(modelData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Model added successfully',
      });
      expect(response.body.model).toMatchObject({
        name: 'new-model',
        model: 'gpt-4',
        provider: 'openai',
        status: 'untested',
      });
      expect(mockConfigLoader.addModel).toHaveBeenCalledWith({
        name: 'new-model',
        model: 'gpt-4',
        apiKey: 'new-key',
        provider: 'openai',
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/management/models')
        .send({ name: 'test' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('DELETE /api/management/models/:id', () => {
    it('should delete a model', async () => {
      const response = await request(app).delete('/api/management/models/test-model').expect(200);

      expect(response.body).toMatchObject({
        message: 'Model deleted successfully',
      });
      expect(mockConfigLoader.deleteModel).toHaveBeenCalledWith('test-model');
    });

    it('should handle model not found during deletion', async () => {
      // Override the mock to throw error for this test
      mockConfigLoader.deleteModel.mockImplementationOnce(() => {
        throw new Error('Model not found in user configuration');
      });

      const response = await request(app).delete('/api/management/models/nonexistent').expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to delete model');
    });
  });

  describe('POST /api/management/reload', () => {
    it('should reload configuration', async () => {
      const response = await request(app).post('/api/management/reload').expect(200);

      expect(response.body).toMatchObject({
        message: 'Configuration reloaded successfully',
      });
      expect(response.body).toHaveProperty('timestamp');
      expect(mockConfigLoader.reload).toHaveBeenCalled();
    });
  });
});
