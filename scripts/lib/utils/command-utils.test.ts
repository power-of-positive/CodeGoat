/**
 * Tests for command utilities
 */
import { execSync } from 'child_process';
import { execCommand } from './command-utils';
import * as validationUtils from './validation-utils';
import * as resultUtils from './result-utils';

// Mock dependencies
jest.mock('child_process');
jest.mock('./validation-utils');
jest.mock('./result-utils');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockValidateInput = validationUtils.validateInput as jest.MockedFunction<typeof validationUtils.validateInput>;
const mockValidateDirectoryExists = validationUtils.validateDirectoryExists as jest.MockedFunction<typeof validationUtils.validateDirectoryExists>;
const mockCreateSuccessResult = resultUtils.createSuccessResult as jest.MockedFunction<typeof resultUtils.createSuccessResult>;
const mockCreateFailureResult = resultUtils.createFailureResult as jest.MockedFunction<typeof resultUtils.createFailureResult>;

describe('command-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSuccessResult.mockImplementation((output) => ({ success: true, output }));
    mockCreateFailureResult.mockImplementation((output) => ({ success: false, output }));
  });

  describe('execCommand', () => {
    it('should execute command successfully', () => {
      const command = 'echo "hello"';
      const output = 'hello\n';
      mockExecSync.mockReturnValue(output);

      const result = execCommand(command);

      expect(mockValidateInput).toHaveBeenCalledWith(command, 'command');
      expect(mockExecSync).toHaveBeenCalledWith(command, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 120000,
        env: process.env,
      });
      expect(mockCreateSuccessResult).toHaveBeenCalledWith('hello\n');
      expect(result).toEqual({ success: true, output });
    });

    it('should execute command with custom cwd', () => {
      const command = 'ls';
      const cwd = '/custom/path';
      const output = 'file1\nfile2\n';
      mockExecSync.mockReturnValue(output);

      const result = execCommand(command, cwd);

      expect(mockValidateInput).toHaveBeenCalledWith(command, 'command');
      expect(mockValidateInput).toHaveBeenCalledWith(cwd, 'path');
      expect(mockValidateDirectoryExists).toHaveBeenCalledWith(cwd);
      expect(mockExecSync).toHaveBeenCalledWith(command, {
        cwd: cwd,
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 120000,
        env: process.env,
      });
      expect(result).toEqual({ success: true, output });
    });

    it('should execute command with custom timeout', () => {
      const command = 'sleep 1';
      const timeout = 5000;
      const output = '';
      mockExecSync.mockReturnValue(output);

      const result = execCommand(command, undefined, timeout);

      expect(mockExecSync).toHaveBeenCalledWith(command, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: timeout,
        env: process.env,
      });
      expect(result).toEqual({ success: true, output });
    });

    it('should execute command with custom environment', () => {
      const command = 'env';
      const env = { CUSTOM_VAR: 'custom_value' };
      const output = 'CUSTOM_VAR=custom_value\n';
      mockExecSync.mockReturnValue(output);

      const result = execCommand(command, undefined, 120000, env);

      expect(mockExecSync).toHaveBeenCalledWith(command, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 120000,
        env: { ...process.env, ...env },
      });
      expect(result).toEqual({ success: true, output });
    });

    it('should handle command execution errors with CommandError object', () => {
      const command = 'invalid-command';
      const error = {
        stdout: 'some stdout output',
        stderr: 'command not found',
        message: 'Command failed',
        code: 127,
      };
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith(
        'some stdout output\ncommand not found\nCommand failed\nExit code: 127'
      );
      expect(result).toEqual({ success: false, output: 'some stdout output\ncommand not found\nCommand failed\nExit code: 127' });
    });

    it('should handle Error instances', () => {
      const command = 'failing-command';
      const error = new Error('Something went wrong');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith('Something went wrong');
      expect(result).toEqual({ success: false, output: 'Something went wrong' });
    });

    it('should handle non-Error exceptions', () => {
      const command = 'string-error-command';
      const error = 'String error message';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith('String error message');
      expect(result).toEqual({ success: false, output: 'String error message' });
    });

    it('should sanitize API keys in error messages', () => {
      const command = 'command-with-secrets';
      const error = {
        stderr: 'Error: OPENAI_API_KEY=sk-1234567890abcdef authentication failed',
        message: 'Command with API_KEY=secret123456 failed'
      };
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith(
        'Error: OPENAI_API_KEY=*** authentication failed\nCommand with API_KEY=*** failed'
      );
    });

    it('should sanitize user paths in error messages', () => {
      const command = 'path-command';
      const error = {
        stdout: 'File not found in /Users/john.doe/project',
        stderr: 'Permission denied: /home/alice/secret'
      };
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith(
        'File not found in /Users/***/project\nPermission denied: /home/***/secret'
      );
    });

    it('should sanitize long tokens and secrets', () => {
      const command = 'token-command';
      const longToken = 'a'.repeat(40); // 40 character token
      const error = {
        message: `Token ${longToken} is invalid`
      };
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith(
        'Token aaaa***aaaa is invalid'
      );
    });

    it('should sanitize environment variable assignments', () => {
      const command = 'env-command';
      const error = {
        stderr: 'Export failed: DATABASE_URL=postgres://user:pass@host/db SECRET_KEY=mysecret'
      };
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith(
        'Export failed: DATABASE_URL=*** SECRET_KEY=***'
      );
    });

    it('should handle CommandError with partial fields', () => {
      const command = 'partial-error-command';
      const error = {
        stdout: 'some output',
        code: 1
      };
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith(
        'some output\nExit code: 1'
      );
    });

    it('should handle CommandError with only stderr', () => {
      const command = 'stderr-only-command';
      const error = {
        stderr: 'error message only'
      };
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith('error message only');
    });

    it('should return "Unknown error" for empty CommandError', () => {
      const command = 'empty-error-command';
      const error = {}; // Empty object that matches CommandError interface
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith('[object Object]');
    });

    it('should handle null and undefined errors', () => {
      const command = 'null-error-command';
      mockExecSync.mockImplementation(() => {
        throw null;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith('null');
    });

    it('should not validate directory when cwd is not provided', () => {
      const command = 'no-cwd-command';
      mockExecSync.mockReturnValue('output');

      execCommand(command);

      expect(mockValidateDirectoryExists).not.toHaveBeenCalled();
    });

    it('should preserve short secrets without sanitization', () => {
      const command = 'short-secret-command';
      const shortSecret = 'abc123'; // 6 characters, below MIN_SECRET_LENGTH
      const error = {
        message: `Short secret ${shortSecret} should not be sanitized`
      };
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = execCommand(command);

      expect(mockCreateFailureResult).toHaveBeenCalledWith(
        `Short secret ${shortSecret} should not be sanitized`
      );
    });
  });
});