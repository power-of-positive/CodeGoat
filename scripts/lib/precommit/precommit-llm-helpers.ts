/**
 * LLM review precommit helper utilities
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrecommitResult } from '../utils/utils';

// Constants
const SECRET_PREFIX_LENGTH = 4;
const SECRET_SUFFIX_LENGTH = 4;
const MIN_SECRET_LENGTH = 8;
const MIN_SECRET_DETECTION_LENGTH = 32;

/**
 * Sanitize error messages to prevent sensitive data exposure
 */
function sanitizeErrorMessage(message: string): string {
  return (
    message
      // Remove API keys
      .replace(/OPENAI_API_KEY[=:]\s*[\w-]+/gi, 'OPENAI_API_KEY=***')
      .replace(/API_KEY[=:]\s*[\w-]+/gi, 'API_KEY=***')
      // Remove user paths
      .replace(/\/Users\/[^/\s]+/g, '/Users/***')
      .replace(/\/home\/[^/\s]+/g, '/home/***')
      // Remove potential secrets (long alphanumeric strings)
      .replace(new RegExp(`\\b[a-zA-Z0-9_-]{${MIN_SECRET_DETECTION_LENGTH},}\\b`, 'g'), match =>
        match.length > MIN_SECRET_LENGTH
          ? match.substring(0, SECRET_PREFIX_LENGTH) +
            '***' +
            match.substring(match.length - SECRET_SUFFIX_LENGTH)
          : match
      )
  );
}

export type LlmReviewResult =
  | { status: 'skipped'; reason: string }
  | { status: 'success' }
  | { status: 'blocked'; result: PrecommitResult }
  | { status: 'error'; error: string; result: PrecommitResult };

export interface ReviewResult {
  blocked: boolean;
  output?: string;
}

/**
 * Validate input parameters for LLM review process
 */
export function validateInputs(projectRoot: string, allOutput: string): void {
  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new Error('Invalid projectRoot: must be non-empty string');
  }
  if (typeof allOutput !== 'string') {
    throw new Error('Invalid allOutput: must be string');
  }

  // Check for dangerous patterns in the original input
  const dangerousPatterns = [
    /\0/, // Null bytes
    /%00/i, // URL encoded null
    /%2e%2e/i, // URL encoded ..
    /%2f|%5c/i, // URL encoded slashes
    /\$\{.*\}/, // Variable injection
    /`.*`/, // Command substitution
    /\||&&|;/, // Command chaining
  ];

  // Check for path traversal patterns (both Unix and Windows style)
  const pathTraversalPatterns = [
    /(\.\.\/|\.\.\\){3,}/, // 3+ levels up
    /\/\.\.[/\\]/, // /../ or /..\  in the middle
    /\\\.\.[/\\]/, // \..\ or \../ in Windows paths
  ];

  if (
    dangerousPatterns.some(pattern => pattern.test(projectRoot)) ||
    pathTraversalPatterns.some(pattern => pattern.test(projectRoot))
  ) {
    throw new Error('Invalid projectRoot: contains potentially dangerous patterns');
  }

  const resolvedPath = path.resolve(projectRoot);
  // Removed unused normalizedPath variable

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`ProjectRoot does not exist: ${resolvedPath}`);
  }
}

/**
 * Check if error is transient and should not block commit permanently
 */
export function isTransientError(error: Error): boolean {
  // Empty or missing message should not be considered transient
  if (error.message === undefined || error.message === null || error.message === '') {
    return false;
  }

  const transientPatterns = [
    /ENOENT/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /time.*?out/i, // Matches "timeout", "timed out", "time-out", etc.
    /network/i,
    /connection/i,
    /rate.?limit/i,
  ];
  return transientPatterns.some(pattern => pattern.test(error.message));
}

/**
 * Process review result and return appropriate status
 */
export function processReviewResult(llmResult: ReviewResult, allOutput: string): LlmReviewResult {
  if (typeof llmResult.blocked !== 'boolean') {
    console.warn("LLM review result missing 'blocked' property, treating as not blocked");
    return { status: 'success' };
  }

  if (llmResult.blocked) {
    const output =
      typeof llmResult.output === 'string'
        ? sanitizeErrorMessage(llmResult.output)
        : 'Review found issues';

    return {
      status: 'blocked',
      result: {
        decision: 'block',
        reason: sanitizeErrorMessage(
          `Pre-commit checks failed:\n\n${allOutput}${output}\n\n🚫 Fix issues and re-stage files.`
        ),
      },
    };
  }

  return { status: 'success' };
}

/**
 * Handle review errors with proper categorization
 */
export function handleReviewError(error: unknown): LlmReviewResult {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const isTransient = error instanceof Error && isTransientError(error);
  const sanitizedError = sanitizeErrorMessage(errorMsg);

  if (isTransient) {
    console.warn(`⚠️ Transient LLM review error (allowing commit): ${sanitizedError}`);
    return { status: 'success' };
  } else {
    console.warn(`LLM review generation failed: ${sanitizedError}`);
    return { status: 'success' };
  }
}
