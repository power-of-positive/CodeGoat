import { ChatRequestValidator } from '../../handlers/chat-request-validator';
import { createMockResponse } from '../../test-helpers/express.mock';
import { ModelConfig } from '../../types';

describe('ChatRequestValidator', () => {
  let validator: ChatRequestValidator;
  let mockConfig: ModelConfig;
  let mockRes: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockConfig = {
      models: {
        'model1': {
          name: 'gpt-3.5-turbo',
          model: 'openai/gpt-3.5-turbo',
          provider: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          enabled: true
        },
        'model2': {
          name: 'claude-3-haiku',
          model: 'anthropic/claude-3-haiku-20240307',
          provider: 'Anthropic',
          baseUrl: 'https://api.anthropic.com/v1',
          apiKey: 'test-anthropic-key',
          enabled: true
        },
        'disabled-model': {
          name: 'disabled-model',
          model: 'openai/gpt-4',
          provider: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          enabled: false
        }
      },
      fallbacks: {}
    };

    validator = new ChatRequestValidator(mockConfig);
    mockRes = createMockResponse();
  });

  describe('validateChatRequest', () => {
    it('should return false for valid model request', () => {
      const result = validator.validateChatRequest('gpt-3.5-turbo', mockRes as any);
      
      expect(result).toBe(false);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return true and send error for missing model', () => {
      const result = validator.validateChatRequest('', mockRes as any);
      
      expect(result).toBe(true);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: 'Model parameter is required', 
          type: 'invalid_request_error' 
        }
      });
    });

    it('should return true and send error for null model', () => {
      const result = validator.validateChatRequest(null as any, mockRes as any);
      
      expect(result).toBe(true);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: 'Model parameter is required', 
          type: 'invalid_request_error' 
        }
      });
    });

    it('should return true and send error for undefined model', () => {
      const result = validator.validateChatRequest(undefined as any, mockRes as any);
      
      expect(result).toBe(true);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: 'Model parameter is required', 
          type: 'invalid_request_error' 
        }
      });
    });
  });

  describe('findModelEntry', () => {
    it('should return model entry for valid model name', () => {
      const result = validator.findModelEntry('gpt-3.5-turbo', mockRes as any);
      
      expect(result).toEqual([
        'model1',
        {
          name: 'gpt-3.5-turbo',
          model: 'openai/gpt-3.5-turbo',
          provider: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          enabled: true
        }
      ]);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return model entry for different valid model', () => {
      const result = validator.findModelEntry('claude-3-haiku', mockRes as any);
      
      expect(result).toEqual([
        'model2',
        {
          name: 'claude-3-haiku',
          model: 'anthropic/claude-3-haiku-20240307',
          provider: 'Anthropic',
          baseUrl: 'https://api.anthropic.com/v1',
          apiKey: 'test-anthropic-key',
          enabled: true
        }
      ]);
    });

    it('should return null and send error for non-existent model', () => {
      const result = validator.findModelEntry('non-existent-model', mockRes as any);
      
      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: 'Model non-existent-model not found', 
          type: 'invalid_request_error' 
        }
      });
    });

    it('should return null and send error for disabled model', () => {
      const result = validator.findModelEntry('disabled-model', mockRes as any);
      
      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: 'Model disabled-model not found', 
          type: 'invalid_request_error' 
        }
      });
    });

    it('should handle empty models config', () => {
      const emptyValidator = new ChatRequestValidator({ models: {}, fallbacks: {} });
      const result = emptyValidator.findModelEntry('any-model', mockRes as any);
      
      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { 
          message: 'Model any-model not found', 
          type: 'invalid_request_error' 
        }
      });
    });

    it('should handle model config with missing models property', () => {
      const invalidValidator = new ChatRequestValidator({ fallbacks: {} } as ModelConfig);
      const result = invalidValidator.findModelEntry('any-model', mockRes as any);
      
      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});