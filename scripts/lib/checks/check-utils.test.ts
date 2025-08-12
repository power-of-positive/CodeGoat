/**
 * Tests for check-utils.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateStagedFiles, runChecks } from "./check-utils";
import { StagedFiles } from "../files/staged-files";
import * as checkRunners from "./check-runners";

vi.mock("./check-runners");

describe("check-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateStagedFiles", () => {
    it("should validate valid staged files object", () => {
      const stagedFiles: StagedFiles = {
        frontendFiles: ["frontend/test.ts"],
        backendFiles: ["backend/test.rs"],
        scriptFiles: ["scripts/test.ts"],
        allFiles: ["frontend/test.ts", "backend/test.rs", "scripts/test.ts"],
      };

      expect(() => validateStagedFiles(stagedFiles)).not.toThrow();
    });

    it("should throw error for null staged files", () => {
      expect(() => validateStagedFiles(null as unknown)).toThrow(
        "Invalid stagedFiles: must be object",
      );
    });

    it("should throw error for undefined staged files", () => {
      expect(() => validateStagedFiles(undefined as unknown)).toThrow(
        "Invalid stagedFiles: must be object",
      );
    });

    it("should throw error for non-object staged files", () => {
      expect(() => validateStagedFiles("not an object" as unknown)).toThrow(
        "Invalid stagedFiles: must be object",
      );
    });

    it("should throw error for object missing required properties", () => {
      const invalidStagedFiles = {
        frontendFiles: ["test.ts"],
        // missing backendFiles, scriptFiles, allFiles
      };

      expect(() => validateStagedFiles(invalidStagedFiles as unknown)).toThrow(
        "Invalid stagedFiles: missing required arrays",
      );
    });
  });

  describe("runChecks", () => {
    const mockProjectRoot = "/test/project";
    const mockStagedFiles: StagedFiles = {
      frontendFiles: ["frontend/test.ts"],
      backendFiles: ["backend/test.rs"],
      scriptFiles: ["scripts/test.ts"],
      allFiles: ["frontend/test.ts", "backend/test.rs", "scripts/test.ts"],
    };

    beforeEach(() => {
      vi.mocked(checkRunners.runFrontendLinting).mockReturnValue({
        success: true,
        output: "Frontend linting passed",
      });
      vi.mocked(checkRunners.runFrontendTests).mockReturnValue({
        success: true,
        output: "Frontend tests passed",
      });
      vi.mocked(checkRunners.runPlaywrightTests).mockReturnValue({
        success: true,
        output: "Playwright tests passed",
      });
      vi.mocked(checkRunners.runRustFormatting).mockReturnValue({
        success: true,
        output: "Rust formatting passed",
      });
      vi.mocked(checkRunners.runRustLinting).mockReturnValue({
        success: true,
        output: "Rust linting passed",
      });
      vi.mocked(checkRunners.runApiE2eTests).mockResolvedValue({
        success: true,
        output: "API E2E tests passed",
      });
    });

    it("should run all checks successfully", async () => {
      const result = await runChecks(
        mockProjectRoot,
        mockStagedFiles,
        "allFiles",
        [],
        "Test",
      );

      expect(result.failed).toBe(false);
      expect(result.output).toContain("");
    });

    it("should handle frontend linting failure", async () => {
      const mockRunner = {
        runner: () => ({ success: false, output: "Frontend linting failed" }),
        name: "Frontend Linting",
      };

      const result = await runChecks(
        mockProjectRoot,
        mockStagedFiles,
        "allFiles",
        [mockRunner],
        "Test",
      );

      expect(result.failed).toBe(true);
      expect(result.output).toContain("Frontend linting failed");
    });

    it("should handle frontend tests failure", async () => {
      const mockRunner = {
        runner: () => ({ success: false, output: "Frontend tests failed" }),
        name: "Frontend Tests",
      };

      const result = await runChecks(
        mockProjectRoot,
        mockStagedFiles,
        "allFiles",
        [mockRunner],
        "Test",
      );

      expect(result.failed).toBe(true);
      expect(result.output).toContain("Frontend tests failed");
    });

    it("should handle Playwright tests failure", async () => {
      const mockRunner = {
        runner: () => ({ success: false, output: "Playwright tests failed" }),
        name: "Playwright Tests",
      };

      const result = await runChecks(
        mockProjectRoot,
        mockStagedFiles,
        "allFiles",
        [mockRunner],
        "Test",
      );

      expect(result.failed).toBe(true);
      expect(result.output).toContain("Playwright tests failed");
    });

    it("should handle Rust formatting failure", async () => {
      const mockRunner = {
        runner: () => ({ success: false, output: "Rust formatting failed" }),
        name: "Rust Formatting",
      };

      const result = await runChecks(
        mockProjectRoot,
        mockStagedFiles,
        "allFiles",
        [mockRunner],
        "Test",
      );

      expect(result.failed).toBe(true);
      expect(result.output).toContain("Rust formatting failed");
    });

    it("should handle Rust linting failure", async () => {
      const mockRunner = {
        runner: () => ({ success: false, output: "Rust linting failed" }),
        name: "Rust Linting",
      };

      const result = await runChecks(
        mockProjectRoot,
        mockStagedFiles,
        "allFiles",
        [mockRunner],
        "Test",
      );

      expect(result.failed).toBe(true);
      expect(result.output).toContain("Rust linting failed");
    });

    it("should handle API E2E tests failure", async () => {
      const mockRunner = {
        runner: () => ({ success: false, output: "API E2E tests failed" }),
        name: "API E2E Tests",
      };

      const result = await runChecks(
        mockProjectRoot,
        mockStagedFiles,
        "allFiles",
        [mockRunner],
        "Test",
      );

      expect(result.failed).toBe(true);
      expect(result.output).toContain("API E2E tests failed");
    });

    it("should handle empty file array", async () => {
      const emptyFiles = {
        ...mockStagedFiles,
        allFiles: [],
      };

      const result = await runChecks(
        mockProjectRoot,
        emptyFiles,
        "allFiles",
        [],
        "Test",
      );

      expect(result.failed).toBe(false);
      expect(result.output).toBe("");
    });
  });
});
