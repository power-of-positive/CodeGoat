/**
 * Fallback logic utilities
 */

export interface FallbackCondition {
  enableFallbacks: boolean;
  fallbackOnServerError: boolean;
  fallbackOnContextLength: boolean;
  fallbackOnRateLimit: boolean;
}

/**
 * Check if a response should trigger fallback based on status and response data
 * @param status HTTP status code
 * @param responseData Response data from the API
 * @param conditions Fallback configuration
 * @returns Whether fallback should be triggered
 */
export function shouldFallbackOnError(
  status: number,
  responseData: unknown,
  conditions: FallbackCondition
): boolean {
  // Check if fallbacks are globally disabled
  if (!conditions.enableFallbacks) {
    return false;
  }

  // Network/server errors - check if server error fallbacks are enabled
  if (status === 413 || status >= 500) {
    return conditions.fallbackOnServerError;
  }

  // Context length errors
  if (status === 400 && responseData && typeof responseData === 'object') {
    if (!conditions.fallbackOnContextLength) {
      return false;
    }

    const errorObj = responseData as { error?: { message?: string } };
    const errorMessage = errorObj.error?.message || '';
    const errorLower = errorMessage.toLowerCase();

    // Common model limitation errors that should trigger fallbacks
    const fallbackTriggers = [
      'context length',
      'maximum context length',
      'token limit',
      'too many tokens',
      'exceeds maximum',
      'context window',
      'input too long',
      'message too long',
      'prompt too long',
    ];

    return fallbackTriggers.some(trigger => errorLower.includes(trigger));
  }

  // Rate limits - check if rate limit fallbacks are enabled
  if (status === 429) {
    return conditions.fallbackOnRateLimit;
  }

  return false;
}

/**
 * Extract error message from response data
 * @param responseData Response data that may contain an error
 * @returns Error message string
 */
export function extractErrorMessage(responseData: unknown): string {
  if (!responseData || typeof responseData !== 'object') {
    return 'Unknown error';
  }

  const errorObj = responseData as { error?: { message?: string; type?: string } };

  if (errorObj.error?.message) {
    return errorObj.error.message;
  }

  if (errorObj.error?.type) {
    return `Error type: ${errorObj.error.type}`;
  }

  return 'Unknown error';
}

/**
 * Create a delay promise for exponential backoff
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => globalThis.setTimeout(resolve, ms));
}
