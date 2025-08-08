import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
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

const app = express();
const configLoader = new ConfigLoader();
const routeMatcher = new RouteMatcher();

let config = configLoader.load();
const proxyHandler = new ConfigurableProxyHandler(config.modelConfig!);

const logsDir = path.join(__dirname, '../logs');
const logger = new WinstonLogger({
  level: config.settings.logging.level,
  logsDir,
  enableConsole: true,
  enableFile: true,
  maxFiles: '10',
  maxSize: '10485760', // 10MB
});

// Initialize log cleaner (logger already implements ILogger interface)
const logCleaner = new LogCleaner(
  {
    logsDir,
    maxLogFiles: 50,
    maxLogAge: 30, // Keep logs for 30 days
    maxLogSize: 10 * 1024 * 1024, // 10MB per log file
  },
  logger
);

// Initialize management API
// initializeManagementAPI(configLoader, logger);

app.use(express.json());
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] Request: ${req.method} ${req.path}`);
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

// Keep test route for compatibility
app.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Test route works!' });
});

// Proxy middleware - only for non-management routes
app.use(async (req: Request, res: Response, next: NextFunction) => {
  console.log('Proxy middleware called for:', req.method, req.path);

  // Skip proxy routing for API and internal routes
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/internal/') ||
    req.path.startsWith('/ui/') ||
    req.path === '/test'
  ) {
    console.log('Skipping proxy for:', req.path);
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

const server = app.listen(config.proxy.port, config.proxy.host, () => {
  logger.info(`Proxy server running on ${config.proxy.host}:${config.proxy.port}`);

  // Run initial log cleanup
  void logCleaner.cleanLogs();

  // Schedule log cleanup every 6 hours
  /* eslint-disable no-undef */
  setInterval(
    () => {
      void logCleaner.cleanLogs();
    },
    6 * 60 * 60 * 1000
  );
  /* eslint-enable no-undef */
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
