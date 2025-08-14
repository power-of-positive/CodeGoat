/**
 * WorktreeExecutionService - Manages Git worktrees and Claude Code execution
 * 
 * This service handles:
 * - Creating isolated Git worktrees for tasks
 * - Executing Claude Code within worktrees
 * - Managing execution lifecycle (start, monitor, complete)
 * - Cleanup of worktrees and processes
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from './kanban-database.service';
import { runGitCommand, isGitRepository, cleanupWorktree, buildClaudeArgs } from './worktree-execution.helpers';

export interface WorktreeConfig {
  projectPath: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  claudeProfile?: string;
}

export interface ExecutionOptions {
  timeout?: number; // in milliseconds, default 30 minutes
  autoCommit?: boolean; // automatically commit changes, default true
  continueOnError?: boolean; // continue execution on non-fatal errors, default false
}

export interface ExecutionResult {
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration: number;
  commitHash?: string;
  error?: string;
}

export class WorktreeExecutionService {
  private activeExecutions = new Map<string, ChildProcess>();
  private worktreeCleanupQueue = new Set<string>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private logger: ILogger,
    private kanbanDb: KanbanDatabaseService,
    private cleanupIntervalMs: number = 5 * 60 * 1000 // 5 minutes
  ) {
    // Start periodic cleanup of orphaned worktrees
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(err => 
        this.logger.error('Worktree cleanup failed', err)
      );
    }, this.cleanupIntervalMs);
  }

  /**
   * Create a Git worktree and execute Claude Code within it
   */
  async executeInWorktree(
    config: WorktreeConfig,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting worktree execution', {
        taskId: config.taskId,
        branchName: config.branchName,
        projectPath: config.projectPath
      });

      // Create worktree
      await this.createWorktree(config);

      // Update task attempt status
      await this.updateTaskAttemptStatus(config.taskId, 'RUNNING');

      // Execute Claude Code
      const result = await this.executeClaudeCode(config, options);

      // Handle successful execution
      if (result.success && options.autoCommit !== false) {
        const commitHash = await this.commitChanges(config);
        result.commitHash = commitHash;
      }

      // Update completion status
      const finalStatus = result.success ? 'COMPLETED' : 'FAILED';
      await this.updateTaskAttemptStatus(config.taskId, finalStatus, result);

      this.logger.info('Worktree execution completed', {
        taskId: config.taskId,
        success: result.success,
        duration: result.duration
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Worktree execution failed', error as Error, {
        taskId: config.taskId,
        branchName: config.branchName,
        duration
      });

      // Update failed status
      await this.updateTaskAttemptStatus(config.taskId, 'FAILED', {
        success: false,
        error: errorMessage,
        duration
      });

      return {
        success: false,
        error: errorMessage,
        duration
      };
    } finally {
      // Schedule worktree cleanup
      this.scheduleWorktreeCleanup(config.worktreePath);
    }
  }

  /**
   * Create Git worktree for isolated development
   */
  private async createWorktree(config: WorktreeConfig): Promise<void> {
    const { projectPath, branchName, worktreePath, baseBranch } = config;
    
    const worktreesDir = path.dirname(worktreePath);
    await fs.mkdir(worktreesDir, { recursive: true });

    if (!await isGitRepository(projectPath)) {
      throw new Error(`Project path is not a valid git repository: ${projectPath}`);
    }

    await runGitCommand(projectPath, [
      'worktree', 'add', '-b', branchName, worktreePath, baseBranch
    ]);

    this.logger.info('Git worktree created', { branchName, worktreePath, baseBranch });
  }

  /**
   * Execute Claude Code within the worktree
   */
  private executeClaudeCode(
    config: WorktreeConfig,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { taskId, worktreePath } = config;
    const timeout = options.timeout || 30 * 60 * 1000;

    return new Promise((resolve) => {
      const claudeArgs = buildClaudeArgs(config);
      this.logger.info('Starting Claude Code execution', { taskId, worktreePath });

      const claudeProcess = this.spawnClaudeProcess(claudeArgs, worktreePath);
      this.activeExecutions.set(taskId, claudeProcess);

      const { stdout, stderr } = this.setupProcessLogging(claudeProcess, taskId);
      const timeoutHandle = this.setupTimeout(claudeProcess, taskId, timeout);

      this.setupProcessHandlers(claudeProcess, timeoutHandle, taskId, startTime, stdout, stderr, resolve);
    });
  }

  private spawnClaudeProcess(claudeArgs: string[], worktreePath: string): ChildProcess {
    return spawn('claude-code', claudeArgs, {
      cwd: worktreePath,
      stdio: 'pipe',
      env: { ...process.env, PWD: worktreePath }
    });
  }

  private setupProcessLogging(process: ChildProcess, taskId: string): { stdout: () => string; stderr: () => string } {
    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      this.logger.debug?.('Claude Code stdout', { taskId, output: output.trim() });
    });

    process.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      this.logger.debug?.('Claude Code stderr', { taskId, output: output.trim() });
    });

    return { stdout: () => stdout, stderr: () => stderr };
  }

  private setupTimeout(process: ChildProcess, taskId: string, timeout: number): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      this.logger.warn?.('Claude Code execution timeout', { taskId, timeout });
      process.kill('SIGTERM');
      setTimeout(() => process.kill('SIGKILL'), 5000);
    }, timeout);
  }

  private setupProcessHandlers(
    process: ChildProcess,
    timeoutHandle: ReturnType<typeof setTimeout>,
    taskId: string,
    startTime: number,
    stdout: () => string,
    stderr: () => string,
    resolve: (result: ExecutionResult) => void
  ): void {
    process.on('close', (code) => {
      clearTimeout(timeoutHandle);
      this.activeExecutions.delete(taskId);
      const duration = Date.now() - startTime;

      resolve({
        success: code === 0,
        exitCode: code ?? undefined,
        stdout: stdout().trim(),
        stderr: stderr().trim(),
        duration
      });
    });

    process.on('error', (error) => {
      clearTimeout(timeoutHandle);
      this.activeExecutions.delete(taskId);
      const duration = Date.now() - startTime;
      
      resolve({
        success: false,
        error: error.message,
        stderr: stderr().trim(),
        duration
      });
    });
  }

  /**
   * Commit changes made during execution
   */
  private async commitChanges(config: WorktreeConfig): Promise<string> {
    const { worktreePath, taskTitle, branchName } = config;
    
    try {
      const status = await runGitCommand(worktreePath, ['status', '--porcelain']);
      if (!status.trim()) {
        this.logger.info('No changes to commit', { branchName });
        return '';
      }

      await runGitCommand(worktreePath, ['add', '.']);

      const commitMessage = `feat: implement ${taskTitle}\n\nAutomatically generated by CodeGoat task execution.\n\n🤖 Generated with Claude Code\nTask ID: ${config.taskId}\nBranch: ${branchName}`;

      await runGitCommand(worktreePath, ['commit', '-m', commitMessage]);
      const commitHash = await runGitCommand(worktreePath, ['rev-parse', 'HEAD']);
      
      this.logger.info('Changes committed', { branchName, commitHash: commitHash.trim() });
      return commitHash.trim();

    } catch (error) {
      this.logger.warn?.('Failed to commit changes', {
        branchName,
        worktreePath,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Update task attempt status in database
   */
  private async updateTaskAttemptStatus(
    taskId: string, 
    status: string, 
    result?: Partial<ExecutionResult>
  ): Promise<void> {
    try {
      const prisma = this.kanbanDb.getClient();
      
      // Find the task attempt for this task
      const taskAttempt = await prisma.taskAttempt.findFirst({
        where: { taskId },
        orderBy: { createdAt: 'desc' }
      });

      if (!taskAttempt) {
        this.logger.warn?.('No task attempt found for task', { taskId });
        return;
      }

      const updateData: Record<string, unknown> = { status };
      
      if (result) {
        updateData.stdout = result.stdout;
        updateData.stderr = result.stderr;
        
        if (status === 'COMPLETED' || status === 'FAILED') {
          updateData.completedAt = new Date();
        }
      }

      await prisma.taskAttempt.update({
        where: { id: taskAttempt.id },
        data: updateData
      });

      this.logger.debug?.('Task attempt status updated', {
        taskId,
        attemptId: taskAttempt.id,
        status
      });

    } catch (error) {
      this.logger.error('Failed to update task attempt status', error as Error, {
        taskId,
        status
      });
    }
  }


  /**
   * Schedule worktree for cleanup
   */
  private scheduleWorktreeCleanup(worktreePath: string): void {
    this.worktreeCleanupQueue.add(worktreePath);
  }

  /**
   * Perform cleanup of orphaned worktrees
   */
  private async performCleanup(): Promise<void> {
    if (this.worktreeCleanupQueue.size === 0) {
      return;
    }

    this.logger.debug?.('Performing worktree cleanup', {
      queueSize: this.worktreeCleanupQueue.size
    });

    const toClean = Array.from(this.worktreeCleanupQueue);
    this.worktreeCleanupQueue.clear();

    for (const worktreePath of toClean) {
      try {
        await this.cleanupWorktree(worktreePath);
      } catch (error) {
        this.logger.warn?.('Failed to cleanup worktree', {
          worktreePath,
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * Clean up a specific worktree
   */
  private async cleanupWorktree(worktreePath: string): Promise<void> {
    try {
      await cleanupWorktree(worktreePath);
      this.logger.debug?.('Worktree cleaned up successfully', { worktreePath });
    } catch (error) {
      this.logger.warn?.('Worktree cleanup failed', {
        worktreePath,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Stop an active execution
   */
  async stopExecution(taskId: string): Promise<void> {
    const process = this.activeExecutions.get(taskId);
    if (!process) {
      this.logger.warn?.('No active execution found for task', { taskId });
      return;
    }

    this.logger.info('Stopping Claude Code execution', { taskId });
    
    // Graceful shutdown
    process.kill('SIGTERM');
    
    // Force kill after 10 seconds if still running
    setTimeout(() => {
      if (this.activeExecutions.has(taskId)) {
        this.logger.warn?.('Force killing Claude Code execution', { taskId });
        process.kill('SIGKILL');
      }
    }, 10000);

    await this.updateTaskAttemptStatus(taskId, 'CANCELLED');
  }

  /**
   * Get status of active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Cleanup service resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Stop all active executions
    for (const [taskId, process] of this.activeExecutions) {
      this.logger.info('Stopping execution due to service shutdown', { taskId });
      process.kill('SIGTERM');
    }
  }
}