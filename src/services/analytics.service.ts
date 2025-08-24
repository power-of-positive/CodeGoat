import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '../logger-interface';
import { ValidationMetricsConverter } from '../utils/validation-metrics-converter';
import type {
  SessionMetrics,
  ValidationAttemptMetrics,
  DevelopmentAnalytics,
} from '../types/analytics.types';

// Re-export types for backward compatibility
export type {
  ValidationStageMetrics,
  SessionMetrics,
  ValidationAttemptMetrics,
  DevelopmentAnalytics,
} from '../types/analytics.types';

export class AnalyticsService {
  private sessionsPath: string;
  private metricsPath: string;
  private logger: ILogger;
  private db: PrismaClient;

  constructor(logger: ILogger, sessionsPath?: string, metricsPath?: string) {
    this.logger = logger;
    this.sessionsPath = sessionsPath ?? path.join(process.cwd(), 'validation-sessions.json');
    this.metricsPath = metricsPath ?? path.join(process.cwd(), 'validation-metrics.json');
    this.db = new PrismaClient();
  }

  /**
   * Start a new development session
   */
  async startSession(userPrompt?: string, taskDescription?: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: SessionMetrics = {
      sessionId,
      startTime: Date.now(),
      userPrompt,
      taskDescription,
      attempts: [],
      finalSuccess: false,
      totalValidationTime: 0,
      averageStageTime: 0,
    };

    await this.saveSession(session);
    this.logger.info('Development session started', { sessionId, userPrompt, taskDescription });

    return sessionId;
  }

  /**
   * End a development session
   */
  async endSession(sessionId: string, success: boolean): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const endTime = Date.now();
    session.endTime = endTime;
    session.totalDuration = endTime - session.startTime;
    session.finalSuccess = success;

    // Calculate total validation time and average stage time
    session.totalValidationTime = session.attempts.reduce(
      (total, attempt) => total + attempt.totalTime,
      0
    );
    const totalStages = session.attempts.reduce((total, attempt) => total + attempt.totalStages, 0);
    session.averageStageTime = totalStages > 0 ? session.totalValidationTime / totalStages : 0;

    await this.saveSession(session);

    this.logger.info('Development session ended', {
      sessionId,
      success,
      totalDuration: session.totalDuration,
      attempts: session.attempts.length,
      totalValidationTime: session.totalValidationTime,
    });
  }

  /**
   * Record a validation attempt for a session
   */
  async recordValidationAttempt(
    sessionId: string,
    attempt: ValidationAttemptMetrics
  ): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    attempt.attempt = session.attempts.length + 1;
    session.attempts.push(attempt);

    await this.saveSession(session);

    this.logger.info('Validation attempt recorded', {
      sessionId,
      attempt: attempt.attempt,
      success: attempt.success,
      totalTime: attempt.totalTime,
      stages: attempt.stages.length,
    });
  }

  /**
   * Get current development analytics
   */
  async getAnalytics(agentFilter?: string): Promise<DevelopmentAnalytics> {
    // First try to load sessions data (for backward compatibility and tests)
    let sessions = await this.loadAllSessions();
    
    // Filter sessions by agent if specified
    if (agentFilter && sessions.length > 0) {
      sessions = sessions.filter(session => 
        (session.userPrompt?.includes(agentFilter) ?? false) || 
        (session.taskDescription?.includes(agentFilter) ?? false) ||
        (session as SessionMetrics & { agent?: string }).agent === agentFilter
      );
    }
    
    if (sessions.length > 0) {
      return this.calculateAnalyticsFromSessions(sessions);
    }

    // Try to load validation metrics data (existing production data)
    let validationMetrics = await this.loadValidationMetrics();
    
    // Filter validation metrics by agent if specified
    if (agentFilter && validationMetrics.length > 0) {
      validationMetrics = validationMetrics.filter(metric => {
        const metricRecord = metric as Record<string, unknown> & { 
          agent?: string; 
          userPrompt?: string; 
          taskDescription?: string; 
        };
        return metricRecord.agent === agentFilter || 
               (metricRecord.userPrompt?.includes(agentFilter) ?? false) ||
               metricRecord.taskDescription?.includes(agentFilter);
      });
    }
    
    if (validationMetrics.length > 0) {
      return ValidationMetricsConverter.calculateAnalytics(validationMetrics);
    }

    return this.getEmptyAnalytics();
  }

  private calculateAnalyticsFromSessions(sessions: SessionMetrics[]): DevelopmentAnalytics {
    const successfulSessions = sessions.filter(s => s.finalSuccess);
    const successRate = (successfulSessions.length / sessions.length) * 100;

    const averageTimeToSuccess = this.calculateAverageTimeToSuccess(successfulSessions);
    const averageAttemptsToSuccess = this.calculateAverageAttemptsToSuccess(successfulSessions);
    const stageSuccessRates = this.calculateStageSuccessRates(sessions);
    const averageStageTime = this.calculateAverageStageTime(sessions);
    const mostFailedStage = this.findMostFailedStage(stageSuccessRates);
    const dailyStats = this.calculateDailyStats(sessions);

    return {
      totalSessions: sessions.length,
      successRate,
      averageTimeToSuccess,
      averageAttemptsToSuccess,
      mostFailedStage,
      stageSuccessRates,
      averageStageTime,
      dailyStats,
    };
  }

  private getEmptyAnalytics(): DevelopmentAnalytics {
    return {
      totalSessions: 0,
      successRate: 0,
      averageTimeToSuccess: 0,
      averageAttemptsToSuccess: 0,
      mostFailedStage: 'none',
      stageSuccessRates: {},
      averageStageTime: {},
      dailyStats: {},
    };
  }

  private calculateAverageTimeToSuccess(successfulSessions: SessionMetrics[]): number {
    if (successfulSessions.length === 0) {
      return 0;
    }
    return (
      successfulSessions.reduce((sum, s) => sum + (s.totalValidationTime ?? 0), 0) /
      successfulSessions.length
    );
  }

  private calculateAverageAttemptsToSuccess(successfulSessions: SessionMetrics[]): number {
    if (successfulSessions.length === 0) {
      return 0;
    }
    return (
      successfulSessions.reduce((sum, s) => sum + s.attempts.length, 0) / successfulSessions.length
    );
  }

  private calculateStageSuccessRates(
    sessions: SessionMetrics[]
  ): Record<string, { attempts: number; successes: number; rate: number }> {
    const stageStats: Record<string, { attempts: number; successes: number }> = {};

    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        attempt.stages.forEach(stage => {
          if (!stageStats[stage.id]) {
            stageStats[stage.id] = { attempts: 0, successes: 0 };
          }
          stageStats[stage.id].attempts++;
          if (stage.success) {
            stageStats[stage.id].successes++;
          }
        });
      });
    });

    const stageSuccessRates: Record<string, { attempts: number; successes: number; rate: number }> =
      {};
    Object.entries(stageStats).forEach(([stageId, stats]) => {
      stageSuccessRates[stageId] = {
        ...stats,
        rate: (stats.successes / stats.attempts) * 100,
      };
    });

    return stageSuccessRates;
  }

  private calculateAverageStageTime(sessions: SessionMetrics[]): Record<string, number> {
    const stageTimeStats: Record<string, { totalTime: number; count: number }> = {};

    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        attempt.stages.forEach(stage => {
          if (!stageTimeStats[stage.id]) {
            stageTimeStats[stage.id] = { totalTime: 0, count: 0 };
          }
          stageTimeStats[stage.id].totalTime += stage.duration;
          stageTimeStats[stage.id].count++;
        });
      });
    });

    const averageStageTime: Record<string, number> = {};
    Object.entries(stageTimeStats).forEach(([stageId, stats]) => {
      averageStageTime[stageId] = stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0;
    });

    return averageStageTime;
  }

  private findMostFailedStage(stageSuccessRates: Record<string, { rate: number }>): string {
    return (
      Object.entries(stageSuccessRates).sort((a, b) => a[1].rate - b[1].rate)[0]?.[0] || 'none'
    );
  }

  private calculateDailyStats(
    sessions: SessionMetrics[]
  ): Record<string, { sessions: number; successes: number; totalTime: number }> {
    const dailyStats: Record<string, { sessions: number; successes: number; totalTime: number }> =
      {};

    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { sessions: 0, successes: 0, totalTime: 0 };
      }
      dailyStats[date].sessions++;
      if (session.finalSuccess) {
        dailyStats[date].successes++;
      }
      dailyStats[date].totalTime += session.totalDuration ?? 0;
    });

    return dailyStats;
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<SessionMetrics | null> {
    return this.loadSession(sessionId);
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<SessionMetrics[]> {
    // First try to get sessions data (for backward compatibility and tests)
    const sessions = await this.loadAllSessions();
    if (sessions.length > 0) {
      return sessions.sort((a, b) => b.startTime - a.startTime).slice(0, limit);
    }

    // Fallback to creating session-like objects from validation metrics
    const validationMetrics = await this.loadValidationMetrics();
    if (validationMetrics.length === 0) {
      return [];
    }

    return ValidationMetricsConverter.convertToSessions(validationMetrics, limit);
  }

  /**
   * Clean up old sessions (keep only last N sessions)
   */
  async cleanupSessions(keepLast: number = 100): Promise<void> {
    const sessions = await this.loadAllSessions();
    if (sessions.length <= keepLast) {
      return;
    }

    const recentSessions = sessions.sort((a, b) => b.startTime - a.startTime).slice(0, keepLast);

    await this.saveAllSessions(recentSessions);

    this.logger.info('Sessions cleaned up', {
      totalSessions: sessions.length,
      keptSessions: recentSessions.length,
      removedSessions: sessions.length - recentSessions.length,
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadSession(sessionId: string): Promise<SessionMetrics | null> {
    try {
      const sessions = await this.loadAllSessions();
      return sessions.find(s => s.sessionId === sessionId) ?? null;
    } catch {
      return null;
    }
  }

  private async loadAllSessions(): Promise<SessionMetrics[]> {
    try {
      const content = await fs.readFile(this.sessionsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async saveSession(session: SessionMetrics): Promise<void> {
    const sessions = await this.loadAllSessions();
    const existingIndex = sessions.findIndex(s => s.sessionId === session.sessionId);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await this.saveAllSessions(sessions);
  }

  private async saveAllSessions(sessions: SessionMetrics[]): Promise<void> {
    try {
      await fs.writeFile(this.sessionsPath, JSON.stringify(sessions, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to save sessions', error as Error);
      throw new Error('Failed to save sessions');
    }
  }

  /**
   * Load validation metrics from validation-metrics.json
   */
  private async loadValidationMetrics(): Promise<Record<string, unknown>[]> {
    try {
      const content = await fs.readFile(this.metricsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Get detailed stage history over time
   */
  async getStageHistory(
    stageId: string,
    days: number = 30
  ): Promise<{
    dailyMetrics: Array<{
      date: string;
      attempts: number;
      successes: number;
      failures: number;
      successRate: number;
      averageDuration: number;
      totalDuration: number;
    }>;
    trends: {
      successRateTrend: number; // percentage point change from start to end
      durationTrend: number; // ms change from start to end
      totalAttempts: number;
      totalSuccesses: number;
    };
  }> {
    const sessions = await this.loadAllSessions();
    const validationMetrics = await this.loadValidationMetrics();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Collect stage data from sessions
    const stageData = new Map<
      string,
      {
        attempts: number;
        successes: number;
        totalDuration: number;
        durations: number[];
      }
    >();

    // Process sessions data
    sessions.forEach(session => {
      if (session.startTime < cutoffDate.getTime()) {
        return;
      }

      session.attempts.forEach(attempt => {
        attempt.stages.forEach(stage => {
          if (stage.id !== stageId) {
            return;
          }

          const date = new Date(session.startTime).toISOString().split('T')[0];
          const dayData = stageData.get(date) ?? {
            attempts: 0,
            successes: 0,
            totalDuration: 0,
            durations: [],
          };

          dayData.attempts++;
          dayData.totalDuration += stage.duration;
          dayData.durations.push(stage.duration);

          if (stage.success) {
            dayData.successes++;
          }

          stageData.set(date, dayData);
        });
      });
    });

    // Process validation metrics data if no sessions data
    if (sessions.length === 0 && validationMetrics.length > 0) {
      validationMetrics.forEach(metric => {
        const metricRecord = metric as {
          timestamp: string;
          stages?: { id: string; success: boolean; duration?: number }[];
        };
        const metricDate = new Date(metricRecord.timestamp);
        if (metricDate < cutoffDate) {
          return;
        }

        const stages = metricRecord.stages ?? [];
        const targetStage = stages.find(s => s.id === stageId);

        if (targetStage) {
          const date = metricDate.toISOString().split('T')[0];
          const dayData = stageData.get(date) ?? {
            attempts: 0,
            successes: 0,
            totalDuration: 0,
            durations: [],
          };

          dayData.attempts++;
          dayData.totalDuration += targetStage.duration ?? 0;
          dayData.durations.push(targetStage.duration ?? 0);

          if (targetStage.success) {
            dayData.successes++;
          }

          stageData.set(date, dayData);
        }
      });
    }

    // Convert to daily metrics array
    const dailyMetrics = Array.from(stageData.entries())
      .map(([date, data]) => ({
        date,
        attempts: data.attempts,
        successes: data.successes,
        failures: data.attempts - data.successes,
        successRate: data.attempts > 0 ? (data.successes / data.attempts) * 100 : 0,
        averageDuration:
          data.durations.length > 0
            ? data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length
            : 0,
        totalDuration: data.totalDuration,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate trends
    const totalAttempts = dailyMetrics.reduce((sum, day) => sum + day.attempts, 0);
    const totalSuccesses = dailyMetrics.reduce((sum, day) => sum + day.successes, 0);

    let successRateTrend = 0;
    let durationTrend = 0;

    if (dailyMetrics.length >= 2) {
      const firstDay = dailyMetrics[0];
      const lastDay = dailyMetrics[dailyMetrics.length - 1];

      successRateTrend = lastDay.successRate - firstDay.successRate;
      durationTrend = lastDay.averageDuration - firstDay.averageDuration;
    }

    return {
      dailyMetrics,
      trends: {
        successRateTrend,
        durationTrend,
        totalAttempts,
        totalSuccesses,
      },
    };
  }

  /**
   * Get comprehensive stage statistics
   */
  async getStageStatistics(stageId: string): Promise<{
    overview: {
      totalAttempts: number;
      totalSuccesses: number;
      totalFailures: number;
      successRate: number;
      averageDuration: number;
      medianDuration: number;
      minDuration: number;
      maxDuration: number;
      standardDeviation: number;
    };
    recentRuns: Array<{
      timestamp: string;
      success: boolean;
      duration: number;
      sessionId?: string;
      output?: string;
      error?: string;
    }>;
    performanceMetrics: {
      durationsPercentiles: {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
      };
      successRateByTimeOfDay: Record<string, { attempts: number; successes: number; rate: number }>;
      failureReasons: Record<string, number>;
    };
  }> {
    const sessions = await this.loadAllSessions();
    const validationMetrics = await this.loadValidationMetrics();

    const allRuns: Array<{
      timestamp: string;
      success: boolean;
      duration: number;
      sessionId?: string;
      output?: string;
      error?: string;
    }> = [];

    // Collect data from sessions
    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        attempt.stages.forEach(stage => {
          if (stage.id !== stageId) {
            return;
          }

          allRuns.push({
            timestamp: new Date(session.startTime).toISOString(),
            success: stage.success,
            duration: stage.duration,
            sessionId: session.sessionId,
            output: stage.output,
            error: stage.error,
          });
        });
      });
    });

    // Collect data from validation metrics if no sessions
    if (sessions.length === 0 && validationMetrics.length > 0) {
      validationMetrics.forEach(metric => {
        const metricRecord = metric as {
          timestamp: string;
          stages?: {
            id: string;
            success: boolean;
            duration?: number;
            output?: string;
            error?: string;
          }[];
        };
        const stages = metricRecord.stages ?? [];
        const targetStage = stages.find(s => s.id === stageId);

        if (targetStage) {
          allRuns.push({
            timestamp: metricRecord.timestamp,
            success: targetStage.success,
            duration: targetStage.duration ?? 0,
            output: targetStage.output,
            error: targetStage.error,
          });
        }
      });
    }

    // Sort runs by timestamp (most recent first)
    allRuns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate overview statistics
    const totalAttempts = allRuns.length;
    const totalSuccesses = allRuns.filter(run => run.success).length;
    const totalFailures = totalAttempts - totalSuccesses;
    const successRate = totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;

    const durations = allRuns.map(run => run.duration).filter(d => d > 0);
    const averageDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    // Calculate statistical measures
    let medianDuration = 0;
    let minDuration = 0;
    let maxDuration = 0;
    let standardDeviation = 0;

    if (durations.length > 0) {
      const sortedDurations = [...durations].sort((a, b) => a - b);
      medianDuration = sortedDurations[Math.floor(sortedDurations.length / 2)];
      minDuration = sortedDurations[0];
      maxDuration = sortedDurations[sortedDurations.length - 1];

      // Standard deviation
      const variance =
        durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / durations.length;
      standardDeviation = Math.sqrt(variance);
    }

    // Calculate percentiles
    const durationsPercentiles = {
      p50: medianDuration,
      p90: 0,
      p95: 0,
      p99: 0,
    };

    if (durations.length > 0) {
      const sortedDurations = [...durations].sort((a, b) => a - b);
      durationsPercentiles.p90 = sortedDurations[Math.floor(sortedDurations.length * 0.9)];
      durationsPercentiles.p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
      durationsPercentiles.p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];
    }

    // Success rate by time of day
    const successRateByTimeOfDay: Record<
      string,
      { attempts: number; successes: number; rate: number }
    > = {};
    allRuns.forEach(run => {
      const hour = new Date(run.timestamp).getHours();
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;

      if (!successRateByTimeOfDay[timeSlot]) {
        successRateByTimeOfDay[timeSlot] = { attempts: 0, successes: 0, rate: 0 };
      }

      successRateByTimeOfDay[timeSlot].attempts++;
      if (run.success) {
        successRateByTimeOfDay[timeSlot].successes++;
      }
    });

    // Calculate rates
    Object.values(successRateByTimeOfDay).forEach(timeSlot => {
      timeSlot.rate = timeSlot.attempts > 0 ? (timeSlot.successes / timeSlot.attempts) * 100 : 0;
    });

    // Analyze failure reasons (simple keyword extraction from error messages)
    const failureReasons: Record<string, number> = {};
    allRuns
      .filter(run => !run.success && run.error)
      .forEach(run => {
        const error = run.error?.toLowerCase() ?? '';

        // Common error patterns
        const patterns = [
          { keyword: 'timeout', reason: 'Timeout' },
          { keyword: 'compilation', reason: 'Compilation Error' },
          { keyword: 'type', reason: 'Type Error' },
          { keyword: 'test', reason: 'Test Failure' },
          { keyword: 'lint', reason: 'Linting Error' },
          { keyword: 'network', reason: 'Network Error' },
          { keyword: 'permission', reason: 'Permission Error' },
          { keyword: 'not found', reason: 'File Not Found' },
          { keyword: 'syntax', reason: 'Syntax Error' },
        ];

        let categorized = false;
        for (const pattern of patterns) {
          if (error.includes(pattern.keyword)) {
            failureReasons[pattern.reason] = (failureReasons[pattern.reason] || 0) + 1;
            categorized = true;
            break;
          }
        }

        if (!categorized) {
          failureReasons['Other'] = (failureReasons['Other'] || 0) + 1;
        }
      });

    return {
      overview: {
        totalAttempts,
        totalSuccesses,
        totalFailures,
        successRate,
        averageDuration,
        medianDuration,
        minDuration,
        maxDuration,
        standardDeviation,
      },
      recentRuns: allRuns.slice(0, 50), // Last 50 runs
      performanceMetrics: {
        durationsPercentiles,
        successRateByTimeOfDay,
        failureReasons,
      },
    };
  }

  /**
   * Get validation runs from the database
   */
  async getValidationRuns(limit: number = 50, todoTaskId?: string): Promise<Array<{
    id: string;
    timestamp: Date;
    success: boolean;
    duration: number;
    todoTaskId?: string;
    stages: Array<{
      id: string;
      name: string;
      success: boolean;
      duration: number;
      output?: string;
      error?: string;
    }>;
  }>> {
    try {
      const validationRuns = await this.db.validationRun.findMany({
        where: todoTaskId ? { taskId: todoTaskId } : undefined,
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          task: true,
          stages: {
            orderBy: { order: 'asc' }
          }
        },
      });

      return validationRuns.map(run => ({
        id: run.id,
        timestamp: run.timestamp,
        success: run.success,
        duration: run.totalTime, // Use totalTime from new schema
        todoTaskId: run.taskId ?? undefined, // Keep for API compatibility
        stages: (run.stages || []).map(stage => ({
          id: stage.stageId,
          name: stage.stageName,
          success: stage.success,
          duration: stage.duration,
          output: stage.output || undefined,
          error: stage.errorMessage || undefined,
        })), // Transform stages to match expected interface
      }));
    } catch (error) {
      this.logger.error('Failed to get validation runs from database', error as Error);
      return [];
    }
  }

  /**
   * Get validation run statistics from database
   */
  async getValidationRunStatistics(days: number = 30): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    successRate: number;
    averageDuration: number;
    recentTrend: {
      totalRuns: number;
      successRate: number;
    };
    stageStatistics: Record<string, {
      totalAttempts: number;
      successfulAttempts: number;
      successRate: number;
      averageDuration: number;
    }>;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const validationRuns = await this.db.validationRun.findMany({
        where: {
          timestamp: {
            gte: cutoffDate,
          },
        },
        include: {
          stages: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { timestamp: 'desc' },
      });

      const totalRuns = validationRuns.length;
      const successfulRuns = validationRuns.filter(run => run.success).length;
      const failedRuns = totalRuns - successfulRuns;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
      const averageDuration = totalRuns > 0 
        ? validationRuns.reduce((sum, run) => sum + run.totalTime, 0) / totalRuns 
        : 0;

      // Calculate recent trend (last 7 days vs previous 7 days)
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 7);
      
      const recentRuns = validationRuns.filter(run => run.timestamp >= recentCutoff);

      const recentTrend = {
        totalRuns: recentRuns.length,
        successRate: recentRuns.length > 0 
          ? (recentRuns.filter(run => run.success).length / recentRuns.length) * 100 
          : 0,
      };

      // Calculate stage statistics
      const stageStatistics: Record<string, {
        totalAttempts: number;
        successfulAttempts: number;
        successRate: number;
        averageDuration: number;
      }> = {};

      validationRuns.forEach(run => {
        const stages = run.stages || [];

        stages.forEach(stage => {
          if (!stageStatistics[stage.stageId]) {
            stageStatistics[stage.stageId] = {
              totalAttempts: 0,
              successfulAttempts: 0,
              successRate: 0,
              averageDuration: 0,
            };
          }

          stageStatistics[stage.stageId].totalAttempts++;
          if (stage.success) {
            stageStatistics[stage.stageId].successfulAttempts++;
          }
        });
      });

      // Calculate final statistics for each stage
      Object.keys(stageStatistics).forEach(stageId => {
        const stats = stageStatistics[stageId];
        stats.successRate = stats.totalAttempts > 0 
          ? (stats.successfulAttempts / stats.totalAttempts) * 100 
          : 0;
        
        // Calculate average duration for this stage
        let totalDuration = 0;
        let durationCount = 0;
        
        validationRuns.forEach(run => {
          const stages = run.stages || [];
          
          stages.forEach(stage => {
            if (stage.stageId === stageId) {
              totalDuration += stage.duration;
              durationCount++;
            }
          });
        });

        stats.averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
      });

      return {
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate,
        averageDuration,
        recentTrend,
        stageStatistics,
      };
    } catch (error) {
      this.logger.error('Failed to get validation run statistics', error as Error);
      return {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: 0,
        averageDuration: 0,
        recentTrend: { totalRuns: 0, successRate: 0 },
        stageStatistics: {},
      };
    }
  }

  /**
   * Cleanup method to close database connection
   */
  async dispose(): Promise<void> {
    await this.db.$disconnect();
  }
}
