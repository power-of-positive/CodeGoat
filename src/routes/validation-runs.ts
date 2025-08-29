/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from 'express';
import { WinstonLogger } from '../logger-winston';
import { getDatabaseService } from '../services/database';

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Performance threshold constants
const PERFORMANCE_CONSTANTS = {
  EXCELLENT_THRESHOLD: 95,
  GOOD_THRESHOLD: 85,
  FAIR_THRESHOLD: 70,
  COMPLEXITY_LIMIT: 13,
} as const;

// Interface for API responses
interface ValidationRunResponse {
  id: string;
  taskId?: string;
  sessionId?: string;
  timestamp: string;
  startTime?: number;
  totalTime: number;
  totalStages: number;
  passedStages: number;
  failedStages: number;
  success: boolean;
  triggerType?: string;
  environment?: string;
  gitCommit?: string;
  gitBranch?: string;
  stages: ValidationStageResponse[];
}

interface ValidationStageResponse {
  id: string;
  stageId: string;
  stageName: string;
  success: boolean;
  duration: number;
  command?: string;
  exitCode?: number;
  output?: string;
  errorMessage?: string;
  enabled: boolean;
  continueOnFailure: boolean;
  order: number;
}

interface ValidationLogResponse {
  id: string;
  stageId?: string;
  level: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function createValidationRunRoutes(logger: WinstonLogger) {
  const router = express.Router();

  // GET /api/validation-runs - Get all validation runs with pagination
  router.get('/', async (req: Request, res: Response) => {
    try {
      const db = getDatabaseService();
      const { 
        page = '1', 
        limit = '10', 
        success, 
        environment,
        taskId,
        startDate,
        endDate 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build where clause based on filters
      const where: Record<string, unknown> = {};
      
      if (success !== undefined) {
        where.success = success === 'true';
      }
      
      if (environment) {
        where.environment = environment;
      }
      
      if (taskId) {
        where.taskId = taskId;
      }
      
      if (startDate || endDate) {
        const timestampFilter: { gte?: Date; lte?: Date } = {};
        if (startDate) {
          timestampFilter.gte = new Date(startDate as string);
        }
        if (endDate) {
          timestampFilter.lte = new Date(endDate as string);
        }
        where.timestamp = timestampFilter;
      }

      // Get total count for pagination
      const totalRuns = await db.validationRun.count({ where });

      // Get validation runs with stages
      const dbRuns = await db.validationRun.findMany({
        where,
        include: {
          stages: {
            orderBy: { order: 'asc' }
          },
          task: {
            select: {
              id: true,
              title: true,
              content: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limitNum,
      });

      const runs: ValidationRunResponse[] = dbRuns.map(dbRun => ({
        id: dbRun.id,
        taskId: dbRun.taskId ?? undefined,
        sessionId: dbRun.sessionId ?? undefined,
        timestamp: dbRun.timestamp.toISOString(),
        startTime: dbRun.startTime ? Number(dbRun.startTime) : undefined,
        totalTime: Number(dbRun.totalTime),
        totalStages: dbRun.totalStages,
        passedStages: dbRun.passedStages,
        failedStages: dbRun.failedStages,
        success: dbRun.success,
        triggerType: dbRun.triggerType ?? undefined,
        environment: dbRun.environment ?? undefined,
        gitCommit: dbRun.gitCommit ?? undefined,
        gitBranch: dbRun.gitBranch ?? undefined,
        stages: dbRun.stages.map(stage => ({
          id: stage.id,
          stageId: stage.stageId,
          stageName: stage.stageName,
          success: stage.success,
          duration: Number(stage.duration),
          // Exclude large fields from list view to reduce payload size
          // Full output is available via GET /api/validation-runs/:id
          // command: stage.command ?? undefined,
          exitCode: stage.exitCode ?? undefined,
          // output: stage.output ?? undefined,
          errorMessage: stage.errorMessage ? stage.errorMessage.substring(0, 200) : undefined, // Truncate error messages
          enabled: stage.enabled,
          continueOnFailure: stage.continueOnFailure,
          order: stage.order,
        })),
      }));

      res.json({
        success: true,
        data: {
          runs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalRuns,
            totalPages: Math.ceil(totalRuns / limitNum),
            hasNext: offset + limitNum < totalRuns,
            hasPrev: pageNum > 1,
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching validation runs:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch validation runs' });
    }
  });

  // GET /api/validation-runs/:id - Get single validation run with full details
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const db = getDatabaseService();
      const dbRun = await db.validationRun.findUnique({
        where: { id: req.params.id },
        include: {
          stages: {
            orderBy: { order: 'asc' }
          },
          logs: {
            orderBy: { timestamp: 'asc' }
          },
          task: {
            select: {
              id: true,
              title: true,
              content: true
            }
          }
        }
      });

      if (!dbRun) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Validation run not found' });
      }

      const run: ValidationRunResponse & { logs: ValidationLogResponse[] } = {
        id: dbRun.id,
        taskId: dbRun.taskId ?? undefined,
        sessionId: dbRun.sessionId ?? undefined,
        timestamp: dbRun.timestamp.toISOString(),
        startTime: dbRun.startTime ? Number(dbRun.startTime) : undefined,
        totalTime: Number(dbRun.totalTime),
        totalStages: dbRun.totalStages,
        passedStages: dbRun.passedStages,
        failedStages: dbRun.failedStages,
        success: dbRun.success,
        triggerType: dbRun.triggerType ?? undefined,
        environment: dbRun.environment ?? undefined,
        gitCommit: dbRun.gitCommit ?? undefined,
        gitBranch: dbRun.gitBranch ?? undefined,
        stages: dbRun.stages.map(stage => ({
          id: stage.id,
          stageId: stage.stageId,
          stageName: stage.stageName,
          success: stage.success,
          duration: Number(stage.duration),
          command: stage.command ?? undefined,
          exitCode: stage.exitCode ?? undefined,
          output: stage.output ?? undefined,
          errorMessage: stage.errorMessage ?? undefined,
          enabled: stage.enabled,
          continueOnFailure: stage.continueOnFailure,
          order: stage.order,
        })),
        logs: dbRun.logs.map(log => ({
          id: log.id,
          stageId: log.stageId ?? undefined,
          level: log.level.toLowerCase(),
          message: log.message,
          timestamp: log.timestamp.toISOString(),
          metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
        }))
      };

      res.json({ success: true, data: run });
    } catch (error) {
      logger.error('Error fetching validation run:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch validation run' });
    }
  });

  // GET /api/validation-runs/analytics/summary - Get validation analytics
  router.get('/analytics/summary', async (req: Request, res: Response) => {
    try {
      const db = getDatabaseService();
      const { days = '30', environment } = req.query;
      
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      const whereClause: Record<string, unknown> = {
        timestamp: { gte: daysAgo }
      };
      
      if (environment) {
        whereClause.environment = environment;
      }

      // Get overall statistics
      const totalRuns = await db.validationRun.count({ where: whereClause });
      const successfulRuns = await db.validationRun.count({ 
        where: { ...whereClause, success: true } 
      });
      const failedRuns = totalRuns - successfulRuns;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      // Get average duration
      const avgDuration = await db.validationRun.aggregate({
        where: whereClause,
        _avg: { totalTime: true }
      });

      // Get stage statistics
      const stageStats = await db.validationStage.groupBy({
        by: ['stageId', 'stageName'],
        where: {
          run: whereClause
        },
        _count: {
          stageId: true
        },
        _sum: {
          duration: true
        },
        orderBy: {
          _count: {
            stageId: 'desc'
          }
        }
      });

      const stageSuccessStats = await db.validationStage.groupBy({
        by: ['stageId'],
        where: {
          run: whereClause,
          success: true
        },
        _count: {
          stageId: true
        }
      });

      // Combine stage statistics
      const enrichedStageStats = stageStats.map(stage => {
        const successCount = stageSuccessStats.find(s => s.stageId === stage.stageId)?._count.stageId ?? 0;
        const successRate = stage._count.stageId > 0 ? (successCount / stage._count.stageId) * 100 : 0;
        
        return {
          stageId: stage.stageId,
          stageName: stage.stageName,
          totalRuns: stage._count.stageId,
          successfulRuns: successCount,
          failedRuns: stage._count.stageId - successCount,
          successRate: Math.round(successRate * 100) / 100,
          totalDuration: Number(stage._sum.duration) || 0,
          avgDuration: stage._sum.duration && stage._count.stageId > 0 
            ? Math.round((Number(stage._sum.duration) / stage._count.stageId) * 100) / 100 
            : 0
        };
      });

      // Get daily run statistics
      const dailyStats = await db.validationRun.findMany({
        where: whereClause,
        select: {
          timestamp: true,
          success: true
        },
        orderBy: { timestamp: 'asc' }
      });

      // Group by day
      const dailyGroups = dailyStats.reduce((acc, run) => {
        const day = run.timestamp.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { total: 0, successful: 0, failed: 0 };
        }
        acc[day].total++;
        if (run.success) {
          acc[day].successful++;
        } else {
          acc[day].failed++;
        }
        return acc;
      }, {} as Record<string, { total: number; successful: number; failed: number }>);

      const dailyStatsArray = Object.entries(dailyGroups).map(([date, stats]) => ({
        date,
        ...stats,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
      }));

      res.json({
        success: true,
        data: {
          overview: {
            totalRuns,
            successfulRuns,
            failedRuns,
            successRate: Math.round(successRate * 100) / 100,
            averageDuration: Math.round((Number(avgDuration._avg.totalTime) || 0) * 100) / 100,
            period: `Last ${days} days`,
          },
          stageStatistics: enrichedStageStats,
          dailyTrends: dailyStatsArray.sort((a, b) => a.date.localeCompare(b.date)),
        }
      });
    } catch (error) {
      logger.error('Error fetching validation analytics:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch validation analytics' });
    }
  });

  // POST /api/validation-runs - Create new validation run (for future use)
  router.post('/', async (req: Request, res: Response) => {
    try {
      const db = getDatabaseService();
      const {
        taskId,
        sessionId,
        totalTime,
        stages,
        triggerType = 'api',
        environment = 'development',
        gitCommit,
        gitBranch
      } = req.body;

      if (!stages || !Array.isArray(stages)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          message: 'Stages array is required' 
        });
      }

      const totalStages = stages.length;
      const passedStages = stages.filter((s: { success: boolean }) => s.success).length;
      const failedStages = totalStages - passedStages;
      const success = failedStages === 0;

      // Create validation run and stages atomically in a transaction
      const result = await db.$transaction(async (tx) => {
        // Create validation run
        const validationRun = await tx.validationRun.create({
          data: {
            taskId: taskId ?? null,
            sessionId: sessionId ?? null,
            totalTime: totalTime ?? 0,
            totalStages,
            passedStages,
            failedStages,
            success,
            triggerType,
            environment,
            gitCommit: gitCommit ?? null,
            gitBranch: gitBranch ?? null,
          }
        });

        // Create validation stages in batch
        const stageData = stages.map((stage, i) => ({
          runId: validationRun.id,
          stageId: stage.stageId ?? stage.id,
          stageName: stage.stageName ?? stage.name,
          success: stage.success ?? false,
          duration: stage.duration ?? 0,
          command: stage.command ?? null,
          exitCode: stage.exitCode ?? null,
          output: stage.output ?? null,
          errorMessage: stage.errorMessage ?? stage.error ?? null,
          enabled: stage.enabled ?? true,
          continueOnFailure: stage.continueOnFailure ?? false,
          order: i + 1,
        }));

        const createdStages = await Promise.all(
          stageData.map(data => tx.validationStage.create({ data }))
        );

        return { validationRun, createdStages };
      });

      const { validationRun } = result;

      logger.info('Validation run created:', { 
        runId: validationRun.id, 
        stages: totalStages, 
        success 
      });
      
      res.status(HTTP_STATUS.CREATED).json({ 
        success: true, 
        data: {
          id: validationRun.id,
          success,
          totalStages,
          passedStages,
          failedStages
        }
      });
    } catch (error) {
      logger.error('Error creating validation run:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to create validation run' });
    }
  });

  // GET /api/validation-runs/analytics/stages - Get detailed stage analytics
  router.get('/analytics/stages', async (req: Request, res: Response) => {
    try {
      const db = getDatabaseService();
      const { 
        days = '30', 
        environment,
        stageId,
        startDate,
        endDate
      } = req.query;
      
      // Build date filter
      let dateFilter: Record<string, unknown> = {};
      if (startDate && endDate) {
        dateFilter = {
          timestamp: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        };
      } else if (days) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));
        dateFilter = {
          timestamp: { gte: daysAgo }
        };
      }

      const whereClause: Record<string, unknown> = dateFilter;
      if (environment) {
        whereClause.environment = environment;
      }

      // Get stage performance over time with detailed breakdown
      interface StageHistoryQuery {
        where: Record<string, unknown>;
        orderBy: Array<Record<string, unknown>>;
        include: Record<string, unknown>;
      }
      
      const stageHistoryQuery: StageHistoryQuery = {
        where: {
          run: whereClause
        },
        orderBy: [
          { run: { timestamp: 'asc' } },
          { order: 'asc' }
        ],
        include: {
          run: {
            select: {
              id: true,
              timestamp: true,
              success: true,
              environment: true,
              gitBranch: true
            }
          }
        }
      };

      if (stageId) {
        stageHistoryQuery.where = {
          ...stageHistoryQuery.where,
          stageId
        };
      }

      const stageHistory = await db.validationStage.findMany(stageHistoryQuery as any);

      // Get comprehensive stage statistics
      const stageStats = await db.validationStage.groupBy({
        by: ['stageId', 'stageName'],
        where: {
          run: whereClause
        },
        _count: { stageId: true },
        _sum: { duration: true },
        _min: { duration: true },
        _max: { duration: true },
        _avg: { duration: true }
      });

      const stageSuccessStats = await db.validationStage.groupBy({
        by: ['stageId'],
        where: {
          run: whereClause,
          success: true
        },
        _count: { stageId: true }
      });

      // Calculate detailed metrics for each stage
      const enrichedStageStats = stageStats.map(stage => {
        const successCount = stageSuccessStats.find(s => s.stageId === stage.stageId)?._count.stageId ?? 0;
        const failureCount = stage._count.stageId - successCount;
        const successRate = stage._count.stageId > 0 ? (successCount / stage._count.stageId) * 100 : 0;
        
        return {
          stageId: stage.stageId,
          stageName: stage.stageName,
          totalRuns: stage._count.stageId,
          successfulRuns: successCount,
          failedRuns: failureCount,
          successRate: Math.round(successRate * 100) / 100,
          totalDuration: Number(stage._sum.duration) || 0,
          avgDuration: Math.round((Number(stage._avg.duration) || 0) * 100) / 100,
          minDuration: Number(stage._min.duration) || 0,
          maxDuration: Number(stage._max.duration) || 0,
          reliability: successRate >= PERFORMANCE_CONSTANTS.EXCELLENT_THRESHOLD ? 'excellent' : 
                      successRate >= PERFORMANCE_CONSTANTS.GOOD_THRESHOLD ? 'good' : 
                      successRate >= PERFORMANCE_CONSTANTS.FAIR_THRESHOLD ? 'fair' : 'poor'
        };
      });

      // Group stage history by day for trend analysis
      interface DailyStageData {
        date: string;
        stageId: string;
        stageName: string;
        runs: typeof stageHistory;
        successCount: number;
        totalDuration: number;
      }
      
      const dailyStagePerformance = stageHistory.reduce((acc, stage) => {
        const stageWithRun = stage as any;
        const day = stageWithRun.run.timestamp.toISOString().split('T')[0];
        const stageKey = `${day}-${stage.stageId}`;
        
        if (!acc[stageKey]) {
          acc[stageKey] = {
            date: day,
            stageId: stage.stageId,
            stageName: stage.stageName,
            runs: [],
            successCount: 0,
            totalDuration: 0
          };
        }
        
        acc[stageKey].runs.push(stage);
        if (stage.success) {
          acc[stageKey].successCount++;
        }
        acc[stageKey].totalDuration += Number(stage.duration);
        
        return acc;
      }, {} as Record<string, DailyStageData>);

      const trendData = Object.values(dailyStagePerformance).map((data) => ({
        date: data.date,
        stageId: data.stageId,
        stageName: data.stageName,
        totalRuns: data.runs.length,
        successfulRuns: data.successCount,
        failedRuns: data.runs.length - data.successCount,
        successRate: data.runs.length > 0 ? (data.successCount / data.runs.length) * 100 : 0,
        avgDuration: data.runs.length > 0 ? data.totalDuration / data.runs.length : 0
      }));

      // Find most problematic stages (highest failure rates)
      const problematicStages = enrichedStageStats
        .filter(stage => stage.totalRuns >= 5) // Only consider stages with significant data
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 5);

      // Find best performing stages
      const topPerformingStages = enrichedStageStats
        .filter(stage => stage.totalRuns >= 5)
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5);

      // Calculate stage execution patterns
      const stageExecutionPattern = await db.validationRun.findMany({
        where: whereClause,
        select: {
          id: true,
          timestamp: true,
          stages: {
            select: {
              stageId: true,
              stageName: true,
              success: true,
              duration: true,
              order: true
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 100 // Latest 100 runs for pattern analysis
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalStages: enrichedStageStats.length,
            period: startDate && endDate ? 
              `${new Date(startDate as string).toLocaleDateString()} - ${new Date(endDate as string).toLocaleDateString()}` :
              `Last ${days} days`,
            totalStageExecutions: enrichedStageStats.reduce((sum, s) => sum + s.totalRuns, 0)
          },
          stageStatistics: enrichedStageStats.sort((a, b) => b.totalRuns - a.totalRuns),
          trends: trendData.sort((a, b) => `${a.date}-${a.stageId}`.localeCompare(`${b.date}-${b.stageId}`)),
          insights: {
            problematicStages,
            topPerformingStages,
            stageExecutionPattern: stageExecutionPattern.map(run => ({
              runId: run.id,
              timestamp: run.timestamp.toISOString(),
              stageSequence: run.stages.map(s => ({
                stageId: s.stageId,
                success: s.success,
                duration: s.duration
              }))
            }))
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching stage analytics:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch stage analytics' });
    }
  });

  // GET /api/validation-runs/analytics/history - Get historical timeline data
  router.get('/analytics/history', async (req: Request, res: Response) => {
    try {
      const db = getDatabaseService();
      const { 
        days = '30', 
        granularity = 'daily',
        environment,
        includeStages = 'true'
      } = req.query;
      
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      const whereClause: Record<string, any> = {
        timestamp: { 
          gte: daysAgo 
        }
      };
      
      if (environment) {
        whereClause.environment = environment;
      }

      // Get all validation runs in the time period
      interface RunsQuery {
        where: Record<string, unknown>;
        orderBy: { timestamp: 'asc' };
        include?: Record<string, unknown>;
        select?: Record<string, boolean>;
      }
      
      const runsQuery: RunsQuery = {
        where: whereClause,
        orderBy: { timestamp: 'asc' },
      };

      if (includeStages === 'true') {
        runsQuery.include = {
          stages: {
            orderBy: { order: 'asc' }
          }
        };
      } else {
        runsQuery.select = {
          id: true,
          timestamp: true,
          success: true,
          totalTime: true,
          totalStages: true,
          passedStages: true,
          failedStages: true,
          triggerType: true,
          environment: true,
          gitBranch: true
        };
      }

      const runs = await db.validationRun.findMany(runsQuery);

      // Convert BigInt values to numbers to avoid JSON serialization issues
      const convertedRuns = runs.map((run: any) => ({
        ...run,
        totalTime: Number(run.totalTime),
        startTime: run.startTime ? Number(run.startTime) : undefined,
        stages: run.stages ? run.stages.map((stage: any) => ({
          ...stage,
          duration: Number(stage.duration)
        })) : undefined
      }));

      // Group runs by time granularity
      const groupByGranularity = (timestamp: Date): string => {
        switch (granularity) {
          case 'hourly':
            return `${timestamp.toISOString().slice(0, PERFORMANCE_CONSTANTS.COMPLEXITY_LIMIT)}:00:00`;
          case 'daily':
            return timestamp.toISOString().split('T')[0];
          case 'weekly': {
            const weekStart = new Date(timestamp);
            weekStart.setDate(timestamp.getDate() - timestamp.getDay());
            return weekStart.toISOString().split('T')[0];
          }
          default:
            return timestamp.toISOString().split('T')[0];
        }
      };

      type TimelinePeriod = {
        timestamp: string;
        runs: typeof convertedRuns;
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        averageDuration: number;
        successRate: number;
        stagePerformance: Record<string, { success: number; total: number; avgDuration: number; successRate: number }>;
      };

      const timelineData = convertedRuns.reduce((acc, run) => {
        const timeKey = groupByGranularity(run.timestamp);
        
        acc[timeKey] ??= {
            timestamp: timeKey,
            runs: [],
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            averageDuration: 0,
            successRate: 0,
            stagePerformance: {} as Record<string, { success: number; total: number; avgDuration: number; successRate: number }>
          };

        acc[timeKey].runs.push(run);
        acc[timeKey].totalRuns++;
        if (run.success) {
          acc[timeKey].successfulRuns++;
        } else {
          acc[timeKey].failedRuns++;
        }

        // Calculate stage performance for this time period
        const runWithStages = run as any;
        if (runWithStages.stages) {
          runWithStages.stages.forEach((stage: any) => {
            const key = stage.stageId;
            acc[timeKey].stagePerformance[key] ??= { success: 0, total: 0, avgDuration: 0, successRate: 0 };
            acc[timeKey].stagePerformance[key].total++;
            if (stage.success) {
              acc[timeKey].stagePerformance[key].success++;
            }
            acc[timeKey].stagePerformance[key].avgDuration += Number(stage.duration);
          });
        }

        return acc;
      }, {} as Record<string, TimelinePeriod>);

      // Finalize calculations
      const timeline = (Object.values(timelineData) as TimelinePeriod[]).map((period: TimelinePeriod) => {
        // Calculate average duration for the period
        const totalDuration = period.runs.reduce((sum: number, run: any) => {
          return sum + Number(run.totalTime);
        }, 0);
        period.averageDuration = period.totalRuns > 0 ? totalDuration / period.totalRuns : 0;

        // Finalize stage performance calculations
        Object.keys(period.stagePerformance).forEach(stageId => {
          const perf = period.stagePerformance[stageId];
          perf.avgDuration = perf.total > 0 ? perf.avgDuration / perf.total : 0;
          perf.successRate = perf.total > 0 ? (perf.success / perf.total) * 100 : 0;
        });

        // Calculate success rate
        period.successRate = period.totalRuns > 0 ? (period.successfulRuns / period.totalRuns) * 100 : 0;

        return period;
      }).sort((a: TimelinePeriod, b: TimelinePeriod) => a.timestamp.localeCompare(b.timestamp));

      res.json({
        success: true,
        data: {
          timeline,
          summary: {
            totalPeriods: timeline.length,
            granularity,
            dateRange: {
              start: daysAgo.toISOString(),
              end: new Date().toISOString()
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching historical data:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch historical data' });
    }
  });

  // GET /api/validation-runs/analytics/comparison - Compare performance between periods
  router.get('/analytics/comparison', async (req: Request, res: Response) => {
    try {
      const db = getDatabaseService();
      const { 
        period1Start,
        period1End,
        period2Start,
        period2End,
        environment
      } = req.query;

      if (!period1Start || !period1End || !period2Start || !period2End) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          message: 'All period dates are required: period1Start, period1End, period2Start, period2End' 
        });
      }

      const buildWhereClause = (startDate: string, endDate: string) => {
        const where: Record<string, unknown> = {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        };
        if (environment) {
          where.environment = environment;
        }
        return where;
      };

      const period1Where = buildWhereClause(period1Start as string, period1End as string);
      const period2Where = buildWhereClause(period2Start as string, period2End as string);

      // Get statistics for both periods
      const [period1Stats, period2Stats] = await Promise.all([
        // Period 1 analytics
        Promise.all([
          db.validationRun.count({ where: period1Where }),
          db.validationRun.count({ where: { ...period1Where, success: true } }),
          db.validationRun.aggregate({ where: period1Where, _avg: { totalTime: true } }),
          db.validationStage.groupBy({
            by: ['stageId', 'stageName'],
            where: { run: period1Where },
            _count: { stageId: true },
            _avg: { duration: true }
          }),
          db.validationStage.groupBy({
            by: ['stageId'],
            where: { run: period1Where, success: true },
            _count: { stageId: true }
          })
        ]),
        // Period 2 analytics
        Promise.all([
          db.validationRun.count({ where: period2Where }),
          db.validationRun.count({ where: { ...period2Where, success: true } }),
          db.validationRun.aggregate({ where: period2Where, _avg: { totalTime: true } }),
          db.validationStage.groupBy({
            by: ['stageId', 'stageName'],
            where: { run: period2Where },
            _count: { stageId: true },
            _avg: { duration: true }
          }),
          db.validationStage.groupBy({
            by: ['stageId'],
            where: { run: period2Where, success: true },
            _count: { stageId: true }
          })
        ])
      ]);

      interface StageStats {
        stageId: string;
        stageName: string;
        _count: { stageId: number };
        _avg: { duration: number | null };
      }
      
      interface StageSuccesses {
        stageId: string;
        _count: { stageId: number };
      }
      
      const buildPeriodSummary = (
        totalRuns: number,
        successRuns: number,
        avgDuration: { _avg: { totalTime: number | null } },
        stageStats: StageStats[],
        stageSuccesses: StageSuccesses[]
      ) => {
        const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;
        
        const enrichedStages = stageStats.map(stage => {
          const successCount = stageSuccesses.find(s => s.stageId === stage.stageId)?._count.stageId ?? 0;
          const stageSuccessRate = stage._count.stageId > 0 ? (successCount / stage._count.stageId) * 100 : 0;
          
          return {
            stageId: stage.stageId,
            stageName: stage.stageName,
            totalRuns: stage._count.stageId,
            successfulRuns: successCount,
            successRate: Math.round(stageSuccessRate * 100) / 100,
            avgDuration: Math.round((Number(stage._avg.duration) || 0) * 100) / 100
          };
        });

        return {
          totalRuns,
          successfulRuns: successRuns,
          failedRuns: totalRuns - successRuns,
          successRate: Math.round(successRate * 100) / 100,
          avgDuration: Math.round((Number(avgDuration._avg.totalTime) || 0) * 100) / 100,
          stages: enrichedStages
        };
      };

      const period1Summary = buildPeriodSummary(...period1Stats);
      const period2Summary = buildPeriodSummary(...period2Stats);

      // Calculate comparison metrics
      const calculateChange = (current: number, previous: number): { value: number; percentage: number; trend: 'up' | 'down' | 'stable' } => {
        const change = current - previous;
        const percentage = previous > 0 ? (change / previous) * 100 : 0;
        const trend = Math.abs(percentage) < 1 ? 'stable' : percentage > 0 ? 'up' : 'down';
        
        return {
          value: Math.round(change * 100) / 100,
          percentage: Math.round(percentage * 100) / 100,
          trend
        };
      };

      const comparison = {
        successRate: calculateChange(period2Summary.successRate, period1Summary.successRate),
        avgDuration: calculateChange(period2Summary.avgDuration, period1Summary.avgDuration),
        totalRuns: calculateChange(period2Summary.totalRuns, period1Summary.totalRuns)
      };

      // Compare stage performance
      const stageComparisons = period1Summary.stages.map(p1Stage => {
        const p2Stage = period2Summary.stages.find(s => s.stageId === p1Stage.stageId);
        
        if (!p2Stage) {
          return {
            stageId: p1Stage.stageId,
            stageName: p1Stage.stageName,
            status: 'removed_in_period2' as const
          };
        }

        return {
          stageId: p1Stage.stageId,
          stageName: p1Stage.stageName,
          status: 'compared' as const,
          successRateChange: calculateChange(p2Stage.successRate, p1Stage.successRate),
          durationChange: calculateChange(p2Stage.avgDuration, p1Stage.avgDuration),
          runsChange: calculateChange(p2Stage.totalRuns, p1Stage.totalRuns)
        };
      });

      // Add stages that are new in period 2
      const newStages = period2Summary.stages
        .filter(p2Stage => !period1Summary.stages.find(s => s.stageId === p2Stage.stageId))
        .map(stage => ({
          stageId: stage.stageId,
          stageName: stage.stageName,
          status: 'new_in_period2' as const
        }));

      res.json({
        success: true,
        data: {
          periods: {
            period1: {
              label: `${new Date(period1Start as string).toLocaleDateString()} - ${new Date(period1End as string).toLocaleDateString()}`,
              ...period1Summary
            },
            period2: {
              label: `${new Date(period2Start as string).toLocaleDateString()} - ${new Date(period2End as string).toLocaleDateString()}`,
              ...period2Summary
            }
          },
          comparison: {
            overall: comparison,
            stages: [...stageComparisons, ...newStages]
          },
          insights: {
            improved: stageComparisons.filter(s => s.status === 'compared' && s.successRateChange.trend === 'up').length,
            degraded: stageComparisons.filter(s => s.status === 'compared' && s.successRateChange.trend === 'down').length,
            stable: stageComparisons.filter(s => s.status === 'compared' && s.successRateChange.trend === 'stable').length,
            newStages: newStages.length,
            removedStages: stageComparisons.filter(s => s.status === 'removed_in_period2').length
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching comparison data:', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch comparison data' });
    }
  });

  return router;
}