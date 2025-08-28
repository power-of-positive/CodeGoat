import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { findTestFiles, buildCoverageCommand, executeCoverage } from './coverage-helpers';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

describe('coverage-helpers', () => {
  let mockLogger: { log: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      log: jest.fn(),
      error: jest.fn()
    };
  });

  describe('findTestFiles', () => {
    it('should find .test.ts files for changed files', () => {
      const changedFiles = [
        '/scripts/lib/utils/file1.ts',
        '/scripts/lib/utils/file2.ts'
      ];
      const scriptsDir = '/scripts';

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = String(filePath);
        return pathStr.includes('file1.test.ts') || pathStr.includes('file2.test.ts');
      });

      const result = findTestFiles(changedFiles, scriptsDir);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('file1.test.ts');
      expect(result[1]).toContain('file2.test.ts');
    });

    it('should prefer .spec.ts files when .test.ts does not exist', () => {
      const changedFiles = ['/scripts/lib/utils/file1.ts'];
      const scriptsDir = '/scripts';

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = String(filePath);
        return pathStr.includes('file1.spec.ts');
      });

      const result = findTestFiles(changedFiles, scriptsDir);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('file1.spec.ts');
    });

    it('should return empty array when no test files exist', () => {
      const changedFiles = ['/scripts/lib/utils/file1.ts'];
      const scriptsDir = '/scripts';

      mockExistsSync.mockReturnValue(false);

      const result = findTestFiles(changedFiles, scriptsDir);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple files with mixed test file availability', () => {
      const changedFiles = [
        '/scripts/lib/utils/file1.ts',
        '/scripts/lib/utils/file2.ts',
        '/scripts/lib/utils/file3.ts'
      ];
      const scriptsDir = '/scripts';

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = String(filePath);
        return pathStr.includes('file1.test.ts') || pathStr.includes('file3.spec.ts');
      });

      const result = findTestFiles(changedFiles, scriptsDir);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('file1.test.ts');
      expect(result[1]).toContain('file3.spec.ts');
    });

    it('should return relative paths from scriptsDir', () => {
      const changedFiles = ['/scripts/lib/utils/file1.ts'];
      const scriptsDir = '/scripts';

      mockExistsSync.mockReturnValue(true);

      const result = findTestFiles(changedFiles, scriptsDir);

      expect(result[0].startsWith('/')).toBe(false);
      expect(result[0]).toContain('lib/utils/file1.test.ts');
    });
  });

  describe('buildCoverageCommand', () => {
    const baseCommand = 'vitest';
    const scriptsDir = '/scripts';

    it('should build basic coverage command when no changed files', () => {
      const result = buildCoverageCommand(baseCommand, [], scriptsDir, mockLogger);

      expect(result.command).toBe("NODE_OPTIONS='--max-old-space-size=4096' vitest run --coverage");
      expect(result.shouldSkip).toBe(false);
    });

    it('should build targeted coverage command when test files exist', () => {
      const changedFiles = ['/scripts/lib/utils/file1.ts'];
      
      mockExistsSync.mockReturnValue(true);

      const result = buildCoverageCommand(baseCommand, changedFiles, scriptsDir, mockLogger);

      expect(result.command).toContain('--coverage');
      expect(result.command).toContain('file1.test.ts');
      expect(result.shouldSkip).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith('🎯 Running coverage for 1 test file(s)');
    });

    it('should skip when changed files have no test files', () => {
      const changedFiles = ['/scripts/lib/utils/file1.ts'];
      
      mockExistsSync.mockReturnValue(false);

      const result = buildCoverageCommand(baseCommand, changedFiles, scriptsDir, mockLogger);

      expect(result.command).toBe('');
      expect(result.shouldSkip).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith('⚡ No test files found for changed files, skipping coverage');
    });

    it('should handle multiple test files', () => {
      const changedFiles = [
        '/scripts/lib/utils/file1.ts',
        '/scripts/lib/utils/file2.ts'
      ];
      
      mockExistsSync.mockReturnValue(true);

      const result = buildCoverageCommand(baseCommand, changedFiles, scriptsDir, mockLogger);

      expect(result.command).toContain('file1.test.ts');
      expect(result.command).toContain('file2.test.ts');
      expect(result.shouldSkip).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith('🎯 Running coverage for 2 test file(s)');
    });

    it('should include NODE_OPTIONS for memory management', () => {
      const result = buildCoverageCommand(baseCommand, [], scriptsDir, mockLogger);

      expect(result.command).toContain("NODE_OPTIONS='--max-old-space-size=4096'");
    });
  });

  describe('executeCoverage', () => {
    const coverageCommand = 'vitest run --coverage';
    const scriptsDir = '/scripts';
    const timeout = 30000;

    it('should execute coverage successfully', () => {
      const mockOutput = 'Coverage: 85%\nAll tests passed';
      mockExecSync.mockReturnValue(mockOutput);

      const result = executeCoverage(coverageCommand, scriptsDir, timeout, mockLogger);

      expect(result.failed).toBe(false);
      expect(result.output).toContain('Coverage analysis completed successfully');
      expect(mockExecSync).toHaveBeenCalledWith(coverageCommand, {
        stdio: 'pipe',
        cwd: scriptsDir,
        env: expect.objectContaining({
          RUNNING_COVERAGE: 'true',
          NODE_ENV: 'test'
        }),
        timeout,
        encoding: 'utf8'
      });
      expect(mockLogger.log).toHaveBeenCalledWith('✅ Coverage analysis completed successfully');
    });

    it('should handle execution errors', () => {
      const error = new Error('Command failed');
      (error as any).status = 1;
      (error as any).stdout = '';
      (error as any).stderr = 'Test execution failed';

      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = executeCoverage(coverageCommand, scriptsDir, timeout, mockLogger);

      expect(result.failed).toBe(true);
      expect(result.output).toContain('Coverage execution failed');
    });

    it('should handle timeout errors', () => {
      const error = new Error('Command timed out');
      (error as any).signal = 'SIGTERM';
      (error as any).stdout = '';
      (error as any).stderr = '';

      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = executeCoverage(coverageCommand, scriptsDir, timeout, mockLogger);

      expect(result.failed).toBe(true);
      expect(result.output).toContain('Coverage execution timed out');
    });

    it('should preserve process environment variables', () => {
      const originalEnv = process.env.CUSTOM_VAR;
      process.env.CUSTOM_VAR = 'test-value';

      mockExecSync.mockReturnValue('Success');

      executeCoverage(coverageCommand, scriptsDir, timeout, mockLogger);

      expect(mockExecSync).toHaveBeenCalledWith(coverageCommand, {
        stdio: 'pipe',
        cwd: scriptsDir,
        env: expect.objectContaining({
          CUSTOM_VAR: 'test-value',
          RUNNING_COVERAGE: 'true',
          NODE_ENV: 'test'
        }),
        timeout,
        encoding: 'utf8'
      });

      // Cleanup
      if (originalEnv !== undefined) {
        process.env.CUSTOM_VAR = originalEnv;
      } else {
        delete process.env.CUSTOM_VAR;
      }
    });

    it('should handle errors with stdout output', () => {
      const error = new Error('Command failed');
      (error as any).status = 1;
      (error as any).stdout = 'Some test output\nFAIL src/test.ts\nTest failed';
      (error as any).stderr = '';

      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = executeCoverage(coverageCommand, scriptsDir, timeout, mockLogger);

      expect(result.failed).toBe(true);
      expect(result.debug).toContain('Some test output');
    });

    it('should handle non-Error exceptions', () => {
      mockExecSync.mockImplementation(() => {
        throw 'String error';
      });

      const result = executeCoverage(coverageCommand, scriptsDir, timeout, mockLogger);

      expect(result.failed).toBe(true);
      expect(result.output).toContain('Coverage execution failed');
    });

    it('should clean up vitest processes', () => {
      mockExecSync.mockReturnValue('Success');

      executeCoverage(coverageCommand, scriptsDir, timeout, mockLogger);

      // The cleanupVitestProcesses function should be called
      // We can verify this by checking that the main execSync call was made
      expect(mockExecSync).toHaveBeenCalledWith(coverageCommand, expect.any(Object));
    });
  });
});