import { ProxyRoutes } from '../../utils/proxy-routes-refactored';
import { Request, Response } from 'express';
import { ModelConfig } from '../../types';
import { SettingsService } from '../../services/settings.service';
import { ILogger } from '../../logger-interface';
import { ChatRequestValidator } from '../../handlers/chat-request-validator';
import { ChatCompletionRetryHandler } from '../../handlers/chat-completion-retry-handler';
import { ChatCompletionFallbackHandler } from '../../handlers/chat-completion-fallback-handler';
import { ChatCompletionExecutor } from '../../handlers/chat-completion-executor';
import { ChatCompletionResponseHandler } from '../../handlers/chat-completion-response-handler';

// Mock all the handler dependencies
jest.mock('../../handlers/chat-request-validator');
jest.mock('../../handlers/chat-completion-retry-handler');
jest.mock('../../handlers/chat-completion-fallback-handler');
jest.mock('../../handlers/chat-completion-executor');
jest.mock('../../handlers/chat-completion-response-handler');

describe('ProxyRoutes', () => {
  let proxyRoutes: ProxyRoutes;
  let mockConfig: ModelConfig;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  // Mock instances
  let mockValidator: jest.Mocked<ChatRequestValidator>;
  let mockRetryHandler: jest.Mocked<ChatCompletionRetryHandler>;
  let mockFallbackHandler: jest.Mocked<ChatCompletionFallbackHandler>;
  let mockExecutor: jest.Mocked<ChatCompletionExecutor>;
  let mockResponseHandler: jest.Mocked<ChatCompletionResponseHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock config
    mockConfig = {
      models: {
        'gpt-3.5-turbo': {
          name: 'GPT-3.5 Turbo',
          model: 'gpt-3.5-turbo',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          enabled: true,
          provider: 'openai',
        },
        'claude-3': {
          name: 'Claude 3',
          model: 'claude-3-sonnet-20240229',
          baseUrl: 'https://api.anthropic.com/v1',
          apiKey: 'claude-key',
          enabled: true,
          provider: 'anthropic',
        },
      },
      fallbacks: {
        'gpt-3.5-turbo': ['claude-3'],
      },
    };

    // Setup mock services
    mockSettingsService = {
      getFallbackSettings: jest.fn(),
      getValidationSettings: jest.fn(),
    } as unknown as jest.Mocked<SettingsService>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Setup mock request/response
    mockReq = {
      body: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      },
      headers: {},
      method: 'POST',
      url: '/v1/chat/completions',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    // Setup mock handler instances
    mockValidator = {
      validateChatRequest: jest.fn(),
      findModelEntry: jest.fn(),
    } as unknown as jest.Mocked<ChatRequestValidator>;

    mockRetryHandler = {
      tryModelWithRetries: jest.fn(),
    } as unknown as jest.Mocked<ChatCompletionRetryHandler>;

    mockFallbackHandler = {
      tryFallbackModels: jest.fn(),
    } as unknown as jest.Mocked<ChatCompletionFallbackHandler>;

    mockExecutor = {
      attemptModelRequest: jest.fn(),
    } as unknown as jest.Mocked<ChatCompletionExecutor>;

    mockResponseHandler = {
      handleChatError: jest.fn(),
    } as unknown as jest.Mocked<ChatCompletionResponseHandler>;

    // Mock constructor calls
    (ChatRequestValidator as jest.Mock).mockReturnValue(mockValidator);
    (ChatCompletionRetryHandler as jest.Mock).mockReturnValue(mockRetryHandler);
    (ChatCompletionFallbackHandler as jest.Mock).mockReturnValue(mockFallbackHandler);
    (ChatCompletionExecutor as jest.Mock).mockReturnValue(mockExecutor);
    (ChatCompletionResponseHandler as jest.Mock).mockReturnValue(mockResponseHandler);

    proxyRoutes = new ProxyRoutes(mockConfig, mockSettingsService, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize all handler dependencies', () => {
      expect(ChatRequestValidator).toHaveBeenCalledWith(mockConfig);
      expect(ChatCompletionRetryHandler).toHaveBeenCalledWith(mockSettingsService, mockLogger);
      expect(ChatCompletionFallbackHandler).toHaveBeenCalledWith(mockConfig, mockLogger);
      expect(ChatCompletionExecutor).toHaveBeenCalledWith(mockSettingsService, mockLogger);
      expect(ChatCompletionResponseHandler).toHaveBeenCalledWith(mockLogger);
    });
  });

  describe('handleChatCompletions', () => {
    it('should handle successful completion request without fallback', async () => {
      const modelEntry: [string, any] = ['gpt-3.5-turbo', mockConfig.models['gpt-3.5-turbo']];
      
      mockValidator.validateChatRequest.mockReturnValue(false); // No validation error
      mockValidator.findModelEntry.mockReturnValue(modelEntry);
      mockRetryHandler.tryModelWithRetries.mockResolvedValue({
        success: true,
        shouldFallback: false,
      });

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockValidator.validateChatRequest).toHaveBeenCalledWith('gpt-3.5-turbo', mockRes);
      expect(mockValidator.findModelEntry).toHaveBeenCalledWith('gpt-3.5-turbo', mockRes);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing chat completion for model: gpt-3.5-turbo',
        { modelId: 'gpt-3.5-turbo' }
      );
      expect(mockRetryHandler.tryModelWithRetries).toHaveBeenCalled();
      expect(mockFallbackHandler.tryFallbackModels).not.toHaveBeenCalled();
    });

    it('should attempt fallback when primary model fails', async () => {
      const modelEntry: [string, any] = ['gpt-3.5-turbo', mockConfig.models['gpt-3.5-turbo']];
      const errorMessage = 'Rate limit exceeded';
      
      mockValidator.validateChatRequest.mockReturnValue(false);
      mockValidator.findModelEntry.mockReturnValue(modelEntry);
      mockRetryHandler.tryModelWithRetries.mockResolvedValue({
        success: false,
        shouldFallback: true,
        error: errorMessage,
      });

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Primary model failed, attempting fallbacks',
        { modelId: 'gpt-3.5-turbo', error: errorMessage }
      );
      expect(mockFallbackHandler.tryFallbackModels).toHaveBeenCalledWith(
        mockReq,
        mockRes,
        { messages: [{ role: 'user', content: 'Hello' }] },
        'gpt-3.5-turbo',
        errorMessage,
        expect.any(Function)
      );
    });

    it('should return early when validation fails', async () => {
      mockValidator.validateChatRequest.mockReturnValue(true); // Validation error occurred

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockValidator.validateChatRequest).toHaveBeenCalledWith('gpt-3.5-turbo', mockRes);
      expect(mockValidator.findModelEntry).not.toHaveBeenCalled();
      expect(mockRetryHandler.tryModelWithRetries).not.toHaveBeenCalled();
    });

    it('should return early when model not found', async () => {
      mockValidator.validateChatRequest.mockReturnValue(false);
      mockValidator.findModelEntry.mockReturnValue(null); // Model not found

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockValidator.validateChatRequest).toHaveBeenCalledWith('gpt-3.5-turbo', mockRes);
      expect(mockValidator.findModelEntry).toHaveBeenCalledWith('gpt-3.5-turbo', mockRes);
      expect(mockRetryHandler.tryModelWithRetries).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      const error = new Error('Unexpected error');
      mockValidator.validateChatRequest.mockImplementation(() => {
        throw error;
      });

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error in chat completion handler', error);
      expect(mockResponseHandler.handleChatError).toHaveBeenCalledWith(error, mockRes);
    });

    it('should handle different request body structures', async () => {
      const modelEntry: [string, any] = ['claude-3', mockConfig.models['claude-3']];
      const customReq = {
        ...mockReq,
        body: {
          model: 'claude-3',
          messages: [{ role: 'user', content: 'Test message' }],
          temperature: 0.7,
          max_tokens: 100,
        },
      };

      mockValidator.validateChatRequest.mockReturnValue(false);
      mockValidator.findModelEntry.mockReturnValue(modelEntry);
      mockRetryHandler.tryModelWithRetries.mockResolvedValue({
        success: true,
        shouldFallback: false,
      });

      await proxyRoutes.handleChatCompletions(customReq as Request, mockRes as Response);

      expect(mockRetryHandler.tryModelWithRetries).toHaveBeenCalledWith(
        customReq,
        mockRes,
        mockConfig.models['claude-3'],
        {
          messages: [{ role: 'user', content: 'Test message' }],
          temperature: 0.7,
          max_tokens: 100,
        },
        'claude-3',
        expect.any(Function)
      );
    });

    it('should attempt fallback when retry indicates should fallback but success is true', async () => {
      const modelEntry: [string, any] = ['gpt-3.5-turbo', mockConfig.models['gpt-3.5-turbo']];
      
      mockValidator.validateChatRequest.mockReturnValue(false);
      mockValidator.findModelEntry.mockReturnValue(modelEntry);
      mockRetryHandler.tryModelWithRetries.mockResolvedValue({
        success: true,
        shouldFallback: true, // Edge case: success but should still try fallback
        error: 'Partial failure',
      });

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockFallbackHandler.tryFallbackModels).toHaveBeenCalled();
    });
  });

  describe('createAttemptHandler', () => {
    it('should create a function that calls executor.attemptModelRequest', async () => {
      const attemptRequest = {
        req: mockReq,
        res: mockRes,
        modelConfig: mockConfig.models['gpt-3.5-turbo'],
        requestData: { messages: [{ role: 'user', content: 'Hello' }] },
        attempt: 1,
        maxRetries: 3,
      };

      const expectedResult = {
        success: true,
        shouldFallback: false,
      };

      mockExecutor.attemptModelRequest.mockResolvedValue(expectedResult);

      // Access the private method through reflection for testing
      const attemptHandler = (proxyRoutes as any).createAttemptHandler();
      const result = await attemptHandler(attemptRequest);

      expect(mockExecutor.attemptModelRequest).toHaveBeenCalledWith(
        attemptRequest.req,
        attemptRequest.res,
        attemptRequest.modelConfig,
        attemptRequest.requestData,
        attemptRequest.attempt,
        attemptRequest.maxRetries
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle executor errors in attempt handler', async () => {
      const attemptRequest = {
        req: mockReq,
        res: mockRes,
        modelConfig: mockConfig.models['gpt-3.5-turbo'],
        requestData: { messages: [{ role: 'user', content: 'Hello' }] },
        attempt: 1,
        maxRetries: 3,
      };

      const error = new Error('Executor failed');
      mockExecutor.attemptModelRequest.mockRejectedValue(error);

      const attemptHandler = (proxyRoutes as any).createAttemptHandler();
      
      // The attempt handler should propagate errors from the executor
      await expect(attemptHandler(attemptRequest)).rejects.toThrow(error);
    });
  });

  describe('error handling', () => {
    it('should handle null/undefined model in request', async () => {
      const reqWithNullModel = {
        ...mockReq,
        body: { model: null, messages: [{ role: 'user', content: 'Hello' }] },
      };

      mockValidator.validateChatRequest.mockReturnValue(true); // Should catch null model

      await proxyRoutes.handleChatCompletions(reqWithNullModel as Request, mockRes as Response);

      expect(mockValidator.validateChatRequest).toHaveBeenCalledWith(null, mockRes);
    });

    it('should handle missing request body', async () => {
      const reqWithoutBody = {
        ...mockReq,
        body: undefined,
      };

      await proxyRoutes.handleChatCompletions(reqWithoutBody as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error in chat completion handler',
        expect.any(Error)
      );
    });

    it('should handle retry handler errors', async () => {
      const modelEntry: [string, any] = ['gpt-3.5-turbo', mockConfig.models['gpt-3.5-turbo']];
      const retryError = new Error('Retry handler failed');
      
      mockValidator.validateChatRequest.mockReturnValue(false);
      mockValidator.findModelEntry.mockReturnValue(modelEntry);
      mockRetryHandler.tryModelWithRetries.mockRejectedValue(retryError);

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error in chat completion handler', retryError);
      expect(mockResponseHandler.handleChatError).toHaveBeenCalledWith(retryError, mockRes);
    });

    it('should handle fallback handler errors', async () => {
      const modelEntry: [string, any] = ['gpt-3.5-turbo', mockConfig.models['gpt-3.5-turbo']];
      const fallbackError = new Error('Fallback handler failed');
      
      mockValidator.validateChatRequest.mockReturnValue(false);
      mockValidator.findModelEntry.mockReturnValue(modelEntry);
      mockRetryHandler.tryModelWithRetries.mockResolvedValue({
        success: false,
        shouldFallback: true,
        error: 'Primary failed',
      });
      mockFallbackHandler.tryFallbackModels.mockRejectedValue(fallbackError);

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error in chat completion handler', fallbackError);
      expect(mockResponseHandler.handleChatError).toHaveBeenCalledWith(fallbackError, mockRes);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete flow with multiple fallback attempts', async () => {
      const modelEntry: [string, any] = ['gpt-3.5-turbo', mockConfig.models['gpt-3.5-turbo']];
      
      mockValidator.validateChatRequest.mockReturnValue(false);
      mockValidator.findModelEntry.mockReturnValue(modelEntry);
      mockRetryHandler.tryModelWithRetries.mockResolvedValue({
        success: false,
        shouldFallback: true,
        error: 'Rate limited',
      });
      mockFallbackHandler.tryFallbackModels.mockResolvedValue(undefined);

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockValidator.validateChatRequest).toHaveBeenCalledTimes(1);
      expect(mockValidator.findModelEntry).toHaveBeenCalledTimes(1);
      expect(mockRetryHandler.tryModelWithRetries).toHaveBeenCalledTimes(1);
      expect(mockFallbackHandler.tryFallbackModels).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing chat completion for model: gpt-3.5-turbo',
        { modelId: 'gpt-3.5-turbo' }
      );
    });

    it('should handle edge case where model entry is found but model config is invalid', async () => {
      const invalidModelEntry: [string, any] = ['invalid-model', null];
      
      mockValidator.validateChatRequest.mockReturnValue(false);
      mockValidator.findModelEntry.mockReturnValue(invalidModelEntry);
      mockRetryHandler.tryModelWithRetries.mockResolvedValue({
        success: false,
        shouldFallback: false,
        error: 'Invalid model config',
      });

      await proxyRoutes.handleChatCompletions(mockReq as Request, mockRes as Response);

      expect(mockRetryHandler.tryModelWithRetries).toHaveBeenCalledWith(
        mockReq,
        mockRes,
        null, // Invalid model config
        { messages: [{ role: 'user', content: 'Hello' }] },
        'invalid-model',
        expect.any(Function)
      );
    });
  });
});