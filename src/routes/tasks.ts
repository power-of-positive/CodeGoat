import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { WinstonLogger } from '../logger-winston';
import { getDatabaseService } from '../services/database';
import { TodoStatus, TodoPriority, TodoTask, BDDScenarioStatus } from '@prisma/client';

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

// BDD Scenario status mapping
const bddStatusMapping: Record<string, BDDScenarioStatus> = {
  'pending': BDDScenarioStatus.PENDING,
  'passed': BDDScenarioStatus.PASSED,
  'failed': BDDScenarioStatus.FAILED,
  'skipped': BDDScenarioStatus.SKIPPED,
};

const reverseBddStatusMapping: Record<BDDScenarioStatus, string> = {
  [BDDScenarioStatus.PENDING]: 'pending',
  [BDDScenarioStatus.PASSED]: 'passed',
  [BDDScenarioStatus.FAILED]: 'failed',
  [BDDScenarioStatus.SKIPPED]: 'skipped',
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

  // GET /api/tasks/analytics - Get task completion statistics
  router.get('/analytics', async (req, res) => {
    try {
      const db = getDatabaseService();
      
      // Get overall statistics
      const totalTasks = await db.todoTask.count();
      const completedTasks = await db.todoTask.count({
        where: { status: TodoStatus.COMPLETED }
      });
      const inProgressTasks = await db.todoTask.count({
        where: { status: TodoStatus.IN_PROGRESS }
      });
      const pendingTasks = await db.todoTask.count({
        where: { status: TodoStatus.PENDING }
      });
      
      // Get completion rate by priority
      const priorityStats = await Promise.all([
        db.todoTask.count({ where: { priority: TodoPriority.HIGH } }),
        db.todoTask.count({ where: { priority: TodoPriority.HIGH, status: TodoStatus.COMPLETED } }),
        db.todoTask.count({ where: { priority: TodoPriority.MEDIUM } }),
        db.todoTask.count({ where: { priority: TodoPriority.MEDIUM, status: TodoStatus.COMPLETED } }),
        db.todoTask.count({ where: { priority: TodoPriority.LOW } }),
        db.todoTask.count({ where: { priority: TodoPriority.LOW, status: TodoStatus.COMPLETED } }),
      ]);
      
      // Get average completion time for completed tasks with valid durations
      const completedTasksWithDuration = await db.todoTask.findMany({
        where: { 
          status: TodoStatus.COMPLETED,
          startTime: { not: null },
          endTime: { not: null }
        }
      });
      
      const completionTimes = completedTasksWithDuration
        .filter(task => task.startTime && task.endTime)
        .map(task => {
          const start = task.startTime!.getTime();
          const end = task.endTime!.getTime();
          return (end - start) / (1000 * 60); // Convert to minutes
        });
      
      const averageCompletionTime = completionTimes.length > 0 
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0;
      
      // Get recent completions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentCompletions = await db.todoTask.findMany({
        where: {
          status: TodoStatus.COMPLETED,
          endTime: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: { endTime: 'desc' },
        take: 10
      });
      
      // Get daily completion statistics for last 30 days
      const dailyStats = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        
        const completedOnDay = await db.todoTask.count({
          where: {
            status: TodoStatus.COMPLETED,
            endTime: {
              gte: startOfDay,
              lt: endOfDay
            }
          }
        });
        
        dailyStats.push({
          date: startOfDay.toISOString().split('T')[0],
          completed: completedOnDay
        });
      }
      
      res.json({
        success: true,
        data: {
          overview: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            pendingTasks,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : '0',
            averageCompletionTimeMinutes: Math.round(averageCompletionTime)
          },
          priorityBreakdown: {
            high: {
              total: priorityStats[0],
              completed: priorityStats[1],
              completionRate: priorityStats[0] > 0 ? (priorityStats[1] / priorityStats[0] * 100).toFixed(1) : '0'
            },
            medium: {
              total: priorityStats[2],
              completed: priorityStats[3],
              completionRate: priorityStats[2] > 0 ? (priorityStats[3] / priorityStats[2] * 100).toFixed(1) : '0'
            },
            low: {
              total: priorityStats[4],
              completed: priorityStats[5],
              completionRate: priorityStats[4] > 0 ? (priorityStats[5] / priorityStats[4] * 100).toFixed(1) : '0'
            }
          },
          recentCompletions: recentCompletions.map(dbTaskToApiTask),
          dailyCompletions: dailyStats
        }
      });
    } catch (error) {
      logger.error('Error fetching task analytics:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch task analytics' });
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
          },
          bddScenarios: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
      
      if (!dbTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      const task = dbTaskToApiTask(dbTask);
      
      // Convert BDD scenarios to API format
      const bddScenarios = dbTask.bddScenarios.map(scenario => ({
        id: scenario.id,
        title: scenario.title,
        feature: scenario.feature,
        description: scenario.description,
        gherkinContent: scenario.gherkinContent,
        status: reverseBddStatusMapping[scenario.status],
        executedAt: scenario.executedAt?.toISOString(),
        executionDuration: scenario.executionDuration,
        errorMessage: scenario.errorMessage,
      }));
      
      res.json({ 
        success: true, 
        data: {
          ...task,
          validationRuns: dbTask.validationRuns,
          bddScenarios: bddScenarios
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

  // BDD Scenario endpoints
  
  // POST /api/tasks/:id/scenarios - Create new scenario for task
  router.post('/:id/scenarios', async (req, res) => {
    try {
      const { title, feature, description, gherkinContent, status = 'pending' } = req.body;
      
      if (!title || !title.trim() || !feature || !feature.trim() || !gherkinContent || !gherkinContent.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Title, feature, and gherkin content are required' 
        });
      }
      
      const db = getDatabaseService();
      
      // Verify task exists
      const existingTask = await db.todoTask.findUnique({
        where: { id: req.params.id }
      });
      
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      const dbStatus = bddStatusMapping[status] || BDDScenarioStatus.PENDING;
      
      const scenario = await db.bDDScenario.create({
        data: {
          todoTaskId: req.params.id,
          title: title.trim(),
          feature: feature.trim(),
          description: description?.trim() || '',
          gherkinContent: gherkinContent.trim(),
          status: dbStatus,
        }
      });
      
      logger.info('BDD scenario created:', { taskId: req.params.id, scenarioId: scenario.id });
      
      res.status(201).json({
        success: true,
        data: {
          id: scenario.id,
          title: scenario.title,
          feature: scenario.feature,
          description: scenario.description,
          gherkinContent: scenario.gherkinContent,
          status: reverseBddStatusMapping[scenario.status],
          executedAt: scenario.executedAt?.toISOString(),
          executionDuration: scenario.executionDuration,
          errorMessage: scenario.errorMessage,
        }
      });
    } catch (error) {
      logger.error('Error creating BDD scenario:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to create BDD scenario' });
    }
  });
  
  // PUT /api/tasks/:id/scenarios/:scenarioId - Update scenario
  router.put('/:id/scenarios/:scenarioId', async (req, res) => {
    try {
      const db = getDatabaseService();
      
      // Verify task exists
      const existingTask = await db.todoTask.findUnique({
        where: { id: req.params.id }
      });
      
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          todoTaskId: req.params.id
        }
      });
      
      if (!existingScenario) {
        return res.status(404).json({ success: false, message: 'Scenario not found' });
      }
      
      const updates = req.body;
      const updateData: {
        title?: string;
        feature?: string;
        description?: string;
        gherkinContent?: string;
        status?: BDDScenarioStatus;
        executedAt?: Date;
        executionDuration?: number;
        errorMessage?: string;
      } = {};
      
      if (updates.title !== undefined) {
        updateData.title = updates.title.trim();
      }
      
      if (updates.feature !== undefined) {
        updateData.feature = updates.feature.trim();
      }
      
      if (updates.description !== undefined) {
        updateData.description = updates.description?.trim() || '';
      }
      
      if (updates.gherkinContent !== undefined) {
        updateData.gherkinContent = updates.gherkinContent.trim();
      }
      
      if (updates.status !== undefined) {
        updateData.status = bddStatusMapping[updates.status] || existingScenario.status;
        
        // If status is being set to passed or failed, record execution time
        if ((updates.status === 'passed' || updates.status === 'failed') && 
            existingScenario.status === BDDScenarioStatus.PENDING) {
          updateData.executedAt = new Date();
        }
      }
      
      if (updates.executionDuration !== undefined) {
        updateData.executionDuration = updates.executionDuration;
      }
      
      if (updates.errorMessage !== undefined) {
        updateData.errorMessage = updates.errorMessage;
      }
      
      const updatedScenario = await db.bDDScenario.update({
        where: { id: req.params.scenarioId },
        data: updateData
      });
      
      logger.info('BDD scenario updated:', { taskId: req.params.id, scenarioId: req.params.scenarioId });
      
      res.json({
        success: true,
        data: {
          id: updatedScenario.id,
          title: updatedScenario.title,
          feature: updatedScenario.feature,
          description: updatedScenario.description,
          gherkinContent: updatedScenario.gherkinContent,
          status: reverseBddStatusMapping[updatedScenario.status],
          executedAt: updatedScenario.executedAt?.toISOString(),
          executionDuration: updatedScenario.executionDuration,
          errorMessage: updatedScenario.errorMessage,
        }
      });
    } catch (error) {
      logger.error('Error updating BDD scenario:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to update BDD scenario' });
    }
  });
  
  // DELETE /api/tasks/:id/scenarios/:scenarioId - Delete scenario
  router.delete('/:id/scenarios/:scenarioId', async (req, res) => {
    try {
      const db = getDatabaseService();
      
      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          todoTaskId: req.params.id
        }
      });
      
      if (!existingScenario) {
        return res.status(404).json({ success: false, message: 'Scenario not found' });
      }
      
      await db.bDDScenario.delete({
        where: { id: req.params.scenarioId }
      });
      
      logger.info('BDD scenario deleted:', { taskId: req.params.id, scenarioId: req.params.scenarioId });
      res.json({ success: true, message: 'BDD scenario deleted successfully' });
    } catch (error) {
      logger.error('Error deleting BDD scenario:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to delete BDD scenario' });
    }
  });

  // BDD Scenario Execution History endpoints
  
  // GET /api/tasks/:id/scenarios/:scenarioId/executions - Get execution history for a scenario
  router.get('/:id/scenarios/:scenarioId/executions', async (req, res) => {
    try {
      const db = getDatabaseService();
      const { limit = '50', offset = '0' } = req.query;
      
      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          todoTaskId: req.params.id
        }
      });
      
      if (!existingScenario) {
        return res.status(404).json({ success: false, message: 'Scenario not found' });
      }
      
      const executions = await db.bDDScenarioExecution.findMany({
        where: { scenarioId: req.params.scenarioId },
        orderBy: { executedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      });
      
      const executionsResponse = executions.map(execution => ({
        id: execution.id,
        scenarioId: execution.scenarioId,
        status: reverseBddStatusMapping[execution.status],
        executedAt: execution.executedAt.toISOString(),
        executionDuration: execution.executionDuration,
        errorMessage: execution.errorMessage,
        stepResults: execution.stepResults ? JSON.parse(execution.stepResults) : undefined,
        environment: execution.environment,
        executedBy: execution.executedBy,
        gherkinSnapshot: execution.gherkinSnapshot,
      }));
      
      res.json({ success: true, data: executionsResponse });
    } catch (error) {
      logger.error('Error fetching execution history:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch execution history' });
    }
  });
  
  // POST /api/tasks/:id/scenarios/:scenarioId/executions - Create new execution record
  router.post('/:id/scenarios/:scenarioId/executions', async (req, res) => {
    try {
      const { 
        status, 
        executionDuration, 
        errorMessage, 
        stepResults, 
        environment = 'dev',
        executedBy = 'system'
      } = req.body;
      
      if (!status) {
        return res.status(400).json({ 
          success: false, 
          message: 'Status is required' 
        });
      }
      
      const db = getDatabaseService();
      
      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          todoTaskId: req.params.id
        }
      });
      
      if (!existingScenario) {
        return res.status(404).json({ success: false, message: 'Scenario not found' });
      }
      
      const dbStatus = bddStatusMapping[status] || BDDScenarioStatus.PENDING;
      
      const execution = await db.bDDScenarioExecution.create({
        data: {
          scenarioId: req.params.scenarioId,
          status: dbStatus,
          executionDuration,
          errorMessage,
          stepResults: stepResults ? JSON.stringify(stepResults) : undefined,
          environment,
          executedBy,
          gherkinSnapshot: existingScenario.gherkinContent, // Save current gherkin
        }
      });
      
      // Update the scenario's current status and execution details
      await db.bDDScenario.update({
        where: { id: req.params.scenarioId },
        data: {
          status: dbStatus,
          executedAt: execution.executedAt,
          executionDuration,
          errorMessage,
        }
      });
      
      logger.info('BDD execution recorded:', { 
        taskId: req.params.id, 
        scenarioId: req.params.scenarioId,
        executionId: execution.id,
        status: status
      });
      
      res.status(201).json({
        success: true,
        data: {
          id: execution.id,
          scenarioId: execution.scenarioId,
          status: reverseBddStatusMapping[execution.status],
          executedAt: execution.executedAt.toISOString(),
          executionDuration: execution.executionDuration,
          errorMessage: execution.errorMessage,
          stepResults: execution.stepResults ? JSON.parse(execution.stepResults) : undefined,
          environment: execution.environment,
          executedBy: execution.executedBy,
          gherkinSnapshot: execution.gherkinSnapshot,
        }
      });
    } catch (error) {
      logger.error('Error creating execution record:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to create execution record' });
    }
  });

  // GET /api/tasks/:id/scenarios/:scenarioId/analytics - Get execution analytics for a scenario
  router.get('/:id/scenarios/:scenarioId/analytics', async (req, res) => {
    try {
      const db = getDatabaseService();
      const { days = '30' } = req.query;
      
      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          todoTaskId: req.params.id
        }
      });
      
      if (!existingScenario) {
        return res.status(404).json({ success: false, message: 'Scenario not found' });
      }
      
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));
      
      const executions = await db.bDDScenarioExecution.findMany({
        where: { 
          scenarioId: req.params.scenarioId,
          executedAt: { gte: daysAgo }
        },
        orderBy: { executedAt: 'desc' }
      });
      
      const totalExecutions = executions.length;
      const passedExecutions = executions.filter(e => e.status === BDDScenarioStatus.PASSED).length;
      const failedExecutions = executions.filter(e => e.status === BDDScenarioStatus.FAILED).length;
      const skippedExecutions = executions.filter(e => e.status === BDDScenarioStatus.SKIPPED).length;
      
      const successRate = totalExecutions > 0 ? (passedExecutions / totalExecutions) * 100 : 0;
      
      const executionsWithDuration = executions.filter(e => e.executionDuration);
      const averageDuration = executionsWithDuration.length > 0 
        ? executionsWithDuration.reduce((sum, e) => sum + (e.executionDuration || 0), 0) / executionsWithDuration.length
        : 0;
      
      // Group executions by day for trend analysis
      interface DailyStats {
        date: string;
        total: number;
        passed: number;
        failed: number;
        skipped: number;
      }
      
      const dailyStats = executions.reduce((acc, execution) => {
        const date = execution.executedAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, total: 0, passed: 0, failed: 0, skipped: 0 };
        }
        acc[date].total++;
        if (execution.status === BDDScenarioStatus.PASSED) acc[date].passed++;
        if (execution.status === BDDScenarioStatus.FAILED) acc[date].failed++;
        if (execution.status === BDDScenarioStatus.SKIPPED) acc[date].skipped++;
        return acc;
      }, {} as Record<string, DailyStats>);
      
      res.json({
        success: true,
        data: {
          summary: {
            totalExecutions,
            passedExecutions,
            failedExecutions,
            skippedExecutions,
            successRate: Math.round(successRate * 100) / 100,
            averageDuration: Math.round(averageDuration)
          },
          trends: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
          recentExecutions: executions.slice(0, 10).map(execution => ({
            id: execution.id,
            status: reverseBddStatusMapping[execution.status],
            executedAt: execution.executedAt.toISOString(),
            executionDuration: execution.executionDuration,
            errorMessage: execution.errorMessage,
            environment: execution.environment,
            executedBy: execution.executedBy,
          }))
        }
      });
    } catch (error) {
      logger.error('Error fetching execution analytics:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch execution analytics' });
    }
  });

  return router;
}