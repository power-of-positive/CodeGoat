import express from 'express';
import type { ILogger } from '../logger-interface';
import { getDatabaseService } from '../services/database';
import type { Task, BDDScenario, ValidationRun } from '@prisma/client';
import {
  TaskStatus as TaskStatusEnum,
  Priority as PriorityEnum,
  BDDScenarioStatus as BDDScenarioStatusEnum,
  TaskType as TaskTypeEnum,
} from '../types/enums';
import { validateRequest, validateParams, validateQuery } from '../middleware/validate';
import {
  GetTasksQuerySchema,
  GetTaskParamsSchema,
  CreateTaskRequestSchema,
  UpdateTaskParamsSchema,
  UpdateTaskRequestSchema,
  DeleteTaskParamsSchema,
  CreateScenarioParamsSchema,
  CreateScenarioRequestSchema,
  UpdateScenarioParamsSchema,
  UpdateScenarioRequestSchema,
  DeleteScenarioParamsSchema,
  GetExecutionsParamsSchema,
  ExecuteScenarioParamsSchema,
  ExecuteScenarioRequestSchema,
  GetScenarioAnalyticsParamsSchema,
} from '../shared/schemas';

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Time calculation constants
const TIME_BASE = {
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_MINUTE: 60,
  MS_PER_SECOND: 1000,
  DAYS_IN_MONTH: 30,
} as const;

const TIME_CALC_CONSTANTS = {
  ...TIME_BASE,
  MS_PER_MINUTE: TIME_BASE.SECONDS_PER_MINUTE * TIME_BASE.MS_PER_SECOND,
  MS_PER_HOUR: TIME_BASE.MINUTES_PER_HOUR * TIME_BASE.SECONDS_PER_MINUTE * TIME_BASE.MS_PER_SECOND,
} as const;

type TaskStatusValue = (typeof TaskStatusEnum)[keyof typeof TaskStatusEnum];
type PriorityValue = (typeof PriorityEnum)[keyof typeof PriorityEnum];
type TaskTypeValue = (typeof TaskTypeEnum)[keyof typeof TaskTypeEnum];
type BDDScenarioStatusValue =
  (typeof BDDScenarioStatusEnum)[keyof typeof BDDScenarioStatusEnum];

interface ApiTask {
  id: string; // CODEGOAT-001, CODEGOAT-055, etc.
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  taskType: 'story' | 'task';
  executorId?: string;
  startTime?: string;
  endTime?: string;
  duration?: number; // Duration in milliseconds
}

// Status mapping between API and Prisma enum
const statusMapping: Record<string, TaskStatusValue> = {
  pending: TaskStatusEnum.PENDING,
  in_progress: TaskStatusEnum.IN_PROGRESS,
  completed: TaskStatusEnum.COMPLETED,
};

// Priority mapping between API and Prisma enum
const priorityMapping: Record<string, PriorityValue> = {
  low: PriorityEnum.LOW,
  medium: PriorityEnum.MEDIUM,
  high: PriorityEnum.HIGH,
};

// Reverse mappings for API responses
const reverseStatusMapping: Record<TaskStatusValue, string> = {
  [TaskStatusEnum.PENDING]: 'pending',
  [TaskStatusEnum.IN_PROGRESS]: 'in_progress',
  [TaskStatusEnum.COMPLETED]: 'completed',
};

const reversePriorityMapping: Record<PriorityValue, string> = {
  [PriorityEnum.LOW]: 'low',
  [PriorityEnum.MEDIUM]: 'medium',
  [PriorityEnum.HIGH]: 'high',
  [PriorityEnum.URGENT]: 'urgent',
};

// BDD Scenario status mapping
const bddStatusMapping: Record<string, BDDScenarioStatusValue> = {
  pending: BDDScenarioStatusEnum.PENDING,
  passed: BDDScenarioStatusEnum.PASSED,
  failed: BDDScenarioStatusEnum.FAILED,
  skipped: BDDScenarioStatusEnum.SKIPPED,
};

const reverseBddStatusMapping: Record<BDDScenarioStatusValue, string> = {
  [BDDScenarioStatusEnum.PENDING]: 'pending',
  [BDDScenarioStatusEnum.PASSED]: 'passed',
  [BDDScenarioStatusEnum.FAILED]: 'failed',
  [BDDScenarioStatusEnum.SKIPPED]: 'skipped',
};

/**
 * Generate the next CODEGOAT-XXX ID
 */
async function generateNextTaskId(): Promise<string> {
  const db = getDatabaseService();

  // Find the highest existing CODEGOAT ID
  const tasks = await db.task.findMany({
    where: {
      id: { startsWith: 'CODEGOAT-' },
    },
    orderBy: { id: 'desc' },
    take: 1,
  });

  let nextNumber = 1;
  if (tasks.length > 0) {
    const lastId = tasks[0].id; // e.g., "CODEGOAT-042"
    const numberMatch = lastId.match(/CODEGOAT-(\d+)/);
    if (numberMatch) {
      nextNumber = parseInt(numberMatch[1], 10) + 1;
    }
  }

  return `CODEGOAT-${nextNumber.toString().padStart(3, '0')}`;
}

// Helper function to calculate duration in milliseconds
function calculateDuration(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) {
    return undefined;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  return end.getTime() - start.getTime();
}

// Handler functions for task routes
function createGetAllTasksHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();
      const dbTasks = await db.task.findMany({
        where: {
          // Only fetch todo tasks (tasks without projectId or with CODEGOAT- ids)
          OR: [{ projectId: null }, { id: { startsWith: 'CODEGOAT-' } }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      const tasks = dbTasks.map(task => ({
        id: task.id,
        content: task.content ?? task.title,
        status: reverseStatusMapping[
          task.status as keyof typeof reverseStatusMapping
        ] as ApiTask['status'],
        priority: reversePriorityMapping[
          task.priority as keyof typeof reversePriorityMapping
        ] as ApiTask['priority'],
        taskType: (task.taskType ?? TaskTypeEnum.TASK) as ApiTask['taskType'],
        executorId: task.executorId ?? undefined,
        startTime: task.startTime?.toISOString(),
        endTime: task.endTime?.toISOString(),
        duration: calculateDuration(task.startTime?.toISOString(), task.endTime?.toISOString()),
      }));

      res.json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Error fetching tasks:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch tasks' });
    }
  };
}

function createGetTaskAnalyticsHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();

      // Define filter for todo tasks
      const todoTasksFilter = {
        OR: [{ projectId: null }, { id: { startsWith: 'CODEGOAT-' } }],
      };

      // Get overall statistics
      const totalTasks = await db.task.count({ where: todoTasksFilter });
      const completedTasks = await db.task.count({
        where: { ...todoTasksFilter, status: TaskStatusEnum.COMPLETED },
      });
      const inProgressTasks = await db.task.count({
        where: { ...todoTasksFilter, status: TaskStatusEnum.IN_PROGRESS },
      });
      const pendingTasks = await db.task.count({
        where: { ...todoTasksFilter, status: TaskStatusEnum.PENDING },
      });

      // Get completion rate by priority
      const priorityStats = await Promise.all([
        db.task.count({ where: { ...todoTasksFilter, priority: PriorityEnum.HIGH } }),
        db.task.count({
          where: { ...todoTasksFilter, priority: PriorityEnum.HIGH, status: TaskStatusEnum.COMPLETED },
        }),
        db.task.count({ where: { ...todoTasksFilter, priority: PriorityEnum.MEDIUM } }),
        db.task.count({
          where: { ...todoTasksFilter, priority: PriorityEnum.MEDIUM, status: TaskStatusEnum.COMPLETED },
        }),
        db.task.count({ where: { ...todoTasksFilter, priority: PriorityEnum.LOW } }),
        db.task.count({
          where: { ...todoTasksFilter, priority: PriorityEnum.LOW, status: TaskStatusEnum.COMPLETED },
        }),
      ]);

      // Get average completion time for completed tasks with valid durations
      const completedTasksWithDuration = await db.task.findMany({
        where: {
          ...todoTasksFilter,
          status: TaskStatusEnum.COMPLETED,
          startTime: { not: null },
          endTime: { not: null },
        },
      });

      const completionTimes = completedTasksWithDuration
        .filter(task => task.startTime && task.endTime)
        .map(task => {
          const start = task.startTime!.getTime();
          const end = task.endTime!.getTime();
          return (
            (end - start) /
            (TIME_CALC_CONSTANTS.MS_PER_SECOND * TIME_CALC_CONSTANTS.SECONDS_PER_MINUTE)
          ); // Convert to minutes
        });

      const averageCompletionTime =
        completionTimes.length > 0
          ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
          : 0;

      // Get recent completions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - TIME_CALC_CONSTANTS.DAYS_IN_MONTH);

      const recentCompletions = await db.task.findMany({
        where: {
          ...todoTasksFilter,
          status: TaskStatusEnum.COMPLETED,
          endTime: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: { endTime: 'desc' },
        take: 10,
      });

      // Get daily completion statistics for last 30 days
      const dailyStats = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        const completedOnDay = await db.task.count({
          where: {
            ...todoTasksFilter,
            status: TaskStatusEnum.COMPLETED,
            endTime: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        });

        dailyStats.push({
          date: startOfDay.toISOString().split('T')[0],
          completed: completedOnDay,
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
            completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0',
            averageCompletionTimeMinutes: Math.round(averageCompletionTime),
          },
          priorityBreakdown: {
            high: {
              total: priorityStats[0],
              completed: priorityStats[1],
              completionRate:
                priorityStats[0] > 0
                  ? ((priorityStats[1] / priorityStats[0]) * 100).toFixed(1)
                  : '0',
            },
            medium: {
              total: priorityStats[2],
              completed: priorityStats[3],
              completionRate:
                priorityStats[2] > 0
                  ? ((priorityStats[3] / priorityStats[2]) * 100).toFixed(1)
                  : '0',
            },
            low: {
              total: priorityStats[4],
              completed: priorityStats[5],
              completionRate:
                priorityStats[4] > 0
                  ? ((priorityStats[5] / priorityStats[4]) * 100).toFixed(1)
                  : '0',
            },
          },
          recentCompletions: recentCompletions.map(task => ({
            id: task.id,
            content: task.content ?? task.title,
            status: reverseStatusMapping[
              task.status as keyof typeof reverseStatusMapping
            ] as ApiTask['status'],
            priority: reversePriorityMapping[
              task.priority as keyof typeof reversePriorityMapping
            ] as ApiTask['priority'],
            taskType: (task.taskType ?? TaskTypeEnum.TASK) as ApiTask['taskType'],
            executorId: task.executorId ?? undefined,
            startTime: task.startTime?.toISOString(),
            endTime: task.endTime?.toISOString(),
            duration: calculateDuration(task.startTime?.toISOString(), task.endTime?.toISOString()),
          })),
          dailyCompletions: dailyStats,
        },
      });
    } catch (error) {
      logger.error('Error fetching task analytics:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch task analytics' });
    }
  };
}

function createGetTaskByIdHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();
      const dbTask = (await db.task.findUnique({
        where: { id: req.params.id },
        include: {
          validationRuns: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          bddScenarios: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })) as (Task & { validationRuns: ValidationRun[]; bddScenarios: BDDScenario[] }) | null;

      if (!dbTask) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Task not found' });
      }

      const response: ApiTask & {
        validationRuns: ValidationRun[];
        bddScenarios: Array<{
          id: string;
          title: string;
          feature: string;
          description: string;
          gherkinContent: string;
          status: string;
          executedAt?: string;
          executionDuration?: number;
          errorMessage?: string | null;
        }>;
      } = {
        id: dbTask.id,
        content: dbTask.content ?? dbTask.title,
        status: reverseStatusMapping[
          dbTask.status as keyof typeof reverseStatusMapping
        ] as ApiTask['status'],
        priority: reversePriorityMapping[
          dbTask.priority as keyof typeof reversePriorityMapping
        ] as ApiTask['priority'],
        taskType: (dbTask.taskType ?? TaskTypeEnum.TASK) as ApiTask['taskType'],
        executorId: dbTask.executorId ?? undefined,
        startTime: dbTask.startTime?.toISOString(),
        endTime: dbTask.endTime?.toISOString(),
        duration: calculateDuration(dbTask.startTime?.toISOString(), dbTask.endTime?.toISOString()),
        validationRuns: dbTask.validationRuns,
        bddScenarios: dbTask.bddScenarios.map((scenario: BDDScenario) => ({
          id: scenario.id,
          title: scenario.title,
          feature: scenario.feature,
          description: scenario.description,
          gherkinContent: scenario.gherkinContent,
          status: reverseBddStatusMapping[scenario.status as keyof typeof reverseBddStatusMapping],
          executedAt: scenario.executedAt?.toISOString(),
          executionDuration: scenario.executionDuration ?? undefined,
          errorMessage: scenario.errorMessage ?? undefined,
        })),
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Error fetching task:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch task' });
    }
  };
}

function createCreateTaskHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const {
        content,
        status = 'pending',
        priority = 'medium',
        taskType = 'task',
        executorId,
      } = req.body;

      if (!content?.trim()) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, message: 'Task content is required' });
      }

      const db = getDatabaseService();
      const dbStatus = statusMapping[status] || TaskStatusEnum.PENDING;
      const dbPriority = priorityMapping[priority] || PriorityEnum.MEDIUM;
      const dbTaskType: TaskTypeValue = (taskType as TaskTypeValue) || TaskTypeEnum.TASK;

      const taskId = await generateNextTaskId();

      const taskData: {
        id: string;
        title: string;
        content: string;
        status: TaskStatusValue;
        priority: PriorityValue;
        taskType: TaskTypeValue;
        executorId?: string;
        startTime?: Date;
        endTime?: Date;
      } = {
        id: taskId,
        title: content.trim(), // Set title for unified schema
        content: content.trim(),
        status: dbStatus,
        priority: dbPriority,
        taskType: dbTaskType,
        executorId: executorId ?? undefined,
      };

      // Handle timing based on initial status
      if (status === 'in_progress') {
        taskData.startTime = new Date();
      } else if (status === 'completed') {
        taskData.startTime = new Date();
        taskData.endTime = new Date();
        // Duration is calculated dynamically, no need to store it
      }

      const dbTask = await db.task.create({
        data: taskData,
      });

      logger.info('Task created:', { taskId: dbTask.id, content: dbTask.content ?? dbTask.title });
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          id: dbTask.id,
          content: dbTask.content ?? dbTask.title,
          status: reverseStatusMapping[
            dbTask.status as keyof typeof reverseStatusMapping
          ] as ApiTask['status'],
          priority: reversePriorityMapping[
            dbTask.priority as keyof typeof reversePriorityMapping
          ] as ApiTask['priority'],
          taskType: (dbTask.taskType ?? TaskTypeEnum.TASK) as ApiTask['taskType'],
          executorId: dbTask.executorId ?? undefined,
          startTime: dbTask.startTime?.toISOString(),
          endTime: dbTask.endTime?.toISOString(),
          duration: calculateDuration(dbTask.startTime?.toISOString(), dbTask.endTime?.toISOString()),
        },
      });
    } catch (error) {
      logger.error('Error creating task:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to create task' });
    }
  };
}

function createUpdateTaskHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();
      const existingTask = await db.task.findUnique({
        where: { id: req.params.id },
      });

      if (!existingTask) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Task not found' });
      }

      const updates = req.body;
      const updateData: {
        content?: string;
        title?: string;
        status?: TaskStatusValue;
        priority?: PriorityValue;
        taskType?: TaskTypeValue;
        executorId?: string;
        startTime?: Date;
        endTime?: Date;
      } = {};

      // Handle content updates
      if (updates.content !== undefined) {
        updateData.content = updates.content;
        updateData.title = updates.content; // Keep title in sync
      }

      // Handle priority updates
      if (updates.priority !== undefined) {
        updateData.priority = priorityMapping[updates.priority] || existingTask.priority;
      }

      // Handle taskType updates
      if (updates.taskType !== undefined) {
        updateData.taskType =
          (updates.taskType as TaskTypeValue) || existingTask.taskType || TaskTypeEnum.TASK;
      }

      // Handle executorId updates
      if (updates.executorId !== undefined) {
        updateData.executorId = updates.executorId;
      }

      // Handle status changes and timing
      if (
        updates.status &&
        updates.status !==
          reverseStatusMapping[existingTask.status as keyof typeof reverseStatusMapping]
      ) {
        // Validate story completion requirements
        if (updates.status === 'completed' && existingTask.taskType === TaskTypeEnum.STORY) {
          // Check if story has BDD scenarios
          const bddScenarios = await db.bDDScenario.findMany({
            where: { taskId: req.params.id },
          });

          if (bddScenarios.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message:
                'Story cannot be completed without at least one BDD scenario. Please add BDD scenarios first.',
              code: 'STORY_MISSING_BDD_SCENARIOS',
            });
          }

          // Check if scenarios have linked tests
          const scenariosWithoutTests = bddScenarios.filter(
            scenario => !scenario.playwrightTestFile || !scenario.playwrightTestName
          );

          if (scenariosWithoutTests.length > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: `Story cannot be completed with ${scenariosWithoutTests.length} BDD scenario(s) that are not linked to E2E tests. Please link all scenarios to Playwright tests.`,
              code: 'STORY_SCENARIOS_NOT_LINKED',
              details: {
                unlinkedScenarios: scenariosWithoutTests.map(s => ({ id: s.id, title: s.title })),
              },
            });
          }

          // Check if all linked tests have passed
          const failedOrPendingScenarios = bddScenarios.filter(
            scenario => scenario.status !== BDDScenarioStatusEnum.PASSED
          );

          if (failedOrPendingScenarios.length > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: `Story cannot be completed with ${failedOrPendingScenarios.length} BDD scenario(s) that have not passed. All scenarios must pass their tests.`,
              code: 'STORY_SCENARIOS_NOT_PASSED',
              details: {
                nonPassedScenarios: failedOrPendingScenarios.map(s => ({
                  id: s.id,
                  title: s.title,
                  status: reverseBddStatusMapping[s.status as keyof typeof reverseBddStatusMapping],
                })),
              },
            });
          }
        }

        updateData.status = statusMapping[updates.status];

        if (updates.status === 'in_progress' && existingTask.status === TaskStatusEnum.PENDING) {
          updateData.startTime = new Date();
        } else if (
          updates.status === 'completed' &&
          existingTask.status === TaskStatusEnum.IN_PROGRESS
        ) {
          const endTime = new Date();
          updateData.endTime = endTime;
          // Duration is calculated dynamically, no need to store it
        } else if (updates.status === 'completed' && !existingTask.startTime) {
          // If completing a task that was never started
          updateData.startTime = new Date();
          updateData.endTime = new Date();
          // Duration is calculated dynamically, no need to store it
        }
      }

      const updatedDbTask = await db.task.update({
        where: { id: req.params.id },
        data: updateData,
      });

      logger.info('Task updated:', {
        taskId: updatedDbTask.id,
        status: updatedDbTask.status,
      });
      res.json({
        success: true,
        data: {
          id: updatedDbTask.id,
          content: updatedDbTask.content ?? updatedDbTask.title,
          status: reverseStatusMapping[
            updatedDbTask.status as keyof typeof reverseStatusMapping
          ] as ApiTask['status'],
          priority: reversePriorityMapping[
            updatedDbTask.priority as keyof typeof reversePriorityMapping
          ] as ApiTask['priority'],
          taskType: (updatedDbTask.taskType ?? TaskTypeEnum.TASK) as ApiTask['taskType'],
          executorId: updatedDbTask.executorId ?? undefined,
          startTime: updatedDbTask.startTime?.toISOString(),
          endTime: updatedDbTask.endTime?.toISOString(),
          duration: calculateDuration(
            updatedDbTask.startTime?.toISOString(),
            updatedDbTask.endTime?.toISOString()
          ),
        },
      });
    } catch (error) {
      logger.error('Error updating task:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to update task' });
    }
  };
}

function createDeleteTaskHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();
      const existingTask = await db.task.findUnique({
        where: { id: req.params.id },
      });

      if (!existingTask) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Task not found' });
      }

      await db.task.delete({
        where: { id: req.params.id },
      });

      logger.info('Task deleted:', { taskId: existingTask.id, content: existingTask.content });
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      logger.error('Error deleting task:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to delete task' });
    }
  };
}

function createCreateScenarioHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const { title, feature, description, gherkinContent, status = 'pending' } = req.body;

      if (!title?.trim() || !feature?.trim() || !gherkinContent?.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Title, feature, and gherkin content are required',
        });
      }

      const db = getDatabaseService();

      // Verify task exists
      const existingTask = await db.task.findUnique({
        where: { id: req.params.id },
      });

      if (!existingTask) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Task not found' });
      }

      const dbStatus = bddStatusMapping[status] || BDDScenarioStatusEnum.PENDING;

      const scenario = await db.bDDScenario.create({
        data: {
          taskId: req.params.id,
          title: title.trim(),
          feature: feature.trim(),
          description: description?.trim() ?? '',
          gherkinContent: gherkinContent.trim(),
          status: dbStatus,
        },
      });

      logger.info('BDD scenario created:', { taskId: req.params.id, scenarioId: scenario.id });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          id: scenario.id,
          title: scenario.title,
          feature: scenario.feature,
          description: scenario.description,
          gherkinContent: scenario.gherkinContent,
          status: reverseBddStatusMapping[scenario.status as keyof typeof reverseBddStatusMapping],
          executedAt: scenario.executedAt?.toISOString(),
          executionDuration: scenario.executionDuration,
          errorMessage: scenario.errorMessage,
        },
      });
    } catch (error) {
      logger.error('Error creating BDD scenario:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to create BDD scenario' });
    }
  };
}

function createUpdateScenarioHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();

      // Verify task exists
      const existingTask = await db.task.findUnique({
        where: { id: req.params.id },
      });

      if (!existingTask) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Task not found' });
      }

      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          taskId: req.params.id,
        },
      });

      if (!existingScenario) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Scenario not found' });
      }

      const updates = req.body;
      const updateData: {
        title?: string;
        feature?: string;
        description?: string;
        gherkinContent?: string;
        status?: BDDScenarioStatusValue;
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
        updateData.description = updates.description?.trim() ?? '';
      }

      if (updates.gherkinContent !== undefined) {
        updateData.gherkinContent = updates.gherkinContent.trim();
      }

      if (updates.status !== undefined) {
        updateData.status = bddStatusMapping[updates.status] || existingScenario.status;

        // If status is being set to passed or failed, record execution time
        if (
          (updates.status === 'passed' || updates.status === 'failed') &&
          existingScenario.status === BDDScenarioStatusEnum.PENDING
        ) {
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
        data: updateData,
      });

      logger.info('BDD scenario updated:', {
        taskId: req.params.id,
        scenarioId: req.params.scenarioId,
      });

      res.json({
        success: true,
        data: {
          id: updatedScenario.id,
          title: updatedScenario.title,
          feature: updatedScenario.feature,
          description: updatedScenario.description,
          gherkinContent: updatedScenario.gherkinContent,
          status:
            reverseBddStatusMapping[updatedScenario.status as keyof typeof reverseBddStatusMapping],
          executedAt: updatedScenario.executedAt?.toISOString(),
          executionDuration: updatedScenario.executionDuration,
          errorMessage: updatedScenario.errorMessage,
        },
      });
    } catch (error) {
      logger.error('Error updating BDD scenario:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to update BDD scenario' });
    }
  };
}

function createDeleteScenarioHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();

      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          taskId: req.params.id,
        },
      });

      if (!existingScenario) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Scenario not found' });
      }

      await db.bDDScenario.delete({
        where: { id: req.params.scenarioId },
      });

      logger.info('BDD scenario deleted:', {
        taskId: req.params.id,
        scenarioId: req.params.scenarioId,
      });
      res.json({ success: true, message: 'BDD scenario deleted successfully' });
    } catch (error) {
      logger.error('Error deleting BDD scenario:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to delete BDD scenario' });
    }
  };
}

function createGetExecutionsHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();
      const { limit = '50', offset = '0' } = req.query;

      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          taskId: req.params.id,
        },
      });

      if (!existingScenario) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Scenario not found' });
      }

      const executions = await db.bDDScenarioExecution.findMany({
        where: { scenarioId: req.params.scenarioId },
        orderBy: { executedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const executionsResponse = executions.map(execution => ({
        id: execution.id,
        scenarioId: execution.scenarioId,
        status: reverseBddStatusMapping[execution.status as keyof typeof reverseBddStatusMapping],
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
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch execution history' });
    }
  };
}

function createCreateExecutionHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const {
        status,
        executionDuration,
        errorMessage,
        stepResults,
        environment = 'dev',
        executedBy = 'system',
      } = req.body;

      if (!status) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Status is required',
        });
      }

      const db = getDatabaseService();

      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          taskId: req.params.id,
        },
      });

      if (!existingScenario) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Scenario not found' });
      }

      const dbStatus = bddStatusMapping[status] || BDDScenarioStatusEnum.PENDING;

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
        },
      });

      // Update the scenario's current status and execution details
      await db.bDDScenario.update({
        where: { id: req.params.scenarioId },
        data: {
          status: dbStatus,
          executedAt: execution.executedAt,
          executionDuration,
          errorMessage,
        },
      });

      logger.info('BDD execution recorded:', {
        taskId: req.params.id,
        scenarioId: req.params.scenarioId,
        executionId: execution.id,
        status: status,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          id: execution.id,
          scenarioId: execution.scenarioId,
          status: reverseBddStatusMapping[execution.status as keyof typeof reverseBddStatusMapping],
          executedAt: execution.executedAt.toISOString(),
          executionDuration: execution.executionDuration,
          errorMessage: execution.errorMessage,
          stepResults: execution.stepResults ? JSON.parse(execution.stepResults) : undefined,
          environment: execution.environment,
          executedBy: execution.executedBy,
          gherkinSnapshot: execution.gherkinSnapshot,
        },
      });
    } catch (error) {
      logger.error('Error creating execution record:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to create execution record' });
    }
  };
}

function createGetScenarioAnalyticsHandler(logger: ILogger) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const db = getDatabaseService();
      const { days = '30' } = req.query;

      // Verify scenario exists and belongs to task
      const existingScenario = await db.bDDScenario.findFirst({
        where: {
          id: req.params.scenarioId,
          taskId: req.params.id,
        },
      });

      if (!existingScenario) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: 'Scenario not found' });
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      const executions = await db.bDDScenarioExecution.findMany({
        where: {
          scenarioId: req.params.scenarioId,
          executedAt: { gte: daysAgo },
        },
        orderBy: { executedAt: 'desc' },
      });

      const totalExecutions = executions.length;
      const passedExecutions = executions.filter(e => e.status === BDDScenarioStatusEnum.PASSED).length;
      const failedExecutions = executions.filter(e => e.status === BDDScenarioStatusEnum.FAILED).length;
      const skippedExecutions = executions.filter(
        e => e.status === BDDScenarioStatusEnum.SKIPPED
      ).length;

      const successRate = totalExecutions > 0 ? (passedExecutions / totalExecutions) * 100 : 0;

      const executionsWithDuration = executions.filter(e => e.executionDuration);
      const averageDuration =
        executionsWithDuration.length > 0
          ? executionsWithDuration.reduce((sum, e) => sum + (e.executionDuration ?? 0), 0) /
            executionsWithDuration.length
          : 0;

      // Group executions by day for trend analysis
      interface DailyStats {
        date: string;
        total: number;
        passed: number;
        failed: number;
        skipped: number;
      }

      const dailyStats = executions.reduce(
        (acc, execution) => {
          const date = execution.executedAt.toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { date, total: 0, passed: 0, failed: 0, skipped: 0 };
          }
          acc[date].total++;
          if (execution.status === BDDScenarioStatusEnum.PASSED) {
            acc[date].passed++;
          }
          if (execution.status === BDDScenarioStatusEnum.FAILED) {
            acc[date].failed++;
          }
          if (execution.status === BDDScenarioStatusEnum.SKIPPED) {
            acc[date].skipped++;
          }
          return acc;
        },
        {} as Record<string, DailyStats>
      );

      res.json({
        success: true,
        data: {
          summary: {
            totalExecutions,
            passedExecutions,
            failedExecutions,
            skippedExecutions,
            successRate: Math.round(successRate * 100) / 100,
            averageDuration: Math.round(averageDuration),
          },
          trends: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
          recentExecutions: executions.slice(0, 10).map(execution => ({
            id: execution.id,
            status:
              reverseBddStatusMapping[execution.status as keyof typeof reverseBddStatusMapping],
            executedAt: execution.executedAt.toISOString(),
            executionDuration: execution.executionDuration,
            errorMessage: execution.errorMessage,
            environment: execution.environment,
            executedBy: execution.executedBy,
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching execution analytics:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch execution analytics' });
    }
  };
}

export function createTasksRoutes(logger: ILogger): express.Router {
  const router = express.Router();

  // Main task routes
  router.get('/', validateQuery(GetTasksQuerySchema), createGetAllTasksHandler(logger));
  router.get('/analytics', createGetTaskAnalyticsHandler(logger));
  router.get('/:id', validateParams(GetTaskParamsSchema), createGetTaskByIdHandler(logger));
  router.post('/', validateRequest(CreateTaskRequestSchema), createCreateTaskHandler(logger));
  router.put(
    '/:id',
    validateParams(UpdateTaskParamsSchema),
    validateRequest(UpdateTaskRequestSchema),
    createUpdateTaskHandler(logger)
  );
  router.delete('/:id', validateParams(DeleteTaskParamsSchema), createDeleteTaskHandler(logger));

  // BDD Scenario routes
  router.post(
    '/:id/scenarios',
    validateParams(CreateScenarioParamsSchema),
    validateRequest(CreateScenarioRequestSchema),
    createCreateScenarioHandler(logger)
  );
  router.put(
    '/:id/scenarios/:scenarioId',
    validateParams(UpdateScenarioParamsSchema),
    validateRequest(UpdateScenarioRequestSchema),
    createUpdateScenarioHandler(logger)
  );
  router.delete(
    '/:id/scenarios/:scenarioId',
    validateParams(DeleteScenarioParamsSchema),
    createDeleteScenarioHandler(logger)
  );

  // BDD Scenario Execution History routes
  router.get(
    '/:id/scenarios/:scenarioId/executions',
    validateParams(GetExecutionsParamsSchema),
    createGetExecutionsHandler(logger)
  );
  router.post(
    '/:id/scenarios/:scenarioId/executions',
    validateParams(ExecuteScenarioParamsSchema),
    validateRequest(ExecuteScenarioRequestSchema),
    createCreateExecutionHandler(logger)
  );
  router.get(
    '/:id/scenarios/:scenarioId/analytics',
    validateParams(GetScenarioAnalyticsParamsSchema),
    createGetScenarioAnalyticsHandler(logger)
  );

  return router;
}

// Default export for backward compatibility
export default createTasksRoutes;
