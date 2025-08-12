import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';

/**
 * Create health check routes for Kanban API
 */
export function createKanbanHealthRoutes(kanbanDb: KanbanDatabaseService, logger: ILogger): Router {
  const router = Router();

  /**
   * Health check endpoint - required by e2e tests
   * Returns ApiResponse<"OK"> format as specified in vibe-kanban tests
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      // Check database health
      const isDbHealthy = await kanbanDb.healthCheck();

      if (!isDbHealthy) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Database health check failed',
        };

        logger.error('Kanban health check failed - database unhealthy');
        return res.status(200).json(response);
      }

      // Return success response matching contract test expectations
      const response = {
        success: true,
        data: 'OK',
        error_data: null,
        message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Health check error', error as Error);

      const response = {
        success: false,
        data: null,
        error_data: null,
        message: 'Health check failed',
      };

      res.status(200).json(response);
    }
  });

  return router;
}
