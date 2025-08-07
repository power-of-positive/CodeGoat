export interface UIModelConfig {
  id: string;
  name: string;
  provider: 'openrouter' | 'openai' | 'anthropic' | 'other';
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  status?: 'healthy' | 'error' | 'untested';
  lastTested?: string | null;
  responseTime?: number;
}

export interface ServerStatus {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  uptimeFormatted?: string;
  modelsCount: number;
  activeModelsCount: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  nodeVersion?: string;
  timestamp?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface CreateModelRequest {
  name: string;
  provider: 'openrouter' | 'openai' | 'anthropic' | 'other';
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled?: boolean;
}

export interface UpdateModelRequest extends Partial<CreateModelRequest> {
  id: string;
}

export interface ModelTestResult {
  modelId: string;
  status: 'healthy' | 'error';
  responseTime?: number;
  error?: string | null;
  testedAt: string;
}

export interface ModelsResponse {
  models: UIModelConfig[];
}