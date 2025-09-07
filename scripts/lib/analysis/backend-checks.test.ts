import { runBackendChecks } from './backend-checks';
import { StagedFiles } from '../files/staged-files';
import * as rustRunners from '../runners/rust-runners';
import * as checkUtils from '../checks/check-utils';

// Mock dependencies
jest.mock('../runners/rust-runners');
jest.mock('../checks/check-utils');

const mockRunRustFormatting = rustRunners.runRustFormatting as jest.MockedFunction<
  typeof rustRunners.runRustFormatting
>;
const mockRunRustLinting = rustRunners.runRustLinting as jest.MockedFunction<
  typeof rustRunners.runRustLinting
>;
const mockValidateStagedFiles = checkUtils.validateStagedFiles as jest.MockedFunction<
  typeof checkUtils.validateStagedFiles
>;

// Mock console.error to avoid test output noise
const originalConsoleError = console.error;

describe('backend-checks', () => {
  let mockConsoleError: jest.Mock;
  const projectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError = jest.fn();
    console.error = mockConsoleError;

    // Default mock implementations
    mockValidateStagedFiles.mockImplementation(() => {});
    mockRunRustFormatting.mockReturnValue({ success: true, output: '' });
    mockRunRustLinting.mockReturnValue({ success: true, output: '' });
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('runBackendChecks', () => {
    it('should skip checks when no backend files are staged', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: ['src/frontend.tsx'],
        backendFiles: [],
        scriptFiles: ['scripts/test.ts'],
        allFiles: ['src/frontend.tsx', 'scripts/test.ts'],
      };

      const result = runBackendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');
      expect(mockConsoleError).toHaveBeenCalledWith('ℹ️ No backend files to check');
      expect(mockRunRustFormatting).not.toHaveBeenCalled();
      expect(mockRunRustLinting).not.toHaveBeenCalled();
    });

    it('should run all backend checks successfully', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs', 'src/main.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs', 'src/main.rs'],
      };

      const result = runBackendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');
      expect(mockValidateStagedFiles).toHaveBeenCalledWith(stagedFiles);
      expect(mockConsoleError).toHaveBeenCalledWith('🔍 Starting backend checks...');
      expect(mockConsoleError).toHaveBeenCalledWith('📋 Running Rust Formatting...');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Rust Formatting passed');
      expect(mockConsoleError).toHaveBeenCalledWith('📋 Running Rust Linting...');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Rust Linting passed');
      expect(mockRunRustFormatting).toHaveBeenCalledWith(projectRoot);
      expect(mockRunRustLinting).toHaveBeenCalledWith(projectRoot);
    });

    it('should fail when Rust formatting fails', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs'],
      };

      mockRunRustFormatting.mockReturnValue({
        success: false,
        output: 'Formatting errors found in src/lib.rs',
      });

      const result = runBackendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('RUST FORMAT FAILURES:\nFormatting errors found in src/lib.rs');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Rust Formatting failed');
      expect(mockRunRustLinting).not.toHaveBeenCalled(); // Should stop after first failure
    });

    it('should fail when Rust linting fails', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs'],
      };

      mockRunRustLinting.mockReturnValue({
        success: false,
        output: 'Clippy warnings:\nwarning: unused variable `x`',
      });

      const result = runBackendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe(
        'RUST LINT FAILURES:\nClippy warnings:\nwarning: unused variable `x`'
      );
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Rust Formatting passed');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Rust Linting failed');
    });

    it('should handle validation errors', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs'],
      };

      const validationError = new Error('Invalid staged files structure');
      mockValidateStagedFiles.mockImplementation(() => {
        throw validationError;
      });

      const result = runBackendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('Backend check error: Invalid staged files structure');
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Backend check error: Invalid staged files structure'
      );
      expect(mockRunRustFormatting).not.toHaveBeenCalled();
      expect(mockRunRustLinting).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs'],
      };

      mockValidateStagedFiles.mockImplementation(() => {
        throw 'String error';
      });

      const result = runBackendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('Backend check error: String error');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Backend check error: String error');
    });

    it('should handle errors from Rust runners', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs'],
      };

      mockRunRustFormatting.mockImplementation(() => {
        throw new Error('Runner execution failed');
      });

      const result = runBackendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('Backend check error: Runner execution failed');
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Backend check error: Runner execution failed'
      );
    });

    it('should validate staged files before processing', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs'],
      };

      runBackendChecks(projectRoot, stagedFiles);

      expect(mockValidateStagedFiles).toHaveBeenCalledWith(stagedFiles);
    });

    it('should run checks in correct order', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs'],
      };

      const callOrder: string[] = [];

      mockRunRustFormatting.mockImplementation(() => {
        callOrder.push('formatting');
        return { success: true, output: '' };
      });

      mockRunRustLinting.mockImplementation(() => {
        callOrder.push('linting');
        return { success: true, output: '' };
      });

      runBackendChecks(projectRoot, stagedFiles);

      expect(callOrder).toEqual(['formatting', 'linting']);
    });

    it('should handle empty project root path', () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: [],
        backendFiles: ['src/lib.rs'],
        scriptFiles: [],
        allFiles: ['src/lib.rs'],
      };

      const result = runBackendChecks('', stagedFiles);

      expect(mockRunRustFormatting).toHaveBeenCalledWith('');
      expect(mockRunRustLinting).toHaveBeenCalledWith('');
      expect(result.failed).toBe(false);
    });
  });
});
