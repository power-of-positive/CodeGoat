/**
 * Shared utilities for formatting operations
 */

import { execCommand } from "../utils/command-utils";
import { CheckResult } from "../utils/types";
import { createSuccessResult } from "../utils/result-utils";

/**
 * Re-stage files after formatting
 */
export function restageFiles(
  projectRoot: string,
  files: string[],
): CheckResult {
  if (files.length === 0) {
    return createSuccessResult("No files to re-stage");
  }

  return execCommand(
    `git add ${files.map((f) => `"${f}"`).join(" ")}`,
    projectRoot,
  );
}
