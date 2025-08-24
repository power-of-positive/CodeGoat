/* eslint-disable max-lines */
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
  E2ETestResult,
  E2ETestSuite,
  E2ETestHistory,
  PermissionActionType as ActionType,
} from '../types';

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

  // Database-based validation runs and statistics
  getValidationRunsFromDB: (params?: {
    limit?: number;
    todoTaskId?: string;
  }): Promise<{
    validationRuns: Array<{
      id: string;
      timestamp: Date;
      success: boolean;
      duration: number;
      todoTaskId?: string;
      stages: Array<{
        id: string;
        name: string;
        success: boolean;
        duration: number;
        output?: string;
        error?: string;
      }>;
    }>;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.todoTaskId) {
      queryParams.append('todoTaskId', params.todoTaskId);
    }
    
    const url = `/analytics/validation-runs${queryParams.toString() ? `?${queryParams}` : ''}`;
    return request(url);
  },

  getValidationStatisticsFromDB: (days?: number): Promise<{
    statistics: {
      totalRuns: number;
      successfulRuns: number;
      failedRuns: number;
      successRate: number;
      averageDuration: number;
      recentTrend: {
        totalRuns: number;
        successRate: number;
      };
      stageStatistics: Record<string, {
        totalAttempts: number;
        successfulAttempts: number;
        successRate: number;
        averageDuration: number;
      }>;
    };
  }> => {
    const url = days ? `/analytics/validation-statistics?days=${days}` : '/analytics/validation-statistics';
    return request(url);
  },

  // Get individual validation run by ID from database
  getValidationRunById: (runId: string): Promise<{
    id: string;
    taskId?: string;
    sessionId?: string;
    timestamp: string;
    startTime?: number;
    totalTime: number;
    totalStages: number;
    passedStages: number;
    failedStages: number;
    success: boolean;
    triggerType?: string;
    environment?: string;
    gitCommit?: string;
    gitBranch?: string;
    stages: Array<{
      id: string;
      stageId: string;
      stageName: string;
      success: boolean;
      duration: number;
      command?: string;
      exitCode?: number;
      output?: string;
      errorMessage?: string;
      enabled: boolean;
      continueOnFailure: boolean;
      order: number;
    }>;
    logs?: Array<{
      id: string;
      stageId?: string;
      level: string;
      message: string;
      timestamp: string;
      metadata?: Record<string, unknown>;
    }>;
  }> => request(`/validation-runs/${runId}`),

  // Get detailed stage analytics
  getStageAnalytics: (params?: {
    days?: number;
    environment?: string;
    stageId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    overview: {
      totalStages: number;
      period: string;
      totalStageExecutions: number;
    };
    stageStatistics: Array<{
      stageId: string;
      stageName: string;
      totalRuns: number;
      successfulRuns: number;
      failedRuns: number;
      successRate: number;
      totalDuration: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      reliability: 'excellent' | 'good' | 'fair' | 'poor';
    }>;
    trends: Array<{
      date: string;
      stageId: string;
      stageName: string;
      totalRuns: number;
      successfulRuns: number;
      failedRuns: number;
      successRate: number;
      avgDuration: number;
    }>;
    insights: {
      problematicStages: Array<Record<string, unknown>>;
      topPerformingStages: Array<Record<string, unknown>>;
      stageExecutionPattern: Array<{
        runId: string;
        timestamp: string;
        stageSequence: Array<{
          stageId: string;
          success: boolean;
          duration: number;
        }>;
      }>;
    };
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.days) {
      queryParams.append('days', params.days.toString());
    }
    if (params?.environment) {
      queryParams.append('environment', params.environment);
    }
    if (params?.stageId) {
      queryParams.append('stageId', params.stageId);
    }
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    
    const url = `/validation-runs/analytics/stages${queryParams.toString() ? `?${queryParams}` : ''}`;
    return request(url);
  },

  // Get historical timeline data
  getHistoricalData: (params?: {
    days?: number;
    granularity?: 'hourly' | 'daily' | 'weekly';
    environment?: string;
    includeStages?: boolean;
  }): Promise<{
    timeline: Array<{
      timestamp: string;
      runs: Array<Record<string, unknown>>;
      totalRuns: number;
      successfulRuns: number;
      failedRuns: number;
      averageDuration: number;
      successRate: number;
      stagePerformance: Record<string, {
        success: number;
        total: number;
        avgDuration: number;
        successRate: number;
      }>;
    }>;
    summary: {
      totalPeriods: number;
      granularity: string;
      dateRange: {
        start: string;
        end: string;
      };
    };
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.days) {
      queryParams.append('days', params.days.toString());
    }
    if (params?.granularity) {
      queryParams.append('granularity', params.granularity);
    }
    if (params?.environment) {
      queryParams.append('environment', params.environment);
    }
    if (params?.includeStages !== undefined) {
      queryParams.append('includeStages', params.includeStages.toString());
    }
    
    const url = `/validation-runs/analytics/history${queryParams.toString() ? `?${queryParams}` : ''}`;
    return request(url);
  },

  // Compare performance between periods
  getPerformanceComparison: (params: {
    period1Start: string;
    period1End: string;
    period2Start: string;
    period2End: string;
    environment?: string;
  }): Promise<{
    periods: {
      period1: {
        label: string;
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        successRate: number;
        avgDuration: number;
        stages: Array<{
          stageId: string;
          stageName: string;
          totalRuns: number;
          successfulRuns: number;
          successRate: number;
          avgDuration: number;
        }>;
      };
      period2: {
        label: string;
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        successRate: number;
        avgDuration: number;
        stages: Array<{
          stageId: string;
          stageName: string;
          totalRuns: number;
          successfulRuns: number;
          successRate: number;
          avgDuration: number;
        }>;
      };
    };
    comparison: {
      overall: {
        successRate: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
        avgDuration: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
        totalRuns: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
      };
      stages: Array<{
        stageId: string;
        stageName: string;
        status: 'compared' | 'new_in_period2' | 'removed_in_period2';
        successRateChange?: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
        durationChange?: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
        runsChange?: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
      }>;
    };
    insights: {
      improved: number;
      degraded: number;
      stable: number;
      newStages: number;
      removedStages: number;
    };
  }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('period1Start', params.period1Start);
    queryParams.append('period1End', params.period1End);
    queryParams.append('period2Start', params.period2Start);
    queryParams.append('period2End', params.period2End);
    if (params.environment) {
      queryParams.append('environment', params.environment);
    }
    
    const url = `/validation-runs/analytics/comparison?${queryParams}`;
    return request(url);
  },
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
        theme: 'light' as ThemeMode,
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

  // BDD and Cucumber integration methods
  getCoverage: (): Promise<{
    overview: {
      totalScenarios: number;
      linkedScenarios: number;
      unlinkedScenarios: number;
      coveragePercentage: number;
    };
    byFeature: Array<{
      feature: string;
      totalScenarios: number;
      linkedScenarios: number;
      coveragePercentage: number;
    }>;
    trends: Array<{
      date: string;
      coverage: number;
    }>;
  }> => request('/e2e/coverage'),

  getScenarioSuggestions: (scenarioId: string): Promise<Array<{
    testFile: string;
    testName: string;
    confidence: number;
    matchingKeywords: string[];
  }>> => request(`/e2e/scenario-suggestions?scenarioId=${scenarioId}`),

  runCucumberTests: (params: {
    features?: string[];
    tags?: string[];
    parallel?: boolean;
  }): Promise<{
    runId: string;
    status: 'started';
    message: string;
    estimatedDuration: number;
  }> => request('/e2e/cucumber/run', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  getCucumberResults: (runId: string): Promise<{
    runId: string;
    status: 'completed' | 'running' | 'failed';
    duration: number;
    summary: {
      features: number;
      scenarios: number;
      steps: number;
      passed: number;
      failed: number;
      skipped: number;
      pending: number;
    };
    features: Array<{
      name: string;
      scenarios: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        steps: Array<{
          step: string;
          status: 'passed' | 'failed' | 'skipped';
        }>;
      }>;
    }>;
    reportPath: string;
  }> => request(`/e2e/cucumber/results/${runId}`),

  validateGherkin: (gherkinContent: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> => request('/e2e/gherkin/validate', {
    method: 'POST',
    body: JSON.stringify({ gherkinContent }),
  }),

  generateStepDefinitions: (gherkinContent: string): Promise<{
    stepDefinitions: string[];
    language: string;
    framework: string;
  }> => request('/e2e/step-definitions/generate', {
    method: 'POST',
    body: JSON.stringify({ gherkinContent }),
  }),
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

  // Send follow-up comment to a running worker
  sendFollowUp: (
    workerId: string,
    prompt: string
  ): Promise<{
    message: string;
    workerId: string;
    timestamp: string;
  }> =>
    request(`/claude-workers/${workerId}/follow-up`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  // Merge worker's changes
  mergeWorker: (
    workerId: string,
    commitMessage?: string
  ): Promise<{
    success: boolean;
    message: string;
    branch?: string;
  }> =>
    request(`/claude-workers/${workerId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ commitMessage }),
    }),

  // Merge changes from worker's worktree
  mergeWorkerChanges: (
    workerId: string,
    commitMessage?: string
  ): Promise<{
    message: string;
    commitHash: string;
    targetBranch: string;
    commitMessage: string;
  }> =>
    request(`/claude-workers/${workerId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ commitMessage }),
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
