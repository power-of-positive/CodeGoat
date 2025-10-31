/**
 * Permissions API Schemas
 * Request and response validation schemas for /api/permissions endpoints
 */
import { z } from 'zod';

// ============================================================================
// Enums and Common Types
// ============================================================================

export const ActionTypeSchema = z.enum([
  'file_read',
  'file_write',
  'file_delete',
  'directory_create',
  'directory_delete',
  'network_request',
  'network_listen',
  'process_spawn',
  'process_kill',
  'system_command',
  'environment_read',
  'environment_write',
  'claude_execute',
  'claude_prompt',
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

export const PermissionScopeSchema = z.enum(['global', 'worktree', 'specific_path', 'pattern']);

export type PermissionScope = z.infer<typeof PermissionScopeSchema>;

export const PermissionRuleSchema = z.object({
  id: z.string(),
  action: ActionTypeSchema,
  scope: PermissionScopeSchema,
  target: z.string().optional(),
  allowed: z.boolean(),
  reason: z.string().optional(),
  priority: z.number(),
});

export type PermissionRule = z.infer<typeof PermissionRuleSchema>;

export const PermissionConfigSchema = z.object({
  rules: z.array(PermissionRuleSchema),
  defaultAllow: z.boolean(),
  enableLogging: z.boolean(),
  strictMode: z.boolean(),
});

export type PermissionConfig = z.infer<typeof PermissionConfigSchema>;

// ============================================================================
// PUT /permissions/config - Update permission configuration
// ============================================================================

export const UpdatePermissionConfigRequestSchema = z.object({
  defaultAllow: z.boolean().optional(),
  enableLogging: z.boolean().optional(),
  strictMode: z.boolean().optional(),
  rules: z.array(PermissionRuleSchema).optional(),
});

export type UpdatePermissionConfigRequest = z.infer<typeof UpdatePermissionConfigRequestSchema>;

// ============================================================================
// POST /permissions/rules - Create new permission rule
// ============================================================================

export const CreatePermissionRuleRequestSchema = z.object({
  action: ActionTypeSchema,
  scope: PermissionScopeSchema,
  target: z.string().optional(),
  allowed: z.boolean(),
  reason: z.string().optional(),
  priority: z.number().min(0, 'Priority must be non-negative'),
});

export type CreatePermissionRuleRequest = z.infer<typeof CreatePermissionRuleRequestSchema>;

// ============================================================================
// PUT /permissions/rules/:id - Update permission rule
// ============================================================================

export const UpdatePermissionRuleParamsSchema = z.object({
  id: z.string().min(1, 'Rule ID is required'),
});

export type UpdatePermissionRuleParams = z.infer<typeof UpdatePermissionRuleParamsSchema>;

export const UpdatePermissionRuleRequestSchema = z.object({
  action: ActionTypeSchema.optional(),
  scope: PermissionScopeSchema.optional(),
  target: z.string().optional(),
  allowed: z.boolean().optional(),
  reason: z.string().optional(),
  priority: z.number().min(0, 'Priority must be non-negative').optional(),
});

export type UpdatePermissionRuleRequest = z.infer<typeof UpdatePermissionRuleRequestSchema>;

// ============================================================================
// DELETE /permissions/rules/:id - Delete permission rule
// ============================================================================

export const DeletePermissionRuleParamsSchema = z.object({
  id: z.string().min(1, 'Rule ID is required'),
});

export type DeletePermissionRuleParams = z.infer<typeof DeletePermissionRuleParamsSchema>;

// ============================================================================
// POST /permissions/test - Test permission
// ============================================================================

export const TestPermissionRequestSchema = z.object({
  action: ActionTypeSchema,
  target: z.string().optional(),
  worktreeDir: z.string().optional(),
});

export type TestPermissionRequest = z.infer<typeof TestPermissionRequestSchema>;

export const TestPermissionResponseSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
  matchingRule: PermissionRuleSchema.optional(),
  appliedDefault: z.boolean().optional(),
});

export type TestPermissionResponse = z.infer<typeof TestPermissionResponseSchema>;
