/**
 * Validation Runs API Schemas
 * Request and response validation schemas for /api/validation-runs endpoints
 */
import { z } from 'zod';

// ============================================================================
// Common Validation Run Types
// ============================================================================

export const ValidationStageResultSchema = z.object({
  id: z.string(),
  stageId: z.string(),
  stageName: z.string(),
  success: z.boolean(),
  duration: z.number().describe('Duration in milliseconds'),
  command: z.string().optional(),
  exitCode: z.number().optional(),
  output: z.string().optional(),
  errorMessage: z.string().optional(),
  enabled: z.boolean(),
  continueOnFailure: z.boolean(),
  order: z.number(),
});

export type ValidationStageResult = z.infer<typeof ValidationStageResultSchema>;

export const ValidationLogSchema = z.object({
  id: z.string(),
  stageId: z.string().optional(),
  level: z.string(),
  message: z.string(),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ValidationLog = z.infer<typeof ValidationLogSchema>;

export const ValidationRunDetailSchema = z.object({
  id: z.string(),
  taskId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  startTime: z.number().optional().describe('Timestamp in milliseconds'),
  totalTime: z.number().describe('Total duration in milliseconds'),
  totalStages: z.number(),
  passedStages: z.number(),
  failedStages: z.number(),
  success: z.boolean(),
  triggerType: z.string().optional(),
  environment: z.string().optional(),
  gitCommit: z.string().optional(),
  gitBranch: z.string().optional(),
  stages: z.array(ValidationStageResultSchema),
});

export type ValidationRunDetail = z.infer<typeof ValidationRunDetailSchema>;

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

// ============================================================================
// GET /validation-runs - Get all validation runs with pagination
// ============================================================================

export const GetAllValidationRunsQuerySchema = z.object({
  page: z.string().optional().describe('Page number (default: 1)'),
  limit: z.string().optional().describe('Results per page (default: 10)'),
  success: z.string().optional().describe('Filter by success (true/false)'),
  environment: z.string().optional().describe('Filter by environment'),
  taskId: z.string().optional().describe('Filter by task ID'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601)'),
});

export type GetAllValidationRunsQuery = z.infer<typeof GetAllValidationRunsQuerySchema>;

export const GetAllValidationRunsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    runs: z.array(ValidationRunDetailSchema),
    pagination: PaginationSchema,
  }),
});

export type GetAllValidationRunsResponse = z.infer<typeof GetAllValidationRunsResponseSchema>;

// ============================================================================
// GET /validation-runs/:id - Get single validation run with full details
// ============================================================================

export const GetSingleValidationRunParamsSchema = z.object({
  id: z.string().min(1, 'Validation run ID is required'),
});

export type GetSingleValidationRunParams = z.infer<typeof GetSingleValidationRunParamsSchema>;

export const GetSingleValidationRunResponseSchema = z.object({
  success: z.boolean(),
  data: ValidationRunDetailSchema.extend({
    logs: z.array(ValidationLogSchema),
  }),
});

export type GetSingleValidationRunResponse = z.infer<typeof GetSingleValidationRunResponseSchema>;

// ============================================================================
// POST /validation-runs - Create new validation run
// ============================================================================

export const CreateValidationRunRequestSchema = z.object({
  taskId: z.string().optional(),
  sessionId: z.string().optional(),
  triggerType: z.string().optional(),
  environment: z.string().optional().default('development'),
  gitCommit: z.string().optional(),
  gitBranch: z.string().optional(),
  stages: z
    .array(
      z.object({
        stageId: z.string().min(1, 'Stage ID is required'),
        stageName: z.string().min(1, 'Stage name is required'),
        success: z.boolean(),
        duration: z.number().min(0, 'Duration must be non-negative'),
        command: z.string().optional(),
        exitCode: z.number().optional(),
        output: z.string().optional(),
        errorMessage: z.string().optional(),
        enabled: z.boolean().default(true),
        continueOnFailure: z.boolean().default(false),
        order: z.number().min(0, 'Order must be non-negative'),
      })
    )
    .min(1, 'At least one stage is required'),
});

export type CreateValidationRunRequest = z.infer<typeof CreateValidationRunRequestSchema>;

export const CreateValidationRunResponseSchema = z.object({
  success: z.boolean(),
  data: ValidationRunDetailSchema,
});

export type CreateValidationRunResponse = z.infer<typeof CreateValidationRunResponseSchema>;

// ============================================================================
// GET /validation-runs/analytics/summary - Get validation analytics summary
// ============================================================================

export const GetAnalyticsSummaryQuerySchema = z.object({
  days: z.string().optional().describe('Number of days to include (default: 30)'),
  environment: z.string().optional().describe('Filter by environment'),
});

export type GetAnalyticsSummaryQuery = z.infer<typeof GetAnalyticsSummaryQuerySchema>;

export const GetAnalyticsSummaryResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    overview: z.object({
      totalRuns: z.number(),
      successfulRuns: z.number(),
      failedRuns: z.number(),
      successRate: z.number().describe('Percentage (0-100)'),
      averageDuration: z.number().describe('Average duration in milliseconds'),
      period: z.string(),
    }),
    stageStatistics: z.array(
      z.object({
        stageId: z.string(),
        stageName: z.string(),
        totalRuns: z.number(),
        successfulRuns: z.number(),
        failedRuns: z.number(),
        successRate: z.number(),
        totalDuration: z.number(),
        avgDuration: z.number(),
      })
    ),
    dailyTrends: z.array(
      z.object({
        date: z.string(),
        total: z.number(),
        successful: z.number(),
        failed: z.number(),
        successRate: z.number(),
      })
    ),
  }),
});

export type GetAnalyticsSummaryResponse = z.infer<typeof GetAnalyticsSummaryResponseSchema>;

// ============================================================================
// GET /validation-runs/analytics/stages - Get stage analytics
// ============================================================================

export const GetStageAnalyticsQuerySchema = z.object({
  days: z.string().optional().describe('Number of days to include (default: 30)'),
  environment: z.string().optional().describe('Filter by environment'),
  stageId: z.string().optional().describe('Filter by specific stage'),
});

export type GetStageAnalyticsQuery = z.infer<typeof GetStageAnalyticsQuerySchema>;

export const GetStageAnalyticsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    stages: z.array(
      z.object({
        stageId: z.string(),
        stageName: z.string(),
        totalRuns: z.number(),
        successfulRuns: z.number(),
        failedRuns: z.number(),
        successRate: z.number(),
        avgDuration: z.number(),
        medianDuration: z.number(),
        minDuration: z.number(),
        maxDuration: z.number(),
        recentTrend: z.string(),
      })
    ),
  }),
});

export type GetStageAnalyticsResponse = z.infer<typeof GetStageAnalyticsResponseSchema>;

// ============================================================================
// GET /validation-runs/analytics/history - Get historical trends
// ============================================================================

export const GetHistoryQuerySchema = z.object({
  days: z.string().optional().describe('Number of days to include (default: 30)'),
  environment: z.string().optional().describe('Filter by environment'),
  groupBy: z.enum(['day', 'week', 'month']).optional().describe('Time grouping (default: day)'),
});

export type GetHistoryQuery = z.infer<typeof GetHistoryQuerySchema>;

export const GetHistoryResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    history: z.array(
      z.object({
        period: z.string(),
        totalRuns: z.number(),
        successfulRuns: z.number(),
        failedRuns: z.number(),
        successRate: z.number(),
        avgDuration: z.number(),
      })
    ),
  }),
});

export type GetHistoryResponse = z.infer<typeof GetHistoryResponseSchema>;

// ============================================================================
// GET /validation-runs/analytics/comparison - Compare validation runs
// ============================================================================

export const GetComparisonQuerySchema = z.object({
  runIds: z.string().describe('Comma-separated list of run IDs to compare'),
});

export type GetComparisonQuery = z.infer<typeof GetComparisonQuerySchema>;

export const GetComparisonResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    runs: z.array(
      z.object({
        id: z.string(),
        timestamp: z.string(),
        success: z.boolean(),
        totalStages: z.number(),
        passedStages: z.number(),
        failedStages: z.number(),
        totalTime: z.number(),
        environment: z.string().optional(),
        taskId: z.string().optional(),
      })
    ),
    stageComparison: z.array(
      z.object({
        stageId: z.string(),
        stageName: z.string(),
        results: z.array(
          z.object({
            runId: z.string(),
            success: z.boolean(),
            duration: z.number(),
            errorMessage: z.string().optional(),
          })
        ),
      })
    ),
  }),
});

export type GetComparisonResponse = z.infer<typeof GetComparisonResponseSchema>;
