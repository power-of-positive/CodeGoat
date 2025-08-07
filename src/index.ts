import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { ConfigLoader } from './config';
import { RouteMatcher } from './matcher';
import { ConfigurableProxyHandler } from './proxy-handler';
import { Logger } from './logger';
import { ProxyRequest } from './types';
// import managementAPI, { initializeManagementAPI } from './management/api';

const app = express();
const configLoader = new ConfigLoader();
const routeMatcher = new RouteMatcher();

let config = configLoader.load();
const proxyHandler = new ConfigurableProxyHandler(config.modelConfig!);
const logger = new Logger(config.settings.logging.level, config.settings.logging.format);

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

app.get('/internal/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Simple test route
app.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Test route works!' });
});

// Direct Management API endpoints
app.get('/api/management/models', (req: Request, res: Response) => {
  try {
    const config = configLoader.load();
    const modelList = config.modelConfig?.model_list || [];
    
    // Convert models to UI format with status information
    const modelsWithStatus = modelList.map((model: any, index: number) => ({
      id: index.toString(),
      name: model.model_name || `Model ${index + 1}`,
      baseUrl: 'https://openrouter.ai/api/v1',
      model: model.litellm_params.model,
      apiKey: model.litellm_params.api_key ? '***' : '',
      provider: 'openrouter',
      enabled: true,
      status: 'untested' as const,
      lastTested: null,
    }));

    res.json({ models: modelsWithStatus });
  } catch (error) {
    logger.error('Failed to load models', error as Error);
    res.status(500).json({ error: 'Failed to load models' });
  }
});

app.get('/api/management/status', (req: Request, res: Response) => {
  try {
    const config = configLoader.load();
    const uptime = process.uptime();
    
    res.json({
      status: 'healthy',
      uptime,
      uptimeFormatted: formatUptime(uptime),
      modelsCount: config.modelConfig?.model_list?.length || 0,
      activeModelsCount: config.modelConfig?.model_list?.length || 0,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get server status', error as Error);
    res.status(500).json({ error: 'Failed to get server status' });
  }
});

app.post('/api/management/test/:id', async (req: Request, res: Response) => {
  try {
    const modelId = req.params.id;
    const startTime = Date.now();
    
    // Get the model configuration
    const config = configLoader.load();
    const modelList = config.modelConfig?.model_list || [];
    const model = modelList[parseInt(modelId)];
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    try {
      // Make a test API call to the model
      const testPayload = {
        model: model.litellm_params.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1,
        temperature: 0.1
      };
      
      // Use the proxy handler to make the request through our configured routes
      const testResponse = await fetch('http://localhost:3000/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.litellm_params.api_key || 'test-key'}`
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      if (testResponse.ok) {
        res.json({
          modelId: modelId,
          status: 'healthy',
          responseTime,
          error: null,
          testedAt: new Date().toISOString(),
          model: model.litellm_params.model
        });
      } else {
        const errorText = await testResponse.text();
        res.json({
          modelId: modelId,
          status: 'error',
          responseTime,
          error: `HTTP ${testResponse.status}: ${errorText}`,
          testedAt: new Date().toISOString(),
          model: model.litellm_params.model
        });
      }
    } catch (fetchError: any) {
      const responseTime = Date.now() - startTime;
      res.json({
        modelId: modelId,
        status: 'error',
        responseTime,
        error: fetchError.message || 'Connection failed',
        testedAt: new Date().toISOString(),
        model: model?.litellm_params?.model || 'unknown'
      });
    }
  } catch (error) {
    logger.error('Failed to test model', error as Error);
    res.status(500).json({ error: 'Failed to test model' });
  }
});

app.delete('/api/management/models/:id', (req: Request, res: Response) => {
  try {
    const modelId = req.params.id;
    
    // For now, just return success - in a real implementation you'd update the config
    res.json({
      success: true,
      message: `Model ${modelId} would be deleted`,
      deletedModelId: modelId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to delete model', error as Error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

// Helper function
function formatUptime(uptimeSeconds: number): string {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Proxy middleware - only for non-management routes  
app.use(async (req: Request, res: Response, next: NextFunction) => {
  console.log('Proxy middleware called for:', req.method, req.path);
  
  // Skip proxy routing for management API and internal routes
  if (req.path.startsWith('/api/management') || req.path.startsWith('/internal/') || req.path.startsWith('/ui/') || req.path === '/test') {
    console.log('Skipping proxy for:', req.path);
    return next();
  }

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