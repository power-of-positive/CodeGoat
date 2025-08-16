// Simple API client for validation analytics

import {
  Config,
  ValidationStage,
  ValidationRun,
  ValidationMetrics,
  UserSystemInfo,
} from '../../shared/types';

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
    request('/analytics/sessions').then((data: { sessions: any[] }) => 
      data.sessions.map(session => ({
        id: session.sessionId,
        timestamp: new Date(session.startTime).toISOString(),
        success: session.finalSuccess,
        duration: session.totalDuration || 0,
        stages: session.attempts.flatMap((attempt: any) => attempt.stages)
      }))
    ),
  getValidationMetrics: (): Promise<ValidationMetrics> => 
    Promise.all([
      request('/analytics/'), 
      request('/settings/validation/stages').then((data: { stages: ValidationStage[] }) => data.stages)
    ]).then(([analytics, stages]: [any, ValidationStage[]]) => {
      // Merge stage success rates with average times and all stages from settings
      const stageMetrics: Record<string, any> = {};
      const successRates = (analytics as any).stageSuccessRates || {};
      const stageTimes = (analytics as any).averageStageTime || {};
      
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
        totalRuns: (analytics as any).totalSessions,
        successfulRuns: Math.round((analytics as any).totalSessions * (analytics as any).successRate / 100),
        failedRuns: (analytics as any).totalSessions - Math.round((analytics as any).totalSessions * (analytics as any).successRate / 100),
        successRate: (analytics as any).successRate / 100, // Convert from percentage to decimal
        averageDuration: (analytics as any).averageTimeToSuccess || 0,
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
        theme: 'light' as any,
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
  checkGithubToken: async () => ({ valid: false, data: null }),
};