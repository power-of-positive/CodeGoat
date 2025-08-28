/**
 * Tests for review-utils.ts - Integration tests that don't rely heavily on mocking
 */

import { findProjectRoot, execCommand } from './review-utils';
import * as fs from 'fs';

describe('review-utils', () => {
  describe('findProjectRoot', () => {
    it('should return a valid directory path', () => {
      const result = findProjectRoot();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should find the actual project root', () => {
      const result = findProjectRoot();
      // Should find a directory that contains package.json or be the current directory
      const hasPackageJson = fs.existsSync(`${result}/package.json`);
      const isCurrentDir = result === process.cwd();
      expect(hasPackageJson || isCurrentDir).toBe(true);
    });
  });

  describe('execCommand', () => {
    it('should execute basic commands successfully', () => {
      const result = execCommand('echo "test"');
      expect(result.trim()).toBe('test');
    });

    it('should handle command with custom cwd', () => {
      const result = execCommand('pwd', '/tmp');
      // On macOS, /tmp resolves to /private/tmp
      expect(result.trim()).toMatch(/^\/(?:private\/)?tmp$/);
    });

    it('should throw error for invalid commands', () => {
      expect(() => execCommand('nonexistent-command-xyz-123')).toThrow();
    });

    it('should return string output', () => {
      const result = execCommand('echo "hello world"');
      expect(typeof result).toBe('string');
      expect(result.includes('hello world')).toBe(true);
    });

    it('should handle commands that produce no output', () => {
      const result = execCommand('true'); // Unix command that always succeeds with no output
      expect(typeof result).toBe('string');
    });

    it('should preserve output formatting', () => {
      const result = execCommand('echo "line1\nline2"');
      expect(result.includes('\n')).toBe(true);
    });

    it('should handle commands with arguments', () => {
      const result = execCommand('echo "arg1" "arg2"');
      expect(result.includes('arg1')).toBe(true);
      expect(result.includes('arg2')).toBe(true);
    });

    it('should work with different working directories', () => {
      const tempDir = '/tmp';
      if (fs.existsSync(tempDir)) {
        const result = execCommand('pwd', tempDir);
        const actualPath = result.trim();
        // On macOS, /tmp is often symlinked to /private/tmp
        expect(actualPath === tempDir || actualPath === '/private/tmp').toBe(true);
      } else {
        // Skip test if /tmp doesn't exist (e.g., on Windows)
        expect(true).toBe(true);
      }
    });
  });
});
