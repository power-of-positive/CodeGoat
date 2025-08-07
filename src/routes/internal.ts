import { Request, Response, Router } from 'express';

const router = Router();

export function createInternalRoutes(): Router {
  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
  });

  // Simple test route
  router.get('/test', (req: Request, res: Response) => {
    res.json({ message: 'Test route works!' });
  });

  return router;
}
