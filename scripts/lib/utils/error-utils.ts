/**
 * Standardized error handling utilities for consistent error processing
 */

/**
 * Standard error interface for all error handling
 */
export interface StandardError {
  message: string;
  code?: string | number;
  stack?: string;
  cause?: unknown;
}

/**
 * Convert unknown error to standardized error format
 */
export function standardizeError(error: unknown): StandardError {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      // Note: error.cause requires ES2022+ target
      cause: "cause" in error ? error.cause : undefined,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error && typeof error === "object" && "message" in error) {
    return {
      message: String(error.message),
      code: "code" in error ? String(error.code) : undefined,
      stack: "stack" in error ? String(error.stack) : undefined,
    };
  }

  return { message: String(error) || "Unknown error" };
}

/**
 * Create error result with consistent formatting
 */
export function createErrorResult(
  error: unknown,
  context?: string,
): StandardError {
  const standardError = standardizeError(error);

  return {
    ...standardError,
    message: context
      ? `${context}: ${standardError.message}`
      : standardError.message,
  };
}

/**
 * Log error with consistent format
 */
export function logError(error: unknown, context?: string): void {
  const standardError = createErrorResult(error, context);
  console.error(
    `❌ Error${context ? ` (${context})` : ""}: ${standardError.message}`,
  );

  if (standardError.stack && process.env.NODE_ENV === "development") {
    console.error(standardError.stack);
  }
}

/**
 * Type guard to check if value is an error-like object
 */
export function isErrorLike(value: unknown): value is { message: string } {
  return (
    value !== null &&
    typeof value === "object" &&
    "message" in value &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}

/**
 * Safe error message extraction with fallback
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = "Unknown error",
): string {
  const standardError = standardizeError(error);
  return standardError.message || fallback;
}
