/**
 * Tests for precommit-llm.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runLlmReviewProcess,
  REVIEW_FILE_NAME,
} from "./precommit/precommit-llm";
import * as llmReviewGenerator from "./llm/llm-review-generator";
import * as llmCheck from "./llm/llm-check";
import * as fs from "fs";

vi.mock("./llm/llm-review-generator");
vi.mock("./llm/llm-check");
vi.mock("fs");

describe("precommit-llm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SKIP_LLM_REVIEW;

    // Mock OPENAI_API_KEY for tests that need it
    process.env.OPENAI_API_KEY = "test-api-key";

    // Mock fs.existsSync to return true for our test paths
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe("runLlmReviewProcess", () => {
    it("should return null when SKIP_LLM_REVIEW is set to true", async () => {
      process.env.SKIP_LLM_REVIEW = "true";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await runLlmReviewProcess("/mock/project", "output");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "⚡ LLM review disabled via SKIP_LLM_REVIEW environment variable",
      );
      expect(
        vi.mocked(llmReviewGenerator.generateLlmReviewComments),
      ).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should return null when LLM review passes", async () => {
      vi.mocked(llmReviewGenerator.generateLlmReviewComments).mockResolvedValue(
        undefined,
      );
      vi.mocked(llmCheck.checkLlmReview).mockResolvedValue({
        blocked: false,
        output: "",
      });

      const result = await runLlmReviewProcess("/mock/project", "output");

      expect(result).toBeNull();
      expect(
        vi.mocked(llmReviewGenerator.generateLlmReviewComments),
      ).toHaveBeenCalledWith("/mock/project");
      expect(vi.mocked(llmCheck.checkLlmReview)).toHaveBeenCalledWith(
        "/mock/project",
        REVIEW_FILE_NAME,
      );
    });

    it("should return blocking result when LLM review is blocked", async () => {
      const allOutput = "Previous output";
      const llmOutput = "LLM review issues found";

      vi.mocked(llmReviewGenerator.generateLlmReviewComments).mockResolvedValue(
        undefined,
      );
      vi.mocked(llmCheck.checkLlmReview).mockResolvedValue({
        blocked: true,
        output: llmOutput,
      });

      const result = await runLlmReviewProcess("/mock/project", allOutput);

      expect(result).toEqual({
        decision: "block",
        reason: `Pre-commit checks failed:\n\n${allOutput}${llmOutput}\n\n🚫 Fix issues and re-stage files.`,
      });
    });

    it("should handle LLM review generation errors gracefully", async () => {
      const error = new Error("Generation failed");
      vi.mocked(llmReviewGenerator.generateLlmReviewComments).mockRejectedValue(
        error,
      );
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await runLlmReviewProcess("/mock/project", "output");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "LLM review generation failed: Failed to generate LLM review comments: Generation failed",
      );
      expect(vi.mocked(llmCheck.checkLlmReview)).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle LLM check errors gracefully", async () => {
      vi.mocked(llmReviewGenerator.generateLlmReviewComments).mockResolvedValue(
        undefined,
      );
      vi.mocked(llmCheck.checkLlmReview).mockRejectedValue(
        new Error("Check failed"),
      );
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await runLlmReviewProcess("/mock/project", "output");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "LLM review generation failed: Failed to check LLM review results: Check failed",
      );

      consoleSpy.mockRestore();
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(llmReviewGenerator.generateLlmReviewComments).mockRejectedValue(
        "String error",
      );
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await runLlmReviewProcess("/mock/project", "output");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "LLM review generation failed: Failed to generate LLM review comments: String error",
      );

      consoleSpy.mockRestore();
    });

    it("should not be skipped when SKIP_LLM_REVIEW is set to other values", async () => {
      process.env.SKIP_LLM_REVIEW = "false";
      process.env.OPENAI_API_KEY = "test-api-key";

      vi.mocked(llmReviewGenerator.generateLlmReviewComments).mockResolvedValue(
        undefined,
      );
      vi.mocked(llmCheck.checkLlmReview).mockResolvedValue({
        blocked: false,
        output: "",
      });

      const result = await runLlmReviewProcess("/mock/project", "output");

      expect(result).toBeNull();
      expect(
        vi.mocked(llmReviewGenerator.generateLlmReviewComments),
      ).toHaveBeenCalled();
    });
  });

  describe("REVIEW_FILE_NAME export", () => {
    it("should export the correct review file name", () => {
      expect(REVIEW_FILE_NAME).toBe("code-review-comments.tmp");
    });
  });
});
