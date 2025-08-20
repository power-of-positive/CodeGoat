/**
 * Tests for check-runners.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runFrontendLinting,
  runFrontendTests,
  runPlaywrightTests,
  runRustFormatting,
  runRustLinting,
  runPrettierFormat,
  runEslintFix,
} from './check-runners';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { validateDirectoryExists } from '../utils/validation-utils';

// Mock external dependencies
vi.mock('child_process');
vi.mock('path');
vi.mock('fs');
vi.mock('../utils/validation-utils');

describe('check-runners', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock process.cwd and process.env
    vi.stubGlobal('process', {
      ...process,
      cwd: vi.fn().mockReturnValue('/mock'),
      env: { ...process.env },
    });

    // Mock fs functions for directory validation
    vi.mocked(fs.existsSync).mockImplementation(pathArg => {
      const pathStr = String(pathArg);
      // Return false for empty strings, dangerous paths, and paths that should fail validation
      if (
        !pathStr ||
        pathStr === '' ||
        pathStr.includes('../') ||
        pathStr.includes('/mock//') ||
        pathStr.endsWith('frontend')
      ) {
        return false;
      }
      return true;
    });
    vi.mocked(fs.statSync).mockReturnValue({
      isDirectory: () => true,
    } as unknown as fs.Stats);

    // Mock path functions
    vi.mocked(path.resolve).mockImplementation(p => {
      if (!p || p === '') return '/mock/';
      return `/mock/${p}`.replace(/\/+/g, '/');
    });
    vi.mocked(path.join).mockImplementation((...parts) => parts.join('/'));

    // Mock execSync to return string by default
    vi.mocked(execSync).mockReturnValue('Success' as unknown as Buffer);

    // Mock validation-utils - by default, don't throw
    vi.mocked(validateDirectoryExists).mockImplementation(() => {
      // Default: do nothing (validation passes)
    });
  });

  describe('runFrontendLinting', () => {
    it('should return CheckResult with correct structure', () => {
      vi.mocked(execSync).mockReturnValue('Linting passed');

      const result = runFrontendLinting('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
    });

    it('should handle invalid project root', () => {
      vi.mocked(validateDirectoryExists).mockImplementation((dirPath: string) => {
        if (
          !dirPath ||
          dirPath === '/frontend' ||
          dirPath === 'frontend' ||
          dirPath.includes('../')
        ) {
          throw new Error('Directory does not exist');
        }
      });

      expect(() => runFrontendLinting('')).toThrow('Directory does not exist');
      expect(() => runFrontendLinting('../dangerous')).toThrow('Directory does not exist');
    });
  });

  describe('runFrontendTests', () => {
    it('should return CheckResult with correct structure', () => {
      vi.mocked(execSync).mockReturnValue('Tests passed');

      const result = runFrontendTests('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
    });

    it('should handle invalid project root', () => {
      vi.mocked(validateDirectoryExists).mockImplementation((dirPath: string) => {
        if (!dirPath || dirPath === '/frontend' || dirPath === 'frontend') {
          throw new Error('Directory does not exist');
        }
      });

      expect(() => runFrontendTests('')).toThrow('Directory does not exist');
    });
  });

  describe('runPlaywrightTests', () => {
    it('should skip tests when no display server', () => {
      delete process.env.DISPLAY;
      delete process.env.CI;

      const result = runPlaywrightTests('/mock/project');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Skipped - headless environment');
    });
  });

  describe('runRustFormatting', () => {
    it('should return CheckResult with correct structure', () => {
      vi.mocked(execSync).mockReturnValue('Rust formatting passed');

      const result = runRustFormatting('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
    });

    it('should handle invalid project root', () => {
      vi.mocked(validateDirectoryExists).mockImplementation((dirPath: string) => {
        if (
          !dirPath ||
          dirPath === '/backend' ||
          dirPath === 'backend' ||
          dirPath.includes('../')
        ) {
          throw new Error('Directory does not exist');
        }
      });

      expect(() => runRustFormatting('')).toThrow('Directory does not exist');
      expect(() => runRustFormatting('../dangerous')).toThrow('Directory does not exist');
    });

    it('should handle execSync throwing error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        const error = new Error('spawnSync /bin/sh ENOENT') as Error & {
          status?: number;
          stderr?: string;
          stdout?: string;
        };
        error.status = 1;
        error.stderr = 'stderr error output';
        error.stdout = '';
        throw error;
      });

      const result = runRustFormatting('/mock/project');

      expect(result.success).toBe(false);
      expect(result.output).toContain('spawnSync /bin/sh ENOENT');
    });
  });

  describe('runRustLinting', () => {
    it('should return CheckResult with correct structure', () => {
      vi.mocked(execSync).mockReturnValue('Clippy passed');

      const result = runRustLinting('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
    });

    it('should handle invalid project root', () => {
      vi.mocked(validateDirectoryExists).mockImplementation((dirPath: string) => {
        if (
          !dirPath ||
          dirPath === '/backend' ||
          dirPath === 'backend' ||
          dirPath.includes('../')
        ) {
          throw new Error('Directory does not exist');
        }
      });

      expect(() => runRustLinting('')).toThrow('Directory does not exist');
      expect(() => runRustLinting('../dangerous')).toThrow('Directory does not exist');
    });

    it('should handle execSync throwing error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        const error = new Error('spawnSync /bin/sh ENOENT') as Error & {
          status?: number;
          stderr?: string;
          stdout?: string;
        };
        error.status = 1;
        error.stderr = 'linting error output';
        error.stdout = '';
        throw error;
      });

      const result = runRustLinting('/mock/project');

      expect(result.success).toBe(false);
      expect(result.output).toContain('spawnSync /bin/sh ENOENT');
    });
  });

  describe('runPrettierFormat', () => {
    it('should format prettier-compatible files and re-stage them', () => {
      vi.mocked(execSync).mockReturnValue('Success');

      const stagedFiles = ['src/test.ts', 'src/test.json', 'README.md'];
      const result = runPrettierFormat('/mock/project', stagedFiles);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
      expect(result.output).toContain('Formatted 3 files with prettier and re-staged them');
    });

    it('should skip when no prettier files found', () => {
      const stagedFiles = ['src/test.txt', 'README.rst'];
      const result = runPrettierFormat('/mock/project', stagedFiles);

      expect(result.success).toBe(true);
      expect(result.output).toBe('No files to format with prettier');
    });
  });

  describe('runEslintFix', () => {
    it('should fix ESLint issues in TypeScript/JavaScript files and re-stage them', () => {
      vi.mocked(execSync).mockReturnValue('Success');

      const stagedFiles = ['src/test.ts', 'src/test.tsx', 'src/test.js'];
      const result = runEslintFix('/mock/project', stagedFiles);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
      expect(result.output).toContain('Fixed ESLint issues in 3 files and re-staged them');
    });

    it('should skip when no TypeScript/JavaScript files found', () => {
      const stagedFiles = ['src/test.txt', 'README.md'];
      const result = runEslintFix('/mock/project', stagedFiles);

      expect(result.success).toBe(true);
      expect(result.output).toBe('No TypeScript/JavaScript files to lint');
    });
  });
});
