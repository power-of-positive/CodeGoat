/**
 * Tests for llm-check.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { checkLlmReview } from "./llm-check";
import * as severityAnalyzer from "../severity/severity-analyzer";

vi.mock("fs/promises");
vi.mock("../severity/severity-analyzer");

describe("llm-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkLlmReview", () => {
    it("should return not blocked when review file does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));

      const result = await checkLlmReview("/mock/project", "review.tmp");

      expect(result.blocked).toBe(false);
      expect(result.output).toBe("");
      expect(
        vi.mocked(severityAnalyzer.analyzeLlmReviewSeverity),
      ).not.toHaveBeenCalled();
    });

    it("should return not blocked when no severity issues found", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(severityAnalyzer.analyzeLlmReviewSeverity).mockReturnValue("");
      vi.mocked(severityAnalyzer.shouldBlockClaude).mockReturnValue(false);

      const result = await checkLlmReview("/mock/project", "review.tmp");

      expect(result.blocked).toBe(false);
      expect(result.output).toBe("");
      expect(
        vi.mocked(severityAnalyzer.analyzeLlmReviewSeverity),
      ).toHaveBeenCalledWith(path.join("/mock/project", "review.tmp"));
    });

    it("should return blocked when severity issues require blocking", async () => {
      const mockIssues = "CRITICAL: Security vulnerability detected";
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(severityAnalyzer.analyzeLlmReviewSeverity).mockReturnValue(
        mockIssues,
      );
      vi.mocked(severityAnalyzer.shouldBlockClaude).mockReturnValue(true);

      const result = await checkLlmReview("/mock/project", "review.tmp");

      expect(result.blocked).toBe(true);
      expect(result.output).toBe(
        `\nLLM REVIEW BLOCKING ISSUES:\n${mockIssues}\n`,
      );
    });

    it("should handle errors gracefully and return not blocked", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(severityAnalyzer.analyzeLlmReviewSeverity).mockImplementation(
        () => {
          throw new Error("Analysis failed");
        },
      );

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await checkLlmReview("/mock/project", "review.tmp");

      expect(result.blocked).toBe(false);
      expect(result.output).toBe("");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error checking LLM review: Analysis failed",
      );

      consoleSpy.mockRestore();
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(severityAnalyzer.analyzeLlmReviewSeverity).mockImplementation(
        () => {
          throw "String error";
        },
      );

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await checkLlmReview("/mock/project", "review.tmp");

      expect(result.blocked).toBe(false);
      expect(result.output).toBe("");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error checking LLM review: String error",
      );

      consoleSpy.mockRestore();
    });
  });
});
