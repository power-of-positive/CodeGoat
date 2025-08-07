import axios from 'axios';
import type { UIModelConfig, ServerStatus, CreateModelRequest, ModelsResponse, ModelTestResult } from '../types/api';

const apiClient = axios.create({
  baseURL: '/api',
});

export const api = {
  // Server status
  getServerStatus: async (): Promise<ServerStatus> => {
    const response = await apiClient.get('/management/status');
    return response.data;
  },

  // Model management
  getModels: async (): Promise<ModelsResponse> => {
    const response = await apiClient.get('/management/models');
    return response.data;
  },

  addModel: async (model: CreateModelRequest): Promise<UIModelConfig> => {
    const response = await apiClient.post('/management/models', model);
    return response.data.model;
  },

  updateModel: async (id: string, model: Partial<CreateModelRequest>): Promise<UIModelConfig> => {
    const response = await apiClient.put(`/management/models/${id}`, model);
    return response.data.model;
  },

  deleteModel: async (id: string): Promise<void> => {
    await apiClient.delete(`/management/models/${id}`);
  },

  testModel: async (id: string): Promise<ModelTestResult> => {
    const response = await apiClient.post(`/management/test/${id}`);
    return response.data;
  },

  reloadConfig: async (): Promise<void> => {
    await apiClient.post('/management/reload');
  },
};