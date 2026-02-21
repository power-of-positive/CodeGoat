/**
 * Global Error Handler Middleware
 *
 * Centralized error handling for all API routes
 * Converts various error types to standardized API responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ILogger } from '../logger-interface';
import { createErrorResponse, ErrorCode } from '../utils/api-response';

/**
 * HTTP Status Codes
 */
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: Record<string, string> | unknown[]
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create global error handler middleware
 *
 * @param logger - Logger instance for error logging
 * @returns Express error handling middleware
 *
 * @example
 * ```typescript
 * // In src/index.ts
 * import { createErrorHandler } from './middleware/error-handler';
 *
 * // ... after all routes
 * app.use(createErrorHandler(logger));
 * ```
 */
export function createErrorHandler(logger: ILogger) {
  return (error: Error, req: Request, res: Response, _next: NextFunction): void => {
    // Don't log in test environment (reduces noise)
    const shouldLog = process.env.NODE_ENV !== 'test';

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const details = error.issues.reduce(
        (acc, issue) => {
          const path = issue.path.join('.');
          acc[path] = issue.message;
          return acc;
        },
        {} as Record<string, string>
      );

      if (shouldLog) {
        logger.warn?.('Validation error', {
          path: req.path,
          method: req.method,
          details,
        });
      }

      res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Request validation failed',
          details,
          req.path
        )
      );
      return;
    }

    // Handle custom AppError
    if (error instanceof AppError) {
      if (shouldLog && error.statusCode >= 500) {
        logger.error('Application error', error, {
          path: req.path,
          method: req.method,
          statusCode: error.statusCode,
        });
      }

      res.status(error.statusCode).json(
        createErrorResponse(error.code, error.message, error.details, req.path)
      );
      return;
    }

    // Handle common error patterns by message
    const errorMessage = error.message.toLowerCase();

    // Not found errors
    if (errorMessage.includes('not found')) {
      if (shouldLog) {
        logger.warn?.('Resource not found', {
          path: req.path,
          method: req.method,
          message: error.message,
        });
      }

      res.status(HTTP_STATUS.NOT_FOUND).json(
        createErrorResponse(ErrorCode.NOT_FOUND, error.message, undefined, req.path)
      );
      return;
    }

    // Conflict errors
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      if (shouldLog) {
        logger.warn?.('Resource conflict', {
          path: req.path,
          method: req.method,
          message: error.message,
        });
      }

      res.status(HTTP_STATUS.CONFLICT).json(
        createErrorResponse(ErrorCode.CONFLICT, error.message, undefined, req.path)
      );
      return;
    }

    // Unauthorized errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
      if (shouldLog) {
        logger.warn?.('Unauthorized access', {
          path: req.path,
          method: req.method,
          message: error.message,
        });
      }

      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse(ErrorCode.UNAUTHORIZED, error.message, undefined, req.path)
      );
      return;
    }

    // Forbidden errors
    if (errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
      if (shouldLog) {
        logger.warn?.('Forbidden access', {
          path: req.path,
          method: req.method,
          message: error.message,
        });
      }

      res.status(HTTP_STATUS.FORBIDDEN).json(
        createErrorResponse(ErrorCode.FORBIDDEN, error.message, undefined, req.path)
      );
      return;
    }

    // Generic errors - log with full stack trace
    logger.error('Unhandled error', error, {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Don't expose internal error details in production
    const message =
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message || 'An unexpected error occurred';

    const details:  Record<string, string> | undefined =
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            stack: error.stack || '',
            name: error.name,
          };

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, message, details, req.path)
    );
  };
}

/**
 * Async route handler wrapper
 *
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handling middleware
 *
 * @param fn - Async route handler function
 * @returns Wrapped handler that catches errors
 *
 * @example
 * ```typescript
 * router.get('/workers/:id', asyncHandler(async (req, res) => {
 *   const worker = await workerService.getById(req.params.id);
 *   if (!worker) {
 *     throw new AppError(404, ErrorCode.NOT_FOUND, 'Worker not found');
 *   }
 *   res.json(createDataResponse(worker));
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Helper functions to throw common errors
 */
export const throwNotFound = (message: string, details?: Record<string, string>): never => {
  throw new AppError(HTTP_STATUS.NOT_FOUND, ErrorCode.NOT_FOUND, message, details);
};

export const throwBadRequest = (message: string, details?: Record<string, string>): never => {
  throw new AppError(HTTP_STATUS.BAD_REQUEST, ErrorCode.BAD_REQUEST, message, details);
};

export const throwConflict = (message: string, details?: Record<string, string>): never => {
  throw new AppError(HTTP_STATUS.CONFLICT, ErrorCode.CONFLICT, message, details);
};

export const throwUnauthorized = (message: string, details?: Record<string, string>): never => {
  throw new AppError(HTTP_STATUS.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, message, details);
};

export const throwForbidden = (message: string, details?: Record<string, string>): never => {
  throw new AppError(HTTP_STATUS.FORBIDDEN, ErrorCode.FORBIDDEN, message, details);
};

export const throwValidationError = (
  message: string,
  details?: Record<string, string>
): never => {
  throw new AppError(
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ErrorCode.VALIDATION_ERROR,
    message,
    details
  );
};
