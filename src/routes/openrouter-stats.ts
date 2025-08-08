import { Request, Response, Router } from 'express';
import { ILogger } from '../logger-interface';
import { OpenRouterService } from '../services/openrouter.service';

const router = Router();

export function createOpenRouterStatsRoutes(logger: ILogger): Router {
  // Get OpenRouter model statistics
  router.get(/.*/, async (req: Request, res: Response) => {
    try {
      // Remove leading slash from path to get model slug
      const modelSlug = req.path.startsWith('/') ? req.path.slice(1) : req.path;
      const stats = await OpenRouterService.getModelStats(modelSlug);
      res.json(stats);
    } catch (error) {
      const modelSlug = req.path.startsWith('/') ? req.path.slice(1) : req.path;
      const cleanSlug = OpenRouterService.cleanModelSlug(modelSlug);

      if (error instanceof Error && error.message.includes('OpenRouter API error: 404')) {
        return res.status(404).json({
          error: 'Model not found in OpenRouter',
          modelSlug: cleanSlug,
        });
      }

      logger.error('Failed to fetch OpenRouter stats', error as Error);
      res.status(500).json({ error: 'Failed to fetch model statistics' });
    }
  });

  return router;
}
