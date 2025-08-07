import { Request, Response, Router } from 'express';
import { ConfigLoader } from '../config';
import { Logger } from '../logger';

const router = Router();

// Simple in-memory store for test results
interface TestResult {
  modelId: string;
  status: 'healthy' | 'error' | 'untested';
  responseTime: number;
  error: string | null;
  testedAt: string;
  model: string;
}

const testResults: Record<string, TestResult> = {};

export function createManagementRoutes(configLoader: ConfigLoader, logger: Logger): Router {
  // Get all models
  router.get('/models', (req: Request, res: Response) => {
    try {
      const allModels = configLoader.getAllModels();

      // Convert models to UI format with status information
      const modelsWithStatus = allModels.map(model => {
        const testResult = testResults[model.id];

        return {
          id: model.id,
          name: model.name,
          baseUrl: model.baseUrl,
          model: model.model,
          apiKey: model.apiKey ? '***' : '',
          provider: model.provider,
          enabled: model.enabled,
          status: (testResult?.status || 'untested') as 'healthy' | 'error' | 'untested',
          lastTested: testResult?.testedAt || null,
          responseTime: testResult?.responseTime || null,
        };
      });

      res.json({ models: modelsWithStatus });
    } catch (error) {
      logger.error('Failed to load models', error as Error);
      res.status(500).json({ error: 'Failed to load models' });
    }
  });

  // Get server status
  router.get('/status', (req: Request, res: Response) => {
    try {
      const allModels = configLoader.getAllModels();
      const uptime = process.uptime();
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
      logger.error('Failed to get server status', error as Error);
      res.status(500).json({ error: 'Failed to get server status' });
    }
  });

  // Test model endpoint
  router.post('/test/:id', async (req: Request, res: Response) => {
    try {
      const modelId = req.params.id;
      const startTime = Date.now();

      // Get the model configuration
      const allModels = configLoader.getAllModels();
      const model = allModels.find(m => m.id === modelId);

      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      try {
        // Make a test API call to the model
        const testPayload = {
          model: model.name,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 1,
          temperature: 0.1,
        };

        // Use the proxy handler to make the request through our configured routes
        const testResponse = await fetch('http://localhost:3000/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${model.apiKey || 'test-key'}`,
          },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        const responseTime = Date.now() - startTime;

        if (testResponse.ok) {
          const result = {
            modelId: modelId,
            status: 'healthy' as const,
            responseTime,
            error: null,
            testedAt: new Date().toISOString(),
            model: model.model,
          };

          // Store the test result
          testResults[modelId] = result;

          res.json(result);
        } else {
          const errorText = await testResponse.text();
          const result = {
            modelId: modelId,
            status: 'error' as const,
            responseTime,
            error: `HTTP ${testResponse.status}: ${errorText}`,
            testedAt: new Date().toISOString(),
            model: model.model,
          };

          // Store the test result
          testResults[modelId] = result;

          res.json(result);
        }
      } catch (fetchError: unknown) {
        const responseTime = Date.now() - startTime;
        const result = {
          modelId: modelId,
          status: 'error' as const,
          responseTime,
          error: fetchError instanceof Error ? fetchError.message : 'Connection failed',
          testedAt: new Date().toISOString(),
          model: model?.model || 'unknown',
        };

        // Store the test result
        testResults[modelId] = result;

        res.json(result);
      }
    } catch (error) {
      logger.error('Failed to test model', error as Error);
      res.status(500).json({ error: 'Failed to test model' });
    }
  });

  // Delete model
  router.delete('/models/:id', (req: Request, res: Response) => {
    try {
      const modelId = req.params.id;

      // Delete model from config file
      configLoader.deleteModel(modelId);

      res.json({
        message: 'Model deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete model', error as Error);

      if ((error as Error).message === 'Model not found') {
        return res.status(404).json({ error: 'Model not found' });
      }

      res.status(500).json({ error: 'Failed to delete model' });
    }
  });

  // Add a new model
  router.post('/models', (req: Request, res: Response) => {
    try {
      const { name, baseUrl, model, apiKey, provider, enabled } = req.body;

      // Validate required fields
      if (!name || !model || !apiKey || !provider) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [
            { field: 'name', message: 'Name is required' },
            { field: 'model', message: 'Model is required' },
            { field: 'apiKey', message: 'API key is required' },
            { field: 'provider', message: 'Provider is required' },
          ].filter(detail => !req.body[detail.field]),
        });
      }

      // Add model to config file
      configLoader.addModel({
        name,
        model,
        apiKey,
        provider,
      });

      const modelKey = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
      const responseModel = {
        id: modelKey,
        name,
        baseUrl: baseUrl || 'https://openrouter.ai/api/v1',
        model,
        apiKey: '***', // Don't return the actual API key
        provider,
        enabled: enabled !== undefined ? enabled : true,
        status: 'untested' as const,
        lastTested: null,
        responseTime: null,
      };

      res.status(201).json({
        message: 'Model added successfully',
        model: responseModel,
      });
    } catch (error) {
      logger.error('Failed to add model', error as Error);
      res.status(500).json({ error: 'Failed to add model' });
    }
  });

  // Update an existing model
  router.put('/models/:id', (req: Request, res: Response) => {
    try {
      const modelId = req.params.id;
      const { name, baseUrl, model, apiKey, provider, enabled } = req.body;

      // Update model in config file
      configLoader.updateModel(modelId, {
        name,
        model,
        apiKey,
        provider,
      });

      const responseModel = {
        id: modelId,
        name,
        baseUrl: baseUrl || 'https://openrouter.ai/api/v1',
        model,
        apiKey: '***', // Don't return the actual API key
        provider,
        enabled: enabled !== undefined ? enabled : true,
        status: 'untested' as const,
        lastTested: null,
        responseTime: null,
      };

      res.json({
        message: 'Model updated successfully',
        model: responseModel,
      });
    } catch (error) {
      logger.error('Failed to update model', error as Error);

      if ((error as Error).message === 'Model not found') {
        return res.status(404).json({ error: 'Model not found' });
      }

      res.status(500).json({ error: 'Failed to update model' });
    }
  });

  // Reload configuration
  router.post('/reload', (req: Request, res: Response) => {
    try {
      configLoader.reload();
      logger.info('Configuration reloaded via API');

      res.json({
        message: 'Configuration reloaded successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to reload configuration via API', error as Error);
      res.status(500).json({ error: 'Failed to reload configuration' });
    }
  });

  // Get OpenRouter model statistics
  router.get('/openrouter-stats/:modelSlug', async (req: Request, res: Response) => {
    try {
      const { modelSlug } = req.params;

      // Parse the model slug to extract author and model name
      // Format: "openrouter/author/model-name" -> "author/model-name"
      const cleanSlug = modelSlug.replace('openrouter/', '');

      // Fetch model endpoints from OpenRouter API
      const openRouterResponse = await fetch(
        `https://openrouter.ai/api/v1/models/${cleanSlug}/endpoints`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!openRouterResponse.ok) {
        return res.status(404).json({
          error: 'Model not found in OpenRouter',
          modelSlug: cleanSlug,
        });
      }

      interface OpenRouterEndpoint {
        name?: string;
        provider?: string;
        context_length?: number;
        max_tokens?: number;
        uptime_30m?: number;
        pricing?: Record<string, string>;
        moderated?: boolean;
      }

      interface OpenRouterResponse {
        data?: {
          endpoints?: OpenRouterEndpoint[];
        };
      }

      const openRouterData = (await openRouterResponse.json()) as OpenRouterResponse;

      // Extract endpoints from the nested data structure
      const endpoints = openRouterData.data?.endpoints || [];

      // Extract relevant statistics
      // Note: OpenRouter API no longer provides uptime_30m data, so we handle it gracefully
      const hasUptimeData = endpoints.some(
        (ep: OpenRouterEndpoint) => ep.uptime_30m !== null && ep.uptime_30m !== undefined
      );

      const stats = {
        modelSlug: cleanSlug,
        endpoints: endpoints.map((endpoint: OpenRouterEndpoint) => ({
          provider: endpoint.name || endpoint.provider,
          contextLength: endpoint.context_length,
          maxTokens: endpoint.max_tokens,
          uptime:
            endpoint.uptime_30m !== null && endpoint.uptime_30m !== undefined
              ? endpoint.uptime_30m
              : null,
          pricing: endpoint.pricing,
          moderated: endpoint.moderated || false,
        })),
        averageUptime: hasUptimeData
          ? endpoints.reduce(
              (sum: number, ep: OpenRouterEndpoint) => sum + (ep.uptime_30m || 0),
              0
            ) / endpoints.length
          : null,
        providerCount: endpoints.length,
        hasUptimeData,
      };

      res.json(stats);
    } catch (error) {
      logger.error('Failed to fetch OpenRouter stats', error as Error);
      res.status(500).json({ error: 'Failed to fetch model statistics' });
    }
  });

  return router;
}

// Helper function
function formatUptime(uptimeSeconds: number): string {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
