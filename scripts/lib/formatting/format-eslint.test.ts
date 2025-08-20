/**
 * Tests for ESLint fixing functionality in format-runners.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runEslintFix } from './format-runners';
import * as commandUtils from '../utils/command-utils';
import * as validationUtils from '../utils/validation-utils';

vi.mock('fs');
vi.mock('path');
vi.mock('../utils/command-utils');
vi.mock('../utils/validation-utils');

describe('format-runners ESLint fix', () => {
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validationUtils.validateDirectoryExists).mockImplementation(() => {});
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.unlinkSync).mockImplementation(() => {});
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('runEslintFix', () => {
    it('should skip when no TypeScript/JavaScript files', () => {
      const result = runEslintFix(mockProjectRoot, ['README.md', 'config.json']);

      expect(result.success).toBe(true);
      expect(result.output).toBe('No TypeScript/JavaScript files to lint');
    });

    it('should fix ESLint issues and re-stage files', () => {
      const stagedFiles = ['src/test.ts', 'src/test.js'];
      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({
          success: true,
          output: 'ESLint fixes applied',
        })
        .mockReturnValueOnce({
          success: true,
          output: 'Files re-staged',
        });

      const result = runEslintFix(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Fixed ESLint issues in 2 files and re-staged them');
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        'npx eslint --fix "src/test.ts" "src/test.js"',
        mockProjectRoot
      );
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        'git add "src/test.ts" "src/test.js"',
        mockProjectRoot
      );
    });

    it('should handle ESLint fix failure', () => {
      const stagedFiles = ['src/test.ts'];
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: 'ESLint failed',
      });

      const result = runEslintFix(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(false);
      expect(result.output).toBe('ESLint failed');
    });

    it('should handle re-staging failure', () => {
      const stagedFiles = ['src/test.ts'];
      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({
          success: true,
          output: 'ESLint done',
        })
        .mockReturnValueOnce({
          success: false,
          output: 'Git add failed',
        });

      const result = runEslintFix(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(false);
      expect(result.output).toBe('ESLint auto-fix succeeded but re-staging failed: Git add failed');
    });

    it('should filter files correctly', () => {
      const stagedFiles = [
        'src/test.ts',
        'src/test.tsx',
        'src/test.js',
        'src/test.jsx',
        'README.md', // should be filtered out
        'config.json', // should be filtered out
        'styles.css', // should be filtered out
      ];

      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({
          success: true,
          output: 'ESLint done',
        })
        .mockReturnValueOnce({
          success: true,
          output: 'Files staged',
        });

      const result = runEslintFix(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(true);
      // Should only lint TypeScript/JavaScript files
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        'npx eslint --fix "src/test.ts" "src/test.tsx" "src/test.js" "src/test.jsx"',
        mockProjectRoot
      );
      // Should exclude non-JS/TS files
      expect(commandUtils.execCommand).not.toHaveBeenCalledWith(
        expect.stringMatching(/README\.md|config\.json|styles\.css/),
        mockProjectRoot
      );
    });

    it('should handle empty files array', () => {
      const stagedFiles: string[] = [];
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: true,
        output: 'Nothing to lint',
      });

      const result = runEslintFix(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(true);
      expect(result.output).toBe('No TypeScript/JavaScript files to lint');
    });
  });
});
