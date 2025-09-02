import { processReviewResults, processStructuredReviewResults } from './severity-analyzer';
import { ReviewComments } from '../utils/types';
import * as severityCore from './severity-analysis-core';

// Mock the severity-analysis-core module
jest.mock('./severity-analysis-core', () => ({
  shouldBlockClaude: jest.fn(),
  createBlockMessage: jest.fn(),
}));

const mockShouldBlockClaude = severityCore.shouldBlockClaude as jest.MockedFunction<typeof severityCore.shouldBlockClaude>;
const mockCreateBlockMessage = severityCore.createBlockMessage as jest.MockedFunction<typeof severityCore.createBlockMessage>;

describe('severity-analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processReviewResults', () => {
    it('should return block decision when shouldBlockClaude returns true', () => {
      const reviewComments = 'Critical security vulnerability found';
      mockShouldBlockClaude.mockReturnValue(true);
      mockCreateBlockMessage.mockReturnValue('Blocking issue detected');

      const result = processReviewResults(reviewComments);

      expect(result.decision).toBe('block');
      expect(result.reason).toBe('Blocking issue detected');
      expect(mockShouldBlockClaude).toHaveBeenCalledWith(reviewComments);
      expect(mockCreateBlockMessage).toHaveBeenCalledWith(reviewComments);
    });

    it('should return approve decision with feedback when shouldBlockClaude returns false and has comments', () => {
      const reviewComments = 'Minor style issues found';
      mockShouldBlockClaude.mockReturnValue(false);

      const result = processReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Code review completed with minor recommendations');
      expect(result.feedback).toContain(reviewComments);
      expect(result.feedback).toContain('code-review-comments.tmp');
    });

    it('should return approve decision with no issues message when review comments are empty', () => {
      const reviewComments = '';
      mockShouldBlockClaude.mockReturnValue(false);

      const result = processReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Code review completed - no issues detected');
      expect(result.feedback).toContain('code-review-comments.tmp');
    });

    it('should return approve decision with no issues message when review comments are whitespace only', () => {
      const reviewComments = '   \n\t  ';
      mockShouldBlockClaude.mockReturnValue(false);

      const result = processReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Code review completed - no issues detected');
    });
  });

  describe('processStructuredReviewResults', () => {
    it('should return block decision when structured data has blocking issues with string comments', () => {
      const reviewComments: ReviewComments = {
        'stage1': 'Critical error found',
        'stage2': 'Minor issue'
      };
      
      mockShouldBlockClaude.mockImplementation((comment: string) => 
        comment === 'Critical error found'
      );

      const result = processStructuredReviewResults(reviewComments);

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Code review found blocking issues in: stage1');
    });

    it('should return block decision when structured data has blocking issues in file analysis', () => {
      const reviewComments: ReviewComments = {
        'lint': {
          files: [
            {
              file: 'test.ts',
              result: {
                severity: 'high' as const,
                hasBlockingIssues: true,
                issues: ['Critical syntax error'],
                suggestions: [],
                summary: 'Critical issues found',
                confidence: 0.9
              }
            }
          ],
          summary: {
            totalFiles: 1,
            highSeverity: 1,
            mediumSeverity: 0,
            totalIssues: 1
          }
        }
      };

      mockShouldBlockClaude.mockReturnValue(false);

      const result = processStructuredReviewResults(reviewComments);

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Code review found blocking issues in: lint');
    });

    it('should return block decision when multiple stages have blocking issues', () => {
      const reviewComments: ReviewComments = {
        'stage1': 'Critical error',
        'stage2': {
          files: [
            {
              file: 'test.ts',
              result: {
                severity: 'high' as const,
                hasBlockingIssues: true,
                issues: ['Critical issue'],
                suggestions: [],
                summary: 'Critical issues found',
                confidence: 0.9
              }
            }
          ],
          summary: {
            totalFiles: 1,
            highSeverity: 1,
            mediumSeverity: 0,
            totalIssues: 1
          }
        }
      };

      mockShouldBlockClaude.mockImplementation((comment: string) => 
        comment === 'Critical error'
      );

      const result = processStructuredReviewResults(reviewComments);

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Code review found blocking issues in: stage1, stage2');
    });

    it('should return approve decision when no blocking issues exist with stage names', () => {
      const reviewComments: ReviewComments = {
        'lint': 'Minor style issues',
        'test': {
          files: [
            {
              file: 'test.ts',
              result: {
                severity: 'low' as const,
                hasBlockingIssues: false,
                issues: ['Minor issue'],
                suggestions: ['Consider improvement'],
                summary: 'Minor issues found',
                confidence: 0.8
              }
            }
          ],
          summary: {
            totalFiles: 1,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 1
          }
        }
      };

      mockShouldBlockClaude.mockReturnValue(false);

      const result = processStructuredReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Code review completed for stages: lint, test');
      expect(result.feedback).toContain('code-review-comments.tmp');
      expect(result.feedback).toContain('All checks passed with minor recommendations');
    });

    it('should return approve decision with no issues message when no stages exist', () => {
      const reviewComments: ReviewComments = {};

      const result = processStructuredReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Code review completed - no issues detected');
      expect(result.feedback).toContain('code-review-comments.tmp');
    });

    it('should handle structured data with non-blocking file issues', () => {
      const reviewComments: ReviewComments = {
        'typecheck': {
          files: [
            {
              file: 'src/test.ts',
              result: {
                severity: 'low' as const,
                hasBlockingIssues: false,
                issues: ['Minor type annotation suggestion'],
                suggestions: ['Add type annotation'],
                summary: 'Type improvements suggested',
                confidence: 0.8
              }
            }
          ],
          summary: {
            totalFiles: 1,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 1
          }
        }
      };

      mockShouldBlockClaude.mockReturnValue(false);

      const result = processStructuredReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Code review completed for stages: typecheck');
    });

    it('should handle mixed string and structured comments', () => {
      const reviewComments: ReviewComments = {
        'stage1': 'String comment without blocking issues',
        'stage2': {
          files: [
            {
              file: 'test.ts',
              result: {
                severity: 'low' as const,
                hasBlockingIssues: false,
                issues: ['Non-blocking suggestion'],
                suggestions: [],
                summary: 'Minor suggestions',
                confidence: 0.7
              }
            }
          ],
          summary: {
            totalFiles: 1,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 1
          }
        }
      };

      mockShouldBlockClaude.mockReturnValue(false);

      const result = processStructuredReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Code review completed for stages: stage1, stage2');
    });

    it('should handle files array that is undefined', () => {
      const reviewComments: ReviewComments = {
        'stage1': {
          files: [],
          summary: {
            totalFiles: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            totalIssues: 0
          }
        }
      };

      mockShouldBlockClaude.mockReturnValue(false);

      const result = processStructuredReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('Code review completed for stages: stage1');
    });
  });
});