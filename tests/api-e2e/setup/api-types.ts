/**
 * Enhanced API response type for testing
 */
export interface TestApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode: number;
  responseTime: number;
  requestId: string;
}

/**
 * Test API error with enhanced debugging information
 */
export class TestApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any,
    public requestId?: string,
    public responseTime?: number
  ) {
    super(`API Error (${statusCode}): ${message}`);
    this.name = 'TestApiError';
  }
}

/**
 * Request log entry interface
 */
export interface RequestLogEntry {
  requestId: string;
  method: string;
  url: string;
  requestBody?: any;
  responseStatus: number;
  responseBody?: any;
  responseTime: number;
  timestamp: Date;
}

/**
 * Test request log interface (alias for test compatibility)
 */
export interface TestRequestLog {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  requestId: string;
}

/**
 * API Error class for testing
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validation Error class for testing
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public validationErrors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Network Error class for testing
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}