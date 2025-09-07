import { apiRequest } from '../../../shared/lib/api-base';

interface OrchestratorStatus {
  isRunning: boolean;
  shouldStop: boolean;
  enableValidation: boolean;
  maxRetries: number;
  maxTaskRetries: number;
  sessionId: string;
}

interface StartOrchestratorRequest {
  options?: {
    maxRetries?: number;
    maxTaskRetries?: number;
    validationTimeout?: number;
    enableValidation?: boolean;
    claudeCommand?: string;
    enableWorktrees?: boolean;
    pollInterval?: number;
    filterPriority?: 'high' | 'medium' | 'low';
  };
}

interface ExecutePromptRequest {
  prompt: string;
  options?: {
    maxRetries?: number;
    maxTaskRetries?: number;
    validationTimeout?: number;
    enableValidation?: boolean;
  };
}

interface OrchestratorMetrics {
  summary: {
    totalValidationRuns: number;
    successfulRuns: number;
    failedRuns: number;
    successRate: number;
    averageDuration: number;
    averageStages: number;
    tasksProcessed: number;
    periodDays: number;
  };
  trends: Array<{
    date: string;
    runs: number;
    successful: number;
    failed: number;
  }>;
  recentRuns: Array<{
    id: string;
    taskId: string;
    taskContent: string;
    success: boolean;
    totalStages: number;
    passedStages: number;
    failedStages: number;
    totalDuration: number;
    createdAt: string;
  }>;
}

interface CycleResult {
  success: boolean;
  metrics: {
    tasksProcessed: number;
    tasksCompleted: number;
    tasksFailed: number;
    averageAttemptsPerTask: number;
    averageValidationTime: number;
    totalClaudeExecutions: number;
  };
  totalDuration: number;
  totalValidationRuns: number;
  completedTasks: Array<{
    taskId: string;
    taskContent: string;
    attempts: number;
    totalDuration: number;
    validationRuns: number;
    claudeExecutions: number;
  }>;
  failedTasks: Array<{
    taskId: string;
    taskContent: string;
    error: string;
    attempts: number;
    totalDuration: number;
    validationRuns: number;
    claudeExecutions: number;
  }>;
}

interface StreamInfo {
  clientCount: number;
  activeSessions: string[];
  sessionFilter?: string;
}

export const orchestratorApi = {
  /**
   * Get orchestrator status
   */
  async getStatus(): Promise<OrchestratorStatus> {
    const response = await apiRequest<{ success: boolean; data: OrchestratorStatus }>(
      '/orchestrator/status'
    );
    return response.data;
  },

  /**
   * Start orchestrator in continuous mode
   */
  async start(
    request?: StartOrchestratorRequest
  ): Promise<{ success: boolean; data?: { sessionId: string } }> {
    return await apiRequest<{ success: boolean; data?: { sessionId: string } }>(
      '/orchestrator/start',
      {
        method: 'POST',
        body: request,
      }
    );
  },

  /**
   * Stop orchestrator
   */
  async stop(): Promise<{ success: boolean; message: string }> {
    return await apiRequest<{ success: boolean; message: string }>('/orchestrator/stop', {
      method: 'POST',
    });
  },

  /**
   * Execute a single prompt
   */
  async executePrompt(request: ExecutePromptRequest): Promise<{ success: boolean; data: unknown }> {
    return await apiRequest<{ success: boolean; data: unknown }>('/orchestrator/execute', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Run a single orchestrator cycle
   */
  async runCycle(
    options?: StartOrchestratorRequest['options']
  ): Promise<{ success: boolean; data: CycleResult }> {
    return await apiRequest<{ success: boolean; data: CycleResult }>('/orchestrator/cycle', {
      method: 'POST',
      body: { options },
    });
  },

  /**
   * Get orchestrator metrics
   */
  async getMetrics(days?: number): Promise<OrchestratorMetrics> {
    const query = days ? `?days=${days}` : '';
    const response = await apiRequest<{ success: boolean; data: OrchestratorMetrics }>(
      `/orchestrator/metrics${query}`
    );
    return response.data;
  },

  /**
   * Get stream information
   */
  async getStreamInfo(sessionId?: string): Promise<StreamInfo> {
    const query = sessionId ? `?sessionId=${sessionId}` : '';
    const response = await apiRequest<{ success: boolean; data: StreamInfo }>(
      `/orchestrator/stream/info${query}`
    );
    return response.data;
  },

  /**
   * Get stream URL for EventSource
   */
  getStreamUrl(sessionId?: string): string {
    const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    return `${baseUrl}/api/orchestrator/stream${sessionId ? `?sessionId=${sessionId}` : ''}`;
  },
};
