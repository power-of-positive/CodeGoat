/**
 * Tests for Prettier formatting functionality in format-runners.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runPrettierFormat } from './format-runners';
import * as commandUtils from '../utils/command-utils';
import * as validationUtils from '../utils/validation-utils';

vi.mock('fs');
vi.mock('path');
vi.mock('../utils/command-utils');
vi.mock('../utils/validation-utils');

describe('format-runners Prettier format', () => {
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

  describe('runPrettierFormat', () => {
    it('should skip when no prettier-compatible files', () => {
      const result = runPrettierFormat(mockProjectRoot, ['test.py', 'test.go']);

      expect(result.success).toBe(true);
      expect(result.output).toBe('No files to format with prettier');
    });

    it('should format prettier-compatible files and re-stage them', () => {
      const stagedFiles = ['src/test.ts', 'config.json', 'styles.css'];
      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({
          success: true,
          output: 'Prettier formatting done',
        })
        .mockReturnValueOnce({
          success: true,
          output: 'Files re-staged',
        });

      const result = runPrettierFormat(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Formatted 3 files with prettier and re-staged them');
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        'npx prettier --write "src/test.ts" "config.json" "styles.css"',
        mockProjectRoot
      );
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        'git add "src/test.ts" "config.json" "styles.css"',
        mockProjectRoot
      );
    });

    it('should handle prettier formatting failure', () => {
      const stagedFiles = ['src/test.ts'];
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: 'Prettier failed',
      });

      const result = runPrettierFormat(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(false);
      expect(result.output).toBe('Prettier failed');
    });

    it('should handle re-staging failure', () => {
      const stagedFiles = ['src/test.ts'];
      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({
          success: true,
          output: 'Prettier done',
        })
        .mockReturnValueOnce({
          success: false,
          output: 'Git add failed',
        });

      const result = runPrettierFormat(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(false);
      expect(result.output).toBe(
        'Prettier formatting succeeded but re-staging failed: Git add failed'
      );
    });

    it('should filter files correctly', () => {
      const stagedFiles = [
        'src/test.ts',
        'src/test.tsx',
        'src/test.js',
        'src/test.jsx',
        'config.json',
        'styles.css',
        'styles.scss',
        'README.md',
        'template.html',
        'package.json',
        'script.py', // Should be filtered out
        'binary.exe', // Should be filtered out
      ];

      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({
          success: true,
          output: 'Prettier done',
        })
        .mockReturnValueOnce({
          success: true,
          output: 'Files staged',
        });

      const result = runPrettierFormat(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(true);
      // Should only format prettier-compatible files
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        expect.stringMatching(/npx prettier --write/),
        mockProjectRoot
      );
      // Should exclude .py and .exe files
      expect(commandUtils.execCommand).not.toHaveBeenCalledWith(
        expect.stringMatching(/script\.py|binary\.exe/),
        mockProjectRoot
      );
    });

    it('should handle empty files array for re-staging', () => {
      const stagedFiles: string[] = [];
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: true,
        output: 'Nothing to format',
      });

      const result = runPrettierFormat(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(true);
      expect(result.output).toBe('No files to format with prettier');
    });
  });
});
