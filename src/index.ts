import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { ConfigLoader } from './config';
import { RouteMatcher } from './matcher';
import { ConfigurableProxyHandler } from './proxy-handler';
import { Logger } from './logger';
import { ProxyRequest } from './types';

const app = express();
const configLoader = new ConfigLoader();
const routeMatcher = new RouteMatcher();

let config = configLoader.load();
const proxyHandler = new ConfigurableProxyHandler(config.modelConfig!);
const logger = new Logger(config.settings.logging.level, config.settings.logging.format);

app.use(express.json());
app.use(express.raw({ type: '*/*', limit: '10mb' }));
app.use(logger.middleware());

app.get('/internal/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proxyRequest: ProxyRequest = {
      path: req.path,
      method: req.method,
      headers: req.headers as Record<string, string | string[]>,
      body: req.body,
      query: req.query as Record<string, string>
    };

    const matchedRoute = routeMatcher.matchRoute(config.routes, proxyRequest);
    
    if (!matchedRoute) {
      return res.status(404).json({ error: 'No matching route found' });
    }

    (req as any).routeName = matchedRoute.name;
    
    const rewrittenPath = routeMatcher.rewritePath(matchedRoute, req.path);
    (req as any).targetUrl = matchedRoute.target.url + rewrittenPath;
    
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
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;