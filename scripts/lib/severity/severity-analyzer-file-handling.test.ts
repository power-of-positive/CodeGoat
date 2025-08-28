/**
 * Tests for severity-analyzer file handling and error cases
 * Focused on file operations and edge case handling
 */

import * as fs from 'fs';
import { analyzeLlmReviewSeverity } from './severity-analyzer';
import { createExtendedTestSetup } from '../testing/test-mocks';

// Mock external dependencies
jest.mock('fs');

describe('severity-analyzer file handling', () => {
  const testSetup = createExtendedTestSetup();

  beforeEach(() => {
    testSetup.cleanup();
    // Reset all mocks to default behavior with fresh implementations
    (fs.existsSync as jest.Mock).mockImplementation(() => false);
    (fs.readFileSync as jest.Mock).mockImplementation(() => '');

    // Mock process.cwd to return a valid path
    const mockCwd = jest.fn().mockReturnValue('/test/project');
    Object.defineProperty(process, 'cwd', {
      value: mockCwd,
      configurable: true,
    });
  });

  afterEach(() => {
    testSetup.cleanup();
  });

  describe('analyzeLlmReviewSeverity', () => {
    it('should handle invalid file parameters gracefully', () => {
      // Test empty/null paths
      expect(analyzeLlmReviewSeverity('')).toBe('');
      expect(analyzeLlmReviewSeverity('')).toBe('');
      expect(analyzeLlmReviewSeverity(null as unknown as string)).toBe('');
      expect(analyzeLlmReviewSeverity(null as unknown as string)).toBe('');

      // Test paths with security issues
      expect(analyzeLlmReviewSeverity('../../../etc')).toBe('');
      expect(analyzeLlmReviewSeverity('/valid/path')).toBe('');
    });

    it('should handle non-existent files gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = analyzeLlmReviewSeverity('/test/project');
      expect(result).toBe('');
    });

    it('should return consistent structure for all scenarios', () => {
      const scenarios = [
        { path: '', expected: '' },
        { path: '/valid', expected: '' },
        { path: '/valid', expected: '' },
      ];

      scenarios.forEach(({ path, expected }) => {
        const result = analyzeLlmReviewSeverity(path);
        expect(typeof result).toBe('string');
        expect(result).toBe(expected);
      });
    });

    it('should handle empty or invalid review file content', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('');

      const result = analyzeLlmReviewSeverity('/test/project');
      expect(result).toBe('');
    });

    it('should handle file read errors', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = analyzeLlmReviewSeverity('/test/project');
      expect(result).toBe('');
    });
  });
});
