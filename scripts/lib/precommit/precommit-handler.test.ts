/**
 * Tests for precommit-handler.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import { runPrecommitChecks, PrecommitResult } from "./precommit-handler";
import { findProjectRoot } from "../utils/review-utils";
import { runAllChecks } from "./precommit-checks";
import { getStagedFiles } from "../files/staged-files";
import { runTypeScriptCheck } from "../formatting/format-runners";
import { runFormattingSteps } from "./precommit-formatting";
import { runLlmReviewProcess } from "./precommit-llm";

// Mock all dependencies
vi.mock("fs/promises");
vi.mock("fs");
vi.mock("path");
vi.mock("process");
vi.mock("../utils/review-utils");
vi.mock("./precommit-checks");
vi.mock("../files/staged-files");
vi.mock("../formatting/format-runners");
vi.mock("./precommit-formatting");
vi.mock("./precommit-llm");

describe("precommit-handler", () => {
  const mockProjectRoot = "/test/project";

  beforeEach(() => {
    // Mock process.cwd to return our test directory
    vi.spyOn(process, "cwd").mockReturnValue(mockProjectRoot);
    vi.clearAllMocks();
    vi.mocked(findProjectRoot).mockReturnValue(mockProjectRoot);
    vi.mocked(process.chdir).mockImplementation(() => {});
    vi.mocked(getStagedFiles).mockReturnValue({
      frontendFiles: ["frontend/test.ts"],
      backendFiles: ["backend/test.rs"],
      scriptFiles: ["scripts/test.ts"],
      allFiles: ["frontend/test.ts", "backend/test.rs", "scripts/test.ts"],
    });
    vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
    vi.mocked(path.normalize).mockImplementation((p) => p);
    vi.mocked(path.resolve).mockImplementation((p) =>
      p.startsWith("/") ? p : `${mockProjectRoot}/${p}`,
    );
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(runTypeScriptCheck).mockReturnValue({
      success: true,
      output: "TypeScript check passed",
    });
    vi.mocked(runFormattingSteps).mockImplementation(() => {});
    vi.mocked(runLlmReviewProcess).mockResolvedValue(null);
  });

  afterEach(() => {
    // Restore all mocks
    vi.restoreAllMocks();
  });

  describe("PrecommitResult interface", () => {
    it("should have correct approve structure", () => {
      const approveResult: PrecommitResult = {
        decision: "approve",
        feedback: "All checks passed",
      };

      expect(approveResult.decision).toBe("approve");
      expect(approveResult).toHaveProperty("feedback");
    });

    it("should have correct block structure", () => {
      const blockResult: PrecommitResult = {
        decision: "block",
        reason: "Tests failed",
      };

      expect(blockResult.decision).toBe("block");
      expect(blockResult).toHaveProperty("reason");
    });
  });

  describe("runPrecommitChecks", () => {
    const mockAllChecks = (
      criticalFailure = false,
      blocked = false,
      output = "",
    ) => {
      vi.mocked(runAllChecks).mockResolvedValue({
        criticalFailure,
        allOutput: output,
        analysisResult: { blocked, details: output },
      });
    };

    it("should approve when all checks pass", async () => {
      mockAllChecks(false, false, "");

      const result = await runPrecommitChecks();

      expect(result.decision).toBe("approve");
      expect(result.feedback).toContain("All checks passed");
    });

    it("should block when TypeScript check fails", async () => {
      vi.mocked(runTypeScriptCheck).mockReturnValue({
        success: false,
        output: "TypeScript errors found",
      });

      const result = await runPrecommitChecks();

      expect(result.decision).toBe("block");
      expect(result.reason).toContain("TYPESCRIPT TYPE CHECK FAILURES");
      expect(result.reason).toContain("TypeScript errors found");
    });

    it("should block when critical failure occurs", async () => {
      mockAllChecks(true, false, "Critical test failure");

      const result = await runPrecommitChecks();

      expect(result.decision).toBe("block");
      expect(result.reason).toContain("Pre-commit checks failed");
      expect(result.reason).toContain("Critical test failure");
    });

    it("should block when LLM review blocks", async () => {
      mockAllChecks(false, false, "");
      vi.mocked(runLlmReviewProcess).mockResolvedValue({
        decision: "block",
        reason: "LLM REVIEW BLOCKING ISSUES: Critical issues found",
      });

      const result = await runPrecommitChecks();

      expect(result.decision).toBe("block");
      expect(result.reason).toContain("LLM REVIEW BLOCKING ISSUES");
    });

    it("should handle execution errors gracefully", async () => {
      vi.mocked(runAllChecks).mockRejectedValue(new Error("System error"));

      const result = await runPrecommitChecks();

      expect(result.decision).toBe("block");
      expect(result.reason).toContain("Precommit check execution failed");
      expect(result.reason).toContain("System error");
      expect(result.feedback).toContain(
        "Fix the configuration or file system issues",
      );
    });

    it("should handle directory restoration errors", async () => {
      mockAllChecks(false, false, "");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Mock process.chdir to fail only on second call (restoration)
      let chdirCallCount = 0;
      vi.mocked(process.chdir).mockImplementation(() => {
        chdirCallCount++;
        if (chdirCallCount === 2) {
          // Second call is restoration
          throw new Error("chdir failed");
        }
      });

      const result = await runPrecommitChecks();

      expect(result.decision).toBe("approve");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to restore working directory"),
      );
    });
  });
});
