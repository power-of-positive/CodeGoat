/**
 * Backend-specific check runners with improved logging
 */
import { StagedFiles } from "../files/staged-files";
import { runRustFormatting, runRustLinting } from "../runners/rust-runners";
import { validateStagedFiles } from "../checks/check-utils";

/**
 * Run backend-specific checks (Rust format, clippy)
 */
export function runBackendChecks(
  projectRoot: string,
  stagedFiles: StagedFiles,
): { failed: boolean; output: string } {
  try {
    validateStagedFiles(stagedFiles);
    if (stagedFiles.backendFiles.length === 0) {
      console.log("ℹ️ No backend files to check");
      return { failed: false, output: "" };
    }
    console.log("🔍 Starting backend checks...");
    const backendChecks = [
      {
        runner: runRustFormatting,
        name: "RUST FORMAT FAILURES",
        label: "Rust Formatting",
      },
      {
        runner: runRustLinting,
        name: "RUST LINT FAILURES",
        label: "Rust Linting",
      },
    ];

    for (const { runner, name, label } of backendChecks) {
      console.log(`📋 Running ${label}...`);
      const result = runner(projectRoot);
      if (!result.success) {
        console.log(`❌ ${label} failed`);
        return { failed: true, output: `${name}:\n${result.output}` };
      }
      console.log(`✅ ${label} passed`);
    }
    return { failed: false, output: "" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Backend check error: ${errorMsg}`);
    return { failed: true, output: `Backend check error: ${errorMsg}` };
  }
}
