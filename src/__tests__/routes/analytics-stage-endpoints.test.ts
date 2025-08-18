import request from 'supertest';
import express from 'express';
import { createAnalyticsRoutes } from '../../routes/analytics';
import { ILogger } from '../../logger-interface';

// Mock logger
const mockLogger: ILogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock AnalyticsService
jest.mock('../../services/analytics.service', () => {
  return {
    AnalyticsService: jest.fn().mockImplementation(() => ({
      getStageHistory: jest.fn().mockResolvedValue({
        dailyMetrics: [
          {
            date: '2025-08-18',
            attempts: 10,
            successes: 8,
            failures: 2,
            successRate: 80,
            averageDuration: 5000,
            totalDuration: 50000
          }
        ],
        trends: {
          successRateTrend: 5.2,
          durationTrend: -200,
          totalAttempts: 10,
          totalSuccesses: 8
        }
      }),
      getStageStatistics: jest.fn().mockResolvedValue({
        overview: {
          totalAttempts: 100,
          totalSuccesses: 85,
          totalFailures: 15,
          successRate: 85,
          averageDuration: 5000,
          medianDuration: 4500,
          minDuration: 2000,
          maxDuration: 12000,
          standardDeviation: 1500
        },
        recentRuns: [
          {
            timestamp: '2025-08-18T06:00:00.000Z',
            success: true,
            duration: 4500,
            sessionId: 'session_123'
          }
        ],
        performanceMetrics: {
          durationsPercentiles: {
            p50: 4500,
            p90: 7000,
            p95: 8500,
            p99: 10000
          },
          successRateByTimeOfDay: {
            '06:00': { attempts: 5, successes: 4, rate: 80 }
          },
          failureReasons: {
            'Timeout': 3,
            'Type Error': 2
          }
        }
      })
    }))
  };
});

describe('Analytics Stage Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/analytics', createAnalyticsRoutes(mockLogger));
  });

  describe('GET /analytics/stages/:stageId/history', () => {
    it('should return stage history data', async () => {
      const response = await request(app)
        .get('/analytics/stages/lint/history')
        .query({ days: 30 })
        .expect(200);

      expect(response.body).toHaveProperty('stageId', 'lint');
      expect(response.body).toHaveProperty('history');
      expect(response.body.history).toHaveProperty('dailyMetrics');
      expect(response.body.history).toHaveProperty('trends');
      expect(response.body.history.dailyMetrics).toBeInstanceOf(Array);
      expect(response.body.history.trends).toHaveProperty('successRateTrend');
    });

    it('should use default days parameter when not specified', async () => {
      const response = await request(app)
        .get('/analytics/stages/typecheck/history')
        .expect(200);

      expect(response.body).toHaveProperty('stageId', 'typecheck');
      expect(response.body).toHaveProperty('history');
    });
  });

  describe('GET /analytics/stages/:stageId/statistics', () => {
    it('should return stage statistics data', async () => {
      const response = await request(app)
        .get('/analytics/stages/lint/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('stageId', 'lint');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toHaveProperty('overview');
      expect(response.body.statistics).toHaveProperty('recentRuns');
      expect(response.body.statistics).toHaveProperty('performanceMetrics');
      
      // Check overview structure
      expect(response.body.statistics.overview).toHaveProperty('totalAttempts');
      expect(response.body.statistics.overview).toHaveProperty('successRate');
      expect(response.body.statistics.overview).toHaveProperty('averageDuration');
      
      // Check performance metrics structure
      expect(response.body.statistics.performanceMetrics).toHaveProperty('durationsPercentiles');
      expect(response.body.statistics.performanceMetrics).toHaveProperty('successRateByTimeOfDay');
      expect(response.body.statistics.performanceMetrics).toHaveProperty('failureReasons');
    });
  });

});