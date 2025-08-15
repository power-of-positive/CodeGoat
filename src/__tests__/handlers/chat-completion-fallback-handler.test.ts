import { ChatCompletionFallbackHandler } from '../../handlers/chat-completion-fallback-handler';
import { RetryResult, AttemptRequest } from '../../handlers/chat-completion-retry-handler';
import { ModelConfig } from '../../types';
import { createMockLogger } from '../../test-helpers/logger.mock';
import { createMockRequest, createMockResponse } from '../../test-helpers/express.mock';

describe('ChatCompletionFallbackHandler', () => {
  let fallbackHandler: ChatCompletionFallbackHandler;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockConfig: ModelConfig;
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockRes: ReturnType<typeof createMockResponse>;
  let mockRetryHandler: jest.MockedFunction<(request: AttemptRequest) => Promise<RetryResult>>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockConfig = {
      models: {
        'primary-model': {
          name: 'gpt-3.5-turbo',
          model: 'openai/gpt-3.5-turbo',
          provider: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          enabled: true
        },
        'fallback-model-1': {
          name: 'claude-3-haiku',
          model: 'anthropic/claude-3-haiku-20240307',
          provider: 'Anthropic',
          baseUrl: 'https://api.anthropic.com/v1',
          apiKey: 'test-anthropic-key',
          enabled: true
        },
        'fallback-model-2': {
          name: 'gpt-4-mini',
          model: 'openai/gpt-4-mini',
          provider: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key-2',
          enabled: true
        },
        'disabled-fallback': {
          name: 'disabled-model',
          model: 'openai/gpt-4',
          provider: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          enabled: false
        }
      },
      fallbacks: {
        'primary-model': ['fallback-model-1', 'fallback-model-2'],
        'no-fallbacks-model': []
      }
    };

    fallbackHandler = new ChatCompletionFallbackHandler(mockConfig, mockLogger);
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockRetryHandler = jest.fn();
  });

  describe('tryFallbackModels', () => {
    const requestData = { messages: [{ role: 'user', content: 'test' }] };
    const primaryModelId = 'primary-model';
    const error = 'Context length exceeded';

    it('should succeed with first fallback model', async () => {
      const successResult: RetryResult = { success: true };
      mockRetryHandler.mockResolvedValue(successResult);

      await fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: primaryModelId,
        error,
        retryHandler: mockRetryHandler
      });

      expect(mockRetryHandler).toHaveBeenCalledTimes(1);
      expect(mockRetryHandler).toHaveBeenCalledWith({
        req: mockReq,
        res: mockRes,
        modelConfig: mockConfig.models['fallback-model-1'],
        requestData,
        attempt: 1,
        maxRetries: 1
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Fallback model fallback-model-1 succeeded');
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should try multiple fallback models until success', async () => {
      const failureResult: RetryResult = { success: false, error: 'Fallback failed' };
      const successResult: RetryResult = { success: true };
      
      mockRetryHandler
        .mockResolvedValueOnce(failureResult)
        .mockResolvedValueOnce(successResult);

      await fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: primaryModelId,
        error,
        retryHandler: mockRetryHandler
      });

      expect(mockRetryHandler).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith('Fallback model fallback-model-1 failed: Fallback failed');
      expect(mockLogger.info).toHaveBeenCalledWith('Fallback model fallback-model-2 succeeded');
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should exhaust all fallback models and send error', async () => {
      const failureResult: RetryResult = { success: false, error: 'All fallbacks failed' };
      mockRetryHandler.mockResolvedValue(failureResult);

      await fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: primaryModelId,
        error,
        retryHandler: mockRetryHandler
      });

      expect(mockRetryHandler).toHaveBeenCalledTimes(2); // Two fallback models
      expect(mockLogger.error).toHaveBeenCalledWith(
        'All fallback models failed for primary-model',
        new Error(error)
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: error, 
          type: 'internal_error' 
        }
      });
    });

    it('should handle model with no fallbacks configured', async () => {
      await fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: 'model-without-fallbacks',
        error,
        retryHandler: mockRetryHandler
      });

      expect(mockRetryHandler).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('No fallbacks configured for model model-without-fallbacks');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: error, 
          type: 'internal_error' 
        }
      });
    });

    it('should handle empty fallbacks array', async () => {
      await fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: 'no-fallbacks-model',
        error,
        retryHandler: mockRetryHandler
      });

      expect(mockRetryHandler).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Attempting 0 fallback models for no-fallbacks-model', { 
        fallbacks: [] 
      });
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should skip disabled fallback models', async () => {
      // Create config with disabled fallback
      const configWithDisabled: ModelConfig = {
        ...mockConfig,
        fallbacks: {
          'primary-model': ['disabled-fallback', 'fallback-model-1']
        }
      };
      
      const handlerWithDisabled = new ChatCompletionFallbackHandler(configWithDisabled, mockLogger);
      const successResult: RetryResult = { success: true };
      mockRetryHandler.mockResolvedValue(successResult);

      await handlerWithDisabled.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: primaryModelId,
        error,
        retryHandler: mockRetryHandler
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Fallback model disabled-fallback is not available or disabled');
      expect(mockRetryHandler).toHaveBeenCalledTimes(1);
      expect(mockRetryHandler).toHaveBeenCalledWith({
        req: mockReq,
        res: mockRes,
        modelConfig: mockConfig.models['fallback-model-1'],
        requestData,
        attempt: 1,
        maxRetries: 1
      });
    });

    it('should skip non-existent fallback models', async () => {
      const configWithMissing: ModelConfig = {
        ...mockConfig,
        fallbacks: {
          'primary-model': ['non-existent-model', 'fallback-model-1']
        }
      };
      
      const handlerWithMissing = new ChatCompletionFallbackHandler(configWithMissing, mockLogger);
      const successResult: RetryResult = { success: true };
      mockRetryHandler.mockResolvedValue(successResult);

      await handlerWithMissing.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: primaryModelId,
        error,
        retryHandler: mockRetryHandler
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Fallback model non-existent-model is not available or disabled');
      expect(mockRetryHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle missing retry handler', async () => {
      await fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: primaryModelId,
        error,
        retryHandler: undefined
      });

      expect(mockLogger.error).toHaveBeenCalledWith('No retry handler provided to fallback handler');
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should use default error message when none provided', async () => {
      await fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: 'model-without-fallbacks',
        error: undefined,
        retryHandler: mockRetryHandler
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: 'All model attempts failed', 
          type: 'internal_error' 
        }
      });
    });

    it('should handle retry handler throwing errors', async () => {
      mockRetryHandler.mockRejectedValue(new Error('Retry handler error'));

      await expect(fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: primaryModelId,
        error,
        retryHandler: mockRetryHandler
      })).rejects.toThrow('Retry handler error');
    });

    it('should log appropriate attempt information', async () => {
      const failureResult: RetryResult = { success: false, error: 'Test failure' };
      mockRetryHandler.mockResolvedValue(failureResult);

      await fallbackHandler.tryFallbackModels({
        req: mockReq as any,
        res: mockRes as any,
        requestData,
        modelId: primaryModelId,
        error,
        retryHandler: mockRetryHandler
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Attempting 2 fallback models for primary-model', { 
        fallbacks: ['fallback-model-1', 'fallback-model-2'] 
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Trying fallback model', {
        model: 'claude-3-haiku',
        fallbackId: 'fallback-model-1'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Trying fallback model', {
        model: 'gpt-4-mini',
        fallbackId: 'fallback-model-2'
      });
    });
  });
});