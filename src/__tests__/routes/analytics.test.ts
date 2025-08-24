import request from 'supertest';
import express from 'express';
import { createAnalyticsRoutes } from '../../routes/analytics';
import { AnalyticsService } from '../../services/analytics.service';
import { ILogger } from '../../logger-interface';

// Mock the AnalyticsService
jest.mock('../../services/analytics.service');

describe('Analytics Routes', () => {
  let app: express.Application;
  let mockAnalyticsService: any;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Create mock instances
    mockAnalyticsService = {
      startSession: jest.fn(),
      endSession: jest.fn(),
      recordValidationAttempt: jest.fn(),
      getAnalytics: jest.fn(),
      getSession: jest.fn(),
      getRecentSessions: jest.fn(),
      cleanupSessions: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      middleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    } as jest.Mocked<ILogger>;

    // Mock the constructor to return our mock service
    (AnalyticsService as jest.MockedClass<typeof AnalyticsService>).mockImplementation(
      () => mockAnalyticsService
    );

    // Create Express app with the routes
    app = express();
    app.use(express.json());
    app.use('/api/analytics', createAnalyticsRoutes(mockLogger));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/', () => {
    it('should return analytics data successfully', async () => {
      const mockAnalytics = {
        totalSessions: 10,
        successRate: 75.5,
        averageTimeToSuccess: 1200,
        averageAttemptsToSuccess: 2.5,
        mostFailedStage: 'test',
        stageSuccessRates: {
          lint: { attempts: 10, successes: 9, rate: 90 },
          test: { attempts: 10, successes: 6, rate: 60 },
        },
        dailyStats: {},
      };

      mockAnalyticsService.getAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app).get('/api/analytics/').expect(200);

      expect(response.body).toEqual(mockAnalytics);
      expect(mockAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle errors when analytics service fails', async () => {
      const error = new Error('Analytics service error');
      mockAnalyticsService.getAnalytics.mockRejectedValue(error);

      const response = await request(app).get('/api/analytics/').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to get analytics',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get analytics', error);
    });
  });

  describe('GET /api/analytics/sessions', () => {
    it('should return sessions with default limit', async () => {
      const mockSessions = [
        {
          sessionId: '1',
          startTime: 1000,
          endTime: 2000,
          attempts: [],
          finalSuccess: true,
          totalValidationTime: 1000,
          averageStageTime: 500,
        },
        {
          sessionId: '2',
          startTime: 2000,
          endTime: 3000,
          attempts: [],
          finalSuccess: false,
          totalValidationTime: 1000,
          averageStageTime: 500,
        },
      ];

      mockAnalyticsService.getRecentSessions.mockResolvedValue(mockSessions);

      const response = await request(app).get('/api/analytics/sessions').expect(200);

      expect(response.body).toEqual({ sessions: mockSessions });
      expect(mockAnalyticsService.getRecentSessions).toHaveBeenCalledWith(10);
    });

    it('should return sessions with custom limit', async () => {
      const mockSessions = [
        {
          sessionId: '1',
          startTime: 1000,
          endTime: 2000,
          attempts: [],
          finalSuccess: true,
          totalValidationTime: 1000,
          averageStageTime: 500,
        },
      ];

      mockAnalyticsService.getRecentSessions.mockResolvedValue(mockSessions);

      const response = await request(app).get('/api/analytics/sessions?limit=5').expect(200);

      expect(response.body).toEqual({ sessions: mockSessions });
      expect(mockAnalyticsService.getRecentSessions).toHaveBeenCalledWith(5);
    });

    it('should handle invalid limit parameter by using default', async () => {
      const mockSessions: any[] = [];
      mockAnalyticsService.getRecentSessions.mockResolvedValue(mockSessions);

      await request(app).get('/api/analytics/sessions?limit=invalid').expect(200);

      expect(mockAnalyticsService.getRecentSessions).toHaveBeenCalledWith(10);
    });

    it('should handle errors when getting sessions', async () => {
      const error = new Error('Sessions service error');
      mockAnalyticsService.getRecentSessions.mockRejectedValue(error);

      const response = await request(app).get('/api/analytics/sessions').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to get sessions',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get sessions', error);
    });
  });

  describe('GET /api/analytics/sessions/:sessionId', () => {
    it('should return session by ID', async () => {
      const mockSession = {
        sessionId: 'test-session',
        startTime: 1000,
        endTime: 2000,
        attempts: [],
        finalSuccess: true,
        totalValidationTime: 1000,
        averageStageTime: 500,
      };

      mockAnalyticsService.getSession.mockResolvedValue(mockSession);

      const response = await request(app).get('/api/analytics/sessions/test-session').expect(200);

      expect(response.body).toEqual(mockSession);
      expect(mockAnalyticsService.getSession).toHaveBeenCalledWith('test-session');
    });

    it('should return 404 when session not found', async () => {
      mockAnalyticsService.getSession.mockResolvedValue(null);

      const response = await request(app).get('/api/analytics/sessions/non-existent').expect(404);

      expect(response.body).toEqual({
        error: 'Session not found',
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAnalyticsService.getSession.mockRejectedValue(error);

      const response = await request(app).get('/api/analytics/sessions/test-session').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to get session',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get session', error);
    });
  });

  describe('POST /api/analytics/sessions', () => {
    it('should start a new session successfully', async () => {
      const sessionId = 'new-session-id';
      mockAnalyticsService.startSession.mockResolvedValue(sessionId);

      const response = await request(app)
        .post('/api/analytics/sessions')
        .send({
          userPrompt: 'Test prompt',
          taskDescription: 'Test task',
        })
        .expect(201);

      expect(response.body).toEqual({
        message: 'Session started successfully',
        sessionId,
      });

      expect(mockAnalyticsService.startSession).toHaveBeenCalledWith('Test prompt', 'Test task');
    });

    it('should start session without prompt and description', async () => {
      const sessionId = 'new-session-id';
      mockAnalyticsService.startSession.mockResolvedValue(sessionId);

      const response = await request(app).post('/api/analytics/sessions').send({}).expect(201);

      expect(response.body).toEqual({
        message: 'Session started successfully',
        sessionId,
      });

      expect(mockAnalyticsService.startSession).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should handle errors when starting session', async () => {
      const error = new Error('Start session error');
      mockAnalyticsService.startSession.mockRejectedValue(error);

      const response = await request(app).post('/api/analytics/sessions').send({}).expect(500);

      expect(response.body).toEqual({
        error: 'Failed to start session',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to start session', error);
    });
  });

  describe('PUT /api/analytics/sessions/:sessionId/end', () => {
    it('should end session successfully', async () => {
      mockAnalyticsService.endSession.mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/analytics/sessions/test-session/end')
        .send({ success: true })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Session ended successfully',
        sessionId: 'test-session',
      });

      expect(mockAnalyticsService.endSession).toHaveBeenCalledWith('test-session', true);
    }, 10000);

    it('should handle success false value', async () => {
      mockAnalyticsService.endSession.mockResolvedValue(undefined);

      await request(app)
        .put('/api/analytics/sessions/test-session/end')
        .send({ success: false })
        .expect(200);

      expect(mockAnalyticsService.endSession).toHaveBeenCalledWith('test-session', false);
    });

    it('should handle missing success value', async () => {
      mockAnalyticsService.endSession.mockResolvedValue(undefined);

      await request(app).put('/api/analytics/sessions/test-session/end').send({}).expect(200);

      expect(mockAnalyticsService.endSession).toHaveBeenCalledWith('test-session', false);
    });

    it('should return 404 when session not found', async () => {
      const error = new Error('Session not found');
      mockAnalyticsService.endSession.mockRejectedValue(error);

      const response = await request(app)
        .put('/api/analytics/sessions/non-existent/end')
        .send({ success: true })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Session not found',
      });
    });

    it('should handle general service errors', async () => {
      const error = new Error('Service error');
      mockAnalyticsService.endSession.mockRejectedValue(error);

      const response = await request(app)
        .put('/api/analytics/sessions/test-session/end')
        .send({ success: true })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to end session',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to end session', error);
    });
  });

  describe('POST /api/analytics/sessions/:sessionId/attempts', () => {
    it('should record validation attempt successfully', async () => {
      const attemptData = {
        attempt: 1,
        timestamp: '2023-10-01T10:00:00Z',
        stages: [{ id: 'lint', success: true, duration: 200 }],
      };

      mockAnalyticsService.recordValidationAttempt.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/analytics/sessions/test-session/attempts')
        .send(attemptData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Validation attempt recorded successfully',
        sessionId: 'test-session',
        attempt: 1,
      });

      expect(mockAnalyticsService.recordValidationAttempt).toHaveBeenCalledWith(
        'test-session',
        attemptData
      );
    });

    it('should return 404 when session not found', async () => {
      const error = new Error('Session not found');
      mockAnalyticsService.recordValidationAttempt.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/analytics/sessions/non-existent/attempts')
        .send({ attempt: 1 })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Session not found',
      });
    });

    it('should handle general service errors', async () => {
      const error = new Error('Service error');
      mockAnalyticsService.recordValidationAttempt.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/analytics/sessions/test-session/attempts')
        .send({ attempt: 1 })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to record validation attempt',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to record validation attempt', error);
    });
  });

  describe('DELETE /api/analytics/cleanup', () => {
    it('should cleanup sessions with default keepLast value', async () => {
      mockAnalyticsService.cleanupSessions.mockResolvedValue(undefined);

      const response = await request(app).delete('/api/analytics/cleanup').expect(200);

      expect(response.body).toEqual({
        message: 'Sessions cleaned up successfully',
        keepLast: 100,
      });

      expect(mockAnalyticsService.cleanupSessions).toHaveBeenCalledWith(100);
    });

    it('should cleanup sessions with custom keepLast value', async () => {
      mockAnalyticsService.cleanupSessions.mockResolvedValue(undefined);

      const response = await request(app).delete('/api/analytics/cleanup?keepLast=50').expect(200);

      expect(response.body).toEqual({
        message: 'Sessions cleaned up successfully',
        keepLast: 50,
      });

      expect(mockAnalyticsService.cleanupSessions).toHaveBeenCalledWith(50);
    });

    it('should handle invalid keepLast parameter by using default', async () => {
      mockAnalyticsService.cleanupSessions.mockResolvedValue(undefined);

      await request(app).delete('/api/analytics/cleanup?keepLast=invalid').expect(200);

      expect(mockAnalyticsService.cleanupSessions).toHaveBeenCalledWith(100);
    });

    it('should handle cleanup errors', async () => {
      const error = new Error('Cleanup error');
      mockAnalyticsService.cleanupSessions.mockRejectedValue(error);

      const response = await request(app).delete('/api/analytics/cleanup').expect(500);

      expect(response.body).toEqual({
        error: 'Failed to cleanup sessions',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to cleanup sessions', error);
    });
  });

  describe('Route integration', () => {
    it('should create all expected routes', () => {
      // This test verifies that all routes are properly registered
      const routes = createAnalyticsRoutes(mockLogger);
      expect(routes).toBeDefined();

      // The router should have the expected stack of routes
      expect(routes.stack).toHaveLength(11); // 11 routes defined (added 4 more routes: 2 stage routes + 2 database routes)
    });

    it('should validate that AnalyticsService is properly mocked', () => {
      expect(AnalyticsService).toHaveBeenCalled();
      expect(mockAnalyticsService.startSession).toBeDefined();
      expect(mockAnalyticsService.getAnalytics).toBeDefined();
    });

    it('should return 404 for unknown routes', async () => {
      await request(app).get('/api/analytics/unknown').expect(404);
    });
  });
});
