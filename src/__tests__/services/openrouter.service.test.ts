import { OpenRouterService } from '../../services/openrouter.service';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('OpenRouterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanModelSlug', () => {
    it('should remove openrouter/ prefix from model slug', () => {
      const result = OpenRouterService.cleanModelSlug('openrouter/author/model-name');
      expect(result).toBe('author/model-name');
    });

    it('should return unchanged slug if no openrouter/ prefix', () => {
      const result = OpenRouterService.cleanModelSlug('author/model-name');
      expect(result).toBe('author/model-name');
    });

    it('should handle empty string', () => {
      const result = OpenRouterService.cleanModelSlug('');
      expect(result).toBe('');
    });

    it('should handle model slug with just openrouter/', () => {
      const result = OpenRouterService.cleanModelSlug('openrouter/');
      expect(result).toBe('');
    });
  });

  describe('fetchModelEndpoints', () => {
    it('should fetch model endpoints successfully', async () => {
      const mockResponse = {
        data: {
          endpoints: [
            {
              name: 'Provider A',
              context_length: 4096,
              max_tokens: 1024,
              uptime_30m: 0.95,
              pricing: { prompt: '0.01', completion: '0.02' },
              moderated: false,
            },
          ],
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await OpenRouterService.fetchModelEndpoints('author/model-name');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models/author/model-name/endpoints',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          signal: expect.any(AbortSignal),
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      await expect(OpenRouterService.fetchModelEndpoints('nonexistent/model')).rejects.toThrow(
        'OpenRouter API error: 404'
      );
    });

    it('should throw error for network failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(OpenRouterService.fetchModelEndpoints('author/model')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('processEndpointsData', () => {
    it('should process endpoints with uptime data', () => {
      const endpoints = [
        {
          name: 'Provider A',
          context_length: 4096,
          max_tokens: 1024,
          uptime_30m: 0.95,
          pricing: { prompt: '0.01', completion: '0.02' },
          moderated: false,
        },
        {
          name: 'Provider B',
          context_length: 8192,
          max_tokens: 2048,
          uptime_30m: 0.88,
          pricing: { prompt: '0.015', completion: '0.025' },
          moderated: true,
        },
      ];

      const result = OpenRouterService.processEndpointsData(endpoints, 'author/model');

      expect(result).toEqual({
        modelSlug: 'author/model',
        endpoints: [
          {
            provider: 'Provider A',
            contextLength: 4096,
            maxTokens: 1024,
            uptime: 0.95,
            pricing: { prompt: '0.01', completion: '0.02' },
            moderated: false,
          },
          {
            provider: 'Provider B',
            contextLength: 8192,
            maxTokens: 2048,
            uptime: 0.88,
            pricing: { prompt: '0.015', completion: '0.025' },
            moderated: true,
          },
        ],
        averageUptime: 0.915, // (0.95 + 0.88) / 2
        providerCount: 2,
        hasUptimeData: true,
      });
    });

    it('should process endpoints without uptime data', () => {
      const endpoints = [
        {
          name: 'Provider A',
          context_length: 4096,
          max_tokens: 1024,
          uptime_30m: undefined,
          pricing: { prompt: '0.01' },
          moderated: false,
        },
      ];

      const result = OpenRouterService.processEndpointsData(endpoints, 'author/model');

      expect(result).toEqual({
        modelSlug: 'author/model',
        endpoints: [
          {
            provider: 'Provider A',
            contextLength: 4096,
            maxTokens: 1024,
            uptime: null,
            pricing: { prompt: '0.01' },
            moderated: false,
          },
        ],
        averageUptime: null,
        providerCount: 1,
        hasUptimeData: false,
      });
    });

    it('should handle endpoints with missing fields', () => {
      const endpoints = [
        {
          provider: 'Provider A',
          // Missing other fields
        },
        {
          name: 'Provider B',
          uptime_30m: 0.9,
          // Missing other fields
        },
      ];

      const result = OpenRouterService.processEndpointsData(endpoints, 'author/model');

      expect(result).toEqual({
        modelSlug: 'author/model',
        endpoints: [
          {
            provider: 'Provider A',
            contextLength: undefined,
            maxTokens: undefined,
            uptime: null,
            pricing: undefined,
            moderated: false,
          },
          {
            provider: 'Provider B',
            contextLength: undefined,
            maxTokens: undefined,
            uptime: 0.9,
            pricing: undefined,
            moderated: false,
          },
        ],
        averageUptime: 0.45, // 0.9 / 2 (null treated as 0 in average)
        providerCount: 2,
        hasUptimeData: true,
      });
    });

    it('should handle empty endpoints array', () => {
      const result = OpenRouterService.processEndpointsData([], 'author/model');

      expect(result).toEqual({
        modelSlug: 'author/model',
        endpoints: [],
        averageUptime: null,
        providerCount: 0,
        hasUptimeData: false,
      });
    });

    it('should prefer name over provider field', () => {
      const endpoints = [
        {
          name: 'Custom Name',
          provider: 'Original Provider',
          uptime_30m: 0.95,
        },
      ];

      const result = OpenRouterService.processEndpointsData(endpoints, 'author/model');

      expect(result.endpoints[0].provider).toBe('Custom Name');
    });

    it('should default to moderated false when not specified', () => {
      const endpoints = [
        {
          name: 'Provider A',
          // moderated field not specified
        },
      ];

      const result = OpenRouterService.processEndpointsData(endpoints, 'author/model');

      expect(result.endpoints[0].moderated).toBe(false);
    });
  });

  describe('getModelStats', () => {
    it('should get model stats successfully', async () => {
      const mockEndpoints = [
        {
          name: 'Provider A',
          context_length: 4096,
          uptime_30m: 0.95,
        },
      ];

      const mockResponse = {
        data: {
          endpoints: mockEndpoints,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await OpenRouterService.getModelStats('openrouter/author/model');

      expect(result.modelSlug).toBe('author/model');
      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0].provider).toBe('Provider A');
      expect(result.providerCount).toBe(1);
    });

    it('should handle response without data field', async () => {
      const mockResponse = {}; // No data field

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await OpenRouterService.getModelStats('author/model');

      expect(result.endpoints).toEqual([]);
      expect(result.providerCount).toBe(0);
      expect(result.hasUptimeData).toBe(false);
    });

    it('should handle response with data but no endpoints', async () => {
      const mockResponse = {
        data: {}, // No endpoints field
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await OpenRouterService.getModelStats('author/model');

      expect(result.endpoints).toEqual([]);
      expect(result.providerCount).toBe(0);
    });

    it('should propagate fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('API timeout'));

      await expect(OpenRouterService.getModelStats('author/model')).rejects.toThrow('API timeout');
    });
  });
});
