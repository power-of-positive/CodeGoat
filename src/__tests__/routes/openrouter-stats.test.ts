import request from 'supertest';
import express from 'express';
import { ILogger } from '../../logger-interface';
import { createOpenRouterStatsRoutes } from '../../routes/openrouter-stats';
import { OpenRouterService } from '../../services/openrouter.service';

// Mock dependencies
jest.mock('../../logger-interface');
jest.mock('../../services/openrouter.service');

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as ILogger;

const mockOpenRouterService = OpenRouterService as jest.Mocked<typeof OpenRouterService>;

describe('OpenRouter Stats Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/openrouter-stats', createOpenRouterStatsRoutes(mockLogger));
    jest.clearAllMocks();
  });

  describe('GET /openrouter-stats/:modelSlug', () => {
    it('should return model statistics successfully', async () => {
      const mockStats = {
        modelSlug: 'test/model',
        endpoints: [
          {
            provider: 'Provider 1',
            contextLength: 4096,
            maxTokens: 2048,
            uptime: 98.5,
            pricing: { prompt: '0.001', completion: '0.002' },
            moderated: false,
          },
          {
            provider: 'Provider 2',
            contextLength: 8192,
            maxTokens: 4096,
            uptime: 95.0,
            pricing: { prompt: '0.0015', completion: '0.003' },
            moderated: true,
          },
        ],
        averageUptime: 96.75,
        providerCount: 2,
        hasUptimeData: true,
      };

      mockOpenRouterService.getModelStats.mockResolvedValue(mockStats);

      const response = await request(app).get('/openrouter-stats/openrouter/test/model');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        modelSlug: 'test/model',
        providerCount: 2,
        hasUptimeData: true,
      });
      expect(response.body.endpoints).toHaveLength(2);
      expect(response.body.averageUptime).toBeCloseTo(96.75, 1);
      expect(response.body.endpoints[0]).toMatchObject({
        provider: 'Provider 1',
        contextLength: 4096,
        maxTokens: 2048,
        uptime: 98.5,
        moderated: false,
      });
    });

    it('should handle models without uptime data', async () => {
      const mockStats = {
        modelSlug: 'test/model',
        endpoints: [
          {
            provider: 'Provider 1',
            contextLength: 4096,
            maxTokens: 2048,
            uptime: null,
            pricing: { prompt: '0.001', completion: '0.002' },
            moderated: false,
          },
        ],
        averageUptime: null,
        providerCount: 1,
        hasUptimeData: false,
      };

      mockOpenRouterService.getModelStats.mockResolvedValue(mockStats);

      const response = await request(app).get('/openrouter-stats/openrouter/test/model');

      expect(response.status).toBe(200);
      expect(response.body.hasUptimeData).toBe(false);
      expect(response.body.averageUptime).toBeNull();
      expect(response.body.endpoints[0].uptime).toBeNull();
    });

    it('should handle model not found in OpenRouter', async () => {
      mockOpenRouterService.getModelStats.mockRejectedValue(new Error('OpenRouter API error: 404'));
      mockOpenRouterService.cleanModelSlug.mockReturnValue('nonexistent/model');

      const response = await request(app).get('/openrouter-stats/openrouter/nonexistent/model');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Model not found in OpenRouter');
      expect(response.body.modelSlug).toBe('nonexistent/model');
    });

    it('should handle fetch errors', async () => {
      mockOpenRouterService.getModelStats.mockRejectedValue(new Error('Network error'));

      const response = await request(app).get('/openrouter-stats/openrouter/test/model');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch model statistics');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch OpenRouter stats',
        expect.any(Error)
      );
    });

    it('should handle malformed OpenRouter API responses', async () => {
      const mockEmptyStats = {
        modelSlug: 'test/model',
        endpoints: [],
        averageUptime: null,
        providerCount: 0,
        hasUptimeData: false,
      };

      mockOpenRouterService.getModelStats.mockResolvedValue(mockEmptyStats);

      const response = await request(app).get('/openrouter-stats/openrouter/test/model');

      expect(response.status).toBe(200);
      expect(response.body.endpoints).toHaveLength(0);
      expect(response.body.providerCount).toBe(0);
      expect(response.body.hasUptimeData).toBe(false);
    });

    it('should properly clean model slug by removing openrouter prefix', async () => {
      const mockStats = {
        modelSlug: 'test/model-name',
        endpoints: [],
        averageUptime: null,
        providerCount: 0,
        hasUptimeData: false,
      };

      mockOpenRouterService.getModelStats.mockResolvedValue(mockStats);

      const response = await request(app).get('/openrouter-stats/openrouter/test/model-name');

      expect(response.status).toBe(200);
      expect(mockOpenRouterService.getModelStats).toHaveBeenCalledWith(
        'openrouter/test/model-name'
      );
    });
  });
});
