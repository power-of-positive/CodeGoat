import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { z } from 'zod';
import { SettingsService } from '../services/settings.service';
import { validateRequest, validateParams } from '../middleware/validate';
import {
  UpdateSettingsRequestSchema,
  UpdateFallbackSettingsRequestSchema,
  UpdateValidationSettingsRequestSchema,
  AddValidationStageRequestSchema,
  GetValidationStageParamsSchema,
  UpdateValidationStageParamsSchema,
  UpdateValidationStageRequestSchema,
  RemoveValidationStageParamsSchema,
} from '../shared/schemas';

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

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
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to load settings' });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid settings format',
          details: error.issues,
        });
      } else {
        logger.error('Failed to update settings', error as Error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update settings' });
      }
    }
  };
}

async function handleGetFallback(
  context: SettingsContext,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const fallbackSettings = await context.settingsService.getFallbackSettings();
    res.json(fallbackSettings);
  } catch (error) {
    context.logger.error('Failed to load fallback settings', error as Error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to load fallback settings' });
  }
}

async function handleUpdateFallback(
  context: SettingsContext,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const fallbackSettings = await context.settingsService.updateFallbackSettings(req.body);
    res.json({
      message: 'Fallback settings updated successfully',
      fallback: fallbackSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid fallback settings',
        details: error.issues,
      });
    } else {
      context.logger.error('Failed to update fallback settings', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to update fallback settings' });
    }
  }
}

function createFallbackHandlers(
  settingsService: SettingsService,
  logger: ILogger
): {
  getFallback: (req: Request, res: Response) => Promise<void>;
  updateFallback: (req: Request, res: Response) => Promise<void>;
} {
  const context: SettingsContext = { settingsService, logger };
  return {
    getFallback: (req, res) => handleGetFallback(context, req, res),
    updateFallback: (req, res) => handleUpdateFallback(context, req, res),
  };
}

function createValidationHandlers(
  settingsService: SettingsService,
  logger: ILogger
): {
  getValidation: (req: Request, res: Response) => Promise<void>;
  updateValidation: (req: Request, res: Response) => Promise<void>;
} {
  const getValidation = async (req: Request, res: Response): Promise<void> => {
    try {
      const validationSettings = await settingsService.getValidationSettings();
      res.json(validationSettings);
    } catch (error) {
      logger.error('Failed to load validation settings', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to load validation settings' });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid validation settings',
          details: error.issues,
        });
      } else {
        logger.error('Failed to update validation settings', error as Error);
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json({ error: 'Failed to update validation settings' });
      }
    }
  };

  return { getValidation, updateValidation };
}

function createStageHandlers(
  settingsService: SettingsService,
  logger: ILogger
): {
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
      // Transform API schema (stageId) to internal schema (id)
      const { stageId, ...rest } = req.body;
      const internalStage = { id: stageId, ...rest };

      const stage = await settingsService.addValidationStage(internalStage);

      // Transform response back to API schema
      const { id, ...responseRest } = stage;
      const apiStage = { stageId: id, ...responseRest };

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Validation stage added successfully',
        stage: apiStage,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid stage configuration',
          details: error.issues,
        });
      } else if ((error as Error).message === 'Stage with this ID already exists') {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Stage with this ID already exists' });
      } else {
        logger.error('Failed to add validation stage', error as Error);
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json({ error: 'Failed to add validation stage' });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid stage configuration',
          details: error.issues,
        });
      } else if ((error as Error).message === 'Validation stage not found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Validation stage not found' });
      } else {
        logger.error('Failed to update validation stage', error as Error);
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json({ error: 'Failed to update validation stage' });
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
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Validation stage not found' });
      } else if ((error as Error).message === 'No validation stages found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'No validation stages found' });
      } else {
        logger.error('Failed to remove validation stage', error as Error);
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json({ error: 'Failed to remove validation stage' });
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
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Validation stage not found' });
        return;
      }

      res.json(stage);
    } catch (error) {
      logger.error('Failed to get validation stage', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to get validation stage' });
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
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to get validation stages' });
    }
  };
}

export function createSettingsRoutes(logger: ILogger): Router {
  const router = Router();
  const settingsService = new SettingsService(logger);

  const fallbackHandlers = createFallbackHandlers(settingsService, logger);
  const validationHandlers = createValidationHandlers(settingsService, logger);
  const stageHandlers = createStageHandlers(settingsService, logger);

  // Main settings routes
  router.get('/', createSettingsHandler(settingsService, logger));
  router.put(
    '/',
    validateRequest(UpdateSettingsRequestSchema),
    updateSettingsHandler(settingsService, logger)
  );

  // Fallback settings routes
  router.get('/fallback', fallbackHandlers.getFallback);
  router.put(
    '/fallback',
    validateRequest(UpdateFallbackSettingsRequestSchema),
    fallbackHandlers.updateFallback
  );

  // Validation settings routes
  router.get('/validation', validationHandlers.getValidation);
  router.put(
    '/validation',
    validateRequest(UpdateValidationSettingsRequestSchema),
    validationHandlers.updateValidation
  );

  // Validation stages routes
  router.get('/validation/stages', stageHandlers.getStages);
  router.post(
    '/validation/stages',
    validateRequest(AddValidationStageRequestSchema),
    stageHandlers.addStage
  );
  router.get(
    '/validation/stages/:id',
    validateParams(GetValidationStageParamsSchema),
    stageHandlers.getStage
  );
  router.put(
    '/validation/stages/:id',
    validateParams(UpdateValidationStageParamsSchema),
    validateRequest(UpdateValidationStageRequestSchema),
    stageHandlers.updateStage
  );
  router.delete(
    '/validation/stages/:id',
    validateParams(RemoveValidationStageParamsSchema),
    stageHandlers.removeStage
  );

  return router;
}
