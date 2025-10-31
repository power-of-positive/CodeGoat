/**
 * Analytics API Schemas
 * Request and response validation schemas for /api/analytics endpoints
 */
import { z } from 'zod';

// ============================================================================
// Common Analytics Types
// ============================================================================

export const SessionSchema = z.object({
  sessionId: z.string(),
  userPrompt: z.string(),
  taskDescription: z.string().optional(),
  startTime: z.string().describe('ISO 8601 timestamp'),
  endTime: z.string().optional().describe('ISO 8601 timestamp'),
  success: z.boolean().optional(),
  attempts: z.array(z.unknown()).optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const ValidationAttemptSchema = z.object({
  attempt: z.number().describe('Attempt number (1, 2, 3, ...)'),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  success: z.boolean(),
  stages: z.array(
    z.object({
      stageName: z.string(),
      stageId: z.string().optional(),
      success: z.boolean(),
      duration: z.number().describe('Duration in milliseconds'),
      error: z.string().optional(),
    })
  ),
  totalTime: z.number().describe('Total duration in milliseconds'),
});

export type ValidationAttempt = z.infer<typeof ValidationAttemptSchema>;

export const StageStatisticsSchema = z.object({
  stageName: z.string(),
  stageId: z.string().optional(),
  totalRuns: z.number(),
  successCount: z.number(),
  successRate: z.number().describe('Percentage (0-100)'),
  totalDuration: z.number().describe('Total duration in milliseconds'),
  averageDuration: z.number().describe('Average duration in milliseconds'),
});

export type StageStatistics = z.infer<typeof StageStatisticsSchema>;

export const AnalyticsValidationRunSchema = z.object({
  id: z.string(),
  taskId: z.string().optional(),
  success: z.boolean(),
  totalTime: z.number().describe('Duration in milliseconds'),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  stages: z.array(
    z.object({
      stageName: z.string(),
      stageId: z.string().optional(),
      name: z.string().optional(),
      success: z.boolean(),
      duration: z.number(),
      error: z.string().optional(),
    })
  ),
});

export type AnalyticsValidationRun = z.infer<typeof AnalyticsValidationRunSchema>;

// ============================================================================
// GET /analytics - Get overall analytics
// ============================================================================

export const GetAnalyticsQuerySchema = z.object({
  agent: z.string().optional().describe('Filter by agent/executor'),
});

export type GetAnalyticsQuery = z.infer<typeof GetAnalyticsQuerySchema>;

export const GetAnalyticsResponseSchema = z.object({
  totalSessions: z.number(),
  successfulSessions: z.number(),
  failedSessions: z.number(),
  successRate: z.number().describe('Percentage (0-100)'),
  averageDuration: z.number().describe('Average duration in milliseconds'),
  stageStatistics: z.array(StageStatisticsSchema),
});

export type GetAnalyticsResponse = z.infer<typeof GetAnalyticsResponseSchema>;

// ============================================================================
// GET /analytics/sessions - Get recent sessions
// ============================================================================

export const GetSessionsQuerySchema = z.object({
  limit: z.string().optional().describe('Number of sessions to return (default: 10)'),
});

export type GetSessionsQuery = z.infer<typeof GetSessionsQuerySchema>;

export const GetSessionsResponseSchema = z.object({
  sessions: z.array(SessionSchema),
});

export type GetSessionsResponse = z.infer<typeof GetSessionsResponseSchema>;

// ============================================================================
// GET /analytics/sessions/:sessionId - Get specific session
// ============================================================================

export const GetSessionParamsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export type GetSessionParams = z.infer<typeof GetSessionParamsSchema>;

export const GetSessionResponseSchema = SessionSchema;

export type GetSessionResponse = z.infer<typeof GetSessionResponseSchema>;

// ============================================================================
// POST /analytics/sessions - Start new session
// ============================================================================

export const StartSessionRequestSchema = z.object({
  userPrompt: z.string().optional().describe('Optional user prompt'),
  taskDescription: z.string().optional().describe('Optional task description'),
});

export type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;

export const StartSessionResponseSchema = z.object({
  message: z.string(),
  sessionId: z.string(),
});

export type StartSessionResponse = z.infer<typeof StartSessionResponseSchema>;

// ============================================================================
// PUT /analytics/sessions/:sessionId/end - End session
// ============================================================================

export const EndSessionParamsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export type EndSessionParams = z.infer<typeof EndSessionParamsSchema>;

export const EndSessionRequestSchema = z.object({
  success: z.boolean().optional().default(false).describe('Whether the session was successful'),
});

export type EndSessionRequest = z.infer<typeof EndSessionRequestSchema>;

export const EndSessionResponseSchema = z.object({
  message: z.string(),
  sessionId: z.string(),
});

export type EndSessionResponse = z.infer<typeof EndSessionResponseSchema>;

// ============================================================================
// POST /analytics/sessions/:sessionId/attempts - Record validation attempt
// ============================================================================

export const RecordAttemptParamsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export type RecordAttemptParams = z.infer<typeof RecordAttemptParamsSchema>;

export const RecordAttemptRequestSchema = ValidationAttemptSchema;

export type RecordAttemptRequest = z.infer<typeof RecordAttemptRequestSchema>;

export const RecordAttemptResponseSchema = z.object({
  message: z.string(),
  sessionId: z.string(),
  attempt: z.number(),
});

export type RecordAttemptResponse = z.infer<typeof RecordAttemptResponseSchema>;

// ============================================================================
// DELETE /analytics/cleanup - Cleanup old sessions
// ============================================================================

export const CleanupSessionsQuerySchema = z.object({
  keepLast: z.string().optional().describe('Number of recent sessions to keep (default: 100)'),
});

export type CleanupSessionsQuery = z.infer<typeof CleanupSessionsQuerySchema>;

export const CleanupSessionsResponseSchema = z.object({
  message: z.string(),
  keepLast: z.number(),
});

export type CleanupSessionsResponse = z.infer<typeof CleanupSessionsResponseSchema>;

// ============================================================================
// GET /analytics/stages/:stageId/history - Get stage history
// ============================================================================

export const GetStageHistoryParamsSchema = z.object({
  stageId: z.string().min(1, 'Stage ID is required'),
});

export type GetStageHistoryParams = z.infer<typeof GetStageHistoryParamsSchema>;

export const GetStageHistoryQuerySchema = z.object({
  days: z.string().optional().describe('Number of days of history (default: 30)'),
});

export type GetStageHistoryQuery = z.infer<typeof GetStageHistoryQuerySchema>;

export const GetStageHistoryResponseSchema = z.object({
  stageId: z.string(),
  history: z.array(
    z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
      runs: z.number(),
      successes: z.number(),
      failures: z.number(),
      averageDuration: z.number(),
    })
  ),
});

export type GetStageHistoryResponse = z.infer<typeof GetStageHistoryResponseSchema>;

// ============================================================================
// GET /analytics/stages/:stageId/statistics - Get stage statistics
// ============================================================================

export const GetStageStatisticsParamsSchema = z.object({
  stageId: z.string().min(1, 'Stage ID is required'),
});

export type GetStageStatisticsParams = z.infer<typeof GetStageStatisticsParamsSchema>;

export const GetStageStatisticsResponseSchema = z.object({
  stageId: z.string(),
  statistics: StageStatisticsSchema,
});

export type GetStageStatisticsResponse = z.infer<typeof GetStageStatisticsResponseSchema>;

// ============================================================================
// GET /analytics/validation-runs - Get validation runs
// ============================================================================

export const GetValidationRunsQuerySchema = z.object({
  limit: z.string().optional().describe('Number of runs to return (default: 10)'),
  taskId: z.string().optional().describe('Filter by task ID'),
});

export type GetValidationRunsQuery = z.infer<typeof GetValidationRunsQuerySchema>;

export const GetAnalyticsValidationRunsResponseSchema = z.object({
  validationRuns: z.array(AnalyticsValidationRunSchema),
});

export type GetAnalyticsValidationRunsResponse = z.infer<
  typeof GetAnalyticsValidationRunsResponseSchema
>;

// ============================================================================
// GET /analytics/validation-statistics - Get validation statistics
// ============================================================================

export const GetValidationStatisticsQuerySchema = z.object({
  days: z.string().optional().describe('Number of days to include (default: 30)'),
});

export type GetValidationStatisticsQuery = z.infer<typeof GetValidationStatisticsQuerySchema>;

export const GetValidationStatisticsResponseSchema = z.object({
  statistics: z.object({
    totalRuns: z.number(),
    successfulRuns: z.number(),
    failedRuns: z.number(),
    successRate: z.number().describe('Percentage (0-100)'),
    averageDuration: z.number().describe('Average duration in milliseconds'),
    stageStatistics: z.array(StageStatisticsSchema),
  }),
});

export type GetValidationStatisticsResponse = z.infer<typeof GetValidationStatisticsResponseSchema>;

// ============================================================================
// GET /analytics/validation-metrics - Get validation metrics for dashboard
// ============================================================================

export const GetValidationMetricsResponseSchema = z.object({
  totalRuns: z.number(),
  successRate: z.number().describe('Percentage (0-100)'),
  averageDuration: z.number().describe('Average duration in milliseconds'),
  stages: z.array(
    z.object({
      stageName: z.string(),
      totalRuns: z.number(),
      successRate: z.number(),
      averageDuration: z.number(),
      recentTrend: z.enum(['stable', 'improving', 'declining']),
      enabled: z.boolean(),
    })
  ),
  recentRuns: z.array(AnalyticsValidationRunSchema),
});

export type GetValidationMetricsResponse = z.infer<typeof GetValidationMetricsResponseSchema>;
