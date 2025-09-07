/**
 * Comprehensive tests for script-checks.ts
 * Tests both error handling logic and integration with mocked dependencies
 */

import { runScriptChecks } from './script-checks';
import { runScriptLinting } from './script-linting';
import { runScriptCoverage } from '../coverage-analysis';
import { execCommand } from '../utils/command-utils';

// Mock dependencies
jest.mock('./script-linting');
jest.mock('../coverage-analysis');
jest.mock('../utils/command-utils');

describe('script-checks', () => {
  const mockRunScriptLinting = runScriptLinting as jest.MockedFunction<typeof runScriptLinting>;
  const mockRunScriptCoverage = runScriptCoverage as jest.MockedFunction<typeof runScriptCoverage>;
  const mockExecCommand = execCommand as jest.MockedFunction<typeof execCommand>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockRunScriptLinting.mockReturnValue({ failed: false, output: '' });
    mockRunScriptCoverage.mockReturnValue({ failed: false, output: '' });
    mockExecCommand.mockReturnValue({ success: true, output: 'Tests passed' });
  });

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

    describe('integration with dependencies', () => {
      it('should run linting, unit tests, and coverage when all succeed', () => {
        mockRunScriptLinting.mockReturnValue({ failed: false, output: 'Linting passed\n' });
        mockExecCommand.mockReturnValue({ success: true, output: 'Unit tests passed\n' });
        mockRunScriptCoverage.mockReturnValue({ failed: false, output: 'Coverage passed\n' });

        const result = runScriptChecks('/project/root', ['src/test.ts', 'src/utils.ts']);

        expect(result.failed).toBe(false);
        expect(result.output).toBe('Linting passed\nCoverage passed\n');

        expect(mockRunScriptLinting).toHaveBeenCalledWith('/project/root', [
          'src/test.ts',
          'src/utils.ts',
        ]);
        expect(mockExecCommand).toHaveBeenCalledWith(
          'npm run test:scripts',
          '/project/root',
          180000
        );
        expect(mockRunScriptCoverage).toHaveBeenCalledWith({
          scriptsDir: '/project/root',
          timeout: 120000,
          changedFiles: ['src/test.ts', 'src/utils.ts'],
        });
      });

      it('should fail when linting fails', () => {
        mockRunScriptLinting.mockReturnValue({ failed: true, output: 'Linting errors found\n' });
        mockExecCommand.mockReturnValue({ success: true, output: 'Unit tests passed\n' });
        mockRunScriptCoverage.mockReturnValue({ failed: false, output: 'Coverage passed\n' });

        const result = runScriptChecks('/project/root', ['src/test.ts']);

        expect(result.failed).toBe(true);
        expect(result.output).toContain('Linting errors found');
        expect(result.output).toContain('Coverage passed');
      });

      it('should fail and stop early when unit tests fail', () => {
        mockRunScriptLinting.mockReturnValue({ failed: false, output: 'Linting passed\n' });
        mockExecCommand.mockReturnValue({ success: false, output: 'Unit test failure\n' });

        const result = runScriptChecks('/project/root', ['src/test.ts']);

        expect(result.failed).toBe(true);
        expect(result.output).toBe(
          'Linting passed\n\nSCRIPT UNIT TEST FAILURES:\nUnit test failure\n\n'
        );

        // Coverage should not be called when unit tests fail
        expect(mockRunScriptCoverage).not.toHaveBeenCalled();
      });

      it('should handle unit test execution errors', () => {
        mockRunScriptLinting.mockReturnValue({ failed: false, output: 'Linting passed\n' });
        mockExecCommand.mockImplementation(() => {
          throw new Error('Command execution failed');
        });

        const result = runScriptChecks('/project/root', ['src/test.ts']);

        expect(result.failed).toBe(true);
        expect(result.output).toContain('SCRIPT UNIT TEST ERROR:');
        expect(result.output).toContain('Command execution failed');
        expect(mockRunScriptCoverage).not.toHaveBeenCalled();
      });

      it('should handle non-Error exceptions in unit tests', () => {
        mockRunScriptLinting.mockReturnValue({ failed: false, output: '' });
        mockExecCommand.mockImplementation(() => {
          throw 'String error';
        });

        const result = runScriptChecks('/project/root', ['src/test.ts']);

        expect(result.failed).toBe(true);
        expect(result.output).toContain('SCRIPT UNIT TEST ERROR:');
        expect(result.output).toContain('String error');
      });

      it('should fail when coverage fails', () => {
        mockRunScriptLinting.mockReturnValue({ failed: false, output: 'Linting passed\n' });
        mockExecCommand.mockReturnValue({ success: true, output: 'Unit tests passed\n' });
        mockRunScriptCoverage.mockReturnValue({
          failed: true,
          output: 'Coverage threshold not met\n',
        });

        const result = runScriptChecks('/project/root', ['src/test.ts']);

        expect(result.failed).toBe(true);
        expect(result.output).toBe('Linting passed\nCoverage threshold not met\n');
      });

      it('should aggregate all outputs correctly', () => {
        mockRunScriptLinting.mockReturnValue({ failed: false, output: 'Lint: OK\n' });
        mockExecCommand.mockReturnValue({ success: true, output: 'Tests: PASS\n' });
        mockRunScriptCoverage.mockReturnValue({ failed: false, output: 'Coverage: 95%\n' });

        const result = runScriptChecks('/project/root', ['src/test.ts']);

        expect(result.failed).toBe(false);
        expect(result.output).toBe('Lint: OK\nCoverage: 95%\n');
      });

      it('should pass correct parameters to coverage analysis', () => {
        const files = ['src/file1.ts', 'src/file2.ts', 'src/file3.ts'];

        runScriptChecks('/custom/path', files);

        expect(mockRunScriptCoverage).toHaveBeenCalledWith({
          scriptsDir: '/custom/path',
          timeout: 120000,
          changedFiles: files,
        });
      });

      it('should use correct timeout values', () => {
        runScriptChecks('/project', ['test.ts']);

        expect(mockExecCommand).toHaveBeenCalledWith(
          'npm run test:scripts',
          '/project',
          180000 // 3 minutes for unit tests
        );

        expect(mockRunScriptCoverage).toHaveBeenCalledWith(
          expect.objectContaining({
            timeout: 120000, // 2 minutes for coverage
          })
        );
      });
    });

    describe('environment variable handling', () => {
      it('should use default memory limit when NODE_MEMORY_LIMIT is not set', () => {
        const originalLimit = process.env.NODE_MEMORY_LIMIT;
        delete process.env.NODE_MEMORY_LIMIT;

        expect(() => {
          runScriptChecks('/tmp', ['test.ts']);
        }).not.toThrow();

        // Restore original value
        if (originalLimit !== undefined) {
          process.env.NODE_MEMORY_LIMIT = originalLimit;
        }
      });

      it('should accept various valid numeric memory limits', () => {
        const originalLimit = process.env.NODE_MEMORY_LIMIT;
        const validLimits = ['512', '1024', '2048', '4096', '8192', '16384'];

        validLimits.forEach(limit => {
          process.env.NODE_MEMORY_LIMIT = limit;
          expect(() => {
            runScriptChecks('/tmp', ['test.ts']);
          }).not.toThrow();
        });

        // Restore original value
        if (originalLimit !== undefined) {
          process.env.NODE_MEMORY_LIMIT = originalLimit;
        } else {
          delete process.env.NODE_MEMORY_LIMIT;
        }
      });

      it('should reject memory limits with leading/trailing whitespace', () => {
        const originalLimit = process.env.NODE_MEMORY_LIMIT;
        const invalidLimits = [' 4096', '4096 ', ' 4096 ', '\t4096\n'];

        invalidLimits.forEach(limit => {
          process.env.NODE_MEMORY_LIMIT = limit;
          expect(() => {
            runScriptChecks('/tmp', ['test.ts']);
          }).toThrow('Invalid NODE_MEMORY_LIMIT: must be numeric');
        });

        // Restore original value
        if (originalLimit !== undefined) {
          process.env.NODE_MEMORY_LIMIT = originalLimit;
        } else {
          delete process.env.NODE_MEMORY_LIMIT;
        }
      });

      it('should reject memory limits with mixed alphanumeric content', () => {
        const originalLimit = process.env.NODE_MEMORY_LIMIT;
        const invalidLimits = ['4096mb', '8gb', '2k', '1024M', 'unlimited'];

        invalidLimits.forEach(limit => {
          process.env.NODE_MEMORY_LIMIT = limit;
          expect(() => {
            runScriptChecks('/tmp', ['test.ts']);
          }).toThrow('Invalid NODE_MEMORY_LIMIT: must be numeric');
        });

        // Restore original value
        if (originalLimit !== undefined) {
          process.env.NODE_MEMORY_LIMIT = originalLimit;
        } else {
          delete process.env.NODE_MEMORY_LIMIT;
        }
      });
    });

    describe('error handling edge cases', () => {
      it('should handle undefined file arrays', () => {
        const result = runScriptChecks('/tmp', undefined as unknown as string[]);
        expect(result.failed).toBe(false);
        expect(result.output).toBe('');
      });

      it('should handle projectRoot with various valid formats', () => {
        const validRoots = [
          '/absolute/path',
          './relative/path',
          '../parent/path',
          '~/home/path',
          '/path/with-dashes',
          '/path/with_underscores',
          '/path/with.dots',
        ];

        validRoots.forEach(root => {
          expect(() => {
            runScriptChecks(root, ['test.ts']);
          }).not.toThrow();
        });
      });

      it('should handle projectRoot edge cases that should throw', () => {
        const invalidRoots = ['', '   ', '\t', '\n', 0, false, {}];

        invalidRoots.forEach(root => {
          expect(() => {
            runScriptChecks(root as any, ['test.ts']);
          }).toThrow('Invalid projectRoot: must be a non-empty string');
        });
      });

      it('should handle mixed success/failure scenarios correctly', () => {
        const scenarios = [
          { lint: true, unit: false, expectedCoverage: false },
          { lint: false, unit: true, expectedCoverage: true },
          { lint: false, unit: false, expectedCoverage: false },
        ];

        scenarios.forEach(({ lint, unit, expectedCoverage }) => {
          jest.clearAllMocks();
          mockRunScriptLinting.mockReturnValue({
            failed: lint,
            output: `Lint: ${lint ? 'FAIL' : 'PASS'}\n`,
          });
          mockExecCommand.mockReturnValue({
            success: unit,
            output: `Unit: ${unit ? 'PASS' : 'FAIL'}\n`,
          });
          mockRunScriptCoverage.mockReturnValue({ failed: false, output: 'Coverage: PASS\n' });

          const result = runScriptChecks('/project', ['test.ts']);

          if (expectedCoverage) {
            expect(mockRunScriptCoverage).toHaveBeenCalled();
          } else {
            expect(mockRunScriptCoverage).not.toHaveBeenCalled();
          }

          expect(result.failed).toBe(lint || !unit);
        });
      });
    });
  });
});
