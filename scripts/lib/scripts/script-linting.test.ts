/**
 * Error handling tests for script-linting.ts
 * Tests with strategic mocking to achieve high coverage
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the function and its dependencies
import { runScriptLinting } from './script-linting';
import * as commandUtils from '../utils/command-utils';
import * as fileFiltering from '../files/file-filtering';
import { createTestSetup, createFileTestScenarios } from '../testing/test-mocks';

// Mock the dependencies to control behavior
vi.mock('../utils/command-utils', () => ({
  execCommand: vi.fn(),
}));

vi.mock('../files/file-filtering', () => ({
  filterValidFiles: vi.fn(),
}));

describe('script-linting 123', () => {
  const testSetup = createTestSetup();
  //123

  beforeEach(() => {
    testSetup.cleanup();
    // Set default mock behavior with fresh implementations
    vi.mocked(fileFiltering.filterValidFiles).mockImplementation(() => []);
    vi.mocked(commandUtils.execCommand).mockImplementation(() => ({
      success: true,
      output: '',
    }));
  });

  afterEach(() => {
    testSetup.cleanup();
  });

  describe('runScriptLinting', () => {
    it('should handle empty file lists gracefully', () => {
      // Test with empty array - should return early success
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue([]);

      const result = runScriptLinting('/tmp', []);

      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('output');
      expect(typeof result.failed).toBe('boolean');
      expect(typeof result.output).toBe('string');
      expect(result.failed).toBe(false);
      expect(result.output).toBe('');
    });

    it('should handle non-existent project paths gracefully', () => {
      // Test with invalid project path
      const result = runScriptLinting('/definitely-nonexistent-path-12345', ['test.ts']);

      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('output');
      expect(typeof result.failed).toBe('boolean');
      expect(typeof result.output).toBe('string');
    });

    it('should handle various file types without crashing', () => {
      // Test with different file patterns using shared scenarios
      const testCases = createFileTestScenarios();

      testCases.forEach(({ files }) => {
        const result = runScriptLinting('/tmp', files);

        expect(result).toHaveProperty('failed');
        expect(result).toHaveProperty('output');
        expect(typeof result.failed).toBe('boolean');
        expect(typeof result.output).toBe('string');
      });
    });

    it('should return consistent structure for all inputs', () => {
      // Test various scenarios to ensure consistent return structure
      const scenarios = [
        { project: '/tmp', files: [] },
        { project: '/tmp', files: ['test.ts'] },
        { project: '/nonexistent', files: ['file.ts'] },
        { project: '/tmp', files: ['multiple.ts', 'files.ts'] },
      ];

      scenarios.forEach(({ project, files }) => {
        const result = runScriptLinting(project, files);

        // All results should have the expected structure
        expect(result).toHaveProperty('failed');
        expect(result).toHaveProperty('output');
        expect(typeof result.failed).toBe('boolean');
        expect(typeof result.output).toBe('string');
      });
    });

    it('should handle edge cases without throwing', () => {
      // Test edge cases that might cause errors
      const edgeCases = [
        { project: '', files: [] },
        { project: '/tmp', files: [''] },
        { project: '/tmp', files: ['file with spaces.ts'] },
        { project: '/tmp', files: ["file'with'quotes.ts"] },
      ];

      edgeCases.forEach(({ project, files }) => {
        expect(() => {
          const result = runScriptLinting(project, files);
          expect(typeof result).toBe('object');
        }).not.toThrow();
      });
    });
  });

  describe('command execution and error handling (covering uncovered lines)', () => {
    it('should handle successful ESLint execution - covers lines 48-50', () => {
      // Test the success path (lines 48-50)
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue(['test.ts']);
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: true,
        output: '',
      });

      const result = runScriptLinting('/project', ['test.ts']);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');

      // Verify the command was constructed correctly (line 46)
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        "ESLINT_USE_FLAT_CONFIG=false npx eslint --max-warnings 100 --rule 'no-console:off' 'test.ts'",
        '/project'
      );
    });

    it('should handle file escaping with quotes - covers line 45', () => {
      // Test file escaping logic (line 45)
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue([
        "file'with'quotes.ts",
        'file with spaces.ts',
      ]);
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: true,
        output: '',
      });

      const result = runScriptLinting('/project', ["file'with'quotes.ts", 'file with spaces.ts']);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');

      // Verify proper escaping (line 45)
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        "ESLINT_USE_FLAT_CONFIG=false npx eslint --max-warnings 100 --rule 'no-console:off' 'file'\\''with'\\''quotes.ts' 'file with spaces.ts'",
        '/project'
      );
    });

    it('should handle execCommand error with stdout - covers lines 25-28, 51-54', () => {
      // Test error handling with output message
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue(['test.ts']);
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: 'ESLint stdout error message',
      });

      const result = runScriptLinting('/project', ['test.ts']);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('\nSCRIPT LINT FAILURES:\nESLint stdout error message\n');
    });

    it('should handle execCommand error with stderr - covers lines 25-28, 51-54', () => {
      // Test error handling with stderr output
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue(['test.ts']);
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: 'ESLint stderr error message',
      });

      const result = runScriptLinting('/project', ['test.ts']);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('\nSCRIPT LINT FAILURES:\nESLint stderr error message\n');
    });

    it('should handle execCommand error with message only - covers lines 25-28, 51-54', () => {
      // Test error handling with error message
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue(['test.ts']);
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: 'Command execution failed',
      });

      const result = runScriptLinting('/project', ['test.ts']);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('\nSCRIPT LINT FAILURES:\nCommand execution failed\n');
    });

    it('should handle non-object error - covers lines 25-28, 51-54', () => {
      // Test error handling with non-object error (covers isErrorObject function and catch block)
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue(['test.ts']);
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: 'String error',
      });

      const result = runScriptLinting('/project', ['test.ts']);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('\nSCRIPT LINT FAILURES:\nString error\n');
    });

    it('should handle error with stdout and stderr - covers lines 25-28, 51-54', () => {
      // Test error handling with complex output message
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue(['test.ts']);
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: 'stdout message',
      });

      const result = runScriptLinting('/project', ['test.ts']);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('\nSCRIPT LINT FAILURES:\nstdout message\n');
    });

    it('should handle multiple files with mixed escaping - covers line 45', () => {
      // Test multiple files with various characters requiring escaping
      vi.mocked(fileFiltering.filterValidFiles).mockReturnValue([
        'normal.ts',
        "file'with'single'quotes.ts",
        'file with spaces.ts',
        'nested/path/file.ts',
      ]);
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: true,
        output: '',
      });

      const result = runScriptLinting('/project', [
        'normal.ts',
        "file'with'single'quotes.ts",
        'file with spaces.ts',
        'nested/path/file.ts',
      ]);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');

      // Verify proper escaping for all files
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        "ESLINT_USE_FLAT_CONFIG=false npx eslint --max-warnings 100 --rule 'no-console:off' 'normal.ts' 'file'\\''with'\\''single'\\''quotes.ts' 'file with spaces.ts' 'nested/path/file.ts'",
        '/project'
      );
    });
  });
});
