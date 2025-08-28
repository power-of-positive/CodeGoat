/**
 * Tests for llm-reviewer-helpers.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  validateProjectRoot,
  getChangedFiles,
  createEmptyResult,
  createErrorResult,
  reviewSingleFile
} from './llm-reviewer-helpers';
import type { LLMReviewerCore } from './llm-reviewer-core';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');

describe('llm-reviewer-helpers', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProjectRoot', () => {
    it('should pass validation for valid directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      expect(() => validateProjectRoot('/valid/project/path')).not.toThrow();

      expect(mockFs.existsSync).toHaveBeenCalledWith(path.resolve('/valid/project/path'));
      expect(mockFs.statSync).toHaveBeenCalledWith(path.resolve('/valid/project/path'));
    });

    it('should throw error for invalid input types', () => {
      const testCases = [
        { input: null, error: 'Invalid projectRoot: must be non-empty string' },
        { input: undefined, error: 'Invalid projectRoot: must be non-empty string' },
        { input: '', error: 'Invalid projectRoot: must be non-empty string' },
        { input: 123, error: 'Invalid projectRoot: must be non-empty string' }
      ];

      testCases.forEach(({ input, error }) => {
        expect(() => validateProjectRoot(input as any)).toThrow(error);
      });
    });

    it('should detect path traversal attacks', () => {
      const dangerousPatterns = [
        '../../../etc/passwd',
        'project/../../../etc/passwd',
        '/project/subdir/../../../etc/passwd',
        'project\\..\\..\\windows\\system32',
        '/project/with\x00null/byte',
        '/project%00/with/encoded/null',
        '/project%2e%2e/with/encoded/dots'
      ];

      dangerousPatterns.forEach(dangerousPath => {
        expect(() => validateProjectRoot(dangerousPath)).toThrow(
          'Invalid projectRoot: dangerous patterns detected'
        );
      });
    });

    it('should throw error when directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => validateProjectRoot('/nonexistent/path')).toThrow(
        'Invalid projectRoot: /nonexistent/path not a directory'
      );

      expect(mockFs.existsSync).toHaveBeenCalledWith(path.resolve('/nonexistent/path'));
    });

    it('should throw error when path exists but is not a directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

      expect(() => validateProjectRoot('/path/to/file.txt')).toThrow(
        'Invalid projectRoot: /path/to/file.txt not a directory'
      );
    });

    it('should handle fs.statSync throwing errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => validateProjectRoot('/inaccessible/path')).toThrow('Permission denied');
    });
  });

  describe('getChangedFiles', () => {
    beforeEach(() => {
      // Setup default valid directory mocks
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    });

    it('should return filtered JavaScript/TypeScript files from git diff', () => {
      const gitOutput = `
        src/component.ts
        src/utils.js
        src/types.tsx
        src/test.jsx
        src/module.mts
        src/config.cts
        src/script.mjs
        src/legacy.cjs
        README.md
        package.json
        image.png
      `;

      mockExecSync.mockReturnValue(gitOutput);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = getChangedFiles('/project/root');

      expect(result).toEqual([
        'src/component.ts',
        'src/utils.js',
        'src/types.tsx',
        'src/test.jsx',
        'src/module.mts',
        'src/config.cts',
        'src/script.mjs',
        'src/legacy.cjs'
      ]);

      expect(mockExecSync).toHaveBeenCalledWith('git diff --cached --name-only', {
        cwd: path.resolve('/project/root'),
        encoding: 'utf-8',
        timeout: 15000,
        maxBuffer: 1048576
      });

      expect(consoleSpy).toHaveBeenCalledWith('Found 8 changed files for review');
      consoleSpy.mockRestore();
    });

    it('should return empty array when no JavaScript/TypeScript files changed', () => {
      mockExecSync.mockReturnValue('README.md\npackage.json\n.gitignore');

      const result = getChangedFiles('/project/root');

      expect(result).toEqual([]);
    });

    it('should handle empty git output', () => {
      mockExecSync.mockReturnValue('');

      const result = getChangedFiles('/project/root');

      expect(result).toEqual([]);
    });

    it('should handle git command execution errors gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getChangedFiles('/project/root');

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get changed files:',
        'git command failed'
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', () => {
      mockExecSync.mockImplementation(() => {
        throw 'String error';
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getChangedFiles('/project/root');

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get changed files:',
        'Unknown error'
      );

      consoleSpy.mockRestore();
    });

    it('should validate project root before executing git command', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => getChangedFiles('/invalid/path')).toThrow(
        'Invalid projectRoot: /invalid/path not a directory'
      );

      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should use correct timeout and buffer size for git command', () => {
      mockExecSync.mockReturnValue('src/test.ts');

      getChangedFiles('/project/root');

      expect(mockExecSync).toHaveBeenCalledWith(
        'git diff --cached --name-only',
        expect.objectContaining({
          timeout: 15000,
          maxBuffer: 1048576
        })
      );
    });

    it('should filter out files with mixed case extensions', () => {
      mockExecSync.mockReturnValue('src/Component.TS\nsrc/utils.Js\nsrc/config.JSON');

      const result = getChangedFiles('/project/root');

      expect(result).toEqual(['src/Component.TS', 'src/utils.Js']);
    });

    it('should handle whitespace in git output', () => {
      mockExecSync.mockReturnValue('  src/test.ts  \n  src/utils.js  \n\n');

      const result = getChangedFiles('/project/root');

      expect(result).toEqual(['src/test.ts', 'src/utils.js']);
    });
  });

  describe('createEmptyResult', () => {
    it('should create proper empty result structure', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = createEmptyResult();

      expect(result).toEqual({
        structuredData: {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        },
        textReport: 'No files to review'
      });

      expect(consoleSpy).toHaveBeenCalledWith('No changed files to review');
      consoleSpy.mockRestore();
    });
  });

  describe('createErrorResult', () => {
    it('should create error result from Error object', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('OpenAI API failed');

      const result = createErrorResult(error);

      expect(result).toEqual({
        structuredData: {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        },
        textReport: 'Review failed: OpenAI API failed'
      });

      expect(consoleSpy).toHaveBeenCalledWith('LLM review failed:', error);
      consoleSpy.mockRestore();
    });

    it('should create error result from unknown error type', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = 'String error';

      const result = createErrorResult(error);

      expect(result).toEqual({
        structuredData: {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        },
        textReport: 'Review failed: Unknown error'
      });

      expect(consoleSpy).toHaveBeenCalledWith('LLM review failed:', error);
      consoleSpy.mockRestore();
    });

    it('should handle null/undefined errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result1 = createErrorResult(null);
      const result2 = createErrorResult(undefined);

      expect(result1.textReport).toBe('Review failed: Unknown error');
      expect(result2.textReport).toBe('Review failed: Unknown error');

      consoleSpy.mockRestore();
    });
  });

  describe('reviewSingleFile', () => {
    let mockCore: jest.Mocked<LLMReviewerCore>;

    beforeEach(() => {
      mockCore = {
        reviewCode: jest.fn()
      } as any;

      // Mock fs.promises.readFile
      jest.doMock('fs', () => ({
        ...fs,
        promises: {
          readFile: jest.fn()
        }
      }));
    });

    it('should successfully review a file', async () => {
      const mockReviewResult = {
        severity: 'low' as const,
        issues: [],
        suggestions: ['Use const instead of let'],
        summary: 'Minor improvements possible',
        hasBlockingIssues: false,
        confidence: 0.8
      };

      mockCore.reviewCode.mockResolvedValue(mockReviewResult);
      mockFs.existsSync.mockReturnValue(true);

      // Mock fs.promises.readFile
      const mockReadFile = jest.fn().mockResolvedValue('const x = 1;');
      (fs as any).promises = { readFile: mockReadFile };

      const result = await reviewSingleFile(mockCore, '/project/root', 'src/test.ts');

      expect(result).toEqual({
        file: 'src/test.ts',
        result: mockReviewResult
      });

      expect(mockCore.reviewCode).toHaveBeenCalledWith('src/test.ts', 'const x = 1;');
      expect(mockReadFile).toHaveBeenCalledWith('/project/root/src/test.ts', 'utf-8');
    });

    it('should reject files outside project root', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await reviewSingleFile(mockCore, '/project/root', '../../../etc/passwd');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Skipping file outside project root: ../../../etc/passwd'
      );
      expect(mockCore.reviewCode).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle non-existent files', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await reviewSingleFile(mockCore, '/project/root', 'src/missing.ts');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('File /project/root/src/missing.ts not found');
      expect(mockCore.reviewCode).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle file read errors', async () => {
      mockFs.existsSync.mockReturnValue(true);
      const readError = new Error('Permission denied');
      const mockReadFile = jest.fn().mockRejectedValue(readError);
      (fs as any).promises = { readFile: mockReadFile };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await reviewSingleFile(mockCore, '/project/root', 'src/test.ts');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Review failed for src/test.ts:',
        'Permission denied'
      );

      consoleSpy.mockRestore();
    });

    it('should handle core review errors', async () => {
      mockFs.existsSync.mockReturnValue(true);
      const mockReadFile = jest.fn().mockResolvedValue('const x = 1;');
      (fs as any).promises = { readFile: mockReadFile };

      const reviewError = new Error('OpenAI API error');
      mockCore.reviewCode.mockRejectedValue(reviewError);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await reviewSingleFile(mockCore, '/project/root', 'src/test.ts');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Review failed for src/test.ts:',
        'OpenAI API error'
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions during file read', async () => {
      mockFs.existsSync.mockReturnValue(true);
      const mockReadFile = jest.fn().mockRejectedValue('String error');
      (fs as any).promises = { readFile: mockReadFile };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await reviewSingleFile(mockCore, '/project/root', 'src/test.ts');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Review failed for src/test.ts:',
        'String error'
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions during review', async () => {
      mockFs.existsSync.mockReturnValue(true);
      const mockReadFile = jest.fn().mockResolvedValue('const x = 1;');
      (fs as any).promises = { readFile: mockReadFile };

      mockCore.reviewCode.mockImplementation(() => {
        throw 'String error from core';
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await reviewSingleFile(mockCore, '/project/root', 'src/test.ts');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Review failed for src/test.ts:',
        'String error from core'
      );

      consoleSpy.mockRestore();
    });

    it('should properly resolve file paths', async () => {
      const mockReviewResult = { severity: 'low' as const, issues: [], suggestions: [], summary: 'OK', hasBlockingIssues: false, confidence: 0.8 };
      mockCore.reviewCode.mockResolvedValue(mockReviewResult);
      mockFs.existsSync.mockReturnValue(true);

      const mockReadFile = jest.fn().mockResolvedValue('code');
      (fs as any).promises = { readFile: mockReadFile };

      await reviewSingleFile(mockCore, '/project/root', 'src/nested/deep/file.ts');

      expect(mockReadFile).toHaveBeenCalledWith('/project/root/src/nested/deep/file.ts', 'utf-8');
    });

    it('should check file path bounds with complex relative paths', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // This should be rejected as it goes outside the project root
      const result = await reviewSingleFile(mockCore, '/project/root', 'src/../../other/file.ts');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping file outside project root')
      );

      consoleSpy.mockRestore();
    });
  });
});