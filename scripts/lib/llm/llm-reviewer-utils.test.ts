/**
 * Tests for llm-reviewer-utils.ts
 */

import {
  generateReport,
  generateStructuredData,
  shouldBlockCommit
} from './llm-reviewer-utils';
import type { ReviewedFile, ReviewResult } from './llm-reviewer-types';

describe('llm-reviewer-utils', () => {
  const createMockReviewResult = (overrides: Partial<ReviewResult> = {}): ReviewResult => ({
    severity: 'low',
    issues: [],
    suggestions: [],
    summary: 'No issues found',
    hasBlockingIssues: false,
    confidence: 0.8,
    ...overrides
  });

  const createMockReviewedFile = (file: string, overrides: Partial<ReviewResult> = {}): ReviewedFile => ({
    file,
    result: createMockReviewResult(overrides)
  });

  describe('generateReport', () => {
    it('should return "No files could be reviewed" when reviews array is empty', () => {
      const result = generateReport([]);

      expect(result).toBe('No files could be reviewed');
    });

    it('should generate basic report with no issues', () => {
      const reviews = [
        { file: 'src/utils.ts', result: createMockReviewResult() }
      ];

      const result = generateReport(reviews);

      expect(result).toContain('# LLM Code Review Results');
      expect(result).toContain('## Summary');
      expect(result).toContain('Files reviewed: 1');
      expect(result).toContain('High severity: 0');
      expect(result).toContain('Medium severity: 0');
      expect(result).toContain('Total issues: 0');
      expect(result).toContain('**Recommendation:** Code quality looks good!');
    });

    it('should generate report with high severity issues', () => {
      const reviews = [
        {
          file: 'src/security.ts',
          result: createMockReviewResult({
            severity: 'high',
            issues: ['SQL injection vulnerability', 'Hardcoded credentials'],
            suggestions: ['Use parameterized queries', 'Store credentials in environment variables'],
            summary: 'Critical security issues found'
          })
        },
        {
          file: 'src/utils.ts',
          result: createMockReviewResult({
            severity: 'high',
            issues: ['Memory leak in loop'],
            suggestions: ['Fix resource cleanup'],
            summary: 'Performance issue detected'
          })
        }
      ];

      const result = generateReport(reviews);

      expect(result).toContain('## 🚨 HIGH SEVERITY ISSUES (2)');
      expect(result).toContain('### src/security.ts');
      expect(result).toContain('**Issues:** SQL injection vulnerability, Hardcoded credentials');
      expect(result).toContain('**Suggestions:** Use parameterized queries, Store credentials in environment variables');
      expect(result).toContain('**Summary:** Critical security issues found');
      expect(result).toContain('### src/utils.ts');
      expect(result).toContain('**Issues:** Memory leak in loop');
      expect(result).toContain('**Suggestions:** Fix resource cleanup');
      expect(result).toContain('**Summary:** Performance issue detected');
      expect(result).toContain('High severity: 2');
      expect(result).toContain('Total issues: 3');
      expect(result).toContain('**Recommendation:** Fix high severity issues before committing.');
    });

    it('should generate report with medium severity issues', () => {
      const reviews = [
        {
          file: 'src/component.tsx',
          result: createMockReviewResult({
            severity: 'medium',
            issues: ['Missing prop validation', 'Unused import'],
            suggestions: ['Add PropTypes', 'Remove unused imports']
          })
        }
      ];

      const result = generateReport(reviews);

      expect(result).toContain('## ⚠️ MEDIUM SEVERITY ISSUES (1)');
      expect(result).toContain('### src/component.tsx');
      expect(result).toContain('**Issues:** Missing prop validation, Unused import');
      expect(result).toContain('**Suggestions:** Add PropTypes, Remove unused imports');
      expect(result).not.toContain('**Summary:**'); // Medium issues don't include summary by default
      expect(result).toContain('Medium severity: 1');
      expect(result).toContain('Total issues: 2');
      expect(result).toContain('**Recommendation:** Consider addressing medium severity issues.');
    });

    it('should generate report with mixed severity levels', () => {
      const reviews = [
        {
          file: 'src/auth.ts',
          result: createMockReviewResult({
            severity: 'high',
            issues: ['Weak password hashing'],
            suggestions: ['Use bcrypt with proper salt'],
            summary: 'Security vulnerability detected'
          })
        },
        {
          file: 'src/validation.ts',
          result: createMockReviewResult({
            severity: 'medium',
            issues: ['Missing error handling'],
            suggestions: ['Add try-catch blocks']
          })
        },
        {
          file: 'src/constants.ts',
          result: createMockReviewResult({
            severity: 'low',
            issues: [],
            suggestions: ['Consider using enum instead of constants']
          })
        }
      ];

      const result = generateReport(reviews);

      expect(result).toContain('## 🚨 HIGH SEVERITY ISSUES (1)');
      expect(result).toContain('## ⚠️ MEDIUM SEVERITY ISSUES (1)');
      expect(result).toContain('Files reviewed: 3');
      expect(result).toContain('High severity: 1');
      expect(result).toContain('Medium severity: 1');
      expect(result).toContain('Total issues: 2'); // low severity has no issues
      expect(result).toContain('**Recommendation:** Fix high severity issues before committing.');
    });

    it('should handle files with empty issues and suggestions arrays', () => {
      const reviews = [
        {
          file: 'src/clean.ts',
          result: createMockReviewResult({
            severity: 'medium',
            issues: [],
            suggestions: []
          })
        }
      ];

      const result = generateReport(reviews);

      expect(result).toContain('## ⚠️ MEDIUM SEVERITY ISSUES (1)');
      expect(result).toContain('### src/clean.ts');
      expect(result).toContain('**Issues:** ');
      expect(result).toContain('**Suggestions:** ');
      expect(result).toContain('Total issues: 0');
    });

    it('should handle single issue and suggestion correctly', () => {
      const reviews = [
        {
          file: 'src/single.ts',
          result: createMockReviewResult({
            severity: 'high',
            issues: ['Single critical issue'],
            suggestions: ['Single suggestion'],
            summary: 'One problem found'
          })
        }
      ];

      const result = generateReport(reviews);

      expect(result).toContain('**Issues:** Single critical issue');
      expect(result).toContain('**Suggestions:** Single suggestion');
      expect(result).toContain('**Summary:** One problem found');
    });

    it('should not show sections for severity levels with no files', () => {
      const reviews = [
        {
          file: 'src/low.ts',
          result: createMockReviewResult({
            severity: 'low',
            issues: ['Minor style issue'],
            suggestions: ['Fix formatting']
          })
        }
      ];

      const result = generateReport(reviews);

      expect(result).not.toContain('🚨 HIGH SEVERITY ISSUES');
      expect(result).not.toContain('⚠️ MEDIUM SEVERITY ISSUES');
      expect(result).toContain('High severity: 0');
      expect(result).toContain('Medium severity: 0');
      expect(result).toContain('Total issues: 1');
      expect(result).toContain('**Recommendation:** Code quality looks good!');
    });

    it('should calculate total issues correctly across all files', () => {
      const reviews = [
        {
          file: 'file1.ts',
          result: createMockReviewResult({
            issues: ['issue1', 'issue2', 'issue3'] // 3 issues
          })
        },
        {
          file: 'file2.ts',
          result: createMockReviewResult({
            issues: ['issue4', 'issue5'] // 2 issues
          })
        },
        {
          file: 'file3.ts',
          result: createMockReviewResult({
            issues: [] // 0 issues
          })
        }
      ];

      const result = generateReport(reviews);

      expect(result).toContain('Total issues: 5');
      expect(result).toContain('Files reviewed: 3');
    });
  });

  describe('generateStructuredData', () => {
    it('should generate structured data for empty reviews', () => {
      const result = generateStructuredData([]);

      expect(result).toEqual({
        files: [],
        summary: {
          totalFiles: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          totalIssues: 0
        }
      });
    });

    it('should generate structured data with correct counts', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'high',
          issues: ['critical1', 'critical2'] // 2 issues
        }),
        createMockReviewedFile('file2.ts', {
          severity: 'high',
          issues: ['critical3'] // 1 issue
        }),
        createMockReviewedFile('file3.ts', {
          severity: 'medium',
          issues: ['medium1', 'medium2', 'medium3'] // 3 issues
        }),
        createMockReviewedFile('file4.ts', {
          severity: 'low',
          issues: ['low1'] // 1 issue
        }),
        createMockReviewedFile('file5.ts', {
          severity: 'low',
          issues: [] // 0 issues
        })
      ];

      const result = generateStructuredData(reviews);

      expect(result).toEqual({
        files: reviews,
        summary: {
          totalFiles: 5,
          highSeverity: 2,
          mediumSeverity: 1,
          totalIssues: 7 // 2 + 1 + 3 + 1 + 0 = 7
        }
      });
    });

    it('should include original files in structured data', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('src/component.ts'),
        createMockReviewedFile('src/utils.ts')
      ];

      const result = generateStructuredData(reviews);

      expect(result.files).toBe(reviews);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].file).toBe('src/component.ts');
      expect(result.files[1].file).toBe('src/utils.ts');
    });

    it('should handle files with zero issues correctly', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'medium',
          issues: []
        }),
        createMockReviewedFile('file2.ts', {
          severity: 'high',
          issues: []
        })
      ];

      const result = generateStructuredData(reviews);

      expect(result.summary).toEqual({
        totalFiles: 2,
        highSeverity: 1,
        mediumSeverity: 1,
        totalIssues: 0
      });
    });
  });

  describe('shouldBlockCommit', () => {
    it('should not block commit when no reviews provided', () => {
      const result = shouldBlockCommit([]);

      expect(result).toBe(false);
    });

    it('should not block commit for low severity without blocking issues', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'low',
          hasBlockingIssues: false
        }),
        createMockReviewedFile('file2.ts', {
          severity: 'low',
          hasBlockingIssues: false
        })
      ];

      const result = shouldBlockCommit(reviews);

      expect(result).toBe(false);
    });

    it('should block commit for high severity issues', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'low',
          hasBlockingIssues: false
        }),
        createMockReviewedFile('file2.ts', {
          severity: 'high',
          hasBlockingIssues: false
        })
      ];

      const result = shouldBlockCommit(reviews);

      expect(result).toBe(true);
    });

    it('should block commit for medium severity issues', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'medium',
          hasBlockingIssues: false
        })
      ];

      const result = shouldBlockCommit(reviews);

      expect(result).toBe(true);
    });

    it('should block commit when hasBlockingIssues is true regardless of severity', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'low',
          hasBlockingIssues: true
        })
      ];

      const result = shouldBlockCommit(reviews);

      expect(result).toBe(true);
    });

    it('should block commit if any review has blocking conditions', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'low',
          hasBlockingIssues: false
        }),
        createMockReviewedFile('file2.ts', {
          severity: 'low',
          hasBlockingIssues: false
        }),
        createMockReviewedFile('file3.ts', {
          severity: 'low',
          hasBlockingIssues: false
        }),
        createMockReviewedFile('file4.ts', {
          severity: 'medium', // This should block
          hasBlockingIssues: false
        })
      ];

      const result = shouldBlockCommit(reviews);

      expect(result).toBe(true);
    });

    it('should handle all severity levels correctly', () => {
      const testCases = [
        { severity: 'low' as const, hasBlockingIssues: false, expected: false },
        { severity: 'low' as const, hasBlockingIssues: true, expected: true },
        { severity: 'medium' as const, hasBlockingIssues: false, expected: true },
        { severity: 'medium' as const, hasBlockingIssues: true, expected: true },
        { severity: 'high' as const, hasBlockingIssues: false, expected: true },
        { severity: 'high' as const, hasBlockingIssues: true, expected: true }
      ];

      testCases.forEach(({ severity, hasBlockingIssues, expected }) => {
        const reviews: ReviewedFile[] = [
          createMockReviewedFile('test.ts', { severity, hasBlockingIssues })
        ];

        const result = shouldBlockCommit(reviews);

        expect(result).toBe(expected);
      });
    });

    it('should return true if first review blocks even if others do not', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'high', // This blocks
          hasBlockingIssues: false
        }),
        createMockReviewedFile('file2.ts', {
          severity: 'low',
          hasBlockingIssues: false
        })
      ];

      const result = shouldBlockCommit(reviews);

      expect(result).toBe(true);
    });

    it('should return true if last review blocks even if others do not', () => {
      const reviews: ReviewedFile[] = [
        createMockReviewedFile('file1.ts', {
          severity: 'low',
          hasBlockingIssues: false
        }),
        createMockReviewedFile('file2.ts', {
          severity: 'low',
          hasBlockingIssues: false
        }),
        createMockReviewedFile('file3.ts', {
          severity: 'medium', // This blocks
          hasBlockingIssues: false
        })
      ];

      const result = shouldBlockCommit(reviews);

      expect(result).toBe(true);
    });
  });
});