import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./check-runners", () => ({
  runFrontendLinting: vi.fn(),
  runFrontendTests: vi.fn(),
  runRustFormatting: vi.fn(),
  runRustLinting: vi.fn(),
}));
vi.mock("../analysis/code-analysis", () => ({ runCodeAnalysis: vi.fn() }));
vi.mock("../scripts/script-checks", () => ({ runScriptChecks: vi.fn() }));
vi.mock("../analysis/code-results", () => ({ collectCodeResults: vi.fn() }));
vi.mock("../security/security-runners", () => ({
  runDuplicateCodeDetection: vi.fn(),
  runDeadCodeDetection: vi.fn(),
  runDependencyVulnerabilityCheck: vi.fn(),
}));
vi.mock("../security/security-checks", () => ({
  runSecurityChecks: vi.fn(),
}));

describe("precommit-checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runAllChecks", async () => {
    const { runAllChecks } = await import("./precommit-checks");
    const { runCodeAnalysis } = await import("../analysis/code-analysis");
    const { collectCodeResults } = await import("../analysis/code-results");
    const { runSecurityChecks } = await import("../security/security-checks");

    beforeEach(() => {
      vi.mocked(collectCodeResults).mockResolvedValue({
        failed: false,
        output: "",
      });
      vi.mocked(runSecurityChecks).mockReturnValue({
        securityFailure: false,
        securityOutput:
          "\nSECURITY CHECKS:\nDuplicate Code Detection: ✅ No duplicate code detected\nDead Code Detection: ✅ No dead code detected\nDependency Vulnerabilities: ✅ No dependency vulnerabilities found\n",
      });
    });

    it("should handle code analysis blocking", async () => {
      vi.mocked(runCodeAnalysis).mockResolvedValue({
        blocked: true,
        details: "Critical issues found",
      });

      const stagedFiles = {
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      };
      const result = await runAllChecks("/test/project", stagedFiles);

      expect(result.allOutput).toContain("Critical issues found");
      expect(result.analysisResult.blocked).toBe(true);
    });

    it("should handle code analysis errors", async () => {
      vi.mocked(runCodeAnalysis).mockRejectedValue(
        new Error("Analysis failed"),
      );

      const stagedFiles = {
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      };
      const result = await runAllChecks("/test/project", stagedFiles);

      expect(result.allOutput).toContain(
        "Code analysis error: Analysis failed",
      );
    });

    it("should handle security check failures", async () => {
      delete process.env.SKIP_SECURITY_CHECKS;
      vi.mocked(runCodeAnalysis).mockResolvedValue({
        blocked: false,
        details: "All good",
      });
      vi.mocked(runSecurityChecks).mockReturnValue({
        securityFailure: true,
        securityOutput:
          "\nSECURITY CHECKS:\nDuplicate Code Detection: 🔍 DUPLICATE CODE DETECTED\n",
      });

      const stagedFiles = {
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      };
      const result = await runAllChecks("/test/project", stagedFiles);

      expect(result.criticalFailure).toBe(true);
      expect(result.securityFailure).toBe(true);
      expect(result.allOutput).toContain("SECURITY CHECKS");
    });

    it("should skip security checks when environment variable is set", async () => {
      process.env.SKIP_SECURITY_CHECKS = "true";
      vi.mocked(runCodeAnalysis).mockResolvedValue({
        blocked: false,
        details: "All good",
      });
      vi.mocked(runSecurityChecks).mockReturnValue({
        securityFailure: false,
        securityOutput:
          "\nSECURITY CHECKS SKIPPED: Disabled via SKIP_SECURITY_CHECKS environment variable\n",
      });

      const stagedFiles = {
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      };
      const result = await runAllChecks("/test/project", stagedFiles);

      expect(result.allOutput).toContain("SECURITY CHECKS SKIPPED");

      delete process.env.SKIP_SECURITY_CHECKS;
    });
  });
});
