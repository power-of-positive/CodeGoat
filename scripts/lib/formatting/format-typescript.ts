/**
 * TypeScript formatting operations
 */

import * as fs from "fs";
import * as path from "path";
import { validateDirectoryExists } from "../utils/validation-utils";
import { CheckResult } from "../utils/types";
import {
  createSuccessResult,
  createFailureResult,
} from "../utils/result-utils";
import { execCommand } from "../utils/command-utils";
import { filterTsFiles } from "./format-file-filters";

/**
 * Create temporary TypeScript config for staged files only
 */
function createTempTsConfig(
  projectRoot: string,
  stagedFiles: string[],
): string {
  const tempConfigPath = path.join(projectRoot, "tsconfig.staged.json");
  const config = {
    extends: "./tsconfig.json",
    include: stagedFiles,
  };

  fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));
  return tempConfigPath;
}

/**
 * Execute TypeScript check command and handle cleanup
 */
function executeTypeScriptCheck(
  projectRoot: string,
  tempConfigPath: string,
): CheckResult {
  try {
    const result = execCommand(
      "npx tsc --noEmit --project tsconfig.staged.json",
      projectRoot,
    );

    // Always clean up temp file
    try {
      fs.unlinkSync(tempConfigPath);
    } catch (cleanupError) {
      // Log cleanup error but don't fail the check
      console.warn("Failed to cleanup temp TypeScript config:", cleanupError);
    }

    return result;
  } catch (error) {
    // Ensure cleanup even on error
    try {
      fs.unlinkSync(tempConfigPath);
    } catch (cleanupError) {
      // Ignore cleanup errors when command already failed
    }

    return createFailureResult(
      `TypeScript check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Run TypeScript type checking for staged files only
 */
export function runTypeScriptCheck(
  projectRoot: string,
  stagedFiles: string[],
): CheckResult {
  console.log("📐 Running TypeScript type checking on staged files...");
  validateDirectoryExists(projectRoot);

  const tsFiles = filterTsFiles(stagedFiles);
  if (tsFiles.length === 0) {
    return createSuccessResult("No TypeScript/JavaScript files to check");
  }

  const tempConfigPath = createTempTsConfig(projectRoot, tsFiles);
  return executeTypeScriptCheck(projectRoot, tempConfigPath);
}
