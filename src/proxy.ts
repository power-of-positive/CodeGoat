import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import { Route } from './types';
import { Readable } from 'stream';

export class ProxyHandler {
  async handleRequest(req: Request, res: Response, route: Route, rewrittenPath: string): Promise<void> {
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

  private buildTargetUrl(baseUrl: string, path: string, query: any): string {
    const url = new URL(baseUrl);
    url.pathname = path;
    
    if (query) {
      Object.keys(query).forEach(key => {
        url.searchParams.append(key, query[key]);
      });
    }
    
    return url.toString();
  }

  private buildHeaders(reqHeaders: any, route: Route): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (route.target.headers.forward.includes('*')) {
      Object.assign(headers, reqHeaders);
    } else {
      route.target.headers.forward.forEach(header => {
        const value = reqHeaders[header.toLowerCase()];
        if (value) {
          headers[header] = value;
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
    return acceptHeader.includes('text/event-stream') || 
           acceptHeader.includes('application/x-ndjson');
  }

  private async handleNormalRequest(
    req: Request, 
    res: Response, 
    targetUrl: string, 
    headers: Record<string, string>
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      method: req.method as any,
      url: targetUrl,
      headers,
      data: req.body,
      validateStatus: () => true,
      maxRedirects: 5,
      timeout: 30000
    };

    const response = await axios(config);
    
    res.status(response.status);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value && !['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    res.send(response.data);
  }

  private async handleStreamingRequest(
    req: Request,
    res: Response,
    targetUrl: string,
    headers: Record<string, string>
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      method: req.method as any,
      url: targetUrl,
      headers,
      data: req.body,
      responseType: 'stream',
      validateStatus: () => true,
      maxRedirects: 5,
      timeout: 120000
    };

    const response = await axios(config);
    
    res.status(response.status);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value && !['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
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
    console.error('Proxy error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else if (error.request) {
        res.status(502).json({ error: 'Bad Gateway', message: 'No response from target server' });
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
      }
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }
}