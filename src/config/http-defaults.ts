/**
 * Default HTTP configuration constants to reduce duplication
 */

export const DEFAULT_HTTP_CONFIG = {
  validateStatus: () => true,
  timeout: 30000,
  maxRedirects: 5,
} as const;

export const DEFAULT_REQUEST_TIMEOUT = 30000;
export const DEFAULT_IDLE_TIMEOUT = 60000;
