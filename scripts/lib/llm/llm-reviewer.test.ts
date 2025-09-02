/**
 * Tests for llm-reviewer.ts
 */

import { LLMReviewer } from './llm-reviewer';
import { LLMReviewerCore } from './llm-reviewer-core';
import { generateReport, generateStructuredData, shouldBlockCommit } from './llm-reviewer-utils';
import { getChangedFiles, createEmptyResult, createErrorResult } from './llm-reviewer-helpers';
import { processFiles } from './llm-reviewer-processor';
import { loadProjectEnvSync } from '../utils/env-config';
import type { ReviewedFile, LLMReviewOutput } from './llm-reviewer-types';

// Mock all dependencies
jest.mock('./llm-reviewer-core');
jest.mock('./llm-reviewer-utils');
jest.mock('./llm-reviewer-helpers');
jest.mock('./llm-reviewer-processor');
jest.mock('../utils/env-config');

describe('LLMReviewer', () => {
  let reviewer: LLMReviewer;
  let mockCore: jest.Mocked<LLMReviewerCore>;

  const mockGenerateReport = generateReport as jest.MockedFunction<typeof generateReport>;
  const mockGenerateStructuredData = generateStructuredData as jest.MockedFunction<typeof generateStructuredData>;
  const mockShouldBlockCommit = shouldBlockCommit as jest.MockedFunction<typeof shouldBlockCommit>;
  const mockGetChangedFiles = getChangedFiles as jest.MockedFunction<typeof getChangedFiles>;
  const mockCreateEmptyResult = createEmptyResult as jest.MockedFunction<typeof createEmptyResult>;
  const mockCreateErrorResult = createErrorResult as jest.MockedFunction<typeof createErrorResult>;
  const mockProcessFiles = processFiles as jest.MockedFunction<typeof processFiles>;
  const mockLoadProjectEnvSync = loadProjectEnvSync as jest.MockedFunction<typeof loadProjectEnvSync>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock LLMReviewerCore
    mockCore = {
      reviewCode: jest.fn()
    } as any;
    (LLMReviewerCore as jest.MockedClass<typeof LLMReviewerCore>).mockImplementation(() => mockCore);

    // Mock loadProjectEnvSync to do nothing
    mockLoadProjectEnvSync.mockImplementation(() => ({ success: true, loaded: [] }));

    reviewer = new LLMReviewer();
  });

  describe('constructor', () => {
    it('should load environment variables during initialization', () => {
      // Constructor already called in beforeEach
      expect(mockLoadProjectEnvSync).toHaveBeenCalledWith(3);
      expect(mockLoadProjectEnvSync).toHaveBeenCalledTimes(1); // Called once: module level
    });

    it('should create LLMReviewerCore instance', () => {
      expect(LLMReviewerCore).toHaveBeenCalledTimes(1);
    });
  });

  describe('reviewCode', () => {
    const mockReviewResult = {
      severity: 'medium' as const,
      issues: ['Test issue'],
      suggestions: ['Test suggestion'],
      summary: 'Test summary',
      hasBlockingIssues: false,
      confidence: 0.8
    };

    beforeEach(() => {
      mockCore.reviewCode.mockResolvedValue(mockReviewResult);
    });

    it('should successfully review code with valid inputs', async () => {
      const result = await reviewer.reviewCode('src/test.ts', 'const x = 1;');

      expect(result).toBe(mockReviewResult);
      expect(mockCore.reviewCode).toHaveBeenCalledWith('src/test.ts', 'const x = 1;');
    });

    it('should validate filePath parameter', async () => {
      const invalidFilePaths = [
        null,
        undefined,
        '',
        123,
        [],
        {}
      ];

      for (const invalidPath of invalidFilePaths) {
        await expect(reviewer.reviewCode(invalidPath as any, 'code')).rejects.toThrow(
          'Invalid filePath: must be non-empty string'
        );
      }

      expect(mockCore.reviewCode).not.toHaveBeenCalled();
    });

    it('should validate content parameter', async () => {
      const invalidContents = [
        null,
        undefined,
        123,
        [],
        {}
      ];

      for (const invalidContent of invalidContents) {
        await expect(reviewer.reviewCode('test.ts', invalidContent as any)).rejects.toThrow(
          'Invalid content: must be string'
        );
      }

      expect(mockCore.reviewCode).not.toHaveBeenCalled();
    });

    it('should accept empty string as valid content', async () => {
      await reviewer.reviewCode('test.ts', '');

      expect(mockCore.reviewCode).toHaveBeenCalledWith('test.ts', '');
    });

    it('should forward core review errors', async () => {
      const coreError = new Error('OpenAI API failed');
      mockCore.reviewCode.mockRejectedValue(coreError);

      await expect(reviewer.reviewCode('test.ts', 'code')).rejects.toThrow('OpenAI API failed');
    });

    it('should handle valid file paths with various formats', async () => {
      const validPaths = [
        'file.ts',
        'src/component.tsx',
        'deeply/nested/path/to/file.js',
        './relative/path.ts',
        '../parent/file.ts',
        'file-with-dashes.ts',
        'file_with_underscores.ts',
        'file.with.dots.ts'
      ];

      for (const path of validPaths) {
        await reviewer.reviewCode(path, 'test code');
        expect(mockCore.reviewCode).toHaveBeenCalledWith(path, 'test code');
      }
    });
  });

  describe('reviewChangedFiles', () => {
    const mockReviewedFiles: ReviewedFile[] = [
      {
        file: 'src/test1.ts',
        result: {
          severity: 'medium',
          issues: ['Issue 1'],
          suggestions: ['Suggestion 1'],
          summary: 'Summary 1',
          hasBlockingIssues: false,
          confidence: 0.8
        }
      },
      {
        file: 'src/test2.ts',
        result: {
          severity: 'high',
          issues: ['Issue 2'],
          suggestions: ['Suggestion 2'],
          summary: 'Summary 2',
          hasBlockingIssues: true,
          confidence: 0.9
        }
      }
    ];

    const mockStructuredData = {
      files: mockReviewedFiles,
      summary: {
        totalFiles: 2,
        highSeverity: 1,
        mediumSeverity: 1,
        totalIssues: 2
      }
    };

    const mockTextReport = 'Mock text report';

    beforeEach(() => {
      mockGetChangedFiles.mockReturnValue(['src/test1.ts', 'src/test2.ts']);
      mockProcessFiles.mockResolvedValue(mockReviewedFiles);
      mockGenerateStructuredData.mockReturnValue(mockStructuredData);
      mockGenerateReport.mockReturnValue(mockTextReport);
    });

    it('should successfully review changed files', async () => {
      const result = await reviewer.reviewChangedFiles('/project/root');

      expect(result).toEqual({
        structuredData: mockStructuredData,
        textReport: mockTextReport
      });

      expect(mockGetChangedFiles).toHaveBeenCalledWith('/project/root');
      expect(mockProcessFiles).toHaveBeenCalledWith(mockCore, '/project/root', ['src/test1.ts', 'src/test2.ts']);
      expect(mockGenerateStructuredData).toHaveBeenCalledWith(mockReviewedFiles);
      expect(mockGenerateReport).toHaveBeenCalledWith(mockReviewedFiles);
    });

    it('should validate projectRoot parameter', async () => {
      const invalidRoots = [
        null,
        undefined,
        '',
        123,
        [],
        {}
      ];

      for (const invalidRoot of invalidRoots) {
        await expect(reviewer.reviewChangedFiles(invalidRoot as any)).rejects.toThrow(
          'Invalid projectRoot: must be non-empty string'
        );
      }

      expect(mockGetChangedFiles).not.toHaveBeenCalled();
    });

    it('should return empty result when no changed files found', async () => {
      const mockEmptyResult: LLMReviewOutput = {
        structuredData: {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        },
        textReport: 'No files to review'
      };

      mockGetChangedFiles.mockReturnValue([]);
      mockCreateEmptyResult.mockReturnValue(mockEmptyResult);

      const result = await reviewer.reviewChangedFiles('/project/root');

      expect(result).toBe(mockEmptyResult);
      expect(mockCreateEmptyResult).toHaveBeenCalled();
      expect(mockProcessFiles).not.toHaveBeenCalled();
      expect(mockGenerateStructuredData).not.toHaveBeenCalled();
      expect(mockGenerateReport).not.toHaveBeenCalled();
    });

    it('should handle errors during file processing', async () => {
      const processingError = new Error('Failed to process files');
      const mockErrorResult: LLMReviewOutput = {
        structuredData: {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        },
        textReport: 'Review failed: Failed to process files'
      };

      mockGetChangedFiles.mockReturnValue(['src/test.ts']);
      mockProcessFiles.mockRejectedValue(processingError);
      mockCreateErrorResult.mockReturnValue(mockErrorResult);

      const result = await reviewer.reviewChangedFiles('/project/root');

      expect(result).toBe(mockErrorResult);
      expect(mockCreateErrorResult).toHaveBeenCalledWith(processingError);
    });

    it('should handle errors during changed files retrieval', async () => {
      const getFilesError = new Error('Git command failed');
      const mockErrorResult: LLMReviewOutput = {
        structuredData: {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        },
        textReport: 'Review failed: Git command failed'
      };

      mockGetChangedFiles.mockImplementation(() => {
        throw getFilesError;
      });
      mockCreateErrorResult.mockReturnValue(mockErrorResult);

      const result = await reviewer.reviewChangedFiles('/project/root');

      expect(result).toBe(mockErrorResult);
      expect(mockCreateErrorResult).toHaveBeenCalledWith(getFilesError);
    });

    it('should handle errors during report generation', async () => {
      const reportError = new Error('Report generation failed');
      const mockErrorResult: LLMReviewOutput = {
        structuredData: {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        },
        textReport: 'Review failed: Report generation failed'
      };

      mockGetChangedFiles.mockReturnValue(['src/test.ts']);
      mockProcessFiles.mockResolvedValue(mockReviewedFiles);
      mockGenerateStructuredData.mockImplementation(() => {
        throw reportError;
      });
      mockCreateErrorResult.mockReturnValue(mockErrorResult);

      const result = await reviewer.reviewChangedFiles('/project/root');

      expect(result).toBe(mockErrorResult);
      expect(mockCreateErrorResult).toHaveBeenCalledWith(reportError);
    });

    it('should handle non-Error exceptions', async () => {
      const stringError = 'String error';
      const mockErrorResult: LLMReviewOutput = {
        structuredData: {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        },
        textReport: 'Review failed: Unknown error'
      };

      mockGetChangedFiles.mockImplementation(() => {
        throw stringError;
      });
      mockCreateErrorResult.mockReturnValue(mockErrorResult);

      const result = await reviewer.reviewChangedFiles('/project/root');

      expect(result).toBe(mockErrorResult);
      expect(mockCreateErrorResult).toHaveBeenCalledWith(stringError);
    });

    it('should work with absolute and relative project paths', async () => {
      const testPaths = [
        '/absolute/path/to/project',
        './relative/path',
        '../parent/directory',
        '~/home/directory'
      ];

      for (const projectPath of testPaths) {
        await reviewer.reviewChangedFiles(projectPath);
        expect(mockGetChangedFiles).toHaveBeenCalledWith(projectPath);
      }
    });

    it('should pass through empty reviews array correctly', async () => {
      mockGetChangedFiles.mockReturnValue(['src/test.ts']);
      mockProcessFiles.mockResolvedValue([]);
      mockGenerateStructuredData.mockReturnValue({
        files: [],
        summary: { totalFiles: 0, highSeverity: 0, mediumSeverity: 0, totalIssues: 0 }
      });
      mockGenerateReport.mockReturnValue('No issues found');

      const result = await reviewer.reviewChangedFiles('/project/root');

      expect(mockGenerateStructuredData).toHaveBeenCalledWith([]);
      expect(mockGenerateReport).toHaveBeenCalledWith([]);
      expect(result.structuredData.files).toEqual([]);
    });
  });

  describe('shouldBlockCommit', () => {
    const mockReviews: ReviewedFile[] = [
      {
        file: 'src/test.ts',
        result: {
          severity: 'medium',
          issues: ['Issue'],
          suggestions: ['Suggestion'],
          summary: 'Summary',
          hasBlockingIssues: true,
          confidence: 0.8
        }
      }
    ];

    it('should delegate to shouldBlockCommit utility function', () => {
      mockShouldBlockCommit.mockReturnValue(true);

      const result = reviewer.shouldBlockCommit(mockReviews);

      expect(result).toBe(true);
      expect(mockShouldBlockCommit).toHaveBeenCalledWith(mockReviews);
    });

    it('should return false when utility function returns false', () => {
      mockShouldBlockCommit.mockReturnValue(false);

      const result = reviewer.shouldBlockCommit(mockReviews);

      expect(result).toBe(false);
      expect(mockShouldBlockCommit).toHaveBeenCalledWith(mockReviews);
    });

    it('should handle empty reviews array', () => {
      mockShouldBlockCommit.mockReturnValue(false);

      const result = reviewer.shouldBlockCommit([]);

      expect(result).toBe(false);
      expect(mockShouldBlockCommit).toHaveBeenCalledWith([]);
    });

    it('should pass through the exact reviews array', () => {
      const exactReviews = mockReviews;
      mockShouldBlockCommit.mockReturnValue(true);

      reviewer.shouldBlockCommit(exactReviews);

      expect(mockShouldBlockCommit).toHaveBeenCalledWith(exactReviews);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow with multiple files', async () => {
      const changedFiles = ['src/auth.ts', 'src/utils.ts', 'src/constants.ts'];
      const reviewedFiles: ReviewedFile[] = [
        {
          file: 'src/auth.ts',
          result: {
            severity: 'high',
            issues: ['Security vulnerability'],
            suggestions: ['Fix auth issue'],
            summary: 'Critical security problem',
            hasBlockingIssues: true,
            confidence: 0.95
          }
        },
        {
          file: 'src/utils.ts',
          result: {
            severity: 'medium',
            issues: ['Performance issue'],
            suggestions: ['Optimize function'],
            summary: 'Minor performance concern',
            hasBlockingIssues: false,
            confidence: 0.75
          }
        }
      ];

      mockGetChangedFiles.mockReturnValue(changedFiles);
      mockProcessFiles.mockResolvedValue(reviewedFiles);
      mockGenerateStructuredData.mockReturnValue({
        files: reviewedFiles,
        summary: { totalFiles: 2, highSeverity: 1, mediumSeverity: 1, totalIssues: 2 }
      });
      mockGenerateReport.mockReturnValue('Detailed report with high and medium issues');

      const result = await reviewer.reviewChangedFiles('/project');

      expect(result.structuredData.summary.totalFiles).toBe(2);
      expect(result.structuredData.summary.highSeverity).toBe(1);
      expect(result.textReport).toBe('Detailed report with high and medium issues');
    });

    it('should maintain proper error boundaries', async () => {
      // Test that errors in one part don't affect others
      mockGetChangedFiles.mockReturnValue(['src/test.ts']);
      mockProcessFiles.mockResolvedValue([]);
      mockGenerateStructuredData.mockImplementation(() => {
        throw new Error('Structured data failed');
      });
      
      const mockErrorResult: LLMReviewOutput = {
        structuredData: { files: [], summary: { totalFiles: 0, highSeverity: 0, mediumSeverity: 0, totalIssues: 0 } },
        textReport: 'Error occurred'
      };
      mockCreateErrorResult.mockReturnValue(mockErrorResult);

      const result = await reviewer.reviewChangedFiles('/project');

      expect(result).toBe(mockErrorResult);
      expect(mockCreateErrorResult).toHaveBeenCalled();
    });
  });
});