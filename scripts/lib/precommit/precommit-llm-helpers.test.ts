/**
 * Tests for precommit-llm-helpers.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateInputs,
  isTransientError,
  processReviewResult,
  handleReviewError,
  type LlmReviewResult,
  type ReviewResult
} from './precommit-llm-helpers';

// Mock fs
jest.mock('fs');

describe('precommit-llm-helpers', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateInputs', () => {
    beforeEach(() => {
      // Setup default valid directory mock
      mockFs.existsSync.mockReturnValue(true);
    });

    it('should pass validation for valid inputs', () => {
      expect(() => validateInputs('/valid/project/path', 'valid output string')).not.toThrow();
      
      expect(mockFs.existsSync).toHaveBeenCalledWith(path.resolve('/valid/project/path'));
    });

    it('should throw error for invalid projectRoot types', () => {
      const invalidRoots = [
        { input: null, error: 'Invalid projectRoot: must be non-empty string' },
        { input: undefined, error: 'Invalid projectRoot: must be non-empty string' },
        { input: '', error: 'Invalid projectRoot: must be non-empty string' },
        { input: 123, error: 'Invalid projectRoot: must be non-empty string' },
        { input: [], error: 'Invalid projectRoot: must be non-empty string' },
        { input: {}, error: 'Invalid projectRoot: must be non-empty string' }
      ];

      invalidRoots.forEach(({ input, error }) => {
        expect(() => validateInputs(input as any, 'valid output')).toThrow(error);
      });
    });

    it('should throw error for invalid allOutput types', () => {
      const invalidOutputs = [
        { input: null, error: 'Invalid allOutput: must be string' },
        { input: undefined, error: 'Invalid allOutput: must be string' },
        { input: 123, error: 'Invalid allOutput: must be string' },
        { input: [], error: 'Invalid allOutput: must be string' },
        { input: {}, error: 'Invalid allOutput: must be string' }
      ];

      invalidOutputs.forEach(({ input, error }) => {
        expect(() => validateInputs('/valid/path', input as any)).toThrow(error);
      });
    });

    it('should accept empty string as valid allOutput', () => {
      expect(() => validateInputs('/valid/path', '')).not.toThrow();
    });

    it('should detect dangerous path patterns', () => {
      const dangerousPatterns = [
        { path: '../../../etc/passwd', pattern: 'path traversal with ..' },
        { path: '/project/../../../etc/passwd', pattern: 'path traversal in middle' },
        { path: 'project\\..\\..\\windows', pattern: 'Windows path traversal' },
        { path: '/project/with\x00null', pattern: 'null byte injection' },
        { path: '/project%00/encoded/null', pattern: 'URL encoded null byte' },
        { path: '/project%2e%2e/encoded/dots', pattern: 'URL encoded dots' },
        { path: '/project%2f/encoded/slash', pattern: 'URL encoded slash' },
        { path: '/project%5c/encoded/backslash', pattern: 'URL encoded backslash' },
        { path: '/project${malicious}/injection', pattern: 'variable injection' },
        { path: '/project`command`/injection', pattern: 'command injection' },
        { path: '/project|cat /etc/passwd', pattern: 'pipe command injection' },
        { path: '/project&&rm -rf /', pattern: 'command chaining' },
        { path: '/project;cat secrets', pattern: 'semicolon command' }
      ];

      dangerousPatterns.forEach(({ path: dangerousPath }) => {
        expect(() => validateInputs(dangerousPath, 'output')).toThrow(
          'Invalid projectRoot: contains potentially dangerous patterns'
        );
      });
    });

    it('should throw error when projectRoot does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => validateInputs('/nonexistent/path', 'output')).toThrow(
        'ProjectRoot does not exist: /nonexistent/path'
      );
    });

    it('should handle complex valid paths', () => {
      const validPaths = [
        '/home/user/project',
        '/var/www/html',
        '/opt/myapp',
        '/Users/developer/workspace/project',
        '/tmp/build-12345',
        '/workspace/project-name_v1.2.3',
        '/path/with-dashes-and_underscores'
      ];

      validPaths.forEach(validPath => {
        expect(() => validateInputs(validPath, 'output')).not.toThrow();
        expect(mockFs.existsSync).toHaveBeenCalledWith(path.resolve(validPath));
      });
    });

    it('should normalize relative paths correctly', () => {
      const relativePaths = [
        './current/directory',
        '../parent/directory',
        '~/home/directory',
        'relative/path/without/dot'
      ];

      relativePaths.forEach(relativePath => {
        const resolved = path.resolve(relativePath);
        validateInputs(relativePath, 'output');
        expect(mockFs.existsSync).toHaveBeenCalledWith(resolved);
      });
    });
  });

  describe('isTransientError', () => {
    it('should identify transient network errors', () => {
      const transientErrors = [
        new Error('ENOENT: no such file or directory'),
        new Error('ECONNRESET: Connection reset by peer'),
        new Error('ETIMEDOUT: Connection timed out'),
        new Error('Request timeout exceeded'),
        new Error('Network error occurred'),
        new Error('Connection failed'),
        new Error('Rate limit exceeded'),
        new Error('API rate-limit reached')
      ];

      transientErrors.forEach(error => {
        expect(isTransientError(error)).toBe(true);
      });
    });

    it('should not identify permanent errors as transient', () => {
      const permanentErrors = [
        new Error('Invalid API key'),
        new Error('Unauthorized access'),
        new Error('Malformed request'),
        new Error('Syntax error in code'),
        new Error('File permission denied'),
        new Error('Critical system failure')
      ];

      permanentErrors.forEach(error => {
        expect(isTransientError(error)).toBe(false);
      });
    });

    it('should handle case-insensitive error matching', () => {
      const caseVariations = [
        new Error('TIMEOUT occurred'),
        new Error('timeout occurred'),
        new Error('TimeOut occurred'),
        new Error('NETWORK failure'),
        new Error('Network failure'),
        new Error('network failure'),
        new Error('RATE LIMIT exceeded'),
        new Error('Rate-Limit exceeded'),
        new Error('rate limit exceeded')
      ];

      caseVariations.forEach(error => {
        expect(isTransientError(error)).toBe(true);
      });
    });

    it('should match partial error messages', () => {
      const partialMatches = [
        new Error('Connection failed due to network issues'),
        new Error('The request timed out after 30 seconds'),
        new Error('Server connection was reset unexpectedly'),
        new Error('API rate limit has been exceeded, please retry')
      ];

      partialMatches.forEach(error => {
        expect(isTransientError(error)).toBe(true);
      });
    });

    it('should handle empty or minimal error messages', () => {
      const minimalErrors = [
        new Error(''),
        new Error('timeout'),
        new Error('network'),
        new Error('ENOENT'),
        new Error('connection')
      ];

      minimalErrors.forEach(error => {
        const expected = ['timeout', 'network', 'ENOENT', 'connection'].includes(error.message.toLowerCase());
        expect(isTransientError(error)).toBe(expected);
      });
    });
  });

  describe('processReviewResult', () => {
    it('should return success for non-blocked reviews', () => {
      const reviewResult: ReviewResult = { blocked: false };
      
      const result = processReviewResult(reviewResult, 'All checks passed');

      expect(result).toEqual({ status: 'success' });
    });

    it('should return blocked status with sanitized output', () => {
      const reviewResult: ReviewResult = {
        blocked: true,
        output: 'Review found security issues with OPENAI_API_KEY=sk-1234567890'
      };
      
      const result = processReviewResult(reviewResult, 'Precommit output');

      expect(result).toEqual({
        status: 'blocked',
        result: {
          decision: 'block',
          reason: expect.stringContaining('Pre-commit checks failed')
        }
      });
      
      // Check that API key is sanitized
      if ('result' in result && 'reason' in result.result) {
        expect(result.result.reason).not.toContain('sk-1234567890');
        expect(result.result.reason).toContain('OPENAI_API_KEY=***');
      }
    });

    it('should handle missing blocked property gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const reviewResult = {} as ReviewResult;
      
      const result = processReviewResult(reviewResult, 'output');

      expect(result).toEqual({ status: 'success' });
      expect(consoleSpy).toHaveBeenCalledWith(
        "LLM review result missing 'blocked' property, treating as not blocked"
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing output property when blocked', () => {
      const reviewResult: ReviewResult = { blocked: true };
      
      const result = processReviewResult(reviewResult, 'Precommit checks');

      if (result.status === 'blocked' && 'result' in result) {
        expect(result.result.reason).toContain('Review found issues');
      }
    });

    it('should sanitize user paths in error messages', () => {
      const reviewResult: ReviewResult = {
        blocked: true,
        output: 'Error in /Users/john.doe/secret/project and /home/admin/confidential'
      };
      
      const result = processReviewResult(reviewResult, 'output');

      if (result.status === 'blocked' && 'result' in result) {
        expect(result.result.reason).not.toContain('/Users/john.doe');
        expect(result.result.reason).not.toContain('/home/admin');
        expect(result.result.reason).toContain('/Users/***');
        expect(result.result.reason).toContain('/home/***');
      }
    });

    it('should sanitize long secrets in error messages', () => {
      const reviewResult: ReviewResult = {
        blocked: true,
        output: 'Found secret: abcdef1234567890abcdef1234567890abcdef1234567890'
      };
      
      const result = processReviewResult(reviewResult, 'output');

      if (result.status === 'blocked' && 'result' in result) {
        expect(result.result.reason).not.toContain('abcdef1234567890abcdef1234567890abcdef1234567890');
        expect(result.result.reason).toContain('abcd***7890');
      }
    });

    it('should not over-sanitize short strings', () => {
      const reviewResult: ReviewResult = {
        blocked: true,
        output: 'Error with short string like "test123" which is fine'
      };
      
      const result = processReviewResult(reviewResult, 'output');

      if (result.status === 'blocked' && 'result' in result) {
        expect(result.result.reason).toContain('test123');
      }
    });

    it('should combine allOutput and review output correctly', () => {
      const reviewResult: ReviewResult = {
        blocked: true,
        output: 'LLM review output'
      };
      
      const result = processReviewResult(reviewResult, 'Precommit output\n');

      if (result.status === 'blocked' && 'result' in result) {
        expect(result.result.reason).toContain('Precommit output\n');
        expect(result.result.reason).toContain('LLM review output');
        expect(result.result.reason).toContain('🚫 Fix issues and re-stage files');
      }
    });
  });

  describe('handleReviewError', () => {
    it('should allow commit for transient errors', () => {
      const transientError = new Error('ECONNRESET: Connection reset');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handleReviewError(transientError);

      expect(result).toEqual({ status: 'success' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Transient LLM review error (allowing commit):')
      );

      consoleSpy.mockRestore();
    });

    it('should allow commit for non-transient errors with warning', () => {
      const permanentError = new Error('Invalid API key');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handleReviewError(permanentError);

      expect(result).toEqual({ status: 'success' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LLM review generation failed:')
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', () => {
      const stringError = 'String error occurred';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handleReviewError(stringError);

      expect(result).toEqual({ status: 'success' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LLM review generation failed: String error occurred')
      );

      consoleSpy.mockRestore();
    });

    it('should sanitize error messages in console output', () => {
      const errorWithSecrets = new Error('API key OPENAI_API_KEY=sk-secret and path /Users/admin/secret');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      handleReviewError(errorWithSecrets);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('OPENAI_API_KEY=***')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('/Users/***')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('sk-secret')
      );

      consoleSpy.mockRestore();
    });

    it('should handle null and undefined errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result1 = handleReviewError(null);
      const result2 = handleReviewError(undefined);

      expect(result1).toEqual({ status: 'success' });
      expect(result2).toEqual({ status: 'success' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LLM review generation failed: ')
      );

      consoleSpy.mockRestore();
    });

    it('should differentiate between transient and permanent error logging', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Transient error
      handleReviewError(new Error('TIMEOUT'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Transient LLM review error (allowing commit):')
      );
      
      consoleSpy.mockClear();
      
      // Permanent error
      handleReviewError(new Error('Invalid config'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LLM review generation failed:')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Transient')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('sanitizeErrorMessage (via processReviewResult)', () => {
    it('should sanitize multiple types of sensitive data', () => {
      const reviewResult: ReviewResult = {
        blocked: true,
        output: `
          Error with OPENAI_API_KEY=sk-1234567890abcdef
          Also API_KEY: another-secret-key
          Path: /Users/sensitive.user/project
          Home: /home/another.user/work
          Long secret: abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmn
          Short: abc123
        `
      };
      
      const result = processReviewResult(reviewResult, 'test');

      if (result.status === 'blocked' && 'result' in result) {
        const reason = result.result.reason;
        
        // API keys should be sanitized
        expect(reason).toContain('OPENAI_API_KEY=***');
        expect(reason).toContain('API_KEY=***');
        expect(reason).not.toContain('sk-1234567890abcdef');
        expect(reason).not.toContain('another-secret-key');
        
        // User paths should be sanitized
        expect(reason).toContain('/Users/***');
        expect(reason).toContain('/home/***');
        expect(reason).not.toContain('sensitive.user');
        expect(reason).not.toContain('another.user');
        
        // Long secrets should be truncated
        expect(reason).toContain('abcd***klmn');
        expect(reason).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmn');
        
        // Short strings should not be affected
        expect(reason).toContain('abc123');
      }
    });

    it('should handle edge cases in secret detection', () => {
      const reviewResult: ReviewResult = {
        blocked: true,
        output: `
          Exactly 32 chars: abcdefghijklmnopqrstuvwxyz123456
          Exactly 8 chars: abcdefgh
          Less than 8: abc
          Boundary test: abcdefghijklmnopqrstuvwxyz12345
        `
      };
      
      const result = processReviewResult(reviewResult, 'test');

      if (result.status === 'blocked' && 'result' in result) {
        const reason = result.result.reason;
        
        // 32 chars should be truncated (>= 32 and > 8)
        expect(reason).toContain('abcd***3456');
        expect(reason).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
        
        // 8 chars should not be truncated (not > 8)
        expect(reason).toContain('abcdefgh');
        
        // Less than 8 should not be truncated
        expect(reason).toContain('abc');
        
        // 31 chars should not be truncated (< 32)
        expect(reason).toContain('abcdefghijklmnopqrstuvwxyz12345');
      }
    });
  });
});