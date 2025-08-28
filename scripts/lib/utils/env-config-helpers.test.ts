/**
 * Tests for environment configuration helper utilities
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  fileExists,
  processVariables,
  applyVariablesToEnv,
  logSuccess,
  logNoFileFound,
  handleLoadError,
  EnvLoadResult,
} from './env-config-helpers';

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
  },
}));

const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('env-config-helpers', () => {
  let mockConsoleError: jest.Mock;
  let mockConsoleWarn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError = jest.fn();
    mockConsoleWarn = jest.fn();
    console.error = mockConsoleError;
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    // Clean up any test environment variables
    delete process.env.TEST_VAR;
    delete process.env.INVALID_VAR;
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockFsPromises.access.mockResolvedValue(undefined);

      const result = await fileExists('/path/to/existing/file');

      expect(result).toBe(true);
      expect(mockFsPromises.access).toHaveBeenCalledWith('/path/to/existing/file');
    });

    it('should return false when file does not exist', async () => {
      mockFsPromises.access.mockRejectedValue(new Error('File not found'));

      const result = await fileExists('/path/to/nonexistent/file');

      expect(result).toBe(false);
      expect(mockFsPromises.access).toHaveBeenCalledWith('/path/to/nonexistent/file');
    });

    it('should return false when access throws any error', async () => {
      mockFsPromises.access.mockRejectedValue('Permission denied');

      const result = await fileExists('/path/to/inaccessible/file');

      expect(result).toBe(false);
    });
  });

  describe('processVariables', () => {
    it('should process valid environment variables', () => {
      const parsed = {
        VALID_VAR: 'value1',
        ANOTHER_VAR: 'value2',
        TEST_123: 'value3',
      };
      const mergedVariables: Record<string, string> = {};
      const envPath = '/path/to/.env';

      const count = processVariables(parsed, mergedVariables, envPath);

      expect(count).toBe(3);
      expect(mergedVariables).toEqual({
        VALID_VAR: 'value1',
        ANOTHER_VAR: 'value2',
        TEST_123: 'value3',
      });
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should warn about invalid variable names', () => {
      const parsed = {
        'VALID_VAR': 'value1',
        '123_INVALID': 'value2', // Starts with number
        'invalid-var': 'value3', // Contains hyphen
        '$INVALID': 'value4', // Contains special character
      };
      const mergedVariables: Record<string, string> = {};
      const envPath = '/path/to/.env';

      const count = processVariables(parsed, mergedVariables, envPath);

      expect(count).toBe(1); // Only VALID_VAR should be processed
      expect(mergedVariables).toEqual({
        VALID_VAR: 'value1',
      });
      expect(mockConsoleWarn).toHaveBeenCalledTimes(3);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Warning: Invalid environment variable name '123_INVALID' in /path/to/.env"
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Warning: Invalid environment variable name 'invalid-var' in /path/to/.env"
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Warning: Invalid environment variable name '$INVALID' in /path/to/.env"
      );
    });

    it('should sanitize values with non-printable characters', () => {
      const parsed = {
        TEST_VAR: 'normal\u0000text\u007f\u001ffiltered', // Contains null, DEL, and control chars
      };
      const mergedVariables: Record<string, string> = {};
      const envPath = '/path/to/.env';

      const count = processVariables(parsed, mergedVariables, envPath);

      expect(count).toBe(1);
      expect(mergedVariables.TEST_VAR).toBe('normaltextfiltered'); // Non-printable chars removed
    });

    it('should convert non-string values to strings', () => {
      const parsed = {
        NUMBER_VAR: 123 as any,
        BOOLEAN_VAR: true as any,
        OBJECT_VAR: { key: 'value' } as any,
      };
      const mergedVariables: Record<string, string> = {};
      const envPath = '/path/to/.env';

      const count = processVariables(parsed, mergedVariables, envPath);

      expect(count).toBe(3);
      expect(mergedVariables).toEqual({
        NUMBER_VAR: '123',
        BOOLEAN_VAR: 'true',
        OBJECT_VAR: '[object Object]',
      });
    });

    it('should handle empty values', () => {
      const parsed = {
        EMPTY_VAR: '',
        WHITESPACE_VAR: '   ',
      };
      const mergedVariables: Record<string, string> = {};
      const envPath = '/path/to/.env';

      const count = processVariables(parsed, mergedVariables, envPath);

      expect(count).toBe(2);
      expect(mergedVariables).toEqual({
        EMPTY_VAR: '',
        WHITESPACE_VAR: '   ',
      });
    });
  });

  describe('applyVariablesToEnv', () => {
    it('should apply variables to process.env when they do not exist', () => {
      const mergedVariables = {
        NEW_VAR1: 'value1',
        NEW_VAR2: 'value2',
      };

      applyVariablesToEnv(mergedVariables);

      expect(process.env.NEW_VAR1).toBe('value1');
      expect(process.env.NEW_VAR2).toBe('value2');
    });

    it('should not override existing environment variables', () => {
      process.env.EXISTING_VAR = 'original_value';
      const mergedVariables = {
        EXISTING_VAR: 'new_value',
        NEW_VAR: 'value',
      };

      applyVariablesToEnv(mergedVariables);

      expect(process.env.EXISTING_VAR).toBe('original_value'); // Should remain unchanged
      expect(process.env.NEW_VAR).toBe('value'); // Should be set
    });

    it('should handle empty merged variables', () => {
      const mergedVariables = {};

      expect(() => applyVariablesToEnv(mergedVariables)).not.toThrow();
    });
  });

  describe('logSuccess', () => {
    it('should log success message when not in test environment and variables loaded', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logSuccess(5);

      expect(mockConsoleError).toHaveBeenCalledWith('✅ Loaded 5 environment variables');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not log when in test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      logSuccess(5);

      expect(mockConsoleError).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not log when no variables loaded', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logSuccess(0);

      expect(mockConsoleError).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('logNoFileFound', () => {
    it('should log no file found message when not in test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const projectRoot = '/project/root';
      const envPaths = ['/project/root/.env', '/project/root/.env.local'];

      logNoFileFound(projectRoot, envPaths);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'ℹ️ No .env file found in /project/root (checked: .env, .env.local)'
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not log when in test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const projectRoot = '/project/root';
      const envPaths = ['/project/root/.env'];

      logNoFileFound(projectRoot, envPaths);

      expect(mockConsoleError).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle empty env paths', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const projectRoot = '/project/root';
      const envPaths: string[] = [];

      logNoFileFound(projectRoot, envPaths);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'ℹ️ No .env file found in /project/root (checked: )'
      );

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('handleLoadError', () => {
    it('should handle Error instances', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Something went wrong');
      const result = handleLoadError(error);

      expect(result).toEqual({
        success: false,
        error: 'Something went wrong',
      });
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Warning: Failed to load environment config:',
        'Something went wrong'
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle non-Error exceptions', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = 'String error';
      const result = handleLoadError(error);

      expect(result).toEqual({
        success: false,
        error: 'String error',
      });
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Warning: Failed to load environment config:',
        'String error'
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not log warnings in test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const error = new Error('Test error');
      const result = handleLoadError(error);

      expect(result).toEqual({
        success: false,
        error: 'Test error',
      });
      expect(mockConsoleWarn).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle null and undefined errors', () => {
      const result1 = handleLoadError(null);
      const result2 = handleLoadError(undefined);

      expect(result1).toEqual({
        success: false,
        error: 'null',
      });
      expect(result2).toEqual({
        success: false,
        error: 'undefined',
      });
    });

    it('should handle complex objects', () => {
      const error = { code: 'ERR_001', message: 'Complex error' };
      const result = handleLoadError(error);

      expect(result).toEqual({
        success: false,
        error: '[object Object]',
      });
    });
  });
});