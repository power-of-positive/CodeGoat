/**
 * Validation Stage Configs API Schemas
 * Request and response validation schemas for /api/validation-stage-configs endpoints
 */
import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

export const StageCategorySchema = z.enum([
  'lint',
  'test',
  'type',
  'build',
  'e2e',
  'security',
  'quality',
  'validation',
  'other',
]);

export type StageCategory = z.infer<typeof StageCategorySchema>;

export const StageConfigSchema = z.object({
  id: z.string(),
  stageId: z.string(),
  name: z.string(),
  command: z.string(),
  timeout: z.number(),
  enabled: z.boolean(),
  continueOnFailure: z.boolean(),
  priority: z.number(),
  description: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type StageConfig = z.infer<typeof StageConfigSchema>;

// ============================================================================
// GET /validation-stage-configs - List all configurations
// ============================================================================

export const GetStageConfigsQuerySchema = z.object({
  category: z.string().optional().describe('Filter by category'),
  enabled: z.string().optional().describe('Filter by enabled status (true/false)'),
});

export type GetStageConfigsQuery = z.infer<typeof GetStageConfigsQuerySchema>;

export const GetStageConfigsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(StageConfigSchema),
});

export type GetStageConfigsResponse = z.infer<typeof GetStageConfigsResponseSchema>;

// ============================================================================
// GET /validation-stage-configs/:stageId - Get specific configuration
// ============================================================================

export const GetStageConfigParamsSchema = z.object({
  stageId: z.string().min(1, 'Stage ID is required'),
});

export type GetStageConfigParams = z.infer<typeof GetStageConfigParamsSchema>;

export const GetStageConfigResponseSchema = z.object({
  success: z.boolean(),
  data: StageConfigSchema,
});

export type GetStageConfigResponse = z.infer<typeof GetStageConfigResponseSchema>;

// ============================================================================
// POST /validation-stage-configs - Create new configuration
// ============================================================================

export const CreateStageConfigRequestSchema = z.object({
  stageId: z
    .string({ message: 'Stage ID is required' })
    .min(1, 'Stage ID is required')
    .max(100, 'Stage ID must be max 100 characters')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Stage ID must be alphanumeric with hyphens and underscores only'),
  name: z
    .string({ message: 'Name is required' })
    .min(1, 'Name is required')
    .max(200, 'Name must be max 200 characters'),
  command: z
    .string({ message: 'Command is required' })
    .min(1, 'Command is required')
    .max(1000, 'Command must be max 1000 characters'),
  timeout: z
    .number({ message: 'Timeout must be a number' })
    .min(1000, 'Timeout must be at least 1000ms')
    .max(3600000, 'Timeout must be max 1 hour')
    .optional()
    .default(300000),
  enabled: z.boolean().optional().default(true),
  continueOnFailure: z.boolean().optional().default(false),
  priority: z
    .number({ message: 'Priority is required' })
    .min(1, 'Priority must be at least 1')
    .max(999, 'Priority must be max 999'),
  description: z.string().max(500, 'Description must be max 500 characters').optional(),
  category: StageCategorySchema.optional(),
});

export type CreateStageConfigRequest = z.infer<typeof CreateStageConfigRequestSchema>;

export const CreateStageConfigResponseSchema = z.object({
  success: z.boolean(),
  data: StageConfigSchema,
  message: z.string().optional(),
});

export type CreateStageConfigResponse = z.infer<typeof CreateStageConfigResponseSchema>;

// ============================================================================
// PUT /validation-stage-configs/:stageId - Update configuration
// ============================================================================

export const UpdateStageConfigParamsSchema = z.object({
  stageId: z.string().min(1, 'Stage ID is required'),
});

export type UpdateStageConfigParams = z.infer<typeof UpdateStageConfigParamsSchema>;

export const UpdateStageConfigRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(200, 'Name must be max 200 characters')
    .optional(),
  command: z
    .string()
    .min(1, 'Command cannot be empty')
    .max(1000, 'Command must be max 1000 characters')
    .optional(),
  timeout: z
    .number()
    .min(1000, 'Timeout must be at least 1000ms')
    .max(3600000, 'Timeout must be max 1 hour')
    .optional(),
  enabled: z.boolean().optional(),
  continueOnFailure: z.boolean().optional(),
  priority: z
    .number()
    .min(1, 'Priority must be at least 1')
    .max(999, 'Priority must be max 999')
    .optional(),
  description: z.string().max(500, 'Description must be max 500 characters').optional(),
  category: StageCategorySchema.optional(),
});

export type UpdateStageConfigRequest = z.infer<typeof UpdateStageConfigRequestSchema>;

export const UpdateStageConfigResponseSchema = z.object({
  success: z.boolean(),
  data: StageConfigSchema,
  message: z.string().optional(),
});

export type UpdateStageConfigResponse = z.infer<typeof UpdateStageConfigResponseSchema>;

// ============================================================================
// DELETE /validation-stage-configs/:stageId - Delete configuration
// ============================================================================

export const DeleteStageConfigParamsSchema = z.object({
  stageId: z.string().min(1, 'Stage ID is required'),
});

export type DeleteStageConfigParams = z.infer<typeof DeleteStageConfigParamsSchema>;

export const DeleteStageConfigResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteStageConfigResponse = z.infer<typeof DeleteStageConfigResponseSchema>;

// ============================================================================
// POST /validation-stage-configs/:stageId/toggle - Toggle enabled status
// ============================================================================

export const ToggleStageConfigParamsSchema = z.object({
  stageId: z.string().min(1, 'Stage ID is required'),
});

export type ToggleStageConfigParams = z.infer<typeof ToggleStageConfigParamsSchema>;

export const ToggleStageConfigResponseSchema = z.object({
  success: z.boolean(),
  data: StageConfigSchema,
  message: z.string().optional(),
});

export type ToggleStageConfigResponse = z.infer<typeof ToggleStageConfigResponseSchema>;

// ============================================================================
// POST /validation-stage-configs/reorder - Reorder stage priorities
// ============================================================================

export const ReorderStageConfigsRequestSchema = z.object({
  stages: z
    .array(
      z.object({
        stageId: z.string().min(1, 'Stage ID is required'),
        priority: z
          .number()
          .min(1, 'Priority must be at least 1')
          .max(999, 'Priority must be max 999'),
      })
    )
    .min(1, 'At least one stage is required'),
});

export type ReorderStageConfigsRequest = z.infer<typeof ReorderStageConfigsRequestSchema>;

export const ReorderStageConfigsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(StageConfigSchema),
  message: z.string().optional(),
});

export type ReorderStageConfigsResponse = z.infer<typeof ReorderStageConfigsResponseSchema>;
