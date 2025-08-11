import { ChatCompletionResponseHandler } from '../../handlers/chat-completion-response-handler';
import { createMockResponse } from '../../test-helpers/express.mock';
import { createMockLogger } from '../../test-helpers/logger.mock';

describe('ChatCompletionResponseHandler', () => {
  let responseHandler: ChatCompletionResponseHandler;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockRes: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    responseHandler = new ChatCompletionResponseHandler(mockLogger);
    mockRes = createMockResponse();
  });

  describe('handleChatError', () => {
    it('should handle Error objects correctly', () => {
      const testError = new Error('Test error message');
      
      responseHandler.handleChatError(testError, mockRes as any);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Chat completion error', testError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Test error message',
          type: 'internal_error'
        }
      });
    });

    it('should handle non-Error objects', () => {
      const testError = 'String error';
      
      responseHandler.handleChatError(testError, mockRes as any);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Chat completion error', testError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Unknown error occurred',
          type: 'internal_error'
        }
      });
    });

    it('should handle null/undefined errors', () => {
      responseHandler.handleChatError(null, mockRes as any);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Unknown error occurred',
          type: 'internal_error'
        }
      });
    });
  });

  describe('sendValidationError', () => {
    it('should send validation error with default type', () => {
      responseHandler.sendValidationError(mockRes as any, 'Test validation message');
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Test validation message',
          type: 'invalid_request_error'
        }
      });
    });

    it('should send validation error with custom type', () => {
      responseHandler.sendValidationError(mockRes as any, 'Custom validation message', 'custom_error');
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Custom validation message',
          type: 'custom_error'
        }
      });
    });
  });

  describe('sendModelNotFoundError', () => {
    it('should send model not found error', () => {
      responseHandler.sendModelNotFoundError(mockRes as any, 'gpt-4');
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Model gpt-4 not found',
          type: 'invalid_request_error'
        }
      });
    });
  });

  describe('sendServerError', () => {
    it('should send server error with default status code', () => {
      responseHandler.sendServerError(mockRes as any, 'Internal server error');
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          type: 'internal_error'
        }
      });
    });

    it('should send server error with custom status code', () => {
      responseHandler.sendServerError(mockRes as any, 'Bad gateway', 502);
      
      expect(mockRes.status).toHaveBeenCalledWith(502);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Bad gateway',
          type: 'internal_error'
        }
      });
    });
  });

  describe('sendSuccessResponse', () => {
    it('should send success response with default status code', () => {
      const responseData = { message: 'Success', data: [1, 2, 3] };
      
      responseHandler.sendSuccessResponse(mockRes as any, responseData);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(responseData);
    });

    it('should send success response with custom status code', () => {
      const responseData = { created: true, id: 123 };
      
      responseHandler.sendSuccessResponse(mockRes as any, responseData, 201);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(responseData);
    });
  });

  describe('processError', () => {
    it('should process Error objects and determine error type', () => {
      const testError = new Error('Connection timeout occurred');
      const context = { attemptNumber: 3 };
      
      const result = responseHandler.processError(testError, context);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Processing error', testError, context);
      expect(result).toEqual({
        message: 'Connection timeout occurred',
        type: 'timeout_error'
      });
    });

    it('should detect network errors', () => {
      const testError = new Error('ECONNRESET: Connection reset by peer');
      
      const result = responseHandler.processError(testError);
      
      expect(result.type).toBe('network_error');
      expect(result.message).toBe('ECONNRESET: Connection reset by peer');
    });

    it('should detect rate limit errors', () => {
      const testError = new Error('rate limit exceeded');
      
      const result = responseHandler.processError(testError);
      
      expect(result.type).toBe('rate_limit_error');
    });

    it('should detect context length errors', () => {
      const testError = new Error('context length exceeded maximum');
      
      const result = responseHandler.processError(testError);
      
      expect(result.type).toBe('context_length_error');
    });

    it('should default to internal_error for unknown error types', () => {
      const testError = new Error('Some unknown error');
      
      const result = responseHandler.processError(testError);
      
      expect(result.type).toBe('internal_error');
    });

    it('should handle non-Error objects', () => {
      const testError = 'String error message';
      
      const result = responseHandler.processError(testError);
      
      expect(result).toEqual({
        message: 'String error message',
        type: 'internal_error'
      });
    });

    it('should handle errors without context', () => {
      const testError = new Error('Test error');
      
      const result = responseHandler.processError(testError);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Processing error', testError, undefined);
      expect(result.message).toBe('Test error');
    });
  });
});