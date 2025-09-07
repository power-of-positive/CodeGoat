import { ClaudeCodeExecutor, ClaudeExecutorOptions, ClaudeExecutorResult } from './claude-executor';
import { ValidationRunner } from '../../scripts/validate-task';
import { getDatabaseService } from '../services/database';
import { WinstonLogger } from '../logger-winston';
import { PermissionManager } from './permissions';
import { Task, TaskStatus } from '@prisma/client';
import { WorktreeManager } from './worktree-manager';
import { orchestratorStreamManager } from './orchestrator-stream';

export interface OrchestratorOptions {
  worktreeDir?: string;
  claudeCommand: string;
  permissionManager?: PermissionManager;
  maxRetries?: number;
  maxTaskRetries?: number;
  validationSettings?: string;
  enableValidation?: boolean;
  validationTimeout?: number;
  taskFilter?: (task: Task) => boolean;
  enableWorktrees?: boolean;
  continuousMode?: boolean;
  pollInterval?: number;
}

export interface TaskExecutionResult {
  task: Task;
  claudeResults: ClaudeExecutorResult[];
  validationResults: Array<{
    attempt: number;
    success: boolean;
    stages: ValidationStageResult[];
    totalTime: number;
    error?: string;
  }>;
  success: boolean;
  attempts: number;
  totalDuration: number;
  error?: string;
}

export interface ValidationStageResult {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

export interface OrchestratorResult {
  success: boolean;
  completedTasks: TaskExecutionResult[];
  failedTasks: TaskExecutionResult[];
  totalValidationRuns: number;
  totalDuration: number;
  metrics: {
    tasksProcessed: number;
    tasksCompleted: number;
    tasksFailed: number;
    averageAttemptsPerTask: number;
    averageValidationTime: number;
    totalClaudeExecutions: number;
  };
}

/**
 * Claude Task Orchestrator - Coordinates Claude execution with validation and task management
 *
 * This orchestrator implements a validation-driven retry loop:
 * 1. Fetches pending tasks from database or accepts provided prompts
 * 2. Executes Claude Code with prompts
 * 3. Runs comprehensive validation (from database-driven settings)
 * 4. If validation fails, provides error feedback to Claude and retries
 * 5. If validation passes, completes task and moves to next
 *
 * Features:
 * - Database-driven task management (CODEGOAT-XXX format)
 * - Validation pipeline from settings.json and database
 * - Intelligent error feedback and retry logic
 * - Worktree isolation for parallel execution
 * - Comprehensive metrics and logging
 * - Continuous mode for autonomous operation
 */
export class ClaudeTaskOrchestrator {
  private readonly claudeExecutor: ClaudeCodeExecutor;
  private readonly maxRetries: number;
  private readonly maxTaskRetries: number;
  private readonly validationSettings?: string;
  private readonly enableValidation: boolean;
  private readonly validationTimeout: number;
  private readonly taskFilter?: (task: Task) => boolean;
  private readonly enableWorktrees: boolean;
  private readonly continuousMode: boolean;
  private readonly pollInterval: number;
  private readonly logger: WinstonLogger;
  private readonly db = getDatabaseService();

  private worktreeManager?: WorktreeManager;
  private currentWorktreeDir?: string;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  private sessionId: string;

  constructor(options: OrchestratorOptions, logger: WinstonLogger) {
    this.maxRetries = options.maxRetries ?? 3;
    this.maxTaskRetries = options.maxTaskRetries ?? 2;
    this.validationSettings = options.validationSettings;
    this.enableValidation = options.enableValidation ?? true;
    this.validationTimeout = options.validationTimeout ?? 300000; // 5 minutes default
    this.taskFilter = options.taskFilter;
    this.enableWorktrees = options.enableWorktrees ?? false;
    this.continuousMode = options.continuousMode ?? false;
    this.pollInterval = options.pollInterval ?? 5000; // 5 seconds
    this.logger = logger;
    this.sessionId = `orchestrator-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Set up worktree if enabled
    if (this.enableWorktrees) {
      this.worktreeManager = new WorktreeManager(undefined, logger);
      this.currentWorktreeDir = options.worktreeDir ?? process.cwd();
    }

    // Create Claude executor with appropriate working directory
    const executorOptions: ClaudeExecutorOptions = {
      worktreeDir: this.currentWorktreeDir ?? options.worktreeDir ?? process.cwd(),
      claudeCommand: options.claudeCommand,
      permissionManager: options.permissionManager,
    };

    this.claudeExecutor = new ClaudeCodeExecutor(executorOptions, logger);

    this.logger.info('Claude Task Orchestrator initialized', {
      sessionId: this.sessionId,
      maxRetries: this.maxRetries,
      maxTaskRetries: this.maxTaskRetries,
      enableValidation: this.enableValidation,
      enableWorktrees: this.enableWorktrees,
      continuousMode: this.continuousMode,
      validationTimeout: this.validationTimeout,
    });

    // Broadcast initialization
    orchestratorStreamManager.broadcastOrchestratorStart(this.sessionId, {
      maxRetries: this.maxRetries,
      maxTaskRetries: this.maxTaskRetries,
      enableValidation: this.enableValidation,
      enableWorktrees: this.enableWorktrees,
      continuousMode: this.continuousMode,
      validationTimeout: this.validationTimeout,
    });
  }

  /**
   * Start the orchestrator in continuous mode
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Orchestrator is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;

    this.logger.info('Starting Claude Task Orchestrator in continuous mode', {
      sessionId: this.sessionId,
    });
    orchestratorStreamManager.broadcastInfo(
      this.sessionId,
      'Starting orchestrator in continuous mode'
    );

    try {
      while (!this.shouldStop) {
        const result = await this.runSingleCycle();

        if (result.completedTasks.length === 0 && result.failedTasks.length === 0) {
          // No tasks processed, wait before polling again
          this.logger.info(`No tasks available, waiting ${this.pollInterval}ms`);
          await this.sleep(this.pollInterval);
        } else {
          this.logger.info('Cycle completed', {
            completed: result.completedTasks.length,
            failed: result.failedTasks.length,
          });
        }
      }
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }

    this.logger.info('Claude Task Orchestrator stopped');
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Claude Task Orchestrator...');
    this.shouldStop = true;

    // Wait for current cycle to complete
    while (this.isRunning) {
      await this.sleep(100);
    }
  }

  /**
   * Execute a single orchestrator cycle
   */
  async runSingleCycle(): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const completedTasks: TaskExecutionResult[] = [];
    const failedTasks: TaskExecutionResult[] = [];
    let totalValidationRuns = 0;
    let totalClaudeExecutions = 0;

    try {
      // Fetch next pending task
      const task = await this.fetchNextTask();
      if (!task) {
        return this.createEmptyResult(
          startTime,
          completedTasks,
          failedTasks,
          totalValidationRuns,
          totalClaudeExecutions
        );
      }

      this.logger.info('Processing task', {
        taskId: task.id,
        content: task.content?.substring(0, 100),
      });
      orchestratorStreamManager.broadcastTaskStart(
        this.sessionId,
        task.id,
        task.content ?? task.title
      );

      // Execute task with retry logic
      const taskResult = await this.executeTaskWithRetries(task);
      totalValidationRuns += taskResult.validationResults.length;
      totalClaudeExecutions += taskResult.claudeResults.length;

      if (taskResult.success) {
        completedTasks.push(taskResult);
        await this.completeTask(task, taskResult);
        orchestratorStreamManager.broadcastTaskComplete(
          this.sessionId,
          task.id,
          taskResult.attempts,
          taskResult.totalDuration
        );
      } else {
        failedTasks.push(taskResult);
        await this.failTask(task, taskResult);
        orchestratorStreamManager.broadcastTaskFailed(
          this.sessionId,
          task.id,
          taskResult.error ?? 'Unknown error',
          taskResult.attempts
        );
      }
    } catch (error) {
      this.logger.error('Error in orchestrator cycle', error as Error);
    }

    return this.createResult(
      startTime,
      completedTasks,
      failedTasks,
      totalValidationRuns,
      totalClaudeExecutions
    );
  }

  /**
   * Execute a task with validation and retry logic
   */
  private async executeTaskWithRetries(task: Task): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    const claudeResults: ClaudeExecutorResult[] = [];
    const validationResults: Array<{
      attempt: number;
      success: boolean;
      stages: ValidationStageResult[];
      totalTime: number;
      error?: string;
    }> = [];

    let attempts = 0;
    let lastError: string | undefined;
    let prompt = this.createInitialPrompt(task);

    // Update task status to IN_PROGRESS
    await this.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS);

    while (attempts < this.maxTaskRetries) {
      attempts++;

      this.logger.info(`Task execution attempt ${attempts}/${this.maxTaskRetries}`, {
        taskId: task.id,
        promptLength: prompt.length,
      });

      try {
        // Update Claude executor with streaming info
        const executorWithStreaming = new ClaudeCodeExecutor(
          {
            worktreeDir: this.claudeExecutor.getWorktreeDir(),
            claudeCommand: this.claudeExecutor.getClaudeCommand(),
            permissionManager: this.claudeExecutor.getPermissionManager(),
            streamSessionId: this.sessionId,
            streamTaskId: task.id,
          },
          this.logger
        );

        // Broadcast Claude start
        orchestratorStreamManager.broadcastClaudeStart(this.sessionId, task.id, attempts, prompt);

        // Execute Claude Code
        const startExecTime = Date.now();
        const claudeResult = await executorWithStreaming.spawn(prompt);
        const execDuration = Date.now() - startExecTime;
        claudeResults.push(claudeResult);

        // Broadcast Claude complete
        orchestratorStreamManager.broadcastClaudeComplete(
          this.sessionId,
          task.id,
          claudeResult.exitCode,
          execDuration
        );

        this.logger.info('Claude execution completed', {
          taskId: task.id,
          attempt: attempts,
          exitCode: claudeResult.exitCode,
          stdoutLength: claudeResult.stdout.length,
          stderrLength: claudeResult.stderr.length,
        });

        // Run validation if enabled
        if (this.enableValidation) {
          const validationResult = await this.runValidation(task, attempts);
          validationResults.push(validationResult);

          if (validationResult.success) {
            // Validation passed - task completed successfully
            return {
              task,
              claudeResults,
              validationResults,
              success: true,
              attempts,
              totalDuration: Date.now() - startTime,
            };
          } else {
            // Validation failed - prepare error feedback for next attempt
            lastError = validationResult.error ?? 'Validation failed';
            prompt = this.createErrorFeedbackPrompt(task, validationResult, claudeResult);

            this.logger.warn('Validation failed, preparing retry', {
              taskId: task.id,
              attempt: attempts,
              error: lastError,
            });
          }
        } else {
          // No validation - consider Claude execution success as task success
          if (claudeResult.exitCode === 0) {
            return {
              task,
              claudeResults,
              validationResults,
              success: true,
              attempts,
              totalDuration: Date.now() - startTime,
            };
          } else {
            lastError = `Claude execution failed with exit code ${claudeResult.exitCode}`;
            prompt = this.createClaudeErrorFeedbackPrompt(task, claudeResult);
          }
        }
      } catch (error) {
        this.logger.error('Error executing task', error as Error, {
          taskId: task.id,
          attempt: attempts,
        });
        lastError = (error as Error).message;
        prompt = this.createGenericErrorPrompt(task, lastError);
      }

      // Wait before retry if not last attempt
      if (attempts < this.maxTaskRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000); // Exponential backoff, max 10s
        this.logger.info(`Waiting ${delay}ms before retry`, { taskId: task.id });
        await this.sleep(delay);
      }
    }

    // All attempts failed
    return {
      task,
      claudeResults,
      validationResults,
      success: false,
      attempts,
      totalDuration: Date.now() - startTime,
      error: lastError ?? 'Maximum retry attempts exceeded',
    };
  }

  /**
   * Run validation pipeline for a task
   */
  private async runValidation(
    task: Task,
    attempt: number
  ): Promise<{
    attempt: number;
    success: boolean;
    stages: ValidationStageResult[];
    totalTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info('Running validation pipeline', { taskId: task.id, attempt });
      orchestratorStreamManager.broadcastValidationStart(this.sessionId, task.id, attempt);

      const sessionId = `orchestrator-${task.id}-${attempt}-${Date.now()}`;
      const runner = new ValidationRunner({
        sessionId,
        settingsPath: this.validationSettings,
      });

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Validation timed out after ${this.validationTimeout}ms`)),
          this.validationTimeout
        );
      });

      // Run validation with timeout
      const validationPromise = runner.runValidation();
      const success = await Promise.race([validationPromise, timeoutPromise]);

      // Get results
      const results = runner.getResults();
      await runner.cleanup();

      const totalTime = Date.now() - startTime;

      this.logger.info('Validation completed', {
        taskId: task.id,
        attempt,
        success,
        totalTime,
        stages: results.stages?.length ?? 0,
      });

      // Broadcast validation completion
      orchestratorStreamManager.broadcastValidationComplete(
        this.sessionId,
        task.id,
        success,
        results.stages?.length ?? 0,
        results.passed ?? 0,
        results.failed ?? 0,
        totalTime
      );

      return {
        attempt,
        success,
        stages: results.stages ?? [],
        totalTime,
        error: success ? undefined : 'Some validation stages failed',
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      this.logger.error('Validation pipeline failed', error as Error, {
        taskId: task.id,
        attempt,
        totalTime,
      });

      return {
        attempt,
        success: false,
        stages: [],
        totalTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Create initial prompt for a task
   */
  private createInitialPrompt(task: Task): string {
    const content = task.content ?? task.title;
    return `Please help me complete the following task:

Task: ${content}

Please work on this task and make all necessary changes to complete it successfully. Ensure all your changes pass validation checks including linting, type checking, and tests.`;
  }

  /**
   * Create error feedback prompt for failed validation
   */
  private createErrorFeedbackPrompt(
    task: Task,
    validationResult: { stages: ValidationStageResult[]; error?: string },
    claudeResult: ClaudeExecutorResult
  ): string {
    const failedStages = validationResult.stages.filter(stage => !stage.success);
    const errorSummary = failedStages
      .map(stage => `- ${stage.name}: ${stage.error ?? 'Failed'}`)
      .join('\n');

    return `The previous attempt to complete this task failed validation. Here are the issues that need to be fixed:

Task: ${task.content ?? task.title}

Validation Failures:
${errorSummary}

Previous Claude Output (last 1000 chars):
${claudeResult.stdout.slice(-1000)}

Please fix these validation issues and complete the task. Focus specifically on addressing each failed validation stage.`;
  }

  /**
   * Create error feedback prompt for Claude execution failure
   */
  private createClaudeErrorFeedbackPrompt(task: Task, claudeResult: ClaudeExecutorResult): string {
    return `The previous attempt to complete this task had execution issues. Here's what happened:

Task: ${task.content ?? task.title}

Exit Code: ${claudeResult.exitCode}

Error Output:
${claudeResult.stderr.slice(-1000)}

Standard Output (last 1000 chars):
${claudeResult.stdout.slice(-1000)}

Please address these issues and complete the task successfully.`;
  }

  /**
   * Create generic error prompt
   */
  private createGenericErrorPrompt(task: Task, error: string): string {
    return `There was an error while attempting to complete this task:

Task: ${task.content ?? task.title}

Error: ${error}

Please try a different approach to complete this task.`;
  }

  /**
   * Fetch next pending task from database
   */
  private async fetchNextTask(): Promise<Task | null> {
    try {
      const tasks = await this.db.task.findMany({
        where: {
          status: TaskStatus.PENDING,
          OR: [{ projectId: null }, { id: { startsWith: 'CODEGOAT-' } }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 1,
      });

      if (tasks.length === 0) {
        return null;
      }

      const task = tasks[0];

      // Apply filter if provided
      if (this.taskFilter && !this.taskFilter(task)) {
        this.logger.info('Task filtered out', { taskId: task.id });
        return null;
      }

      return task;
    } catch (error) {
      this.logger.error('Error fetching next task', error as Error);
      return null;
    }
  }

  /**
   * Update task status in database
   */
  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    try {
      const updateData: Record<string, unknown> = { status };

      if (status === TaskStatus.IN_PROGRESS) {
        updateData.startTime = new Date();
      } else if (status === TaskStatus.COMPLETED) {
        updateData.endTime = new Date();
      }

      await this.db.task.update({
        where: { id: taskId },
        data: updateData,
      });

      this.logger.info('Task status updated', { taskId, status });
    } catch (error) {
      this.logger.error('Error updating task status', error as Error, { taskId, status });
    }
  }

  /**
   * Complete a task successfully
   */
  private async completeTask(task: Task, result: TaskExecutionResult): Promise<void> {
    try {
      const endTime = new Date();
      const startTime = task.startTime ?? endTime;
      const duration = this.calculateDuration(startTime, endTime);

      await this.db.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.COMPLETED,
          endTime,
          duration,
        },
      });

      // Store validation metrics if available
      for (const validationResult of result.validationResults) {
        if (validationResult.stages.length > 0) {
          await this.db.validationRun.create({
            data: {
              taskId: task.id,
              sessionId: `orchestrator-${task.id}-${validationResult.attempt}`,
              success: validationResult.success,
              totalStages: validationResult.stages.length,
              passedStages: validationResult.stages.filter(s => s.success).length,
              failedStages: validationResult.stages.filter(s => !s.success).length,
              totalTime: validationResult.totalTime,
            },
          });
        }
      }

      this.logger.info('Task completed successfully', {
        taskId: task.id,
        attempts: result.attempts,
        totalDuration: result.totalDuration,
        validationRuns: result.validationResults.length,
      });
    } catch (error) {
      this.logger.error('Error completing task', error as Error, { taskId: task.id });
    }
  }

  /**
   * Mark a task as failed
   */
  private async failTask(task: Task, result: TaskExecutionResult): Promise<void> {
    try {
      await this.db.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.PENDING, // Reset to pending so it can be retried later
          endTime: new Date(),
        },
      });

      this.logger.warn('Task failed after all attempts', {
        taskId: task.id,
        attempts: result.attempts,
        errorMessage: result.error,
        totalDuration: result.totalDuration,
      });
    } catch (error) {
      this.logger.error('Error failing task', error as Error, { taskId: task.id });
    }
  }

  /**
   * Calculate duration string from start and end times
   */
  private calculateDuration(startTime: Date, endTime: Date): string {
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Create empty result object
   */
  private createEmptyResult(
    startTime: number,
    completedTasks: TaskExecutionResult[],
    failedTasks: TaskExecutionResult[],
    totalValidationRuns: number,
    totalClaudeExecutions: number
  ): OrchestratorResult {
    return this.createResult(
      startTime,
      completedTasks,
      failedTasks,
      totalValidationRuns,
      totalClaudeExecutions
    );
  }

  /**
   * Create result object
   */
  private createResult(
    startTime: number,
    completedTasks: TaskExecutionResult[],
    failedTasks: TaskExecutionResult[],
    totalValidationRuns: number,
    totalClaudeExecutions: number
  ): OrchestratorResult {
    const totalDuration = Date.now() - startTime;
    const tasksProcessed = completedTasks.length + failedTasks.length;
    const averageAttemptsPerTask =
      tasksProcessed > 0
        ? (completedTasks.reduce((sum, t) => sum + t.attempts, 0) +
            failedTasks.reduce((sum, t) => sum + t.attempts, 0)) /
          tasksProcessed
        : 0;
    const averageValidationTime =
      totalValidationRuns > 0
        ? (completedTasks.reduce(
            (sum, t) => sum + t.validationResults.reduce((vSum, v) => vSum + v.totalTime, 0),
            0
          ) +
            failedTasks.reduce(
              (sum, t) => sum + t.validationResults.reduce((vSum, v) => vSum + v.totalTime, 0),
              0
            )) /
          totalValidationRuns
        : 0;

    return {
      success: failedTasks.length === 0,
      completedTasks,
      failedTasks,
      totalValidationRuns,
      totalDuration,
      metrics: {
        tasksProcessed,
        tasksCompleted: completedTasks.length,
        tasksFailed: failedTasks.length,
        averageAttemptsPerTask: Math.round(averageAttemptsPerTask * 100) / 100,
        averageValidationTime: Math.round(averageValidationTime),
        totalClaudeExecutions,
      },
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.worktreeManager && this.currentWorktreeDir) {
        await this.worktreeManager.cleanupWorktrees();
      }
      await this.db.$disconnect();
    } catch (error) {
      this.logger.error('Error during cleanup', error as Error);
    }
  }

  /**
   * Get current execution status
   */
  getStatus(): {
    isRunning: boolean;
    shouldStop: boolean;
    enableValidation: boolean;
    maxRetries: number;
    maxTaskRetries: number;
    sessionId: string;
  } {
    return {
      isRunning: this.isRunning,
      shouldStop: this.shouldStop,
      enableValidation: this.enableValidation,
      maxRetries: this.maxRetries,
      maxTaskRetries: this.maxTaskRetries,
      sessionId: this.sessionId,
    };
  }

  /**
   * Get the session ID for this orchestrator
   */
  getSessionId(): string {
    return this.sessionId;
  }
}
