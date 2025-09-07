import { apiRequest } from './api-base';
import { ValidationStage } from '../types/index';

export interface Settings {
  maxAttempts: number;
  sessionTimeout: number;
  validationStages: ValidationStage[];
}

export const settingsApi = {
  async getSettings(): Promise<Settings> {
    return apiRequest<Settings>('/settings');
  },

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    return apiRequest<Settings>('/settings', {
      method: 'PUT',
      body: settings,
    });
  },

  async getValidationStages(): Promise<ValidationStage[]> {
    try {
      const response = await apiRequest<ValidationStage[]>('/validation-stage-configs');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch validation stages:', error);
      return [];
    }
  },

  async addValidationStage(stage: Omit<ValidationStage, 'id'>): Promise<ValidationStage> {
    const response = await apiRequest<ValidationStage>('/validation-stage-configs', {
      method: 'POST',
      body: stage,
    });
    return response;
  },

  async updateValidationStage(
    id: string,
    stage: Partial<ValidationStage>
  ): Promise<ValidationStage> {
    const response = await apiRequest<ValidationStage>(`/validation-stage-configs/${id}`, {
      method: 'PUT',
      body: stage,
    });
    return response;
  },

  async removeValidationStage(id: string): Promise<void> {
    await apiRequest<void>(`/validation-stage-configs/${id}`, {
      method: 'DELETE',
    });
  },
};
