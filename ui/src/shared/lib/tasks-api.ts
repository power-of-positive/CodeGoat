import { apiRequest } from './api-base';
import { Task, BDDScenario } from '../types/index';

export interface CreateTaskData {
  content: string;
  priority?: 'low' | 'medium' | 'high';
  taskType?: 'story' | 'task';
}

export const taskApi = {
  async getTasks(): Promise<Task[]> {
    try {
      return await apiRequest<Task[]>('/tasks');
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  },

  async getTask(id: string, includeValidationRuns = false): Promise<Task> {
    const params = includeValidationRuns ? '?includeValidationRuns=true' : '';
    return apiRequest<Task>(`/tasks/${id}${params}`);
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    return apiRequest<Task>('/tasks', {
      method: 'POST',
      body: data,
    });
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return apiRequest<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteTask(id: string): Promise<void> {
    await apiRequest<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async getTaskAnalytics(options?: {
    taskId?: string;
    days?: number;
    includeScenarios?: boolean;
  }): Promise<unknown> {
    const queryParams = new URLSearchParams();
    
    if (options?.taskId) {
      queryParams.set('taskId', options.taskId);
    }
    if (options?.days) {
      queryParams.set('days', options.days.toString());
    }
    if (options?.includeScenarios) {
      queryParams.set('includeScenarios', 'true');
    }
    
    const queryString = queryParams.toString();
    return apiRequest<unknown>(`/tasks/analytics${queryString ? `?${queryString}` : ''}`);
  },

  // BDD Scenario methods
  async addScenario(taskId: string, scenario: Omit<BDDScenario, 'id' | 'taskId'>): Promise<BDDScenario> {
    return apiRequest<BDDScenario>(`/tasks/${taskId}/scenarios`, {
      method: 'POST',
      body: scenario,
    });
  },

  async updateTaskScenario(taskId: string, scenarioId: string, scenario: Partial<BDDScenario>): Promise<BDDScenario> {
    return apiRequest<BDDScenario>(`/tasks/${taskId}/scenarios/${scenarioId}`, {
      method: 'PUT',
      body: scenario,
    });
  },

  async deleteTaskScenario(taskId: string, scenarioId: string): Promise<void> {
    await apiRequest<void>(`/tasks/${taskId}/scenarios/${scenarioId}`, {
      method: 'DELETE',
    });
  },
};