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

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockConfigLoader = new ConfigLoader() as jest.Mocked<ConfigLoader>;
    mockLogger = new Logger('info', 'json') as jest.Mocked<Logger>;

    // Mock the load method to return a valid config
    mockConfigLoader.load.mockReturnValue({
      proxy: { port: 3000, host: '0.0.0.0' },
      routes: [],
      settings: {
        logging: { level: 'info', format: 'json' },
        timeout: { request: 30000, idle: 120000 },
        retries: { attempts: 3, backoff: 'exponential' },
      },
      modelConfig: {
        model_list: [
          {
            model_name: 'test-model',
            litellm_params: {
              model: 'gpt-3.5-turbo',
              api_key: 'test-key',
            },
          },
        ],
      },
    });

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
        id: '0',
        name: 'test-model',
        model: 'gpt-3.5-turbo',
        provider: 'openrouter',
        enabled: true,
        status: 'untested',
      });
    });

    it('should handle config loading errors', async () => {
      // Create a new app with a broken configLoader for this test
      const brokenApp = express();
      brokenApp.use(express.json());

      const brokenConfigLoader = new ConfigLoader() as jest.Mocked<ConfigLoader>;
      brokenConfigLoader.load.mockImplementation(() => {
        throw new Error('Config error');
      });

      const managementRouter = createManagementRoutes(brokenConfigLoader, mockLogger);
      brokenApp.use('/api/management', managementRouter);

      const response = await request(brokenApp).get('/api/management/models').expect(500);

      expect(response.body).toHaveProperty('error');
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
      // Create a new app instance for this test to avoid interference
      const testApp = express();
      testApp.use(express.json());

      const testConfigLoader = new ConfigLoader() as jest.Mocked<ConfigLoader>;
      testConfigLoader.addModel = jest.fn().mockImplementation(() => {});
      testConfigLoader.getConfig = jest.fn().mockReturnValue({
        proxy: { port: 3000, host: '0.0.0.0' },
        routes: [],
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 120000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
        modelConfig: {
          model_list: [
            {
              model_name: 'test-model',
              litellm_params: {
                model: 'gpt-3.5-turbo',
                api_key: 'test-key',
              },
            },
            {
              model_name: 'new-model',
              litellm_params: {
                model: 'gpt-4',
                api_key: 'new-key',
              },
            },
          ],
        },
      });

      const testManagementRouter = createManagementRoutes(testConfigLoader, mockLogger);
      testApp.use('/api/management', testManagementRouter);

      const modelData = {
        name: 'new-model',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        apiKey: 'new-key',
        provider: 'openai',
        enabled: true,
      };

      const response = await request(testApp)
        .post('/api/management/models')
        .send(modelData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Model added successfully',
      });
      expect(response.body.model).toMatchObject({
        name: 'new-model',
        model: 'gpt-4',
        provider: 'openai',
      });
      expect(testConfigLoader.addModel).toHaveBeenCalledWith({
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

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('DELETE /api/management/models/:id', () => {
    it('should delete a model', async () => {
      // Create a new app instance for this test
      const testApp = express();
      testApp.use(express.json());

      const testConfigLoader = new ConfigLoader() as jest.Mocked<ConfigLoader>;
      testConfigLoader.deleteModel = jest.fn().mockImplementation(() => {});

      const testManagementRouter = createManagementRoutes(testConfigLoader, mockLogger);
      testApp.use('/api/management', testManagementRouter);

      const response = await request(testApp).delete('/api/management/models/0').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Model 0 deleted successfully',
        deletedModelId: '0',
      });
      expect(testConfigLoader.deleteModel).toHaveBeenCalledWith(0);
    });

    it('should handle invalid model ID', async () => {
      const response = await request(app).delete('/api/management/models/invalid').expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid model ID');
    });

    it('should handle model not found', async () => {
      // Create a new app instance for this test
      const testApp = express();
      testApp.use(express.json());

      const testConfigLoader = new ConfigLoader() as jest.Mocked<ConfigLoader>;
      testConfigLoader.deleteModel = jest.fn().mockImplementation(() => {
        throw new Error('Model not found');
      });

      const testManagementRouter = createManagementRoutes(testConfigLoader, mockLogger);
      testApp.use('/api/management', testManagementRouter);

      const response = await request(testApp).delete('/api/management/models/0').expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Model not found');
    });
  });
});
