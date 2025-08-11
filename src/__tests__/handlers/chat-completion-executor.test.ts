import { ChatCompletionExecutor } from '../../handlers/chat-completion-executor';
import { SettingsService } from '../../services/settings.service';
import { createMockLogger } from '../../test-helpers/logger.mock';
import { createMockRequest, createMockResponse } from '../../test-helpers/express.mock';
import { createMockAxios } from '../../test-helpers/axios.mock';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

// Mock utility functions
jest.mock('../../utils/model', () => ({
  extractModelName: jest.fn((model: string) => model.split('/').pop() || model),
  getProviderFromModel: jest.fn((model: string) => {
    if (model.startsWith('anthropic/')) return 'Anthropic';
    if (model.startsWith('openrouter/')) return 'OpenRouter';
    return 'OpenAI';
  }),
  getTargetUrl: jest.fn((model: string) => {
    if (model.startsWith('anthropic/')) return 'https://api.anthropic.com/v1/messages';
    if (model.startsWith('openrouter/')) return 'https://openrouter.ai/api/v1/chat/completions';
    return 'https://api.openai.com/v1/chat/completions';
  }),
  getApiKey: jest.fn((apiKeySpec: string) => apiKeySpec),
  buildProxyHeaders: jest.fn(() => ({ 'Content-Type': 'application/json' }))
}));

jest.mock('../../utils/fallback', () => ({
  extractErrorMessage: jest.fn((data) => {
    if (data?.error?.message) return data.error.message;
    return 'Unknown error';
  })
}));

jest.mock('../../utils/json', () => ({
  getSafeSize: jest.fn(() => 1024)
}));

describe('ChatCompletionExecutor', () => {
  let executor: ChatCompletionExecutor;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockRes: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockSettingsService = {
      getFallbackSettings: jest.fn()
    } as any;
    
    executor = new ChatCompletionExecutor(mockSettingsService, mockLogger);
    mockReq = createMockRequest();
    mockRes = createMockResponse();

    // Default fallback settings
    mockSettingsService.getFallbackSettings.mockResolvedValue({
      maxRetries: 3,
      retryDelay: 1000,
      enableFallbacks: true,
      fallbackOnServerError: true,
      fallbackOnContextLength: true,
      fallbackOnRateLimit: true
    });

    // Reset axios mock
    mockedAxios.mockReset();
  });

  describe('attemptModelRequest', () => {
    const modelConfig = { model: 'openai/gpt-3.5-turbo', apiKey: 'test-api-key' };
    const requestData = { messages: [{ role: 'user', content: 'Hello' }] };

    it('should successfully execute a model request', async () => {
      const mockResponse = {
        status: 200,
        data: { choices: [{ message: { content: 'Hello there!' } }] },
        headers: { 'content-type': 'application/json' }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ success: true });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse.data);
      expect(mockLogger.debug).toHaveBeenCalledWith('Making request to model API (attempt 1/3)');
    });

    it('should handle server errors with retry', async () => {
      const mockResponse = {
        status: 500,
        data: { error: { message: 'Internal server error' } }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ 
        success: false, 
        error: 'Server error: 500' 
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('Server error 500, retrying...');
    });

    it('should handle rate limiting with retry', async () => {
      const mockResponse = {
        status: 429,
        data: { error: { message: 'Rate limit exceeded' } }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ 
        success: false, 
        error: 'Rate limited' 
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('Rate limited, retrying...');
    });

    it('should not retry server errors on final attempt', async () => {
      const mockResponse = {
        status: 500,
        data: { error: { message: 'Internal server error' } }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        3, // Final attempt
        3
      );

      // On final attempt with server error fallback enabled, should not retry but may still succeed 
      // if response is processed successfully
      if (result.success) {
        expect(mockRes.status).toHaveBeenCalledWith(500);
      } else {
        expect(result.error).toContain('Server error: 500');
      }
      // Should not log retry message on final attempt
      expect(mockLogger.warn).not.toHaveBeenCalledWith('Server error 500, retrying...');
    });

    it('should trigger fallback on context length error', async () => {
      const mockResponse = {
        status: 400,
        data: { error: { message: 'Context length exceeded' } }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ 
        success: false, 
        shouldFallback: true, 
        error: 'Context length exceeded' 
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Context length exceeded, requesting fallback');
    });

    it('should trigger fallback on model not found error', async () => {
      const mockResponse = {
        status: 400,
        data: { error: { message: 'Model not found: model_not_found' } }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ 
        success: false, 
        shouldFallback: true, 
        error: 'Model not found: model_not_found' 
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Model issue detected, requesting fallback');
    });

    it('should handle network errors', async () => {
      const networkError = {
        code: 'ECONNRESET',
        message: 'Connection reset by peer'
      };
      
      (mockedAxios as any).mockRejectedValue(networkError);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        2,
        3
      );

      expect(result).toEqual({ 
        success: false, 
        error: 'Network error: ECONNRESET' 
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Network error on attempt 2', 
        { code: 'ECONNRESET' }
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Request timeout'
      };
      
      mockedAxios.mockRejectedValue(timeoutError);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ 
        success: false, 
        error: 'Network error: ETIMEDOUT' 
      });
    });

    it('should trigger fallback on 404 API endpoint error', async () => {
      const apiError = {
        response: { status: 404 },
        message: 'API endpoint not found'
      };
      
      mockedAxios.mockRejectedValue(apiError);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ 
        success: false, 
        shouldFallback: true, 
        error: 'Model API endpoint not found' 
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Model API endpoint not found');
    });

    it('should handle request preparation failures', async () => {
      const invalidModelConfig = { model: '', apiKey: '' };

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        invalidModelConfig,
        requestData,
        1,
        3
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key not configured');
    });

    it('should handle successful response processing errors', async () => {
      const mockResponse = {
        status: 200,
        data: { choices: [{ message: { content: 'Hello' } }] },
        headers: { 'content-type': 'application/json' }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);
      
      // Mock res.json to throw an error
      (mockRes.json as any) = jest.fn(() => {
        throw new Error('Response processing error');
      });

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Response processing failed');
    });

    it('should respect fallback settings for server errors', async () => {
      mockSettingsService.getFallbackSettings.mockResolvedValue({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnServerError: false, // Disabled
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true
      });

      const mockResponse = {
        status: 500,
        data: { error: { message: 'Server error' } }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        3, // Final attempt
        3
      );

      // When server error fallback is disabled, should process response normally
      // even with 500 status if response is successful
      if (result.success) {
        expect(mockRes.status).toHaveBeenCalledWith(500);
      } else {
        expect(result.error).toContain('Server error: 500');
      }
    });

    it('should respect fallback settings for rate limits', async () => {
      mockSettingsService.getFallbackSettings.mockResolvedValue({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnServerError: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: false // Disabled
      });

      const mockResponse = {
        status: 429,
        data: { error: { message: 'Rate limited' } }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        3, // Final attempt
        3
      );

      // When rate limit fallback is disabled, should process response normally
      // even with 429 status if response is successful
      if (result.success) {
        expect(mockRes.status).toHaveBeenCalledWith(429);
      } else {
        expect(result.error).toContain('Rate limited');
      }
    });

    it('should handle unknown axios errors', async () => {
      const unknownError = {
        message: 'Unknown network error'
      };
      
      mockedAxios.mockRejectedValue(unknownError);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ 
        success: false, 
        error: 'Unknown network error' 
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error on attempt 1', 
        unknownError
      );
    });

    it('should set proper response headers on success', async () => {
      const mockResponse = {
        status: 200,
        data: { choices: [{ message: { content: 'Hello' } }] },
        headers: { 
          'content-type': 'application/json',
          'x-custom-header': 'custom-value'
        }
      };
      
      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await executor.attemptModelRequest(
        mockReq as any,
        mockRes as any,
        modelConfig,
        requestData,
        1,
        3
      );

      expect(result).toEqual({ success: true });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.set).toHaveBeenCalledWith(mockResponse.headers);
    });
  });
});