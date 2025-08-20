// Simple API client for validation analytics

import {
  Config,
  ValidationStage,
  ValidationRun,
  ValidationMetrics,
  ValidationStageResult,
  UserSystemInfo,
  ThemeMode,
  Task,
  BDDScenario,
  BDDScenarioExecution,
  PermissionRule,
  PermissionConfig,
  ActionType,
  E2ETestResult,
  E2ETestSuite,
  E2ETestHistory,
} from '../../shared/types';

// Internal API response types
interface SessionResponse {
  sessions: Array<{
    sessionId: string;
    startTime: string;
    finalSuccess: boolean;
    totalDuration?: number;
    attempts: Array<{
      stages: ValidationStageResult[];
    }>;
  }>;
}

interface StageSuccessRate {
  attempts: number;
  successes: number;
  rate: number;
}

interface AnalyticsResponse {
  totalSessions: number;
  successRate: number;
  averageTimeToSuccess?: number;
  stageSuccessRates?: Record<string, StageSuccessRate>;
  averageStageTime?: Record<string, number>;
}

interface StageMetric {
  id: string;
  name: string;
  enabled: boolean;
  attempts: number;
  successes: number;
  successRate: number;
  averageDuration: number;
  totalRuns: number;
}

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
    request('/settings/validation/stages').then(
      (data: { stages: ValidationStage[] }) => data.stages
    ),
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
  getValidationRuns: (agentFilter?: string): Promise<ValidationRun[]> => {
    const url = agentFilter
      ? `/analytics/sessions?limit=1000&agent=${encodeURIComponent(agentFilter)}`
      : '/analytics/sessions?limit=1000';
    return request<SessionResponse>(url).then(data =>
      data.sessions.map(session => ({
        id: session.sessionId,
        timestamp: new Date(session.startTime).toISOString(),
        success: session.finalSuccess,
        duration: session.totalDuration || 0,
        stages: session.attempts.flatMap(attempt => attempt.stages),
      }))
    );
  },
  getValidationMetrics: (agentFilter?: string): Promise<ValidationMetrics> => {
    const analyticsUrl = agentFilter
      ? `/analytics/?agent=${encodeURIComponent(agentFilter)}`
      : '/analytics/';
    return Promise.all([
      request<AnalyticsResponse>(analyticsUrl),
      request('/settings/validation/stages').then(
        (data: { stages: ValidationStage[] }) => data.stages
      ),
    ]).then(([analytics, stages]: [AnalyticsResponse, ValidationStage[]]) => {
      // Merge stage success rates with average times and all stages from settings
      const stageMetrics: Record<string, StageMetric> = {};
      const successRates = analytics.stageSuccessRates || {};
      const stageTimes = analytics.averageStageTime || {};

      // First, add all stages from settings with default values
      stages.forEach(stage => {
        stageMetrics[stage.id] = {
          id: stage.id,
          name: stage.name,
          enabled: stage.enabled,
          attempts: 0,
          successes: 0,
          successRate: 0,
          averageDuration: 0,
          totalRuns: 0,
        };
      });

      // Then, override with actual data where available
      Object.keys(successRates).forEach(stageName => {
        if (stageMetrics[stageName]) {
          stageMetrics[stageName] = {
            ...stageMetrics[stageName],
            attempts: successRates[stageName].attempts,
            successes: successRates[stageName].successes,
            successRate: successRates[stageName].rate / 100, // Convert to decimal
            averageDuration: stageTimes[stageName] || 0,
            totalRuns: successRates[stageName].attempts,
          };
        }
      });

      return {
        totalRuns: analytics.totalSessions,
        successfulRuns: Math.round((analytics.totalSessions * analytics.successRate) / 100),
        failedRuns:
          analytics.totalSessions -
          Math.round((analytics.totalSessions * analytics.successRate) / 100),
        successRate: analytics.successRate / 100, // Convert from percentage to decimal
        averageDuration: analytics.averageTimeToSuccess || 0,
        stageMetrics,
      };
    });
  },
  getStageHistory: (
    stageId: string,
    days: number = 30
  ): Promise<{
    stageId: string;
    history: {
      dailyMetrics: Array<{
        date: string;
        attempts: number;
        successes: number;
        failures: number;
        successRate: number;
        averageDuration: number;
        totalDuration: number;
      }>;
      trends: {
        successRateTrend: number;
        durationTrend: number;
        totalAttempts: number;
        totalSuccesses: number;
      };
    };
  }> => request(`/analytics/stages/${stageId}/history?days=${days}`),
  getStageStatistics: (
    stageId: string
  ): Promise<{
    stageId: string;
    statistics: {
      overview: {
        totalAttempts: number;
        totalSuccesses: number;
        totalFailures: number;
        successRate: number;
        averageDuration: number;
        medianDuration: number;
        minDuration: number;
        maxDuration: number;
        standardDeviation: number;
      };
      recentRuns: Array<{
        timestamp: string;
        success: boolean;
        duration: number;
        sessionId?: string;
        output?: string;
        error?: string;
      }>;
      performanceMetrics: {
        durationsPercentiles: {
          p50: number;
          p90: number;
          p95: number;
          p99: number;
        };
        successRateByTimeOfDay: Record<
          string,
          { attempts: number; successes: number; rate: number }
        >;
        failureReasons: Record<string, number>;
      };
    };
  }> => request(`/analytics/stages/${stageId}/statistics`),
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
        theme: ThemeMode.LIGHT,
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
  checkGithubToken: async (): Promise<{ valid: boolean; data: null }> => ({
    valid: false,
    data: null,
  }),
};

// Task management API
export const taskApi = {
  getTasks: (): Promise<Task[]> => request<Task[]>('/tasks'),

  getTask: (id: string): Promise<Task & { validationRuns?: unknown[] }> => request(`/tasks/${id}`),

  createTask: (task: Omit<Task, 'id'>): Promise<Task> =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  updateTask: (id: string, updates: Partial<Task>): Promise<Task> =>
    request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteTask: (id: string): Promise<void> =>
    request(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  getTaskAnalytics: (): Promise<{
    overview: {
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      pendingTasks: number;
      completionRate: string;
      averageCompletionTimeMinutes: number;
    };
    priorityBreakdown: {
      high: { total: number; completed: number; completionRate: string };
      medium: { total: number; completed: number; completionRate: string };
      low: { total: number; completed: number; completionRate: string };
    };
    recentCompletions: Task[];
    dailyCompletions: { date: string; completed: number }[];
  }> => request('/tasks/analytics'),

  // BDD Scenario management
  addScenarioToTask: (taskId: string, scenario: Omit<BDDScenario, 'id'>): Promise<BDDScenario> =>
    request(`/tasks/${taskId}/scenarios`, {
      method: 'POST',
      body: JSON.stringify(scenario),
    }),

  updateTaskScenario: (
    taskId: string,
    scenarioId: string,
    updates: Partial<BDDScenario>
  ): Promise<BDDScenario> =>
    request(`/tasks/${taskId}/scenarios/${scenarioId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteTaskScenario: (taskId: string, scenarioId: string): Promise<void> =>
    request(`/tasks/${taskId}/scenarios/${scenarioId}`, {
      method: 'DELETE',
    }),

  // BDD Scenario execution history
  getScenarioExecutions: (
    taskId: string,
    scenarioId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<BDDScenarioExecution[]> =>
    request(
      `/tasks/${taskId}/scenarios/${scenarioId}/executions?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  createScenarioExecution: (
    taskId: string,
    scenarioId: string,
    execution: {
      status: 'pending' | 'passed' | 'failed' | 'skipped';
      executionDuration?: number;
      errorMessage?: string;
      stepResults?: Array<{
        step: string;
        status: 'passed' | 'failed' | 'skipped';
        duration?: number;
        error?: string;
      }>;
      environment?: string;
      executedBy?: string;
    }
  ): Promise<BDDScenarioExecution> =>
    request(`/tasks/${taskId}/scenarios/${scenarioId}/executions`, {
      method: 'POST',
      body: JSON.stringify(execution),
    }),

  getScenarioAnalytics: (
    taskId: string,
    scenarioId: string,
    days?: number
  ): Promise<{
    summary: {
      totalExecutions: number;
      passedExecutions: number;
      failedExecutions: number;
      skippedExecutions: number;
      successRate: number;
      averageDuration: number;
    };
    trends: Array<{
      date: string;
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    }>;
    recentExecutions: Array<{
      id: string;
      status: string;
      executedAt: string;
      executionDuration?: number;
      errorMessage?: string;
      environment?: string;
      executedBy?: string;
    }>;
  }> => request(`/tasks/${taskId}/scenarios/${scenarioId}/analytics${days ? `?days=${days}` : ''}`),
};

// Permission management API
export const permissionApi = {
  getConfig: (): Promise<PermissionConfig> => request('/permissions/config'),

  updateConfig: (config: Partial<PermissionConfig>): Promise<PermissionConfig> =>
    request('/permissions/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  getRules: (): Promise<PermissionRule[]> => request('/permissions/rules'),

  createRule: (rule: Omit<PermissionRule, 'id'>): Promise<PermissionRule> =>
    request('/permissions/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),

  updateRule: (id: string, updates: Partial<PermissionRule>): Promise<PermissionRule> =>
    request(`/permissions/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteRule: (id: string): Promise<void> =>
    request(`/permissions/rules/${id}`, {
      method: 'DELETE',
    }),

  testPermission: (context: {
    action: ActionType;
    target?: string;
    worktreeDir?: string;
  }): Promise<{ allowed: boolean; reason: string; matchingRule?: PermissionRule }> =>
    request('/permissions/test', {
      method: 'POST',
      body: JSON.stringify(context),
    }),

  getDefaultConfigs: (): Promise<Record<string, PermissionConfig>> =>
    request('/permissions/defaults'),

  importClaudeSettings: (): Promise<{
    importedRules: number;
    totalRules: number;
    config: PermissionConfig;
  }> =>
    request('/permissions/import-claude-settings', {
      method: 'POST',
    }),
};

// E2E Testing API
export const e2eTestingApi = {
  // Get all E2E test suites with results
  getTestSuites: (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<E2ETestSuite[]> =>
    request(`/e2e/suites?${new URLSearchParams(params as Record<string, string>).toString()}`),

  // Get specific test suite results
  getTestSuite: (suiteId: string): Promise<E2ETestSuite> => request(`/e2e/suites/${suiteId}`),

  // Get test history and analytics
  getTestHistory: (testFile: string, testName?: string, days?: number): Promise<E2ETestHistory> =>
    request(
      `/e2e/history?testFile=${encodeURIComponent(testFile)}${testName ? `&testName=${encodeURIComponent(testName)}` : ''}${days ? `&days=${days}` : ''}`
    ),

  // Get overall E2E test analytics
  getAnalytics: (params?: {
    days?: number;
    groupBy?: 'file' | 'test' | 'day';
  }): Promise<{
    overview: {
      totalSuites: number;
      totalTests: number;
      successRate: number;
      averageDuration: number;
      recentRuns: number;
    };
    trends: Array<{
      date: string;
      totalRuns: number;
      passed: number;
      failed: number;
      skipped: number;
      successRate: number;
      averageDuration: number;
    }>;
    topFailingTests: Array<{
      testFile: string;
      testName: string;
      failureRate: number;
      recentFailures: number;
      lastFailure?: string;
    }>;
    performanceTrends: Array<{
      testFile: string;
      testName: string;
      averageDuration: number;
      trend: number; // positive = getting slower, negative = getting faster
    }>;
  }> =>
    request(`/e2e/analytics?${new URLSearchParams(params as Record<string, string>).toString()}`),

  // Link BDD scenario to E2E test
  linkScenarioToTest: (
    taskId: string,
    scenarioId: string,
    testData: {
      playwrightTestFile: string;
      playwrightTestName: string;
      cucumberSteps?: string[];
    }
  ): Promise<BDDScenario> =>
    request(`/tasks/${taskId}/scenarios/${scenarioId}/link-test`, {
      method: 'POST',
      body: JSON.stringify(testData),
    }),

  // Get BDD scenario test results
  getScenarioTestResults: (
    taskId: string,
    scenarioId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{
    scenario: BDDScenario;
    testResults: E2ETestResult[];
    analytics: {
      totalRuns: number;
      passedRuns: number;
      failedRuns: number;
      successRate: number;
      averageDuration: number;
    };
  }> =>
    request(
      `/tasks/${taskId}/scenarios/${scenarioId}/test-results?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  // Trigger E2E test run for specific test or suite
  triggerTestRun: (params: {
    testFile?: string;
    testName?: string;
    browser?: string;
    headless?: boolean;
    timeout?: number;
  }): Promise<{ runId: string; status: 'started' | 'queued' }> =>
    request('/e2e/run', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Get test run status
  getRunStatus: (
    runId: string
  ): Promise<{
    runId: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: {
      totalTests: number;
      completedTests: number;
      currentTest?: string;
    };
    results?: E2ETestSuite;
  }> => request(`/e2e/runs/${runId}`),
};

// Claude Code Workers API
export const claudeWorkersApi = {
  // Start a Claude Code worker for a task
  startWorker: (params: {
    taskId: string;
    taskContent: string;
    workingDirectory?: string;
  }): Promise<{
    workerId: string;
    taskId: string;
    status: 'starting' | 'running';
    pid?: number;
    logFile: string;
    startTime: string;
  }> =>
    request('/claude-workers/start', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Get status of all workers
  getWorkersStatus: (): Promise<{
    workers: Array<{
      id: string;
      taskId: string;
      taskContent: string;
      status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped' | 'validating';
      startTime: string;
      endTime?: string;
      pid?: number;
      logFile: string;
      blockedCommands: number;
      hasPermissionSystem: boolean;
      validationPassed?: boolean;
    }>;
    activeCount: number;
    totalCount: number;
    totalBlockedCommands: number;
  }> => request('/claude-workers/status'),

  // Get specific worker status
  getWorkerStatus: (
    workerId: string
  ): Promise<{
    id: string;
    taskId: string;
    taskContent: string;
    status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped';
    startTime: string;
    endTime?: string;
    pid?: number;
    logFile: string;
  }> => request(`/claude-workers/${workerId}`),

  // Stop a worker
  stopWorker: (
    workerId: string
  ): Promise<{
    workerId: string;
    status: string;
  }> =>
    request(`/claude-workers/${workerId}/stop`, {
      method: 'POST',
    }),

  // Get worker logs
  getWorkerLogs: (
    workerId: string
  ): Promise<{
    workerId: string;
    logs: string;
    logFile: string;
  }> => request(`/claude-workers/${workerId}/logs`),

  // Send message to worker
  sendWorkerMessage: (
    workerId: string,
    params: { message: string }
  ): Promise<{
    workerId: string;
    message: string;
    response?: string;
    success: boolean;
  }> =>
    request(`/claude-workers/${workerId}/message`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Merge worktree changes back to main branch
  mergeWorktree: (
    workerId: string
  ): Promise<{
    message: string;
    workerId: string;
    mergedBranch: string;
    hasChanges: boolean;
  }> =>
    request(`/claude-workers/${workerId}/merge-worktree`, {
      method: 'POST',
    }),

  // Open worktree in VSCode
  openVSCode: (
    workerId: string
  ): Promise<{
    message: string;
    workerId: string;
    worktreePath: string;
  }> =>
    request(`/claude-workers/${workerId}/open-vscode`, {
      method: 'POST',
    }),

  // Get blocked commands for a worker
  getBlockedCommands: (
    workerId: string
  ): Promise<{
    workerId: string;
    blockedCommands: number;
    blockedCommandsList: Array<{
      timestamp: string;
      command: string;
      reason: string;
      suggestion?: string;
    }>;
    hasPermissionSystem: boolean;
  }> => request(`/claude-workers/${workerId}/blocked-commands`),

  // Get validation runs for a worker
  getValidationRuns: (
    workerId: string
  ): Promise<{
    workerId: string;
    validationRuns: Array<{
      id: string;
      timestamp: string;
      stages: Array<{
        name: string;
        command: string;
        status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
        duration?: number;
        output?: string;
        error?: string;
      }>;
      overallStatus: 'pending' | 'running' | 'passed' | 'failed';
      metricsFile?: string;
    }>;
    totalRuns: number;
    lastRun: {
      id: string;
      timestamp: string;
      overallStatus: 'pending' | 'running' | 'passed' | 'failed';
    } | null;
  }> => request(`/claude-workers/${workerId}/validation-runs`),

  // Get specific validation run details
  getValidationRunDetails: (
    workerId: string,
    runId: string
  ): Promise<{
    workerId: string;
    runId: string;
    validationRun: {
      id: string;
      timestamp: string;
      stages: Array<{
        name: string;
        command: string;
        status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
        duration?: number;
        output?: string;
        error?: string;
      }>;
      overallStatus: 'pending' | 'running' | 'passed' | 'failed';
      metricsFile?: string;
    };
    metrics: unknown | null;
  }> => request(`/claude-workers/${workerId}/validation-runs/${runId}`),
};
