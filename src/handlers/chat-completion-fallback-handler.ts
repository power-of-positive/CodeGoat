/**
 * Handles fallback model selection and execution for chat completion requests
 */

import { Request, Response } from 'express';
import { ModelConfig } from '../types';
import { ILogger } from '../logger-interface';
import { RetryResult, AttemptRequest } from './chat-completion-retry-handler';

export class ChatCompletionFallbackHandler {
  constructor(
    private config: ModelConfig,
    private logger: ILogger
  ) {}

  /**
   * Attempts to use fallback models when the primary model fails
   * @param req - Express request object
   * @param res - Express response object
   * @param requestData - Chat completion request data
   * @param modelId - Primary model ID that failed
   * @param error - Error message from primary model
   * @param retryHandler - Function that handles retry attempts for each fallback model
   * @returns Promise that resolves when fallback processing is complete
   */
  async tryFallbackModels(
    req: Request,
    res: Response,
    requestData: unknown,
    modelId: string,
    error?: string,
    retryHandler?: (request: AttemptRequest) => Promise<RetryResult>
  ): Promise<void> {
    // Check if fallbacks are configured for this model
    if (!this.config.fallbacks || !this.config.fallbacks[modelId]) {
      this.logger.warn?.(`No fallbacks configured for model ${modelId}`);
      this.sendFallbackError(res, error || 'All model attempts failed');
      return;
    }

    const fallbackIds = this.config.fallbacks[modelId];
    this.logger.info(`Attempting ${fallbackIds.length} fallback models for ${modelId}`, { 
      fallbacks: fallbackIds 
    });

    // Try each fallback model in sequence
    for (const fallbackId of fallbackIds) {
      const fallbackModel = this.config.models[fallbackId];
      
      if (!fallbackModel || !(fallbackModel as { enabled: boolean }).enabled) {
        this.logger.warn?.(`Fallback model ${fallbackId} is not available or disabled`);
        continue;
      }

      this.logger.info('Trying fallback model', {
        model: (fallbackModel as { name: string }).name,
        fallbackId
      });

      if (!retryHandler) {
        this.logger.error('No retry handler provided to fallback handler');
        continue;
      }

      // Use the retry handler to attempt the fallback model
      const fallbackResult = await retryHandler({
        req,
        res,
        modelConfig: fallbackModel,
        requestData,
        attempt: 1,
        maxRetries: 1
      });

      if (fallbackResult.success) {
        this.logger.info(`Fallback model ${fallbackId} succeeded`);
        return; // Successfully processed with fallback
      }

      this.logger.warn?.(`Fallback model ${fallbackId} failed: ${fallbackResult.error}`);
    }

    // All fallbacks failed
    this.logger.error(`All fallback models failed for ${modelId}`, new Error(error || 'Unknown error'));
    this.sendFallbackError(res, error || 'All model attempts failed');
  }

  /**
   * Sends a standardized error response when all fallbacks fail
   * @param res - Express response object
   * @param errorMessage - Error message to include
   */
  private sendFallbackError(res: Response, errorMessage: string): void {
    res.status(500).json({
      error: { 
        message: errorMessage, 
        type: 'internal_error'
      }
    });
  }
}