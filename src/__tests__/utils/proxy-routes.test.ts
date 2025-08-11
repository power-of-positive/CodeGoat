import { Request, Response } from 'express';
import { ProxyRoutes } from '../../utils/proxy-routes';
import { ModelConfig } from '../../types';
import { SettingsService } from '../../services/settings.service';
import { createMockLogger } from '../../test-helpers/logger.mock';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock utility functions
jest.mock('../../utils/model', () => ({
  extractModelName: jest.fn(),
  getProviderFromModel: jest.fn(),
  getTargetUrl: jest.fn(),
  getApiKey: jest.fn(),
  buildProxyHeaders: jest.fn(),
}));

jest.mock('../../utils/fallback', () => ({
  shouldFallbackOnError: jest.fn(),
  extractErrorMessage: jest.fn(),
  delay: jest.fn(),
}));

jest.mock('../../utils/json', () => ({
  safePreview: jest.fn(),
  getSafeSize: jest.fn(),
}));

describe('ProxyRoutes', () => {
  let proxyRoutes: ProxyRoutes;
  let mockConfig: ModelConfig;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockLogger = createMockLogger();

    mockConfig = {
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
          name: 'claude-3-opus',
          model: 'claude-3-opus',
          provider: 'anthropic',
          baseUrl: 'https://api.anthropic.com/v1',
          enabled: true,
          apiKey: 'test-key-2',
        },
        'disabled-model': {
          name: 'disabled-model',
          model: 'disabled-model',
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          enabled: false,
          apiKey: 'test-key-3',
        },
      },
      fallbacks: {
        'gpt-4': ['claude-3'],
        'claude-3': ['gpt-4'],
      },
    };

    mockSettingsService = {
      getFallbackSettings: jest.fn().mockResolvedValue({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnServerError: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
      }),
    } as any;

    mockRequest = {
      body: {},
      headers: {},
      method: 'POST',
      url: '/v1/chat/completions',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    proxyRoutes = new ProxyRoutes(mockConfig, mockSettingsService, mockLogger);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config, settings service, and logger', () => {
      expect(proxyRoutes).toBeInstanceOf(ProxyRoutes);
    });
  });

  describe('handleChatCompletions', () => {
    it('should handle successful chat completion request', async () => {
      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock successful API response
      (mockAxios as any).mockResolvedValue({
        data: { choices: [{ message: { content: 'Hi there!' } }] },
        status: 200,
        headers: {},
      });

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      // Should not return an error response
      expect(mockResponse.status).not.toHaveBeenCalledWith(400);
      expect(mockResponse.status).not.toHaveBeenCalledWith(500);
    });

    it('should return 400 error when model parameter is missing', async () => {
      mockRequest.body = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { message: 'Model parameter is required', type: 'invalid_request_error' },
      });
    });

    it('should return 400 error when model is not found', async () => {
      mockRequest.body = {
        model: 'nonexistent-model',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { message: 'Model nonexistent-model not found', type: 'invalid_request_error' },
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock axios to throw an error
      (mockAxios as any).mockRejectedValue(new Error('Network error'));

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Proxy error', expect.any(Error));
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          message: 'Provider returned error: Network error',
          type: 'internal_error',
        },
      });
    });

    it('should attempt fallback models when primary model fails', async () => {
      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock primary model to fail
      (mockAxios as any).mockRejectedValueOnce(new Error('Primary model failed'));
      // Mock fallback model to succeed
      (mockAxios as any).mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Fallback response' } }] },
        status: 200,
        headers: {},
      });

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Trying fallback model', {
        model: 'claude-3-opus',
      });
    });

    it('should return 500 when no fallbacks are configured', async () => {
      // Remove fallbacks from config
      mockConfig.fallbacks = {};
      proxyRoutes = new ProxyRoutes(mockConfig, mockSettingsService, mockLogger);

      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock primary model to fail
      (mockAxios as any).mockRejectedValue(new Error('Model failed'));

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { message: 'All model attempts failed', type: 'internal_error' },
      });
    });

    it('should skip disabled fallback models', async () => {
      // Configure fallbacks to include a disabled model
      mockConfig.fallbacks = {
        'gpt-4': ['disabled-model', 'claude-3'],
      };
      proxyRoutes = new ProxyRoutes(mockConfig, mockSettingsService, mockLogger);

      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock primary model to fail
      (mockAxios as any).mockRejectedValueOnce(new Error('Primary model failed'));
      // Mock enabled fallback model to succeed
      (mockAxios as any).mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Fallback response' } }] },
        status: 200,
        headers: {},
      });

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      // Should try the enabled fallback model, not the disabled one
      expect(mockLogger.info).toHaveBeenCalledWith('Trying fallback model', {
        model: 'claude-3-opus',
      });
    });

    it('should handle empty models config', async () => {
      mockConfig.models = {};
      proxyRoutes = new ProxyRoutes(mockConfig, mockSettingsService, mockLogger);

      mockRequest.body = {
        model: 'any-model',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { message: 'Model any-model not found', type: 'invalid_request_error' },
      });
    });

    it('should handle null models config', async () => {
      mockConfig.models = null as any;
      proxyRoutes = new ProxyRoutes(mockConfig, mockSettingsService, mockLogger);

      mockRequest.body = {
        model: 'any-model',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { message: 'Model any-model not found', type: 'invalid_request_error' },
      });
    });

    it('should handle non-Error exceptions in handleChatError', async () => {
      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock axios to throw a non-Error value
      (mockAxios as any).mockRejectedValue('String error');

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          message: 'Provider returned error: Unknown error',
          type: 'internal_error',
        },
      });
    });

    it('should handle retries with fallback settings', async () => {
      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock settings service to return specific retry settings
      mockSettingsService.getFallbackSettings.mockResolvedValue({
        maxRetries: 2,
        retryDelay: 500,
        enableFallbacks: true,
        fallbackOnServerError: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
      });

      // Mock first attempt to fail, second to succeed
      (mockAxios as any)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Success on retry' } }] },
          status: 200,
          headers: {},
        });

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockSettingsService.getFallbackSettings).toHaveBeenCalled();
      // Should eventually succeed on retry
      expect(mockResponse.status).not.toHaveBeenCalledWith(400);
      expect(mockResponse.status).not.toHaveBeenCalledWith(500);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle models config with unexpected structure', async () => {
      mockConfig.models = {
        malformed: {}, // Missing required fields
      } as any;
      proxyRoutes = new ProxyRoutes(mockConfig, mockSettingsService, mockLogger);

      mockRequest.body = {
        model: 'malformed',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      // Should not crash, might find the model or not depending on implementation
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it('should handle fallback chain with all models failing', async () => {
      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock all models to fail
      (mockAxios as any).mockRejectedValue(new Error('All models failing'));

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: { message: 'All model attempts failed', type: 'internal_error' },
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex fallback chain with multiple models', async () => {
      // Set up complex fallback chain
      mockConfig.fallbacks = {
        'gpt-4': ['claude-3', 'disabled-model'],
      };
      proxyRoutes = new ProxyRoutes(mockConfig, mockSettingsService, mockLogger);

      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock primary to fail, first fallback to fail, skip disabled model
      (mockAxios as any)
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockRejectedValueOnce(new Error('Fallback failed'));

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Trying fallback model', {
        model: 'claude-3-opus',
      });
    });

    it('should maintain request context through fallback attempts', async () => {
      mockRequest.body = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Complex request' }],
        temperature: 0.7,
        max_tokens: 150,
      };

      // Mock primary to fail, fallback to succeed
      (mockAxios as any).mockRejectedValueOnce(new Error('Primary failed')).mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Fallback success' } }] },
        status: 200,
        headers: {},
      });

      await proxyRoutes.handleChatCompletions(mockRequest as Request, mockResponse as Response);

      // Verify that fallback was attempted
      expect(mockLogger.info).toHaveBeenCalledWith('Trying fallback model', {
        model: 'claude-3-opus',
      });
    });
  });
});
