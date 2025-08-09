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

export interface OpenRouterEndpoint {
  provider: string;
  contextLength?: number;
  maxTokens?: number;
  uptime: number | null;
  pricing?: {
    prompt?: string;
    completion?: string;
    [key: string]: string | undefined;
  };
  moderated: boolean;
}

export interface OpenRouterStats {
  modelSlug: string;
  endpoints: OpenRouterEndpoint[];
  averageUptime: number | null;
  providerCount: number;
  hasUptimeData?: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  routeName?: string;
  targetUrl?: string;
  meta?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  offset: number;
  limit: number;
}