import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { WinstonLogger } from './logger-winston';
import { LogCleaner } from './utils/log-cleaner';
import { createSettingsRoutes } from './routes/settings';
import { createAnalyticsRoutes } from './routes/analytics';
import { createTaskRoutes } from './routes/tasks';
import { createPermissionRoutes } from './routes/permissions';
import claudeWorkersRouter from './routes/claude-workers';
import { createDatabaseService } from './services/database';

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

// Initialize database service
createDatabaseService(logger);

// Initialize optimized log cleaner for better performance
const logCleaner = new LogCleaner(
  {
    logsDir,
    maxLogFiles: 25, // Reduced from 50 for better performance
    maxLogAge: 14, // Reduced from 30 days for active development
    maxLogSize: 5 * 1024 * 1024, // 5MB instead of 10MB for more frequent rotation
  },
  logger
);

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
app.use('/api/permissions', createPermissionRoutes(logger));
app.use('/api/claude-workers', claudeWorkersRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Catch-all for unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});


// Create HTTP server
const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = httpServer.listen(Number(PORT), HOST, () => {
  logger.info(`Validation analytics server running on ${HOST}:${PORT}`);

  // Run initial log cleanup
  void logCleaner.cleanLogs();

  // Schedule log cleanup every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    void logCleaner.cleanLogs();
  }, SIX_HOURS);
});

// Set reasonable server timeout
server.timeout = 30000; // 30 seconds

// Initialize log management
import { logManager } from './utils/log-manager';

// Schedule daily log cleanup
logManager.scheduleCleanup(24);
console.error('🧹 Log cleanup scheduled to run every 24 hours');

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  // Don't exit the process - just log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), { promise: promise.toString() });
  // Don't exit the process - just log and continue
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing server');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
