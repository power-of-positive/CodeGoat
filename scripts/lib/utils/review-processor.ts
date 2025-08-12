/**
 * Main review orchestration
 */

import * as fs from "fs";
import * as path from "path";
import { findProjectRoot } from "./review-utils";
import { generateLlmReviewComments } from "../llm/llm-review-generator";
import { checkPlaywrightCoverage } from "../playwright-coverage";
import { analyzeLlmReviewSeverity } from "../severity/severity-analyzer";
import { PrecommitResult } from "./utils";
import { REVIEW_FILE_NAME } from "./constants";

/**
 * Perform comprehensive code review on specified files
 * @param files - File list string
 * @returns Combined review comments
 */
export async function performCodeReview(files: string): Promise<string> {
  const projectRoot = findProjectRoot();

  // Generate comprehensive LLM review comments for staged files only
  await generateLlmReviewComments(projectRoot);

  // Perform automated checks
  let reviewComments = "";
  reviewComments += checkPlaywrightCoverage(files);

  // Analyze LLM review for severity (only for staged files)
  const llmReviewPath = path.join(projectRoot, "code-review-comments.tmp");
  if (fs.existsSync(llmReviewPath)) {
    reviewComments += analyzeLlmReviewSeverity(llmReviewPath);
  }

  return reviewComments;
}

// Commonly used functions for backward compatibility

/**
 * Determine if Claude should be blocked by severity issues
 */
export function shouldBlockClaude(severityIssues: string): boolean {
  return /HIGH:|MEDIUM:/.test(severityIssues);
}

/**
 * Create block message for review issues
 */
function createBlockMessage(reviewComments: string): string {
  return `Code review identified medium or high severity issues that require attention:

${reviewComments}

Review the generated code review comments in: code-review-comments.tmp

Address these issues before Claude can continue:
- Resolve technical debt and code quality issues
- Address security or performance concerns
- Follow clean code principles

Note: File length violations are handled by ESLint's max-lines rule`;
}

/**
 * Process review results and return decision
 */
export function processReviewResults(reviewComments: string): PrecommitResult {
  if (shouldBlockClaude(reviewComments)) {
    return { decision: "block", reason: createBlockMessage(reviewComments) };
  }

  const feedback = reviewComments.trim()
    ? `Code review completed with minor recommendations:\n\n${reviewComments}\n\nReview details saved to: ${REVIEW_FILE_NAME}\n\nThese are low-priority items that don't block Claude but should be addressed when convenient.`
    : `Code review completed - no issues detected. Review comments saved to ${REVIEW_FILE_NAME}`;

  return { decision: "approve", feedback };
}
