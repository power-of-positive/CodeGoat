import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import { generateLlmReviewComments } from "./llm-review-generator";
import {
  createMockStructuredReview,
  setupTestMocks,
} from "../testing/test-utils";
import { StructuredReviewData } from "../utils/types";
import * as commandUtils from "../utils/command-utils";
import * as projectMetrics from "../utils/project-metrics";

vi.mock("fs", () => ({ writeFileSync: vi.fn() }));
vi.mock("../utils/command-utils", () => ({
  execCommand: vi.fn(),
}));
vi.mock("../utils/project-metrics", () => ({ getProjectMetrics: vi.fn() }));

interface LLMReviewOutput {
  structuredData: StructuredReviewData;
  textReport: string;
}

const createMockReviewOutput = (
  textReport = "No TypeScript/JavaScript files to review",
): LLMReviewOutput => ({
  structuredData: createMockStructuredReview(),
  textReport,
});

const mockReviewChangedFiles = vi
  .fn()
  .mockResolvedValue(createMockReviewOutput());
vi.mock("./llm-reviewer", () => ({
  LLMReviewer: vi
    .fn()
    .mockImplementation(() => ({ reviewChangedFiles: mockReviewChangedFiles })),
}));

import { getProjectMetrics } from "../utils/project-metrics";

describe("llm-review-generator", () => {
  const { cleanup } = setupTestMocks();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commandUtils.execCommand).mockReturnValue({
      success: true,
      output: "",
    });
    vi.mocked(projectMetrics.getProjectMetrics).mockReturnValue(
      "Lines of Code: 1000\nTest Files: 50\nTotal Files: 100",
    );
  });

  afterEach(cleanup);

  const expectFileWrites = (times = 2) => {
    expect(fs.writeFileSync).toHaveBeenCalledTimes(times);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("code-review-comments.tmp"),
      expect.stringContaining("# LLM Code Review Comments"),
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("code-review-structured.json"),
      expect.stringContaining('"files"'),
    );
  };

  const getWrittenContent = (callIndex = 0): string => {
    const [, content] = vi.mocked(fs.writeFileSync).mock.calls[callIndex];
    return content as string;
  };

  describe("generateLlmReviewComments", () => {
    it("should generate review content and write to file", async () => {
      await generateLlmReviewComments("/test/project");
      expectFileWrites();
    });

    it("should include staged files and git status when available", async () => {
      // Test with staged files
      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({
          success: true,
          output: "src/file1.ts\nsrc/file2.ts",
        })
        .mockReturnValueOnce({
          success: true,
          output: " M src/file1.ts\n A src/file2.ts",
        });
      await generateLlmReviewComments("/test/project");
      const content = getWrittenContent();
      expect(content).toContain("### Staged Files Being Reviewed:");
      expect(content).toContain("- src/file1.ts");
      expect(content).toContain("- src/file2.ts");
    });

    it("should include git status when no staged files", async () => {
      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({ success: true, output: "" })
        .mockReturnValueOnce({
          success: true,
          output: " M modified.ts\n A added.ts",
        });
      await generateLlmReviewComments("/test/project");
      const content = getWrittenContent();
      expect(content).toContain("### Current Git Status:");
      expect(content).toContain("modified.ts");
      expect(content).toContain("added.ts");
    });

    it("should include project metrics and handle successful LLM review", async () => {
      vi.mocked(getProjectMetrics).mockReturnValue(
        "Lines of Code: 5000\nTest Files: 100",
      );
      mockReviewChangedFiles.mockResolvedValue(
        createMockReviewOutput("## AI Review Results\nNo issues found."),
      );

      await generateLlmReviewComments("/test/project");

      expect(getProjectMetrics).toHaveBeenCalledWith("/test/project");
      const content = getWrittenContent();
      expect(content).toContain("## Project Metrics");
      expect(content).toContain("Lines of Code: 5000");
      expect(mockReviewChangedFiles).toHaveBeenCalledTimes(1);
      expect(content).toContain("## AI Review Results");
      expect(content).toContain("No issues found.");
    });

    it("should handle LLM review errors gracefully", async () => {
      mockReviewChangedFiles.mockRejectedValue(new Error("API Error"));

      await generateLlmReviewComments("/test/project");
      const content = getWrittenContent();
      expect(content).toContain("❌ **LLM Review Failed**");
      expect(content).toContain("Error: API Error");
    });

    it("should include review summary and requirements", async () => {
      await generateLlmReviewComments("/test/project");
      const content = getWrittenContent();
      expect(content).toContain("## Review Summary");
      expect(content).toContain("Files must stay under 150 lines");
      expect(content).toContain("Functions should be under 150 lines");
      expect(content).toContain("Review timestamp:");
    });

    it("should handle non-Error rejection types", async () => {
      mockReviewChangedFiles.mockRejectedValue("String error");

      await generateLlmReviewComments("/test/project");
      const content = getWrittenContent();
      expect(content).toContain("❌ **LLM Review Failed**");
      expect(content).toContain("Error: Unknown error");
    });

    it("should create correct file path", async () => {
      await generateLlmReviewComments("/custom/project/path");
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/custom/project/path/code-review-comments.tmp",
        expect.any(String),
      );
    });

    it("should handle empty git status and staged files", async () => {
      vi.mocked(commandUtils.execCommand)
        .mockReturnValueOnce({ success: true, output: "src/file.ts" })
        .mockReturnValueOnce({ success: true, output: "" });
      await generateLlmReviewComments("/test/project");
      const content = getWrittenContent();
      expect(content).toContain("### Staged Files Being Reviewed:");
      expect(content).not.toContain("### Current Git Status:");
    });
  });
});
