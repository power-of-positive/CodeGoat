import { ConfigurableProxyHandler } from '../proxy-handler';
import { ModelConfig } from '../types';
import { Request, Response } from 'express';

// Mock axios
jest.mock('axios');
import axios, { AxiosResponse } from 'axios';
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('ConfigurableProxyHandler', () => {
  let handler: ConfigurableProxyHandler;
  let mockConfig: ModelConfig;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockConfig = {
      models: {
        'test-model': {
          name: 'test-model',
          model: 'openrouter/test/model',
          provider: 'openrouter',
          baseUrl: 'https://openrouter.ai/api/v1',
          apiKey: 'test-key',
          enabled: true,
        },
      },
    };

    handler = new ConfigurableProxyHandler(mockConfig);

    mockReq = {
      body: {
        model: 'test-model',
        messages: [{ role: 'user', content: 'test' }],
      },
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('handleInternalRoute()', () => {
    it('should handle health check endpoint', async () => {
      const route = {
        name: 'Health Check',
        match: { path: '/health', method: 'GET' },
        target: { url: 'internal://health', headers: { forward: [] } },
        streaming: false,
      };

      await handler.handleRequest(mockReq as Request, mockRes as Response, route, '/health');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          uptime: expect.any(Number),
          models: 1,
        })
      );
    });

    it('should handle models list endpoint', async () => {
      const route = {
        name: 'Models List',
        match: { path: '/v1/models', method: 'GET' },
        target: { url: 'internal://models', headers: { forward: [] } },
        streaming: false,
      };

      await handler.handleRequest(mockReq as Request, mockRes as Response, route, '/v1/models');

      expect(mockRes.json).toHaveBeenCalledWith({
        object: 'list',
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'test-model',
            object: 'model',
            owned_by: 'proxy-server',
          }),
        ]),
      });
    });

    it('should return 404 for unknown internal endpoint', async () => {
      const route = {
        name: 'Unknown',
        match: { path: '/unknown', method: 'GET' },
        target: { url: 'internal://unknown', headers: { forward: [] } },
        streaming: false,
      };

      await handler.handleRequest(mockReq as Request, mockRes as Response, route, '/unknown');

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal endpoint not found' });
    });
  });

  describe('handleProxyRoute()', () => {
    it('should handle chat completions with valid model', async () => {
      const route = {
        name: 'Chat Completions',
        match: { path: '/v1/chat/completions', method: 'POST' },
        target: { url: 'proxy://chat/completions', headers: { forward: ['*'] } },
        streaming: false,
      };

      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { id: 'test-response', choices: [] },
        config: {} as any,
      };
      (mockAxios as any).mockResolvedValue(mockResponse);

      await handler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        route,
        '/v1/chat/completions'
      );

      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://openrouter.ai/api/v1/chat/completions',
          data: expect.objectContaining({
            model: 'test/model',
            messages: [{ role: 'user', content: 'test' }],
          }),
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(mockResponse.data);
    });

    it('should return 400 for missing model parameter', async () => {
      mockReq.body = { messages: [{ role: 'user', content: 'test' }] };

      const route = {
        name: 'Chat Completions',
        match: { path: '/v1/chat/completions', method: 'POST' },
        target: { url: 'proxy://chat/completions', headers: { forward: ['*'] } },
        streaming: false,
      };

      await handler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        route,
        '/v1/chat/completions'
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { message: 'Model parameter is required', type: 'invalid_request_error' },
      });
    });

    it('should return 400 for unknown model', async () => {
      mockReq.body = {
        model: 'unknown-model',
        messages: [{ role: 'user', content: 'test' }],
      };

      const route = {
        name: 'Chat Completions',
        match: { path: '/v1/chat/completions', method: 'POST' },
        target: { url: 'proxy://chat/completions', headers: { forward: ['*'] } },
        streaming: false,
      };

      await handler.handleRequest(
        mockReq as Request,
        mockRes as Response,
        route,
        '/v1/chat/completions'
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { message: 'Model unknown-model not found', type: 'invalid_request_error' },
      });
    });
  });

  describe('getApiKey()', () => {
    it('should return direct API key', () => {
      const handler = new ConfigurableProxyHandler(mockConfig);
      const key = (handler as any).getApiKey('direct-key');
      expect(key).toBe('direct-key');
    });

    it('should resolve environment variable', () => {
      process.env.TEST_API_KEY = 'env-key-value';
      const handler = new ConfigurableProxyHandler(mockConfig);
      const key = (handler as any).getApiKey('os.environ/TEST_API_KEY');
      expect(key).toBe('env-key-value');
      delete process.env.TEST_API_KEY;
    });

    it('should return null for missing environment variable', () => {
      const handler = new ConfigurableProxyHandler(mockConfig);
      const key = (handler as any).getApiKey('os.environ/MISSING_KEY');
      expect(key).toBeNull();
    });
  });
});
