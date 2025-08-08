import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import { Route } from './types';
import { Readable } from 'stream';

export class ProxyHandler {
  async handleRequest(
    req: Request,
    res: Response,
    route: Route,
    rewrittenPath: string
  ): Promise<void> {
    try {
      const targetUrl = this.buildTargetUrl(route.target.url, rewrittenPath, req.query);
      const headers = this.buildHeaders(req.headers, route);

      if (route.streaming && this.isStreamingRequest(req)) {
        await this.handleStreamingRequest(req, res, targetUrl, headers);
      } else {
        await this.handleNormalRequest(req, res, targetUrl, headers);
      }
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private buildTargetUrl(baseUrl: string, path: string, query: unknown): string {
    const url = new globalThis.URL(baseUrl);
    url.pathname = path;

    if (query && typeof query === 'object' && query !== null) {
      Object.entries(query as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'string') {
          url.searchParams.append(key, value);
        }
      });
    }

    return url.toString();
  }

  private buildHeaders(reqHeaders: unknown, route: Route): Record<string, string> {
    const headers: Record<string, string> = {};
    const typedHeaders = reqHeaders as Record<string, string | string[] | undefined>;

    if (route.target.headers.forward.includes('*')) {
      Object.entries(typedHeaders).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
          headers[key] = value[0];
        }
      });
    } else {
      route.target.headers.forward.forEach(header => {
        const value = typedHeaders[header.toLowerCase()];
        if (typeof value === 'string') {
          headers[header] = value;
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
          headers[header] = value[0];
        }
      });
    }

    if (route.target.headers.remove) {
      route.target.headers.remove.forEach(header => {
        delete headers[header.toLowerCase()];
      });
    }

    if (route.target.headers.add) {
      Object.assign(headers, route.target.headers.add);
    }

    delete headers['host'];
    delete headers['content-length'];

    return headers;
  }

  private isStreamingRequest(req: Request): boolean {
    const acceptHeader = req.headers.accept || '';
    const hasStreamingHeader =
      acceptHeader.includes('text/event-stream') || acceptHeader.includes('application/x-ndjson');
    const hasStreamParam = req.body && typeof req.body === 'object' && req.body.stream === true;
    return hasStreamingHeader || hasStreamParam;
  }

  private async handleNormalRequest(
    req: Request,
    res: Response,
    targetUrl: string,
    headers: Record<string, string>
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      method: req.method as AxiosRequestConfig['method'],
      url: targetUrl,
      headers,
      data: req.body,
      validateStatus: () => true,
      maxRedirects: 5,
      timeout: 30000,
    };

    const response = await axios(config);

    res.status(response.status);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value && !['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (typeof response.data === 'object' && response.data !== null) {
      res.json(response.data);
    } else {
      res.send(response.data);
    }
  }

  private async handleStreamingRequest(
    req: Request,
    res: Response,
    targetUrl: string,
    headers: Record<string, string>
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      method: req.method as AxiosRequestConfig['method'],
      url: targetUrl,
      headers,
      data: req.body,
      responseType: 'stream',
      validateStatus: () => true,
      maxRedirects: 5,
      timeout: 120000,
    };

    const response = await axios(config);

    res.status(response.status);

    // Filter and prepare headers for streaming response
    const filteredHeaders: Record<string, string> = {};
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value && !['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        filteredHeaders[key] = value as string;
      }
    });

    if (Object.keys(filteredHeaders).length > 0) {
      res.set(filteredHeaders);
    }

    if (response.data instanceof Readable) {
      response.data.pipe(res);

      response.data.on('error', error => {
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

  private handleError(error: unknown, res: Response): void {
    console.error('Proxy error:', error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: `Proxy error: ${error.message}` });
      }
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: `Proxy error: ${message}` });
    }
  }
}
