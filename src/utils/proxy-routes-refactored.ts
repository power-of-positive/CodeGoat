/**
 * Refactored proxy route handlers using focused handler classes
 */

import { Request, Response } from 'express';
import { ModelConfig } from '../types';
import { SettingsService } from '../services/settings.service';
import { ILogger } from '../logger-interface';
import { ChatRequestValidator } from '../handlers/chat-request-validator';
import { ChatCompletionRetryHandler, AttemptRequest, RetryResult } from '../handlers/chat-completion-retry-handler';
import { ChatCompletionFallbackHandler } from '../handlers/chat-completion-fallback-handler';
import { ChatCompletionExecutor } from '../handlers/chat-completion-executor';
import { ChatCompletionResponseHandler } from '../handlers/chat-completion-response-handler';

export class ProxyRoutes {
  private readonly validator: ChatRequestValidator;
  private readonly retryHandler: ChatCompletionRetryHandler;
  private readonly fallbackHandler: ChatCompletionFallbackHandler;
  private readonly executor: ChatCompletionExecutor;
  private readonly responseHandler: ChatCompletionResponseHandler;

  constructor(
    private config: ModelConfig,
    private settingsService: SettingsService,
    private logger: ILogger
  ) {
    // Initialize focused handlers
    this.validator = new ChatRequestValidator(config);
    this.retryHandler = new ChatCompletionRetryHandler(settingsService, logger);
    this.fallbackHandler = new ChatCompletionFallbackHandler(config, logger);
    this.executor = new ChatCompletionExecutor(settingsService, logger);
    this.responseHandler = new ChatCompletionResponseHandler(logger);
  }

  /**
   * Main handler for chat completion requests
   */
  async handleChatCompletions(req: Request, res: Response): Promise<void> {
    try {
      const { model: requestedModel, ...requestData } = req.body;

      // Validate request and find model
      if (this.validator.validateChatRequest(requestedModel, res)) {
        return; // Validation error response already sent
      }

      const modelEntry = this.validator.findModelEntry(requestedModel, res);
      if (!modelEntry) {
        return; // Model not found error response already sent
      }

      const [modelId, modelConfig] = modelEntry;
      this.logger.info(`Processing chat completion for model: ${requestedModel}`, { modelId });

      // Try primary model with retries
      const result = await this.retryHandler.tryModelWithRetries(
        req,
        res,
        modelConfig,
        requestData,
        modelId,
        this.createAttemptHandler()
      );

      // If primary model failed and needs fallback, try fallback models
      if (!result.success || result.shouldFallback) {
        this.logger.warn?.('Primary model failed, attempting fallbacks', { modelId, error: result.error });
        
        await this.fallbackHandler.tryFallbackModels(
          req,
          res,
          requestData,
          modelId,
          result.error,
          this.createAttemptHandler()
        );
      }
    } catch (error: unknown) {
      this.logger.error('Unexpected error in chat completion handler', error as Error);
      this.responseHandler.handleChatError(error, res);
    }
  }

  /**
   * Creates an attempt handler function that the retry handler can use
   * This bridges the retry handler with the executor
   */
  private createAttemptHandler() {
    return async (request: AttemptRequest): Promise<RetryResult> => {
      return this.executor.attemptModelRequest(
        request.req,
        request.res,
        request.modelConfig,
        request.requestData,
        request.attempt,
        request.maxRetries
      );
    };
  }
}