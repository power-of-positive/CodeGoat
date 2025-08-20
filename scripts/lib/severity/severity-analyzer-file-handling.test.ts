/**
 * Tests for severity-analyzer file handling and error cases
 * Focused on file operations and edge case handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { analyzeLlmReviewSeverity } from './severity-analyzer';
import { createExtendedTestSetup } from '../testing/test-mocks';

// Mock external dependencies
vi.mock('fs');

describe('severity-analyzer file handling', () => {
  const testSetup = createExtendedTestSetup();

  beforeEach(() => {
    testSetup.cleanup();
    // Reset all mocks to default behavior with fresh implementations
    vi.mocked(fs.existsSync).mockImplementation(() => false);
    vi.mocked(fs.readFileSync).mockImplementation(() => '');

    // Mock process.cwd to return a valid path
    vi.stubGlobal('process', {
      ...process,
      cwd: vi.fn().mockReturnValue('/test/project'),
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
      vi.mocked(fs.existsSync).mockReturnValue(false);

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
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('');

      const result = analyzeLlmReviewSeverity('/test/project');
      expect(result).toBe('');
    });

    it('should handle file read errors', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = analyzeLlmReviewSeverity('/test/project');
      expect(result).toBe('');
    });
  });
});
