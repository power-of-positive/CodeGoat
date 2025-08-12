import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStagedFiles } from "../files/staged-files";
import { execCommand } from "./command-utils";

vi.mock("./command-utils", () => ({ execCommand: vi.fn() }));

describe("staged-files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStagedFiles", () => {
    it("should return empty arrays when no staged files", () => {
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: "",
      });

      const result = getStagedFiles("/test/project");

      expect(result).toEqual({
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      });
    });

    it("should categorize files correctly", () => {
      const gitOutput = `frontend/src/App.tsx\nfrontend/components/Button.ts\nfrontend/utils/helper.js\nfrontend/styles/main.css\nbackend/src/main.rs\nbackend/tests/integration.rs\nbackend/Cargo.toml\nscripts/build.ts\nscripts/deploy.js\nscripts/config.json`;
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: gitOutput,
      });

      const result = getStagedFiles("/test/project");

      expect(result.frontendFiles).toEqual([
        "frontend/src/App.tsx",
        "frontend/components/Button.ts",
        "frontend/utils/helper.js",
      ]);
      expect(result.backendFiles).toEqual([
        "backend/src/main.rs",
        "backend/tests/integration.rs",
      ]);
      expect(result.scriptFiles).toEqual([
        "scripts/build.ts",
        "scripts/deploy.js",
      ]);
      expect(result.frontendFiles).not.toContain("frontend/styles/main.css");
      expect(result.backendFiles).not.toContain("backend/Cargo.toml");
      expect(result.scriptFiles).not.toContain("scripts/config.json");
    });

    it("should include all files in allFiles", () => {
      const gitOutput = `frontend/App.tsx
backend/main.rs
scripts/build.ts
README.md`;
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: gitOutput,
      });

      const result = getStagedFiles("/test/project");

      expect(result.allFiles).toEqual([
        "frontend/App.tsx",
        "backend/main.rs",
        "scripts/build.ts",
        "README.md",
      ]);
    });

    it("should handle mixed file types correctly", () => {
      const gitOutput = `frontend/src/App.tsx
backend/src/main.rs
scripts/lib/utils.ts
docs/README.md`;
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: gitOutput,
      });

      const result = getStagedFiles("/test/project");

      expect(result.frontendFiles).toEqual(["frontend/src/App.tsx"]);
      expect(result.backendFiles).toEqual(["backend/src/main.rs"]);
      expect(result.scriptFiles).toEqual(["scripts/lib/utils.ts"]);
      expect(result.allFiles).toEqual([
        "frontend/src/App.tsx",
        "backend/src/main.rs",
        "scripts/lib/utils.ts",
        "docs/README.md",
      ]);
    });

    it("should handle edge cases and errors", () => {
      // Test empty lines filtering
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: `frontend/App.tsx\n\nbackend/main.rs\n\nscripts/build.ts`,
      });
      let result = getStagedFiles("/test/project");
      expect(result.allFiles).toEqual([
        "frontend/App.tsx",
        "backend/main.rs",
        "scripts/build.ts",
      ]);

      // Test error handling - command returns failure
      vi.mocked(execCommand).mockReturnValue({
        success: false,
        output: "Git not found",
      });
      result = getStagedFiles("/test/project");
      expect(result).toEqual({
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      });

      // Test empty output
      vi.mocked(execCommand).mockReturnValue({
        success: true,
        output: "",
      });
      result = getStagedFiles("/test/project");
      expect(result).toEqual({
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      });
    });
  });
});
