import { Router, Request, Response } from 'express';
import { 
  ApiResponse, 
  TaskAttempt, 
  CreateTaskAttempt,
  BranchStatus,
  WorktreeDiff,
  CreateFollowUpAttempt
} from '../types/kanban.types';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';
import { mapPrismaTaskAttemptToApi } from '../utils/kanban-mappers';
import { z } from 'zod';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Validation schemas
const CreateTaskAttemptSchema = z.object({
  executor: z.string().min(1, 'Executor is required'),
  base_branch: z.string().default('main').optional(),
});

const CreateFollowUpAttemptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

const TaskAttemptQuerySchema = z.object({
  task_id: z.string().uuid('Invalid task ID format'),
});

/**
 * Create task attempts API routes for Kanban system
 */
export function createKanbanTaskAttemptsRoutes(
  kanbanDb: KanbanDatabaseService,
  logger: ILogger
): Router {
  const router = Router();
  const prisma = kanbanDb.getClient();

  /**
   * GET /projects/:project_id/tasks/:task_id/attempts - Get attempts for task
   */
  router.get('/projects/:project_id/tasks/:task_id/attempts', async (req: Request, res: Response) => {
    try {
      const { project_id, task_id } = req.params;
      
      // Validate IDs are valid UUIDs
      const projectIdValidation = z.string().uuid().safeParse(project_id);
      const taskIdValidation = z.string().uuid().safeParse(task_id);
      
      if (!projectIdValidation.success || !taskIdValidation.success) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Invalid project or task ID format',
        };
        
        return res.status(400).json(response);
      }

      // Verify task exists
      const task = await prisma.task.findUnique({
        where: { id: task_id },
      });

      if (!task) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Task not found',
        };
        
        return res.status(404).json(response);
      }

      // Get task attempts
      const attempts = await prisma.taskAttempt.findMany({
        where: { taskId: task_id },
        orderBy: { createdAt: 'desc' },
      });

      const apiAttempts = attempts.map(attempt => mapPrismaTaskAttemptToApi(attempt));

      const response = {
        success: true,
        data: apiAttempts,
        error_data: null,
        message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to get task attempts', error as Error);
      
      const response: ApiResponse<TaskAttempt[]> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to retrieve task attempts',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * POST /projects/:project_id/tasks/:task_id/attempts - Create new attempt
   */
  router.post('/projects/:project_id/tasks/:task_id/attempts', async (req: Request, res: Response) => {
    try {
      const { project_id, task_id } = req.params;
      
      // Validate IDs are valid UUIDs
      const projectIdValidation = z.string().uuid().safeParse(project_id);
      const taskIdValidation = z.string().uuid().safeParse(task_id);
      
      if (!projectIdValidation.success || !taskIdValidation.success) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Invalid project or task ID format',
        };
        
        return res.status(400).json(response);
      }
      
      const validation = CreateTaskAttemptSchema.safeParse(req.body);
      
      if (!validation.success) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`,
        };
        
        return res.status(400).json(response);
      }

      const attemptData = validation.data;

      // Verify task exists and get project info
      const task = await prisma.task.findUnique({
        where: { id: task_id },
        include: { project: true },
      });

      if (!task) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Task not found',
        };
        
        return res.status(404).json(response);
      }

      // Generate branch name and worktree path
      const timestamp = Date.now();
      const branchName = `task-${task.id}-attempt-${timestamp}`;
      const worktreePath = path.join(process.cwd(), 'worktrees', branchName);

      // Create worktree (placeholder for now - actual git integration would be here)
      try {
        await createWorktree(task.project.gitRepoPath, branchName, worktreePath, attemptData.base_branch);
      } catch (error) {
        logger?.warn?.('Failed to create git worktree, proceeding without it', { error: error as Error });
      }

      // Create task attempt in database
      const newAttempt = await prisma.taskAttempt.create({
        data: {
          taskId: task_id,
          branchName,
          worktreePath,
          executor: attemptData.executor,
          status: 'CREATED',
        },
      });

      const apiAttempt = mapPrismaTaskAttemptToApi(newAttempt);

      const response = {
        success: true,
        data: apiAttempt,
        error_data: null,
        message: 'Task attempt created successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to create task attempt', error as Error);
      
      const response: ApiResponse<TaskAttempt> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to create task attempt',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * GET /task-attempts/:id - Get specific attempt
   */
  router.get('/task-attempts/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const attempt = await prisma.taskAttempt.findUnique({
        where: { id },
      });

      if (!attempt) {
        const response: ApiResponse<TaskAttempt> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Task attempt not found',
        };
        
        return res.status(200).json(response);
      }

      const apiAttempt = mapPrismaTaskAttemptToApi(attempt);

      const response: ApiResponse<TaskAttempt> = {
        success: true,
        data: apiAttempt,
        error_data: null,
                message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to get task attempt', error as Error);
      
      const response: ApiResponse<TaskAttempt> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to retrieve task attempt',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * POST /task-attempts/:id/follow-up - Create follow-up execution
   */
  router.post('/task-attempts/:id/follow-up', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const validation = CreateFollowUpAttemptSchema.safeParse(req.body);
      
      if (!validation.success) {
        const response: ApiResponse<TaskAttempt> = {
          success: false,
          data: null,
          error_data: null,
                    message: `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`,
        };
        
        return res.status(200).json(response);
      }

      const { prompt } = validation.data;

      // Check if attempt exists
      const attempt = await prisma.taskAttempt.findUnique({
        where: { id },
      });

      if (!attempt) {
        const response: ApiResponse<TaskAttempt> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Task attempt not found',
        };
        
        return res.status(200).json(response);
      }

      // Create execution process for follow-up
      await prisma.executionProcess.create({
        data: {
          taskAttemptId: id,
          processType: 'CODINGAGENT',
          status: 'RUNNING',
          command: 'follow-up',
          args: JSON.stringify({ prompt }),
          workingDirectory: attempt.worktreePath,
        },
      });

      // Update attempt status
      const updatedAttempt = await prisma.taskAttempt.update({
        where: { id },
        data: { status: 'RUNNING' },
      });

      const apiAttempt = mapPrismaTaskAttemptToApi(updatedAttempt);

      const response: ApiResponse<TaskAttempt> = {
        success: true,
        data: apiAttempt,
        error_data: null,
                message: 'Follow-up execution started',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to create follow-up execution', error as Error);
      
      const response: ApiResponse<TaskAttempt> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to create follow-up execution',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * GET /task-attempts/:id/branch-status - Get git branch status
   */
  router.get('/task-attempts/:id/branch-status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const attempt = await prisma.taskAttempt.findUnique({
        where: { id },
        include: {
          task: {
            include: { project: true },
          },
        },
      });

      if (!attempt) {
        const response: ApiResponse<BranchStatus> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Task attempt not found',
        };
        
        return res.status(200).json(response);
      }

      // Get branch status from git
      const branchStatus = await getBranchStatus(
        attempt.task.project.gitRepoPath,
        attempt.branchName,
        'main' // TODO: Get actual base branch
      );

      const response: ApiResponse<BranchStatus> = {
        success: true,
        data: branchStatus,
        error_data: null,
                message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to get branch status', error as Error);
      
      const response: ApiResponse<BranchStatus> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to get branch status',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * GET /task-attempts/:id/diff - Stream diff changes (SSE)
   */
  router.get('/task-attempts/:id/diff', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const attempt = await prisma.taskAttempt.findUnique({
        where: { id },
        include: {
          task: {
            include: { project: true },
          },
        },
      });

      if (!attempt) {
        res.status(404).json({
          success: false,
          data: null,
          error_data: null,
                    message: 'Task attempt not found',
        });
        return;
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Send initial diff
      try {
        const diff = await getWorktreeDiff(attempt.task.project.gitRepoPath, attempt.branchName);
        res.write(`data: ${JSON.stringify(diff)}\n\n`);
      } catch (error) {
        logger?.warn?.('Failed to get initial diff', { error: error as Error });
        res.write(`data: ${JSON.stringify({ files: [] })}\n\n`);
      }

      // Keep connection alive and periodically send updates
      const interval = setInterval(async () => {
        try {
          const diff = await getWorktreeDiff(attempt.task.project.gitRepoPath, attempt.branchName);
          res.write(`data: ${JSON.stringify(diff)}\n\n`);
        } catch (error) {
          logger?.debug?.('Failed to get diff update', { error: error as Error });
        }
      }, 5000); // Update every 5 seconds

      // Clean up on connection close
      req.on('close', () => {
        clearInterval(interval);
      });
    } catch (error) {
      logger.error('Failed to start diff stream', error as Error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          data: null,
          error_data: null,
                    message: 'Failed to start diff stream',
        });
      }
    }
  });

  /**
   * POST /task-attempts/:id/stop - Stop all executions
   */
  router.post('/task-attempts/:id/stop', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if attempt exists
      const attempt = await prisma.taskAttempt.findUnique({
        where: { id },
      });

      if (!attempt) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Task attempt not found',
        };
        
        return res.status(200).json(response);
      }

      // Update all running processes to killed
      await prisma.executionProcess.updateMany({
        where: {
          taskAttemptId: id,
          status: 'RUNNING',
        },
        data: {
          status: 'KILLED',
          completedAt: new Date(),
        },
      });

      // Update attempt status
      await prisma.taskAttempt.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        error_data: null,
                message: 'All executions stopped successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to stop executions', error as Error);
      
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to stop executions',
      };
      
      res.status(200).json(response);
    }
  });

  return router;
}

/**
 * Create git worktree for isolated development
 */
async function createWorktree(
  repoPath: string,
  branchName: string,
  worktreePath: string,
  baseBranch: string = 'main'
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure worktrees directory exists
    const worktreesDir = path.dirname(worktreePath);
    if (!fs.existsSync(worktreesDir)) {
      fs.mkdirSync(worktreesDir, { recursive: true });
    }

    // Create worktree with new branch
    const git = spawn('git', [
      'worktree', 'add', '-b', branchName, worktreePath, baseBranch
    ], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let errorOutput = '';

    git.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Git worktree creation failed: ${errorOutput}`));
      }
    });

    git.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get git branch status compared to base branch
 */
async function getBranchStatus(
  repoPath: string,
  branchName: string,
  baseBranch: string
): Promise<BranchStatus> {
  return new Promise((resolve, reject) => {
    // Get commits ahead/behind info
    const git = spawn('git', [
      'rev-list', '--left-right', '--count', `${baseBranch}...${branchName}`
    ], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    git.stdout.on('data', (data) => {
      output += data.toString();
    });

    git.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        const [behind, ahead] = output.trim().split('\t').map(Number);
        
        const status: BranchStatus = {
          is_behind: behind > 0,
          commits_behind: behind || 0,
          commits_ahead: ahead || 0,
          up_to_date: behind === 0 && ahead === 0,
          merged: false, // TODO: Check if branch is merged
          has_uncommitted_changes: false, // TODO: Check working directory status
          base_branch_name: baseBranch,
        };

        resolve(status);
      } else {
        reject(new Error(`Git status command failed: ${errorOutput}`));
      }
    });

    git.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get diff changes for worktree
 */
async function getWorktreeDiff(repoPath: string, branchName: string): Promise<WorktreeDiff> {
  return new Promise((resolve, reject) => {
    const git = spawn('git', ['diff', '--name-only', `origin/main...${branchName}`], {
      cwd: repoPath,
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    git.stdout.on('data', (data) => {
      output += data.toString();
    });

    git.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        const changedFiles = output.trim().split('\n').filter(line => line.trim());
        
        // For now, return simplified diff structure
        // In a full implementation, would get actual diff content
        const files = changedFiles.map(filePath => ({
          path: filePath,
          chunks: [{
            chunk_type: 'Insert' as const,
            content: `Modified: ${filePath}`,
          }],
        }));

        resolve({ files });
      } else {
        // Return empty diff on error rather than rejecting
        resolve({ files: [] });
      }
    });

    git.on('error', () => {
      resolve({ files: [] });
    });
  });
}