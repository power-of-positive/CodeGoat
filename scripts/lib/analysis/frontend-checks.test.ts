import { runFrontendChecks } from './frontend-checks';
import { StagedFiles } from '../files/staged-files';
import * as frontendRunners from '../runners/frontend-runners';
import * as checkRunners from '../checks/check-runners';
import * as checkUtils from '../checks/check-utils';

// Mock dependencies
jest.mock('../runners/frontend-runners');
jest.mock('../checks/check-runners');
jest.mock('../checks/check-utils');

const mockRunFrontendLinting = frontendRunners.runFrontendLinting as jest.MockedFunction<typeof frontendRunners.runFrontendLinting>;
const mockRunFrontendTests = frontendRunners.runFrontendTests as jest.MockedFunction<typeof frontendRunners.runFrontendTests>;
const mockRunPlaywrightTests = frontendRunners.runPlaywrightTests as jest.MockedFunction<typeof frontendRunners.runPlaywrightTests>;
const mockRunApiE2eTests = checkRunners.runApiE2eTests as jest.MockedFunction<typeof checkRunners.runApiE2eTests>;
const mockValidateStagedFiles = checkUtils.validateStagedFiles as jest.MockedFunction<typeof checkUtils.validateStagedFiles>;

// Mock console.error to avoid test output noise
const originalConsoleError = console.error;

describe('frontend-checks', () => {
  let mockConsoleError: jest.Mock;
  const projectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError = jest.fn();
    console.error = mockConsoleError;
    
    // Setup default mock implementations
    mockValidateStagedFiles.mockImplementation(() => {});
    mockRunFrontendLinting.mockReturnValue({ success: true, output: '' });
    mockRunFrontendTests.mockReturnValue({ success: true, output: '' });
    mockRunPlaywrightTests.mockReturnValue({ success: true, output: '' });
    mockRunApiE2eTests.mockResolvedValue({ success: true, output: '' });
  });

  afterEach(() => {
    console.error = originalConsoleError;
    delete process.env.SKIP_API_E2E_TESTS;
  });

  describe('runFrontendChecks', () => {
    const createStagedFiles = (frontendFiles: string[] = []): StagedFiles => ({
      frontendFiles,
      backendFiles: [],
      scriptFiles: [],
      allFiles: frontendFiles
    });

    it('should run all checks successfully when frontend files are staged', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx', 'src/utils.ts']);

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');
      expect(mockValidateStagedFiles).toHaveBeenCalledWith(stagedFiles);
      expect(mockRunApiE2eTests).toHaveBeenCalledWith(projectRoot);
      expect(mockRunFrontendLinting).toHaveBeenCalledWith(projectRoot);
      expect(mockRunFrontendTests).toHaveBeenCalledWith(projectRoot);
      expect(mockRunPlaywrightTests).toHaveBeenCalledWith(projectRoot);
    });

    it('should skip API E2E tests when SKIP_API_E2E_TESTS is true', async () => {
      process.env.SKIP_API_E2E_TESTS = 'true';
      const stagedFiles = createStagedFiles(['src/component.tsx']);

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(false);
      expect(mockRunApiE2eTests).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith('⏭️ API E2E tests skipped (SKIP_API_E2E_TESTS=true)');
      expect(mockRunFrontendLinting).toHaveBeenCalledWith(projectRoot);
    });

    it('should skip frontend checks when no frontend files are staged but run API E2E', async () => {
      const stagedFiles = createStagedFiles([]);

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(false);
      expect(result.output).toBe('');
      expect(mockRunApiE2eTests).toHaveBeenCalledWith(projectRoot);
      expect(mockConsoleError).toHaveBeenCalledWith('ℹ️ No frontend files to check (linting/unit tests)');
      expect(mockRunFrontendLinting).not.toHaveBeenCalled();
      expect(mockRunFrontendTests).not.toHaveBeenCalled();
      expect(mockRunPlaywrightTests).not.toHaveBeenCalled();
    });

    it('should fail when API E2E tests fail', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);
      mockRunApiE2eTests.mockResolvedValue({
        success: false,
        output: 'API test failed: Connection timeout'
      });

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('API E2E TEST FAILURES:\nAPI test failed: Connection timeout');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ API E2E Tests failed');
      expect(mockRunFrontendLinting).not.toHaveBeenCalled(); // Should not proceed to sync checks
    });

    it('should fail when frontend linting fails', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);
      mockRunFrontendLinting.mockReturnValue({
        success: false,
        output: 'Linting errors: Missing semicolon'
      });

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('FRONTEND LINT FAILURES:\nLinting errors: Missing semicolon');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Frontend Linting failed');
      expect(mockRunFrontendTests).not.toHaveBeenCalled(); // Should not proceed to next check
    });

    it('should fail when frontend tests fail', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);
      mockRunFrontendTests.mockReturnValue({
        success: false,
        output: 'Test failed: Component should render'
      });

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('FRONTEND TEST FAILURES:\nTest failed: Component should render');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Frontend Linting passed');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Frontend Unit Tests failed');
      expect(mockRunPlaywrightTests).not.toHaveBeenCalled(); // Should not proceed to next check
    });

    it('should fail when Playwright tests fail', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);
      mockRunPlaywrightTests.mockReturnValue({
        success: false,
        output: 'E2E test failed: Element not found'
      });

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('PLAYWRIGHT E2E TEST FAILURES:\nE2E test failed: Element not found');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Frontend Linting passed');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Frontend Unit Tests passed');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Playwright E2E Tests failed');
    });

    it('should handle validation errors', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);
      const validationError = new Error('Invalid staged files structure');
      mockValidateStagedFiles.mockImplementation(() => {
        throw validationError;
      });

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('Frontend check error: Invalid staged files structure');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Frontend check error: Invalid staged files structure');
      expect(mockRunApiE2eTests).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);
      mockValidateStagedFiles.mockImplementation(() => {
        throw 'String error';
      });

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('Frontend check error: String error');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Frontend check error: String error');
    });

    it('should handle API E2E test errors', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);
      mockRunApiE2eTests.mockRejectedValue(new Error('Network error'));

      const result = await runFrontendChecks(projectRoot, stagedFiles);

      expect(result.failed).toBe(true);
      expect(result.output).toBe('Frontend check error: Network error');
    });

    it('should log progress messages during successful execution', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);

      await runFrontendChecks(projectRoot, stagedFiles);

      expect(mockConsoleError).toHaveBeenCalledWith('📋 Running API E2E Tests...');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ API E2E Tests passed');
      expect(mockConsoleError).toHaveBeenCalledWith('🔍 Starting frontend checks...');
      expect(mockConsoleError).toHaveBeenCalledWith('📋 Running Frontend Linting...');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Frontend Linting passed');
      expect(mockConsoleError).toHaveBeenCalledWith('📋 Running Frontend Unit Tests...');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Frontend Unit Tests passed');
      expect(mockConsoleError).toHaveBeenCalledWith('📋 Running Playwright E2E Tests...');
      expect(mockConsoleError).toHaveBeenCalledWith('✅ Playwright E2E Tests passed');
    });

    it('should run checks in the correct order', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);
      const callOrder: string[] = [];

      mockRunApiE2eTests.mockImplementation(async () => {
        callOrder.push('apiE2e');
        return { success: true, output: '' };
      });

      mockRunFrontendLinting.mockImplementation(() => {
        callOrder.push('linting');
        return { success: true, output: '' };
      });

      mockRunFrontendTests.mockImplementation(() => {
        callOrder.push('tests');
        return { success: true, output: '' };
      });

      mockRunPlaywrightTests.mockImplementation(() => {
        callOrder.push('playwright');
        return { success: true, output: '' };
      });

      await runFrontendChecks(projectRoot, stagedFiles);

      expect(callOrder).toEqual(['apiE2e', 'linting', 'tests', 'playwright']);
    });

    it('should work with empty project root', async () => {
      const stagedFiles = createStagedFiles(['src/component.tsx']);

      const result = await runFrontendChecks('', stagedFiles);

      expect(result.failed).toBe(false);
      expect(mockRunApiE2eTests).toHaveBeenCalledWith('');
      expect(mockRunFrontendLinting).toHaveBeenCalledWith('');
    });
  });
});