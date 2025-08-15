/**
 * Handles fallback model selection and execution for chat completion requests
 */

import { Request, Response } from 'express';
import { ModelConfig, ModelConfigItem } from '../types';
import { ILogger } from '../logger-interface';
import { RetryResult, AttemptRequest } from './chat-completion-retry-handler';

interface FallbackOptions {
  req: Request;
  res: Response;
  requestData: unknown;
  modelId: string;
  error?: string;
  retryHandler?: (request: AttemptRequest) => Promise<RetryResult>;
}

export class ChatCompletionFallbackHandler {
  constructor(
    private config: ModelConfig,
    private logger: ILogger
  ) {}

  /**
   * Attempts to use fallback models when the primary model fails
   * @param options - Configuration for fallback processing
   * @returns Promise that resolves when fallback processing is complete
   */
  async tryFallbackModels(options: FallbackOptions): Promise<void> {
    const fallbackIds = this.getFallbackIds(options.modelId);
    if (!fallbackIds) {
      this.handleNoFallbacks(options.res, options.modelId, options.error);
      return;
    }

    this.logFallbackAttempt(options.modelId, fallbackIds);
    
    const success = await this.attemptFallbacks(fallbackIds, options);
    if (!success) {
      this.handleAllFallbacksFailed(options.res, options.modelId, options.error);
    }
  }

  /**
   * Gets fallback model IDs for a given model
   */
  private getFallbackIds(modelId: string): string[] | null {
    if (!this.config.fallbacks || !this.config.fallbacks[modelId]) {
      return null;
    }
    return this.config.fallbacks[modelId];
  }

  /**
   * Handles case when no fallbacks are configured
   */
  private handleNoFallbacks(res: Response, modelId: string, error?: string): void {
    this.logger.warn?.(`No fallbacks configured for model ${modelId}`);
    this.sendFallbackError(res, error || 'All model attempts failed');
  }

  /**
   * Logs the start of fallback attempts
   */
  private logFallbackAttempt(modelId: string, fallbackIds: string[]): void {
    this.logger.info(`Attempting ${fallbackIds.length} fallback models for ${modelId}`, { 
      fallbacks: fallbackIds 
    });
  }

  /**
   * Attempts each fallback model in sequence
   */
  private async attemptFallbacks(fallbackIds: string[], options: FallbackOptions): Promise<boolean> {
    for (const fallbackId of fallbackIds) {
      const success = await this.tryIndividualFallback(fallbackId, options);
      if (success) {
        return true;
      }
    }
    return false;
  }

  /**
   * Tries a single fallback model
   */
  private async tryIndividualFallback(fallbackId: string, options: FallbackOptions): Promise<boolean> {
    const fallbackModel = this.config.models[fallbackId];
    
    if (!this.isModelAvailable(fallbackModel, fallbackId)) {
      return false;
    }

    if (!options.retryHandler) {
      this.logger.error('No retry handler provided to fallback handler');
      return false;
    }

    this.logFallbackTry(fallbackModel, fallbackId);
    
    const result = await this.executeFallbackRequest(fallbackModel, options);
    return this.handleFallbackResult(result, fallbackId);
  }

  /**
   * Checks if a fallback model is available
   */
  private isModelAvailable(fallbackModel: ModelConfigItem | undefined, fallbackId: string): boolean {
    if (!fallbackModel || !fallbackModel.enabled) {
      this.logger.warn?.(`Fallback model ${fallbackId} is not available or disabled`);
      return false;
    }
    return true;
  }

  /**
   * Logs the attempt to try a specific fallback model
   */
  private logFallbackTry(fallbackModel: ModelConfigItem, fallbackId: string): void {
    this.logger.info('Trying fallback model', {
      model: fallbackModel.name,
      fallbackId
    });
  }

  /**
   * Executes the fallback request
   */
  private async executeFallbackRequest(fallbackModel: ModelConfigItem, options: FallbackOptions): Promise<RetryResult> {
    return options.retryHandler!({
      req: options.req,
      res: options.res,
      modelConfig: fallbackModel,
      requestData: options.requestData,
      attempt: 1,
      maxRetries: 1
    });
  }

  /**
   * Handles the result of a fallback attempt
   */
  private handleFallbackResult(result: RetryResult, fallbackId: string): boolean {
    if (result.success) {
      this.logger.info(`Fallback model ${fallbackId} succeeded`);
      return true;
    }
    
    this.logger.warn?.(`Fallback model ${fallbackId} failed: ${result.error}`);
    return false;
  }

  /**
   * Handles case when all fallbacks fail
   */
  private handleAllFallbacksFailed(res: Response, modelId: string, error?: string): void {
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