/**
 * Tests for TypeScript checking functionality in format-runners.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { runTypeScriptCheck } from "./format-runners";
import * as commandUtils from "../utils/command-utils";
import * as validationUtils from "../utils/validation-utils";

vi.mock("fs");
vi.mock("path");
vi.mock("../utils/command-utils");
vi.mock("../utils/validation-utils");

describe("format-runners TypeScript check", () => {
  const mockProjectRoot = "/test/project";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validationUtils.validateDirectoryExists).mockImplementation(
      () => {},
    );
    vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
    vi.mocked(path.resolve).mockImplementation((...args) => args.join("/"));
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.unlinkSync).mockImplementation(() => {});
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe("runTypeScriptCheck", () => {
    it("should skip when no TypeScript files", () => {
      const result = runTypeScriptCheck(mockProjectRoot, [
        "README.md",
        "config.json",
      ]);

      expect(result.success).toBe(true);
      expect(result.output).toBe("No TypeScript/JavaScript files to check");
    });

    it("should run TypeScript check on staged files", () => {
      const stagedFiles = ["src/test.ts", "src/test.tsx", "src/test.js"];
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: true,
        output: "No TypeScript errors found",
      });

      const result = runTypeScriptCheck(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(true);
      expect(result.output).toBe("No TypeScript errors found");
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        "npx tsc --noEmit --project tsconfig.staged.json",
        mockProjectRoot,
      );
    });

    it("should handle TypeScript check failure", () => {
      const stagedFiles = ["src/test.ts"];
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: "TypeScript compilation errors",
      });

      const result = runTypeScriptCheck(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(false);
      expect(result.output).toBe("TypeScript compilation errors");
    });

    it("should clean up temp config on error", () => {
      const stagedFiles = ["src/test.ts"];
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: "Command failed",
      });

      runTypeScriptCheck(mockProjectRoot, stagedFiles);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it("should filter files correctly", () => {
      const mixedFiles = [
        "src/test.ts",
        "src/test.tsx",
        "src/test.js",
        "src/test.jsx",
        "README.md",
        "config.json",
        "styles.css",
      ];

      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: true,
        output: "TypeScript check passed",
      });

      const result = runTypeScriptCheck(mockProjectRoot, mixedFiles);

      expect(result.success).toBe(true);
      // Should only process TypeScript/JavaScript files
      expect(commandUtils.execCommand).toHaveBeenCalledWith(
        "npx tsc --noEmit --project tsconfig.staged.json",
        mockProjectRoot,
      );
    });

    it("should handle cleanup errors gracefully", () => {
      const stagedFiles = ["src/test.ts"];
      vi.mocked(commandUtils.execCommand).mockReturnValue({
        success: false,
        output: "Command failed",
      });
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error("Cleanup failed");
      });

      const result = runTypeScriptCheck(mockProjectRoot, stagedFiles);

      expect(result.success).toBe(false);
      // Should handle cleanup error gracefully
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });
});
