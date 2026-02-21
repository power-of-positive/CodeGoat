// Base API utilities and types

declare global {
  interface Window {
    electronAPI?: {
      platform?: string;
      apiBase?: string;
    };
  }
}

const cleanEnvValue = (value?: string | null): string | undefined =>
  value && value.trim().length > 0 ? value : undefined;

const ELECTRON_API_BASE =
  typeof window !== 'undefined' ? cleanEnvValue(window.electronAPI?.apiBase) : undefined;
const NODE_API_BASE =
  typeof process !== 'undefined'
    ? cleanEnvValue(process.env.VITE_API_BASE_URL) ??
      cleanEnvValue(process.env.API_BASE_URL) ??
      cleanEnvValue(process.env.NEXT_PUBLIC_API_BASE_URL) ??
      (cleanEnvValue(process.env.VITE_API_URL)
        ? `${cleanEnvValue(process.env.VITE_API_URL)!.replace(/\/$/, '')}/api`
        : undefined)
    : undefined;

const API_BASE_URL = ELECTRON_API_BASE ?? NODE_API_BASE ?? '/api';
const DEFAULT_REQUEST_TIMEOUT_MS = 10000; // 10 seconds default timeout

// API response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Base API error
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Base API client with error handling and timeout
export async function apiRequest<T>(
  endpoint: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown; timeout?: number } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const { body, timeout = DEFAULT_REQUEST_TIMEOUT_MS, ...restOptions } = options;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...restOptions.headers,
    },
    signal: controller.signal,
    ...restOptions,
  };

  if (body) {
    config.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
  }

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new APIError(`HTTP error! status: ${response.status}`, response.status, response);
    }

    const data = await response.json();

    if (data.success === false) {
      throw new APIError(data.message || data.error || 'API request failed');
    }

    return data.data || data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof APIError) {
      throw error;
    }

    // Handle timeout/abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError('Request timeout - server took too long to respond', 408);
    }

    throw new APIError(error instanceof Error ? error.message : 'Network request failed');
  }
}

// Helper function to build query parameters
export function buildQueryParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
