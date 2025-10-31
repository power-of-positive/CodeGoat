/**
 * Orchestrator API Schemas
 * Request and response validation schemas for /api/orchestrator endpoints
 */
import { z } from 'zod';

// ============================================================================
// Common Orchestrator Types
// ============================================================================

export const OrchestratorOptionsSchema = z.object({
  maxRetries: z.number().optional().describe('Maximum retry attempts'),
  maxTaskRetries: z.number().optional().describe('Maximum task retry attempts'),
  validationTimeout: z.number().optional().describe('Validation timeout in milliseconds'),
  enableValidation: z.boolean().optional().describe('Whether validation is enabled'),
  claudeCommand: z.string().optional().describe('Claude CLI command to use'),
  enableWorktrees: z.boolean().optional().describe('Whether to use git worktrees'),
  pollInterval: z.number().optional().describe('Poll interval in milliseconds'),
  filterPriority: z.enum(['high', 'medium', 'low']).optional().describe('Filter tasks by priority'),
});

export type OrchestratorOptions = z.infer<typeof OrchestratorOptionsSchema>;

export const OrchestratorStatusSchema = z.object({
  isRunning: z.boolean(),
  shouldStop: z.boolean(),
  enableValidation: z.boolean(),
  maxRetries: z.number(),
  maxTaskRetries: z.number(),
  message: z.string().optional(),
});

export type OrchestratorStatus = z.infer<typeof OrchestratorStatusSchema>;

export const TaskExecutionSummarySchema = z.object({
  taskId: z.string(),
  taskContent: z.string().optional(),
  attempts: z.number(),
  totalDuration: z.number().describe('Duration in milliseconds'),
  validationRuns: z.number(),
  claudeExecutions: z.number(),
  error: z.string().optional(),
});

export type TaskExecutionSummary = z.infer<typeof TaskExecutionSummarySchema>;

export const CycleMetricsSchema = z.object({
  tasksCompleted: z.number(),
  tasksFailed: z.number(),
  validationRunsExecuted: z.number(),
  claudeExecutions: z.number(),
});

export type CycleMetrics = z.infer<typeof CycleMetricsSchema>;

// ============================================================================
// GET /orchestrator/stream - Server-Sent Events stream
// ============================================================================

export const GetStreamQuerySchema = z.object({
  sessionId: z.string().optional().describe('Filter stream by session ID'),
});

export type GetStreamQuery = z.infer<typeof GetStreamQuerySchema>;

// Note: SSE endpoint returns stream, no response schema needed

// ============================================================================
// GET /orchestrator/stream/info - Get stream information
// ============================================================================

export const GetStreamInfoQuerySchema = z.object({
  sessionId: z.string().optional().describe('Filter by session ID'),
});

export type GetStreamInfoQuery = z.infer<typeof GetStreamInfoQuerySchema>;

export const GetStreamInfoResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    clientCount: z.number(),
    activeSessions: z.array(z.string()),
    sessionFilter: z.string().optional(),
  }),
});

export type GetStreamInfoResponse = z.infer<typeof GetStreamInfoResponseSchema>;

// ============================================================================
// GET /orchestrator/status - Get orchestrator status
// ============================================================================

export const GetOrchestratorStatusResponseSchema = z.object({
  success: z.boolean(),
  data: OrchestratorStatusSchema,
});

export type GetOrchestratorStatusResponse = z.infer<typeof GetOrchestratorStatusResponseSchema>;

// ============================================================================
// POST /orchestrator/start - Start orchestrator
// ============================================================================

export const StartOrchestratorRequestSchema = z.object({
  options: OrchestratorOptionsSchema.optional(),
});

export type StartOrchestratorRequest = z.infer<typeof StartOrchestratorRequestSchema>;

export const StartOrchestratorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: OrchestratorStatusSchema,
});

export type StartOrchestratorResponse = z.infer<typeof StartOrchestratorResponseSchema>;

// ============================================================================
// POST /orchestrator/stop - Stop orchestrator
// ============================================================================

export const StopOrchestratorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type StopOrchestratorResponse = z.infer<typeof StopOrchestratorResponseSchema>;

// ============================================================================
// POST /orchestrator/execute - Execute single prompt
// ============================================================================

export const ExecutePromptRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required and cannot be empty'),
  options: OrchestratorOptionsSchema.optional(),
});

export type ExecutePromptRequest = z.infer<typeof ExecutePromptRequestSchema>;

export const ExecutePromptResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    taskId: z.string(),
    prompt: z.string(),
    success: z.boolean(),
    metrics: CycleMetricsSchema,
    totalDuration: z.number(),
    completedTasks: z.array(TaskExecutionSummarySchema),
    failedTasks: z.array(TaskExecutionSummarySchema),
  }),
});

export type ExecutePromptResponse = z.infer<typeof ExecutePromptResponseSchema>;

// ============================================================================
// POST /orchestrator/cycle - Run single orchestrator cycle
// ============================================================================

export const RunCycleRequestSchema = z.object({
  options: OrchestratorOptionsSchema.optional(),
});

export type RunCycleRequest = z.infer<typeof RunCycleRequestSchema>;

export const RunCycleResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    success: z.boolean(),
    metrics: CycleMetricsSchema,
    totalDuration: z.number(),
    totalValidationRuns: z.number(),
    completedTasks: z.array(TaskExecutionSummarySchema),
    failedTasks: z.array(TaskExecutionSummarySchema),
  }),
});

export type RunCycleResponse = z.infer<typeof RunCycleResponseSchema>;

// ============================================================================
// GET /orchestrator/metrics - Get orchestrator metrics
// ============================================================================

export const GetOrchestratorMetricsQuerySchema = z.object({
  days: z.string().optional().describe('Number of days to include (default: 7)'),
});

export type GetOrchestratorMetricsQuery = z.infer<typeof GetOrchestratorMetricsQuerySchema>;

export const GetOrchestratorMetricsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    summary: z.object({
      totalValidationRuns: z.number(),
      successfulRuns: z.number(),
      failedRuns: z.number(),
      successRate: z.number().describe('Percentage (0-100)'),
      averageDuration: z.number().describe('Average duration in milliseconds'),
      averageStages: z.number(),
      tasksProcessed: z.number(),
      periodDays: z.number(),
    }),
    trends: z.array(
      z.object({
        date: z.string().describe('Date in YYYY-MM-DD format'),
        runs: z.number(),
        successful: z.number(),
        failed: z.number(),
      })
    ),
    recentRuns: z.array(
      z.object({
        id: z.string(),
        taskId: z.string(),
        taskContent: z.string().optional(),
        success: z.boolean(),
        totalStages: z.number().optional(),
        passedStages: z.number().optional(),
        failedStages: z.number().optional(),
        totalDuration: z.number().optional(),
        createdAt: z.string(),
      })
    ),
  }),
});

export type GetOrchestratorMetricsResponse = z.infer<typeof GetOrchestratorMetricsResponseSchema>;
