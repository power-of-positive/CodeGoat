import fs from 'fs/promises';
import path from 'path';
import { ILogger } from '../logger-interface';
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

  constructor(logger: ILogger) {
    this.logger = logger;
    this.sessionsPath = path.join(process.cwd(), 'validation-sessions.json');
    this.metricsPath = path.join(process.cwd(), 'validation-metrics.json');
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
  async getAnalytics(): Promise<DevelopmentAnalytics> {
    const sessions = await this.loadAllSessions();

    if (sessions.length === 0) {
      return this.getEmptyAnalytics();
    }

    const successfulSessions = sessions.filter(s => s.finalSuccess);
    const successRate = (successfulSessions.length / sessions.length) * 100;

    const averageTimeToSuccess = this.calculateAverageTimeToSuccess(successfulSessions);
    const averageAttemptsToSuccess = this.calculateAverageAttemptsToSuccess(successfulSessions);
    const stageSuccessRates = this.calculateStageSuccessRates(sessions);
    const mostFailedStage = this.findMostFailedStage(stageSuccessRates);
    const dailyStats = this.calculateDailyStats(sessions);

    return {
      totalSessions: sessions.length,
      successRate,
      averageTimeToSuccess,
      averageAttemptsToSuccess,
      mostFailedStage,
      stageSuccessRates,
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
      dailyStats: {},
    };
  }

  private calculateAverageTimeToSuccess(successfulSessions: SessionMetrics[]): number {
    if (successfulSessions.length === 0) return 0;
    return successfulSessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0) / successfulSessions.length;
  }

  private calculateAverageAttemptsToSuccess(successfulSessions: SessionMetrics[]): number {
    if (successfulSessions.length === 0) return 0;
    return successfulSessions.reduce((sum, s) => sum + s.attempts.length, 0) / successfulSessions.length;
  }

  private calculateStageSuccessRates(sessions: SessionMetrics[]): Record<string, { attempts: number; successes: number; rate: number }> {
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

    const stageSuccessRates: Record<string, { attempts: number; successes: number; rate: number }> = {};
    Object.entries(stageStats).forEach(([stageId, stats]) => {
      stageSuccessRates[stageId] = {
        ...stats,
        rate: (stats.successes / stats.attempts) * 100,
      };
    });

    return stageSuccessRates;
  }

  private findMostFailedStage(stageSuccessRates: Record<string, { rate: number }>): string {
    return Object.entries(stageSuccessRates).sort((a, b) => a[1].rate - b[1].rate)[0]?.[0] || 'none';
  }

  private calculateDailyStats(sessions: SessionMetrics[]): Record<string, { sessions: number; successes: number; totalTime: number }> {
    const dailyStats: Record<string, { sessions: number; successes: number; totalTime: number }> = {};
    
    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { sessions: 0, successes: 0, totalTime: 0 };
      }
      dailyStats[date].sessions++;
      if (session.finalSuccess) {
        dailyStats[date].successes++;
      }
      dailyStats[date].totalTime += session.totalDuration || 0;
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
    const sessions = await this.loadAllSessions();
    return sessions.sort((a, b) => b.startTime - a.startTime).slice(0, limit);
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
      return sessions.find(s => s.sessionId === sessionId) || null;
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
}
