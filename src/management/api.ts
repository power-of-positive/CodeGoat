import { Router, Request, Response } from 'express';
import { ConfigLoader } from '../config';
import { ILogger } from '../logger-interface';
import { z } from 'zod';
import { handleApiError } from '../utils/error-handler';
import { maskApiKey } from '../utils/security';

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
let logger: ILogger;

export function initializeManagementAPI(
  configLoaderInstance: ConfigLoader,
  loggerInstance: ILogger
): void {
  configLoader = configLoaderInstance;
  logger = loggerInstance;
}

// GET /api/management/models - List all models
router.get('/models', (_req: Request, res: Response) => {
  console.log('Management API /models endpoint called');
  try {
    const allModels = configLoader.getAllModels();
    console.log('Found models:', allModels.length);

    // Convert models to UI format with status information
    const modelsWithStatus = allModels.map(model => ({
      id: model.id,
      name: model.name,
      baseUrl: model.baseUrl,
      model: model.model,
      apiKey: maskApiKey(model.apiKey),
      provider: model.provider,
      enabled: model.enabled,
      status: 'untested' as const,
      lastTested: null,
    }));

    res.json({ models: modelsWithStatus });
  } catch (error) {
    console.error('Management API error:', error);
    handleApiError(res, logger, 'load models', error);
  }
});

// POST /api/management/models - Add new model
router.post('/models', async (req: Request, res: Response) => {
  try {
    const validatedData = modelConfigSchema.parse(req.body);

    logger?.info('Adding new model: ' + validatedData.name);

    // Add model using ConfigLoader
    configLoader.addModel({
      name: validatedData.name,
      model: validatedData.model,
      apiKey: validatedData.apiKey,
      provider: validatedData.provider,
    });

    res.status(201).json({
      message: 'Model added successfully',
      model: {
        id: validatedData.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase(),
        ...validatedData,
        apiKey: '***',
        status: 'untested',
        lastTested: null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    } else {
      handleApiError(res, logger, 'add model', error);
    }
  }
});

// PUT /api/management/models/:id - Update model
router.put('/models/:id', async (req: Request, res: Response) => {
  try {
    const modelId = req.params.id;
    const validatedData = updateModelConfigSchema.parse(req.body);

    logger?.info('Updating model: ' + modelId);

    // Update model using ConfigLoader
    configLoader.updateModel(modelId, {
      name: validatedData.name || '',
      model: validatedData.model || '',
      apiKey: validatedData.apiKey || '',
      provider: validatedData.provider || 'openrouter',
    });

    res.json({
      message: 'Model updated successfully',
      model: {
        id: modelId,
        ...validatedData,
        apiKey: '***',
        status: 'untested',
        lastTested: null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    } else {
      handleApiError(res, logger, 'update model', error);
    }
  }
});

// DELETE /api/management/models/:id - Delete model
router.delete('/models/:id', (req: Request, res: Response) => {
  try {
    const modelId = req.params.id;

    logger?.info('Deleting model: ' + modelId);

    // Delete model using ConfigLoader
    configLoader.deleteModel(modelId);

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    handleApiError(res, logger, 'delete model', error);
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
    handleApiError(res, logger, 'test model', error);
  }
});

// GET /api/management/status - Server status
router.get('/status', (_req: Request, res: Response) => {
  try {
    const uptime = process.uptime();

    const allModels = configLoader.getAllModels();
    const activeModelsCount = allModels.filter(model => model.enabled).length;

    res.json({
      status: 'healthy',
      uptime,
      uptimeFormatted: formatUptime(uptime),
      modelsCount: allModels.length,
      activeModelsCount,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleApiError(res, logger, 'get server status', error);
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
    handleApiError(res, logger, 'reload configuration', error);
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
