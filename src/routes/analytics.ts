import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { AnalyticsService } from '../services/analytics.service';

const router = Router();

// eslint-disable-next-line max-lines-per-function
export function createAnalyticsRoutes(logger: ILogger): Router {
  const analyticsService = new AnalyticsService(logger);

  // GET /api/analytics - Get development analytics overview
  router.get('/', async (req: Request, res: Response) => {
    try {
      const analytics = await analyticsService.getAnalytics();
      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get analytics', error as Error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  // GET /api/analytics/sessions - Get recent sessions
  router.get('/sessions', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const sessions = await analyticsService.getRecentSessions(limit);
      res.json({ sessions });
    } catch (error) {
      logger.error('Failed to get sessions', error as Error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  });

  // GET /api/analytics/sessions/:sessionId - Get specific session details
  router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
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
  });

  // POST /api/analytics/sessions - Start a new development session
  router.post('/sessions', async (req: Request, res: Response) => {
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
  });

  // PUT /api/analytics/sessions/:sessionId/end - End a development session
  router.put('/sessions/:sessionId/end', async (req: Request, res: Response) => {
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
  });

  // POST /api/analytics/sessions/:sessionId/attempts - Record a validation attempt
  router.post('/sessions/:sessionId/attempts', async (req: Request, res: Response) => {
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
  });

  // DELETE /api/analytics/cleanup - Clean up old sessions
  router.delete('/cleanup', async (req: Request, res: Response) => {
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
  });

  return router;
}
