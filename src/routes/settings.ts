import { Router, Request, Response } from 'express';
import { ConfigLoader } from '../config';
import { ILogger } from '../logger-interface';
import { z } from 'zod';
import { SettingsService } from '../services/settings.service';

interface SettingsContext {
  settingsService: SettingsService;
  logger: ILogger;
}

// Handler functions for settings routes
function createSettingsHandler(settingsService: SettingsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await settingsService.getSettings();
      res.json(settings);
    } catch (error) {
      logger.error('Failed to load settings', error as Error);
      res.status(500).json({ error: 'Failed to load settings' });
    }
  };
}

function updateSettingsHandler(settingsService: SettingsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const updatedSettings = await settingsService.updateSettings(req.body);
      res.json({
        message: 'Settings updated successfully',
        settings: updatedSettings,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid settings format',
          details: error.issues,
        });
      } else {
        logger.error('Failed to update settings', error as Error);
        res.status(500).json({ error: 'Failed to update settings' });
      }
    }
  };
}

async function handleGetFallback(context: SettingsContext, req: Request, res: Response): Promise<void> {
  try {
    const fallbackSettings = await context.settingsService.getFallbackSettings();
    res.json(fallbackSettings);
  } catch (error) {
    context.logger.error('Failed to load fallback settings', error as Error);
    res.status(500).json({ error: 'Failed to load fallback settings' });
  }
}

async function handleUpdateFallback(context: SettingsContext, req: Request, res: Response): Promise<void> {
  try {
    const fallbackSettings = await context.settingsService.updateFallbackSettings(req.body);
    res.json({
      message: 'Fallback settings updated successfully',
      fallback: fallbackSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid fallback settings',
        details: error.issues,
      });
    } else {
      context.logger.error('Failed to update fallback settings', error as Error);
      res.status(500).json({ error: 'Failed to update fallback settings' });
    }
  }
}

function createFallbackHandlers(settingsService: SettingsService, logger: ILogger): {
  getFallback: (req: Request, res: Response) => Promise<void>;
  updateFallback: (req: Request, res: Response) => Promise<void>;
} {
  const context: SettingsContext = { settingsService, logger };
  return { 
    getFallback: (req, res) => handleGetFallback(context, req, res),
    updateFallback: (req, res) => handleUpdateFallback(context, req, res)
  };
}

function createValidationHandlers(settingsService: SettingsService, logger: ILogger): {
  getValidation: (req: Request, res: Response) => Promise<void>;
  updateValidation: (req: Request, res: Response) => Promise<void>;
} {
  const getValidation = async (req: Request, res: Response): Promise<void> => {
    try {
      const validationSettings = await settingsService.getValidationSettings();
      res.json(validationSettings);
    } catch (error) {
      logger.error('Failed to load validation settings', error as Error);
      res.status(500).json({ error: 'Failed to load validation settings' });
    }
  };

  const updateValidation = async (req: Request, res: Response): Promise<void> => {
    try {
      const validationSettings = await settingsService.updateValidationSettings(req.body);
      res.json({
        message: 'Validation settings updated successfully',
        validation: validationSettings,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid validation settings',
          details: error.issues,
        });
      } else {
        logger.error('Failed to update validation settings', error as Error);
        res.status(500).json({ error: 'Failed to update validation settings' });
      }
    }
  };

  return { getValidation, updateValidation };
}

function createStageHandlers(settingsService: SettingsService, logger: ILogger): {
  addStage: (req: Request, res: Response) => Promise<void>;
  updateStage: (req: Request, res: Response) => Promise<void>;
  removeStage: (req: Request, res: Response) => Promise<void>;
  getStage: (req: Request, res: Response) => Promise<void>;
  getStages: (req: Request, res: Response) => Promise<void>;
} {
  return {
    addStage: createAddStageHandler(settingsService, logger),
    updateStage: createUpdateStageHandler(settingsService, logger),
    removeStage: createRemoveStageHandler(settingsService, logger),
    getStage: createGetStageHandler(settingsService, logger),
    getStages: createGetStagesHandler(settingsService, logger),
  };
}

function createAddStageHandler(settingsService: SettingsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const stage = await settingsService.addValidationStage(req.body);
      res.status(201).json({
        message: 'Validation stage added successfully',
        stage,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid stage configuration',
          details: error.issues,
        });
      } else if ((error as Error).message === 'Stage with this ID already exists') {
        res.status(409).json({ error: 'Stage with this ID already exists' });
      } else {
        logger.error('Failed to add validation stage', error as Error);
        res.status(500).json({ error: 'Failed to add validation stage' });
      }
    }
  };
}

function createUpdateStageHandler(settingsService: SettingsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stage = await settingsService.updateValidationStage(id, req.body);
      res.json({
        message: 'Validation stage updated successfully',
        stage,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid stage configuration',
          details: error.issues,
        });
      } else if ((error as Error).message === 'Validation stage not found') {
        res.status(404).json({ error: 'Validation stage not found' });
      } else {
        logger.error('Failed to update validation stage', error as Error);
        res.status(500).json({ error: 'Failed to update validation stage' });
      }
    }
  };
}

function createRemoveStageHandler(settingsService: SettingsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await settingsService.removeValidationStage(id);
      res.json({ message: 'Validation stage removed successfully' });
    } catch (error) {
      if ((error as Error).message === 'Validation stage not found') {
        res.status(404).json({ error: 'Validation stage not found' });
      } else if ((error as Error).message === 'No validation stages found') {
        res.status(404).json({ error: 'No validation stages found' });
      } else {
        logger.error('Failed to remove validation stage', error as Error);
        res.status(500).json({ error: 'Failed to remove validation stage' });
      }
    }
  };
}

function createGetStageHandler(settingsService: SettingsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stage = await settingsService.getValidationStage(id);

      if (!stage) {
        res.status(404).json({ error: 'Validation stage not found' });
        return;
      }

      res.json(stage);
    } catch (error) {
      logger.error('Failed to get validation stage', error as Error);
      res.status(500).json({ error: 'Failed to get validation stage' });
    }
  };
}

function createGetStagesHandler(settingsService: SettingsService, logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const stages = await settingsService.getEnabledValidationStages();
      res.json({ stages });
    } catch (error) {
      logger.error('Failed to get validation stages', error as Error);
      res.status(500).json({ error: 'Failed to get validation stages' });
    }
  };
}

export function createSettingsRoutes(configLoader: ConfigLoader, logger: ILogger): Router {
  const router = Router();
  const settingsService = new SettingsService(logger);

  const fallbackHandlers = createFallbackHandlers(settingsService, logger);
  const validationHandlers = createValidationHandlers(settingsService, logger);
  const stageHandlers = createStageHandlers(settingsService, logger);

  // Main settings routes
  router.get('/', createSettingsHandler(settingsService, logger));
  router.put('/', updateSettingsHandler(settingsService, logger));

  // Fallback settings routes
  router.get('/fallback', fallbackHandlers.getFallback);
  router.put('/fallback', fallbackHandlers.updateFallback);

  // Validation settings routes
  router.get('/validation', validationHandlers.getValidation);
  router.put('/validation', validationHandlers.updateValidation);

  // Validation stages routes
  router.get('/validation/stages', stageHandlers.getStages);
  router.post('/validation/stages', stageHandlers.addStage);
  router.get('/validation/stages/:id', stageHandlers.getStage);
  router.put('/validation/stages/:id', stageHandlers.updateStage);
  router.delete('/validation/stages/:id', stageHandlers.removeStage);

  return router;
}
