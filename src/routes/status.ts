import { Request, Response, Router } from 'express';
import { ConfigLoader } from '../config';
import { ILogger } from '../logger-interface';
import { handleApiError } from '../utils/error-handler';

const router = Router();

export function createStatusRoutes(configLoader: ConfigLoader, logger: ILogger): Router {
  // Get server status
  router.get('/', (req: Request, res: Response) => {
    try {
      const allModels = configLoader.getAllModels();
      const uptime = process.uptime();
      const activeModelsCount = allModels.filter(model => model.enabled).length;

      res.json({
        status: 'healthy',
        uptime,
        uptimeFormatted: formatUptime(uptime),
        modelsCount: allModels.length,
        activeModelsCount,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleApiError(res, logger, 'get server status', error);
    }
  });

  // Reload configuration
  router.post('/reload', (req: Request, res: Response) => {
    try {
      configLoader.reload();
      logger.info('Configuration reloaded via API');

      res.json({
        message: 'Configuration reloaded successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleApiError(res, logger, 'reload configuration', error);
    }
  });

  return router;
}

// Helper function
function formatUptime(uptimeSeconds: number): string {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
