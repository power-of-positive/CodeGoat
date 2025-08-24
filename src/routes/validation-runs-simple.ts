import express, { Request, Response } from 'express';
import { WinstonLogger } from '../logger-winston';

export function createValidationRunRoutes(logger: WinstonLogger) {
  const router = express.Router();

  // Simple health check route
  router.get('/', (req: Request, res: Response) => {
    try {
      res.json({ success: true, message: 'Validation runs API is working' });
    } catch (error) {
      logger.error('Error in validation runs route:', error as Error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  return router;
}