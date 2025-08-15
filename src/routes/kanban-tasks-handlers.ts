/**
 * Route handlers for kanban tasks API
 * Extracted from kanban-tasks.ts to reduce complexity
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '../logger-interface';
import { WebSocketService } from '../services/websocket.service';
import { WorktreeExecutionService } from '../services/worktree-execution.service';
import { mapPrismaTaskToApiWithStatus, mapPrismaTaskToApi } from '../utils/kanban-mappers';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createInvalidIdResponse,
} from '../utils/response-utils';
import {
  CreateTaskSchema,
  CreateAndStartTaskSchema,
  validateCreateTaskRequest,
  validateUpdateTaskRequest,
  validateParentTaskAttempt,
} from '../utils/task-validation-utils';
import {
  broadcastTaskCreation,
  broadcastTaskUpdate,
  broadcastTaskDeletion,
} from '../utils/task-websocket-utils';
import {
  getTaskById,
  deleteTaskById,
  createTaskInDatabase,
  createTaskAndAttemptTransaction,
  updateTaskInDatabase,
} from '../utils/task-database-utils';
import { z } from 'zod';

interface HandlerDependencies {
  prisma: PrismaClient;
  logger: ILogger;
  webSocketService: WebSocketService;
  worktreeExecutionService?: WorktreeExecutionService;
}

/**
 * Handler for GET /projects/:id/tasks - List tasks for a project
 */
export async function handleListTasks(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const { id: project_id } = req.params;

    const validation = z.string().uuid().safeParse(project_id);
    if (!validation.success) {
      const response = createInvalidIdResponse('project');
      res.status(400).json(response);
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) {
      const response = createNotFoundResponse('Project');
      res.status(404).json(response);
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: project_id },
      include: { attempts: true },
      orderBy: { createdAt: 'desc' },
    });

    const tasksWithStatus = tasks.map(task => mapPrismaTaskToApiWithStatus(task));
    const response = createSuccessResponse(tasksWithStatus);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to get tasks', error as Error);
    const response = createErrorResponse('Failed to retrieve tasks');
    res.status(500).json(response);
  }
}

/**
 * Handler for POST /projects/:id/tasks - Create new task
 */
export async function handleCreateTask(
  req: Request,
  res: Response,
  { prisma, logger, webSocketService }: HandlerDependencies
): Promise<void> {
  try {
    const { id: project_id } = req.params;

    // Validate project ID and request body
    const validationResult = validateCreateTaskRequest(project_id, req.body);
    if (validationResult) {
      res.status(validationResult.status).json(validationResult.response);
      return;
    }

    const taskData = CreateTaskSchema.parse(req.body);

    // Check if project exists
    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) {
      const response = createNotFoundResponse('Project');
      res.status(404).json(response);
      return;
    }

    // Validate parent task attempt if provided
    const parentValidationResult = await validateParentTaskAttempt(prisma, taskData.parent_task_attempt);
    if (parentValidationResult) {
      res.status(400).json(parentValidationResult);
      return;
    }

    const newTask = await createTaskInDatabase(prisma, project_id, taskData);
    const apiTask = mapPrismaTaskToApi(newTask);

    broadcastTaskCreation(webSocketService, newTask.id, project_id, apiTask);

    const response = createSuccessResponse(apiTask, 'Task created successfully');
    res.status(201).json(response);
  } catch (error) {
    logger.error('Failed to create task', error as Error);
    const response = createErrorResponse('Failed to create task');
    res.status(500).json(response);
  }
}

/**
 * Handler for POST /tasks/create-and-start - Create task and start execution
 */
export async function handleCreateAndStartTask(
  req: Request,
  res: Response,
  { prisma, logger, worktreeExecutionService }: HandlerDependencies
): Promise<void> {
  try {
    const validation = CreateAndStartTaskSchema.safeParse(req.body);
    if (!validation.success) {
      const response = createValidationErrorResponse(validation.error);
      res.status(400).json(response);
      return;
    }

    const taskData = validation.data;
    const project = await prisma.project.findUnique({ where: { id: taskData.project_id } });
    if (!project) {
      const response = createNotFoundResponse('Project');
      res.status(404).json(response);
      return;
    }

    // Validate parent task attempt if provided
    const parentValidationResult = await validateParentTaskAttempt(prisma, taskData.parent_task_attempt);
    if (parentValidationResult) {
      res.status(400).json(parentValidationResult);
      return;
    }

    const result = await createTaskAndAttemptTransaction(prisma, taskData);
    if (!result) {
      throw new Error('Failed to create task and attempt');
    }

    const taskWithStatus = mapPrismaTaskToApiWithStatus(result);

    // Start worktree execution if service is available
    if (worktreeExecutionService) {
      await startTaskWorktreeExecution(prisma, logger, worktreeExecutionService, result.id, project);
    }

    const response = createSuccessResponse(taskWithStatus, 'Task created and started successfully');
    res.status(201).json(response);
  } catch (error) {
    logger.error('Failed to create and start task', error as Error);
    const response = createErrorResponse('Failed to create and start task');
    res.status(500).json(response);
  }
}

/**
 * Handler for GET /projects/:project_id/tasks/:task_id - Get task by ID
 */
export async function handleGetTask(
  req: Request,
  res: Response,
  { prisma, logger }: HandlerDependencies
): Promise<void> {
  try {
    const { task_id } = req.params;
    const task = await getTaskById(prisma, task_id);

    if (!task) {
      const response = createNotFoundResponse('Task');
      res.status(404).json(response);
      return;
    }

    const taskWithStatus = mapPrismaTaskToApiWithStatus(task);
    const response = createSuccessResponse(taskWithStatus);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to get task', error as Error);
    const response = createErrorResponse('Failed to retrieve task');
    res.status(500).json(response);
  }
}

/**
 * Handler for PUT /projects/:project_id/tasks/:task_id - Update task
 */
export async function handleUpdateTask(
  req: Request,
  res: Response,
  dependencies: HandlerDependencies
): Promise<void> {
  try {
    const { task_id } = req.params;
    const { prisma, webSocketService } = dependencies;

    // Validate request and get existing task
    const validationResult = await validateUpdateTaskRequest(req, prisma);
    if (validationResult.error) {
      res.status(validationResult.status).json(validationResult.error);
      return;
    }

    const { updateData, existingTask } = validationResult.data!;

    // Validate parent task attempt if provided
    const parentValidationResult = await validateParentTaskAttempt(prisma, updateData.parent_task_attempt);
    if (parentValidationResult) {
      res.status(400).json(parentValidationResult);
      return;
    }

    // Update task and handle status change
    const updatedTask = await updateTaskInDatabase(prisma, task_id, updateData);
    const apiTask = mapPrismaTaskToApi(updatedTask);

    await handleTaskStatusChange(updateData, existingTask, task_id, dependencies);

    // Broadcast task update to WebSocket clients
    broadcastTaskUpdate(webSocketService, task_id, existingTask.projectId, apiTask, updateData);

    const response = createSuccessResponse(apiTask, 'Task updated successfully');
    res.status(200).json(response);
  } catch (error) {
    dependencies.logger.error('Failed to update task', error as Error);
    const response = createErrorResponse('Failed to update task');
    res.status(500).json(response);
  }
}

/**
 * Handler for DELETE /projects/:project_id/tasks/:task_id - Delete task
 */
export async function handleDeleteTask(
  req: Request,
  res: Response,
  { prisma, logger, webSocketService }: HandlerDependencies
): Promise<void> {
  try {
    const { task_id } = req.params;
    const existingTask = await prisma.task.findUnique({ where: { id: task_id } });
    if (!existingTask) {
      const response = createNotFoundResponse('Task');
      res.status(404).json(response);
      return;
    }

    await deleteTaskById(prisma, task_id);

    // Broadcast task deletion to WebSocket clients
    broadcastTaskDeletion(webSocketService, task_id, existingTask.projectId);

    const response = createSuccessResponse(null, 'Task deleted successfully');
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to delete task', error as Error);
    const response = createErrorResponse('Failed to delete task');
    res.status(500).json(response);
  }
}

// Helper functions

/**
 * Start task worktree execution asynchronously
 */
async function startTaskWorktreeExecution(
  prisma: PrismaClient,
  logger: ILogger,
  worktreeService: WorktreeExecutionService,
  taskId: string,
  project: any
): Promise<void> {
  logger.info('Task created with inprogress status, starting worktree execution', {
    taskId,
    projectPath: project.gitRepoPath,
  });

  // Import the worktree execution utility
  const { startWorktreeExecution } = await import('../utils/worktree-execution-utils');
  
  // Start worktree execution asynchronously (don't await to avoid blocking the response)
  startWorktreeExecution(prisma, logger, worktreeService, taskId)
    .catch(error => {
      logger.error('Failed to trigger worktree execution for create-and-start task', error, {
        taskId,
      });
    });
}

/**
 * Handle task status change and start worktree execution if needed
 */
async function handleTaskStatusChange(
  updateData: any,
  existingTask: any,
  taskId: string,
  dependencies: Pick<HandlerDependencies, 'prisma' | 'logger' | 'worktreeExecutionService'>
): Promise<void> {
  const { prisma, logger, worktreeExecutionService } = dependencies;
  
  if (updateData.status === 'inprogress' && existingTask.status !== 'INPROGRESS' && worktreeExecutionService) {
    logger.info('Task status changed to inprogress, starting worktree execution', {
      taskId,
      previousStatus: existingTask.status,
      newStatus: updateData.status,
    });
    
    // Import the worktree execution utility
    const { startWorktreeExecution } = await import('../utils/worktree-execution-utils');
    
    // Start worktree execution asynchronously (don't await to avoid blocking the response)
    startWorktreeExecution(prisma, logger, worktreeExecutionService, taskId)
      .catch(error => {
        logger.error('Failed to trigger worktree execution for task status update', error, {
          taskId,
        });
      });
  }
}

