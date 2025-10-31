import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { AnalyticsService } from '../services/analytics.service';
import { StageConsolidationService } from '../services/stage-consolidation.service';
import { getDatabaseService } from '../services/database';
import { validateRequest, validateParams, validateQuery } from '../middleware/validate';
import {
  GetAnalyticsQuerySchema,
  GetSessionsQuerySchema,
  GetSessionParamsSchema,
  StartSessionRequestSchema,
  EndSessionParamsSchema,
  EndSessionRequestSchema,
  RecordAttemptParamsSchema,
  RecordAttemptRequestSchema,
  CleanupSessionsQuerySchema,
  GetStageHistoryParamsSchema,
  GetStageHistoryQuerySchema,
  GetStageStatisticsParamsSchema,
  GetValidationRunsQuerySchema,
  GetValidationStatisticsQuerySchema,
} from '../shared/schemas';

// HTTP Status Code Constants
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

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
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to get analytics' });
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
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to get sessions' });
    }
  };
}

function getSession(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await analyticsService.getSession(sessionId);

      if (!session) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      logger.error('Failed to get session', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to get session' });
    }
  };
}

function startSession(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { userPrompt, taskDescription } = req.body;
      const sessionId = await analyticsService.startSession(userPrompt, taskDescription);

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Session started successfully',
        sessionId,
      });
    } catch (error) {
      logger.error('Failed to start session', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to start session' });
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
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Session not found' });
      } else {
        logger.error('Failed to end session', error as Error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to end session' });
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

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Validation attempt recorded successfully',
        sessionId,
        attempt: attempt.attempt,
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Session not found' });
      } else {
        logger.error('Failed to record validation attempt', error as Error);
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json({ error: 'Failed to record validation attempt' });
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
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to cleanup sessions' });
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
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to get stage history' });
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
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to get stage statistics' });
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
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to get validation runs' });
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
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to get validation statistics' });
    }
  };
}

function getValidationMetrics(analyticsService: AnalyticsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      // Get validation runs from database (limit to recent runs for performance)
      const runs = await analyticsService.getValidationRuns(50);

      // Calculate statistics from runs
      const totalRuns = runs.length;
      const successfulRuns = runs.filter((r: any) => r.success).length;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      // Calculate average duration
      const totalDuration = runs.reduce((sum: number, r: any) => sum + (r.totalTime || 0), 0);
      const averageDuration = totalRuns > 0 ? totalDuration / totalRuns : 0;

      // Initialize stage consolidation service
      const stageConsolidationService = new StageConsolidationService();

      // Get validation stage configurations to show all available stages
      const dbStageConfigs = await getDatabaseService().validationStageConfig.findMany({
        orderBy: { priority: 'asc' },
      });

      // Transform database results to match ValidationStageConfig type
      const stageConfigs = dbStageConfigs.map(config => ({
        stageId: config.stageId,
        name: config.name,
        enabled: config.enabled,
        priority: config.priority,
        command: config.command,
        timeout: config.timeout,
        continueOnFailure: config.continueOnFailure,
        description: config.description || undefined,
        environment: config.environment,
        category: config.category,
      }));

      const consolidatedStageConfigs = stageConsolidationService.consolidateStages(stageConfigs);

      // Collect historical stage statistics if any runs exist
      const stageStatsMap = new Map();

      if (runs.length > 0) {
        runs.forEach((run: any) => {
          if (run.stages) {
            run.stages.forEach((stage: any) => {
              const key = `${stage.stageName}_${stage.stageId || stage.name}`;
              if (!stageStatsMap.has(key)) {
                stageStatsMap.set(key, {
                  stageName: stage.stageName || stage.name,
                  stageId: stage.stageId || stage.name.toLowerCase().replace(/\s+/g, '-'),
                  totalRuns: 0,
                  successCount: 0,
                  totalDuration: 0,
                });
              }
              const stats = stageStatsMap.get(key);
              stats.totalRuns++;
              if (stage.success) stats.successCount++;
              stats.totalDuration += stage.duration || 0;
            });
          }
        });
      }

      // Convert historical stats to array and apply consolidation
      const rawStats = Array.from(stageStatsMap.values());
      const consolidatedHistoricalStats = stageConsolidationService.mergeStageStatistics(rawStats);

      // Create a lookup map for historical stats
      const historicalStatsMap = new Map();
      consolidatedHistoricalStats.forEach(stat => {
        historicalStatsMap.set(stat.stageName, stat);
      });

      // Build stages list showing all consolidated stages (with or without historical data)
      const stages = consolidatedStageConfigs.map(stageConfig => {
        const historical = historicalStatsMap.get(stageConfig.name);

        return {
          stageName: stageConfig.name,
          totalRuns: historical?.totalRuns || 0,
          successRate: historical?.successRate || 0,
          averageDuration: historical?.averageDuration || 0,
          recentTrend: 'stable' as const,
          enabled: stageConfig.enabled,
        };
      });

      const metrics = {
        totalRuns,
        successRate,
        averageDuration,
        stages,
        recentRuns: runs.slice(0, 5),
      };

      logger.info(
        `Validation metrics: ${totalRuns} runs, ${stages.length} consolidated stages (${consolidatedStageConfigs.length} available)`
      );
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get validation metrics', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to get validation metrics' });
    }
  };
}

export function createAnalyticsRoutes(logger: ILogger): Router {
  const router = Router();
  const analyticsService = new AnalyticsService(logger);

  router.get('/', validateQuery(GetAnalyticsQuerySchema), getAnalytics(analyticsService, logger));
  router.get(
    '/sessions',
    validateQuery(GetSessionsQuerySchema),
    getSessions(analyticsService, logger)
  );
  router.get(
    '/sessions/:sessionId',
    validateParams(GetSessionParamsSchema),
    getSession(analyticsService, logger)
  );
  router.post(
    '/sessions',
    validateRequest(StartSessionRequestSchema),
    startSession(analyticsService, logger)
  );
  router.put(
    '/sessions/:sessionId/end',
    validateParams(EndSessionParamsSchema),
    validateRequest(EndSessionRequestSchema),
    endSession(analyticsService, logger)
  );
  router.post(
    '/sessions/:sessionId/attempts',
    validateParams(RecordAttemptParamsSchema),
    validateRequest(RecordAttemptRequestSchema),
    recordAttempt(analyticsService, logger)
  );
  router.delete(
    '/cleanup',
    validateQuery(CleanupSessionsQuerySchema),
    cleanupSessions(analyticsService, logger)
  );

  // Stage-specific analytics
  router.get(
    '/stages/:stageId/history',
    validateParams(GetStageHistoryParamsSchema),
    validateQuery(GetStageHistoryQuerySchema),
    getStageHistory(analyticsService, logger)
  );
  router.get(
    '/stages/:stageId/statistics',
    validateParams(GetStageStatisticsParamsSchema),
    getStageStatistics(analyticsService, logger)
  );

  // Database-based validation runs and statistics
  router.get(
    '/validation-runs',
    validateQuery(GetValidationRunsQuerySchema),
    getValidationRuns(analyticsService, logger)
  );
  router.get(
    '/validation-statistics',
    validateQuery(GetValidationStatisticsQuerySchema),
    getValidationStatistics(analyticsService, logger)
  );

  // Validation metrics endpoint for the Analytics page with stage consolidation
  router.get('/validation-metrics', getValidationMetrics(analyticsService, logger));

  return router;
}
