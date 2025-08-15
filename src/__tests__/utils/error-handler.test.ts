import { Response } from 'express';
import { handleApiError, handleConfigError } from '../../utils/error-handler';
import { createMockLogger } from '../../test-helpers/logger.mock';

describe('Error Handler Utils', () => {
  describe('handleApiError', () => {
    let mockResponse: Partial<Response>;
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockLogger = createMockLogger();
    });

    it('should handle error with default status code 500', () => {
      const error = new Error('Test error');
      const operation = 'fetch user data';

      handleApiError(mockResponse as Response, { logger: mockLogger, operation, error });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch user data', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch user data' });
    });

    it('should handle error with custom status code', () => {
      const error = new Error('Not found');
      const operation = 'find resource';
      const customStatusCode = 404;

      handleApiError(mockResponse as Response, { logger: mockLogger, operation, error, statusCode: customStatusCode });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to find resource', error);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to find resource' });
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      const operation = 'process request';

      handleApiError(mockResponse as Response, { logger: mockLogger, operation, error });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to process request', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to process request' });
    });

    it('should handle null error', () => {
      const error = null;
      const operation = 'validate input';

      handleApiError(mockResponse as Response, { logger: mockLogger, operation, error });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to validate input', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to validate input' });
    });

    it('should handle undefined error', () => {
      const error = undefined;
      const operation = 'save data';

      handleApiError(mockResponse as Response, { logger: mockLogger, operation, error });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to save data', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to save data' });
    });

    it('should handle object error', () => {
      const error = { message: 'Database connection failed', code: 'DB_ERROR' };
      const operation = 'connect to database';

      handleApiError(mockResponse as Response, { logger: mockLogger, operation, error });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect to database', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to connect to database' });
    });

    it('should handle different status codes', () => {
      const testCases = [
        { statusCode: 400, operation: 'validate request' },
        { statusCode: 401, operation: 'authenticate user' },
        { statusCode: 403, operation: 'authorize access' },
        { statusCode: 404, operation: 'find resource' },
        { statusCode: 422, operation: 'process data' },
      ];

      testCases.forEach(({ statusCode, operation }) => {
        const error = new Error(`${statusCode} error`);

        handleApiError(mockResponse as Response, { logger: mockLogger, operation, error, statusCode });

        expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: `Failed to ${operation}` });
      });
    });

    it('should ensure response methods are called in correct order', () => {
      const error = new Error('Test error');
      const operation = 'test operation';

      handleApiError(mockResponse as Response, { logger: mockLogger, operation, error });

      // Verify that status is called before json
      const statusCall = (mockResponse.status as jest.Mock).mock.invocationCallOrder[0];
      const jsonCall = (mockResponse.json as jest.Mock).mock.invocationCallOrder[0];

      expect(statusCall).toBeLessThan(jsonCall);
    });

    it('should return void', () => {
      const error = new Error('Test error');
      const operation = 'test operation';

      const result = handleApiError(mockResponse as Response, { logger: mockLogger, operation, error });

      expect(result).toBeUndefined();
    });
  });

  describe('handleConfigError', () => {
    it('should throw error with Error instance', () => {
      const originalError = new Error('Config file not found');
      const operation = 'load configuration';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow('Failed to load configuration: Config file not found');
    });

    it('should throw error with string error', () => {
      const originalError = 'Invalid JSON format';
      const operation = 'parse config';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow('Failed to parse config: Unknown error');
    });

    it('should throw error with null error', () => {
      const originalError = null;
      const operation = 'validate config';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow('Failed to validate config: Unknown error');
    });

    it('should throw error with undefined error', () => {
      const originalError = undefined;
      const operation = 'save config';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow('Failed to save config: Unknown error');
    });

    it('should throw error with object error', () => {
      const originalError = { code: 'ENOENT', path: '/config.json' };
      const operation = 'read config file';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow('Failed to read config file: Unknown error');
    });

    it('should handle Error with empty message', () => {
      const originalError = new Error('');
      const operation = 'process config';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow('Failed to process config: ');
    });

    it('should handle Error with only whitespace message', () => {
      const originalError = new Error('   ');
      const operation = 'validate config format';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow('Failed to validate config format:    ');
    });

    it('should handle complex Error messages', () => {
      const originalError = new Error(
        'Configuration validation failed: missing required field "apiKey" in section "providers.openai"'
      );
      const operation = 'validate configuration schema';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow(
        'Failed to validate configuration schema: Configuration validation failed: missing required field "apiKey" in section "providers.openai"'
      );
    });

    it('should handle different operation descriptions', () => {
      const operations = [
        'load default settings',
        'parse user configuration',
        'merge configuration files',
        'validate API keys',
        'initialize service',
      ];

      const originalError = new Error('Test error');

      operations.forEach(operation => {
        expect(() => {
          handleConfigError(operation, originalError);
        }).toThrow(`Failed to ${operation}: Test error`);
      });
    });

    it('should never return (function signature is never)', () => {
      const originalError = new Error('Test error');
      const operation = 'test operation';

      // This test verifies the function throws and doesn't return
      let didThrow = false;
      try {
        handleConfigError(operation, originalError);
      } catch (error) {
        didThrow = true;
      }

      expect(didThrow).toBe(true);
    });

    it('should throw Error instances', () => {
      const originalError = new Error('Original error');
      const operation = 'test operation';

      expect(() => {
        handleConfigError(operation, originalError);
      }).toThrow(Error);
    });

    it('should create new Error instances (not re-throw original)', () => {
      const originalError = new Error('Original error');
      const operation = 'test operation';

      try {
        handleConfigError(operation, originalError);
      } catch (thrownError) {
        expect(thrownError).not.toBe(originalError);
        expect(thrownError).toBeInstanceOf(Error);
        expect((thrownError as Error).message).toBe('Failed to test operation: Original error');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle API error followed by config error in sequence', () => {
      const mockResponse: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockLogger = createMockLogger();

      // First handle an API error
      const apiError = new Error('API failure');
      handleApiError(mockResponse as Response, { logger: mockLogger, operation: 'handle request', error: apiError, statusCode: 500 });

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to handle request', apiError);

      // Then handle a config error
      const configError = new Error('Config failure');
      expect(() => {
        handleConfigError('load settings', configError);
      }).toThrow('Failed to load settings: Config failure');
    });

    it('should handle error-prone operations consistently', () => {
      const mockResponse: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockLogger = createMockLogger();

      const operations = [
        'authenticate user',
        'validate request',
        'process data',
        'save to database',
        'send response',
      ];

      operations.forEach((operation, index) => {
        const error = new Error(`Error in ${operation}`);
        const statusCode = 400 + index;

        handleApiError(mockResponse as Response, { logger: mockLogger, operation, error, statusCode });

        expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: `Failed to ${operation}` });
        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to ${operation}`, error);
      });
    });
  });
});
