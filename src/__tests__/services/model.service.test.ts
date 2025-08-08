import { ModelService, CreateModelRequest } from '../../services/model.service';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('ModelService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear test results
    (ModelService as any).testResults = {};
  });

  describe('createTestResult', () => {
    it('should create a test result with provided data', () => {
      const result = ModelService.createTestResult(
        'test-model',
        'gpt-3.5-turbo',
        'healthy',
        250,
        null
      );

      expect(result).toEqual({
        modelId: 'test-model',
        model: 'gpt-3.5-turbo',
        status: 'healthy',
        responseTime: 250,
        error: null,
        testedAt: expect.any(String),
      });

      // Check that testedAt is a valid ISO string
      expect(new Date(result.testedAt)).toBeInstanceOf(Date);
    });

    it('should create a test result with error', () => {
      const result = ModelService.createTestResult(
        'failing-model',
        'gpt-4',
        'error',
        0,
        'API key invalid'
      );

      expect(result.status).toBe('error');
      expect(result.error).toBe('API key invalid');
      expect(result.responseTime).toBe(0);
    });
  });

  describe('makeTestApiCall', () => {
    it('should make API call to OpenRouter', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ choices: [] }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const model = { name: 'test-model', apiKey: 'test-key' };
      const result = await ModelService.makeTestApiCall(model);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
          body: expect.stringContaining('"messages"'),
        })
      );
      expect(result).toBe(mockResponse);
    });

    it('should handle missing API key', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const model = { name: 'test-model' };
      const result = await ModelService.makeTestApiCall(model);

      expect(result).toBe(mockResponse);
    });
  });

  describe('convertModelsToUIFormat', () => {
    it('should convert models to UI format', () => {
      const models = [
        {
          id: 'model-1',
          name: 'Model 1',
          baseUrl: 'https://api.example.com',
          model: 'example-model-1',
          apiKey: 'key-1',
          provider: 'example',
          enabled: true,
          isDefault: false,
        },
        {
          id: 'model-2',
          name: 'Model 2',
          baseUrl: 'https://api.example.com',
          model: 'example-model-2',
          apiKey: 'key-2',
          provider: 'example',
          enabled: false,
          isDefault: true,
        },
      ];

      const testResults = {
        'model-1': {
          modelId: 'model-1',
          model: 'example-model-1',
          status: 'healthy' as const,
          responseTime: 200,
          error: null,
          testedAt: '2023-01-01T00:00:00.000Z',
        },
      };

      const result = ModelService.convertModelsToUIFormat(models, testResults);

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        id: 'model-1',
        name: 'Model 1',
        baseUrl: 'https://api.example.com',
        model: 'example-model-1',
        apiKey: '***',
        provider: 'example',
        enabled: true,
        status: 'healthy',
        lastTested: '2023-01-01T00:00:00.000Z',
        responseTime: 200,
      });

      expect(result[1]).toEqual({
        id: 'model-2',
        name: 'Model 2',
        baseUrl: 'https://api.example.com',
        model: 'example-model-2',
        apiKey: '***',
        provider: 'example',
        enabled: false,
        status: 'untested',
        lastTested: null,
        responseTime: null,
      });
    });

    it('should handle empty models array', () => {
      const result = ModelService.convertModelsToUIFormat([], {});
      expect(result).toEqual([]);
    });

    it('should handle missing test results', () => {
      const models = [
        {
          id: 'untested-model',
          name: 'Untested Model',
          baseUrl: 'https://api.example.com',
          model: 'untested',
          apiKey: 'key',
          provider: 'example',
          enabled: true,
          isDefault: false,
        },
      ];

      const result = ModelService.convertModelsToUIFormat(models, {});

      expect(result[0].status).toBe('untested');
      expect(result[0].lastTested).toBeNull();
      expect(result[0].responseTime).toBeNull();
    });
  });

  describe('getAllModels', () => {
    it('should get all models from config loader', async () => {
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

      const mockConfigLoader = {
        getAllModels: jest.fn().mockReturnValue(mockModels),
      } as any;

      const result = await ModelService.getAllModels(mockConfigLoader);

      expect(mockConfigLoader.getAllModels).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-model');
      expect(result[0].status).toBe('untested');
    });
  });

  describe('testModel', () => {
    it('should test a model and return healthy result', async () => {
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

      const mockConfigLoader = {
        getAllModels: jest.fn().mockReturnValue(mockModels),
      } as any;

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'test' } }] }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const result = await ModelService.testModel('test-model', mockConfigLoader);

      expect(result.modelId).toBe('test-model');
      expect(result.status).toBe('healthy');
      expect(result.error).toBeNull();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(new Date(result.testedAt).getTime()).toBeGreaterThanOrEqual(startTime);
    });

    it('should test a model and return error result for API failure', async () => {
      const mockModels = [
        {
          id: 'failing-model',
          name: 'Failing Model',
          baseUrl: 'https://api.test.com',
          model: 'failing/model',
          apiKey: 'invalid-key',
          provider: 'test',
          enabled: true,
          isDefault: false,
        },
      ];

      const mockConfigLoader = {
        getAllModels: jest.fn().mockReturnValue(mockModels),
      } as any;

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('Invalid API key'),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const result = await ModelService.testModel('failing-model', mockConfigLoader);

      expect(result.modelId).toBe('failing-model');
      expect(result.status).toBe('error');
      expect(result.error).toContain('HTTP 401: Invalid API key');
      expect(result.responseTime).toBe(0);
    });

    it('should throw error for non-existent model', async () => {
      const mockConfigLoader = {
        getAllModels: jest.fn().mockReturnValue([]),
      } as any;

      await expect(ModelService.testModel('non-existent', mockConfigLoader)).rejects.toThrow(
        'Model not found'
      );
    });

    it('should handle network errors', async () => {
      const mockModels = [
        {
          id: 'network-error-model',
          name: 'Network Error Model',
          baseUrl: 'https://api.test.com',
          model: 'network/error',
          apiKey: 'test-key',
          provider: 'test',
          enabled: true,
          isDefault: false,
        },
      ];

      const mockConfigLoader = {
        getAllModels: jest.fn().mockReturnValue(mockModels),
      } as any;

      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await ModelService.testModel('network-error-model', mockConfigLoader);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Network timeout');
    });
  });

  describe('createModelResponse', () => {
    it('should create a model response with proper UI format', () => {
      const modelRequest: CreateModelRequest = {
        name: 'New Model',
        model: 'new/model',
        apiKey: 'new-key',
        provider: 'custom',
        baseUrl: 'https://custom.api.com',
        enabled: true,
      };

      const result = ModelService.createModelResponse(modelRequest);

      expect(result).toEqual({
        id: expect.any(String),
        name: 'New Model',
        baseUrl: 'https://custom.api.com',
        model: 'new/model',
        apiKey: '***',
        provider: 'custom',
        enabled: true,
        status: 'untested',
        lastTested: null,
        responseTime: null,
      });

      // Check that id is a non-empty string
      expect(result.id).toBeTruthy();
      expect(typeof result.id).toBe('string');
    });

    it('should handle minimal model request', () => {
      const modelRequest: CreateModelRequest = {
        name: 'Minimal Model',
        model: 'minimal',
        apiKey: 'key',
        provider: 'test',
      };

      const result = ModelService.createModelResponse(modelRequest);

      expect(result.name).toBe('Minimal Model');
      expect(result.enabled).toBe(true); // Default value
      expect(result.baseUrl).toBeDefined();
    });
  });

  describe('validateModelRequest', () => {
    it('should validate a complete model request', () => {
      const validRequest: CreateModelRequest = {
        name: 'Valid Model',
        model: 'valid/model',
        apiKey: 'valid-key',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        enabled: true,
      };

      const result = ModelService.validateModelRequest(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate minimal required fields', () => {
      const minimalRequest: CreateModelRequest = {
        name: 'Minimal Model',
        model: 'minimal',
        apiKey: 'key',
        provider: 'test',
      };

      const result = ModelService.validateModelRequest(minimalRequest);

      expect(result.isValid).toBe(true);
    });

    it('should return validation errors for missing required fields', () => {
      const invalidRequest = {
        name: 'Invalid Model',
        // Missing required fields
      } as CreateModelRequest;

      const result = ModelService.validateModelRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'model' }),
          expect.objectContaining({ field: 'apiKey' }),
          expect.objectContaining({ field: 'provider' }),
        ])
      );
    });

    it('should validate individual field requirements', () => {
      const requestWithEmptyFields: CreateModelRequest = {
        name: '',
        model: '',
        apiKey: '',
        provider: '',
      };

      const result = ModelService.validateModelRequest(requestWithEmptyFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });

    it('should handle null and undefined values', () => {
      const requestWithNulls = {
        name: null,
        model: undefined,
        apiKey: null,
        provider: undefined,
      } as any;

      const result = ModelService.validateModelRequest(requestWithNulls);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });
  });
});
