/**
 * API routes for managing validation stage configurations
 * Replaces the settings.json validation.stages with database-driven configuration
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

/**
 * Input validation schemas
 */
const createValidationStageSchema = [
  body('stageId')
    .isString()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Stage ID must be alphanumeric with hyphens and underscores only'),
  body('name')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters'),
  body('command')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Command must be between 1 and 1000 characters'),
  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 3600000 })
    .withMessage('Timeout must be between 1000ms and 1 hour'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('continueOnFailure')
    .optional()
    .isBoolean()
    .withMessage('Continue on failure must be a boolean'),
  body('priority')
    .isInt({ min: 1, max: 999 })
    .withMessage('Priority must be between 1 and 999'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be max 500 characters'),
  body('category')
    .optional()
    .isString()
    .isIn(['lint', 'test', 'type', 'build', 'e2e', 'security', 'quality', 'validation', 'other'])
    .withMessage('Category must be a valid category'),
];

const updateValidationStageSchema = [
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters'),
  body('command')
    .optional()
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Command must be between 1 and 1000 characters'),
  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 3600000 })
    .withMessage('Timeout must be between 1000ms and 1 hour'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('continueOnFailure')
    .optional()
    .isBoolean()
    .withMessage('Continue on failure must be a boolean'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 999 })
    .withMessage('Priority must be between 1 and 999'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be max 500 characters'),
  body('category')
    .optional()
    .isString()
    .isIn(['lint', 'test', 'type', 'build', 'e2e', 'security', 'quality', 'validation', 'other'])
    .withMessage('Category must be a valid category'),
];

/**
 * Handle validation errors
 */
function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return true;
  }
  return false;
}

/**
 * GET /api/validation-stage-configs
 * List all validation stage configurations
 */
router.get('/', 
  query('category').optional().isString(),
  query('enabled').optional().isBoolean(),
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const { category, enabled } = req.query;
      const where: Record<string, unknown> = {};
      
      if (category) {
        where.category = category as string;
      }
      
      if (enabled !== undefined) {
        where.enabled = enabled === 'true';
      }

      const stages = await prisma.validationStageConfig.findMany({
        where,
        orderBy: {
          priority: 'asc'
        }
      });

      res.json({
        success: true,
        data: stages,
        meta: {
          total: stages.length,
          enabled: stages.filter(s => s.enabled).length,
          disabled: stages.filter(s => !s.enabled).length
        }
      });
    } catch (error) {
      console.error('Error fetching validation stage configs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch validation stage configurations'
      });
    }
  }
);

/**
 * GET /api/validation-stage-configs/:stageId
 * Get a specific validation stage configuration
 */
router.get('/:stageId',
  param('stageId').isString().isLength({ min: 1 }),
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const { stageId } = req.params;
      
      const stage = await prisma.validationStageConfig.findUnique({
        where: { stageId }
      });

      if (!stage) {
        return res.status(404).json({
          success: false,
          message: 'Validation stage configuration not found'
        });
      }

      res.json({
        success: true,
        data: stage
      });
    } catch (error) {
      console.error('Error fetching validation stage config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch validation stage configuration'
      });
    }
  }
);

/**
 * POST /api/validation-stage-configs
 * Create a new validation stage configuration
 */
router.post('/',
  ...createValidationStageSchema,
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const {
        stageId,
        name,
        command,
        timeout = 60000,
        enabled = true,
        continueOnFailure = false,
        priority,
        description,
        category = 'other'
      } = req.body;

      // Check if stageId already exists
      const existing = await prisma.validationStageConfig.findUnique({
        where: { stageId }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A validation stage with this ID already exists'
        });
      }

      const stage = await prisma.validationStageConfig.create({
        data: {
          stageId,
          name,
          command,
          timeout,
          enabled,
          continueOnFailure,
          priority,
          description,
          category
        }
      });

      res.status(201).json({
        success: true,
        data: stage,
        message: 'Validation stage configuration created successfully'
      });
    } catch (error) {
      console.error('Error creating validation stage config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create validation stage configuration'
      });
    }
  }
);

/**
 * PUT /api/validation-stage-configs/:stageId
 * Update a validation stage configuration
 */
router.put('/:stageId',
  param('stageId').isString().isLength({ min: 1 }),
  ...updateValidationStageSchema,
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const { stageId } = req.params;
      const updateData = req.body;

      // Check if stage exists
      const existing = await prisma.validationStageConfig.findUnique({
        where: { stageId }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Validation stage configuration not found'
        });
      }

      const stage = await prisma.validationStageConfig.update({
        where: { stageId },
        data: updateData
      });

      res.json({
        success: true,
        data: stage,
        message: 'Validation stage configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating validation stage config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update validation stage configuration'
      });
    }
  }
);

/**
 * DELETE /api/validation-stage-configs/:stageId
 * Delete a validation stage configuration
 */
router.delete('/:stageId',
  param('stageId').isString().isLength({ min: 1 }),
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const { stageId } = req.params;

      // Check if stage exists
      const existing = await prisma.validationStageConfig.findUnique({
        where: { stageId }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Validation stage configuration not found'
        });
      }

      await prisma.validationStageConfig.delete({
        where: { stageId }
      });

      res.json({
        success: true,
        message: 'Validation stage configuration deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting validation stage config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete validation stage configuration'
      });
    }
  }
);

/**
 * POST /api/validation-stage-configs/:stageId/toggle
 * Toggle enabled status of a validation stage
 */
router.post('/:stageId/toggle',
  param('stageId').isString().isLength({ min: 1 }),
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const { stageId } = req.params;

      // Check if stage exists
      const existing = await prisma.validationStageConfig.findUnique({
        where: { stageId }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Validation stage configuration not found'
        });
      }

      const stage = await prisma.validationStageConfig.update({
        where: { stageId },
        data: { enabled: !existing.enabled }
      });

      res.json({
        success: true,
        data: stage,
        message: `Validation stage ${stage.enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling validation stage config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle validation stage configuration'
      });
    }
  }
);

/**
 * POST /api/validation-stage-configs/reorder
 * Reorder validation stages by updating priorities
 */
router.post('/reorder',
  body('stages')
    .isArray()
    .withMessage('Stages must be an array'),
  body('stages.*.stageId')
    .isString()
    .withMessage('Each stage must have a stageId'),
  body('stages.*.priority')
    .isInt({ min: 1, max: 999 })
    .withMessage('Each stage must have a valid priority'),
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const { stages } = req.body;

      // Update priorities in a transaction
      await prisma.$transaction(async (tx) => {
        for (const stage of stages) {
          await tx.validationStageConfig.update({
            where: { stageId: stage.stageId },
            data: { priority: stage.priority }
          });
        }
      });

      const updatedStages = await prisma.validationStageConfig.findMany({
        orderBy: { priority: 'asc' }
      });

      res.json({
        success: true,
        data: updatedStages,
        message: 'Validation stages reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering validation stage configs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder validation stage configurations'
      });
    }
  }
);

export default router;