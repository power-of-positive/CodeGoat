import { Router, Request, Response } from 'express';
import { ConfigLoader } from '../config';
import { ILogger } from '../logger-interface';
import { z } from 'zod';
import { SettingsService } from '../services/settings.service';

const router = Router();

// eslint-disable-next-line max-lines-per-function
export function createSettingsRoutes(configLoader: ConfigLoader, logger: ILogger): Router {
  const settingsService = new SettingsService(logger);

  // GET /api/settings - Get all settings
  router.get('/', async (req: Request, res: Response) => {
    try {
      const settings = await settingsService.getSettings();
      res.json(settings);
    } catch (error) {
      logger.error('Failed to load settings', error as Error);
      res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  // PUT /api/settings - Update settings
  router.put('/', async (req: Request, res: Response) => {
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
  });

  // GET /api/settings/fallback - Get fallback settings
  router.get('/fallback', async (req: Request, res: Response) => {
    try {
      const fallbackSettings = await settingsService.getFallbackSettings();
      res.json(fallbackSettings);
    } catch (error) {
      logger.error('Failed to load fallback settings', error as Error);
      res.status(500).json({ error: 'Failed to load fallback settings' });
    }
  });

  // PUT /api/settings/fallback - Update fallback settings
  router.put('/fallback', async (req: Request, res: Response) => {
    try {
      const fallbackSettings = await settingsService.updateFallbackSettings(req.body);
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
        logger.error('Failed to update fallback settings', error as Error);
        res.status(500).json({ error: 'Failed to update fallback settings' });
      }
    }
  });

  // GET /api/settings/validation - Get validation settings
  router.get('/validation', async (req: Request, res: Response) => {
    try {
      const validationSettings = await settingsService.getValidationSettings();
      res.json(validationSettings);
    } catch (error) {
      logger.error('Failed to load validation settings', error as Error);
      res.status(500).json({ error: 'Failed to load validation settings' });
    }
  });

  // PUT /api/settings/validation - Update validation settings
  router.put('/validation', async (req: Request, res: Response) => {
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
  });

  // POST /api/settings/validation/stages - Add validation stage
  router.post('/validation/stages', async (req: Request, res: Response) => {
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
  });

  // PUT /api/settings/validation/stages/:id - Update validation stage
  router.put('/validation/stages/:id', async (req: Request, res: Response) => {
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
  });

  // DELETE /api/settings/validation/stages/:id - Remove validation stage
  router.delete('/validation/stages/:id', async (req: Request, res: Response) => {
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
  });

  // GET /api/settings/validation/stages/:id - Get specific validation stage
  router.get('/validation/stages/:id', async (req: Request, res: Response) => {
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
  });

  // GET /api/settings/validation/stages - Get all enabled validation stages
  router.get('/validation/stages', async (req: Request, res: Response) => {
    try {
      const stages = await settingsService.getEnabledValidationStages();
      res.json({ stages });
    } catch (error) {
      logger.error('Failed to get validation stages', error as Error);
      res.status(500).json({ error: 'Failed to get validation stages' });
    }
  });

  return router;
}
