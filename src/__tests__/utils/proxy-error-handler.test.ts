import { ProxyErrorHandler } from '../../utils/proxy-error-handler';
import { AxiosError } from 'axios';
import { ILogger } from '../../logger-interface';
import { getProviderFromModel } from '../../utils/model';

// Mock the model utility
jest.mock('../../utils/model');

describe('ProxyErrorHandler', () => {
  let errorHandler: ProxyErrorHandler;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    errorHandler = new ProxyErrorHandler(mockLogger);
    jest.clearAllMocks();
  });

  describe('handleRequestError', () => {
    it('should handle 413 Payload Too Large error', () => {
      const axiosError: Partial<AxiosError> = {
        message: 'Request entity too large',
        code: 'ERR_BAD_REQUEST',
        response: {
          status: 413,
          statusText: 'Payload Too Large',
          data: { error: 'Payload too large' },
        } as any,
        config: {
          url: 'https://api.example.com/chat/completions',
          data: { message: 'test' },
        } as any,
      };

      const result = errorHandler.handleRequestError(axiosError, 1);

      expect(result).toEqual({
        success: false,
        error: 'Request entity too large - payload exceeds provider limits',
      });
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '413 Payload Too Large Error',
        expect.any(Error),
        expect.objectContaining({
          attempt: 1,
          status: 413,
          statusText: 'Payload Too Large',
        })
      );
    });

    it('should handle timeout errors', () => {
      const axiosError: Partial<AxiosError> = {
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED',
        config: {
          url: 'https://api.example.com/chat/completions',
          data: { message: 'test' },
        } as any,
      };

      const result = errorHandler.handleRequestError(axiosError, 2);

      expect(result).toEqual({
        success: false,
        error: 'Request timeout - provider took too long to respond',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request attempt failed',
        expect.any(Error),
        expect.objectContaining({
          attempt: 2,
          code: 'ECONNABORTED',
        })
      );
    });

    it('should handle max body length exceeded error', () => {
      const axiosError: Partial<AxiosError> = {
        message: 'maxBodyLength size of 10485760 exceeded',
        code: 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED',
        config: {
          url: 'https://api.example.com/chat/completions',
          data: { message: 'very long message' },
        } as any,
      };

      const result = errorHandler.handleRequestError(axiosError, 1);

      expect(result).toEqual({
        success: false,
        error: 'Request payload exceeds maximum allowed size',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request attempt failed',
        expect.any(Error),
        expect.objectContaining({
          attempt: 1,
          code: 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED',
        })
      );
    });

    it('should handle generic axios errors', () => {
      const axiosError: Partial<AxiosError> = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' },
        } as any,
        config: {
          url: 'https://api.example.com/chat/completions',
          data: { message: 'test' },
        } as any,
      };

      const result = errorHandler.handleRequestError(axiosError, 3);

      expect(result).toEqual({
        success: false,
        error: 'Network Error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request attempt failed',
        expect.any(Error),
        expect.objectContaining({
          attempt: 3,
          status: 500,
          statusText: 'Internal Server Error',
        })
      );
    });

    it('should handle errors without response data', () => {
      const axiosError: Partial<AxiosError> = {
        message: 'Connection refused',
        code: 'ECONNREFUSED',
        config: {
          url: 'https://api.example.com/chat/completions',
        } as any,
      };

      const result = errorHandler.handleRequestError(axiosError, 1);

      expect(result).toEqual({
        success: false,
        error: 'Connection refused',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request attempt failed',
        expect.any(Error),
        expect.objectContaining({
          attempt: 1,
          code: 'ECONNREFUSED',
          status: undefined,
          requestSize: 0,
        })
      );
    });

    it('should handle errors without message', () => {
      const axiosError: Partial<AxiosError> = {
        message: '',
        code: 'ERR_UNKNOWN',
        config: {} as any,
      };

      const result = errorHandler.handleRequestError(axiosError, 1);

      expect(result).toEqual({
        success: false,
        error: 'Unknown request error',
      });
    });

    it('should handle non-axios errors', () => {
      const genericError = new Error('Generic error');

      const result = errorHandler.handleRequestError(genericError, 1);

      expect(result).toEqual({
        success: false,
        error: 'Generic error',
      });
    });

    it('should calculate request size correctly', () => {
      const requestData = { messages: [{ role: 'user', content: 'Hello world' }] };
      const axiosError: Partial<AxiosError> = {
        message: 'Test error',
        code: 'ERR_TEST',
        config: {
          url: 'https://api.example.com/chat/completions',
          data: requestData, // Pass the object, not stringified
        } as any,
      };

      errorHandler.handleRequestError(axiosError, 1);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request attempt failed',
        expect.any(Error),
        expect.objectContaining({
          requestSize: JSON.stringify(requestData).length,
        })
      );
    });
  });

  describe('handleChatError', () => {
    it('should handle timeout errors', () => {
      const error = new Error('Request timeout exceeded');

      const result = errorHandler.handleChatError(error);

      expect(result).toEqual({
        status: 408,
        message: 'Request timeout',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Chat completion error', error);
    });

    it('should handle payload too large errors', () => {
      const error = new Error('Payload is too large for processing');

      const result = errorHandler.handleChatError(error);

      expect(result).toEqual({
        status: 413,
        message: 'Payload too large',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Chat completion error', error);
    });

    it('should handle rate limit errors', () => {
      const error = new Error('rate limit exceeded, please try again later');

      const result = errorHandler.handleChatError(error);

      expect(result).toEqual({
        status: 429,
        message: 'Rate limit exceeded',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Chat completion error', error);
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      const result = errorHandler.handleChatError(error);

      expect(result).toEqual({
        status: 500,
        message: 'Unknown request error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Chat completion error', error);
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';

      const result = errorHandler.handleChatError(error);

      expect(result).toEqual({
        status: 500,
        message: 'Unknown request error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Chat completion error', error);
    });

    it('should handle null/undefined errors', () => {
      const result = errorHandler.handleChatError(null);

      expect(result).toEqual({
        status: 500,
        message: 'Unknown request error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Chat completion error', null);
    });
  });

  describe('validateRequestSize', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate request size for OpenAI models', () => {
      (getProviderFromModel as jest.Mock).mockReturnValue('openai');
      const requestBody = { messages: [{ role: 'user', content: 'Hello' }] };

      const result = errorHandler.validateRequestSize(requestBody, 'gpt-3.5-turbo');

      expect(result).toEqual({
        valid: true,
        maxSize: 20 * 1024 * 1024, // 20MB
      });
      expect(getProviderFromModel).toHaveBeenCalledWith('gpt-3.5-turbo');
    });

    it('should validate request size for Anthropic models', () => {
      (getProviderFromModel as jest.Mock).mockReturnValue('anthropic');
      const requestBody = { messages: [{ role: 'user', content: 'Hello' }] };

      const result = errorHandler.validateRequestSize(requestBody, 'claude-3-opus');

      expect(result).toEqual({
        valid: true,
        maxSize: 25 * 1024 * 1024, // 25MB
      });
      expect(getProviderFromModel).toHaveBeenCalledWith('claude-3-opus');
    });

    it('should validate request size for unknown providers', () => {
      (getProviderFromModel as jest.Mock).mockReturnValue('unknown');
      const requestBody = { messages: [{ role: 'user', content: 'Hello' }] };

      const result = errorHandler.validateRequestSize(requestBody, 'custom-model');

      expect(result).toEqual({
        valid: true,
        maxSize: 10 * 1024 * 1024, // 10MB default
      });
    });

    it('should reject oversized requests for OpenAI', () => {
      (getProviderFromModel as jest.Mock).mockReturnValue('openai');
      
      // Create a large request body that exceeds 20MB
      const largeContent = 'a'.repeat(21 * 1024 * 1024); // 21MB of 'a' characters
      const requestBody = { messages: [{ role: 'user', content: largeContent }] };

      const result = errorHandler.validateRequestSize(requestBody, 'gpt-4');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Request too large');
      expect(result.error).toContain('exceeds openai limit of 20MB');
      expect(result.maxSize).toBe(20 * 1024 * 1024);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request too large for provider',
        expect.any(Error),
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
          maxSize: 20 * 1024 * 1024,
        })
      );
    });

    it('should reject oversized requests for Anthropic', () => {
      (getProviderFromModel as jest.Mock).mockReturnValue('anthropic');
      
      // Create a large request body that exceeds 25MB
      const largeContent = 'b'.repeat(26 * 1024 * 1024); // 26MB of 'b' characters
      const requestBody = { messages: [{ role: 'user', content: largeContent }] };

      const result = errorHandler.validateRequestSize(requestBody, 'claude-3-sonnet');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Request too large');
      expect(result.error).toContain('exceeds anthropic limit of 25MB');
      expect(result.maxSize).toBe(25 * 1024 * 1024);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request too large for provider',
        expect.any(Error),
        expect.objectContaining({
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          maxSize: 25 * 1024 * 1024,
        })
      );
    });

    it('should reject oversized requests for unknown providers', () => {
      (getProviderFromModel as jest.Mock).mockReturnValue('unknown');
      
      // Create a large request body that exceeds 10MB
      const largeContent = 'c'.repeat(11 * 1024 * 1024); // 11MB of 'c' characters
      const requestBody = { messages: [{ role: 'user', content: largeContent }] };

      const result = errorHandler.validateRequestSize(requestBody, 'custom-model');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Request too large');
      expect(result.error).toContain('exceeds unknown limit of 10MB');
      expect(result.maxSize).toBe(10 * 1024 * 1024);
    });

    it('should handle empty request bodies', () => {
      (getProviderFromModel as jest.Mock).mockReturnValue('openai');
      const requestBody = {};

      const result = errorHandler.validateRequestSize(requestBody, 'gpt-3.5-turbo');

      expect(result).toEqual({
        valid: true,
        maxSize: 20 * 1024 * 1024,
      });
    });

    it('should handle complex nested request bodies', () => {
      (getProviderFromModel as jest.Mock).mockReturnValue('anthropic');
      const requestBody = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        metadata: {
          user_id: '12345',
          session_id: 'abcdef',
          preferences: {
            style: 'formal',
            length: 'medium',
          },
        },
      };

      const result = errorHandler.validateRequestSize(requestBody, 'claude-3-haiku');

      expect(result.valid).toBe(true);
      expect(result.maxSize).toBe(25 * 1024 * 1024);
    });
  });

  describe('error detail construction', () => {
    it('should construct complete error details when all data is available', () => {
      const testData = { test: 'data' };
      const axiosError: Partial<AxiosError> = {
        message: 'Test error',
        code: 'ERR_TEST',
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Invalid request' },
        } as any,
        config: {
          url: 'https://api.example.com/chat/completions',
          data: testData, // Pass the object, not stringified
        } as any,
      };

      errorHandler.handleRequestError(axiosError, 5);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request attempt failed',
        expect.any(Error),
        expect.objectContaining({
          attempt: 5,
          code: 'ERR_TEST',
          status: 400,
          statusText: 'Bad Request',
          responseData: { error: 'Invalid request' },
          requestSize: JSON.stringify(testData).length,
          url: 'https://api.example.com/chat/completions',
        })
      );
    });

    it('should handle missing config data gracefully', () => {
      const axiosError: Partial<AxiosError> = {
        message: 'Test error',
        code: 'ERR_TEST',
        config: {
          url: 'https://api.example.com/chat/completions',
        } as any,
      };

      errorHandler.handleRequestError(axiosError, 1);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request attempt failed',
        expect.any(Error),
        expect.objectContaining({
          requestSize: 0,
        })
      );
    });
  });
});