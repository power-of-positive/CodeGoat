import axios from 'axios';
import type { UIModelConfig, ServerStatus, CreateModelRequest, ModelsResponse, ModelTestResult, OpenRouterStats, LogsResponse, LogEntry, Settings, DevelopmentAnalytics, SessionMetrics } from '../types/api';
import { API_BASE_URL } from '../constants/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

  // Chat completion logs (for UI display)
  getChatCompletionLogs: async (limit = 100, offset = 0): Promise<LogsResponse> => {
    console.log('Making API request to:', `/logs/chat-completions?limit=${limit}&offset=${offset}`);
    const response = await apiClient.get(`/logs/chat-completions?limit=${limit}&offset=${offset}`);
    console.log('API response:', response.data);
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

  // Settings
  getSettings: async (): Promise<Settings> => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  updateSettings: async (settings: Settings): Promise<Settings> => {
    const response = await apiClient.put('/settings', settings);
    return response.data;
  },

  // Analytics
  getAnalytics: async (): Promise<DevelopmentAnalytics> => {
    const response = await apiClient.get('/analytics');
    return response.data;
  },

  getRecentSessions: async (limit = 10): Promise<SessionMetrics[]> => {
    const response = await apiClient.get(`/analytics/sessions?limit=${limit}`);
    return response.data;
  },

  getSession: async (sessionId: string): Promise<SessionMetrics> => {
    const response = await apiClient.get(`/analytics/sessions/${sessionId}`);
    return response.data;
  },
};