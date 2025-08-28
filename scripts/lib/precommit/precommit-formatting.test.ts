/**
 * Tests for precommit-formatting.ts
 */

import { runFormattingSteps } from './precommit-formatting';
import { runPrettierFormat, runEslintFix } from '../formatting/format-runners';

// Mock the format runners
jest.mock('../formatting/format-runners');

const mockRunPrettierFormat = runPrettierFormat as jest.MockedFunction<typeof runPrettierFormat>;
const mockRunEslintFix = runEslintFix as jest.MockedFunction<typeof runEslintFix>;

describe('precommit-formatting', () => {
  let consoleSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    mockRunPrettierFormat.mockReset();
    mockRunEslintFix.mockReset();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('runFormattingSteps', () => {
    const projectRoot = '/test/project';
    const stagedFiles = ['src/file1.ts', 'src/file2.js'];

    it('should run both formatting steps successfully', () => {
      mockRunPrettierFormat.mockReturnValue({
        success: true,
        output: 'Prettier formatting completed'
      });
      mockRunEslintFix.mockReturnValue({
        success: true,
        output: 'ESLint auto-fix completed'
      });

      runFormattingSteps(projectRoot, stagedFiles);

      expect(consoleSpy).toHaveBeenCalledWith('🎨 Auto-formatting staged files...');
      expect(mockRunPrettierFormat).toHaveBeenCalledWith(projectRoot, stagedFiles);
      expect(mockRunEslintFix).toHaveBeenCalledWith(projectRoot, stagedFiles);
      
      // Should not warn when both succeed
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should warn when prettier formatting fails', () => {
      mockRunPrettierFormat.mockReturnValue({
        success: false,
        output: 'Prettier failed to format files'
      });
      mockRunEslintFix.mockReturnValue({
        success: true,
        output: 'ESLint auto-fix completed'
      });

      runFormattingSteps(projectRoot, stagedFiles);

      expect(consoleSpy).toHaveBeenCalledWith('🎨 Auto-formatting staged files...');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Prettier formatting failed: Prettier failed to format files');
      expect(mockRunPrettierFormat).toHaveBeenCalledWith(projectRoot, stagedFiles);
      expect(mockRunEslintFix).toHaveBeenCalledWith(projectRoot, stagedFiles);
    });

    it('should warn when ESLint auto-fix fails', () => {
      mockRunPrettierFormat.mockReturnValue({
        success: true,
        output: 'Prettier formatting completed'
      });
      mockRunEslintFix.mockReturnValue({
        success: false,
        output: 'ESLint auto-fix encountered errors'
      });

      runFormattingSteps(projectRoot, stagedFiles);

      expect(consoleSpy).toHaveBeenCalledWith('🎨 Auto-formatting staged files...');
      expect(consoleWarnSpy).toHaveBeenCalledWith('ESLint auto-fix failed: ESLint auto-fix encountered errors');
      expect(mockRunPrettierFormat).toHaveBeenCalledWith(projectRoot, stagedFiles);
      expect(mockRunEslintFix).toHaveBeenCalledWith(projectRoot, stagedFiles);
    });

    it('should warn for both failures when both formatting steps fail', () => {
      mockRunPrettierFormat.mockReturnValue({
        success: false,
        output: 'Prettier configuration error'
      });
      mockRunEslintFix.mockReturnValue({
        success: false,
        output: 'ESLint configuration error'
      });

      runFormattingSteps(projectRoot, stagedFiles);

      expect(consoleSpy).toHaveBeenCalledWith('🎨 Auto-formatting staged files...');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Prettier formatting failed: Prettier configuration error');
      expect(consoleWarnSpy).toHaveBeenCalledWith('ESLint auto-fix failed: ESLint configuration error');
      expect(mockRunPrettierFormat).toHaveBeenCalledWith(projectRoot, stagedFiles);
      expect(mockRunEslintFix).toHaveBeenCalledWith(projectRoot, stagedFiles);
    });

    it('should handle empty staged files array', () => {
      const emptyFiles: string[] = [];
      
      mockRunPrettierFormat.mockReturnValue({
        success: true,
        output: 'No files to format'
      });
      mockRunEslintFix.mockReturnValue({
        success: true,
        output: 'No files to fix'
      });

      runFormattingSteps(projectRoot, emptyFiles);

      expect(consoleSpy).toHaveBeenCalledWith('🎨 Auto-formatting staged files...');
      expect(mockRunPrettierFormat).toHaveBeenCalledWith(projectRoot, emptyFiles);
      expect(mockRunEslintFix).toHaveBeenCalledWith(projectRoot, emptyFiles);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle different project roots correctly', () => {
      const customRoot = '/custom/project/path';
      
      mockRunPrettierFormat.mockReturnValue({
        success: true,
        output: 'Success'
      });
      mockRunEslintFix.mockReturnValue({
        success: true,
        output: 'Success'
      });

      runFormattingSteps(customRoot, stagedFiles);

      expect(mockRunPrettierFormat).toHaveBeenCalledWith(customRoot, stagedFiles);
      expect(mockRunEslintFix).toHaveBeenCalledWith(customRoot, stagedFiles);
    });

    it('should handle formatting results with empty output messages', () => {
      mockRunPrettierFormat.mockReturnValue({
        success: false,
        output: ''
      });
      mockRunEslintFix.mockReturnValue({
        success: false,
        output: ''
      });

      runFormattingSteps(projectRoot, stagedFiles);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Prettier formatting failed: ');
      expect(consoleWarnSpy).toHaveBeenCalledWith('ESLint auto-fix failed: ');
    });

    it('should always call both formatting functions regardless of first result', () => {
      // Even if prettier fails, eslint should still run
      mockRunPrettierFormat.mockReturnValue({
        success: false,
        output: 'Prettier failed'
      });
      mockRunEslintFix.mockReturnValue({
        success: true,
        output: 'ESLint succeeded'
      });

      runFormattingSteps(projectRoot, stagedFiles);

      expect(mockRunPrettierFormat).toHaveBeenCalledTimes(1);
      expect(mockRunEslintFix).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Prettier formatting failed: Prettier failed');
    });
  });
});