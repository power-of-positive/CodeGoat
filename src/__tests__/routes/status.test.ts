import request from 'supertest';
import express from 'express';
import { ConfigLoader } from '../../config';
import { ILogger } from '../../logger-interface';
import { createStatusRoutes } from '../../routes/status';

// Mock dependencies
jest.mock('../../config');
jest.mock('../../logger-interface');

const mockConfigLoader = {
  getAllModels: jest.fn(),
  reload: jest.fn(),
} as unknown as ConfigLoader;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as ILogger;

describe('Status Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/status', createStatusRoutes(mockConfigLoader, mockLogger));
    jest.clearAllMocks();
  });

  describe('GET /status', () => {
    it('should return server status information', async () => {
      const mockModels = [
        { id: '1', enabled: true },
        { id: '2', enabled: true },
        { id: '3', enabled: false },
      ];

      (mockConfigLoader.getAllModels as jest.Mock).mockReturnValue(mockModels);

      const response = await request(app).get('/status');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        modelsCount: 3,
        activeModelsCount: 2,
      });
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.uptimeFormatted).toBeDefined();
      expect(response.body.memoryUsage).toBeDefined();
      expect(response.body.nodeVersion).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle errors when getting status fails', async () => {
      (mockConfigLoader.getAllModels as jest.Mock).mockImplementation(() => {
        throw new Error('Config load failed');
      });

      const response = await request(app).get('/status');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to get server status');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('POST /status/reload', () => {
    it('should reload configuration successfully', async () => {
      (mockConfigLoader.reload as jest.Mock).mockImplementation(() => {});

      const response = await request(app).post('/status/reload');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Configuration reloaded successfully');
      expect(response.body.timestamp).toBeDefined();
      expect(mockConfigLoader.reload).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Configuration reloaded via API');
    });

    it('should handle reload errors', async () => {
      (mockConfigLoader.reload as jest.Mock).mockImplementation(() => {
        throw new Error('Reload failed');
      });

      const response = await request(app).post('/status/reload');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to reload configuration');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
