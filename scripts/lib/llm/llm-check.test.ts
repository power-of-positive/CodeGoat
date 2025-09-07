/**
 * Tests for llm-check.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { checkLlmReview } from './llm-check';
import * as severityAnalyzer from '../severity/severity-analyzer';

jest.mock('fs/promises');
jest.mock('../severity/severity-analyzer');

describe('llm-check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLlmReview', () => {
    it('should return not blocked when review file does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await checkLlmReview('/mock/project', 'review.tmp');

      expect(result.blocked).toBe(false);
      expect(result.output).toBe('');
      expect(severityAnalyzer.analyzeLlmReviewSeverity as jest.Mock).not.toHaveBeenCalled();
    });

    it('should return not blocked when no severity issues found', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (severityAnalyzer.analyzeLlmReviewSeverity as jest.Mock).mockReturnValue('');
      (severityAnalyzer.shouldBlockClaude as jest.Mock).mockReturnValue(false);

      const result = await checkLlmReview('/mock/project', 'review.tmp');

      expect(result.blocked).toBe(false);
      expect(result.output).toBe('');
      expect(severityAnalyzer.analyzeLlmReviewSeverity as jest.Mock).toHaveBeenCalledWith(
        path.join('/mock/project', 'review.tmp')
      );
    });

    it('should return blocked when severity issues require blocking', async () => {
      const mockIssues = 'CRITICAL: Security vulnerability detected';
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (severityAnalyzer.analyzeLlmReviewSeverity as jest.Mock).mockReturnValue(mockIssues);
      (severityAnalyzer.shouldBlockClaude as jest.Mock).mockReturnValue(true);

      const result = await checkLlmReview('/mock/project', 'review.tmp');

      expect(result.blocked).toBe(true);
      expect(result.output).toBe(`\nLLM REVIEW BLOCKING ISSUES:\n${mockIssues}\n`);
    });

    it('should handle errors gracefully and return not blocked', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (severityAnalyzer.analyzeLlmReviewSeverity as jest.Mock).mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await checkLlmReview('/mock/project', 'review.tmp');

      expect(result.blocked).toBe(false);
      expect(result.output).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith('Error checking LLM review: Analysis failed');

      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (severityAnalyzer.analyzeLlmReviewSeverity as jest.Mock).mockImplementation(() => {
        throw 'String error';
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await checkLlmReview('/mock/project', 'review.tmp');

      expect(result.blocked).toBe(false);
      expect(result.output).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith('Error checking LLM review: String error');

      consoleSpy.mockRestore();
    });
  });
});
