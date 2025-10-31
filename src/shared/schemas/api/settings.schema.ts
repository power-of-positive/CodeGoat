/**
 * Settings API Schemas
 * Request and response validation schemas for /api/settings endpoints
 */
import { z } from 'zod';

// ============================================================================
// Common Settings Types
// ============================================================================

export const FallbackSettingsSchema = z.object({
  enabled: z.boolean().describe('Whether fallback is enabled'),
  models: z.array(z.string()).describe('Fallback model order'),
  maxRetries: z.number().describe('Maximum retry attempts'),
  retryDelay: z.number().describe('Delay between retries in milliseconds'),
});

export type FallbackSettings = z.infer<typeof FallbackSettingsSchema>;

export const ValidationSettingsSchema = z.object({
  enabled: z.boolean().describe('Whether validation is enabled'),
  autoRun: z.boolean().describe('Whether validation runs automatically'),
  stages: z.array(z.string()).describe('Enabled validation stage IDs'),
});

export type ValidationSettings = z.infer<typeof ValidationSettingsSchema>;

// Base schema for create/update requests
export const ValidationStageConfigSchema = z.object({
  stageId: z.string().describe('Unique stage identifier'),
  name: z.string().describe('Human-readable stage name'),
  enabled: z.boolean().describe('Whether stage is enabled'),
  priority: z.number().describe('Execution priority (lower runs first)'),
  command: z.string().describe('Command to execute'),
  timeout: z.number().describe('Timeout in milliseconds'),
  continueOnFailure: z.boolean().describe('Whether to continue if stage fails'),
  description: z.string().optional().describe('Stage description'),
  environment: z.string().optional().nullable().describe('Environment requirements'),
  category: z.string().optional().describe('Stage category'),
});

export type ValidationStageConfig = z.infer<typeof ValidationStageConfigSchema>;

// Database model schema (includes database-generated fields)
export const ValidationStageConfigDbSchema = ValidationStageConfigSchema.extend({
  id: z.string().describe('Unique database ID'),
  createdAt: z.date().or(z.string()).describe('Creation timestamp'),
  updatedAt: z.date().or(z.string()).describe('Last update timestamp'),
});

export type ValidationStageConfigDb = z.infer<typeof ValidationStageConfigDbSchema>;

export const SettingsSchema = z.object({
  fallback: FallbackSettingsSchema,
  validation: ValidationSettingsSchema,
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']),
      enableStructuredLogs: z.boolean(),
    })
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;

// ============================================================================
// GET /settings - Get all settings
// ============================================================================

export const GetSettingsResponseSchema = SettingsSchema;

export type GetSettingsResponse = z.infer<typeof GetSettingsResponseSchema>;

// ============================================================================
// PUT /settings - Update settings
// ============================================================================

export const UpdateSettingsRequestSchema = z.object({
  fallback: FallbackSettingsSchema.partial().optional(),
  validation: ValidationSettingsSchema.partial().optional(),
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
      enableStructuredLogs: z.boolean().optional(),
    })
    .optional(),
});

export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;

export const UpdateSettingsResponseSchema = z.object({
  message: z.string(),
  settings: SettingsSchema,
});

export type UpdateSettingsResponse = z.infer<typeof UpdateSettingsResponseSchema>;

// ============================================================================
// GET /settings/fallback - Get fallback settings
// ============================================================================

export const GetFallbackSettingsResponseSchema = FallbackSettingsSchema;

export type GetFallbackSettingsResponse = z.infer<typeof GetFallbackSettingsResponseSchema>;

// ============================================================================
// PUT /settings/fallback - Update fallback settings
// ============================================================================

export const UpdateFallbackSettingsRequestSchema = FallbackSettingsSchema.partial();

export type UpdateFallbackSettingsRequest = z.infer<typeof UpdateFallbackSettingsRequestSchema>;

export const UpdateFallbackSettingsResponseSchema = z.object({
  message: z.string(),
  fallback: FallbackSettingsSchema,
});

export type UpdateFallbackSettingsResponse = z.infer<typeof UpdateFallbackSettingsResponseSchema>;

// ============================================================================
// GET /settings/validation - Get validation settings
// ============================================================================

export const GetValidationSettingsResponseSchema = ValidationSettingsSchema;

export type GetValidationSettingsResponse = z.infer<typeof GetValidationSettingsResponseSchema>;

// ============================================================================
// PUT /settings/validation - Update validation settings
// ============================================================================

export const UpdateValidationSettingsRequestSchema = ValidationSettingsSchema.partial();

export type UpdateValidationSettingsRequest = z.infer<typeof UpdateValidationSettingsRequestSchema>;

export const UpdateValidationSettingsResponseSchema = z.object({
  message: z.string(),
  validation: ValidationSettingsSchema,
});

export type UpdateValidationSettingsResponse = z.infer<
  typeof UpdateValidationSettingsResponseSchema
>;

// ============================================================================
// GET /settings/validation/stages - Get all validation stages
// ============================================================================

export const GetValidationStagesResponseSchema = z.object({
  stages: z.array(ValidationStageConfigDbSchema),
});

export type GetValidationStagesResponse = z.infer<typeof GetValidationStagesResponseSchema>;

// ============================================================================
// POST /settings/validation/stages - Add validation stage
// ============================================================================

export const AddValidationStageRequestSchema = ValidationStageConfigSchema;

export type AddValidationStageRequest = z.infer<typeof AddValidationStageRequestSchema>;

export const AddValidationStageResponseSchema = z.object({
  message: z.string(),
  stage: ValidationStageConfigDbSchema,
});

export type AddValidationStageResponse = z.infer<typeof AddValidationStageResponseSchema>;

// ============================================================================
// GET /settings/validation/stages/:id - Get specific validation stage
// ============================================================================

export const GetValidationStageParamsSchema = z.object({
  id: z.string().min(1, 'Stage ID is required'),
});

export type GetValidationStageParams = z.infer<typeof GetValidationStageParamsSchema>;

export const GetValidationStageResponseSchema = ValidationStageConfigDbSchema;

export type GetValidationStageResponse = z.infer<typeof GetValidationStageResponseSchema>;

// ============================================================================
// PUT /settings/validation/stages/:id - Update validation stage
// ============================================================================

export const UpdateValidationStageParamsSchema = z.object({
  id: z.string().min(1, 'Stage ID is required'),
});

export type UpdateValidationStageParams = z.infer<typeof UpdateValidationStageParamsSchema>;

export const UpdateValidationStageRequestSchema = ValidationStageConfigSchema.partial();

export type UpdateValidationStageRequest = z.infer<typeof UpdateValidationStageRequestSchema>;

export const UpdateValidationStageResponseSchema = z.object({
  message: z.string(),
  stage: ValidationStageConfigDbSchema,
});

export type UpdateValidationStageResponse = z.infer<typeof UpdateValidationStageResponseSchema>;

// ============================================================================
// DELETE /settings/validation/stages/:id - Remove validation stage
// ============================================================================

export const RemoveValidationStageParamsSchema = z.object({
  id: z.string().min(1, 'Stage ID is required'),
});

export type RemoveValidationStageParams = z.infer<typeof RemoveValidationStageParamsSchema>;

export const RemoveValidationStageResponseSchema = z.object({
  message: z.string(),
});

export type RemoveValidationStageResponse = z.infer<typeof RemoveValidationStageResponseSchema>;
