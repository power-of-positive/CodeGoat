/**
 * Safe command execution utilities
 */

import { execSync } from 'child_process';
import { validateInput, validateDirectoryExists } from './validation-utils';
import { CheckResult, CommandError } from './types';
import { createSuccessResult, createFailureResult } from './result-utils';

/**
 * Execute a command safely with comprehensive validation and error handling
 */
export function execCommand(
  command: string,
  cwd?: string,
  timeout = 120000,
  env?: Record<string, string>
): CheckResult {
  try {
    validateInput(command, 'command');
    if (cwd) {
      validateInput(cwd, 'path');
      validateDirectoryExists(cwd);
    }

    const output = execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout,
      env: env ? { ...process.env, ...env } : process.env,
    });

    return createSuccessResult(output.toString());
  } catch (error: unknown) {
    return createFailureResult(formatError(error));
  }
}

/**
 * Sanitize error messages to prevent sensitive data exposure
 */
function sanitizeError(errorText: string): string {
  return (
    errorText
      // Remove API keys
      .replace(/OPENAI_API_KEY=[\w-]+/g, 'OPENAI_API_KEY=***')
      .replace(/API_KEY=[\w-]+/g, 'API_KEY=***')
      // Remove user paths
      .replace(/\/Users\/[^/\s]+/g, '/Users/***')
      .replace(/\/home\/[^/\s]+/g, '/home/***')
      // Remove potential tokens and secrets
      .replace(/[a-zA-Z0-9_-]{32,}/g, match =>
        match.length > 8 ? match.substring(0, 4) + '***' + match.substring(match.length - 4) : match
      )
      // Remove environment variable assignments
      .replace(/\b[A-Z_]+=[^\s]+/g, match => {
        const [key] = match.split('=');
        return `${key}=***`;
      })
  );
}

/**
 * Format error with comprehensive information extraction and sanitization
 */
function formatError(error: unknown): string {
  if (isCommandError(error)) {
    const parts = [
      error.stdout ? sanitizeError(error.stdout) : null,
      error.stderr ? sanitizeError(error.stderr) : null,
      error.message ? sanitizeError(error.message) : null,
      error.code ? `Exit code: ${error.code}` : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join('\n') : 'Unknown error';
  }

  if (error instanceof Error) {
    return sanitizeError(error.message);
  }

  return sanitizeError(String(error)) || 'Unknown error';
}

/**
 * Type guard for command error objects
 */
function isCommandError(error: unknown): error is CommandError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('stdout' in error || 'stderr' in error || 'message' in error || 'code' in error)
  );
}
