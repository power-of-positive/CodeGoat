import type {
  SessionMetrics,
  ValidationStageMetrics,
  DevelopmentAnalytics,
} from '../types/analytics.types';

/**
 * Utility class for converting validation metrics to analytics data
 */
export class ValidationMetricsConverter {
  /**
   * Convert validation metrics to session-like objects for display
   */
  private static convertMetricToSession(
    metric: Record<string, unknown>,
    index: number
  ): SessionMetrics {
    const timestamp = metric.timestamp as string;
    const totalTime = (metric.totalTime as number) || 0;
    const totalStages = (metric.totalStages as number) || 0;
    const success = Boolean(metric.success);
    const stages = Array.isArray(metric.stages) ? metric.stages : [];

    return {
      sessionId: `validation_${new Date(timestamp).getTime()}_${index}`,
      startTime: new Date(timestamp).getTime(),
      endTime: new Date(timestamp).getTime() + totalTime,
      totalDuration: totalTime,
      userPrompt: 'Validation Run',
      taskDescription: `Validation pipeline execution (${success ? 'Success' : 'Failed'})`,
      attempts: [
        {
          attempt: 1,
          timestamp,
          startTime: new Date(timestamp).getTime(),
          totalTime,
          totalStages,
          passed: (metric.passed as number) || 0,
          failed: (metric.failed as number) || 0,
          success,
          stages: stages.map(
            (stage: Record<string, unknown>): ValidationStageMetrics => ({
              id: (stage.id as string) || 'unknown',
              name: (stage.name as string) || (stage.id as string) || 'Unknown Stage',
              success: Boolean(stage.success),
              duration: (stage.duration as number) || 0,
              attempt: 1,
              output: (stage.output as string) || undefined,
              error: (stage.error as string) || undefined,
            })
          ),
        },
      ],
      finalSuccess: success,
      totalValidationTime: totalTime,
      averageStageTime: totalStages > 0 ? totalTime / totalStages : 0,
    };
  }

  static convertToSessions(
    validationMetrics: Record<string, unknown>[],
    limit: number
  ): SessionMetrics[] {
    const recentMetrics = validationMetrics
      .sort(
        (a, b) =>
          new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()
      )
      .slice(0, limit);

    return recentMetrics.map((metric, index) => this.convertMetricToSession(metric, index));
  }

  /**
   * Calculate analytics from validation metrics data
   */
  static calculateAnalytics(metrics: Record<string, unknown>[]): DevelopmentAnalytics {
    if (metrics.length === 0) {
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

    const totalAttempts = metrics.length;
    const successfulAttempts = metrics.filter(m => m.success === true);
    const successRate = (successfulAttempts.length / totalAttempts) * 100;

    const averageTimeToSuccess = this.calculateAverageTime(successfulAttempts);
    const averageAttemptsToSuccess = successfulAttempts.length > 0 ? 1 : 0;
    const stageSuccessRates = this.calculateStageSuccessRates(metrics);
    const averageStageTime = this.calculateAverageStageTime(metrics);
    const mostFailedStage = this.findMostFailedStage(stageSuccessRates);
    const dailyStats = this.calculateDailyStats(metrics);

    return {
      totalSessions: totalAttempts,
      successRate,
      averageTimeToSuccess,
      averageAttemptsToSuccess,
      mostFailedStage,
      stageSuccessRates,
      averageStageTime,
      dailyStats,
    };
  }

  private static calculateAverageTime(successfulAttempts: Record<string, unknown>[]): number {
    if (successfulAttempts.length === 0) {
      return 0;
    }
    const totalTime = successfulAttempts.reduce(
      (sum, m) => sum + ((m.totalTime as number) || 0),
      0
    );
    return totalTime / successfulAttempts.length;
  }

  private static calculateStageSuccessRates(
    metrics: Record<string, unknown>[]
  ): Record<string, { attempts: number; successes: number; rate: number }> {
    const stageStats: Record<string, { attempts: number; successes: number }> = {};

    metrics.forEach(metric => {
      if (metric.stages && Array.isArray(metric.stages)) {
        metric.stages.forEach((stage: Record<string, unknown>) => {
          const stageId = stage.id as string;
          if (!stageStats[stageId]) {
            stageStats[stageId] = { attempts: 0, successes: 0 };
          }
          stageStats[stageId].attempts++;
          if (stage.success) {
            stageStats[stageId].successes++;
          }
        });
      }
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

  private static calculateAverageStageTime(
    metrics: Record<string, unknown>[]
  ): Record<string, number> {
    const stageTimeStats: Record<string, { totalTime: number; count: number }> = {};

    metrics.forEach(metric => {
      const stages = Array.isArray(metric.stages) ? metric.stages : [];
      stages.forEach((stage: Record<string, unknown>) => {
        const stageId = (stage.id as string) || 'unknown';
        const duration = (stage.duration as number) || 0;

        if (!stageTimeStats[stageId]) {
          stageTimeStats[stageId] = { totalTime: 0, count: 0 };
        }
        stageTimeStats[stageId].totalTime += duration;
        stageTimeStats[stageId].count++;
      });
    });

    const averageStageTime: Record<string, number> = {};
    Object.entries(stageTimeStats).forEach(([stageId, stats]) => {
      averageStageTime[stageId] = stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0;
    });

    return averageStageTime;
  }

  private static findMostFailedStage(stageSuccessRates: Record<string, { rate: number }>): string {
    return (
      Object.entries(stageSuccessRates).sort((a, b) => a[1].rate - b[1].rate)[0]?.[0] || 'none'
    );
  }

  private static calculateDailyStats(
    metrics: Record<string, unknown>[]
  ): Record<string, { sessions: number; successes: number; totalTime: number }> {
    const dailyStats: Record<string, { sessions: number; successes: number; totalTime: number }> =
      {};

    metrics.forEach(metric => {
      const timestamp = metric.timestamp as string;
      if (!timestamp) {
        return;
      } // Skip invalid timestamps

      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return;
      } // Skip invalid dates

      const dateStr = date.toISOString().split('T')[0];
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = { sessions: 0, successes: 0, totalTime: 0 };
      }
      dailyStats[dateStr].sessions++;
      if (metric.success) {
        dailyStats[dateStr].successes++;
      }
      dailyStats[dateStr].totalTime += (metric.totalTime as number) || 0;
    });

    return dailyStats;
  }
}
