/**
 * Tests for code-results.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { collectCodeResults } from "./code-results";
import { StagedFiles } from "../files/staged-files";
import * as frontendChecks from "./frontend-checks";
import * as backendChecks from "./backend-checks";
import * as scriptChecks from "./script-checks";

vi.mock("./frontend-checks");
vi.mock("./backend-checks");
vi.mock("./script-checks");

describe("code-results", () => {
  const mockProjectRoot = "/test/project";
  const mockStagedFiles: StagedFiles = {
    frontendFiles: [],
    backendFiles: [],
    scriptFiles: [],
    allFiles: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("collectCodeResults", () => {
    it("should return success when no files to check", async () => {
      // Mock all check modules to return success
      vi.mocked(frontendChecks.runFrontendChecks).mockResolvedValue({
        failed: false,
        output: "",
      });
      vi.mocked(backendChecks.runBackendChecks).mockReturnValue({
        failed: false,
        output: "",
      });
      vi.mocked(scriptChecks.runScriptChecks).mockResolvedValue({
        failed: false,
        output: "",
      });

      const result = await collectCodeResults(mockProjectRoot, mockStagedFiles);

      expect(result.failed).toBe(false);
      expect(result.output).toBe("");
    });

    it("should handle check failures properly", async () => {
      const mockStagedFilesWithFiles: StagedFiles = {
        frontendFiles: ["src/App.tsx"],
        backendFiles: [],
        scriptFiles: [],
        allFiles: ["src/App.tsx"],
      };

      // Mock frontend checks to fail
      vi.mocked(frontendChecks.runFrontendChecks).mockResolvedValue({
        failed: true,
        output: "Frontend linting failed",
      });
      vi.mocked(backendChecks.runBackendChecks).mockReturnValue({
        failed: false,
        output: "",
      });
      vi.mocked(scriptChecks.runScriptChecks).mockResolvedValue({
        failed: false,
        output: "",
      });

      const result = await collectCodeResults(
        mockProjectRoot,
        mockStagedFilesWithFiles,
      );

      expect(result.failed).toBe(true);
      expect(result.output).toContain("Frontend checks failed");
      expect(result.output).toContain("Frontend linting failed");
    });

    it("should handle exceptions in try-catch", async () => {
      const mockStagedFilesWithFiles: StagedFiles = {
        frontendFiles: ["src/App.tsx"],
        backendFiles: [],
        scriptFiles: [],
        allFiles: ["src/App.tsx"],
      };

      // Mock frontend checks to throw an error
      vi.mocked(frontendChecks.runFrontendChecks).mockRejectedValue(
        new Error("Mock error"),
      );
      vi.mocked(backendChecks.runBackendChecks).mockReturnValue({
        failed: false,
        output: "",
      });
      vi.mocked(scriptChecks.runScriptChecks).mockResolvedValue({
        failed: false,
        output: "",
      });

      const result = await collectCodeResults(
        mockProjectRoot,
        mockStagedFilesWithFiles,
      );

      expect(result.failed).toBe(true);
      expect(result.output).toContain(
        "Code check collection error: Mock error",
      );
    });

    it("should handle successful checks", async () => {
      const mockStagedFilesWithFiles: StagedFiles = {
        frontendFiles: ["src/App.tsx"],
        backendFiles: ["src/main.rs"],
        scriptFiles: ["build.ts"],
        allFiles: ["src/App.tsx", "src/main.rs", "build.ts"],
      };

      // Mock all check modules to succeed
      vi.mocked(frontendChecks.runFrontendChecks).mockResolvedValue({
        failed: false,
        output: "",
      });
      vi.mocked(backendChecks.runBackendChecks).mockReturnValue({
        failed: false,
        output: "",
      });
      vi.mocked(scriptChecks.runScriptChecks).mockResolvedValue({
        failed: false,
        output: "",
      });

      const result = await collectCodeResults(
        mockProjectRoot,
        mockStagedFilesWithFiles,
      );

      expect(result.failed).toBe(false);
      expect(result.output).toBe("");
    });
  });
});
