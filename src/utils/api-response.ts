/**
 * API Response Utilities
 *
 * Standardized response formats for CodeGoat API
 * Following REST best practices and consistent error handling
 */

/**
 * Standard error codes for API responses
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * API error structure
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, string> | unknown[];
  timestamp: string;
  path: string;
}

/**
 * Error response envelope
 */
export interface ApiErrorResponse {
  error: ApiError;
}

/**
 * Success response envelope for single resources
 */
export interface ApiDataResponse<T> {
  data: T;
  meta?: {
    message?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
  links?: {
    self?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Collection response envelope with pagination
 */
export interface ApiCollectionResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links?: {
    self: string;
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
  };
}

/**
 * Create standardized error response
 *
 * @param code - Machine-readable error code
 * @param message - Human-readable error message
 * @param details - Additional error details (field errors, stack traces, etc.)
 * @param path - Request path where error occurred
 * @returns Standardized error response object
 *
 * @example
 * ```typescript
 * res.status(400).json(
 *   createErrorResponse(
 *     ErrorCode.VALIDATION_ERROR,
 *     'Invalid request body',
 *     { email: 'Invalid email format' },
 *     req.path
 *   )
 * );
 * ```
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, string> | unknown[],
  path?: string
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: path || '',
    },
  };
}

/**
 * Create standardized success response for single resource
 *
 * @param data - Resource data
 * @param meta - Optional metadata (message, timestamps, etc.)
 * @param links - Optional HATEOAS links
 * @returns Standardized data response object
 *
 * @example
 * ```typescript
 * res.json(
 *   createDataResponse(
 *     worker,
 *     { message: 'Worker created successfully' },
 *     { self: `/api/workers/${worker.id}` }
 *   )
 * );
 * ```
 */
export function createDataResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
  links?: Record<string, string>
): ApiDataResponse<T> {
  const response: ApiDataResponse<T> = {
    data,
  };

  if (meta && Object.keys(meta).length > 0) {
    response.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  if (links && Object.keys(links).length > 0) {
    response.links = links;
  }

  return response;
}

/**
 * Create standardized collection response with pagination
 *
 * @param data - Array of resources
 * @param total - Total number of resources across all pages
 * @param page - Current page number (1-indexed)
 * @param perPage - Number of items per page
 * @param baseUrl - Base URL for generating pagination links
 * @returns Standardized collection response with pagination metadata
 *
 * @example
 * ```typescript
 * const workers = await db.worker.findMany({ skip: 0, take: 20 });
 * const total = await db.worker.count();
 *
 * res.json(
 *   createCollectionResponse(
 *     workers,
 *     total,
 *     1,
 *     20,
 *     '/api/workers'
 *   )
 * );
 * ```
 */
export function createCollectionResponse<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
  baseUrl: string
): ApiCollectionResponse<T> {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data,
    meta: {
      total,
      page,
      perPage,
      totalPages,
      hasNext,
      hasPrev,
    },
    links: {
      self: `${baseUrl}?page=${page}&perPage=${perPage}`,
      first: `${baseUrl}?page=1&perPage=${perPage}`,
      last: `${baseUrl}?page=${totalPages}&perPage=${perPage}`,
      next: hasNext ? `${baseUrl}?page=${page + 1}&perPage=${perPage}` : null,
      prev: hasPrev ? `${baseUrl}?page=${page - 1}&perPage=${perPage}` : null,
    },
  };
}

/**
 * Map HTTP status codes to error codes
 */
export const HTTP_STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  422: ErrorCode.VALIDATION_ERROR,
  429: ErrorCode.RATE_LIMITED,
  500: ErrorCode.INTERNAL_ERROR,
  503: ErrorCode.SERVICE_UNAVAILABLE,
};

/**
 * Get error code from HTTP status
 */
export function getErrorCodeFromStatus(status: number): ErrorCode {
  return HTTP_STATUS_TO_ERROR_CODE[status] || ErrorCode.INTERNAL_ERROR;
}
