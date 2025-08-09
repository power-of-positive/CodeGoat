import { Request, Response } from 'express';
import { ProxyHandler } from '../proxy';
import { Route } from '../types';
import axios from 'axios';
import { Readable } from 'stream';
import { createMockLogger } from '../test-helpers/logger.mock';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.MockedFunction<typeof axios>;
const mockIsAxiosError = jest.fn();
(mockAxios as any).isAxiosError = mockIsAxiosError;

describe('ProxyHandler', () => {
  let proxyHandler: ProxyHandler;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    const mockLogger = createMockLogger();
    proxyHandler = new ProxyHandler(mockLogger);
    mockReq = {
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
        'x-custom-header': 'test-value',
      },
      query: {
        param1: 'value1',
        param2: 'value2',
      },
      body: { test: 'data' },
      method: 'POST',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      send: jest.fn(),
      headersSent: false,
    };
    jest.clearAllMocks();
  });

  describe('handleRequest', () => {
    const mockRoute: Route = {
      name: 'test-route',
      match: {
        path: '/test',
        method: 'POST',
      },
      target: {
        url: 'https://api.example.com',
        headers: {
          forward: ['content-type', 'authorization'],
          remove: ['x-custom-header'],
          add: {
            'X-Proxy': 'true',
          },
        },
      },
      streaming: false,
    };

    it('should handle normal requests successfully', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-response-header': 'response-value',
        },
        data: { result: 'success' },
      };
      mockAxios.mockResolvedValue(mockResponse);

      await proxyHandler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        mockRoute,
        '/v1/test'
      );

      expect(mockAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.example.com/v1/test?param1=value1&param2=value2',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-token',
          'X-Proxy': 'true',
        },
        data: { test: 'data' },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: expect.any(Function),
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ result: 'success' });
    });

    it('should handle streaming requests', async (): Promise<void> => {
      const streamingRoute = { ...mockRoute, streaming: true };
      mockReq.headers = {
        ...mockReq.headers,
        accept: 'text/event-stream',
      };

      const mockStream = new Readable({
        read(): void {
          this.push('data: {"chunk": "test"}\n\n');
          this.push(null);
        },
      });

      const mockResponse = {
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
        },
        data: mockStream,
      };
      mockAxios.mockResolvedValue(mockResponse);

      await proxyHandler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        streamingRoute,
        '/v1/test'
      );

      expect(mockAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.example.com/v1/test?param1=value1&param2=value2',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-token',
          'X-Proxy': 'true',
        },
        data: { test: 'data' },
        timeout: 120000,
        responseType: 'stream',
        maxRedirects: 5,
        validateStatus: expect.any(Function),
      });

      expect(mockRes.set).toHaveBeenCalledWith({
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      });
    });

    it('should forward all headers when * is specified', async () => {
      const routeWithAllHeaders = {
        ...mockRoute,
        target: {
          ...mockRoute.target,
          headers: {
            forward: ['*'],
            remove: [],
            add: {},
          },
        },
      };

      const mockResponse = { status: 200, headers: {}, data: {} };
      mockAxios.mockResolvedValue(mockResponse);

      await proxyHandler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        routeWithAllHeaders,
        '/v1/test'
      );

      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': 'application/json',
            authorization: 'Bearer test-token',
            'x-custom-header': 'test-value',
          }),
        })
      );
    });

    it('should handle request without query parameters', async () => {
      mockReq.query = {};
      const mockResponse = { status: 200, headers: {}, data: {} };
      mockAxios.mockResolvedValue(mockResponse);

      await proxyHandler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        mockRoute,
        '/v1/test'
      );

      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/v1/test',
        })
      );
    });

    it('should handle request errors', async () => {
      const error = new Error('Network timeout');
      mockAxios.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(false);

      await proxyHandler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        mockRoute,
        '/v1/test'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Proxy error: Network timeout',
      });
    });

    it('should handle axios errors with response', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
        message: 'Request failed with status code 404',
      };
      mockAxios.mockRejectedValue(axiosError);
      mockIsAxiosError.mockReturnValue(true);

      await proxyHandler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        mockRoute,
        '/v1/test'
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Not found' });
    });

    it('should handle axios errors without response', async () => {
      const axiosError = {
        isAxiosError: true,
        response: undefined,
        message: 'Network Error',
      };
      mockAxios.mockRejectedValue(axiosError);
      mockIsAxiosError.mockReturnValue(true);

      await proxyHandler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        mockRoute,
        '/v1/test'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Proxy error: Network Error',
      });
    });
  });

  describe('isStreamingRequest', () => {
    it('should detect streaming request by accept header', () => {
      mockReq.headers = { accept: 'text/event-stream' };
      const result = (proxyHandler as any).isStreamingRequest(mockReq);
      expect(result).toBe(true);
    });

    it('should detect streaming request by stream parameter', () => {
      mockReq.body = { stream: true };
      mockReq.headers = { accept: 'application/json' };
      const result = (proxyHandler as any).isStreamingRequest(mockReq);
      expect(result).toBe(true);
    });

    it('should return false for non-streaming request', () => {
      mockReq.headers = { accept: 'application/json' };
      mockReq.body = { stream: false };
      const result = (proxyHandler as any).isStreamingRequest(mockReq);
      expect(result).toBe(false);
    });
  });

  describe('buildTargetUrl', () => {
    it('should build URL without query parameters', () => {
      const result = (proxyHandler as any).buildTargetUrl(
        'https://api.example.com',
        '/v1/test',
        {}
      );
      expect(result).toBe('https://api.example.com/v1/test');
    });

    it('should build URL with query parameters', () => {
      const result = (proxyHandler as any).buildTargetUrl('https://api.example.com', '/v1/test', {
        param1: 'value1',
        param2: 'value2',
      });
      expect(result).toBe('https://api.example.com/v1/test?param1=value1&param2=value2');
    });

    it('should handle null query parameters', () => {
      const result = (proxyHandler as any).buildTargetUrl(
        'https://api.example.com',
        '/v1/test',
        null
      );
      expect(result).toBe('https://api.example.com/v1/test');
    });
  });

  describe('buildHeaders', () => {
    const mockRoute: Route = {
      name: 'test-route',
      match: {
        path: '/test',
        method: 'POST',
      },
      target: {
        url: 'https://api.example.com',
        headers: {
          forward: ['content-type', 'authorization'],
          remove: ['x-custom-header'],
          add: {
            'X-Proxy': 'true',
          },
        },
      },
      streaming: false,
    };

    it('should build headers with forwarded headers', () => {
      const reqHeaders = {
        'content-type': 'application/json',
        authorization: 'Bearer token',
        'x-ignore': 'ignore-value',
      };

      const result = (proxyHandler as any).buildHeaders(reqHeaders, mockRoute);

      expect(result).toEqual({
        'content-type': 'application/json',
        authorization: 'Bearer token',
        'X-Proxy': 'true',
      });
    });

    it('should handle missing forwarded headers gracefully', () => {
      const reqHeaders = {
        'content-type': 'application/json',
        // Missing authorization header
      };

      const result = (proxyHandler as any).buildHeaders(reqHeaders, mockRoute);

      expect(result).toEqual({
        'content-type': 'application/json',
        'X-Proxy': 'true',
      });
    });
  });
});
