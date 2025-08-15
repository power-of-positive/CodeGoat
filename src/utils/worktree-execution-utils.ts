/**
 * Worktree execution utilities
 * Extracted from kanban-tasks.ts to reduce complexity
 */

import { PrismaClient } from '@prisma/client';
import { ILogger } from '../logger-interface';
import { WorktreeExecutionService } from '../services/worktree-execution.service';

/**
 * Start worktree execution for a task when it's set to "in progress"
 */
export async function startWorktreeExecution(
  prisma: PrismaClient,
  logger: ILogger,
  worktreeService: WorktreeExecutionService,
  taskId: string
): Promise<void> {
  try {
    const executionContext = await prepareWorktreeExecution(prisma, logger, taskId);
    if (!executionContext) {
      return;
    }

    const { task, taskAttempt } = executionContext;
    
    logger.info('Starting worktree execution', {
      taskId,
      attemptId: taskAttempt.id,
      projectPath: task.project.gitRepoPath,
    });

    const worktreeConfig = createWorktreeConfig(task, taskAttempt);
    const executionOptions = createExecutionOptions();

    // Start worktree execution asynchronously (fire and forget)
    executeWorktreeAsync(worktreeService, worktreeConfig, executionOptions, { logger, taskId, attemptId: taskAttempt.id });

  } catch (error) {
    logger.error('Failed to start worktree execution', error as Error, { taskId });
  }
}

/**
 * Prepare worktree execution context
 */
async function prepareWorktreeExecution(
  prisma: PrismaClient,
  logger: ILogger,
  taskId: string
): Promise<{ task: any; taskAttempt: any } | null> {
  // Get task with project information
  const task = await getTaskWithProject(prisma, taskId);
  if (!task || !task.project) {
    logger.error('Task or project not found for worktree execution', new Error('Task or project not found'), { taskId });
    return null;
  }

  // Check if there's already an active attempt
  if (hasActiveAttempt(task)) {
    logger.info('Task already has running attempt, skipping worktree execution', {
      taskId,
      attemptId: task.attempts[0].id,
    });
    return null;
  }

  // Create new task attempt if needed
  const taskAttempt = await ensureTaskAttempt(prisma, task, logger);
  if (!taskAttempt) {
    logger.error('Failed to create or get task attempt for worktree execution', new Error('Task attempt creation failed'), { taskId });
    return null;
  }

  return { task, taskAttempt };
}

/**
 * Get task with project and attempts information
 */
async function getTaskWithProject(prisma: PrismaClient, taskId: string): Promise<any> {
  return await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      attempts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

/**
 * Check if task has an active attempt
 */
function hasActiveAttempt(task: any): boolean {
  return task.attempts.length > 0 && task.attempts[0].status === 'RUNNING';
}

/**
 * Ensure task has a valid attempt, creating one if necessary
 */
async function ensureTaskAttempt(prisma: PrismaClient, task: any, logger: ILogger): Promise<any> {
  let taskAttempt = task.attempts[0];
  
  if (!taskAttempt || taskAttempt.status === 'COMPLETED' || taskAttempt.status === 'FAILED') {
    const branchName = `task-${task.id}-${Date.now()}`;
    const worktreePath = `./worktrees/${branchName}`;

    taskAttempt = await prisma.taskAttempt.create({
      data: {
        taskId: task.id,
        branchName,
        worktreePath,
        executor: 'CLAUDE_CODE',
        status: 'CREATED',
      },
    });

    logger.info('Created new task attempt for worktree execution', {
      taskId: task.id,
      attemptId: taskAttempt.id,
      branchName,
    });
  }

  return taskAttempt;
}

/**
 * Create worktree configuration object
 */
function createWorktreeConfig(task: any, taskAttempt: any): any {
  return {
    projectPath: task.project.gitRepoPath,
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.description || undefined,
    branchName: taskAttempt.branchName,
    worktreePath: taskAttempt.worktreePath,
    baseBranch: 'main',
    claudeProfile: 'default',
  };
}

/**
 * Create execution options object
 */
function createExecutionOptions(): any {
  return {
    timeout: 30 * 60 * 1000, // 30 minutes
    autoCommit: true,
    continueOnError: false,
  };
}

/**
 * Execute worktree asynchronously with proper error handling
 */
function executeWorktreeAsync(
  worktreeService: WorktreeExecutionService,
  worktreeConfig: any,
  executionOptions: any,
  context: { logger: ILogger; taskId: string; attemptId: string }
): void {
  const { logger, taskId, attemptId } = context;
  
  worktreeService.executeInWorktree(worktreeConfig, executionOptions)
    .then(result => {
      logger.info('Worktree execution completed', {
        taskId,
        attemptId,
        success: result.success,
        duration: result.duration,
        commitHash: result.commitHash,
      });
    })
    .catch(error => {
      logger.error('Worktree execution failed', error, {
        taskId,
        attemptId,
      });
    });
}