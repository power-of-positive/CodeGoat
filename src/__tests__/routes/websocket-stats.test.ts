import request from 'supertest';
import express from 'express';
import { createWebSocketStatsRoutes } from '../../routes/websocket-stats';
import { WebSocketService } from '../../services/websocket.service';
import { ILogger } from '../../logger-interface';

// Mock the WebSocketService
jest.mock('../../services/websocket.service');

describe('WebSocket Stats Routes', () => {
  let app: express.Application;
  let mockWebSocketService: any;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Create mock instances
    mockWebSocketService = {
      initialize: jest.fn(),
      getStats: jest.fn(),
      broadcast: jest.fn(),
      broadcastTaskUpdate: jest.fn(),
      broadcastTaskAttemptUpdate: jest.fn(),
      broadcastExecutionProgress: jest.fn(),
      sendToProjectRoom: jest.fn(),
      getServer: jest.fn(),
      shutdown: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      middleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    } as jest.Mocked<ILogger>;

    // Create Express app with the routes
    app = express();
    app.use(express.json());
    app.use('/api/websocket', createWebSocketStatsRoutes(mockWebSocketService, mockLogger));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/websocket/stats', () => {
    it('should return WebSocket statistics successfully', async () => {
      const mockStats = {
        connectedClients: 5,
        projectRooms: 2,
        roomDetails: [
          { projectId: 'project1', clientCount: 3 },
          { projectId: 'project2', clientCount: 2 }
        ]
      };

      mockWebSocketService.getStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/websocket/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats,
        timestamp: expect.any(Number)
      });

      expect(mockWebSocketService.getStats).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return empty stats when no connections exist', async () => {
      const emptyStats = {
        connectedClients: 0,
        projectRooms: 0,
        roomDetails: []
      };

      mockWebSocketService.getStats.mockReturnValue(emptyStats);

      const response = await request(app)
        .get('/api/websocket/stats')
        .expect(200);

      expect(response.body.data).toEqual(emptyStats);
      expect(response.body.success).toBe(true);
    });

    it('should handle errors when WebSocket service throws', async () => {
      const error = new Error('WebSocket service unavailable');
      mockWebSocketService.getStats.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/websocket/stats')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve WebSocket statistics'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get WebSocket stats',
        error
      );
      expect(mockWebSocketService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should handle WebSocket service returning null/undefined', async () => {
      mockWebSocketService.getStats.mockReturnValue(null as any);

      const response = await request(app)
        .get('/api/websocket/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: null,
        timestamp: expect.any(Number)
      });
    });

    it('should include accurate timestamp in response', async () => {
      const mockStats = { 
        connectedClients: 1,
        projectRooms: 1,
        roomDetails: [{ projectId: 'test', clientCount: 1 }]
      };
      mockWebSocketService.getStats.mockReturnValue(mockStats);

      const beforeRequest = Date.now();
      const response = await request(app)
        .get('/api/websocket/stats')
        .expect(200);
      const afterRequest = Date.now();

      expect(response.body.timestamp).toBeGreaterThanOrEqual(beforeRequest);
      expect(response.body.timestamp).toBeLessThanOrEqual(afterRequest);
    });
  });

  describe('Route integration', () => {
    it('should only respond to GET requests on /stats endpoint', async () => {
      // Test that POST is not supported
      await request(app)
        .post('/api/websocket/stats')
        .expect(404);

      // Test that PUT is not supported
      await request(app)
        .put('/api/websocket/stats')
        .expect(404);

      // Test that DELETE is not supported
      await request(app)
        .delete('/api/websocket/stats')
        .expect(404);
    });

    it('should return 404 for unknown WebSocket routes', async () => {
      await request(app)
        .get('/api/websocket/unknown')
        .expect(404);
    });
  });
});