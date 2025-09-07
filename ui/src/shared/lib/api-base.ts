// Base API utilities and types

const API_BASE_URL = '/api';

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

// Base API client with error handling
export async function apiRequest<T>(
  endpoint: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const { body, ...restOptions } = options;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...restOptions.headers,
    },
    ...restOptions,
  };

  if (body) {
    config.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new APIError(`HTTP error! status: ${response.status}`, response.status, response);
    }

    const data = await response.json();

    if (data.success === false) {
      throw new APIError(data.message || data.error || 'API request failed');
    }

    return data.data || data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
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
