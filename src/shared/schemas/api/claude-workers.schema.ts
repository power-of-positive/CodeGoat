/**
 * Claude Workers API Schemas
 * Request and response validation schemas for /api/claude-workers endpoints
 */
import { z } from 'zod';
import {
  WorkerSchema,
  ValidationStageSchema,
  ValidationRunOverallStatusSchema,
  BlockedCommandSchema,
} from '../common.schema';

// ============================================================================
// POST /claude-workers/start - Start a new Claude Code worker
// ============================================================================

export const StartWorkerRequestSchema = z.object({
  taskId: z
    .string()
    .min(1, 'Task ID is required and cannot be empty')
    .describe('Unique identifier for the task to execute'),

  taskContent: z
    .string()
    .min(1, 'Task content is required and cannot be empty')
    .describe('Description or prompt for the task'),

  workingDirectory: z
    .string()
    .optional()
    .describe('Optional working directory path (defaults to isolated worktree)'),
});

export type StartWorkerRequest = z.infer<typeof StartWorkerRequestSchema>;

export const StartWorkerResponseSchema = z.object({
  workerId: z.string().describe('Generated unique worker ID'),
  taskId: z.string().describe('Task ID this worker is executing'),
  status: z.enum(['starting', 'running']).describe('Initial worker status'),
  pid: z.number().optional().describe('Process ID of the Claude Code process'),
  logFile: z.string().describe('Path to the worker log file'),
  startTime: z.string().describe('ISO 8601 timestamp when worker started'),
});

export type StartWorkerResponse = z.infer<typeof StartWorkerResponseSchema>;

// ============================================================================
// POST /claude-workers/:workerId/stop - Stop a running worker
// ============================================================================

export const StopWorkerParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type StopWorkerParams = z.infer<typeof StopWorkerParamsSchema>;

export const StopWorkerResponseSchema = z.object({
  workerId: z.string(),
  status: z.enum(['stopped', 'completed', 'failed']),
});

export type StopWorkerResponse = z.infer<typeof StopWorkerResponseSchema>;

// ============================================================================
// GET /claude-workers/status - Get all workers status
// ============================================================================

export const GetWorkersStatusResponseSchema = z.object({
  workers: z.array(WorkerSchema),
  activeCount: z.number().describe('Number of currently running workers'),
  totalCount: z.number().describe('Total number of workers'),
  totalBlockedCommands: z.number().describe('Total blocked commands across all workers'),
});

export type GetWorkersStatusResponse = z.infer<typeof GetWorkersStatusResponseSchema>;

// ============================================================================
// GET /claude-workers/:workerId - Get specific worker status
// ============================================================================

export const GetWorkerParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type GetWorkerParams = z.infer<typeof GetWorkerParamsSchema>;

export const GetWorkerResponseSchema = WorkerSchema;

export type GetWorkerResponse = z.infer<typeof GetWorkerResponseSchema>;

// ============================================================================
// POST /claude-workers/:workerId/message - Send message to worker
// ============================================================================

export const SendMessageParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type SendMessageParams = z.infer<typeof SendMessageParamsSchema>;

export const SendMessageRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .describe('Message to send to the running worker'),
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const SendMessageResponseSchema = z.object({
  workerId: z.string(),
  message: z.string(),
  timestamp: z.string(),
  status: z.literal('sent'),
});

export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;

// ============================================================================
// POST /claude-workers/:workerId/follow-up - Send follow-up prompt
// ============================================================================

export const SendFollowUpParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type SendFollowUpParams = z.infer<typeof SendFollowUpParamsSchema>;

export const SendFollowUpRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt cannot be empty')
    .describe('Follow-up prompt to send to the worker'),
});

export type SendFollowUpRequest = z.infer<typeof SendFollowUpRequestSchema>;

export const SendFollowUpResponseSchema = z.object({
  message: z.string(),
  workerId: z.string(),
  timestamp: z.string(),
});

export type SendFollowUpResponse = z.infer<typeof SendFollowUpResponseSchema>;

// ============================================================================
// POST /claude-workers/:workerId/merge - Merge worker changes
// ============================================================================

export const MergeWorkerParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type MergeWorkerParams = z.infer<typeof MergeWorkerParamsSchema>;

export const MergeWorkerRequestSchema = z.object({
  commitMessage: z
    .string()
    .optional()
    .describe('Custom commit message (defaults to auto-generated message)'),
});

export type MergeWorkerRequest = z.infer<typeof MergeWorkerRequestSchema>;

export const MergeWorkerResponseSchema = z.object({
  message: z.string(),
  commitHash: z.string(),
  targetBranch: z.string(),
  commitMessage: z.string(),
});

export type MergeWorkerResponse = z.infer<typeof MergeWorkerResponseSchema>;

// ============================================================================
// GET /claude-workers/:workerId/blocked-commands - Get blocked commands
// ============================================================================

export const GetBlockedCommandsParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type GetBlockedCommandsParams = z.infer<typeof GetBlockedCommandsParamsSchema>;

export const GetBlockedCommandsResponseSchema = z.object({
  workerId: z.string(),
  blockedCommands: z.number(),
  blockedCommandsList: z.array(BlockedCommandSchema),
  hasPermissionSystem: z.boolean(),
});

export type GetBlockedCommandsResponse = z.infer<typeof GetBlockedCommandsResponseSchema>;

// ============================================================================
// GET /claude-workers/:workerId/validation-runs - Get validation runs
// ============================================================================

export const GetValidationRunsParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type GetValidationRunsParams = z.infer<typeof GetValidationRunsParamsSchema>;

export const ValidationRunSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  stages: z.array(ValidationStageSchema),
  overallStatus: ValidationRunOverallStatusSchema,
  metricsFile: z.string().optional(),
});

export type ValidationRun = z.infer<typeof ValidationRunSchema>;

export const GetValidationRunsResponseSchema = z.object({
  workerId: z.string(),
  validationRuns: z.array(ValidationRunSchema),
  totalRuns: z.number(),
  lastRun: ValidationRunSchema.nullable(),
});

export type GetValidationRunsResponse = z.infer<typeof GetValidationRunsResponseSchema>;

// ============================================================================
// GET /claude-workers/:workerId/validation-runs/:runId - Get specific run
// ============================================================================

export const GetValidationRunParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  runId: z.string().min(1, 'Run ID is required'),
});

export type GetValidationRunParams = z.infer<typeof GetValidationRunParamsSchema>;

export const GetValidationRunResponseSchema = ValidationRunSchema;

export type GetValidationRunResponse = z.infer<typeof GetValidationRunResponseSchema>;

// ============================================================================
// GET /claude-workers/:workerId/logs - Get worker logs
// ============================================================================

export const GetWorkerLogsParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type GetWorkerLogsParams = z.infer<typeof GetWorkerLogsParamsSchema>;

export const GetWorkerLogsResponseSchema = z.object({
  workerId: z.string(),
  logs: z.string(),
  logFile: z.string(),
});

export type GetWorkerLogsResponse = z.infer<typeof GetWorkerLogsResponseSchema>;

// ============================================================================
// GET /claude-workers/:workerId/entries - Get log entries
// ============================================================================

export const GetLogEntriesParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type GetLogEntriesParams = z.infer<typeof GetLogEntriesParamsSchema>;

export const LogEntrySchema = z.object({
  timestamp: z.string(),
  type: z.string(),
  content: z.unknown(), // Can be string or structured data
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

export const GetLogEntriesResponseSchema = z.object({
  workerId: z.string(),
  entries: z.array(LogEntrySchema),
  totalEntries: z.number(),
});

export type GetLogEntriesResponse = z.infer<typeof GetLogEntriesResponseSchema>;

// ============================================================================
// GET /claude-workers/:workerId/enhanced-logs - Get enhanced logs (SSE)
// ============================================================================

export const GetEnhancedLogsParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type GetEnhancedLogsParams = z.infer<typeof GetEnhancedLogsParamsSchema>;

// Note: This endpoint returns SSE stream, no response schema needed

// ============================================================================
// POST /claude-workers/:workerId/open-vscode - Open VS Code
// ============================================================================

export const OpenVSCodeParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type OpenVSCodeParams = z.infer<typeof OpenVSCodeParamsSchema>;

export const OpenVSCodeResponseSchema = z.object({
  message: z.string(),
  path: z.string(),
});

export type OpenVSCodeResponse = z.infer<typeof OpenVSCodeResponseSchema>;

// ============================================================================
// POST /claude-workers/:workerId/merge-worktree - Merge worktree
// ============================================================================

export const MergeWorktreeParamsSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
});

export type MergeWorktreeParams = z.infer<typeof MergeWorktreeParamsSchema>;

export const MergeWorktreeRequestSchema = z.object({
  commitMessage: z.string().optional(),
});

export type MergeWorktreeRequest = z.infer<typeof MergeWorktreeRequestSchema>;

export const MergeWorktreeResponseSchema = z.object({
  message: z.string(),
  commitHash: z.string(),
  targetBranch: z.string(),
});

export type MergeWorktreeResponse = z.infer<typeof MergeWorktreeResponseSchema>;

// ============================================================================
// POST /claude-workers/stop-all - Stop all workers
// ============================================================================

export const StopAllWorkersResponseSchema = z.object({
  message: z.string(),
  stoppedCount: z.number(),
  workers: z.array(z.string()),
});

export type StopAllWorkersResponse = z.infer<typeof StopAllWorkersResponseSchema>;

// ============================================================================
// POST /claude-workers/clear - Clear logs
// ============================================================================

export const ClearLogsResponseSchema = z.object({
  message: z.string(),
  clearedFiles: z.number(),
});

export type ClearLogsResponse = z.infer<typeof ClearLogsResponseSchema>;

// ============================================================================
// POST /claude-workers/cleanup-worktrees - Cleanup worktrees
// ============================================================================

export const CleanupWorktreesResponseSchema = z.object({
  message: z.string(),
  cleanedWorktrees: z.array(z.string()),
  errors: z.array(z.string()).optional(),
});

export type CleanupWorktreesResponse = z.infer<typeof CleanupWorktreesResponseSchema>;

// ============================================================================
// GET /claude-workers/logs/stats - Get log statistics
// ============================================================================

export const GetLogStatsResponseSchema = z.object({
  totalLogs: z.number(),
  totalSize: z.number(),
  oldestLog: z.string().optional(),
  newestLog: z.string().optional(),
  logsByWorker: z.record(z.string(), z.number()),
});

export type GetLogStatsResponse = z.infer<typeof GetLogStatsResponseSchema>;

// ============================================================================
// POST /claude-workers/logs/cleanup - Cleanup old logs
// ============================================================================

export const CleanupLogsRequestSchema = z.object({
  olderThanDays: z.number().optional(),
  maxFiles: z.number().optional(),
});

export type CleanupLogsRequest = z.infer<typeof CleanupLogsRequestSchema>;

export const CleanupLogsResponseSchema = z.object({
  message: z.string(),
  deletedFiles: z.number(),
  freedSpace: z.number(),
});

export type CleanupLogsResponse = z.infer<typeof CleanupLogsResponseSchema>;
