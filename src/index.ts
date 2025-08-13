import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { ConfigLoader } from './config';
import { RouteMatcher } from './matcher';
import { ConfigurableProxyHandler } from './proxy-handler';
import { WinstonLogger } from './logger-winston';
import { LogCleaner } from './utils/log-cleaner';
import { ProxyRequest } from './types';
import { createModelRoutes } from './routes/models';
import { createStatusRoutes } from './routes/status';
import { createOpenRouterStatsRoutes } from './routes/openrouter-stats';
import { createInternalRoutes } from './routes/internal';
import { createLogsRoutes } from './routes/logs';
import { createSettingsRoutes } from './routes/settings';
import { createAnalyticsRoutes } from './routes/analytics';
import { createKanbanProjectsRoutes } from './routes/kanban-projects';
import { createKanbanTasksRoutes } from './routes/kanban-tasks';
import { createKanbanTaskAttemptsRoutes } from './routes/kanban-task-attempts';
import { createKanbanHealthRoutes } from './routes/kanban-health';
import { createWebSocketStatsRoutes } from './routes/websocket-stats';
// import { createAiAgentExecutionRoutes } from './routes/ai-agent-execution';
import { KanbanDatabaseService } from './services/kanban-database.service';
import { WebSocketService } from './services/websocket.service';
// import { SettingsService } from './services/settings.service';

const app = express();
const configLoader = new ConfigLoader();
const routeMatcher = new RouteMatcher();

let config = configLoader.load();
const proxyHandler = new ConfigurableProxyHandler(config.modelConfig!);

const logsDir = path.join(process.cwd(), 'logs');
const logger = new WinstonLogger({
  level: config.settings.logging.level,
  logsDir,
  enableConsole: true,
  enableFile: true,
  maxFiles: '10',
  maxSize: '10485760', // 10MB
});

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

// Initialize management API
// initializeManagementAPI(configLoader, logger);

// Initialize Kanban database and services
const kanbanDb = new KanbanDatabaseService(logger);
const webSocketService = new WebSocketService(logger);
// const settingsService = new SettingsService(logger); // Will be used for AI agent integration

// CORS configuration for Kanban UI integration
app.use((req: Request, res: Response, next: NextFunction) => {
  // Allow requests from localhost (development) and same origin
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', // Vite dev server
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
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

// Configure body parser with large limits and error handling
app.use(
  express.json({
    limit: '100mb',
  })
);
app.use(
  express.raw({
    type: '*/*',
    limit: '100mb',
  })
);
app.use(
  express.urlencoded({
    limit: '100mb',
    extended: true,
  })
);

// Handle body parser errors (including payload too large)
app.use((error: Error & { type?: string }, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    logger.error('Body parser syntax error', error);
    return res.status(400).json({
      error: 'Invalid JSON in request body',
    });
  }

  if (error.type === 'entity.too.large') {
    logger.error('Request entity too large', error);
    return res.status(413).json({
      error: {
        message: 'Request payload too large',
        type: 'payload_too_large_error',
        limit: '100MB',
      },
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

// Mount route modules
app.use('/internal', createInternalRoutes());
app.use('/api/models', createModelRoutes(configLoader, logger));
app.use('/api/status', createStatusRoutes(configLoader, logger));
app.use('/api/openrouter-stats', createOpenRouterStatsRoutes(logger));
app.use('/api/logs', createLogsRoutes(logger));
app.use('/api/settings', createSettingsRoutes(configLoader, logger));
app.use('/api/analytics', createAnalyticsRoutes(logger));
app.use('/api/websocket', createWebSocketStatsRoutes(webSocketService, logger));

// Mount Kanban API routes
app.use('/api', createKanbanHealthRoutes(kanbanDb, logger));
app.use('/api', createKanbanProjectsRoutes(kanbanDb, logger));
app.use('/api', createKanbanTasksRoutes(kanbanDb, logger, webSocketService));
app.use('/api', createKanbanTaskAttemptsRoutes(kanbanDb, logger, webSocketService));
// AI Agent execution routes will be added once implementation is complete
// app.use('/api/ai-agent', createAiAgentExecutionRoutes(kanbanDb, settingsService, config.modelConfig!, logger));

// Keep test route for compatibility
app.get('/test', (_req: Request, res: Response) => {
  res.json({ message: 'Test route works!' });
});

// Proxy middleware - only for non-management routes
app.use(async (req: Request, res: Response, next: NextFunction) => {
  logger.debug('Proxy middleware called', { method: req.method, path: req.path });

  // Skip proxy routing for API and internal routes
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/internal/') ||
    req.path.startsWith('/ui/') ||
    req.path === '/test'
  ) {
    logger.debug('Skipping proxy', { path: req.path });
    return next();
  }

  try {
    const proxyRequest: ProxyRequest = {
      path: req.path,
      method: req.method,
      headers: req.headers as Record<string, string | string[]>,
      body: req.body,
      query: req.query as Record<string, string>,
    };

    const matchedRoute = routeMatcher.matchRoute(config.routes, proxyRequest);

    if (!matchedRoute) {
      return res.status(404).json({ error: 'No matching route found' });
    }

    // Add route information for logging
    (req as Request & { routeName?: string }).routeName = matchedRoute.name;

    const rewrittenPath = routeMatcher.rewritePath(matchedRoute, req.path);
    (req as Request & { targetUrl?: string }).targetUrl = matchedRoute.target.url + rewrittenPath;

    await proxyHandler.handleRequest(req, res, matchedRoute, rewrittenPath);
  } catch (error) {
    logger.error('Request handling error', error as Error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

process.on('SIGHUP', () => {
  logger.info('Reloading configuration...');
  try {
    config = configLoader.reload();
    const newProxyHandler = new ConfigurableProxyHandler(config.modelConfig!);
    Object.setPrototypeOf(proxyHandler, Object.getPrototypeOf(newProxyHandler));
    Object.assign(proxyHandler, newProxyHandler);
    logger.info('Configuration reloaded successfully');
  } catch (error) {
    logger.error('Failed to reload configuration', error as Error);
  }
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket server
webSocketService.initialize(httpServer);

const server = httpServer.listen(config.proxy.port, config.proxy.host, () => {
  logger.info(`Proxy server running on ${config.proxy.host}:${config.proxy.port}`);
  logger.info(`WebSocket server initialized on same port`);

  // Run initial log cleanup
  void logCleaner.cleanLogs();

  // Schedule log cleanup every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    void logCleaner.cleanLogs();
  }, SIX_HOURS);
});

// Set server timeout to handle large payloads
server.timeout = 300000; // 5 minutes

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing servers');

  // Close WebSocket server first
  webSocketService.shutdown();

  // Then close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
