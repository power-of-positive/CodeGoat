/**
 * Tests for precommit-llm.ts
 */

import { runLlmReviewProcess, REVIEW_FILE_NAME } from './precommit/precommit-llm';
import * as llmReviewGenerator from './llm/llm-review-generator';
import * as llmCheck from './llm/llm-check';
import * as fs from 'fs';

jest.mock('./llm/llm-review-generator');
jest.mock('./llm/llm-check');
jest.mock('fs');

describe('precommit-llm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SKIP_LLM_REVIEW;

    // Mock OPENAI_API_KEY for tests that need it
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Mock fs.existsSync to return true for our test paths
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('runLlmReviewProcess', () => {
    it('should return null when SKIP_LLM_REVIEW is set to true', async () => {
      process.env.SKIP_LLM_REVIEW = 'true';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await runLlmReviewProcess('/mock/project', 'output');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚡ LLM review disabled via SKIP_LLM_REVIEW environment variable'
      );
      expect(llmReviewGenerator.generateLlmReviewComments as jest.Mock).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should return null when LLM review passes', async () => {
      (llmReviewGenerator.generateLlmReviewComments as jest.Mock).mockResolvedValue(undefined);
      (llmCheck.checkLlmReview as jest.Mock).mockResolvedValue({
        blocked: false,
        output: '',
      });

      const result = await runLlmReviewProcess('/mock/project', 'output');

      expect(result).toBeNull();
      expect(llmReviewGenerator.generateLlmReviewComments as jest.Mock).toHaveBeenCalledWith(
        '/mock/project'
      );
      expect(llmCheck.checkLlmReview as jest.Mock).toHaveBeenCalledWith(
        '/mock/project',
        REVIEW_FILE_NAME
      );
    });

    it('should return blocking result when LLM review is blocked', async () => {
      const allOutput = 'Previous output';
      const llmOutput = 'LLM review issues found';

      (llmReviewGenerator.generateLlmReviewComments as jest.Mock).mockResolvedValue(undefined);
      (llmCheck.checkLlmReview as jest.Mock).mockResolvedValue({
        blocked: true,
        output: llmOutput,
      });

      const result = await runLlmReviewProcess('/mock/project', allOutput);

      expect(result).toEqual({
        decision: 'block',
        reason: `Pre-commit checks failed:\n\n${allOutput}${llmOutput}\n\n🚫 Fix issues and re-stage files.`,
      });
    });

    it('should handle LLM review generation errors gracefully', async () => {
      const error = new Error('Generation failed');
      (llmReviewGenerator.generateLlmReviewComments as jest.Mock).mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await runLlmReviewProcess('/mock/project', 'output');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'LLM review generation failed: Failed to generate LLM review comments: Generation failed'
      );
      expect(llmCheck.checkLlmReview as jest.Mock).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle LLM check errors gracefully', async () => {
      (llmReviewGenerator.generateLlmReviewComments as jest.Mock).mockResolvedValue(undefined);
      (llmCheck.checkLlmReview as jest.Mock).mockRejectedValue(new Error('Check failed'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await runLlmReviewProcess('/mock/project', 'output');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'LLM review generation failed: Failed to check LLM review results: Check failed'
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      (llmReviewGenerator.generateLlmReviewComments as jest.Mock).mockRejectedValue('String error');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await runLlmReviewProcess('/mock/project', 'output');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'LLM review generation failed: Failed to generate LLM review comments: String error'
      );

      consoleSpy.mockRestore();
    });

    it('should not be skipped when SKIP_LLM_REVIEW is set to other values', async () => {
      process.env.SKIP_LLM_REVIEW = 'false';
      process.env.OPENAI_API_KEY = 'test-api-key';

      (llmReviewGenerator.generateLlmReviewComments as jest.Mock).mockResolvedValue(undefined);
      (llmCheck.checkLlmReview as jest.Mock).mockResolvedValue({
        blocked: false,
        output: '',
      });

      const result = await runLlmReviewProcess('/mock/project', 'output');

      expect(result).toBeNull();
      expect(llmReviewGenerator.generateLlmReviewComments as jest.Mock).toHaveBeenCalled();
    });
  });

  describe('REVIEW_FILE_NAME export', () => {
    it('should export the correct review file name', () => {
      expect(REVIEW_FILE_NAME).toBe('code-review-comments.tmp');
    });
  });
});
