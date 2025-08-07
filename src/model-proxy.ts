import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { LiteLLMRouter } from './litellm-router';
import { LiteLLMRequest } from './litellm-types';

export class LiteLLMProxyHandler {
  private router: LiteLLMRouter;

  constructor(router: LiteLLMRouter) {
    this.router = router;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const litellmRequest = req.body as LiteLLMRequest;
      
      // Select model based on routing logic
      const modelConfig = this.router.selectModel(litellmRequest.model);
      if (!modelConfig) {
        res.status(503).json({
          error: {
            message: `Model ${litellmRequest.model} and all fallbacks are unavailable`,
            type: 'model_unavailable',
            code: 'model_unavailable'
          }
        });
        return;
      }

      // Transform request for the selected provider
      const transformedRequest = this.router.transformRequestForProvider(litellmRequest, modelConfig);
      
      // Build target URL
      const baseUrl = this.router.extractProviderUrl(modelConfig.litellm_params.model);
      const targetUrl = `${baseUrl}/chat/completions`;
      
      // Build headers
      const headers = this.buildHeaders(req.headers, modelConfig);
      
      try {
        if (litellmRequest.stream) {
          await this.handleStreamingRequest(req, res, targetUrl, headers, transformedRequest, modelConfig.model_name);
        } else {
          await this.handleNormalRequest(req, res, targetUrl, headers, transformedRequest, modelConfig.model_name);
        }
        
        // Mark model as successful
        this.router.markModelSuccess(modelConfig.model_name);
      } catch (error) {
        // Mark model as failed
        this.router.markModelFailure(modelConfig.model_name);
        throw error;
      }
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private buildHeaders(reqHeaders: any, modelConfig: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Forward relevant headers
    const headersToForward = ['content-type', 'accept', 'user-agent'];
    headersToForward.forEach(header => {
      if (reqHeaders[header]) {
        headers[header] = reqHeaders[header];
      }
    });
    
    // Add authorization based on provider
    const provider = this.getProvider(modelConfig.litellm_params.model);
    if (provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${modelConfig.litellm_params.api_key}`;
      headers['HTTP-Referer'] = 'https://github.com/litellm/litellm';
      headers['X-Title'] = 'LiteLLM Proxy';
    } else if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${modelConfig.litellm_params.api_key}`;
    } else if (provider === 'anthropic') {
      headers['x-api-key'] = modelConfig.litellm_params.api_key;
      headers['anthropic-version'] = '2023-06-01';
    }
    
    return headers;
  }

  private getProvider(model: string): string {
    if (model.startsWith('openrouter/')) return 'openrouter';
    if (model.startsWith('openai/')) return 'openai';
    if (model.startsWith('anthropic/')) return 'anthropic';
    return 'openai';
  }

  private async handleNormalRequest(
    req: Request,
    res: Response,
    targetUrl: string,
    headers: Record<string, string>,
    data: any,
    modelName: string
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: targetUrl,
      headers,
      data,
      validateStatus: () => true,
      timeout: 120000
    };

    const response = await axios(config);
    
    if (response.status >= 400) {
      throw new Error(`Provider returned error: ${response.status} ${JSON.stringify(response.data)}`);
    }
    
    res.status(response.status);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value && !['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    // Add model info to response
    if (response.data && typeof response.data === 'object') {
      response.data._proxy_model_used = modelName;
    }
    
    res.json(response.data);
  }

  private async handleStreamingRequest(
    req: Request,
    res: Response,
    targetUrl: string,
    headers: Record<string, string>,
    data: any,
    modelName: string
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: targetUrl,
      headers: {
        ...headers,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      data,
      responseType: 'stream',
      validateStatus: () => true,
      timeout: 120000
    };

    const response = await axios(config);
    
    if (response.status >= 400) {
      throw new Error(`Provider returned error: ${response.status}`);
    }
    
    res.status(response.status);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Proxy-Model-Used', modelName);
    
    if (response.data instanceof Readable) {
      response.data.pipe(res);
      
      response.data.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).send('Stream error');
        }
      });
      
      req.on('close', () => {
        response.data.destroy();
      });
    } else {
      res.send(response.data);
    }
  }

  private handleError(error: any, res: Response): void {
    console.error('LiteLLM Proxy error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else if (error.request) {
        res.status(502).json({
          error: {
            message: 'No response from provider',
            type: 'provider_error',
            code: 'bad_gateway'
          }
        });
      } else {
        res.status(500).json({
          error: {
            message: error.message,
            type: 'internal_error',
            code: 'internal_error'
          }
        });
      }
    } else {
      res.status(500).json({
        error: {
          message: error.message || 'An unexpected error occurred',
          type: 'internal_error',
          code: 'internal_error'
        }
      });
    }
  }
}