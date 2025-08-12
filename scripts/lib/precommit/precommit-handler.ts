/**
 * Pre-commit check handling utilities
 */

import * as fsSync from "fs";
import * as path from "path";
import * as process from "process";
import { findProjectRoot } from "../utils/review-utils";
import { runAllChecks } from "./precommit-checks";
import { getStagedFiles, type StagedFiles } from "../files/staged-files";
import { runTypeScriptCheck } from "../formatting/format-runners";
import { runFormattingSteps } from "../precommit/precommit-formatting";
import { runLlmReviewProcess, REVIEW_FILE_NAME } from "./precommit-llm";
import { PrecommitResult } from "../utils/utils";

export type { PrecommitResult };

/**
 * Validate project root path
 */
function validateProjectRoot(projectRoot: string): void {
  if (!projectRoot || typeof projectRoot !== "string") {
    throw new Error("Invalid project root: must be non-empty string");
  }
  const normalized = path.normalize(path.resolve(projectRoot));
  if (normalized.includes("..") || !fsSync.existsSync(normalized)) {
    throw new Error(`Invalid or non-existent project root: ${projectRoot}`);
  }
}

/**
 * Initialize project environment and return project root
 */
function initializeProjectEnvironment(): string {
  const projectRoot = findProjectRoot();
  validateProjectRoot(projectRoot);
  process.chdir(projectRoot);
  return projectRoot;
}

/**
 * Validate staged files and return early approval if none
 */
function validateStagedFilesStep(projectRoot: string): {
  stagedFiles: StagedFiles;
  shouldEarlyReturn: boolean;
  result?: PrecommitResult;
} {
  const stagedFiles = getStagedFiles(projectRoot);
  if (stagedFiles.allFiles.length === 0) {
    return {
      stagedFiles,
      shouldEarlyReturn: true,
      result: {
        decision: "approve",
        feedback: "No staged files to check - all good!",
      },
    };
  }
  return { stagedFiles, shouldEarlyReturn: false };
}

/**
 * Run formatting and TypeScript checks
 */
function runFormattingAndTypeChecks(
  projectRoot: string,
  allFiles: string[],
): PrecommitResult | null {
  runFormattingSteps(projectRoot, allFiles);

  const tsCheckResult = runTypeScriptCheck(projectRoot, allFiles);
  if (!tsCheckResult.success) {
    return {
      decision: "block",
      reason: `Pre-commit checks failed:\n\nTYPESCRIPT TYPE CHECK FAILURES:\n${tsCheckResult.output}\n\n🚫 Fix issues and re-stage files.`,
    };
  }
  return null;
}

/**
 * Execute main precommit checks including formatting, type checking, and analysis
 */
async function executeMainChecks(
  projectRoot: string,
  stagedFiles: StagedFiles,
): Promise<PrecommitResult | null> {
  const formattingResult = runFormattingAndTypeChecks(
    projectRoot,
    stagedFiles.allFiles,
  );
  if (formattingResult) return formattingResult;

  const { criticalFailure, allOutput, analysisResult } = await runAllChecks(
    projectRoot,
    stagedFiles,
  );
  if (criticalFailure) {
    return {
      decision: "block",
      reason: `Pre-commit checks failed:\n\n${allOutput}\n\n🚫 Fix issues and re-stage files.`,
    };
  }

  if (analysisResult.blocked) {
    return {
      decision: "block",
      reason: `Pre-commit checks failed:\n\n${allOutput + `\n${analysisResult.details}\n`}\n\n🚫 Fix issues and re-stage files.`,
    };
  }

  const llmResult = await runLlmReviewProcess(projectRoot, allOutput);
  if (llmResult) return llmResult;

  return null;
}

/**
 * Main precommit validation function
 */
export async function runPrecommitChecks(): Promise<PrecommitResult> {
  const originalCwd = process.cwd();

  try {
    const projectRoot = initializeProjectEnvironment();
    const { stagedFiles, shouldEarlyReturn, result } =
      validateStagedFilesStep(projectRoot);
    if (shouldEarlyReturn && result) return result;

    const checkResult = await executeMainChecks(projectRoot, stagedFiles);
    if (checkResult) return checkResult;

    return {
      decision: "approve",
      feedback: `All checks passed! Code review comments generated in ${REVIEW_FILE_NAME}`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Precommit check error: ${errorMsg}`);
    return {
      decision: "block",
      reason: `Precommit check execution failed: ${errorMsg}`,
      feedback: "Fix the configuration or file system issues and try again",
    };
  } finally {
    try {
      process.chdir(originalCwd);
    } catch (error) {
      console.warn(`Failed to restore working directory: ${error}`);
    }
  }
}
