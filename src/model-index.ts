import express, { Request, Response } from 'express';
import { LiteLLMConfigLoader } from './litellm-config';
import { LiteLLMRouter } from './litellm-router';
import { LiteLLMProxyHandler } from './litellm-proxy';
import { Logger } from './logger';

const app = express();
const configLoader = new LiteLLMConfigLoader();
const config = configLoader.load();
const router = new LiteLLMRouter(configLoader);
const proxyHandler = new LiteLLMProxyHandler(router);
const logger = new Logger('info', 'json');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(logger.middleware());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    models: config.model_list.map(m => m.model_name)
  });
});

// Model list endpoint
app.get('/v1/models', (req: Request, res: Response) => {
  const models = config.model_list.map(m => ({
    id: m.model_name,
    object: 'model',
    created: Date.now(),
    owned_by: 'litellm-proxy'
  }));
  
  res.json({
    object: 'list',
    data: models
  });
});

// Main chat completions endpoint
app.post('/v1/chat/completions', async (req: Request, res: Response) => {
  await proxyHandler.handleRequest(req, res);
});

// Legacy completions endpoint (redirect to chat)
app.post('/v1/completions', async (req: Request, res: Response) => {
  // Transform legacy format to chat format if needed
  if (req.body.prompt && !req.body.messages) {
    req.body.messages = [{ role: 'user', content: req.body.prompt }];
    delete req.body.prompt;
  }
  await proxyHandler.handleRequest(req, res);
});

// Configuration reload on SIGHUP
process.on('SIGHUP', () => {
  logger.info('Reloading configuration...');
  try {
    configLoader.reload();
    logger.info('Configuration reloaded successfully');
  } catch (error) {
    logger.error('Failed to reload configuration', error as Error);
  }
});

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`LiteLLM Proxy server running on ${HOST}:${PORT}`);
  logger.info(`Available models: ${config.model_list.map(m => m.model_name).join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;