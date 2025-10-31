/**
 * API routes for managing validation stage configurations
 * Replaces the settings.json validation.stages with database-driven configuration
 */

import { Router, Request, Response } from 'express';
import { getDatabaseService } from '../services/database';
import { validateRequest, validateParams, validateQuery } from '../middleware/validate';
import {
  GetStageConfigsQuerySchema,
  GetStageConfigParamsSchema,
  CreateStageConfigRequestSchema,
  UpdateStageConfigParamsSchema,
  UpdateStageConfigRequestSchema,
  DeleteStageConfigParamsSchema,
  ToggleStageConfigParamsSchema,
  ReorderStageConfigsRequestSchema,
} from '../shared/schemas';

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Lazy initialization of database connection
let prisma: ReturnType<typeof getDatabaseService> | null = null;

function getDatabase() {
  prisma ??= getDatabaseService();
  return prisma;
}

// Handler functions for validation stage config routes
function getStageConfigs() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, enabled } = req.query;
      const where: Record<string, unknown> = {};

      if (category) {
        where.category = category as string;
      }

      if (enabled !== undefined) {
        where.enabled = enabled === 'true';
      }

      const stages = await getDatabase().validationStageConfig.findMany({
        where,
        orderBy: {
          priority: 'asc',
        },
      });

      res.json({
        success: true,
        data: stages,
        meta: {
          total: stages.length,
          enabled: stages.filter(s => s.enabled).length,
          disabled: stages.filter(s => !s.enabled).length,
        },
      });
    } catch (error) {
      console.error('Error fetching validation stage configs:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch validation stage configurations',
      });
    }
  };
}

function getStageConfig() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { stageId } = req.params;

      const stage = await getDatabase().validationStageConfig.findUnique({
        where: { stageId },
      });

      if (!stage) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Validation stage configuration not found',
        });
        return;
      }

      res.json({
        success: true,
        data: stage,
      });
    } catch (error) {
      console.error('Error fetching validation stage config:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch validation stage configuration',
      });
    }
  };
}

function createStageConfig() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        stageId,
        name,
        command,
        timeout = 60000,
        enabled = true,
        continueOnFailure = false,
        priority,
        description,
        category = 'other',
      } = req.body;

      // Check if stageId already exists
      const existing = await getDatabase().validationStageConfig.findUnique({
        where: { stageId },
      });

      if (existing) {
        res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'A validation stage with this ID already exists',
        });
        return;
      }

      const stage = await getDatabase().validationStageConfig.create({
        data: {
          stageId,
          name,
          command,
          timeout,
          enabled,
          continueOnFailure,
          priority,
          description,
          category,
        },
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: stage,
        message: 'Validation stage configuration created successfully',
      });
    } catch (error) {
      console.error('Error creating validation stage config:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create validation stage configuration',
      });
    }
  };
}

function updateStageConfig() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { stageId } = req.params;
      const updateData = req.body;

      // Check if stage exists
      const existing = await getDatabase().validationStageConfig.findUnique({
        where: { stageId },
      });

      if (!existing) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Validation stage configuration not found',
        });
        return;
      }

      const stage = await getDatabase().validationStageConfig.update({
        where: { stageId },
        data: updateData,
      });

      res.json({
        success: true,
        data: stage,
        message: 'Validation stage configuration updated successfully',
      });
    } catch (error) {
      console.error('Error updating validation stage config:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update validation stage configuration',
      });
    }
  };
}

function deleteStageConfig() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { stageId } = req.params;

      // Check if stage exists
      const existing = await getDatabase().validationStageConfig.findUnique({
        where: { stageId },
      });

      if (!existing) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Validation stage configuration not found',
        });
        return;
      }

      await getDatabase().validationStageConfig.delete({
        where: { stageId },
      });

      res.json({
        success: true,
        message: 'Validation stage configuration deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting validation stage config:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to delete validation stage configuration',
      });
    }
  };
}

function toggleStageConfig() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { stageId } = req.params;

      // Check if stage exists
      const existing = await getDatabase().validationStageConfig.findUnique({
        where: { stageId },
      });

      if (!existing) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Validation stage configuration not found',
        });
        return;
      }

      const stage = await getDatabase().validationStageConfig.update({
        where: { stageId },
        data: { enabled: !existing.enabled },
      });

      res.json({
        success: true,
        data: stage,
        message: `Validation stage ${stage.enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling validation stage config:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to toggle validation stage configuration',
      });
    }
  };
}

function reorderStageConfigs() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { stages } = req.body;

      // Update priorities in a transaction
      await getDatabase().$transaction(async tx => {
        for (const stage of stages) {
          await tx.validationStageConfig.update({
            where: { stageId: stage.stageId },
            data: { priority: stage.priority },
          });
        }
      });

      const updatedStages = await getDatabase().validationStageConfig.findMany({
        orderBy: { priority: 'asc' },
      });

      res.json({
        success: true,
        data: updatedStages,
        message: 'Validation stages reordered successfully',
      });
    } catch (error) {
      console.error('Error reordering validation stage configs:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to reorder validation stage configurations',
      });
    }
  };
}

export function createValidationStageConfigsRoutes(): Router {
  const router = Router();

  // GET all validation stage configurations
  router.get('/', validateQuery(GetStageConfigsQuerySchema), getStageConfigs());

  // GET specific validation stage configuration
  router.get('/:stageId', validateParams(GetStageConfigParamsSchema), getStageConfig());

  // POST create new validation stage configuration
  router.post('/', validateRequest(CreateStageConfigRequestSchema), createStageConfig());

  // PUT update validation stage configuration
  router.put(
    '/:stageId',
    validateParams(UpdateStageConfigParamsSchema),
    validateRequest(UpdateStageConfigRequestSchema),
    updateStageConfig()
  );

  // DELETE validation stage configuration
  router.delete('/:stageId', validateParams(DeleteStageConfigParamsSchema), deleteStageConfig());

  // POST toggle enabled status
  router.post(
    '/:stageId/toggle',
    validateParams(ToggleStageConfigParamsSchema),
    toggleStageConfig()
  );

  // POST reorder validation stages
  router.post('/reorder', validateRequest(ReorderStageConfigsRequestSchema), reorderStageConfigs());

  return router;
}

// Default export for backward compatibility
export default createValidationStageConfigsRoutes();
