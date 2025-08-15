import { ChatCompletionRetryHandler, RetryResult, AttemptRequest } from '../../handlers/chat-completion-retry-handler';
import { SettingsService } from '../../services/settings.service';
import { createMockLogger } from '../../test-helpers/logger.mock';
import { createMockRequest, createMockResponse } from '../../test-helpers/express.mock';

// Mock the delay function
jest.mock('../../utils/fallback', () => ({
  delay: jest.fn(() => Promise.resolve())
}));

describe('ChatCompletionRetryHandler', () => {
  let retryHandler: ChatCompletionRetryHandler;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockAttemptHandler: jest.MockedFunction<(request: AttemptRequest) => Promise<RetryResult>>;
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockRes: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockSettingsService = {
      getFallbackSettings: jest.fn()
    } as any;
    
    retryHandler = new ChatCompletionRetryHandler(mockSettingsService, mockLogger);
    mockAttemptHandler = jest.fn();
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
  });

  describe('tryModelWithRetries', () => {
    const modelConfig = { model: 'gpt-3.5-turbo', apiKey: 'test-key' };
    const requestData = { messages: [{ role: 'user', content: 'test' }] };
    const modelId = 'test-model';

    it('should succeed on first attempt', async () => {
      const successResult: RetryResult = { success: true };
      mockAttemptHandler.mockResolvedValue(successResult);

      const result = await retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      });

      expect(result).toEqual(successResult);
      expect(mockAttemptHandler).toHaveBeenCalledTimes(1);
      expect(mockAttemptHandler).toHaveBeenCalledWith({
        req: mockReq,
        res: mockRes,
        modelConfig,
        requestData,
        attempt: 1,
        maxRetries: 3
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Model test-model succeeded on attempt 1');
    });

    it('should return immediately if fallback is required', async () => {
      const fallbackResult: RetryResult = { 
        success: false, 
        shouldFallback: true, 
        error: 'Context length exceeded' 
      };
      mockAttemptHandler.mockResolvedValue(fallbackResult);

      const result = await retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      });

      expect(result).toEqual(fallbackResult);
      expect(mockAttemptHandler).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Model test-model requires fallback on attempt 1: Context length exceeded'
      );
    });

    it('should retry on failure and eventually succeed', async () => {
      const failureResult: RetryResult = { success: false, error: 'Server error' };
      const successResult: RetryResult = { success: true };
      
      mockAttemptHandler
        .mockResolvedValueOnce(failureResult)
        .mockResolvedValueOnce(successResult);

      const result = await retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      });

      expect(result).toEqual(successResult);
      expect(mockAttemptHandler).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith('Model test-model failed attempt 1: Server error');
      expect(mockLogger.info).toHaveBeenCalledWith('Model test-model succeeded on attempt 2');
    });

    it('should exhaust all retries and return failure', async () => {
      const failureResult: RetryResult = { success: false, error: 'Persistent error' };
      mockAttemptHandler.mockResolvedValue(failureResult);

      const result = await retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      });

      expect(result).toEqual({ success: false, error: 'Persistent error' });
      expect(mockAttemptHandler).toHaveBeenCalledTimes(3); // maxRetries
      expect(mockLogger.error).toHaveBeenCalledWith(
        'All retry attempts failed for model test-model',
        new Error('Persistent error')
      );
    });

    it('should use custom retry settings', async () => {
      mockSettingsService.getFallbackSettings.mockResolvedValue({
        maxRetries: 5,
        retryDelay: 500,
        enableFallbacks: true,
        fallbackOnServerError: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true
      });

      const failureResult: RetryResult = { success: false, error: 'Test error' };
      mockAttemptHandler.mockResolvedValue(failureResult);

      const result = await retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      });

      expect(result).toEqual({ success: false, error: 'Test error' });
      expect(mockAttemptHandler).toHaveBeenCalledTimes(5); // Custom maxRetries
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting retry attempts for model test-model',
        { maxRetries: 5, retryDelay: 500 }
      );
    });

    it('should handle attempt handler throwing errors', async () => {
      const testError = new Error('Handler threw error');
      mockAttemptHandler.mockRejectedValue(testError);

      await expect(retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      })).rejects.toThrow('Handler threw error');

      expect(mockAttemptHandler).toHaveBeenCalledTimes(1);
    });

    it('should log debug information for each attempt', async () => {
      const failureResult: RetryResult = { success: false, error: 'Test error' };
      mockAttemptHandler.mockResolvedValue(failureResult);

      await retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Attempt 1/3 for model test-model');
      expect(mockLogger.debug).toHaveBeenCalledWith('Attempt 2/3 for model test-model');
      expect(mockLogger.debug).toHaveBeenCalledWith('Attempt 3/3 for model test-model');
    });

    it('should log delay information between retries', async () => {
      const failureResult: RetryResult = { success: false, error: 'Test error' };
      const successResult: RetryResult = { success: true };
      
      mockAttemptHandler
        .mockResolvedValueOnce(failureResult)
        .mockResolvedValueOnce(successResult);

      await retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Waiting 2000ms before next retry');
    });

    it('should handle undefined error in result', async () => {
      const failureResult: RetryResult = { success: false }; // No error message
      mockAttemptHandler.mockResolvedValue(failureResult);

      const result = await retryHandler.tryModelWithRetries({
        req: mockReq as any,
        res: mockRes as any,
        modelConfig,
        requestData,
        modelId,
        attemptHandler: mockAttemptHandler
      });

      expect(result).toEqual({ success: false, error: undefined });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'All retry attempts failed for model test-model',
        new Error('Unknown error')
      );
    });
  });
});