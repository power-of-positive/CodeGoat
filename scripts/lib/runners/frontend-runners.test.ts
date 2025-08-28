/**
 * Tests for frontend-runners.ts
 */


import { runFrontendLinting, runFrontendTests, runPlaywrightTests } from './frontend-runners';
import { execCommand } from '../utils/command-utils';
import { validateDirectoryExists } from '../utils/validation-utils';

// Mock external dependencies
jest.mock('../utils/command-utils');
jest.mock('../utils/validation-utils');

describe('frontend-runners', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Mock process.env - Jest handles process.env automatically, no need to mock

    // Mock validation-utils - by default, don't throw
    (validateDirectoryExists as jest.Mock).mockImplementation(() => {
      // Default: do nothing (validation passes)
    });
  });

  describe('runFrontendLinting', () => {
    it('should return CheckResult with correct structure', () => {
      (execCommand as jest.Mock).mockReturnValue({
        success: true,
        output: 'Linting passed',
      });

      const result = runFrontendLinting('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
    });

    it('should handle invalid project root', () => {
      (validateDirectoryExists as jest.Mock).mockImplementation((dirPath: string) => {
        if (
          !dirPath ||
          dirPath === '/frontend' ||
          dirPath === 'frontend' ||
          dirPath.includes('../')
        ) {
          throw new Error('Directory does not exist');
        }
      });

      expect(() => runFrontendLinting('')).toThrow('Directory does not exist');
      expect(() => runFrontendLinting('../dangerous')).toThrow('Directory does not exist');
    });

    it('should call execCommand with correct parameters', () => {
      (execCommand as jest.Mock)
        .mockReturnValueOnce({ success: true, output: 'lint success' })
        .mockReturnValueOnce({ success: true, output: 'format success' });

      runFrontendLinting('/mock/project');

      expect(execCommand).toHaveBeenCalledWith('npm run lint', '/mock/project/frontend');
      expect(execCommand).toHaveBeenCalledWith('npm run format:check', '/mock/project/frontend');
    });
  });

  describe('runFrontendTests', () => {
    it('should return CheckResult with correct structure', () => {
      (execCommand as jest.Mock).mockReturnValue({
        success: true,
        output: 'Tests passed',
      });

      const result = runFrontendTests('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
    });

    it('should handle invalid project root', () => {
      (validateDirectoryExists as jest.Mock).mockImplementation((dirPath: string) => {
        if (!dirPath || dirPath === '/frontend' || dirPath === 'frontend') {
          throw new Error('Directory does not exist');
        }
      });

      expect(() => runFrontendTests('')).toThrow('Directory does not exist');
    });

    it('should call execCommand with correct parameters', () => {
      (execCommand as jest.Mock).mockReturnValue({
        success: true,
        output: 'test success',
      });

      runFrontendTests('/mock/project');

      expect(execCommand).toHaveBeenCalledWith('npm run test:run', '/mock/project/frontend');
    });
  });

  describe('runPlaywrightTests', () => {
    it('should skip tests when no display server', () => {
      delete process.env.DISPLAY;
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;

      const result = runPlaywrightTests('/mock/project');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Skipped - headless environment');
    });

    it('should run tests when DISPLAY is set', () => {
      process.env.DISPLAY = ':0';
      (execCommand as jest.Mock).mockReturnValue({
        success: true,
        output: 'Playwright tests passed',
      });

      const result = runPlaywrightTests('/mock/project');

      expect(execCommand).toHaveBeenCalledWith('npm run test:playwright', '/mock/project');
      expect(result.success).toBe(true);
    });

    it('should run tests when CI is set', () => {
      delete process.env.DISPLAY;
      process.env.CI = 'true';
      (execCommand as jest.Mock).mockReturnValue({
        success: true,
        output: 'Playwright tests passed',
      });

      const result = runPlaywrightTests('/mock/project');

      expect(execCommand).toHaveBeenCalledWith('npm run test:playwright', '/mock/project');
      expect(result.success).toBe(true);
    });
  });
});
