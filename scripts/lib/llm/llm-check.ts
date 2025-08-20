/**
 * LLM review checking utilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { analyzeLlmReviewSeverity, shouldBlockClaude } from '../severity/severity-analyzer';

/**
 * Check LLM review results with async file operations
 */
export async function checkLlmReview(
  projectRoot: string,
  reviewFileName: string
): Promise<{ blocked: boolean; output: string }> {
  try {
    const reviewFile = path.join(projectRoot, reviewFileName);

    try {
      await fs.access(reviewFile);
    } catch {
      return { blocked: false, output: '' };
    }

    const severityIssues = analyzeLlmReviewSeverity(reviewFile);
    if (shouldBlockClaude(severityIssues)) {
      return {
        blocked: true,
        output: `\nLLM REVIEW BLOCKING ISSUES:\n${severityIssues}\n`,
      };
    }

    return { blocked: false, output: '' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Error checking LLM review: ${errorMsg}`);
    return { blocked: false, output: '' };
  }
}
