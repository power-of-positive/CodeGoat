/**
 * Model-related utility functions
 */

/**
 * Extract the model name from various model formats
 * @param model The model identifier
 * @returns Clean model name
 */
export function extractModelName(model: string): string {
  // For OpenRouter models, remove the "openrouter/" prefix but keep the rest
  if (model.startsWith('openrouter/')) {
    return model.replace('openrouter/', '');
  }

  // For other models with provider prefixes, extract just the model name
  if (model.includes('/')) {
    return model.split('/').pop() || model;
  }

  return model;
}

/**
 * Determine the provider from a model identifier
 * @param model The model identifier
 * @returns Provider name
 */
export function getProviderFromModel(model: string): string {
  if (model.startsWith('anthropic/')) {
    return 'anthropic';
  }
  if (model.startsWith('openrouter/')) {
    return 'openrouter';
  }
  if (model.startsWith('openai/') || !model.includes('/')) {
    return 'openai';
  }
  return 'unknown';
}

/**
 * Get the target URL for a model
 * @param model The model identifier
 * @returns Target URL for the model
 */
export function getTargetUrl(model: string): string {
  if (model.startsWith('anthropic/')) {
    return 'https://api.anthropic.com/v1/messages';
  }

  if (model.startsWith('openrouter/')) {
    return 'https://openrouter.ai/api/v1/chat/completions';
  }

  // Default to OpenAI
  return 'https://api.openai.com/v1/chat/completions';
}

/**
 * Get API key from environment variable specification
 * @param apiKeySpec The API key specification (e.g., "os.environ/API_KEY")
 * @returns API key or null if not found
 */
export function getApiKey(apiKeySpec: string): string | null {
  if (apiKeySpec.startsWith('os.environ/')) {
    const envVar = apiKeySpec.replace('os.environ/', '');
    return process.env[envVar] || null;
  }

  // If it doesn't start with os.environ/, assume it's the key itself
  return apiKeySpec || null;
}

/**
 * Build proxy headers for a request with model-specific configuration
 * @param model The model identifier
 * @param apiKey The API key to use
 * @param originalHeaders Original request headers
 * @returns Headers object for the proxy request
 */
export function buildProxyHeaders(
  model: string,
  apiKey: string,
  originalHeaders: Record<string, string | string[] | undefined>
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'proxy-server',
  };

  // Set provider-specific authentication and headers
  if (model.startsWith('openrouter/')) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = 'https://localhost:3000';
  } else if (model.startsWith('anthropic/')) {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // Forward specific headers
  const headersToForward = ['x-request-id', 'user-agent'];
  headersToForward.forEach(header => {
    const value = originalHeaders[header.toLowerCase()];
    if (typeof value === 'string') {
      headers[header] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      headers[header] = value[0];
    }
  });

  return headers;
}
