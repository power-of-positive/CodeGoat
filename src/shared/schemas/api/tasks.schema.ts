/**
 * Tasks API Schemas
 * Request and response validation schemas for /api/tasks endpoints
 */
import { z } from 'zod';

// ============================================================================
// Common Enums
// ============================================================================

export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskTypeSchema = z.enum(['story', 'task']);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const ScenarioStatusSchema = z.enum(['pending', 'passed', 'failed', 'skipped']);
export type ScenarioStatus = z.infer<typeof ScenarioStatusSchema>;

// ============================================================================
// Task Entity Schema
// ============================================================================

export const TaskSchema = z.object({
  id: z.string().describe('Task ID (e.g., CODEGOAT-001)'),
  content: z.string().describe('Task description/content'),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  taskType: TaskTypeSchema,
  executorId: z.string().optional().describe('ID of the executor/worker'),
  startTime: z.string().optional().describe('ISO 8601 timestamp when started'),
  endTime: z.string().optional().describe('ISO 8601 timestamp when completed'),
  duration: z.number().optional().describe('Duration in milliseconds'),
});

export type Task = z.infer<typeof TaskSchema>;

// ============================================================================
// GET /tasks - Get all tasks with optional filtering
// ============================================================================

export const GetTasksQuerySchema = z.object({
  status: TaskStatusSchema.optional().describe('Filter by status'),
  priority: TaskPrioritySchema.optional().describe('Filter by priority'),
  taskType: TaskTypeSchema.optional().describe('Filter by type'),
  executorId: z.string().optional().describe('Filter by executor'),
});

export type GetTasksQuery = z.infer<typeof GetTasksQuerySchema>;

export const GetTasksResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(TaskSchema),
  count: z.number().optional(),
});

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;

// ============================================================================
// GET /tasks/analytics - Get task analytics
// ============================================================================

export const GetTaskAnalyticsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
    byPriority: z.record(z.string(), z.number()),
    byType: z.record(z.string(), z.number()),
    avgDuration: z.number().optional().describe('Average duration in milliseconds'),
    completionRate: z.number().optional(),
  }),
});

export type GetTaskAnalyticsResponse = z.infer<typeof GetTaskAnalyticsResponseSchema>;

// ============================================================================
// GET /tasks/:id - Get specific task
// ============================================================================

export const GetTaskParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

export type GetTaskParams = z.infer<typeof GetTaskParamsSchema>;

export const GetTaskResponseSchema = z.object({
  success: z.boolean(),
  data: TaskSchema,
});

export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;

// ============================================================================
// POST /tasks - Create new task
// ============================================================================

export const CreateTaskRequestSchema = z.object({
  content: z
    .string({ message: 'Task content is required' })
    .min(1, 'Task content is required')
    .describe('Task description/content'),
  status: TaskStatusSchema.optional().default('pending'),
  priority: TaskPrioritySchema.optional().default('medium'),
  taskType: TaskTypeSchema.optional().default('task'),
  executorId: z.string().optional().describe('Assign to executor'),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

export const CreateTaskResponseSchema = z.object({
  success: z.boolean(),
  data: TaskSchema,
  message: z.string().optional(),
});

export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;

// ============================================================================
// PUT /tasks/:id - Update task
// ============================================================================

export const UpdateTaskParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

export type UpdateTaskParams = z.infer<typeof UpdateTaskParamsSchema>;

export const UpdateTaskRequestSchema = z.object({
  content: z.string().optional().describe('Update task content'),
  status: TaskStatusSchema.optional().describe('Update status'),
  priority: TaskPrioritySchema.optional().describe('Update priority'),
  taskType: TaskTypeSchema.optional().describe('Update type'),
  executorId: z.string().optional().describe('Update executor'),
  startTime: z.string().optional().describe('Update start time'),
  endTime: z.string().optional().describe('Update end time'),
  duration: z.number().optional().describe('Update duration in milliseconds'),
});

export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;

export const UpdateTaskResponseSchema = z.object({
  success: z.boolean(),
  data: TaskSchema,
  message: z.string().optional(),
});

export type UpdateTaskResponse = z.infer<typeof UpdateTaskResponseSchema>;

// ============================================================================
// DELETE /tasks/:id - Delete task
// ============================================================================

export const DeleteTaskParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

export type DeleteTaskParams = z.infer<typeof DeleteTaskParamsSchema>;

export const DeleteTaskResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteTaskResponse = z.infer<typeof DeleteTaskResponseSchema>;

// ============================================================================
// BDD Scenario Schemas
// ============================================================================

export const BDDScenarioSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  title: z.string(),
  feature: z.string(),
  description: z.string(),
  gherkinContent: z.string().describe('Gherkin scenario text'),
  status: ScenarioStatusSchema,
  executedAt: z.string().optional().nullable(),
  executionDuration: z.number().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  playwrightTestFile: z.string().optional().nullable(),
  playwrightTestName: z.string().optional().nullable(),
  linkedTestFile: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type BDDScenario = z.infer<typeof BDDScenarioSchema>;

// ============================================================================
// POST /tasks/:id/scenarios - Create BDD scenario for task
// ============================================================================

export const CreateScenarioParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

export type CreateScenarioParams = z.infer<typeof CreateScenarioParamsSchema>;

export const CreateScenarioRequestSchema = z.object({
  title: z.string({ message: 'Scenario title is required' }).min(1, 'Scenario title is required'),
  feature: z.string({ message: 'Feature is required' }).min(1, 'Feature is required'),
  description: z.string({ message: 'Description is required' }).min(1, 'Description is required'),
  gherkinContent: z
    .string({ message: 'Gherkin content is required' })
    .min(1, 'Gherkin content is required'),
  status: ScenarioStatusSchema.optional().default('pending'),
  linkedTestFile: z.string().optional(),
});

export type CreateScenarioRequest = z.infer<typeof CreateScenarioRequestSchema>;

export const CreateScenarioResponseSchema = z.object({
  success: z.boolean(),
  data: BDDScenarioSchema,
});

export type CreateScenarioResponse = z.infer<typeof CreateScenarioResponseSchema>;

// ============================================================================
// PUT /tasks/:id/scenarios/:scenarioId - Update BDD scenario
// ============================================================================

export const UpdateScenarioParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type UpdateScenarioParams = z.infer<typeof UpdateScenarioParamsSchema>;

export const UpdateScenarioRequestSchema = z.object({
  title: z.string().optional(),
  feature: z.string().optional(),
  description: z.string().optional(),
  gherkinContent: z.string().optional(),
  status: ScenarioStatusSchema.optional(),
  linkedTestFile: z.string().optional(),
});

export type UpdateScenarioRequest = z.infer<typeof UpdateScenarioRequestSchema>;

export const UpdateScenarioResponseSchema = z.object({
  success: z.boolean(),
  data: BDDScenarioSchema,
});

export type UpdateScenarioResponse = z.infer<typeof UpdateScenarioResponseSchema>;

// ============================================================================
// DELETE /tasks/:id/scenarios/:scenarioId - Delete BDD scenario
// ============================================================================

export const DeleteScenarioParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type DeleteScenarioParams = z.infer<typeof DeleteScenarioParamsSchema>;

export const DeleteScenarioResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteScenarioResponse = z.infer<typeof DeleteScenarioResponseSchema>;

// ============================================================================
// Scenario Execution Schemas
// ============================================================================

export const ScenarioExecutionSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  status: z.enum(['pending', 'running', 'passed', 'failed']),
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().optional().describe('Duration in milliseconds'),
  output: z.string().optional(),
  error: z.string().optional(),
});

export type ScenarioExecution = z.infer<typeof ScenarioExecutionSchema>;

// ============================================================================
// GET /tasks/:id/scenarios/:scenarioId/executions - Get scenario executions
// ============================================================================

export const GetExecutionsParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type GetExecutionsParams = z.infer<typeof GetExecutionsParamsSchema>;

export const GetExecutionsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ScenarioExecutionSchema),
});

export type GetExecutionsResponse = z.infer<typeof GetExecutionsResponseSchema>;

// ============================================================================
// POST /tasks/:id/scenarios/:scenarioId/executions - Execute scenario
// ============================================================================

export const ExecuteScenarioParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type ExecuteScenarioParams = z.infer<typeof ExecuteScenarioParamsSchema>;

export const ExecuteScenarioRequestSchema = z.object({
  options: z
    .object({
      timeout: z.number().optional(),
      retries: z.number().optional(),
      environment: z.string().optional(),
    })
    .optional(),
});

export type ExecuteScenarioRequest = z.infer<typeof ExecuteScenarioRequestSchema>;

export const ExecuteScenarioResponseSchema = z.object({
  success: z.boolean(),
  data: ScenarioExecutionSchema,
});

export type ExecuteScenarioResponse = z.infer<typeof ExecuteScenarioResponseSchema>;

// ============================================================================
// GET /tasks/:id/scenarios/:scenarioId/analytics - Get scenario analytics
// ============================================================================

export const GetScenarioAnalyticsParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type GetScenarioAnalyticsParams = z.infer<typeof GetScenarioAnalyticsParamsSchema>;

export const GetScenarioAnalyticsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalExecutions: z.number(),
    successRate: z.number().describe('Percentage (0-100)'),
    avgDuration: z.number().describe('Average duration in milliseconds'),
    lastExecution: ScenarioExecutionSchema.optional(),
    recentExecutions: z.array(ScenarioExecutionSchema),
  }),
});

export type GetScenarioAnalyticsResponse = z.infer<typeof GetScenarioAnalyticsResponseSchema>;
