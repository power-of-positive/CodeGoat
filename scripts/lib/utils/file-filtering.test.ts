/**
 * Tests for file-filtering.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { sanitizeFilePath, filterValidFiles, filterCoverageFiles } from '../files/file-filtering';

// Mock external dependencies
jest.mock('fs');
jest.mock('path', () => ({
  resolve: jest.fn(),
  normalize: jest.fn(),
  relative: jest.fn(),
  join: jest.fn(),
  sep: '/',
}));

describe('file-filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeFilePath', () => {
    it('should return relative path for valid file', () => {
      // Mock the calls in order they are made
      (path.resolve as jest.Mock)
        .mockReturnValueOnce('/project/scripts/test.ts') // path.resolve(projectRoot, file)
        .mockReturnValueOnce('/project'); // path.resolve(projectRoot) for normalized root
      (path.normalize as jest.Mock)
        .mockReturnValueOnce('/project/scripts/test.ts') // path.normalize(resolved)
        .mockReturnValueOnce('/project'); // path.normalize(path.resolve(projectRoot))
      (path.relative as jest.Mock).mockReturnValue('scripts/test.ts');

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
      (path.resolve as jest.Mock)
        .mockReturnValueOnce('/other/path') // path.resolve(projectRoot, file)
        .mockReturnValueOnce('/project'); // path.resolve(projectRoot) for normalized root
      (path.normalize as jest.Mock)
        .mockReturnValueOnce('/other/path') // path.normalize(resolved)
        .mockReturnValueOnce('/project'); // path.normalize(path.resolve(projectRoot))

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
      (path.resolve as jest.Mock).mockImplementation((_root: string, file?: string) => {
        if (file) {
          return `/project/${file}`;
        } // path.resolve(projectRoot, file)
        return '/project'; // path.resolve(projectRoot)
      });
      (path.normalize as jest.Mock).mockImplementation((p: string) => p);
      (path.relative as jest.Mock).mockReturnValue('test.ts');
      (path.join as jest.Mock).mockReturnValue('/project/test.ts');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = filterValidFiles('/project', ['test.ts']);

      expect(result).toEqual(['test.ts']);
    });

    it('should skip invalid files with warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

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
      (path.resolve as jest.Mock)
        .mockReturnValueOnce('/project/scripts/test.ts') // path.resolve(projectRoot, file)
        .mockReturnValueOnce('/project'); // path.resolve(projectRoot) for normalized root
      (path.normalize as jest.Mock)
        .mockReturnValueOnce('/project/scripts/test.ts') // path.normalize(resolved)
        .mockReturnValueOnce('/project'); // path.normalize(path.resolve(projectRoot))
      (path.relative as jest.Mock).mockReturnValue('scripts/test.ts');

      const result = filterCoverageFiles('/project', ['scripts/test.ts']);

      expect(result).toEqual(['test.ts']);
    });

    it('should exclude test and spec files from coverage', () => {
      (path.resolve as jest.Mock)
        .mockReturnValueOnce('/project/scripts/test.test.ts') // path.resolve(projectRoot, file)
        .mockReturnValueOnce('/project'); // path.resolve(projectRoot) for normalized root
      (path.normalize as jest.Mock)
        .mockReturnValueOnce('/project/scripts/test.test.ts') // path.normalize(resolved)
        .mockReturnValueOnce('/project'); // path.normalize(path.resolve(projectRoot))
      (path.relative as jest.Mock).mockReturnValue('scripts/test.test.ts');

      const result = filterCoverageFiles('/project', ['scripts/test.test.ts']);

      expect(result).toEqual([]);
    });

    it('should handle sanitization errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = filterCoverageFiles('/project', ['invalid`file']);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Skipping file for coverage: invalid`file');
    });
  });
});
