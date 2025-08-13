import { Router, Request, Response } from 'express';
import { TaskAttempt, BranchStatus, CreateTaskAttempt } from '../types/kanban.types';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';
import { WebSocketService } from '../services/websocket.service';
import { mapPrismaTaskAttemptToApi } from '../utils/kanban-mappers';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import {
  CreateTaskAttemptSchema,
  CreateFollowUpAttemptSchema,
  createErrorResponse,
  createSuccessResponse,
  validateUUIDs,
  createWorktree,
  getBranchStatus,
  getWorktreeDiff,
} from './helpers/kanban-task-attempts.helpers';

/**
 * Create task attempts API routes for Kanban system
 */
export function createKanbanTaskAttemptsRoutes(
  kanbanDb: KanbanDatabaseService,
  logger: ILogger,
  _webSocketService: WebSocketService
): Router {
  const router = Router();
  const prisma = kanbanDb.getClient();

  // GET /projects/:project_id/tasks/:task_id/attempts - Get attempts for task
  router.get(
    '/projects/:project_id/tasks/:task_id/attempts',
    getTaskAttemptsHandler(prisma, logger)
  );

  // POST /projects/:project_id/tasks/:task_id/attempts - Create new attempt
  router.post(
    '/projects/:project_id/tasks/:task_id/attempts',
    createTaskAttemptHandler(prisma, logger)
  );

  // GET /task-attempts/:id - Get specific attempt
  router.get('/task-attempts/:id', getSpecificAttemptHandler(prisma, logger));

  // POST /task-attempts/:id/follow-up - Create follow-up execution
  router.post('/task-attempts/:id/follow-up', createFollowUpHandler(prisma, logger));

  // GET /task-attempts/:id/branch-status - Get git branch status
  router.get('/task-attempts/:id/branch-status', getBranchStatusHandler(prisma, logger));

  // GET /task-attempts/:id/diff - Stream diff changes (SSE)
  router.get('/task-attempts/:id/diff', getDiffStreamHandler(prisma, logger));

  // POST /task-attempts/:id/stop - Stop all executions
  router.post('/task-attempts/:id/stop', stopExecutionsHandler(prisma, logger));

  return router;
}

// Handler functions broken into smaller pieces
function getTaskAttemptsHandler(prisma: PrismaClient, logger: ILogger) {
  return async (req: Request, res: Response) => {
    try {
      const { project_id, task_id } = req.params;

      const validation = validateUUIDs(project_id, task_id);
      if (!validation.valid) {
        return res.status(400).json(validation.response);
      }

      // Verify task exists
      const task = await prisma.task.findUnique({
        where: { id: task_id },
      });

      if (!task) {
        return res.status(404).json(createErrorResponse('Task not found'));
      }

      // Get task attempts
      const attempts = await prisma.taskAttempt.findMany({
        where: { taskId: task_id },
        orderBy: { createdAt: 'desc' },
      });

      const apiAttempts = attempts.map(attempt => mapPrismaTaskAttemptToApi(attempt));
      res.status(200).json(createSuccessResponse(apiAttempts));
    } catch (error) {
      logger.error('Failed to get task attempts', error as Error);
      res.status(200).json(createErrorResponse('Failed to retrieve task attempts'));
    }
  };
}

function createTaskAttemptHandler(prisma: PrismaClient, logger: ILogger) {
  return async (req: Request, res: Response) => {
    try {
      const { project_id, task_id } = req.params;

      const validation = validateUUIDs(project_id, task_id);
      if (!validation.valid) {
        return res.status(400).json(validation.response);
      }

      const bodyValidation = CreateTaskAttemptSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const message = `Validation error: ${bodyValidation.error.issues.map(e => e.message).join(', ')}`;
        return res.status(400).json(createErrorResponse(message));
      }

      const attemptData = bodyValidation.data;

      // Verify task exists and get project info
      const task = await prisma.task.findUnique({
        where: { id: task_id },
        include: { project: true },
      });

      if (!task) {
        return res.status(404).json(createErrorResponse('Task not found'));
      }

      const { newAttempt } = await createTaskAttemptInDatabase(
        prisma,
        task_id,
        task,
        attemptData,
        logger
      );

      const apiAttempt = mapPrismaTaskAttemptToApi(newAttempt);
      res.status(200).json(createSuccessResponse(apiAttempt, 'Task attempt created successfully'));
    } catch (error) {
      logger.error('Failed to create task attempt', error as Error);
      res.status(200).json(createErrorResponse('Failed to create task attempt'));
    }
  };
}

function getSpecificAttemptHandler(prisma: PrismaClient, logger: ILogger) {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const attempt = await prisma.taskAttempt.findUnique({
        where: { id },
      });

      if (!attempt) {
        return res.status(200).json(createErrorResponse<TaskAttempt>('Task attempt not found'));
      }

      const apiAttempt = mapPrismaTaskAttemptToApi(attempt);
      res.status(200).json(createSuccessResponse(apiAttempt));
    } catch (error) {
      logger.error('Failed to get task attempt', error as Error);
      res.status(200).json(createErrorResponse<TaskAttempt>('Failed to retrieve task attempt'));
    }
  };
}

function createFollowUpHandler(prisma: PrismaClient, logger: ILogger) {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const validation = CreateFollowUpAttemptSchema.safeParse(req.body);
      if (!validation.success) {
        const message = `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`;
        return res.status(200).json(createErrorResponse<TaskAttempt>(message));
      }

      const { prompt } = validation.data;

      // Check if attempt exists
      const attempt = await prisma.taskAttempt.findUnique({
        where: { id },
      });

      if (!attempt) {
        return res.status(200).json(createErrorResponse<TaskAttempt>('Task attempt not found'));
      }

      const updatedAttempt = await createFollowUpExecution(prisma, id, prompt, attempt);
      const apiAttempt = mapPrismaTaskAttemptToApi(updatedAttempt);
      res.status(200).json(createSuccessResponse(apiAttempt, 'Follow-up execution started'));
    } catch (error) {
      logger.error('Failed to create follow-up execution', error as Error);
      res
        .status(200)
        .json(createErrorResponse<TaskAttempt>('Failed to create follow-up execution'));
    }
  };
}

function getBranchStatusHandler(prisma: PrismaClient, logger: ILogger) {
  return async (req: Request, res: Response) => {
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
        return res.status(200).json(createErrorResponse<BranchStatus>('Task attempt not found'));
      }

      // Get branch status from git
      const branchStatus = await getBranchStatus(
        attempt.task.project.gitRepoPath,
        attempt.branchName,
        'main' // Default to main - could be enhanced to get from project settings
      );

      res.status(200).json(createSuccessResponse(branchStatus));
    } catch (error) {
      logger.error('Failed to get branch status', error as Error);
      res.status(200).json(createErrorResponse<BranchStatus>('Failed to get branch status'));
    }
  };
}

function getDiffStreamHandler(prisma: PrismaClient, logger: ILogger) {
  return async (req: Request, res: Response) => {
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
        res.status(404).json(createErrorResponse('Task attempt not found'));
        return;
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      await streamDiffUpdates(res, attempt, logger);
    } catch (error) {
      logger.error('Failed to start diff stream', error as Error);
      if (!res.headersSent) {
        res.status(500).json(createErrorResponse('Failed to start diff stream'));
      }
    }
  };
}

function stopExecutionsHandler(prisma: PrismaClient, logger: ILogger) {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if attempt exists
      const attempt = await prisma.taskAttempt.findUnique({
        where: { id },
      });

      if (!attempt) {
        return res.status(200).json(createErrorResponse('Task attempt not found'));
      }

      await stopAllExecutions(prisma, id);
      res.status(200).json(createSuccessResponse(null, 'All executions stopped successfully'));
    } catch (error) {
      logger.error('Failed to stop executions', error as Error);
      res.status(200).json(createErrorResponse('Failed to stop executions'));
    }
  };
}

// Helper business logic functions
async function createTaskAttemptInDatabase(
  prisma: PrismaClient,
  task_id: string,
  task: any,
  attemptData: CreateTaskAttempt,
  logger: ILogger
): Promise<{ newAttempt: any }> {
  // Generate branch name and worktree path
  const timestamp = Date.now();
  const branchName = `task-${task.id}-attempt-${timestamp}`;
  const worktreePath = path.join(process.cwd(), 'worktrees', branchName);

  // Create worktree (placeholder for now - actual git integration would be here)
  try {
    await createWorktree(
      task.project.gitRepoPath,
      branchName,
      worktreePath,
      attemptData.base_branch
    );
  } catch (error) {
    logger?.warn?.('Failed to create git worktree, proceeding without it', {
      error: error as Error,
    });
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

  return { newAttempt };
}

async function createFollowUpExecution(
  prisma: PrismaClient,
  id: string,
  prompt: string,
  attempt: any
): Promise<any> {
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
  return await prisma.taskAttempt.update({
    where: { id },
    data: { status: 'RUNNING' },
  });
}

async function streamDiffUpdates(res: Response, attempt: any, logger: ILogger): Promise<void> {
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
  res.req.on('close', () => {
    clearInterval(interval);
  });
}

async function stopAllExecutions(prisma: PrismaClient, id: string): Promise<void> {
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
}
