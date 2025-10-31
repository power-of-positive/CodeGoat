/**
 * BDD Scenarios API Schemas
 * Request and response validation schemas for /api/bdd-scenarios endpoints
 */
import { z } from 'zod';

// ============================================================================
// Enums and Common Types
// ============================================================================

export const BDDScenarioStatusSchema = z.enum([
  'pending',
  'running',
  'passed',
  'failed',
  'skipped',
]);

export type BDDScenarioStatus = z.infer<typeof BDDScenarioStatusSchema>;

// ============================================================================
// GET /bdd-scenarios/task/:taskId - Get scenarios for a task
// ============================================================================

export const GetTaskScenariosParamsSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
});

export type GetTaskScenariosParams = z.infer<typeof GetTaskScenariosParamsSchema>;

// ============================================================================
// POST /bdd-scenarios - Create new BDD scenario
// ============================================================================

export const CreateBDDScenarioRequestSchema = z.object({
  todoTaskId: z.string().min(1, 'Todo task ID is required'),
  title: z.string().min(1, 'Title is required'),
  gherkinContent: z.string().min(1, 'Gherkin content is required'),
  testFile: z.string().optional(),
  testName: z.string().optional(),
});

export type CreateBDDScenarioRequest = z.infer<typeof CreateBDDScenarioRequestSchema>;

// ============================================================================
// PUT /bdd-scenarios/:scenarioId/status - Update scenario status
// ============================================================================

export const UpdateScenarioStatusParamsSchema = z.object({
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type UpdateScenarioStatusParams = z.infer<typeof UpdateScenarioStatusParamsSchema>;

export const UpdateScenarioStatusRequestSchema = z.object({
  status: BDDScenarioStatusSchema,
  errorMessage: z.string().optional(),
});

export type UpdateScenarioStatusRequest = z.infer<typeof UpdateScenarioStatusRequestSchema>;

// ============================================================================
// POST /bdd-scenarios/:scenarioId/execute - Execute a scenario
// ============================================================================

export const ExecuteBDDScenarioParamsSchema = z.object({
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type ExecuteBDDScenarioParams = z.infer<typeof ExecuteBDDScenarioParamsSchema>;

// ============================================================================
// GET /bdd-scenarios/:scenarioId/history - Get execution history
// ============================================================================

export const GetExecutionHistoryParamsSchema = z.object({
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type GetExecutionHistoryParams = z.infer<typeof GetExecutionHistoryParamsSchema>;

// ============================================================================
// PUT /bdd-scenarios/:scenarioId/link-test - Link scenario to Playwright test
// ============================================================================

export const LinkTestParamsSchema = z.object({
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

export type LinkTestParams = z.infer<typeof LinkTestParamsSchema>;

export const LinkTestRequestSchema = z.object({
  testFile: z.string().min(1, 'Test file is required'),
  testName: z.string().min(1, 'Test name is required'),
});

export type LinkTestRequest = z.infer<typeof LinkTestRequestSchema>;
