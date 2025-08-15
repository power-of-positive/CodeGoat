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

interface RetryOptions {
  req: Request;
  res: Response;
  modelConfig: unknown;
  requestData: unknown;
  modelId: string;
  attemptHandler: (request: AttemptRequest) => Promise<RetryResult>;
}

export class ChatCompletionRetryHandler {
  constructor(
    private settingsService: SettingsService,
    private logger: ILogger
  ) {}

  /**
   * Attempts to execute a model request with retry logic and exponential backoff
   * @param options - Configuration for retry processing
   * @returns Result indicating success, failure, or need for fallback
   */
  async tryModelWithRetries(options: RetryOptions): Promise<RetryResult> {
    const fallbackSettings = await this.settingsService.getFallbackSettings();
    const maxRetries = fallbackSettings.maxRetries;
    
    this.logRetryStart(options.modelId, maxRetries, fallbackSettings.retryDelay);
    
    return await this.executeRetryLoop(options, maxRetries, fallbackSettings.retryDelay);
  }

  /**
   * Logs the start of retry attempts
   */
  private logRetryStart(modelId: string, maxRetries: number, retryDelay: number): void {
    this.logger.info(`Starting retry attempts for model ${modelId}`, {
      maxRetries,
      retryDelay
    });
  }

  /**
   * Executes the retry loop with exponential backoff
   */
  private async executeRetryLoop(
    options: RetryOptions, 
    maxRetries: number, 
    retryDelay: number
  ): Promise<RetryResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.executeAttempt(options, attempt, maxRetries);
      
      if (result.success || result.shouldFallback) {
        return this.handleSuccessOrFallback(result, options.modelId, attempt);
      }

      lastError = result.error;
      this.handleFailedAttempt(options.modelId, attempt, lastError);

      if (attempt < maxRetries) {
        await this.applyBackoffDelay(attempt, retryDelay);
      }
    }

    return this.handleAllAttemptsFailed(options.modelId, lastError);
  }

  /**
   * Executes a single attempt
   */
  private async executeAttempt(
    options: RetryOptions, 
    attempt: number, 
    maxRetries: number
  ): Promise<RetryResult> {
    this.logger.debug?.(`Attempt ${attempt}/${maxRetries} for model ${options.modelId}`);
    
    return await options.attemptHandler({
      req: options.req,
      res: options.res,
      modelConfig: options.modelConfig,
      requestData: options.requestData,
      attempt,
      maxRetries
    });
  }

  /**
   * Handles successful attempt or fallback request
   */
  private handleSuccessOrFallback(result: RetryResult, modelId: string, attempt: number): RetryResult {
    if (result.success) {
      this.logger.info(`Model ${modelId} succeeded on attempt ${attempt}`);
    } else if (result.shouldFallback) {
      this.logger.info(`Model ${modelId} requires fallback on attempt ${attempt}: ${result.error}`);
    }
    return result;
  }

  /**
   * Handles a failed attempt
   */
  private handleFailedAttempt(modelId: string, attempt: number, error?: string): void {
    this.logger.warn?.(`Model ${modelId} failed attempt ${attempt}: ${error}`);
  }

  /**
   * Applies exponential backoff delay
   */
  private async applyBackoffDelay(attempt: number, retryDelay: number): Promise<void> {
    const delayMs = Math.pow(2, attempt) * retryDelay;
    this.logger.debug?.(`Waiting ${delayMs}ms before next retry`);
    await delay(delayMs);
  }

  /**
   * Handles case when all attempts fail
   */
  private handleAllAttemptsFailed(modelId: string, lastError?: string): RetryResult {
    this.logger.error(`All retry attempts failed for model ${modelId}`, new Error(lastError || 'Unknown error'));
    return { success: false, error: lastError };
  }
}