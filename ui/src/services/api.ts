import axios from 'axios';
import type { UIModelConfig, ServerStatus, CreateModelRequest, ModelsResponse, ModelTestResult, OpenRouterStats, LogsResponse, LogEntry } from '../types/api';

const apiClient = axios.create({
  baseURL: '/api',
});

export const api = {
  // Server status
  getServerStatus: async (): Promise<ServerStatus> => {
    const response = await apiClient.get('/status');
    return response.data;
  },

  // Model management
  getModels: async (): Promise<ModelsResponse> => {
    const response = await apiClient.get('/models');
    return response.data;
  },

  addModel: async (model: CreateModelRequest): Promise<UIModelConfig> => {
    const response = await apiClient.post('/models', model);
    return response.data.model;
  },

  updateModel: async (id: string, model: Partial<CreateModelRequest>): Promise<UIModelConfig> => {
    const response = await apiClient.put(`/models/${id}`, model);
    return response.data.model;
  },

  deleteModel: async (id: string): Promise<void> => {
    await apiClient.delete(`/models/${id}`);
  },

  testModel: async (id: string): Promise<ModelTestResult> => {
    const response = await apiClient.post(`/models/test/${id}`);
    return response.data;
  },

  reloadConfig: async (): Promise<void> => {
    await apiClient.post('/status/reload');
  },

  // OpenRouter statistics
  getOpenRouterStats: async (modelSlug: string): Promise<OpenRouterStats> => {
    const response = await apiClient.get(`/openrouter-stats/${encodeURIComponent(modelSlug)}`);
    return response.data;
  },

  // Logs
  getRequestLogs: async (limit = 100, offset = 0): Promise<LogsResponse> => {
    const response = await apiClient.get(`/logs/requests?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  getLogEntry: async (timestamp: string): Promise<LogEntry> => {
    const response = await apiClient.get(`/logs/requests/${encodeURIComponent(timestamp)}`);
    return response.data;
  },

  getErrorLogs: async (limit = 100, offset = 0): Promise<LogsResponse> => {
    const response = await apiClient.get(`/logs/errors?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};