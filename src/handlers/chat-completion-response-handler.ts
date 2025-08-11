/**
 * Handles response processing and error formatting for chat completion requests
 */

import { Response } from 'express';
import { ILogger } from '../logger-interface';

export class ChatCompletionResponseHandler {
  constructor(private logger: ILogger) {}

  /**
   * Handles general chat completion errors and sends appropriate error response
   * @param error - The error that occurred
   * @param res - Express response object
   */
  handleChatError(error: unknown, res: Response): void {
    this.logger.error('Chat completion error', error as Error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      error: {
        message: errorMessage,
        type: 'internal_error'
      }
    });
  }

  /**
   * Sends a validation error response
   * @param res - Express response object
   * @param message - Error message
   * @param type - Error type (defaults to 'invalid_request_error')
   */
  sendValidationError(res: Response, message: string, type: string = 'invalid_request_error'): void {
    res.status(400).json({
      error: {
        message,
        type
      }
    });
  }

  /**
   * Sends a model not found error response
   * @param res - Express response object
   * @param modelName - Name of the model that wasn't found
   */
  sendModelNotFoundError(res: Response, modelName: string): void {
    this.sendValidationError(res, `Model ${modelName} not found`);
  }

  /**
   * Sends a server error response
   * @param res - Express response object
   * @param message - Error message
   * @param statusCode - HTTP status code (defaults to 500)
   */
  sendServerError(res: Response, message: string, statusCode: number = 500): void {
    res.status(statusCode).json({
      error: {
        message,
        type: 'internal_error'
      }
    });
  }

  /**
   * Sends a success response with the model's response data
   * @param res - Express response object
   * @param data - Response data from the model
   * @param statusCode - HTTP status code (defaults to 200)
   */
  sendSuccessResponse(res: Response, data: unknown, statusCode: number = 200): void {
    res.status(statusCode).json(data);
  }

  /**
   * Logs and formats error information for consistent error handling
   * @param error - The error to process
   * @param context - Additional context information
   * @returns Formatted error object
   */
  processError(error: unknown, context?: Record<string, unknown>): { message: string; type: string } {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    this.logger.error('Processing error', errorObj, context);

    // Determine error type based on error characteristics
    let errorType = 'internal_error';
    
    if (errorObj.message.includes('timeout')) {
      errorType = 'timeout_error';
    } else if (errorObj.message.includes('network') || errorObj.message.includes('ECONNRESET')) {
      errorType = 'network_error';
    } else if (errorObj.message.includes('rate limit')) {
      errorType = 'rate_limit_error';
    } else if (errorObj.message.includes('context length')) {
      errorType = 'context_length_error';
    }

    return {
      message: errorObj.message,
      type: errorType
    };
  }
}