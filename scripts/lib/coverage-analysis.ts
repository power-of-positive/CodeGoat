/**
 * Test coverage analysis utilities - Vitest coverage validation
 */
import * as path from "path";
import * as fs from "fs";
import { buildCoverageCommand, executeCoverage } from "./coverage-helpers";

const defaultLogger = { log: console.log, error: console.error };

interface CoverageOptions {
  logger?: typeof defaultLogger;
  timeout?: number;
  scriptsDir?: string;
  changedFiles?: string[];
}

/**
 * Validate that scripts directory exists and is a directory
 */
function validateScriptsDir(scriptsDir: string): void {
  if (!fs.existsSync(scriptsDir) || !fs.statSync(scriptsDir).isDirectory()) {
    throw new Error(`Invalid scripts directory: ${scriptsDir}`);
  }
}

/**
 * Get the appropriate vitest command for coverage
 */
function getCoverageCommand(scriptsDir: string): string {
  const vitestPath = path.join(scriptsDir, "node_modules", ".bin", "vitest");
  return fs.existsSync(vitestPath) ? vitestPath : "npx vitest";
}

/**
 * Handle coverage execution errors with proper formatting
 */
function handleCoverageError(error: unknown, logger: typeof defaultLogger) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const fullErrorInfo =
    error instanceof Error && error.stack
      ? `${errorMsg}\nStack: ${error.stack}`
      : errorMsg;
  logger.error(`Coverage analysis failed: ${errorMsg}`);
  return {
    failed: true,
    output: `Coverage analysis failed: ${errorMsg}`,
    debug: fullErrorInfo,
  };
}

/**
 * Run script coverage analysis with comprehensive error handling
 */
export function runScriptCoverage(options: CoverageOptions = {}) {
  const {
    logger = defaultLogger,
    timeout = 30000,
    scriptsDir: customScriptsDir,
    changedFiles = [],
  } = options;

  // Prevent recursive coverage execution
  if (process.env.RUNNING_COVERAGE === "true") {
    logger.log("📊 Coverage already running, skipping to prevent recursion");
    return {
      failed: false,
      output: "Coverage check skipped (already running)",
    };
  }

  logger.log("📊 Running full repository coverage analysis...");

  try {
    const scriptsDir = customScriptsDir || path.resolve(__dirname, "..");
    validateScriptsDir(scriptsDir);
    const command = getCoverageCommand(scriptsDir);
    const { command: coverageCommand, shouldSkip } = buildCoverageCommand(
      command,
      changedFiles,
      scriptsDir,
      logger,
    );

    if (shouldSkip) {
      return {
        failed: false,
        output: "Coverage skipped - no test files for changed files",
      };
    }

    return executeCoverage(coverageCommand, scriptsDir, timeout, logger);
  } catch (error) {
    return handleCoverageError(error, logger);
  }
}
