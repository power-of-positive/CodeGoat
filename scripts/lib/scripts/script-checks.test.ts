/**
 * Error handling tests for script-checks.ts
 * Simple, mock-free tests that focus on error handling logic
 */

import { describe, it, expect } from 'vitest';
import { runScriptChecks } from './script-checks';

describe('script-checks', () => {
  describe('runScriptChecks', () => {
    it('should handle empty file lists gracefully', () => {
      // Test with empty array - should return early success
      const result = runScriptChecks('/tmp', []);
      expect(result).toEqual({ failed: false, output: '' });
    });

    it('should handle null/undefined file arrays gracefully', () => {
      // Test with null array - should handle gracefully
      const result = runScriptChecks('/tmp', null as unknown as string[]);
      expect(result.failed).toBe(false);
      expect(result.output).toBe('');
    });

    it('should validate project root parameter', () => {
      // Test invalid project roots - should throw errors
      expect(() => {
        runScriptChecks('', ['valid.ts']);
      }).toThrow('Invalid projectRoot: must be a non-empty string');

      expect(() => {
        runScriptChecks(null as unknown as string, ['valid.ts']);
      }).toThrow('Invalid projectRoot: must be a non-empty string');
    });

    it('should validate NODE_MEMORY_LIMIT environment variable', () => {
      // Test invalid memory limit - should throw error
      const originalLimit = process.env.NODE_MEMORY_LIMIT;

      process.env.NODE_MEMORY_LIMIT = 'invalid';
      expect(() => {
        runScriptChecks('/tmp', ['test.ts']);
      }).toThrow('Invalid NODE_MEMORY_LIMIT: must be numeric');

      // Test non-numeric values
      process.env.NODE_MEMORY_LIMIT = 'abc123';
      expect(() => {
        runScriptChecks('/tmp', ['test.ts']);
      }).toThrow('Invalid NODE_MEMORY_LIMIT: must be numeric');

      // Restore original value
      if (originalLimit !== undefined) {
        process.env.NODE_MEMORY_LIMIT = originalLimit;
      } else {
        delete process.env.NODE_MEMORY_LIMIT;
      }
    });

    it('should accept valid numeric memory limits', () => {
      const originalLimit = process.env.NODE_MEMORY_LIMIT;

      // Test valid numeric values - should not throw
      process.env.NODE_MEMORY_LIMIT = '4096';
      expect(() => {
        runScriptChecks('/tmp', ['test.ts']);
      }).not.toThrow();

      process.env.NODE_MEMORY_LIMIT = '8192';
      expect(() => {
        runScriptChecks('/tmp', ['test.ts']);
      }).not.toThrow();

      // Restore original value
      if (originalLimit !== undefined) {
        process.env.NODE_MEMORY_LIMIT = originalLimit;
      } else {
        delete process.env.NODE_MEMORY_LIMIT;
      }
    });

    it('should return consistent structure for all valid inputs', () => {
      // Test that function always returns expected structure
      const testCases = [
        { project: '/tmp', files: [] },
        { project: '/tmp', files: ['test.ts'] },
        { project: '/tmp', files: ['multiple.ts', 'files.ts'] },
      ];

      testCases.forEach(({ project, files }) => {
        const result = runScriptChecks(project, files);

        // All results should have the expected structure
        expect(result).toHaveProperty('failed');
        expect(result).toHaveProperty('output');
        expect(typeof result.failed).toBe('boolean');
        expect(typeof result.output).toBe('string');
      });
    });

    it('should handle various file types without crashing', () => {
      // Test with different file types - should not crash
      const fileTypes = [
        ['script.ts'],
        ['component.tsx'],
        ['test.test.ts'],
        ['spec.spec.ts'],
        ['nonexistent.ts'],
      ];

      fileTypes.forEach(files => {
        expect(() => {
          const result = runScriptChecks('/tmp', files);
          expect(typeof result).toBe('object');
        }).not.toThrow();
      });
    });
  });
});
