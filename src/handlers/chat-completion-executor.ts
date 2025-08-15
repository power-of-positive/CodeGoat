/**
 * Handles execution of chat completion requests to model APIs
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { SettingsService } from '../services/settings.service';
import { RetryResult } from './chat-completion-retry-handler';
import {
  extractModelName,
  getProviderFromModel,
  getTargetUrl,
  getApiKey,
  buildProxyHeaders,
} from '../utils/model';
import { extractErrorMessage } from '../utils/fallback';
import { getSafeSize } from '../utils/json';

interface FallbackSettings {
  maxRetries: number;
  retryDelay: number;
  enableFallbacks: boolean;
  fallbackOnServerError: boolean;
  fallbackOnContextLength: boolean;
  fallbackOnRateLimit: boolean;
}

interface RequestSetup {
  success: boolean;
  error?: string;
  config?: AxiosRequestConfig;
  requestInfo?: Record<string, unknown>;
}

interface ModelInfo {
  modelName: string;
  provider: string;
  targetUrl: string;
  apiKey: string | null;
}

interface RetryContext {
  response: AxiosResponse;
  attempt: number;
  maxRetries: number;
  fallbackSettings: FallbackSettings;
}

interface ModelRequestOptions {
  req: Request;
  res: Response;
  modelConfig: unknown;
  requestData: unknown;
  attempt: number;
  maxRetries: number;
}

interface ResponseOptions {
  req: Request;
  res: Response;
  response: AxiosResponse;
  requestInfo: Record<string, unknown>;
}

export class ChatCompletionExecutor {
  constructor(
    private settingsService: SettingsService,
    private logger: ILogger
  ) {}

  /**
   * Attempts to execute a model request
   * @param options - Configuration for the model request
   * @returns Result indicating success, failure, or need for fallback/retry
   */
  async attemptModelRequest(options: ModelRequestOptions): Promise<RetryResult> {
    try {
      const modelCfg = options.modelConfig as { model: string; apiKey: string };
      const requestSetup = this.prepareModelRequest(modelCfg, options.requestData, options.req);

      if (!requestSetup.success) {
        return { success: false, error: requestSetup.error };
      }

      return await this.executeRequest(requestSetup, options);
    } catch (error: unknown) {
      return this.handleRequestError(error, options.attempt);
    }
  }

  /**
   * Executes the prepared request and handles response
   */
  private async executeRequest(
    requestSetup: RequestSetup, 
    options: ModelRequestOptions
  ): Promise<RetryResult> {
    this.logger.debug?.(`Making request to model API (attempt ${options.attempt}/${options.maxRetries})`);
    const response = await axios(requestSetup.config!);

    // Handle retry conditions (5xx errors, rate limits)
    const retryResult = await this.handleRetryConditions(response, options.attempt, options.maxRetries);
    if (retryResult) {
      return retryResult;
    }

    // Handle fallback conditions (context length, specific errors)
    const fallbackResult = await this.handleFallbackConditions(response);
    if (fallbackResult) {
      return fallbackResult;
    }

    // Handle successful response
    return this.handleSuccessfulResponse({ 
      req: options.req, 
      res: options.res, 
      response, 
      requestInfo: requestSetup.requestInfo || {} 
    });
  }

  /**
   * Prepares the request configuration for the model API call
   */
  private prepareModelRequest(
    modelCfg: { model: string; apiKey: string },
    requestData: unknown,
    req: Request
  ): RequestSetup {
    try {
      const modelInfo = this.extractModelInfo(modelCfg);
      if (!modelInfo.apiKey) {
        return { success: false, error: 'API key not configured for model' };
      }

      const config = this.buildRequestConfig(modelInfo, requestData, req);
      const requestInfo = this.createRequestInfo(modelInfo, config.data);

      this.logRequestPreparation(requestInfo);

      return {
        success: true,
        config,
        requestInfo
      };
    } catch (error) {
      this.logger?.error('Failed to prepare model request', error as Error);
      return { 
        success: false, 
        error: `Request preparation failed: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Extracts model information
   */
  private extractModelInfo(modelCfg: { model: string; apiKey: string }): ModelInfo {
    return {
      modelName: extractModelName(modelCfg.model),
      provider: getProviderFromModel(modelCfg.model),
      targetUrl: getTargetUrl(modelCfg.model),
      apiKey: getApiKey(modelCfg.apiKey)
    };
  }

  /**
   * Builds the axios request configuration
   */
  private buildRequestConfig(
    modelInfo: ReturnType<typeof this.extractModelInfo>,
    requestData: unknown,
    req: Request
  ): AxiosRequestConfig {
    const headers = buildProxyHeaders(
      modelInfo.provider, 
      modelInfo.apiKey!, 
      req.headers as Record<string, string | string[] | undefined>
    );
    const requestBody = { ...requestData as object, model: modelInfo.modelName };

    return {
      method: 'POST',
      url: modelInfo.targetUrl,
      headers,
      data: requestBody,
      timeout: 60000,
      validateStatus: () => true, // Don't throw on HTTP error status codes
    };
  }

  /**
   * Creates request information for logging
   */
  private createRequestInfo(
    modelInfo: ReturnType<typeof this.extractModelInfo>,
    requestBody: unknown
  ): Record<string, unknown> {
    return {
      provider: modelInfo.provider,
      modelName: modelInfo.modelName,
      url: modelInfo.targetUrl,
      requestSize: getSafeSize(requestBody)
    };
  }

  /**
   * Logs request preparation details
   */
  private logRequestPreparation(requestInfo: Record<string, unknown>): void {
    this.logger.debug?.('Prepared model request', requestInfo);
  }

  /**
   * Handles conditions that require retry (5xx errors, rate limits, etc.)
   */
  private async handleRetryConditions(
    response: AxiosResponse,
    attempt: number,
    maxRetries: number
  ): Promise<RetryResult | null> {
    const fallbackSettings = await this.settingsService.getFallbackSettings();

    const retryContext = { response, attempt, maxRetries, fallbackSettings };
    
    const serverErrorResult = this.checkServerError(retryContext);
    if (serverErrorResult) {
      return serverErrorResult;
    }

    const rateLimitResult = this.checkRateLimit(retryContext);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    return null; // No retry needed
  }

  /**
   * Checks for server errors requiring retry
   */
  private checkServerError(context: RetryContext): RetryResult | null {
    const { response, attempt, maxRetries, fallbackSettings } = context;
    if (response.status >= 500 && fallbackSettings.fallbackOnServerError && attempt < maxRetries) {
      this.logger.warn?.(`Server error ${response.status}, retrying...`);
      return { success: false, error: `Server error: ${response.status}` };
    }
    return null;
  }

  /**
   * Checks for rate limit errors requiring retry
   */
  private checkRateLimit(context: RetryContext): RetryResult | null {
    const { response, attempt, maxRetries, fallbackSettings } = context;
    if (response.status === 429 && fallbackSettings.fallbackOnRateLimit && attempt < maxRetries) {
      this.logger.warn?.('Rate limited, retrying...');
      return { success: false, error: 'Rate limited' };
    }
    return null;
  }

  /**
   * Handles conditions that require fallback to different models
   */
  private async handleFallbackConditions(response: AxiosResponse): Promise<RetryResult | null> {
    const fallbackSettings = await this.settingsService.getFallbackSettings();

    if (response.status !== 200) {
      const errorMessage = extractErrorMessage(response.data);
      
      if (fallbackSettings.fallbackOnContextLength && 
          errorMessage.toLowerCase().includes('context length')) {
        this.logger.info('Context length exceeded, requesting fallback');
        return { success: false, shouldFallback: true, error: errorMessage };
      }

      // Check for other fallback conditions
      if (errorMessage.toLowerCase().includes('model_not_found') ||
          errorMessage.toLowerCase().includes('model_overloaded')) {
        this.logger.info('Model issue detected, requesting fallback');
        return { success: false, shouldFallback: true, error: errorMessage };
      }
    }

    return null; // No fallback needed
  }

  /**
   * Handles successful API responses
   */
  private handleSuccessfulResponse(options: ResponseOptions): RetryResult {
    try {
      this.logger?.info('Model request successful', {
        status: options.response.status,
        provider: options.requestInfo.provider,
        model: options.requestInfo.modelName,
        responseSize: getSafeSize(options.response.data)
      });

      // Stream the response back to the client
      options.res.status(options.response.status);
      options.res.set(options.response.headers as Record<string, string>);
      options.res.json(options.response.data);

      return { success: true };
    } catch (error) {
      this.logger?.error('Failed to process successful response', error as Error);
      return { 
        success: false, 
        error: `Response processing failed: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Handles request errors (network issues, timeouts, etc.)
   */
  private handleRequestError(error: unknown, attempt: number): RetryResult {
    const axiosError = error as AxiosError;
    
    if (axiosError.code === 'ECONNRESET' || axiosError.code === 'ETIMEDOUT') {
      this.logger.warn?.(`Network error on attempt ${attempt}`, { code: axiosError.code });
      return { success: false, error: `Network error: ${axiosError.code}` };
    }

    if (axiosError.response?.status === 404) {
      this.logger?.error('Model API endpoint not found');
      return { success: false, shouldFallback: true, error: 'Model API endpoint not found' };
    }

    const errorMessage = axiosError.message || 'Unknown request error';
    this.logger.error(`Request error on attempt ${attempt}`, axiosError);
    
    return { success: false, error: errorMessage };
  }
}