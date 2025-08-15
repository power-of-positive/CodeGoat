// Simple API client for validation analytics

import {
  Config,
  ValidationStage,
  ValidationRun,
  ValidationMetrics,
  UserSystemInfo,
} from 'shared/types';

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
  getValidationRuns: (): Promise<ValidationRun[]> => request('/analytics/validation-runs'),
  getValidationMetrics: (): Promise<ValidationMetrics> => request('/analytics/validation-metrics'),
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