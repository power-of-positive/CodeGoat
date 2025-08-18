import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { AnalyticsService } from '../services/analytics.service';

// Handler functions for analytics routes
function getAnalytics(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const analytics = await analyticsService.getAnalytics();
      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get analytics', error as Error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  };
}

function getSessions(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const sessions = await analyticsService.getRecentSessions(limit);
      res.json({ sessions });
    } catch (error) {
      logger.error('Failed to get sessions', error as Error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  };
}

function getSession(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await analyticsService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      logger.error('Failed to get session', error as Error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  };
}

function startSession(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { userPrompt, taskDescription } = req.body;
      const sessionId = await analyticsService.startSession(userPrompt, taskDescription);

      res.status(201).json({
        message: 'Session started successfully',
        sessionId,
      });
    } catch (error) {
      logger.error('Failed to start session', error as Error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  };
}

function endSession(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { success } = req.body;

      await analyticsService.endSession(sessionId, success === true);

      res.json({
        message: 'Session ended successfully',
        sessionId,
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        res.status(404).json({ error: 'Session not found' });
      } else {
        logger.error('Failed to end session', error as Error);
        res.status(500).json({ error: 'Failed to end session' });
      }
    }
  };
}

function recordAttempt(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const attempt = req.body;

      await analyticsService.recordValidationAttempt(sessionId, attempt);

      res.status(201).json({
        message: 'Validation attempt recorded successfully',
        sessionId,
        attempt: attempt.attempt,
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        res.status(404).json({ error: 'Session not found' });
      } else {
        logger.error('Failed to record validation attempt', error as Error);
        res.status(500).json({ error: 'Failed to record validation attempt' });
      }
    }
  };
}

function cleanupSessions(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const keepLast = parseInt(req.query.keepLast as string) || 100;
      await analyticsService.cleanupSessions(keepLast);

      res.json({
        message: 'Sessions cleaned up successfully',
        keepLast,
      });
    } catch (error) {
      logger.error('Failed to cleanup sessions', error as Error);
      res.status(500).json({ error: 'Failed to cleanup sessions' });
    }
  };
}

function getStageHistory(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { stageId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const history = await analyticsService.getStageHistory(stageId, days);

      res.json({ stageId, history });
    } catch (error) {
      logger.error('Failed to get stage history', error as Error);
      res.status(500).json({ error: 'Failed to get stage history' });
    }
  };
}

function getStageStatistics(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { stageId } = req.params;
      const statistics = await analyticsService.getStageStatistics(stageId);

      res.json({ stageId, statistics });
    } catch (error) {
      logger.error('Failed to get stage statistics', error as Error);
      res.status(500).json({ error: 'Failed to get stage statistics' });
    }
  };
}

export function createAnalyticsRoutes(logger: ILogger): Router {
  const router = Router();
  const analyticsService = new AnalyticsService(logger);

  router.get('/', getAnalytics(analyticsService, logger));
  router.get('/sessions', getSessions(analyticsService, logger));
  router.get('/sessions/:sessionId', getSession(analyticsService, logger));
  router.post('/sessions', startSession(analyticsService, logger));
  router.put('/sessions/:sessionId/end', endSession(analyticsService, logger));
  router.post('/sessions/:sessionId/attempts', recordAttempt(analyticsService, logger));
  router.delete('/cleanup', cleanupSessions(analyticsService, logger));
  
  // Stage-specific analytics
  router.get('/stages/:stageId/history', getStageHistory(analyticsService, logger));
  router.get('/stages/:stageId/statistics', getStageStatistics(analyticsService, logger));

  return router;
}
