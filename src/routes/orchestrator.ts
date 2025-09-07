import express from 'express';
import type { ILogger } from '../logger-interface';
import {
  ClaudeTaskOrchestrator,
  OrchestratorOptions,
  TaskExecutionResult,
} from '../utils/claude-task-orchestrator';
import { getLogger } from '../logger-singleton';
import { WinstonLogger } from '../logger-winston';
import { PermissionManager } from '../utils/permissions';
import { createDatabaseService, getDatabaseService } from '../services/database';
import { orchestratorStreamManager } from '../utils/orchestrator-stream';
import { Priority, Task, TaskStatus, TaskType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Global orchestrator instance
let globalOrchestrator: ClaudeTaskOrchestrator | null = null;
let globalOrchestratorLogger: ILogger | null = null;

// Removed unused OrchestratorStatus interface

interface ApiOrchestratorOptions {
  maxRetries?: number;
  maxTaskRetries?: number;
  validationTimeout?: number;
  enableValidation?: boolean;
  claudeCommand?: string;
  enableWorktrees?: boolean;
  pollInterval?: number;
  filterPriority?: 'high' | 'medium' | 'low';
}

interface ExecutePromptRequest {
  prompt: string;
  options?: ApiOrchestratorOptions;
}

interface StartOrchestratorRequest {
  options?: ApiOrchestratorOptions;
}

/**
 * Create task filter based on priority
 */
function createTaskFilter(
  filterPriority?: 'high' | 'medium' | 'low'
): ((task: Task) => boolean) | undefined {
  if (!filterPriority) {
    return undefined;
  }

  const priorityMap = {
    high: Priority.HIGH,
    medium: Priority.MEDIUM,
    low: Priority.LOW,
  };

  const targetPriority = priorityMap[filterPriority];
  return (task: Task) => task.priority === targetPriority;
}

/**
 * Create orchestrator with options
 */
function createOrchestrator(
  options: ApiOrchestratorOptions,
  logger: ILogger
): ClaudeTaskOrchestrator {
  const permissionConfig = {
    rules: [],
    defaultAllow: true,
    enableLogging: true,
    strictMode: false,
  };
  const permissionManager = new PermissionManager(permissionConfig, logger as WinstonLogger);
  const taskFilter = createTaskFilter(options.filterPriority);

  const orchestratorOptions: OrchestratorOptions = {
    claudeCommand: options.claudeCommand ?? 'claude',
    maxRetries: options.maxRetries ?? 3,
    maxTaskRetries: options.maxTaskRetries ?? 2,
    validationTimeout: options.validationTimeout ?? 300000, // 5 minutes
    enableValidation: options.enableValidation !== false,
    enableWorktrees: options.enableWorktrees ?? false,
    continuousMode: true,
    pollInterval: options.pollInterval ?? 5000,
    taskFilter,
    permissionManager,
  };

  return new ClaudeTaskOrchestrator(orchestratorOptions, logger as WinstonLogger);
}

/**
 * Generate next CODEGOAT task ID
 */
async function generateNextTaskId(): Promise<string> {
  const db = getDatabaseService();

  const tasks = await db.task.findMany({
    where: {
      id: { startsWith: 'CODEGOAT-' },
    },
    orderBy: { id: 'desc' },
    take: 1,
  });

  let nextNumber = 1;
  if (tasks.length > 0) {
    const lastId = tasks[0].id;
    const numberMatch = lastId.match(/CODEGOAT-(\d+)/);
    if (numberMatch) {
      nextNumber = parseInt(numberMatch[1], 10) + 1;
    }
  }

  return `CODEGOAT-${nextNumber.toString().padStart(3, '0')}`;
}

export function createOrchestratorRoutes(logger: ILogger) {
  // Initialize database service
  createDatabaseService(logger as WinstonLogger);

  // GET /api/orchestrator/stream - Server-Sent Events stream for real-time updates
  router.get('/stream', (req, res) => {
    try {
      const clientId = uuidv4();
      const sessionId = req.query.sessionId as string | undefined;

      logger.info('New SSE client connected', { clientId, sessionId });

      // Add client to stream manager
      orchestratorStreamManager.addClient(clientId, res, sessionId);
    } catch (error) {
      logger.error('Error setting up SSE stream:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to setup stream',
      });
    }
  });

  // GET /api/orchestrator/stream/info - Get stream information
  router.get('/stream/info', (req, res) => {
    try {
      const sessionId = req.query.sessionId as string | undefined;
      const clientCount = orchestratorStreamManager.getClientCount(sessionId);
      const activeSessions = orchestratorStreamManager.getActiveSessions();

      res.json({
        success: true,
        data: {
          clientCount,
          activeSessions,
          sessionFilter: sessionId,
        },
      });
    } catch (error) {
      logger.error('Error getting stream info:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get stream info',
      });
    }
  });

  // GET /api/orchestrator/status - Get orchestrator status
  router.get('/status', (req, res) => {
    try {
      if (!globalOrchestrator) {
        return res.json({
          success: true,
          data: {
            isRunning: false,
            shouldStop: false,
            enableValidation: true,
            maxRetries: 3,
            maxTaskRetries: 2,
            message: 'Orchestrator not started',
          },
        });
      }

      const status = globalOrchestrator.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      logger.error('Error getting orchestrator status:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get orchestrator status',
      });
    }
  });

  // POST /api/orchestrator/start - Start orchestrator in continuous mode
  router.post('/start', (req, res) => {
    try {
      if (globalOrchestrator?.getStatus().isRunning) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'Orchestrator is already running',
        });
      }

      const { options = {} }: StartOrchestratorRequest = req.body;

      // Create orchestrator logger if needed
      globalOrchestratorLogger ??= getLogger({
        level: 'info',
        enableConsole: true,
        enableFile: true,
        logsDir: './logs',
      });

      // Create and start orchestrator
      globalOrchestrator = createOrchestrator(options, globalOrchestratorLogger);

      // Start in background
      globalOrchestrator.start().catch(error => {
        logger.error('Orchestrator error during continuous operation:', error as Error);
      });

      logger.info('Orchestrator started via API', { options });

      res.status(HTTP_STATUS.ACCEPTED).json({
        success: true,
        message: 'Orchestrator started in continuous mode',
        data: globalOrchestrator.getStatus(),
      });
    } catch (error) {
      logger.error('Error starting orchestrator:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to start orchestrator',
      });
    }
  });

  // POST /api/orchestrator/stop - Stop orchestrator
  router.post('/stop', async (req, res) => {
    try {
      if (!globalOrchestrator) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Orchestrator is not running',
        });
      }

      await globalOrchestrator.stop();
      globalOrchestrator = null;

      logger.info('Orchestrator stopped via API');

      res.json({
        success: true,
        message: 'Orchestrator stopped',
      });
    } catch (error) {
      logger.error('Error stopping orchestrator:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to stop orchestrator',
      });
    }
  });

  // POST /api/orchestrator/execute - Execute single prompt
  router.post('/execute', async (req, res) => {
    try {
      const { prompt, options = {} }: ExecutePromptRequest = req.body;

      if (!prompt?.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Prompt is required',
        });
      }

      // Create temporary orchestrator for single execution
      const tempLogger = getLogger({
        level: 'info',
        enableConsole: true,
        enableFile: true,
        logsDir: './logs',
      });

      const orchestrator = createOrchestrator(options, tempLogger);

      // Create task for prompt
      const db = getDatabaseService();
      const taskId = await generateNextTaskId();

      await db.task.create({
        data: {
          id: taskId,
          title: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
          content: prompt,
          status: TaskStatus.PENDING,
          priority: Priority.HIGH,
          taskType: 'TASK' as TaskType,
        },
      });

      logger.info('Created task for prompt execution', { taskId, promptLength: prompt.length });

      // Execute single cycle
      const result = await orchestrator.runSingleCycle();

      // Format response
      const executionResult = {
        taskId,
        prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
        success: result.success,
        metrics: result.metrics,
        totalDuration: result.totalDuration,
        completedTasks: result.completedTasks.map((taskResult: TaskExecutionResult) => ({
          taskId: taskResult.task.id,
          attempts: taskResult.attempts,
          totalDuration: taskResult.totalDuration,
          validationRuns: taskResult.validationResults.length,
          claudeExecutions: taskResult.claudeResults.length,
        })),
        failedTasks: result.failedTasks.map((taskResult: TaskExecutionResult) => ({
          taskId: taskResult.task.id,
          error: taskResult.error,
          attempts: taskResult.attempts,
          totalDuration: taskResult.totalDuration,
          validationRuns: taskResult.validationResults.length,
          claudeExecutions: taskResult.claudeResults.length,
        })),
      };

      res.json({
        success: true,
        data: executionResult,
      });
    } catch (error) {
      logger.error('Error executing prompt:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to execute prompt',
      });
    }
  });

  // POST /api/orchestrator/cycle - Run single orchestrator cycle
  router.post('/cycle', async (req, res) => {
    try {
      const { options = {} }: { options?: ApiOrchestratorOptions } = req.body;

      // Create temporary orchestrator for single cycle
      const tempLogger = getLogger({
        level: 'info',
        enableConsole: true,
        enableFile: true,
        logsDir: './logs',
      });

      const orchestrator = createOrchestrator(options, tempLogger);

      // Execute single cycle
      const result = await orchestrator.runSingleCycle();

      // Format response
      const cycleResult = {
        success: result.success,
        metrics: result.metrics,
        totalDuration: result.totalDuration,
        totalValidationRuns: result.totalValidationRuns,
        completedTasks: result.completedTasks.map((taskResult: TaskExecutionResult) => ({
          taskId: taskResult.task.id,
          taskContent:
            taskResult.task.content?.substring(0, 100) +
            (taskResult.task.content && taskResult.task.content.length > 100 ? '...' : ''),
          attempts: taskResult.attempts,
          totalDuration: taskResult.totalDuration,
          validationRuns: taskResult.validationResults.length,
          claudeExecutions: taskResult.claudeResults.length,
        })),
        failedTasks: result.failedTasks.map((taskResult: TaskExecutionResult) => ({
          taskId: taskResult.task.id,
          taskContent:
            taskResult.task.content?.substring(0, 100) +
            (taskResult.task.content && taskResult.task.content.length > 100 ? '...' : ''),
          error: taskResult.error,
          attempts: taskResult.attempts,
          totalDuration: taskResult.totalDuration,
          validationRuns: taskResult.validationResults.length,
          claudeExecutions: taskResult.claudeResults.length,
        })),
      };

      res.json({
        success: true,
        data: cycleResult,
      });
    } catch (error) {
      logger.error('Error running orchestrator cycle:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to run orchestrator cycle',
      });
    }
  });

  // GET /api/orchestrator/metrics - Get orchestrator metrics
  router.get('/metrics', async (req, res) => {
    try {
      const db = getDatabaseService();
      const { days = '7' } = req.query;

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      // Get validation runs from the last N days
      const validationRuns = await db.validationRun.findMany({
        where: {
          createdAt: { gte: daysAgo },
          sessionId: { contains: 'orchestrator-' },
        },
        include: {
          task: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate metrics
      const totalRuns = validationRuns.length;
      const successfulRuns = validationRuns.filter(run => run.success).length;
      const failedRuns = totalRuns - successfulRuns;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      const averageDuration =
        totalRuns > 0
          ? validationRuns.reduce((sum, run) => sum + (run.totalTime ?? 0), 0) / totalRuns
          : 0;

      const averageStages =
        totalRuns > 0
          ? validationRuns.reduce((sum, run) => sum + (run.totalStages ?? 0), 0) / totalRuns
          : 0;

      // Group by day for trend analysis
      const dailyMetrics: {
        [key: string]: { date: string; runs: number; successful: number; failed: number };
      } = {};

      validationRuns.forEach(run => {
        const date = run.createdAt.toISOString().split('T')[0];
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = { date, runs: 0, successful: 0, failed: 0 };
        }
        dailyMetrics[date].runs++;
        if (run.success) {
          dailyMetrics[date].successful++;
        } else {
          dailyMetrics[date].failed++;
        }
      });

      const trendData = Object.values(dailyMetrics).sort((a, b) => a.date.localeCompare(b.date));

      // Get task statistics
      const tasksProcessed = new Set(validationRuns.map(run => run.taskId)).size;

      res.json({
        success: true,
        data: {
          summary: {
            totalValidationRuns: totalRuns,
            successfulRuns,
            failedRuns,
            successRate: Math.round(successRate * 100) / 100,
            averageDuration: Math.round(averageDuration),
            averageStages: Math.round(averageStages * 10) / 10,
            tasksProcessed,
            periodDays: parseInt(days as string),
          },
          trends: trendData,
          recentRuns: validationRuns.slice(0, 20).map(run => ({
            id: run.id,
            taskId: run.taskId,
            taskContent:
              run.task?.content?.substring(0, 80) +
              (run.task?.content && run.task.content.length > 80 ? '...' : ''),
            success: run.success,
            totalStages: run.totalStages,
            passedStages: run.passedStages,
            failedStages: run.failedStages,
            totalDuration: run.totalTime,
            createdAt: run.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching orchestrator metrics:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch orchestrator metrics',
      });
    }
  });

  return router;
}
