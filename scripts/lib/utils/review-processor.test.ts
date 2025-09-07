/**
 * Tests for review-processor.ts
 */

import { performCodeReview, shouldBlockClaude, processReviewResults } from './review-processor';
import * as fs from 'fs';
import * as path from 'path';

// Import the modules we need to mock
import { findProjectRoot } from './review-utils';
import { generateLlmReviewComments } from '../llm/llm-review-generator';
import { checkPlaywrightCoverage } from '../playwright-coverage';
import { analyzeLlmReviewSeverity } from '../severity/severity-analyzer';

// Mock external dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('./review-utils');
jest.mock('../llm/llm-review-generator');
jest.mock('../playwright-coverage');
jest.mock('../severity/severity-analyzer');

// Mock dotenv to prevent .env loading errors in tests
jest.mock('dotenv', () => ({
  config: jest.fn(() => ({ parsed: {}, error: null })),
}));

describe('review-processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('performCodeReview', () => {
    it('should perform comprehensive code review', async () => {
      // Mock dependencies with static imports
      (findProjectRoot as jest.Mock).mockReturnValue('/mock/project');
      (generateLlmReviewComments as jest.Mock).mockResolvedValue(undefined);
      (checkPlaywrightCoverage as jest.Mock).mockReturnValue('Coverage check passed\n');
      (analyzeLlmReviewSeverity as jest.Mock).mockReturnValue('MEDIUM: Some issues found\n');
      (path.join as jest.Mock).mockReturnValue('/mock/project/code-review-comments.tmp');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await performCodeReview('test-files.txt');

      expect(result).toContain('Coverage check passed');
      expect(result).toContain('MEDIUM: Some issues found');
      expect(findProjectRoot).toHaveBeenCalled();
      expect(generateLlmReviewComments).toHaveBeenCalledWith('/mock/project');
      expect(checkPlaywrightCoverage).toHaveBeenCalledWith('test-files.txt');
    });

    it('should handle missing LLM review file', async () => {
      // Mock dependencies with static imports
      (findProjectRoot as jest.Mock).mockReturnValue('/mock/project');
      (generateLlmReviewComments as jest.Mock).mockResolvedValue(undefined);
      (checkPlaywrightCoverage as jest.Mock).mockReturnValue('Coverage OK\n');
      (path.join as jest.Mock).mockReturnValue('/mock/project/code-review-comments.tmp');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await performCodeReview('files.txt');

      expect(result).toContain('Coverage OK');
      expect(result).not.toContain('MEDIUM');
    });

    it('should handle empty coverage check results', async () => {
      // Mock dependencies with static imports
      (findProjectRoot as jest.Mock).mockReturnValue('/mock/project');
      (generateLlmReviewComments as jest.Mock).mockResolvedValue(undefined);
      (checkPlaywrightCoverage as jest.Mock).mockReturnValue('');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await performCodeReview('files.txt');

      expect(result).toBe('');
    });
  });

  describe('shouldBlockClaude', () => {
    it('should return true for HIGH severity issues', () => {
      const severityIssues = 'HIGH: Critical security issue found';
      expect(shouldBlockClaude(severityIssues)).toBe(true);
    });

    it('should return true for MEDIUM severity issues', () => {
      const severityIssues = 'MEDIUM: Code quality issues detected';
      expect(shouldBlockClaude(severityIssues)).toBe(true);
    });

    it('should return false for LOW severity issues', () => {
      const severityIssues = 'LOW: Minor style issues';
      expect(shouldBlockClaude(severityIssues)).toBe(false);
    });

    it('should return false for no issues', () => {
      const severityIssues = '';
      expect(shouldBlockClaude(severityIssues)).toBe(false);
    });
  });

  describe('processReviewResults', () => {
    it('should block for high severity issues', () => {
      const reviewComments = 'HIGH: Critical issue found';
      const result = processReviewResults(reviewComments);

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('medium or high severity issues');
    });

    it('should approve for low severity issues', () => {
      const reviewComments = 'LOW: Minor issue found';
      const result = processReviewResults(reviewComments);

      expect(result.decision).toBe('approve');
      expect(result.feedback).toContain('minor recommendations');
    });
  });
});
