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
  level?: string;
  message?: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  routeName?: string;
  targetUrl?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseSize?: number;
  userAgent?: string;
  clientIp?: string;
  meta?: Record<string, unknown>;
  error?: string | {
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

// Settings types
export interface ValidationStage {
  id: string;
  name: string;
  command: string;
  workingDir?: string;
  timeout: number;
  enabled: boolean;
  continueOnFailure: boolean;
  order: number;
}

export interface ValidationSettings {
  stages: ValidationStage[];
  enableMetrics: boolean;
  maxAttempts: number;
}

export interface FallbackSettings {
  maxRetries: number;
  retryDelay: number;
  enableFallbacks: boolean;
  fallbackOnContextLength: boolean;
  fallbackOnRateLimit: boolean;
  fallbackOnServerError: boolean;
}

export interface LoggingSettings {
  level: 'error' | 'warn' | 'info' | 'debug';
  enableConsole: boolean;
  enableFile: boolean;
  logsDir: string;
  accessLogFile: string;
  appLogFile: string;
  errorLogFile: string;
  maxFileSize: string;
  maxFiles: string;
  datePattern: string;
}

export interface Settings {
  fallback?: FallbackSettings;
  validation?: ValidationSettings;
  logging?: LoggingSettings;
}

// Analytics types
export interface ValidationStageMetrics {
  id: string;
  name: string;
  success: boolean;
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
}

export interface ValidationAttemptMetrics {
  attempt: number;
  startTime: number;
  endTime?: number;
  totalTime: number;
  totalStages: number;
  success: boolean;
  stages: ValidationStageMetrics[];
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  userPrompt?: string;
  taskDescription?: string;
  attempts: ValidationAttemptMetrics[];
  finalSuccess: boolean;
  totalValidationTime: number;
  averageStageTime: number;
}

export interface DevelopmentAnalytics {
  totalSessions: number;
  successRate: number;
  averageTimeToSuccess: number;
  averageAttemptsToSuccess: number;
  mostFailedStage: string;
  stageSuccessRates: Record<string, {
    attempts: number;
    successes: number;
    rate: number;
  }>;
  dailyStats: Record<string, {
    sessions: number;
    successes: number;
    totalTime: number;
  }>;
}