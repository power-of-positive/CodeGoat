/**
 * Tests for severity-analyzer core functionality
 * Focused on main analysis logic and structured data processing
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeLlmReviewSeverity } from './severity-analyzer';
import { StructuredReviewData } from '../utils/types';
import {
  createExtendedTestSetup,
  createStructuredReviewMock,
  createHighSeverityReviewMock,
} from '../testing/test-mocks';

// Mock external dependencies
jest.mock('fs');

describe('severity-analyzer core functionality', () => {
  const testSetup = createExtendedTestSetup();

  beforeEach(() => {
    testSetup.cleanup();
    // Reset all mocks to default behavior with fresh implementations
    (fs.existsSync as jest.Mock).mockImplementation(() => false);
    (fs.readFileSync as jest.Mock).mockImplementation(() => '');

    // Mock process.cwd to return a valid path
    const mockCwd = jest.fn().mockReturnValue('/test/project');
    Object.defineProperty(process, 'cwd', {
      value: mockCwd,
      configurable: true,
    });
  });

  afterEach(() => {
    testSetup.cleanup();
  });

  it('should return empty string when structured data is not available', () => {
    // Test when structured file doesn't exist
    (fs.existsSync as jest.Mock).mockImplementation(filePath => {
      // Structured file doesn't exist
      return typeof filePath === 'string' && !filePath.includes('structured');
    });

    const result = analyzeLlmReviewSeverity(process.cwd());
    expect(result).toBe('');
  });

  it('should process clean structured data correctly', () => {
    const structuredMock = createStructuredReviewMock();

    (fs.existsSync as jest.Mock).mockImplementation(filePath => {
      return typeof filePath === 'string' && filePath.includes('structured');
    });
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(structuredMock));

    const result = analyzeLlmReviewSeverity(process.cwd());
    expect(typeof result).toBe('string');
  });

  it('should handle high severity structured data correctly', () => {
    const highSeverityMock = createHighSeverityReviewMock();

    (fs.existsSync as jest.Mock).mockImplementation(filePath => {
      return typeof filePath === 'string' && filePath.includes('structured');
    });
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(highSeverityMock));

    const result = analyzeLlmReviewSeverity(process.cwd());
    expect(result).toContain('HIGH:');
  });

  it('should process structured JSON with HIGH severity issues', () => {
    // Test with structured JSON data
    const structuredReview: StructuredReviewData = {
      files: [
        {
          file: 'test.ts',
          result: {
            severity: 'high' as const,
            issues: ['Security vulnerability found', 'Critical bug detected'],
            suggestions: ['Fix security issue', 'Address bug'],
            summary: 'High severity issues found',
            hasBlockingIssues: true,
            confidence: 0.9,
          },
        },
      ],
      summary: {
        totalFiles: 1,
        highSeverity: 1,
        mediumSeverity: 0,
        totalIssues: 2,
      },
    };

    const testPath = path.join(process.cwd(), 'review-with-high.txt');

    (fs.existsSync as jest.Mock).mockImplementation(filePath => {
      return (
        typeof filePath === 'string' &&
        (filePath.includes('review-with-high.txt') ||
          filePath.includes('code-review-structured.json'))
      );
    });
    (fs.readFileSync as jest.Mock).mockImplementation(filePath => {
      if (typeof filePath === 'string' && filePath.includes('code-review-structured.json')) {
        return JSON.stringify(structuredReview);
      }
      return 'fallback content';
    });

    const result = analyzeLlmReviewSeverity(testPath);

    expect(result).toContain('HIGH: 1 file(s) with critical issues detected');
    expect(result).toContain('test.ts: Security vulnerability found, Critical bug detected');
    expect(result).toContain('BLOCKING: 1 file(s) with issues that block deployment');
  });

  it('should process structured JSON with MEDIUM severity issues', () => {
    // Test with structured JSON data for medium severity
    const structuredReview: StructuredReviewData = {
      files: [
        {
          file: 'utils.ts',
          result: {
            severity: 'medium' as const,
            issues: ['Code quality issue', 'Maintainability concern'],
            suggestions: ['Refactor function', 'Add documentation'],
            summary: 'Medium severity issues found',
            hasBlockingIssues: false,
            confidence: 0.8,
          },
        },
      ],
      summary: {
        totalFiles: 1,
        highSeverity: 0,
        mediumSeverity: 1,
        totalIssues: 2,
      },
    };

    (fs.existsSync as jest.Mock).mockImplementation(filePath => {
      return (
        typeof filePath === 'string' &&
        (filePath.includes('review-with-medium.txt') ||
          filePath.includes('code-review-structured.json'))
      );
    });
    (fs.readFileSync as jest.Mock).mockImplementation(filePath => {
      if (typeof filePath === 'string' && filePath.includes('code-review-structured.json')) {
        return JSON.stringify(structuredReview);
      }
      return 'fallback content';
    });

    const testPath = path.join(process.cwd(), 'review-with-medium.txt');
    const result = analyzeLlmReviewSeverity(testPath);

    expect(result).toContain('MEDIUM: 1 file(s) with quality issues detected');
    expect(result).toContain('utils.ts: Code quality issue, Maintainability concern');
  });

  it('should handle multiple files with different severity levels', () => {
    // Test with multiple files having different severity levels
    const structuredReview: StructuredReviewData = {
      files: [
        {
          file: 'critical.ts',
          result: {
            severity: 'high' as const,
            issues: ['SQL injection vulnerability'],
            suggestions: ['Use parameterized queries'],
            summary: 'Critical security issue',
            hasBlockingIssues: true,
            confidence: 0.95,
          },
        },
        {
          file: 'quality.ts',
          result: {
            severity: 'medium' as const,
            issues: ['Complex function', 'Missing error handling'],
            suggestions: ['Break down function', 'Add try-catch'],
            summary: 'Code quality issues',
            hasBlockingIssues: false,
            confidence: 0.7,
          },
        },
      ],
      summary: {
        totalFiles: 2,
        highSeverity: 1,
        mediumSeverity: 1,
        totalIssues: 3,
      },
    };

    (fs.existsSync as jest.Mock).mockImplementation(filePath => {
      return (
        typeof filePath === 'string' &&
        (filePath.includes('review-with-both.txt') ||
          filePath.includes('code-review-structured.json'))
      );
    });
    (fs.readFileSync as jest.Mock).mockImplementation(filePath => {
      if (typeof filePath === 'string' && filePath.includes('code-review-structured.json')) {
        return JSON.stringify(structuredReview);
      }
      return 'fallback content';
    });

    const testPath = path.join(process.cwd(), 'review-with-both.txt');
    const result = analyzeLlmReviewSeverity(testPath);

    expect(result).toContain('HIGH: 1 file(s) with critical issues detected');
    expect(result).toContain('critical.ts: SQL injection vulnerability');
    expect(result).toContain('MEDIUM: 1 file(s) with quality issues detected');
    expect(result).toContain('quality.ts: Complex function, Missing error handling');
    expect(result).toContain('BLOCKING: 1 file(s) with issues that block deployment');
  });
});
