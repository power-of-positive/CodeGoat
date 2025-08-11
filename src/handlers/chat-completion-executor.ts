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

interface RequestSetup {
  success: boolean;
  error?: string;
  config?: AxiosRequestConfig;
  requestInfo?: Record<string, unknown>;
}

export class ChatCompletionExecutor {
  constructor(
    private settingsService: SettingsService,
    private logger: ILogger
  ) {}

  /**
   * Attempts to execute a model request
   * @param req - Express request object
   * @param res - Express response object
   * @param modelConfig - Model configuration
   * @param requestData - Chat completion request data
   * @param attempt - Current attempt number
   * @param maxRetries - Maximum retry attempts
   * @returns Result indicating success, failure, or need for fallback/retry
   */
  async attemptModelRequest(
    req: Request,
    res: Response,
    modelConfig: unknown,
    requestData: unknown,
    attempt: number,
    maxRetries: number
  ): Promise<RetryResult> {
    try {
      const modelCfg = modelConfig as { model: string; apiKey: string };
      const requestSetup = this.prepareModelRequest(modelCfg, requestData, req);

      if (!requestSetup.success) {
        return { success: false, error: requestSetup.error };
      }

      this.logger.debug?.(`Making request to model API (attempt ${attempt}/${maxRetries})`);
      const response = await axios(requestSetup.config!);

      // Handle retry conditions (5xx errors, rate limits)
      const retryResult = await this.handleRetryConditions(response, attempt, maxRetries);
      if (retryResult) {
        return retryResult;
      }

      // Handle fallback conditions (context length, specific errors)
      const fallbackResult = await this.handleFallbackConditions(response);
      if (fallbackResult) {
        return fallbackResult;
      }

      // Handle successful response
      return this.handleSuccessfulResponse(req, res, response, requestSetup.requestInfo || {});
    } catch (error: unknown) {
      return this.handleRequestError(error, attempt);
    }
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
      const modelName = extractModelName(modelCfg.model);
      const provider = getProviderFromModel(modelCfg.model);
      const targetUrl = getTargetUrl(modelCfg.model);
      const apiKey = getApiKey(modelCfg.apiKey);

      if (!apiKey) {
        return { success: false, error: 'API key not configured for model' };
      }

      const headers = buildProxyHeaders(modelCfg.model, apiKey, req.headers as Record<string, string | string[] | undefined>);
      const requestBody = { ...requestData as object, model: modelName };

      const config: AxiosRequestConfig = {
        method: 'POST',
        url: targetUrl,
        headers,
        data: requestBody,
        timeout: 60000,
        validateStatus: () => true, // Don't throw on HTTP error status codes
      };

      this.logger.debug?.('Prepared model request', {
        provider,
        modelName,
        url: targetUrl,
        requestSize: getSafeSize(requestBody)
      });

      return {
        success: true,
        config,
        requestInfo: {
          provider,
          modelName,
          url: targetUrl,
          requestSize: getSafeSize(requestBody)
        }
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
   * Handles conditions that require retry (5xx errors, rate limits, etc.)
   */
  private async handleRetryConditions(
    response: AxiosResponse,
    attempt: number,
    maxRetries: number
  ): Promise<RetryResult | null> {
    const fallbackSettings = await this.settingsService.getFallbackSettings();

    // Retry on server errors (5xx)
    if (response.status >= 500 && fallbackSettings.fallbackOnServerError) {
      if (attempt < maxRetries) {
        this.logger.warn?.(`Server error ${response.status}, retrying...`);
        return { success: false, error: `Server error: ${response.status}` };
      }
    }

    // Retry on rate limits (429)
    if (response.status === 429 && fallbackSettings.fallbackOnRateLimit) {
      if (attempt < maxRetries) {
        this.logger.warn?.('Rate limited, retrying...');
        return { success: false, error: 'Rate limited' };
      }
    }

    return null; // No retry needed
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
  private handleSuccessfulResponse(
    req: Request,
    res: Response,
    response: AxiosResponse,
    requestInfo: Record<string, unknown>
  ): RetryResult {
    try {
      this.logger?.info('Model request successful', {
        status: response.status,
        provider: requestInfo.provider,
        model: requestInfo.modelName,
        responseSize: getSafeSize(response.data)
      });

      // Stream the response back to the client
      res.status(response.status);
      res.set(response.headers as Record<string, string>);
      res.json(response.data);

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