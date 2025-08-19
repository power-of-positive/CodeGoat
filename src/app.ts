import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { WinstonLogger } from './logger-winston';
import { createSettingsRoutes } from './routes/settings';
import { createAnalyticsRoutes } from './routes/analytics';
import { createTaskRoutes } from './routes/tasks';
import claudeWorkersRouter from './routes/claude-workers';

export function createApp() {
  const app = express();

  const logsDir = path.join(process.cwd(), 'logs');
  const logger = new WinstonLogger({
    level: 'info',
    logsDir,
    enableConsole: true,
    enableFile: true,
    maxFiles: '10',
    maxSize: '10485760', // 10MB
  });

  // CORS configuration for UI integration
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Allow requests from localhost (development) and same origin
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite dev server (default)
      'http://localhost:5174', // Vite dev server (configured)
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  });

  // Configure body parser
  app.use(
    express.json({
      limit: '10mb',
    })
  );
  app.use(
    express.urlencoded({
      limit: '10mb',
      extended: true,
    })
  );

  // Handle body parser errors
  app.use((error: Error & { type?: string }, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      logger.error('Body parser syntax error', error, {
        method: req.method,
        path: req.path,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
      });
      return res.status(400).json({
        error: 'Invalid JSON in request body',
      });
    }

    if (error.type === 'entity.too.large') {
      logger.error('Request entity too large', error, {
        method: req.method,
        path: req.path,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
      });
      return res.status(413).json({
        error: 'Request payload too large',
      });
    }

    next(error);
  });

  // Debug middleware
  app.use((req, _res, next) => {
    logger.debug('Request received', {
      method: req.method,
      path: req.path,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
    });
    next();
  });

  app.use(logger.middleware());

  // Serve static files from UI build directory
  const uiDistPath = path.join(__dirname, '../ui/dist');
  app.use('/ui', express.static(uiDistPath));

  // Mount API routes
  app.use('/api/settings', createSettingsRoutes(logger));
  app.use('/api/analytics', createAnalyticsRoutes(logger));
  app.use('/api/tasks', createTaskRoutes(logger));
  app.use('/api/claude-workers', claudeWorkersRouter);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Catch-all for unmatched routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}