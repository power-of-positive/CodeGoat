/**
 * Common schemas shared across all API endpoints
 * These are the building blocks for request/response validation
 */
import { z } from 'zod';

/**
 * Worker status enum
 */
export const WorkerStatusSchema = z.enum([
  'starting',
  'running',
  'completed',
  'failed',
  'stopped',
  'validating',
]);

export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;

/**
 * Validation stage status enum
 */
export const ValidationStageStatusSchema = z.enum([
  'pending',
  'running',
  'passed',
  'failed',
  'skipped',
]);

export type ValidationStageStatus = z.infer<typeof ValidationStageStatusSchema>;

/**
 * Validation stage details
 */
export const ValidationStageSchema = z.object({
  name: z.string().describe('Stage name (e.g., "lint", "type-check")'),
  command: z.string().describe('Command executed for this stage'),
  status: ValidationStageStatusSchema,
  duration: z.number().optional().describe('Duration in milliseconds'),
  output: z.string().optional().describe('Stage output'),
  error: z.string().optional().describe('Error message if failed'),
});

export type ValidationStage = z.infer<typeof ValidationStageSchema>;

/**
 * Validation run overview
 */
export const ValidationRunOverallStatusSchema = z.enum(['pending', 'running', 'passed', 'failed']);

export type ValidationRunOverallStatus = z.infer<typeof ValidationRunOverallStatusSchema>;

/**
 * Blocked command record
 */
export const BlockedCommandSchema = z.object({
  timestamp: z.string().describe('ISO 8601 timestamp'),
  command: z.string().describe('The blocked command'),
  reason: z.string().describe('Why it was blocked'),
  suggestion: z.string().optional().describe('Suggested alternative command'),
});

export type BlockedCommand = z.infer<typeof BlockedCommandSchema>;

/**
 * Generic API response wrapper
 * Use this to wrap your data responses for consistency
 */
export const createApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    details: z
      .array(
        z.object({
          path: z.string(),
          message: z.string(),
        })
      )
      .optional(),
  });

/**
 * Standard error response
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  details: z
    .array(
      z.object({
        path: z.string().describe('Field path (e.g., "taskId", "body.taskContent")'),
        message: z.string().describe('Specific validation error'),
      })
    )
    .optional()
    .describe('Detailed validation errors'),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Worker entity schema (matches the Worker type from types/index.ts)
 */
export const WorkerSchema = z.object({
  id: z.string().describe('Unique worker identifier'),
  taskId: z.string().describe('Associated task ID'),
  taskContent: z.string().describe('Task description/content'),
  status: WorkerStatusSchema,
  startTime: z.string().describe('ISO 8601 timestamp when worker started'),
  endTime: z.string().optional().describe('ISO 8601 timestamp when worker ended'),
  pid: z.number().optional().describe('Process ID'),
  logFile: z.string().describe('Path to log file'),
  blockedCommands: z.number().describe('Count of blocked commands'),
  hasPermissionSystem: z.boolean().describe('Whether permission system is active'),
  validationPassed: z.boolean().optional().describe('Whether validation passed'),
  validationRuns: z.number().optional().describe('Number of validation runs'),
});

export type Worker = z.infer<typeof WorkerSchema>;
