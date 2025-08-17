// Simple API client for validation analytics

import {
  Config,
  ValidationStage,
  ValidationRun,
  ValidationMetrics,
  ValidationStageResult,
  UserSystemInfo,
  ThemeMode,
  Task,
  PermissionRule,
  PermissionConfig,
  ActionType,
} from '../../shared/types';

// Internal API response types
interface SessionResponse {
  sessions: Array<{
    sessionId: string;
    startTime: string;
    finalSuccess: boolean;
    totalDuration?: number;
    attempts: Array<{
      stages: ValidationStageResult[];
    }>;
  }>;
}

interface StageSuccessRate {
  attempts: number;
  successes: number;
  rate: number;
}

interface AnalyticsResponse {
  totalSessions: number;
  successRate: number;
  averageTimeToSuccess?: number;
  stageSuccessRates?: Record<string, StageSuccessRate>;
  averageStageTime?: Record<string, number>;
}

interface StageMetric {
  id: string;
  name: string;
  enabled: boolean;
  attempts: number;
  successes: number;
  successRate: number;
  averageDuration: number;
  totalRuns: number;
}

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.success === false) {
    throw new Error(result.message || 'API request failed');
  }

  return result.data || result;
}

// Settings API
export const settingsApi = {
  getSettings: (): Promise<Config> => request('/settings'),
  updateSettings: (config: Partial<Config>): Promise<Config> => 
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  getValidationStages: (): Promise<ValidationStage[]> => 
    request('/settings/validation/stages').then((data: { stages: ValidationStage[] }) => data.stages),
  addValidationStage: (stage: Omit<ValidationStage, 'id'>): Promise<ValidationStage> =>
    request('/settings/validation/stages', {
      method: 'POST',
      body: JSON.stringify(stage),
    }).then((data: { stage: ValidationStage }) => data.stage),
  updateValidationStage: (id: string, stage: Partial<ValidationStage>): Promise<ValidationStage> =>
    request(`/settings/validation/stages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stage),
    }).then((data: { stage: ValidationStage }) => data.stage),
  removeValidationStage: (id: string): Promise<void> =>
    request(`/settings/validation/stages/${id}`, {
      method: 'DELETE',
    }),
};

// Analytics API
export const analyticsApi = {
  getValidationRuns: (): Promise<ValidationRun[]> => 
    request<SessionResponse>('/analytics/sessions?limit=1000').then((data) => 
      data.sessions.map(session => ({
        id: session.sessionId,
        timestamp: new Date(session.startTime).toISOString(),
        success: session.finalSuccess,
        duration: session.totalDuration || 0,
        stages: session.attempts.flatMap((attempt) => attempt.stages)
      }))
    ),
  getValidationMetrics: (): Promise<ValidationMetrics> => 
    Promise.all([
      request<AnalyticsResponse>('/analytics/'), 
      request('/settings/validation/stages').then((data: { stages: ValidationStage[] }) => data.stages)
    ]).then(([analytics, stages]: [AnalyticsResponse, ValidationStage[]]) => {
      // Merge stage success rates with average times and all stages from settings
      const stageMetrics: Record<string, StageMetric> = {};
      const successRates = analytics.stageSuccessRates || {};
      const stageTimes = analytics.averageStageTime || {};
      
      // First, add all stages from settings with default values
      stages.forEach(stage => {
        stageMetrics[stage.id] = {
          id: stage.id,
          name: stage.name,
          enabled: stage.enabled,
          attempts: 0,
          successes: 0,
          successRate: 0,
          averageDuration: 0,
          totalRuns: 0
        };
      });
      
      // Then, override with actual data where available
      Object.keys(successRates).forEach(stageName => {
        if (stageMetrics[stageName]) {
          stageMetrics[stageName] = {
            ...stageMetrics[stageName],
            attempts: successRates[stageName].attempts,
            successes: successRates[stageName].successes,
            successRate: successRates[stageName].rate / 100, // Convert to decimal
            averageDuration: stageTimes[stageName] || 0,
            totalRuns: successRates[stageName].attempts
          };
        }
      });
      
      return {
        totalRuns: analytics.totalSessions,
        successfulRuns: Math.round(analytics.totalSessions * analytics.successRate / 100),
        failedRuns: analytics.totalSessions - Math.round(analytics.totalSessions * analytics.successRate / 100),
        successRate: analytics.successRate / 100, // Convert from percentage to decimal
        averageDuration: analytics.averageTimeToSuccess || 0,
        stageMetrics
      };
    }),
};

// Legacy config API for compatibility (minimal implementation)
export const configApi = {
  getConfig: async (): Promise<UserSystemInfo> => {
    // Return minimal default config for validation analytics
    return {
      os_type: 'unknown',
      architecture: 'unknown', 
      shell: 'unknown',
      home_directory: '~',
      current_directory: '.',
      config: {
        theme: ThemeMode.LIGHT,
        enableMetrics: true,
        validationStages: [],
      },
      environment: null,
      profiles: null,
    };
  },
  saveConfig: async (config: Config): Promise<Config> => {
    return settingsApi.updateSettings(config);
  },
};

// Legacy GitHub auth API (no-op for simplified version)
export const githubAuthApi = {
  checkGithubToken: async (): Promise<{ valid: boolean; data: null }> => ({ valid: false, data: null }),
};

// Task management API
export const taskApi = {
  getTasks: (): Promise<Task[]> => 
    fetch('/todo-list.json')
      .then(response => response.json())
      .catch(() => []), // Return empty array if file doesn't exist
  
  createTask: (task: Omit<Task, 'id'>): Promise<Task> => 
    request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),
  
  updateTask: (id: string, updates: Partial<Task>): Promise<Task> => 
    request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  
  deleteTask: (id: string): Promise<void> => 
    request(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),
};

// Permission management API
export const permissionApi = {
  getConfig: (): Promise<PermissionConfig> => 
    request('/permissions/config'),
  
  updateConfig: (config: Partial<PermissionConfig>): Promise<PermissionConfig> => 
    request('/permissions/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  
  getRules: (): Promise<PermissionRule[]> => 
    request('/permissions/rules'),
  
  createRule: (rule: Omit<PermissionRule, 'id'>): Promise<PermissionRule> => 
    request('/permissions/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),
  
  updateRule: (id: string, updates: Partial<PermissionRule>): Promise<PermissionRule> => 
    request(`/permissions/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  
  deleteRule: (id: string): Promise<void> => 
    request(`/permissions/rules/${id}`, {
      method: 'DELETE',
    }),
  
  testPermission: (context: { action: ActionType; target?: string; worktreeDir?: string }): Promise<{ allowed: boolean; reason: string; matchingRule?: PermissionRule }> => 
    request('/permissions/test', {
      method: 'POST',
      body: JSON.stringify(context),
    }),
  
  getDefaultConfigs: (): Promise<Record<string, PermissionConfig>> => 
    request('/permissions/defaults'),
};