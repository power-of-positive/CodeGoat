import { Request, Response } from 'express';
import { InternalRoutes } from '../../utils/internal-routes';
import { ModelConfig } from '../../types';

describe('InternalRoutes', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let internalRoutes: InternalRoutes;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      const config: ModelConfig = { models: {} };
      internalRoutes = new InternalRoutes(config);

      expect(internalRoutes).toBeInstanceOf(InternalRoutes);
    });
  });

  describe('handleHealthCheck', () => {
    it('should return health status with basic config', () => {
      const config: ModelConfig = { models: {} };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'healthy',
        uptime: expect.any(Number),
        models: 0,
      });
    });

    it('should return correct model count', () => {
      const config: ModelConfig = {
        models: {
          'gpt-4': {
            name: 'gpt-4',
            model: 'gpt-4',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'test-key',
          },
          'claude-3': {
            name: 'claude-3',
            model: 'claude-3-opus',
            provider: 'anthropic',
            baseUrl: 'https://api.anthropic.com/v1',
            enabled: true,
            apiKey: 'test-key',
          },
          'disabled-model': {
            name: 'disabled-model',
            model: 'disabled-model',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: false,
            apiKey: 'test-key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'healthy',
        uptime: expect.any(Number),
        models: 3, // Total models, not just enabled ones
      });
    });

    it('should handle config with null models', () => {
      const config = { models: null } as any;
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'healthy',
        uptime: expect.any(Number),
        models: 0,
      });
    });

    it('should return numeric uptime', () => {
      const config: ModelConfig = { models: {} };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(typeof callArgs.uptime).toBe('number');
      expect(callArgs.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should always return healthy status', () => {
      const config: ModelConfig = { models: {} };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.status).toBe('healthy');
    });
  });

  describe('handleModelsList', () => {
    it('should return empty list when no models configured', () => {
      const config: ModelConfig = { models: {} };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        object: 'list',
        data: [],
      });
    });

    it('should return empty list when models is null', () => {
      const config = { models: null } as any;
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        object: 'list',
        data: [],
      });
    });

    it('should return empty list when models is undefined', () => {
      const config = {} as any;
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        object: 'list',
        data: [],
      });
    });

    it('should return only enabled models', () => {
      const config: ModelConfig = {
        models: {
          'gpt-4': {
            name: 'gpt-4',
            model: 'gpt-4',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'test-key',
          },
          'claude-3': {
            name: 'claude-3',
            model: 'claude-3-opus',
            provider: 'anthropic',
            baseUrl: 'https://api.anthropic.com/v1',
            enabled: true,
            apiKey: 'test-key',
          },
          'disabled-model': {
            name: 'disabled-model',
            model: 'disabled-model',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: false,
            apiKey: 'test-key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      const expectedData = [
        {
          id: 'gpt-4',
          object: 'model',
          created: expect.any(Number),
          owned_by: 'proxy-server',
        },
        {
          id: 'claude-3',
          object: 'model',
          created: expect.any(Number),
          owned_by: 'proxy-server',
        },
      ];

      expect(mockResponse.json).toHaveBeenCalledWith({
        object: 'list',
        data: expect.arrayContaining(expectedData),
      });

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toHaveLength(2);
      expect(callArgs.data.find((m: any) => m.id === 'disabled-model')).toBeUndefined();
    });

    it('should return proper model format', () => {
      const config: ModelConfig = {
        models: {
          'test-model': {
            name: 'test-model',
            model: 'test-model',
            provider: 'test-provider',
            baseUrl: 'https://api.test.com/v1',
            enabled: true,
            apiKey: 'test-key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const model = callArgs.data[0];

      expect(model).toMatchObject({
        id: 'test-model',
        object: 'model',
        owned_by: 'proxy-server',
      });
      expect(typeof model.created).toBe('number');
      expect(model.created).toBeGreaterThan(0);
    });

    it('should use model name as id', () => {
      const config: ModelConfig = {
        models: {
          'model-key': {
            name: 'actual-model-name',
            model: 'actual-model-name',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'test-key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.data[0].id).toBe('actual-model-name');
    });

    it('should handle multiple enabled models', () => {
      const config: ModelConfig = {
        models: {
          'gpt-4': {
            name: 'gpt-4',
            model: 'gpt-4',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'key1',
          },
          'gpt-3.5': {
            name: 'gpt-3.5-turbo',
            model: 'gpt-3.5-turbo',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'key2',
          },
          'claude-3': {
            name: 'claude-3-opus',
            model: 'claude-3-opus',
            provider: 'anthropic',
            baseUrl: 'https://api.anthropic.com/v1',
            enabled: true,
            apiKey: 'key3',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toHaveLength(3);

      const modelIds = callArgs.data.map((m: any) => m.id);
      expect(modelIds).toContain('gpt-4');
      expect(modelIds).toContain('gpt-3.5-turbo');
      expect(modelIds).toContain('claude-3-opus');
    });

    it('should return list format consistently', () => {
      const config: ModelConfig = { models: {} };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.object).toBe('list');
      expect(Array.isArray(callArgs.data)).toBe(true);
    });

    it('should set created timestamp close to current time', () => {
      const config: ModelConfig = {
        models: {
          'test-model': {
            name: 'test-model',
            model: 'test-model',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'test-key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      const beforeCall = Date.now();
      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);
      const afterCall = Date.now();

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const createdTime = callArgs.data[0].created;

      expect(createdTime).toBeGreaterThanOrEqual(beforeCall);
      expect(createdTime).toBeLessThanOrEqual(afterCall);
    });

    it('should handle models with complex configuration', () => {
      const config: ModelConfig = {
        models: {
          'complex-model': {
            name: 'complex-model-name',
            model: 'complex-model-name',
            provider: 'complex-provider',
            baseUrl: 'https://api.example.com',
            enabled: true,
            apiKey: 'complex-api-key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toHaveLength(1);
      expect(callArgs.data[0]).toMatchObject({
        id: 'complex-model-name',
        object: 'model',
        owned_by: 'proxy-server',
      });
    });

    it('should filter out all disabled models', () => {
      const config: ModelConfig = {
        models: {
          'disabled-1': {
            name: 'disabled-1',
            model: 'disabled-1',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: false,
            apiKey: 'key1',
          },
          'disabled-2': {
            name: 'disabled-2',
            model: 'disabled-2',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: false,
            apiKey: 'key2',
          },
          'disabled-3': {
            name: 'disabled-3',
            model: 'disabled-3',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: false,
            apiKey: 'key3',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        object: 'list',
        data: [],
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle health check with malformed config', () => {
      const config = {} as ModelConfig;
      internalRoutes = new InternalRoutes(config);

      expect(() => {
        internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);
      }).not.toThrow();

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle models list with malformed config', () => {
      const config = {} as ModelConfig;
      internalRoutes = new InternalRoutes(config);

      expect(() => {
        internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);
      }).not.toThrow();

      expect(mockResponse.json).toHaveBeenCalledWith({
        object: 'list',
        data: [],
      });
    });

    it('should handle models with missing properties gracefully', () => {
      const config: ModelConfig = {
        models: {
          'incomplete-model': {
            name: 'incomplete-model',
            model: 'incomplete-model',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'test-key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      expect(() => {
        internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);
      }).not.toThrow();

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toHaveLength(1);
      expect(callArgs.data[0].id).toBe('incomplete-model');
    });
  });

  describe('integration scenarios', () => {
    it('should handle health check followed by models list', () => {
      const config: ModelConfig = {
        models: {
          'test-model': {
            name: 'test-model',
            model: 'test-model',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      // First call health check
      internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'healthy',
        uptime: expect.any(Number),
        models: 1,
      });

      // Reset mock
      (mockResponse.json as jest.Mock).mockClear();

      // Then call models list
      internalRoutes.handleModelsList(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith({
        object: 'list',
        data: [expect.objectContaining({ id: 'test-model' })],
      });
    });

    it('should maintain consistent behavior across multiple calls', () => {
      const config: ModelConfig = {
        models: {
          'stable-model': {
            name: 'stable-model',
            model: 'stable-model',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true,
            apiKey: 'key',
          },
        },
      };
      internalRoutes = new InternalRoutes(config);

      // Multiple health checks should be consistent
      internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);
      const firstCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

      (mockResponse.json as jest.Mock).mockClear();

      internalRoutes.handleHealthCheck(mockRequest as Request, mockResponse as Response);
      const secondCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

      expect(firstCall.status).toBe(secondCall.status);
      expect(firstCall.models).toBe(secondCall.models);
    });
  });
});
