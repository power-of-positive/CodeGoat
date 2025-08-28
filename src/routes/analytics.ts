import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { AnalyticsService } from '../services/analytics.service';

// HTTP Status Code Constants
const HTTP_STATUS_CREATED = 201;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

// Default Value Constants
const DEFAULT_SESSIONS_LIMIT = 10;
const DEFAULT_CLEANUP_KEEP_LAST = 100;
const DEFAULT_HISTORY_DAYS = 30;
const DEFAULT_VALIDATION_RUNS_LIMIT = 10;

// Handler functions for analytics routes
function getAnalytics(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const agentFilter = req.query.agent as string;
      const analytics = await analyticsService.getAnalytics(agentFilter);
      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get analytics', error as Error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to get analytics' });
    }
  };
}

function getSessions(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || DEFAULT_SESSIONS_LIMIT;
      const sessions = await analyticsService.getRecentSessions(limit);
      res.json({ sessions });
    } catch (error) {
      logger.error('Failed to get sessions', error as Error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to get sessions' });
    }
  };
}

function getSession(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await analyticsService.getSession(sessionId);

      if (!session) {
        res.status(HTTP_STATUS_NOT_FOUND).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      logger.error('Failed to get session', error as Error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to get session' });
    }
  };
}

function startSession(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { userPrompt, taskDescription } = req.body;
      const sessionId = await analyticsService.startSession(userPrompt, taskDescription);

      res.status(HTTP_STATUS_CREATED).json({
        message: 'Session started successfully',
        sessionId,
      });
    } catch (error) {
      logger.error('Failed to start session', error as Error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to start session' });
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
        res.status(HTTP_STATUS_NOT_FOUND).json({ error: 'Session not found' });
      } else {
        logger.error('Failed to end session', error as Error);
        res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to end session' });
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

      res.status(HTTP_STATUS_CREATED).json({
        message: 'Validation attempt recorded successfully',
        sessionId,
        attempt: attempt.attempt,
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        res.status(HTTP_STATUS_NOT_FOUND).json({ error: 'Session not found' });
      } else {
        logger.error('Failed to record validation attempt', error as Error);
        res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to record validation attempt' });
      }
    }
  };
}

function cleanupSessions(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const keepLast = parseInt(req.query.keepLast as string) || DEFAULT_CLEANUP_KEEP_LAST;
      await analyticsService.cleanupSessions(keepLast);

      res.json({
        message: 'Sessions cleaned up successfully',
        keepLast,
      });
    } catch (error) {
      logger.error('Failed to cleanup sessions', error as Error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to cleanup sessions' });
    }
  };
}

function getStageHistory(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { stageId } = req.params;
      const days = parseInt(req.query.days as string) || DEFAULT_HISTORY_DAYS;
      const history = await analyticsService.getStageHistory(stageId, days);

      res.json({ stageId, history });
    } catch (error) {
      logger.error('Failed to get stage history', error as Error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to get stage history' });
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
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to get stage statistics' });
    }
  };
}

function getValidationRuns(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || DEFAULT_VALIDATION_RUNS_LIMIT;
      const taskId = req.query.taskId as string;
      const validationRuns = await analyticsService.getValidationRuns(limit, taskId);

      res.json({ validationRuns });
    } catch (error) {
      logger.error('Failed to get validation runs', error as Error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to get validation runs' });
    }
  };
}

function getValidationStatistics(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || DEFAULT_HISTORY_DAYS;
      const statistics = await analyticsService.getValidationRunStatistics(days);

      res.json({ statistics });
    } catch (error) {
      logger.error('Failed to get validation statistics', error as Error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Failed to get validation statistics' });
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

  // Database-based validation runs and statistics
  router.get('/validation-runs', getValidationRuns(analyticsService, logger));
  router.get('/validation-statistics', getValidationStatistics(analyticsService, logger));

  return router;
}
