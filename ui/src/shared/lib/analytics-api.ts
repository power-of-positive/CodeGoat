import { apiRequest, buildQueryParams } from './api-base';
import { ValidationRun, ValidationResult } from '../types/index';

export interface StageAnalytics {
  stageName: string;
  totalRuns: number;
  successRate: number;
  averageDuration: number;
  recentTrend: 'up' | 'down' | 'stable';
}

export interface AnalyticsData {
  totalRuns: number;
  successRate: number;
  averageDuration: number;
  stages: StageAnalytics[];
  recentRuns: ValidationRun[];
}

export const analyticsApi = {
  async getValidationMetrics(): Promise<AnalyticsData> {
    try {
      return await apiRequest<AnalyticsData>('/analytics/validation-metrics');
    } catch (error) {
      console.error('Failed to fetch validation metrics:', error);
      // Return default analytics data
      return {
        totalRuns: 0,
        successRate: 0,
        averageDuration: 0,
        stages: [],
        recentRuns: [],
      };
    }
  },

  async getValidationRuns(options?: {
    limit?: number;
    offset?: number;
    todoTaskId?: string;
  }): Promise<ValidationRun[]> {
    try {
      const queryParams = buildQueryParams(options || {});
      return await apiRequest<ValidationRun[]>(`/analytics/validation-runs${queryParams}`);
    } catch (error) {
      console.error('Failed to fetch validation runs:', error);
      return [];
    }
  },

  async getStageHistory(options?: {
    days?: number;
    stage?: string;
    limit?: number;
    offset?: number;
  }): Promise<ValidationRun[]> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<ValidationRun[]>(`/analytics/stage-history${queryParams}`);
  },

  async getStageStatistics(options?: {
    days?: number;
    stage?: string;
    includeDetails?: boolean;
  }): Promise<unknown> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<unknown>(`/analytics/stage-statistics${queryParams}`);
  },

  async getStageAnalytics(options?: {
    days?: number;
    stages?: string[];
    format?: string;
  }): Promise<unknown> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<unknown>(`/analytics/stages${queryParams}`);
  },

  async getValidationRunsFromDB(options?: {
    limit?: number;
    offset?: number;
    todoTaskId?: string;
    withStages?: boolean;
  }): Promise<ValidationRun[]> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<ValidationRun[]>(`/analytics/validation-runs-db${queryParams}`);
  },

  async getValidationRunDetailsFromDB(runId: string): Promise<ValidationResult[]> {
    return apiRequest<ValidationResult[]>(`/analytics/validation-run-details/${runId}`);
  },

  async getPerformanceComparison(options?: {
    days?: number;
    compareWith?: number;
    stages?: string[];
  }): Promise<unknown> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<unknown>(`/analytics/performance-comparison${queryParams}`);
  },

  async getHistoricalTimeline(options?: {
    days?: number;
    granularity?: 'hour' | 'day' | 'week';
    stages?: string[];
  }): Promise<unknown> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<unknown>(`/analytics/historical-timeline${queryParams}`);
  },
};