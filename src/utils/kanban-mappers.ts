/**
 * Mappers to convert between Prisma models and API response types
 */

import {
  Project as PrismaProject,
  Task as PrismaTask,
  TaskAttempt as PrismaTaskAttempt,
  TaskTemplate as PrismaTaskTemplate,
  ExecutionProcess as PrismaExecutionProcess,
  AiModel as PrismaAiModel,
  ExecutionMetric as PrismaExecutionMetric,
} from '@prisma/client';
import {
  Project,
  Task,
  TaskAttempt,
  TaskTemplate,
  ExecutionProcess,
  AiModel,
  ExecutionMetric,
  TaskWithAttemptStatus,
  TaskStatus,
  ExecutionProcessRunReason,
  ExecutionProcessStatus,
} from '../types/kanban.types';

/**
 * Convert Prisma Project to API Project
 */
export function mapPrismaProjectToApi(prismaProject: PrismaProject): Project {
  return {
    id: prismaProject.id,
    name: prismaProject.name,
    description: prismaProject.description || undefined,
    git_repo_path: prismaProject.gitRepoPath,
    setup_script: prismaProject.setupScript || undefined,
    dev_script: prismaProject.devScript || undefined,
    cleanup_script: prismaProject.cleanupScript || undefined,
    created_at: prismaProject.createdAt,
    updated_at: prismaProject.updatedAt,
  };
}

/**
 * Convert Prisma Task to API Task
 */
export function mapPrismaTaskToApi(prismaTask: PrismaTask): Task {
  return {
    id: prismaTask.id,
    project_id: prismaTask.projectId,
    title: prismaTask.title,
    description: prismaTask.description || undefined,
    status: prismaTask.status.toLowerCase() as TaskStatus, // Convert enum
    parent_task_attempt: prismaTask.parentTaskAttempt || undefined,
    created_at: prismaTask.createdAt.toISOString(),
    updated_at: prismaTask.updatedAt.toISOString(),
  };
}

/**
 * Convert Prisma Task with additional data to TaskWithAttemptStatus
 */
export function mapPrismaTaskToApiWithStatus(
  prismaTask: PrismaTask & {
    attempts: PrismaTaskAttempt[];
  }
): TaskWithAttemptStatus {
  const baseTask = mapPrismaTaskToApi(prismaTask);

  // Calculate attempt status flags
  const hasInProgressAttempt = prismaTask.attempts.some(attempt => attempt.status === 'RUNNING');

  const hasMergedAttempt = prismaTask.attempts.some(attempt => attempt.mergeCommit !== null);

  const lastAttemptFailed =
    prismaTask.attempts.length > 0 &&
    prismaTask.attempts[prismaTask.attempts.length - 1].status === 'FAILED';

  // Get the most common executor (base coding agent)
  const executors = prismaTask.attempts.map(attempt => attempt.executor);
  const baseCodingAgent = executors.length > 0 ? executors[0] : 'CLAUDE_CODE';

  return {
    ...baseTask,
    has_in_progress_attempt: hasInProgressAttempt,
    has_merged_attempt: hasMergedAttempt,
    last_attempt_failed: lastAttemptFailed,
    base_coding_agent: baseCodingAgent,
  };
}

/**
 * Convert Prisma TaskAttempt to API TaskAttempt
 */
export function mapPrismaTaskAttemptToApi(prismaAttempt: PrismaTaskAttempt): TaskAttempt {
  return {
    id: prismaAttempt.id,
    task_id: prismaAttempt.taskId,
    container_ref: undefined, // Not in our schema yet
    branch: prismaAttempt.branchName,
    base_branch: 'main', // Default, should be configurable
    merge_commit: prismaAttempt.mergeCommit || undefined,
    executor: prismaAttempt.executor,
    base_coding_agent: prismaAttempt.executor, // Keep for backward compatibility
    pr_url: undefined, // Not in our schema yet
    pr_number: undefined, // Not in our schema yet
    pr_status: undefined, // Not in our schema yet
    pr_merged_at: undefined, // Not in our schema yet
    worktree_deleted: false, // Default, should be tracked
    setup_completed_at: undefined, // Not in our schema yet
    created_at: prismaAttempt.createdAt.toISOString(),
    updated_at: prismaAttempt.updatedAt.toISOString(),
  };
}

/**
 * Convert Prisma TaskTemplate to API TaskTemplate
 */
export function mapPrismaTaskTemplateToApi(
  prismaTemplate: PrismaTaskTemplate & { project?: PrismaProject | null }
): TaskTemplate {
  return {
    id: prismaTemplate.id,
    project_id: prismaTemplate.projectId || undefined,
    title: prismaTemplate.title,
    description: prismaTemplate.description || undefined,
    template_name: prismaTemplate.templateName,
    default_prompt: prismaTemplate.defaultPrompt || undefined,
    tags: prismaTemplate.tags ? parseJsonSafely(prismaTemplate.tags, []) : undefined,
    estimated_hours: prismaTemplate.estimatedHours || undefined,
    created_at: prismaTemplate.createdAt.toISOString(),
    updated_at: prismaTemplate.updatedAt.toISOString(),
  };
}

/**
 * Convert Prisma ExecutionProcess to API ExecutionProcess
 */
export function mapPrismaExecutionProcessToApi(
  prismaProcess: PrismaExecutionProcess
): ExecutionProcess {
  // Map process types from our enum to vibe-kanban enum
  const processTypeMap: Record<string, string> = {
    SETUPSCRIPT: 'setupscript',
    CODINGAGENT: 'codingagent',
    DEVSERVER: 'devserver',
    VALIDATION: 'cleanupscript', // Map validation to cleanup for now
    CLEANUP: 'cleanupscript',
  };

  const statusMap: Record<string, string> = {
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    KILLED: 'killed',
  };

  return {
    id: prismaProcess.id,
    task_attempt_id: prismaProcess.taskAttemptId,
    run_reason: (processTypeMap[prismaProcess.processType] ||
      'codingagent') as ExecutionProcessRunReason,
    status: (statusMap[prismaProcess.status] || 'running') as ExecutionProcessStatus,
    exit_code: prismaProcess.exitCode ? BigInt(prismaProcess.exitCode) : undefined,
    started_at: prismaProcess.startedAt?.toISOString() || prismaProcess.createdAt.toISOString(),
    completed_at: prismaProcess.completedAt?.toISOString(),
    created_at: prismaProcess.createdAt.toISOString(),
    updated_at: prismaProcess.updatedAt.toISOString(),
  };
}

/**
 * Convert Prisma AiModel to API AiModel (excluding sensitive data)
 */
export function mapPrismaAiModelToApi(prismaModel: PrismaAiModel): AiModel {
  return {
    id: prismaModel.id,
    name: prismaModel.name,
    description: prismaModel.description || undefined,
    endpoint_url: prismaModel.endpointUrl,
    provider: prismaModel.provider,
    model_id: prismaModel.modelId,
    parameters: prismaModel.parameters ? JSON.parse(prismaModel.parameters) : undefined,
    enabled: prismaModel.enabled,
    created_at: prismaModel.createdAt.toISOString(),
    updated_at: prismaModel.updatedAt.toISOString(),
  };
}

/**
 * Convert Prisma ExecutionMetric to API ExecutionMetric
 */
export function mapPrismaExecutionMetricToApi(
  prismaMetric: PrismaExecutionMetric
): ExecutionMetric {
  return {
    id: prismaMetric.id,
    attempt_id: prismaMetric.attemptId,
    model_used: prismaMetric.modelUsed,
    prompt_tokens: prismaMetric.promptTokens || undefined,
    completion_tokens: prismaMetric.completionTokens || undefined,
    duration_ms: prismaMetric.durationMs || undefined,
    success: prismaMetric.success,
    validation_passed: prismaMetric.validationPassed || undefined,
    cost_estimate: prismaMetric.costEstimate || undefined,
    created_at: prismaMetric.createdAt.toISOString(),
  };
}

/**
 * Parse JSON string safely
 */
export function parseJsonSafely<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;

  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
}
