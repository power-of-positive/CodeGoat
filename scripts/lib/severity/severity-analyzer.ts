/**
 * Code review severity analysis and decision making
 * Uses structured JSON data from OpenAI structured outputs
 */

import { PrecommitResult } from "../utils/utils";
import { ReviewComments } from "../utils/types";
import { REVIEW_FILE_NAME } from "../utils/constants";
import { analyzeLlmReviewSeverity } from "./severity-parser";
import {
  shouldBlockClaude,
  createBlockMessage,
} from "./severity-analysis-core";

// Re-export functions for backward compatibility
export { analyzeLlmReviewSeverity, shouldBlockClaude };

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

/**
 * Process structured review results using JSON format
 */
export function processStructuredReviewResults(
  reviewComments: ReviewComments,
): PrecommitResult {
  // Check for blocking issues in structured data
  const hasBlockingIssues = Object.entries(reviewComments).some(
    ([, comments]) => {
      if (typeof comments === "string") {
        return shouldBlockClaude(comments);
      }
      // For structured data, check if any files have blocking issues
      return comments.files?.some((file) => file.result.hasBlockingIssues);
    },
  );

  if (hasBlockingIssues) {
    const blockingStages = Object.entries(reviewComments)
      .filter(([, comments]) => {
        if (typeof comments === "string") {
          return shouldBlockClaude(comments);
        }
        return comments.files?.some((file) => file.result.hasBlockingIssues);
      })
      .map(([stage]) => stage);

    const reason = `Code review found blocking issues in: ${blockingStages.join(", ")}\n\nPlease address these critical issues before committing.`;
    return { decision: "block", reason };
  }

  // Generate feedback summary for non-blocking issues
  const stageNames = Object.keys(reviewComments);
  const feedback =
    stageNames.length > 0
      ? `Code review completed for stages: ${stageNames.join(", ")}\n\nReview details saved to: ${REVIEW_FILE_NAME}\n\nAll checks passed with minor recommendations.`
      : `Code review completed - no issues detected. Review comments saved to ${REVIEW_FILE_NAME}`;

  return { decision: "approve", feedback };
}
