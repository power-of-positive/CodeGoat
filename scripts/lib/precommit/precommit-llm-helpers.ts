/**
 * LLM review precommit helper utilities
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrecommitResult } from '../utils/utils';

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
      .replace(/\b[a-zA-Z0-9_-]{32,}\b/g, match =>
        match.length > 8 ? match.substring(0, 4) + '***' + match.substring(match.length - 4) : match
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

  const resolvedPath = path.resolve(projectRoot);
  const normalizedPath = path.normalize(resolvedPath);
  const securityPatterns = [
    /\.\.[/\\]/,
    /[/\\]\.\.[/\\]/,
    /\0/,
    /%00/i,
    /%2e%2e/i,
    /%2f|%5c/i,
    /\$\{.*\}/,
    /`.*`/,
    /\||&&|;/,
  ];

  if (securityPatterns.some(pattern => pattern.test(normalizedPath))) {
    throw new Error('Invalid projectRoot: contains potentially dangerous patterns');
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`ProjectRoot does not exist: ${resolvedPath}`);
  }
}

/**
 * Check if error is transient and should not block commit permanently
 */
export function isTransientError(error: Error): boolean {
  const transientPatterns = [
    /ENOENT/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /timeout/i,
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
