import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { WebSocketService } from '../services/websocket.service';

export function createWebSocketStatsRoutes(
  webSocketService: WebSocketService,
  logger: ILogger
): Router {
  const router = Router();

  // GET /api/websocket/stats - Get WebSocket connection statistics
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const stats = webSocketService.getStats();
      res.json({
        success: true,
        data: stats,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Failed to get WebSocket stats', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve WebSocket statistics',
      });
    }
  });

  return router;
}
