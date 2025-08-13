import { Router, Request, Response } from 'express';
import { ApiResponse, TaskStatus } from '../types/kanban.types';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';
import { WebSocketService } from '../services/websocket.service';
import { mapPrismaTaskToApiWithStatus, mapPrismaTaskToApi } from '../utils/kanban-mappers';
import { PrismaClient, TaskStatus as PrismaTaskStatus } from '@prisma/client';
import { z } from 'zod';

const CreateAndStartTaskSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  parent_task_attempt: z.string().uuid().optional(),
  base_branch: z.string().default('main'),
  profile: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  parent_task_attempt: z.string().uuid().optional(),
});

// Helper functions
async function getTaskById(prisma: PrismaClient, taskId: string): Promise<any> {
  return await prisma.task.findUnique({
    where: { id: taskId },
    include: { attempts: true },
  });
}

async function deleteTaskById(prisma: PrismaClient, taskId: string): Promise<void> {
  await prisma.task.delete({ where: { id: taskId } });
}

function createErrorResponse<T>(message: string): ApiResponse<T> {
  return {
    success: false,
    data: null,
    error_data: null,
    message,
  };
}

function createSuccessResponse<T>(data: T, message: string | null = null): ApiResponse<T> {
  return {
    success: true,
    data,
    error_data: null,
    message,
  };
}

// Map API TaskStatus to Prisma TaskStatus
function mapApiStatusToPrisma(status: TaskStatus): PrismaTaskStatus {
  switch (status) {
    case 'todo':
      return PrismaTaskStatus.TODO;
    case 'inprogress':
      return PrismaTaskStatus.INPROGRESS;
    case 'inreview':
      return PrismaTaskStatus.INREVIEW;
    case 'done':
      return PrismaTaskStatus.DONE;
    case 'cancelled':
      return PrismaTaskStatus.CANCELLED;
    default:
      return PrismaTaskStatus.TODO;
  }
}

/**
 * Create tasks API routes for Kanban system
 */
export function createKanbanTasksRoutes(
  kanbanDb: KanbanDatabaseService,
  logger: ILogger,
  webSocketService: WebSocketService
): Router {
  const router = Router();
  const prisma = kanbanDb.getClient();

  // GET /projects/:id/tasks
  router.get('/projects/:id/tasks', async (req: Request, res: Response) => {
    try {
      const { id: project_id } = req.params;

      const validation = z.string().uuid().safeParse(project_id);
      if (!validation.success) {
        return res.status(400).json(createErrorResponse('Invalid project ID format'));
      }

      const project = await prisma.project.findUnique({ where: { id: project_id } });
      if (!project) {
        return res.status(404).json(createErrorResponse('Project not found'));
      }

      const tasks = await prisma.task.findMany({
        where: { projectId: project_id },
        include: { attempts: true },
        orderBy: { createdAt: 'desc' },
      });

      const tasksWithStatus = tasks.map(task => mapPrismaTaskToApiWithStatus(task));
      res.status(200).json(createSuccessResponse(tasksWithStatus));
    } catch (error) {
      logger.error('Failed to get tasks', error as Error);
      res.status(200).json(createErrorResponse('Failed to retrieve tasks'));
    }
  });

  // POST /projects/:id/tasks
  router.post('/projects/:id/tasks', async (req: Request, res: Response) => {
    try {
      const { id: project_id } = req.params;

      const projectIdValidation = z.string().uuid().safeParse(project_id);
      if (!projectIdValidation.success) {
        return res.status(400).json(createErrorResponse('Invalid project ID format'));
      }

      const CreateTaskSchema = z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        status: z.enum(['todo', 'inprogress', 'inreview', 'done', 'cancelled']).optional(),
        parent_task_attempt: z.string().uuid().optional(),
      });

      const validation = CreateTaskSchema.safeParse(req.body);
      if (!validation.success) {
        const message = `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`;
        return res.status(400).json(createErrorResponse(message));
      }

      const taskData = validation.data;
      const project = await prisma.project.findUnique({ where: { id: project_id } });
      if (!project) {
        return res.status(404).json(createErrorResponse('Project not found'));
      }

      if (taskData.parent_task_attempt) {
        const parentAttempt = await prisma.taskAttempt.findUnique({
          where: { id: taskData.parent_task_attempt },
        });
        if (!parentAttempt) {
          return res.status(200).json(createErrorResponse('Parent task attempt not found'));
        }
      }

      const newTask = await prisma.task.create({
        data: {
          projectId: project_id,
          title: taskData.title,
          description: taskData.description,
          parentTaskAttempt: taskData.parent_task_attempt,
          ...(taskData.status && { status: mapApiStatusToPrisma(taskData.status) }),
        },
      });

      const apiTask = mapPrismaTaskToApi(newTask);

      // Broadcast task creation to WebSocket clients
      webSocketService.broadcastTaskUpdate({
        type: 'task_created',
        data: {
          taskId: newTask.id,
          projectId: project_id,
          task: apiTask,
        },
      });

      res.status(200).json(createSuccessResponse(apiTask, 'Task created successfully'));
    } catch (error) {
      logger.error('Failed to create task', error as Error);
      res.status(200).json(createErrorResponse('Failed to create task'));
    }
  });

  // POST /tasks/create-and-start
  router.post('/tasks/create-and-start', async (req: Request, res: Response) => {
    try {
      const validation = CreateAndStartTaskSchema.safeParse(req.body);
      if (!validation.success) {
        const message = `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`;
        return res.status(200).json(createErrorResponse(message));
      }

      const taskData = validation.data;
      const project = await prisma.project.findUnique({ where: { id: taskData.project_id } });
      if (!project) {
        return res.status(200).json(createErrorResponse('Project not found'));
      }

      if (taskData.parent_task_attempt) {
        const parentAttempt = await prisma.taskAttempt.findUnique({
          where: { id: taskData.parent_task_attempt },
        });
        if (!parentAttempt) {
          return res.status(200).json(createErrorResponse('Parent task attempt not found'));
        }
      }

      const result = await prisma.$transaction(async tx => {
        const newTask = await tx.task.create({
          data: {
            projectId: taskData.project_id,
            title: taskData.title,
            description: taskData.description,
            parentTaskAttempt: taskData.parent_task_attempt,
            status: 'INPROGRESS',
          },
        });

        const branchName = `task-${newTask.id}-${Date.now()}`;
        const worktreePath = `./worktrees/${branchName}`;

        await tx.taskAttempt.create({
          data: {
            taskId: newTask.id,
            branchName,
            worktreePath,
            executor: 'CLAUDE_CODE',
            status: 'RUNNING',
          },
        });

        return await tx.task.findUnique({
          where: { id: newTask.id },
          include: { attempts: true },
        });
      });

      if (!result) {
        throw new Error('Failed to create task and attempt');
      }

      const taskWithStatus = mapPrismaTaskToApiWithStatus(result);
      res
        .status(200)
        .json(createSuccessResponse(taskWithStatus, 'Task created and started successfully'));
    } catch (error) {
      logger.error('Failed to create and start task', error as Error);
      res.status(200).json(createErrorResponse('Failed to create and start task'));
    }
  });

  // GET /projects/:project_id/tasks/:task_id
  router.get('/projects/:project_id/tasks/:task_id', async (req: Request, res: Response) => {
    try {
      const { task_id } = req.params;
      const task = await getTaskById(prisma, task_id);

      if (!task) {
        return res.status(200).json(createErrorResponse('Task not found'));
      }

      const taskWithStatus = mapPrismaTaskToApiWithStatus(task);
      res.status(200).json(createSuccessResponse(taskWithStatus));
    } catch (error) {
      logger.error('Failed to get task', error as Error);
      res.status(200).json(createErrorResponse('Failed to retrieve task'));
    }
  });

  // PUT /projects/:project_id/tasks/:task_id
  router.put('/projects/:project_id/tasks/:task_id', async (req: Request, res: Response) => {
    try {
      const { task_id } = req.params;
      const validation = UpdateTaskSchema.safeParse(req.body);

      if (!validation.success) {
        const message = `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`;
        return res.status(200).json(createErrorResponse(message));
      }

      const updateData = validation.data;
      const existingTask = await prisma.task.findUnique({ where: { id: task_id } });
      if (!existingTask) {
        return res.status(200).json(createErrorResponse('Task not found'));
      }

      if (updateData.parent_task_attempt) {
        const parentAttempt = await prisma.taskAttempt.findUnique({
          where: { id: updateData.parent_task_attempt },
        });
        if (!parentAttempt) {
          return res.status(200).json(createErrorResponse('Parent task attempt not found'));
        }
      }

      const updateFields: Record<string, unknown> = {};
      if (updateData.title) updateFields.title = updateData.title;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.status) updateFields.status = updateData.status.toUpperCase();
      if (updateData.parent_task_attempt !== undefined) {
        updateFields.parentTaskAttempt = updateData.parent_task_attempt;
      }

      const updatedTask = await prisma.task.update({
        where: { id: task_id },
        data: updateFields,
      });

      const apiTask = mapPrismaTaskToApi(updatedTask);

      // Broadcast task update to WebSocket clients
      webSocketService.broadcastTaskUpdate({
        type: 'task_updated',
        data: {
          taskId: task_id,
          projectId: existingTask.projectId,
          task: apiTask,
          changes: updateFields,
        },
      });

      res.status(200).json(createSuccessResponse(apiTask, 'Task updated successfully'));
    } catch (error) {
      logger.error('Failed to update task', error as Error);
      res.status(200).json(createErrorResponse('Failed to update task'));
    }
  });

  // DELETE /projects/:project_id/tasks/:task_id
  router.delete('/projects/:project_id/tasks/:task_id', async (req: Request, res: Response) => {
    try {
      const { task_id } = req.params;
      const existingTask = await prisma.task.findUnique({ where: { id: task_id } });
      if (!existingTask) {
        return res.status(200).json(createErrorResponse('Task not found'));
      }

      await deleteTaskById(prisma, task_id);

      // Broadcast task deletion to WebSocket clients
      webSocketService.broadcastTaskUpdate({
        type: 'task_deleted',
        data: {
          taskId: task_id,
          projectId: existingTask.projectId,
        },
      });

      res.status(200).json(createSuccessResponse(null, 'Task deleted successfully'));
    } catch (error) {
      logger.error('Failed to delete task', error as Error);
      res.status(200).json(createErrorResponse('Failed to delete task'));
    }
  });

  return router;
}
