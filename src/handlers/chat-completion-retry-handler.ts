/**
 * Handles retry logic for chat completion requests with exponential backoff
 */

import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { ILogger } from '../logger-interface';
import { delay } from '../utils/fallback';

export interface RetryResult {
  success: boolean;
  error?: string;
  shouldFallback?: boolean;
}

export interface AttemptRequest {
  req: Request;
  res: Response;
  modelConfig: unknown;
  requestData: unknown;
  attempt: number;
  maxRetries: number;
}

export class ChatCompletionRetryHandler {
  constructor(
    private settingsService: SettingsService,
    private logger: ILogger
  ) {}

  /**
   * Attempts to execute a model request with retry logic and exponential backoff
   * @param req - Express request object
   * @param res - Express response object  
   * @param modelConfig - Model configuration
   * @param requestData - Chat completion request data
   * @param modelId - Model identifier for logging
   * @param attemptHandler - Function that attempts the actual request
   * @returns Result indicating success, failure, or need for fallback
   */
  async tryModelWithRetries(
    req: Request,
    res: Response,
    modelConfig: unknown,
    requestData: unknown,
    modelId: string,
    attemptHandler: (request: AttemptRequest) => Promise<RetryResult>
  ): Promise<RetryResult> {
    const fallbackSettings = await this.settingsService.getFallbackSettings();
    const maxRetries = fallbackSettings.maxRetries;
    let lastError: string | undefined;

    this.logger.info(`Starting retry attempts for model ${modelId}`, {
      maxRetries,
      retryDelay: fallbackSettings.retryDelay
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.debug?.(`Attempt ${attempt}/${maxRetries} for model ${modelId}`);

      const result = await attemptHandler({
        req,
        res,
        modelConfig,
        requestData,
        attempt,
        maxRetries
      });

      if (result.success) {
        this.logger.info(`Model ${modelId} succeeded on attempt ${attempt}`);
        return result;
      }

      if (result.shouldFallback) {
        this.logger.info(`Model ${modelId} requires fallback on attempt ${attempt}: ${result.error}`);
        return result;
      }

      lastError = result.error;
      this.logger.warn?.(`Model ${modelId} failed attempt ${attempt}: ${lastError}`);

      // Apply exponential backoff delay before next retry
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * fallbackSettings.retryDelay;
        this.logger.debug?.(`Waiting ${delayMs}ms before next retry`);
        await delay(delayMs);
      }
    }

    this.logger.error(`All retry attempts failed for model ${modelId}`, new Error(lastError || 'Unknown error'));
    return { success: false, error: lastError };
  }
}