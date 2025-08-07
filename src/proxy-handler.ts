import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import { Route, ModelConfig } from './types';
import { ProxyHandler } from './proxy';

export class ConfigurableProxyHandler extends ProxyHandler {
  constructor(private config: ModelConfig) {
    super();
  }

  async handleRequest(
    req: Request,
    res: Response,
    route: Route,
    rewrittenPath: string
  ): Promise<void> {
    if (route.target.url.startsWith('internal://')) {
      return this.handleInternalRoute(req, res, route);
    }

    if (route.target.url.startsWith('proxy://')) {
      return this.handleProxyRoute(req, res, route, rewrittenPath);
    }

    return super.handleRequest(req, res, route, rewrittenPath);
  }

  private async handleInternalRoute(req: Request, res: Response, route: Route): Promise<void> {
    const endpoint = route.target.url.replace('internal://', '');

    switch (endpoint) {
      case 'health':
        this.handleHealthCheck(req, res);
        return;
      case 'models':
        this.handleModelsList(req, res);
        return;
      default:
        res.status(404).json({ error: 'Internal endpoint not found' });
    }
  }

  private handleHealthCheck(req: Request, res: Response): void {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      models: Object.keys(this.config.models || {}).length,
    });
  }

  private handleModelsList(req: Request, res: Response): void {
    if (!this.config.models) {
      res.json({ object: 'list', data: [] });
      return;
    }

    const models = Object.entries(this.config.models)
      .filter(([_, model]) => model.enabled)
      .map(([_id, model]) => ({
        id: model.name,
        object: 'model',
        created: Date.now(),
        owned_by: 'proxy-server',
      }));

    res.json({ object: 'list', data: models });
  }

  private async handleProxyRoute(
    req: Request,
    res: Response,
    route: Route,
    _rewrittenPath: string
  ): Promise<void> {
    const endpoint = route.target.url.replace('proxy://', '');

    switch (endpoint) {
      case 'chat/completions':
        await this.handleChatCompletions(req, res);
        return;
      default:
        res.status(404).json({ error: 'Proxy endpoint not found' });
    }
  }

  private async handleChatCompletions(req: Request, res: Response): Promise<void> {
    try {
      const { model: requestedModel, ...requestData } = req.body;

      if (!requestedModel) {
        res.status(400).json({
          error: { message: 'Model parameter is required', type: 'invalid_request_error' },
        });
        return;
      }

      // Find model by name in the models object
      const modelEntry = Object.entries(this.config.models || {}).find(
        ([_, model]) => model.name === requestedModel
      );

      if (!modelEntry) {
        res.status(400).json({
          error: { message: `Model ${requestedModel} not found`, type: 'invalid_request_error' },
        });
        return;
      }

      const [, modelConfig] = modelEntry;
      const targetModel = modelConfig.model;
      const apiKey = this.getApiKey(modelConfig.apiKey);

      if (!apiKey) {
        res.status(500).json({
          error: { message: 'API key not configured', type: 'internal_error' },
        });
        return;
      }

      const targetUrl = this.getTargetUrl(targetModel);
      const headers = this.buildProxyHeaders(targetModel, apiKey, req.headers);

      const requestBody = {
        ...requestData,
        model: this.extractModelName(targetModel),
      };

      const config: AxiosRequestConfig = {
        method: 'POST',
        url: targetUrl,
        headers,
        data: requestBody,
        validateStatus: () => true,
        timeout: 30000,
      };

      if (req.body.stream) {
        config.responseType = 'stream';
      }

      const response = await axios(config);

      res.status(response.status);
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value && !['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      if (req.body.stream && response.data.pipe) {
        response.data.pipe(res);
      } else {
        res.send(response.data);
      }
    } catch (error: unknown) {
      console.error('Proxy error:', error);
      res.status(500).json({
        error: {
          message: `Provider returned error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'internal_error',
        },
      });
    }
  }

  private getApiKey(apiKeySpec: string): string | null {
    if (apiKeySpec.startsWith('os.environ/')) {
      const envVar = apiKeySpec.replace('os.environ/', '');
      return process.env[envVar] || null;
    }
    return apiKeySpec;
  }

  private getTargetUrl(model: string): string {
    if (model.startsWith('openrouter/')) {
      return 'https://openrouter.ai/api/v1/chat/completions';
    }
    if (model.startsWith('openai/') || !model.includes('/')) {
      return 'https://api.openai.com/v1/chat/completions';
    }
    if (model.startsWith('anthropic/')) {
      return 'https://api.anthropic.com/v1/messages';
    }
    return 'https://api.openai.com/v1/chat/completions';
  }

  private buildProxyHeaders(
    model: string,
    apiKey: string,
    _reqHeaders: unknown
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'proxy-server',
    };

    if (model.startsWith('openrouter/')) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://localhost:3000';
    } else if (model.startsWith('anthropic/')) {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  private extractModelName(model: string): string {
    if (model.includes('/')) {
      return model.split('/').slice(1).join('/');
    }
    return model;
  }
}
