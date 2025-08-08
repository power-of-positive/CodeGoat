/**
 * Security utilities for handling sensitive data
 */

/**
 * Masks API keys in responses to prevent accidental exposure
 */
export function maskApiKey(apiKey?: string): string {
  return apiKey ? '***' : '';
}

/**
 * Masks multiple sensitive fields in an object
 */
export function maskSensitiveData<T extends Record<string, unknown>>(
  obj: T,
  fieldsToMask: (keyof T)[]
): T {
  const masked = { ...obj };
  fieldsToMask.forEach(field => {
    if (masked[field]) {
      masked[field] = '***' as T[keyof T];
    }
  });
  return masked;
}
