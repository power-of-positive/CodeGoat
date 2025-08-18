import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { WinstonLogger } from '../logger-winston';
import { getDatabaseService } from '../services/database';
import { TodoStatus, TodoPriority, TodoTask } from '@prisma/client';

interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startTime?: string;
  endTime?: string;
  duration?: string;
}

// Status mapping between API and Prisma enum
const statusMapping: Record<string, TodoStatus> = {
  'pending': TodoStatus.PENDING,
  'in_progress': TodoStatus.IN_PROGRESS,
  'completed': TodoStatus.COMPLETED,
};

// Priority mapping between API and Prisma enum
const priorityMapping: Record<string, TodoPriority> = {
  'low': TodoPriority.LOW,
  'medium': TodoPriority.MEDIUM,
  'high': TodoPriority.HIGH,
};

// Reverse mappings for API responses
const reverseStatusMapping: Record<TodoStatus, string> = {
  [TodoStatus.PENDING]: 'pending',
  [TodoStatus.IN_PROGRESS]: 'in_progress',
  [TodoStatus.COMPLETED]: 'completed',
};

const reversePriorityMapping: Record<TodoPriority, string> = {
  [TodoPriority.LOW]: 'low',
  [TodoPriority.MEDIUM]: 'medium',
  [TodoPriority.HIGH]: 'high',
};

// Helper function to convert database task to API format
function dbTaskToApiTask(dbTask: TodoTask): Task {
  return {
    id: dbTask.id,
    content: dbTask.content,
    status: reverseStatusMapping[dbTask.status] as Task['status'],
    priority: reversePriorityMapping[dbTask.priority] as Task['priority'],
    startTime: dbTask.startTime?.toISOString(),
    endTime: dbTask.endTime?.toISOString(),
    duration: dbTask.duration || undefined,
  };
}

// Helper function to calculate duration
function calculateDuration(startTime?: string, endTime?: string): string | undefined {
  if (!startTime || !endTime) return undefined;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function createTaskRoutes(logger: WinstonLogger) {
  const router = express.Router();

  // GET /api/tasks - Get all tasks
  router.get('/', async (req, res) => {
    try {
      const db = getDatabaseService();
      const dbTasks = await db.todoTask.findMany({
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });
      
      const tasks = dbTasks.map(dbTaskToApiTask);
      res.json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Error fetching tasks:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
    }
  });

  // GET /api/tasks/:id - Get single task
  router.get('/:id', async (req, res) => {
    try {
      const db = getDatabaseService();
      const dbTask = await db.todoTask.findUnique({
        where: { id: req.params.id },
        include: {
          validationRuns: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
      
      if (!dbTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      const task = dbTaskToApiTask(dbTask);
      res.json({ 
        success: true, 
        data: {
          ...task,
          validationRuns: dbTask.validationRuns
        }
      });
    } catch (error) {
      logger.error('Error fetching task:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch task' });
    }
  });

  // POST /api/tasks - Create new task
  router.post('/', async (req, res) => {
    try {
      const { content, status = 'pending', priority = 'medium' } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Task content is required' });
      }
      
      const db = getDatabaseService();
      const dbStatus = statusMapping[status] || TodoStatus.PENDING;
      const dbPriority = priorityMapping[priority] || TodoPriority.MEDIUM;
      
      const taskData: {
        id: string;
        content: string;
        status: TodoStatus;
        priority: TodoPriority;
        startTime?: Date;
        endTime?: Date;
        duration?: string;
      } = {
        id: uuidv4(),
        content: content.trim(),
        status: dbStatus,
        priority: dbPriority,
      };
      
      // Handle timing based on initial status
      if (status === 'in_progress') {
        taskData.startTime = new Date();
      } else if (status === 'completed') {
        taskData.startTime = new Date();
        taskData.endTime = new Date();
        taskData.duration = '0m';
      }
      
      const dbTask = await db.todoTask.create({
        data: taskData
      });
      
      const newTask = dbTaskToApiTask(dbTask);
      
      logger.info('Task created:', { taskId: newTask.id, content: newTask.content });
      res.status(201).json({ success: true, data: newTask });
    } catch (error) {
      logger.error('Error creating task:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to create task' });
    }
  });

  // PUT /api/tasks/:id - Update task
  router.put('/:id', async (req, res) => {
    try {
      const db = getDatabaseService();
      const existingTask = await db.todoTask.findUnique({
        where: { id: req.params.id }
      });
      
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      const updates = req.body;
      const updateData: {
        content?: string;
        status?: TodoStatus;
        priority?: TodoPriority;
        startTime?: Date;
        endTime?: Date;
        duration?: string;
      } = {};
      
      // Handle content updates
      if (updates.content !== undefined) {
        updateData.content = updates.content;
      }
      
      // Handle priority updates
      if (updates.priority !== undefined) {
        updateData.priority = priorityMapping[updates.priority] || existingTask.priority;
      }
      
      // Handle status changes and timing
      if (updates.status && updates.status !== reverseStatusMapping[existingTask.status]) {
        updateData.status = statusMapping[updates.status];
        
        if (updates.status === 'in_progress' && existingTask.status === TodoStatus.PENDING) {
          updateData.startTime = new Date();
        } else if (updates.status === 'completed' && existingTask.status === TodoStatus.IN_PROGRESS) {
          const endTime = new Date();
          updateData.endTime = endTime;
          if (existingTask.startTime) {
            updateData.duration = calculateDuration(
              existingTask.startTime.toISOString(), 
              endTime.toISOString()
            );
          }
        } else if (updates.status === 'completed' && !existingTask.startTime) {
          // If completing a task that was never started
          updateData.startTime = new Date();
          updateData.endTime = new Date();
          updateData.duration = '0m';
        }
      }
      
      const updatedDbTask = await db.todoTask.update({
        where: { id: req.params.id },
        data: updateData
      });
      
      const updatedTask = dbTaskToApiTask(updatedDbTask);
      
      logger.info('Task updated:', { taskId: updatedTask.id, status: updatedTask.status });
      res.json({ success: true, data: updatedTask });
    } catch (error) {
      logger.error('Error updating task:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to update task' });
    }
  });

  // DELETE /api/tasks/:id - Delete task
  router.delete('/:id', async (req, res) => {
    try {
      const db = getDatabaseService();
      const existingTask = await db.todoTask.findUnique({
        where: { id: req.params.id }
      });
      
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      await db.todoTask.delete({
        where: { id: req.params.id }
      });
      
      logger.info('Task deleted:', { taskId: existingTask.id, content: existingTask.content });
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      logger.error('Error deleting task:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
  });

  return router;
}