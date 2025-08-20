/**
 * Tests for rust-runners.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runRustFormatting, runRustLinting } from './rust-runners';
import { execCommand } from '../utils/command-utils';
import { validateDirectoryExists } from '../utils/validation-utils';

// Mock external dependencies
vi.mock('../utils/command-utils');
vi.mock('../utils/validation-utils');

describe('rust-runners', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Mock validation-utils - by default, don't throw
    vi.mocked(validateDirectoryExists).mockImplementation(() => {
      // Default: do nothing (validation passes)
    });
  });

  describe('runRustFormatting', () => {
    it('should return CheckResult with correct structure', () => {
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: 'Rust formatting passed',
      });

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

    it('should call execCommand with correct parameters', () => {
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: 'formatting success',
      });

      runRustFormatting('/mock/project');

      expect(execCommand).toHaveBeenCalledWith(
        'cargo fmt --check --manifest-path backend/Cargo.toml',
        '/mock/project'
      );
    });

    it('should handle execCommand throwing error', () => {
      vi.mocked(execCommand).mockReturnValue({
        success: false,
        output: 'Formatting failed',
      });

      const result = runRustFormatting('/mock/project');

      expect(result.success).toBe(false);
      expect(result.output).toContain('Formatting failed');
    });
  });

  describe('runRustLinting', () => {
    it('should return CheckResult with correct structure', () => {
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: 'Rust linting passed',
      });

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

    it('should call execCommand with correct parameters', () => {
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: 'linting success',
      });

      runRustLinting('/mock/project');

      expect(execCommand).toHaveBeenCalledWith(
        'cargo clippy --manifest-path backend/Cargo.toml --all-targets -- -D warnings',
        '/mock/project'
      );
    });

    it('should handle execCommand throwing error', () => {
      vi.mocked(execCommand).mockReturnValue({
        success: false,
        output: 'Linting failed',
      });

      const result = runRustLinting('/mock/project');

      expect(result.success).toBe(false);
      expect(result.output).toContain('Linting failed');
    });
  });
});
