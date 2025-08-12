import { Router, Request, Response } from 'express';
import { 
  ApiResponse, 
  Task, 
  TaskWithAttemptStatus
} from '../types/kanban.types';
import { ILogger } from '../logger-interface';
import { KanbanDatabaseService } from '../services/kanban-database.service';
import { mapPrismaTaskToApi, mapPrismaTaskToApiWithStatus } from '../utils/kanban-mappers';
import { z } from 'zod';

// Validation schemas
const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['todo', 'inprogress', 'inreview', 'done', 'cancelled']).optional(),
  parent_task_attempt: z.string().uuid('Invalid parent task attempt ID').optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'inprogress', 'inreview', 'done', 'cancelled']).optional(),
  parent_task_attempt: z.string().uuid('Invalid parent task attempt ID').optional(),
});

const CreateAndStartTaskSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  parent_task_attempt: z.string().uuid('Invalid parent task attempt ID').optional(),
  base_branch: z.string().default('main'),
  profile: z.string().optional(),
});

const TaskQuerySchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
});

/**
 * Create tasks API routes for Kanban system
 */
export function createKanbanTasksRoutes(
  kanbanDb: KanbanDatabaseService,
  logger: ILogger
): Router {
  const router = Router();
  const prisma = kanbanDb.getClient();

  /**
   * GET /projects/:id/tasks - Get tasks for project
   * Returns tasks with attempt status information
   */
  router.get('/projects/:id/tasks', async (req: Request, res: Response) => {
    try {
      const { id: project_id } = req.params;
      
      // Validate project_id is a valid UUID
      const validation = z.string().uuid().safeParse(project_id);
      if (!validation.success) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Invalid project ID format',
        };
        
        return res.status(400).json(response);
      }

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: project_id },
      });

      if (!project) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Project not found',
        };
        
        return res.status(404).json(response);
      }

      // Get tasks with attempt information
      const tasks = await prisma.task.findMany({
        where: { projectId: project_id },
        include: {
          attempts: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const tasksWithStatus = tasks.map(task => mapPrismaTaskToApiWithStatus(task));

      const response = {
        success: true,
        data: tasksWithStatus,
        error_data: null,
        message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to get tasks', error as Error);
      
      const response: ApiResponse<TaskWithAttemptStatus[]> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to retrieve tasks',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * POST /projects/:id/tasks - Create new task
   */
  router.post('/projects/:id/tasks', async (req: Request, res: Response) => {
    try {
      const { id: project_id } = req.params;
      
      // Validate project_id is a valid UUID
      const projectIdValidation = z.string().uuid().safeParse(project_id);
      if (!projectIdValidation.success) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Invalid project ID format',
        };
        
        return res.status(400).json(response);
      }
      
      const validation = CreateTaskSchema.safeParse(req.body);
      
      if (!validation.success) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`,
        };
        
        return res.status(400).json(response);
      }

      const taskData = validation.data;

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: project_id },
      });

      if (!project) {
        const response = {
          success: false,
          data: null,
          error_data: null,
          message: 'Project not found',
        };
        
        return res.status(404).json(response);
      }

      // Verify parent task attempt exists if provided
      if (taskData.parent_task_attempt) {
        const parentAttempt = await prisma.taskAttempt.findUnique({
          where: { id: taskData.parent_task_attempt },
        });

        if (!parentAttempt) {
          const response: ApiResponse<Task> = {
            success: false,
            data: null,
            error_data: null,
                        message: 'Parent task attempt not found',
          };
          
          return res.status(200).json(response);
        }
      }

      // Create task
      const newTask = await prisma.task.create({
        data: {
          projectId: project_id,
          title: taskData.title,
          description: taskData.description,
          parentTaskAttempt: taskData.parent_task_attempt,
          status: taskData.status ? (taskData.status.toUpperCase() as any) : 'TODO', // Default status
        },
      });

      const apiTask = mapPrismaTaskToApi(newTask);

      const response = {
        success: true,
        data: apiTask,
        error_data: null,
        message: 'Task created successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to create task', error as Error);
      
      const response: ApiResponse<Task> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to create task',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * POST /tasks/create-and-start - Create task and start attempt
   */
  router.post('/tasks/create-and-start', async (req: Request, res: Response) => {
    try {
      const validation = CreateAndStartTaskSchema.safeParse(req.body);
      
      if (!validation.success) {
        const response: ApiResponse<TaskWithAttemptStatus> = {
          success: false,
          data: null,
          error_data: null,
                    message: `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`,
        };
        
        return res.status(200).json(response);
      }

      const taskData = validation.data;

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: taskData.project_id },
      });

      if (!project) {
        const response: ApiResponse<TaskWithAttemptStatus> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Project not found',
        };
        
        return res.status(200).json(response);
      }

      // Verify parent task attempt exists if provided
      if (taskData.parent_task_attempt) {
        const parentAttempt = await prisma.taskAttempt.findUnique({
          where: { id: taskData.parent_task_attempt },
        });

        if (!parentAttempt) {
          const response: ApiResponse<TaskWithAttemptStatus> = {
            success: false,
            data: null,
            error_data: null,
                        message: 'Parent task attempt not found',
          };
          
          return res.status(200).json(response);
        }
      }

      // Use transaction to create task and attempt together
      const result = await prisma.$transaction(async (tx) => {
        // Create task
        const newTask = await tx.task.create({
          data: {
            projectId: taskData.project_id,
            title: taskData.title,
            description: taskData.description,
            parentTaskAttempt: taskData.parent_task_attempt,
            status: 'INPROGRESS', // Set to in progress since we're starting it
          },
        });

        // Create task attempt
        const branchName = `task-${newTask.id}-${Date.now()}`;
        const worktreePath = `./worktrees/${branchName}`;

        await tx.taskAttempt.create({
          data: {
            taskId: newTask.id,
            branchName,
            worktreePath,
            executor: 'CLAUDE_CODE', // Default executor
            status: 'RUNNING',
          },
        });

        // Get task with attempts for response
        const taskWithAttempts = await tx.task.findUnique({
          where: { id: newTask.id },
          include: {
            attempts: true,
          },
        });

        return taskWithAttempts;
      });

      if (!result) {
        throw new Error('Failed to create task and attempt');
      }

      const taskWithStatus = mapPrismaTaskToApiWithStatus(result);

      const response: ApiResponse<TaskWithAttemptStatus> = {
        success: true,
        data: taskWithStatus,
        error_data: null,
                message: 'Task created and started successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to create and start task', error as Error);
      
      const response: ApiResponse<TaskWithAttemptStatus> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to create and start task',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * GET /projects/:project_id/tasks/:task_id - Get specific task
   */
  router.get('/projects/:project_id/tasks/:task_id', async (req: Request, res: Response) => {
    try {
      const { project_id, task_id } = req.params;

      const task = await prisma.task.findUnique({
        where: { id: task_id },
        include: {
          attempts: true,
        },
      });

      if (!task) {
        const response: ApiResponse<TaskWithAttemptStatus> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Task not found',
        };
        
        return res.status(200).json(response);
      }

      const taskWithStatus = mapPrismaTaskToApiWithStatus(task);

      const response: ApiResponse<TaskWithAttemptStatus> = {
        success: true,
        data: taskWithStatus,
        error_data: null,
                message: null,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to get task', error as Error);
      
      const response: ApiResponse<TaskWithAttemptStatus> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to retrieve task',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * PUT /projects/:project_id/tasks/:task_id - Update task
   */
  router.put('/projects/:project_id/tasks/:task_id', async (req: Request, res: Response) => {
    try {
      const { project_id, task_id } = req.params;
      
      const validation = UpdateTaskSchema.safeParse(req.body);
      
      if (!validation.success) {
        const response: ApiResponse<Task> = {
          success: false,
          data: null,
          error_data: null,
                    message: `Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`,
        };
        
        return res.status(200).json(response);
      }

      const updateData = validation.data;

      // Check if task exists
      const existingTask = await prisma.task.findUnique({
        where: { id: task_id },
      });

      if (!existingTask) {
        const response: ApiResponse<Task> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Task not found',
        };
        
        return res.status(200).json(response);
      }

      // Verify parent task attempt exists if provided
      if (updateData.parent_task_attempt) {
        const parentAttempt = await prisma.taskAttempt.findUnique({
          where: { id: updateData.parent_task_attempt },
        });

        if (!parentAttempt) {
          const response: ApiResponse<Task> = {
            success: false,
            data: null,
            error_data: null,
                        message: 'Parent task attempt not found',
          };
          
          return res.status(200).json(response);
        }
      }

      // Build update data dynamically
      const updateFields: Record<string, unknown> = {};
      if (updateData.title) updateFields.title = updateData.title;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.status) updateFields.status = updateData.status.toUpperCase();
      if (updateData.parent_task_attempt !== undefined) {
        updateFields.parentTaskAttempt = updateData.parent_task_attempt;
      }

      // Update task
      const updatedTask = await prisma.task.update({
        where: { id: task_id },
        data: updateFields,
      });

      const apiTask = mapPrismaTaskToApi(updatedTask);

      const response: ApiResponse<Task> = {
        success: true,
        data: apiTask,
        error_data: null,
                message: 'Task updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to update task', error as Error);
      
      const response: ApiResponse<Task> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to update task',
      };
      
      res.status(200).json(response);
    }
  });

  /**
   * DELETE /projects/:project_id/tasks/:task_id - Delete task and all attempts
   */
  router.delete('/projects/:project_id/tasks/:task_id', async (req: Request, res: Response) => {
    try {
      const { project_id, task_id } = req.params;

      // Check if task exists
      const existingTask = await prisma.task.findUnique({
        where: { id: task_id },
      });

      if (!existingTask) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          error_data: null,
                    message: 'Task not found',
        };
        
        return res.status(200).json(response);
      }

      // Delete task (cascades to attempts due to schema constraints)
      await prisma.task.delete({
        where: { id: task_id },
      });

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        error_data: null,
                message: 'Task deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to delete task', error as Error);
      
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error_data: null,
                message: 'Failed to delete task',
      };
      
      res.status(200).json(response);
    }
  });

  return router;
}