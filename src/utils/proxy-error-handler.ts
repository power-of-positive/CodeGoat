import { AxiosError } from 'axios';
import { ILogger } from '../logger-interface';
import { getProviderFromModel } from './model';

export interface RequestErrorResult {
  success: boolean;
  error: string;
}

export interface ErrorDetails {
  attempt: number;
  code?: string;
  status?: number;
  statusText?: string;
  responseData?: unknown;
  requestSize: number;
  url?: string;
  [key: string]: unknown;
}

export class ProxyErrorHandler {
  constructor(private readonly logger: ILogger) {}

  handleRequestError(error: unknown, attempt: number): RequestErrorResult {
    const axiosError = error as AxiosError;
    const errorDetails: ErrorDetails = {
      attempt,
      code: axiosError.code,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      responseData: axiosError.response?.data,
      requestSize: axiosError.config?.data ? JSON.stringify(axiosError.config.data).length : 0,
      url: axiosError.config?.url,
    };

    this.logger.error('Request attempt failed', new Error(axiosError.message), errorDetails);

    if (axiosError.response?.status === 413) {
      const errorMsg = 'Request entity too large - payload exceeds provider limits';
      this.logger.error('413 Payload Too Large Error', new Error(errorMsg), errorDetails);
      return { success: false, error: errorMsg };
    }

    if (axiosError.code === 'ECONNABORTED' && axiosError.message.includes('timeout')) {
      return { success: false, error: 'Request timeout - provider took too long to respond' };
    }

    if (axiosError.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED') {
      return { success: false, error: 'Request payload exceeds maximum allowed size' };
    }

    return { success: false, error: axiosError.message || 'Unknown request error' };
  }

  handleChatError(error: unknown): { status: number; message: string } {
    this.logger.error('Chat completion error', error as Error);

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return { status: 408, message: 'Request timeout' };
      }
      if (error.message.includes('too large')) {
        return { status: 413, message: 'Payload too large' };
      }
      if (error.message.includes('rate limit')) {
        return { status: 429, message: 'Rate limit exceeded' };
      }
    }

    return { status: 500, message: 'Unknown request error' };
  }

  validateRequestSize(
    requestBody: Record<string, unknown>,
    targetModel: string
  ): { valid: boolean; error?: string; maxSize: number } {
    const requestSize = JSON.stringify(requestBody).length;
    const provider = getProviderFromModel(targetModel);
    const maxSizeMB = provider === 'anthropic' ? 25 : provider === 'openai' ? 20 : 10;
    const maxSize = maxSizeMB * 1024 * 1024;

    if (requestSize > maxSize) {
      const errorMsg = `Request too large: ${(requestSize / 1024 / 1024).toFixed(2)}MB exceeds ${provider} limit of ${maxSizeMB}MB`;
      this.logger.error('Request too large for provider', new Error('Payload too large'), {
        provider,
        requestSize,
        maxSize,
        model: targetModel,
      });
      return { valid: false, error: errorMsg, maxSize };
    }
    return { valid: true, maxSize };
  }
}
