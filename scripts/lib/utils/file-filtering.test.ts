/**
 * Tests for file-filtering.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeFilePath, filterValidFiles, filterCoverageFiles } from '../files/file-filtering';

// Mock external dependencies
vi.mock('fs');
vi.mock('path');

describe('file-filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeFilePath', () => {
    it('should return relative path for valid file', () => {
      // Mock the calls in order they are made
      vi.mocked(path.resolve)
        .mockReturnValueOnce('/project/scripts/test.ts') // path.resolve(projectRoot, file)
        .mockReturnValueOnce('/project'); // path.resolve(projectRoot) for normalized root
      vi.mocked(path.normalize)
        .mockReturnValueOnce('/project/scripts/test.ts') // path.normalize(resolved)
        .mockReturnValueOnce('/project'); // path.normalize(path.resolve(projectRoot))
      vi.mocked(path.relative).mockReturnValue('scripts/test.ts');
      (path as { sep: string }).sep = '/';

      const result = sanitizeFilePath('scripts/test.ts', '/project');

      expect(result).toBe('scripts/test.ts');
    });

    it('should throw error for invalid file paths', () => {
      expect(() => sanitizeFilePath('', '/project')).toThrow(
        'Invalid file path: must be non-empty string'
      );
      expect(() => sanitizeFilePath('file`cmd`', '/project')).toThrow(
        'Invalid file path: contains dangerous characters'
      );
    });

    it('should throw error for paths outside project root', () => {
      vi.mocked(path.resolve)
        .mockReturnValueOnce('/other/path') // path.resolve(projectRoot, file)
        .mockReturnValueOnce('/project'); // path.resolve(projectRoot) for normalized root
      vi.mocked(path.normalize)
        .mockReturnValueOnce('/other/path') // path.normalize(resolved)
        .mockReturnValueOnce('/project'); // path.normalize(path.resolve(projectRoot))
      (path as { sep: string }).sep = '/';

      expect(() => sanitizeFilePath('../../../etc/passwd', '/project')).toThrow(
        'is outside project root'
      );
    });
  });

  describe('filterValidFiles', () => {
    it('should return empty array for non-array input', () => {
      expect(filterValidFiles('/project', null as unknown as string[])).toEqual([]);
    });

    it('should filter valid existing files', () => {
      // Mock all path and fs functions to return expected values
      vi.mocked(path.resolve).mockImplementation((_root: string, file?: string) => {
        if (file) return `/project/${file}`; // path.resolve(projectRoot, file)
        return '/project'; // path.resolve(projectRoot)
      });
      vi.mocked(path.normalize).mockImplementation((p: string) => p);
      vi.mocked(path.relative).mockReturnValue('test.ts');
      vi.mocked(path.join).mockReturnValue('/project/test.ts');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      (path as { sep: string }).sep = '/';

      const result = filterValidFiles('/project', ['test.ts']);

      expect(result).toEqual(['test.ts']);
    });

    it('should skip invalid files with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = filterValidFiles('/project', ['invalid`file']);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Skipping invalid file: invalid`file');
    });
  });

  describe('filterCoverageFiles', () => {
    it('should return empty array for non-array input', () => {
      expect(filterCoverageFiles('/project', null as unknown as string[])).toEqual([]);
    });

    it('should filter TypeScript files for coverage', () => {
      vi.mocked(path.resolve)
        .mockReturnValueOnce('/project/scripts/test.ts') // path.resolve(projectRoot, file)
        .mockReturnValueOnce('/project'); // path.resolve(projectRoot) for normalized root
      vi.mocked(path.normalize)
        .mockReturnValueOnce('/project/scripts/test.ts') // path.normalize(resolved)
        .mockReturnValueOnce('/project'); // path.normalize(path.resolve(projectRoot))
      vi.mocked(path.relative).mockReturnValue('scripts/test.ts');
      (path as { sep: string }).sep = '/';

      const result = filterCoverageFiles('/project', ['scripts/test.ts']);

      expect(result).toEqual(['test.ts']);
    });

    it('should exclude test and spec files from coverage', () => {
      vi.mocked(path.resolve)
        .mockReturnValueOnce('/project/scripts/test.test.ts') // path.resolve(projectRoot, file)
        .mockReturnValueOnce('/project'); // path.resolve(projectRoot) for normalized root
      vi.mocked(path.normalize)
        .mockReturnValueOnce('/project/scripts/test.test.ts') // path.normalize(resolved)
        .mockReturnValueOnce('/project'); // path.normalize(path.resolve(projectRoot))
      vi.mocked(path.relative).mockReturnValue('scripts/test.test.ts');
      (path as { sep: string }).sep = '/';

      const result = filterCoverageFiles('/project', ['scripts/test.test.ts']);

      expect(result).toEqual([]);
    });

    it('should handle sanitization errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = filterCoverageFiles('/project', ['invalid`file']);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Skipping file for coverage: invalid`file');
    });
  });
});
