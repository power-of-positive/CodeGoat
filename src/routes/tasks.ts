import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WinstonLogger } from '../logger-winston';

interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startTime?: string;
  endTime?: string;
  duration?: string;
}

const TODO_LIST_PATH = path.join(process.cwd(), 'todo-list.json');

// Helper function to read tasks from todo-list.json
async function readTasks(): Promise<Task[]> {
  try {
    const data = await fs.readFile(TODO_LIST_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading todo-list.json:', error);
    return [];
  }
}

// Helper function to write tasks to todo-list.json
async function writeTasks(tasks: Task[]): Promise<void> {
  try {
    await fs.writeFile(TODO_LIST_PATH, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error writing todo-list.json:', error);
    throw new Error('Failed to save tasks');
  }
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
      const tasks = await readTasks();
      res.json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Error fetching tasks:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
    }
  });

  // GET /api/tasks/:id - Get single task
  router.get('/:id', async (req, res) => {
    try {
      const tasks = await readTasks();
      const task = tasks.find(t => t.id === req.params.id);
      
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      res.json({ success: true, data: task });
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
      
      const tasks = await readTasks();
      const newTask: Task = {
        id: uuidv4(),
        content: content.trim(),
        status,
        priority,
        ...(status === 'in_progress' && { startTime: new Date().toISOString() }),
        ...(status === 'completed' && { 
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: '0m'
        })
      };
      
      tasks.push(newTask);
      await writeTasks(tasks);
      
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
      const tasks = await readTasks();
      const taskIndex = tasks.findIndex(t => t.id === req.params.id);
      
      if (taskIndex === -1) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      const existingTask = tasks[taskIndex];
      const updates = req.body;
      
      // Handle status changes and timing
      if (updates.status && updates.status !== existingTask.status) {
        if (updates.status === 'in_progress' && existingTask.status === 'pending') {
          updates.startTime = new Date().toISOString();
        } else if (updates.status === 'completed' && existingTask.status === 'in_progress') {
          updates.endTime = new Date().toISOString();
          updates.duration = calculateDuration(existingTask.startTime, updates.endTime);
        } else if (updates.status === 'completed' && !existingTask.startTime) {
          // If completing a task that was never started
          updates.startTime = new Date().toISOString();
          updates.endTime = new Date().toISOString();
          updates.duration = '0m';
        }
      }
      
      const updatedTask = {
        ...existingTask,
        ...updates
      };
      
      tasks[taskIndex] = updatedTask;
      await writeTasks(tasks);
      
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
      const tasks = await readTasks();
      const taskIndex = tasks.findIndex(t => t.id === req.params.id);
      
      if (taskIndex === -1) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      const deletedTask = tasks[taskIndex];
      tasks.splice(taskIndex, 1);
      await writeTasks(tasks);
      
      logger.info('Task deleted:', { taskId: deletedTask.id, content: deletedTask.content });
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      logger.error('Error deleting task:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
  });

  return router;
}