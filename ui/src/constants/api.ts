/**
 * API and service constants
 * Centralized location for all URLs, timeouts, and API-related constants
 */

// Base URLs for different services
export const API_BASE_URL = '/api';

// Provider API endpoints
export const PROVIDER_URLS = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
} as const;

// Provider documentation/info URLs
export const PROVIDER_INFO_URLS = {
  openrouter: {
    base: 'https://openrouter.ai',
    models: 'https://openrouter.ai/models',
  },
} as const;

// Query timeouts and intervals (in milliseconds)
export const QUERY_CONFIG = {
  defaultStaleTime: 30000, // 30 seconds
  defaultRefetchInterval: 30000, // 30 seconds
} as const;

// Form validation constants
export const FORM_LIMITS = {
  maxTimeout: 300000, // 5 minutes in milliseconds
} as const;

// Provider options for forms
export const PROVIDER_OPTIONS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'other', label: 'Other' },
] as const;

export type ProviderType = keyof typeof PROVIDER_URLS | 'other';