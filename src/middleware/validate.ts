/**
 * Zod validation middleware for Express routes
 * Provides compile-time type safety and runtime validation
 */
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Validates request body against a Zod schema
 * Returns 400 with detailed errors if validation fails
 *
 * @example
 * router.post('/endpoint',
 *   validateRequest(MyRequestSchema),
 *   async (req, res) => {
 *     // req.body is now typed and validated!
 *   }
 * );
 */
export function validateRequest<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request body
      const validated = await schema.parseAsync(req.body);

      // Replace req.body with validated data (removes unknown fields)
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod errors into a user-friendly response
        const firstError = error.issues[0];
        return res.status(400).json({
          success: false,
          message: firstError?.message || 'Validation failed',
          errors: error.issues.map(e => ({
            path: e.path.join('.') || 'body',
            message: e.message,
          })),
        });
      }

      // Pass unexpected errors to Express error handler
      next(error);
    }
  };
}

/**
 * Validates request params (URL parameters) against a Zod schema
 * Returns 400 with detailed errors if validation fails
 *
 * @example
 * router.get('/workers/:workerId',
 *   validateParams(WorkerParamsSchema),
 *   async (req, res) => {
 *     // req.params is now typed and validated!
 *   }
 * );
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request params
      // Use passthrough to allow extra params that Express may add
      const schemaWithPassthrough = schema instanceof z.ZodObject ? schema.passthrough() : schema;
      const validated = await schemaWithPassthrough.parseAsync(req.params);

      // Merge validated data back into params (preserving any extra Express properties)
      Object.assign(req.params, validated);

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        return res.status(400).json({
          success: false,
          message: firstError?.message || 'Invalid URL parameters',
          errors: error.issues.map(e => ({
            path: e.path.join('.') || 'params',
            message: e.message,
          })),
        });
      }

      next(error);
    }
  };
}

/**
 * Validates request query parameters against a Zod schema
 * Returns 400 with detailed errors if validation fails
 *
 * @example
 * router.get('/workers',
 *   validateQuery(WorkersQuerySchema),
 *   async (req, res) => {
 *     // req.query is now typed and validated!
 *   }
 * );
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request query
      const validated = await schema.parseAsync(req.query);

      // Merge validated data back into query (handles read-only property in tests)
      Object.assign(req.query, validated);

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        return res.status(400).json({
          success: false,
          message: firstError?.message || 'Invalid query parameters',
          errors: error.issues.map(e => ({
            path: e.path.join('.') || 'query',
            message: e.message,
          })),
        });
      }

      next(error);
    }
  };
}
