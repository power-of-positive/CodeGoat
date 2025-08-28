/**
 * Tests for error-utils.ts
 */

import {
  standardizeError,
  createErrorResult,
  logError,
  isErrorLike,
  getErrorMessage,
  type StandardError
} from './error-utils';

describe('error-utils', () => {
  describe('standardizeError', () => {
    it('should handle Error objects correctly', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      const result = standardizeError(error);
      
      expect(result.message).toBe('Test error');
      expect(result.stack).toBe('Error stack trace');
    });

    it('should handle Error objects with cause', () => {
      const error = new Error('Test error');
      (error as any).cause = 'Root cause';
      
      const result = standardizeError(error);
      
      expect(result.message).toBe('Test error');
      expect(result.cause).toBe('Root cause');
    });

    it('should handle string errors', () => {
      const result = standardizeError('String error message');
      
      expect(result.message).toBe('String error message');
      expect(result.stack).toBeUndefined();
    });

    it('should handle object errors with message', () => {
      const error = {
        message: 'Object error',
        code: 500,
        stack: 'Object stack trace'
      };
      
      const result = standardizeError(error);
      
      expect(result.message).toBe('Object error');
      expect(result.code).toBe('500');
      expect(result.stack).toBe('Object stack trace');
    });

    it('should handle unknown error types', () => {
      const result = standardizeError({ unknown: 'property' });
      
      expect(result.message).toBe('[object Object]');
    });

    it('should handle null/undefined errors', () => {
      const nullResult = standardizeError(null);
      const undefinedResult = standardizeError(undefined);
      
      expect(nullResult.message).toBe('null');
      expect(undefinedResult.message).toBe('undefined');
    });
  });

  describe('createErrorResult', () => {
    it('should create error result without context', () => {
      const result = createErrorResult('Test error');
      
      expect(result.message).toBe('Test error');
    });

    it('should create error result with context', () => {
      const result = createErrorResult('Test error', 'Validation');
      
      expect(result.message).toBe('Validation: Test error');
    });

    it('should handle Error objects with context', () => {
      const error = new Error('Original error');
      const result = createErrorResult(error, 'Processing');
      
      expect(result.message).toBe('Processing: Original error');
      expect(result.stack).toBeDefined();
    });
  });

  describe('logError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log error without context', () => {
      logError('Test error');
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error: Test error');
    });

    it('should log error with context', () => {
      logError('Test error', 'Validation');
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error (Validation): Validation: Test error');
    });

    it('should log stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      logError(error);
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error: Test error');
      expect(consoleSpy).toHaveBeenCalledWith('Error stack trace');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      logError(error);
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error: Test error');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('isErrorLike', () => {
    it('should return true for error-like objects', () => {
      expect(isErrorLike({ message: 'Error message' })).toBe(true);
      expect(isErrorLike(new Error('Test error'))).toBe(true);
    });

    it('should return false for non-error-like values', () => {
      expect(isErrorLike(null)).toBe(false);
      expect(isErrorLike(undefined)).toBe(false);
      expect(isErrorLike('string')).toBe(false);
      expect(isErrorLike(123)).toBe(false);
      expect(isErrorLike({})).toBe(false);
      expect(isErrorLike({ message: 123 })).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test error message');
      const result = getErrorMessage(error);
      
      expect(result).toBe('Test error message');
    });

    it('should extract message from string errors', () => {
      const result = getErrorMessage('String error');
      
      expect(result).toBe('String error');
    });

    it('should use fallback for unknown errors', () => {
      const result = getErrorMessage(null, 'Custom fallback');
      
      expect(result).toBe('null');
    });

    it('should use default fallback when none provided', () => {
      const result = getErrorMessage(null);
      
      expect(result).toBe('null');
    });

    it('should handle empty error messages', () => {
      const error = { message: '' };
      const result = getErrorMessage(error, 'Fallback message');
      
      expect(result).toBe('Fallback message');
    });

    it('should use fallback for empty strings', () => {
      const result = getErrorMessage('', 'Custom fallback');
      
      expect(result).toBe('Custom fallback');
    });
  });
});