// Suppress dotenv debug messages
process.env.DEBUG = '';
process.env.DOTENV_CONFIG_DEBUG = 'false';
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import path from 'path';
import { getLogger } from './logger-singleton';
import { LogCleaner } from './utils/log-cleaner';
import { createSettingsRoutes } from './routes/settings';
import { createAnalyticsRoutes } from './routes/analytics';
import { createTasksRoutes } from './routes/tasks';
import { createPermissionRoutes } from './routes/permissions';
import { createE2ERoutes } from './routes/e2e';
import bddScenariosRouter from './routes/bdd-scenarios';
import { createValidationRunRoutes } from './routes/validation-runs';
import claudeWorkersRouter from './routes/claude-workers';
import { createOrchestratorRoutes } from './routes/orchestrator';
import validationStageConfigsRouter from './routes/validation-stage-configs';
import { createBackupRoutes } from './routes/backup';
import { createDatabaseService } from './services/database';
import { createErrorHandler } from './middleware/error-handler';

// Constants
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;

// HTTP Status Codes
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_PAYLOAD_TOO_LARGE = 413;

// Time Constants
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const LOG_CLEANUP_INTERVAL_HOURS = 24;
const MEMORY_CLEANUP_INTERVAL_MINUTES = 6;

// Port Constants
const DEFAULT_PORT = 3000;
const SERVER_TIMEOUT_SECONDS = 30;

const app = express();

const logsDir = path.join(process.cwd(), 'logs');
const logger = getLogger({
  level: 'info',
  logsDir,
  enableConsole: process.env.NODE_ENV !== 'test',
  enableFile: process.env.NODE_ENV !== 'test', // Disable file logging in tests
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
    maxLogSize: 5 * BYTES_PER_KB * KB_PER_MB, // 5MB instead of 10MB for more frequent rotation
  },
  logger
);

// CORS configuration for UI integration
app.use((req: Request, res: Response, next: NextFunction) => {
  // Allow requests from localhost (development) and same origin
  const allowedOrigins = [
    `http://localhost:${DEFAULT_PORT}`,
    'http://localhost:3001',
    'http://localhost:5173', // Vite dev server (default)
    'http://localhost:5174', // Vite dev server (configured)
    `http://127.0.0.1:${DEFAULT_PORT}`,
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
    res.status(HTTP_OK).end();
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
    return res.status(HTTP_BAD_REQUEST).json({
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
    return res.status(HTTP_PAYLOAD_TOO_LARGE).json({
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
const uiDistPath = path.join(process.cwd(), 'ui/dist');
app.use('/ui', express.static(uiDistPath));
app.use(express.static(uiDistPath)); // Also serve UI at root

// Mount API routes
app.use('/api/settings', createSettingsRoutes(logger));
app.use('/api/analytics', createAnalyticsRoutes(logger));
app.use('/api/tasks', createTasksRoutes(logger));
app.use('/api/permissions', createPermissionRoutes(logger));
app.use('/api/e2e', createE2ERoutes(logger));
app.use('/api/bdd-scenarios', bddScenariosRouter);
app.use('/api/validation-runs', createValidationRunRoutes(logger));
app.use('/api/claude-workers', claudeWorkersRouter);
app.use('/api/orchestrator', createOrchestratorRoutes(logger));
app.use('/api/validation-stage-configs', validationStageConfigsRouter);
app.use('/api/backups', createBackupRoutes(logger));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Catch-all for unmatched routes - serve index.html for client-side routing
app.use((req: Request, res: Response) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    res.status(HTTP_NOT_FOUND).json({ error: 'Not found' });
  } else {
    res.sendFile(path.join(uiDistPath, 'index.html'));
  }
});

// Global error handler - MUST be registered after all routes
app.use(createErrorHandler(logger));

// Create HTTP server
const httpServer = createServer(app);

const PORT = process.env.PORT ?? DEFAULT_PORT;
const HOST = process.env.HOST ?? 'localhost';

// Only start server if not in unit test environment (allow e2e-test environment)
let server: Server | undefined;
if (process.env.NODE_ENV !== 'test') {
  server = httpServer.listen(Number(PORT), HOST, () => {
    logger.info(`Validation analytics server running on ${HOST}:${PORT}`);

    // Run initial log cleanup
    void logCleaner.cleanLogs();

    // Schedule log cleanup every 6 hours (skip in E2E tests to prevent memory issues)
    if (process.env.NODE_ENV !== 'e2e-test') {
      const SIX_HOURS =
        MEMORY_CLEANUP_INTERVAL_MINUTES * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
      setInterval(() => {
        void logCleaner.cleanLogs();
      }, SIX_HOURS);
    }
  });

  // Set reasonable server timeout
  server.timeout = SERVER_TIMEOUT_SECONDS * MS_PER_SECOND; // 30 seconds
}

// Initialize log management
import { logManager } from './utils/log-manager';

// Schedule daily log cleanup (skip in E2E tests to prevent memory issues)
let logCleanupInterval: ReturnType<typeof setTimeout> | undefined;
if (process.env.NODE_ENV !== 'e2e-test' && process.env.NODE_ENV !== 'test') {
  logCleanupInterval = logManager.scheduleCleanup(LOG_CLEANUP_INTERVAL_HOURS);
  console.error('🧹 Log cleanup scheduled to run every 24 hours');
}

// Export cleanup function for tests
export const cleanupIntervals = async () => {
  if (logCleanupInterval) {
    clearInterval(logCleanupInterval);
  }
  // Clean up orchestrator stream manager
  const { orchestratorStreamManager } = require('./utils/orchestrator-stream');
  orchestratorStreamManager.cleanup();

  // Disconnect database in test environment
  if (process.env.NODE_ENV === 'test') {
    try {
      const { getDatabaseService } = require('./services/database');
      const db = getDatabaseService();
      await db.$disconnect();
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
};

// Global error handlers to prevent server crashes
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', error);
  // Don't exit the process - just log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    'Unhandled Rejection',
    reason instanceof Error ? reason : new Error(String(reason)),
    { promise: promise.toString() }
  );
  // Don't exit the process - just log and continue
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing server');

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export default app;
