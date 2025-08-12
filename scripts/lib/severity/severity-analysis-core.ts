/**
 * Core severity analysis functions
 */

import { StructuredReviewData } from "../utils/types";

/**
 * Analyze structured LLM review data for severity issues
 */
export function analyzeStructuredReview(
  reviewData: StructuredReviewData,
): string {
  const severityIssues: string[] = [];

  // Check for high severity issues
  const highSeverityFiles = reviewData.files.filter(
    (f) => f.result.severity === "high",
  );
  if (highSeverityFiles.length > 0) {
    severityIssues.push(
      `HIGH: ${highSeverityFiles.length} file(s) with critical issues detected`,
    );
    highSeverityFiles.forEach((file) => {
      if (file.result.issues.length > 0) {
        severityIssues.push(
          `  - ${file.file}: ${file.result.issues.join(", ")}`,
        );
      }
    });
  }

  // Check for medium severity issues
  const mediumSeverityFiles = reviewData.files.filter(
    (f) => f.result.severity === "medium",
  );
  if (mediumSeverityFiles.length > 0) {
    severityIssues.push(
      `MEDIUM: ${mediumSeverityFiles.length} file(s) with quality issues detected`,
    );
    mediumSeverityFiles.forEach((file) => {
      if (file.result.issues.length > 0) {
        severityIssues.push(
          `  - ${file.file}: ${file.result.issues.join(", ")}`,
        );
      }
    });
  }

  // Check for blocking issues flag
  const blockingFiles = reviewData.files.filter(
    (f) => f.result.hasBlockingIssues,
  );
  if (blockingFiles.length > 0) {
    severityIssues.push(
      `BLOCKING: ${blockingFiles.length} file(s) with issues that block deployment`,
    );
  }

  return severityIssues.join("\n");
}

/**
 * Validate structured review data format
 */
export function validateReviewData(
  data: unknown,
): data is StructuredReviewData {
  if (!data || typeof data !== "object") return false;

  const reviewData = data as Record<string, unknown>;

  return (
    Array.isArray(reviewData.files) &&
    typeof reviewData.summary === "object" &&
    reviewData.summary !== null
  );
}

/**
 * Determine if Claude should be blocked by severity issues
 */
export function shouldBlockClaude(severityIssues: string): boolean {
  return /HIGH:|MEDIUM:/.test(severityIssues);
}

/**
 * Create block message for review issues
 */
export function createBlockMessage(reviewComments: string): string {
  return `Code review identified medium or high severity issues that require attention:

${reviewComments}

Review the generated code review comments in: code-review-comments.tmp

Address these issues before Claude can continue:
- Resolve technical debt and code quality issues
- Address security or performance concerns
- Follow clean code principles

Note: File length violations are handled by ESLint's max-lines rule`;
}
