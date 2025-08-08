import { Request, Response, Router } from 'express';
import { ConfigLoader } from '../config';
import { ILogger } from '../logger-interface';
import { ModelService } from '../services/model.service';
import { handleApiError } from '../utils/error-handler';

const router = Router();

function handleGetModels(configLoader: ConfigLoader, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const models = await ModelService.getAllModels(configLoader);
      res.json({ models });
    } catch (error) {
      handleApiError(res, logger, 'load models', error);
    }
  };
}

function handleTestModel(configLoader: ConfigLoader, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const modelId = req.params.id;
      const result = await ModelService.testModel(modelId, configLoader);
      res.json(result);
    } catch (error) {
      if ((error as Error).message === 'Model not found') {
        res.status(404).json({ error: 'Model not found' });
        return;
      }
      logger.error('Failed to test model', error as Error);
      res.status(500).json({ error: 'Failed to test model' });
    }
  };
}

function handleDeleteModel(configLoader: ConfigLoader, logger: ILogger) {
  return (req: Request, res: Response): void => {
    try {
      const modelId = req.params.id;
      configLoader.deleteModel(modelId);
      res.json({ message: 'Model deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete model', error as Error);

      if ((error as Error).message === 'Model not found') {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to delete model' });
    }
  };
}

function handleCreateModel(configLoader: ConfigLoader, logger: ILogger) {
  return (req: Request, res: Response): void => {
    try {
      const validation = ModelService.validateModelRequest(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
        });
        return;
      }

      const { name, model, apiKey, provider } = req.body;

      configLoader.addModel({ name, model, apiKey, provider });

      const responseModel = ModelService.createModelResponse(req.body);

      res.status(201).json({
        message: 'Model added successfully',
        model: responseModel,
      });
    } catch (error) {
      logger.error('Failed to add model', error as Error);
      res.status(500).json({ error: 'Failed to add model' });
    }
  };
}

function handleUpdateModel(configLoader: ConfigLoader, logger: ILogger) {
  return (req: Request, res: Response): void => {
    try {
      const modelId = req.params.id;
      const { name, model, apiKey, provider } = req.body;

      configLoader.updateModel(modelId, { name, model, apiKey, provider });

      const responseModel = ModelService.createModelResponse(req.body);

      res.json({
        message: 'Model updated successfully',
        model: responseModel,
      });
    } catch (error) {
      logger.error('Failed to update model', error as Error);

      if ((error as Error).message === 'Model not found') {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to update model' });
    }
  };
}

export function createModelRoutes(configLoader: ConfigLoader, logger: ILogger): Router {
  router.get('/', handleGetModels(configLoader, logger));
  router.post('/test/:id', handleTestModel(configLoader, logger));
  router.delete('/:id', handleDeleteModel(configLoader, logger));
  router.post('/', handleCreateModel(configLoader, logger));
  router.put('/:id', handleUpdateModel(configLoader, logger));

  return router;
}
