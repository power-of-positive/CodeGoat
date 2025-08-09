/**
 * Proxy route handlers for chat completions and model requests
 */

import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { Request, Response } from 'express';
import { ModelConfig } from '../types';
import { SettingsService } from '../services/settings.service';
import { ILogger } from '../logger-interface';
import { AxiosResponse } from 'axios';

interface FallbackSettings {
  maxRetries: number;
  retryDelay: number;
  enableFallbacks: boolean;
  fallbackOnServerError: boolean;
  fallbackOnContextLength: boolean;
  fallbackOnRateLimit: boolean;
}
import { safePreview, getSafeSize } from './json';
import {
  extractModelName,
  getProviderFromModel,
  getTargetUrl,
  getApiKey,
  buildProxyHeaders,
} from './model';
import { shouldFallbackOnError, extractErrorMessage, delay } from './fallback';

export class ProxyRoutes {
  private readonly logger: ILogger;

  constructor(
    private config: ModelConfig,
    private settingsService: SettingsService,
    logger: ILogger
  ) {
    this.logger = logger;
  }

  async handleChatCompletions(req: Request, res: Response): Promise<void> {
    try {
      const { model: requestedModel, ...requestData } = req.body;
      const validationError = this.validateChatRequest(requestedModel, res);
      if (validationError) return;

      const modelEntry = this.findModelEntry(requestedModel, res);
      if (!modelEntry) return;

      const [modelId, modelConfig] = modelEntry;
      const result = await this.tryModelWithRetries(req, res, modelConfig, requestData, modelId);

      if (!result.success || result.shouldFallback) {
        this.logger.warn?.('Primary model failed, attempting fallbacks', { error: result.error });
        await this.tryFallbackModels(req, res, requestData, modelId, result.error);
      }
    } catch (error: unknown) {
      this.handleChatError(error, res);
    }
  }

  private validateChatRequest(requestedModel: string, res: Response): boolean {
    if (!requestedModel) {
      res.status(400).json({
        error: { message: 'Model parameter is required', type: 'invalid_request_error' },
      });
      return true;
    }
    return false;
  }

  private findModelEntry(requestedModel: string, res: Response): [string, unknown] | null {
    const modelEntry = Object.entries(this.config.models || {}).find(
      ([_, model]) => (model as { name: string }).name === requestedModel
    );

    if (!modelEntry) {
      res.status(400).json({
        error: { message: `Model ${requestedModel} not found`, type: 'invalid_request_error' },
      });
      return null;
    }
    return modelEntry as [string, unknown];
  }

  private async tryFallbackModels(
    req: Request,
    res: Response,
    requestData: unknown,
    modelId: string,
    error?: string
  ): Promise<void> {
    if (!this.config.fallbacks || !this.config.fallbacks[modelId]) {
      res.status(500).json({
        error: { message: error || 'All model attempts failed', type: 'internal_error' },
      });
      return;
    }

    const fallbackIds = this.config.fallbacks[modelId];
    for (const fallbackId of fallbackIds) {
      const fallbackModel = this.config.models[fallbackId];
      if (fallbackModel && (fallbackModel as { enabled: boolean }).enabled) {
        this.logger.info('Trying fallback model', {
          model: (fallbackModel as { name: string }).name,
        });
        const fallbackResult = await this.tryModelWithRetries(
          req,
          res,
          fallbackModel,
          requestData,
          fallbackId
        );
        if (fallbackResult.success) return;
      }
    }

    res.status(500).json({
      error: { message: error || 'All model attempts failed', type: 'internal_error' },
    });
  }

  private handleChatError(error: unknown, res: Response): void {
    this.logger.error('Proxy error', error as Error);
    res.status(500).json({
      error: {
        message: `Provider returned error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'internal_error',
      },
    });
  }

  private async tryModelWithRetries(
    req: Request,
    res: Response,
    modelConfig: unknown,
    requestData: unknown,
    _modelId: string
  ): Promise<{ success: boolean; error?: string; shouldFallback?: boolean }> {
    const fallbackSettings = await this.settingsService.getFallbackSettings();
    const maxRetries = fallbackSettings.maxRetries;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.attemptModelRequest(
        req,
        res,
        modelConfig,
        requestData,
        fallbackSettings,
        attempt,
        maxRetries
      );

      if (result.success || result.shouldFallback) {
        return result;
      }

      lastError = result.error;

      if (attempt < maxRetries) {
        await delay(Math.pow(2, attempt) * fallbackSettings.retryDelay);
      }
    }

    return { success: false, error: lastError };
  }

  private async attemptModelRequest(
    req: Request,
    res: Response,
    modelConfig: unknown,
    requestData: unknown,
    fallbackSettings: FallbackSettings,
    attempt: number,
    maxRetries: number
  ): Promise<{ success: boolean; error?: string; shouldFallback?: boolean }> {
    try {
      const modelCfg = modelConfig as { model: string; apiKey: string };
      const requestSetup = this.prepareModelRequest(modelCfg, requestData, req);

      if (!requestSetup.success) {
        return { success: false, error: requestSetup.error };
      }

      const response = await axios(requestSetup.config!);

      // Handle retry conditions
      const retryResult = await this.handleRetryConditions(
        response,
        attempt,
        maxRetries,
        fallbackSettings
      );

      if (retryResult) {
        return retryResult;
      }

      // Handle fallback conditions
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

  private prepareModelRequest(
    modelCfg: { model: string; apiKey: string },
    requestData: unknown,
    req: Request
  ): {
    success: boolean;
    error?: string;
    config?: AxiosRequestConfig;
    requestInfo?: Record<string, unknown>;
  } {
    const targetModel = modelCfg.model;
    const apiKey = getApiKey(modelCfg.apiKey);

    if (!apiKey) {
      return { success: false, error: 'API key not configured' };
    }

    const targetUrl = getTargetUrl(targetModel);
    const headers = buildProxyHeaders(targetModel, apiKey, req.headers);

    const requestBody = {
      ...(requestData as Record<string, unknown>),
      model: extractModelName(targetModel),
    };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: targetUrl,
      headers,
      data: requestBody,
      validateStatus: () => true,
      timeout: 30000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    };

    if (req.body.stream) {
      config.responseType = 'stream';
    }

    const requestInfo = {
      model: extractModelName(targetModel),
      provider: getProviderFromModel(targetModel),
      requestBody: getSafeSize(requestBody),
      headers: Object.keys(headers).join(', '),
    };

    return { success: true, config, requestInfo };
  }

  private async handleRetryConditions(
    response: AxiosResponse,
    attempt: number,
    maxRetries: number,
    _fallbackSettings: FallbackSettings
  ): Promise<{ success: boolean; error?: string; shouldFallback?: boolean } | null> {
    if (response.status === 413) {
      this.logger.warn?.('Request too large, retrying', { attempt, status: 413 });
      if (attempt < maxRetries) {
        return null; // Continue retry loop
      }
      return { success: false, error: 'Request entity too large' };
    }

    if (response.status >= 500) {
      this.logger.warn?.('Request failed, retrying', { attempt, status: response.status });
      if (attempt < maxRetries) {
        return null; // Continue retry loop
      }
      return { success: false, error: `Server error: ${response.status}` };
    }

    return null; // No retry needed
  }

  private async handleFallbackConditions(
    response: AxiosResponse
  ): Promise<{ success: boolean; error?: string; shouldFallback?: boolean } | null> {
    this.logger.debug?.('Checking fallback conditions', {
      status: response.status,
      dataPreview: safePreview(response.data, 200),
    });

    const fallbackConditions = await this.settingsService.getFallbackSettings();
    if (shouldFallbackOnError(response.status, response.data, fallbackConditions)) {
      this.logger.info('Model capability error detected, trying fallback', {
        status: response.status,
      });
      const error = extractErrorMessage(response.data);
      return { success: false, error, shouldFallback: true };
    }

    this.logger.debug?.('No fallback needed', { status: response.status });
    return null; // No fallback needed
  }

  private handleSuccessfulResponse(
    req: Request,
    res: Response,
    response: AxiosResponse,
    requestInfo: Record<string, unknown>
  ): { success: boolean } {
    // Log detailed request/response info
    const responseSize = getSafeSize(response.data);
    const fullRequestInfo = {
      ...requestInfo,
      responseStatus: response.status,
      responseSize,
    };

    this.logger.debug?.('Model request details', fullRequestInfo);

    // Set response headers and send data
    res.status(response.status);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value && !['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, String(value));
      }
    });

    if (req.body.stream && response.data.pipe) {
      response.data.pipe(res);
    } else {
      res.send(response.data);
    }

    return { success: true };
  }

  private handleRequestError(error: unknown, attempt: number): { success: boolean; error: string } {
    const axiosError = error as AxiosError;
    this.logger.error('Request attempt failed', new Error(axiosError.message), { attempt });

    if (axiosError.response?.status === 413) {
      return { success: false, error: 'Request entity too large' };
    }

    return { success: false, error: axiosError.message };
  }
}
