import { Response } from 'express';
import { ILogger } from '../logger-interface';

/**
 * Centralized API error handler to reduce duplicate error handling code
 */
export function handleApiError(
  res: Response,
  logger: ILogger,
  operation: string,
  error: unknown,
  statusCode = 500
): void {
  logger.error(`Failed to ${operation}`, error as Error);
  res.status(statusCode).json({ error: `Failed to ${operation}` });
}

/**
 * Configuration error handler for consistent error messages
 */
export function handleConfigError(operation: string, error: unknown): never {
  const message = error instanceof Error ? error.message : 'Unknown error';
  throw new Error(`Failed to ${operation}: ${message}`);
}
