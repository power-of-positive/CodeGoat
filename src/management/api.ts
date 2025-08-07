import { Router, Request, Response } from 'express';
import { ConfigLoader } from '../config';
import { Logger } from '../logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const modelConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  baseUrl: z.string().url('Must be a valid URL'),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().min(1, 'API Key is required'),
  provider: z.enum(['openrouter', 'openai', 'anthropic', 'other']),
  enabled: z.boolean().default(true),
});

const updateModelConfigSchema = modelConfigSchema.partial();

let configLoader: ConfigLoader;
let logger: Logger;

export function initializeManagementAPI(configLoaderInstance: ConfigLoader, loggerInstance: Logger) {
  configLoader = configLoaderInstance;
  logger = loggerInstance;
}

// GET /api/management/models - List all models
router.get('/models', (_req: Request, res: Response) => {
  console.log('Management API /models endpoint called');
  try {
    const config = configLoader.load();
    const modelList = config.modelConfig?.model_list || [];
    console.log('Found models:', modelList.length);
    
    // Convert models to UI format with status information
    const modelsWithStatus = modelList.map((model: any, index: number) => ({
      id: index.toString(),
      name: model.model_name || `Model ${index + 1}`,
      baseUrl: 'https://openrouter.ai/api/v1', // Default for now
      model: model.litellm_params.model,
      apiKey: model.litellm_params.api_key ? '***' : '', // Mask API key in response
      provider: 'openrouter', // Default for now
      enabled: true, // Default for now
      status: 'untested' as const,
      lastTested: null,
    }));

    res.json({ models: modelsWithStatus });
  } catch (error) {
    console.error('Management API error:', error);
    logger?.error('Failed to load models', error as Error);
    res.status(500).json({ error: 'Failed to load models' });
  }
});

// POST /api/management/models - Add new model
router.post('/models', async (req: Request, res: Response) => {
  try {
    const validatedData = modelConfigSchema.parse(req.body);
    
    logger?.info('New model would be added: ' + validatedData.name);
    
    // TODO: Implement actual model saving
    res.status(201).json({ 
      message: 'Model added successfully (demo)',
      model: {
        id: Date.now().toString(),
        ...validatedData,
        apiKey: '***', // Mask in response
        status: 'untested',
        lastTested: null,
      }
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed',
        details: error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      });
    } else {
      logger?.error('Failed to add model', error as Error);
      res.status(500).json({ error: 'Failed to add model' });
    }
  }
});

// PUT /api/management/models/:id - Update model
router.put('/models/:id', async (req: Request, res: Response) => {
  try {
    const modelId = req.params.id;
    const validatedData = updateModelConfigSchema.parse(req.body);
    
    logger?.info('Model would be updated: ' + modelId);
    
    // TODO: Implement actual model updating
    res.json({ 
      message: 'Model updated successfully (demo)',
      model: {
        id: modelId,
        ...validatedData,
        apiKey: '***', // Mask in response
        status: 'untested',
        lastTested: null,
      }
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed',
        details: error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      });
    } else {
      logger?.error('Failed to update model', error as Error);
      res.status(500).json({ error: 'Failed to update model' });
    }
  }
});

// DELETE /api/management/models/:id - Delete model
router.delete('/models/:id', (req: Request, res: Response) => {
  try {
    const modelId = req.params.id;
    
    logger?.info('Model would be deleted: ' + modelId);
    
    // TODO: Implement actual model deletion
    res.json({ message: 'Model deleted successfully (demo)' });
  } catch (error) {
    logger?.error('Failed to delete model', error as Error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

// POST /api/management/test/:id - Test model connectivity
router.post('/test/:id', async (req: Request, res: Response) => {
  try {
    const modelId = req.params.id;
    
    // TODO: Implement actual model testing logic
    // For now, just return a mock response
    const isHealthy = Math.random() > 0.3; // 70% chance of success
    
    res.json({
      modelId: modelId,
      status: isHealthy ? 'healthy' : 'error',
      responseTime: Math.random() * 1000 + 100,
      error: isHealthy ? null : 'Connection timeout',
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger?.error('Failed to test model', error as Error);
    res.status(500).json({ error: 'Failed to test model' });
  }
});

// GET /api/management/status - Server status
router.get('/status', (_req: Request, res: Response) => {
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
    logger?.error('Failed to get server status', error as Error);
    res.status(500).json({ error: 'Failed to get server status' });
  }
});

// POST /api/management/reload - Reload configuration
router.post('/reload', (_req: Request, res: Response) => {
  try {
    configLoader.reload();
    logger?.info('Configuration reloaded via API');
    
    res.json({ 
      message: 'Configuration reloaded successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger?.error('Failed to reload configuration via API', error as Error);
    res.status(500).json({ error: 'Failed to reload configuration' });
  }
});

function formatUptime(uptimeSeconds: number): string {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default router;