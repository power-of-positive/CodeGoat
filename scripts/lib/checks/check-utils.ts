/**
 * Utility functions for running checks
 */

import { StagedFiles } from '../files/staged-files';

/**
 * Validate staged files object structure
 */
export function validateStagedFiles(stagedFiles: unknown): asserts stagedFiles is StagedFiles {
  if (!stagedFiles || typeof stagedFiles !== 'object') {
    throw new Error('Invalid stagedFiles: must be object');
  }
  const files = stagedFiles as Record<string, unknown>;
  if (
    !Array.isArray(files.frontendFiles) ||
    !Array.isArray(files.backendFiles) ||
    !Array.isArray(files.scriptFiles) ||
    !Array.isArray(files.allFiles)
  ) {
    throw new Error('Invalid stagedFiles: missing required arrays');
  }
}

/**
 * Check runner type definition
 */
export interface CheckRunner {
  (projectRoot: string): {
    success: boolean;
    output: string;
  };
}

/**
 * Run a series of checks sequentially, stopping on first failure
 */
export function runChecks(
  projectRoot: string,
  stagedFiles: StagedFiles,
  fileArray: keyof StagedFiles,
  checks: Array<{ runner: CheckRunner; name: string }>,
  errorPrefix: string
) {
  try {
    validateStagedFiles(stagedFiles);
    if (stagedFiles[fileArray].length === 0) {
      return { failed: false, output: '' };
    }

    const results: string[] = [];
    let hasFailure = false;

    for (const { runner, name } of checks) {
      const result = runner(projectRoot);
      if (!result.success) {
        hasFailure = true;
        results.push(`${name}:\n${result.output}`);
        break;
      }
    }

    return { failed: hasFailure, output: results.join('\n\n') };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { failed: true, output: `${errorPrefix} error: ${errorMsg}` };
  }
}
