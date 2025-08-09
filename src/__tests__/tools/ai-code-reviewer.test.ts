import { shouldBlockCommit, formatResults, getConfig } from '../../tools/ai-code-reviewer';
import type { ReviewItem, FileReviewResult } from '../../tools/ai-code-reviewer.types';

// Mock console.log to prevent output during tests
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('AI Code Reviewer', () => {
  describe('shouldBlockCommit', () => {
    it('should block on medium severity when configured for medium', () => {
      const reviews: ReviewItem[] = [
        {
          line: 10,
          severity: 'medium',
          category: 'security',
          message: 'Potential SQL injection vulnerability',
        },
        {
          line: 20,
          severity: 'low',
          category: 'style',
          message: 'Consider using const instead of let',
        },
      ];

      const result = shouldBlockCommit(reviews);
      expect(result).toBe(true); // Should block because of medium severity issue
    });

    it('should not block on low severity when configured for medium', () => {
      const reviews: ReviewItem[] = [
        {
          line: 10,
          severity: 'low',
          category: 'style',
          message: 'Consider using const instead of let',
        },
        {
          line: 20,
          severity: 'info',
          category: 'best-practice',
          message: 'Consider adding JSDoc comments',
        },
      ];

      const result = shouldBlockCommit(reviews);
      expect(result).toBe(false); // Should not block, only low/info issues
    });

    it('should block on high severity when configured for medium', () => {
      const reviews: ReviewItem[] = [
        {
          line: 10,
          severity: 'high',
          category: 'security',
          message: 'Hardcoded API key detected',
        },
      ];

      const result = shouldBlockCommit(reviews);
      expect(result).toBe(true); // Should block because high > medium
    });

    it('should block on critical severity when configured for medium', () => {
      const reviews: ReviewItem[] = [
        {
          line: 5,
          severity: 'critical',
          category: 'security',
          message: 'Remote code execution vulnerability',
        },
      ];

      const result = shouldBlockCommit(reviews);
      expect(result).toBe(true); // Should block because critical > medium
    });

    it('should respect custom severity threshold', () => {
      const reviews: ReviewItem[] = [
        {
          line: 10,
          severity: 'high',
          category: 'security',
          message: 'Security issue',
        },
        {
          line: 20,
          severity: 'medium',
          category: 'performance',
          message: 'Performance issue',
        },
      ];

      // Test with 'high' threshold - should only block on high/critical
      const resultHigh = shouldBlockCommit(reviews, 'high');
      expect(resultHigh).toBe(true); // Blocks because of high severity

      // Test with 'critical' threshold - should only block on critical
      const resultCritical = shouldBlockCommit(reviews, 'critical');
      expect(resultCritical).toBe(false); // Doesn't block, no critical issues
    });

    it('should handle empty reviews', () => {
      const reviews: ReviewItem[] = [];
      const result = shouldBlockCommit(reviews);
      expect(result).toBe(false); // No issues, no blocking
    });
  });

  describe('formatResults', () => {
    it('should correctly format results and identify blocking status', () => {
      const fileResults: FileReviewResult[] = [
        {
          file: 'src/index.ts',
          reviews: [
            {
              line: 10,
              severity: 'medium',
              category: 'security',
              message: 'Potential XSS vulnerability',
            },
            {
              line: 20,
              severity: 'low',
              category: 'style',
              message: 'Inconsistent naming',
            },
          ],
          summary: 'Found security concerns',
        },
        {
          file: 'src/utils.ts',
          reviews: [
            {
              line: 5,
              severity: 'info',
              category: 'best-practice',
              message: 'Consider using TypeScript strict mode',
            },
          ],
          summary: 'Minor improvements suggested',
        },
      ];

      const formatted = formatResults(fileResults);

      expect(formatted.summary.totalFiles).toBe(2);
      expect(formatted.summary.totalIssues).toBe(3);
      expect(formatted.summary.bySeverity).toEqual({
        medium: 1,
        low: 1,
        info: 1,
      });
      expect(formatted.blocked).toBe(true); // Should block due to medium severity issue
      expect(formatted.allReviews).toHaveLength(3);
    });

    it('should not block when only low/info issues exist', () => {
      const fileResults: FileReviewResult[] = [
        {
          file: 'src/index.ts',
          reviews: [
            {
              line: 10,
              severity: 'low',
              category: 'style',
              message: 'Consider refactoring',
            },
            {
              line: 20,
              severity: 'info',
              category: 'best-practice',
              message: 'Add documentation',
            },
          ],
          summary: 'Minor issues found',
        },
      ];

      const formatted = formatResults(fileResults);

      expect(formatted.blocked).toBe(false); // Should not block
      expect(formatted.summary.bySeverity).toEqual({
        low: 1,
        info: 1,
      });
    });
  });

  describe('Config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should default to medium severity blocking', () => {
      delete process.env.AI_REVIEWER_MAX_SEVERITY;
      const config = getConfig();
      expect(config.maxSeverityToBlock).toBe('medium');
    });

    it('should respect environment variable for severity', () => {
      process.env.AI_REVIEWER_MAX_SEVERITY = 'high';
      const config = getConfig();
      expect(config.maxSeverityToBlock).toBe('high');
    });

    it('should be enabled by default', () => {
      delete process.env.AI_REVIEWER_ENABLED;
      const config = getConfig();
      expect(config.enabled).toBe(true);
    });

    it('should respect disabled state', () => {
      process.env.AI_REVIEWER_ENABLED = 'false';
      const config = getConfig();
      expect(config.enabled).toBe(false);
    });
  });
});
