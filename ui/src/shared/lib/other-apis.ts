import { apiRequest, buildQueryParams } from './api-base';

export interface Config {
  [key: string]: unknown;
}

export const configApi = {
  getConfig: async (): Promise<Config> => {
    // Return default config since no actual endpoint exists
    return {
      theme: 'light',
      autoRefresh: true,
      notifications: true,
    };
  },

  saveConfig: async (config: Config): Promise<void> => {
    // Use settings API to save configuration
    return apiRequest<void>('/settings', {
      method: 'PUT',
      body: config,
    });
  },
};

export const githubAuthApi = {
  checkGithubToken: async (): Promise<boolean> => {
    // Always return false since no actual GitHub integration exists
    return false;
  },
};

export const permissionApi = {
  async getPermissionConfig(): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>('/permissions/config');
  },

  async updatePermissionConfig(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>('/permissions/config', {
      method: 'PUT',
      body: config,
    });
  },

  async getPermissionRules(): Promise<unknown[]> {
    return apiRequest<unknown[]>('/permissions/rules');
  },

  async createPermissionRule(rule: Record<string, unknown>): Promise<unknown> {
    return apiRequest<unknown>('/permissions/rules', {
      method: 'POST',
      body: rule,
    });
  },

  async updatePermissionRule(id: string, rule: Record<string, unknown>): Promise<unknown> {
    return apiRequest<unknown>(`/permissions/rules/${id}`, {
      method: 'PUT',
      body: rule,
    });
  },

  async deletePermissionRule(id: string): Promise<void> {
    await apiRequest<void>(`/permissions/rules/${id}`, {
      method: 'DELETE',
    });
  },

  async testPermission(action: string, resource: string): Promise<{ allowed: boolean; reason?: string }> {
    return apiRequest<{ allowed: boolean; reason?: string }>('/permissions/test', {
      method: 'POST',
      body: { action, resource },
    });
  },

  async getDefaultConfigs(): Promise<unknown[]> {
    return apiRequest<unknown[]>('/permissions/default-configs');
  },

  async importClaudeSettings(): Promise<void> {
    await apiRequest<void>('/permissions/import-claude-settings', {
      method: 'POST',
    });
  },
};

export const e2eTestingApi = {
  async getTestSuites(options?: {
    feature?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<unknown[]> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<unknown[]>(`/e2e-testing/suites${queryParams}`);
  },

  async getTestSuite(id: string): Promise<unknown> {
    return apiRequest<unknown>(`/e2e-testing/suites/${id}`);
  },

  async validateGherkin(content: string): Promise<{ valid: boolean; errors?: string[] }> {
    return apiRequest<{ valid: boolean; errors?: string[] }>('/e2e-testing/validate-gherkin', {
      method: 'POST',
      body: { content },
    });
  },

  async generateStepDefinitions(gherkinContent: string): Promise<{ stepDefinitions: string }> {
    return apiRequest<{ stepDefinitions: string }>('/e2e-testing/generate-steps', {
      method: 'POST',
      body: { gherkinContent },
    });
  },

  // Additional e2e testing methods
  async getTestHistory(options?: {
    suiteId?: string;
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<unknown[]> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<unknown[]>(`/e2e-testing/history${queryParams}`);
  },

  async getAnalytics(options?: {
    days?: number;
    suiteId?: string;
    includeDetails?: boolean;
  }): Promise<unknown> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<unknown>(`/e2e-testing/analytics${queryParams}`);
  },

  async linkScenarioToTest(scenarioId: string, testId: string): Promise<void> {
    await apiRequest<void>('/e2e-testing/link-scenario', {
      method: 'POST',
      body: { scenarioId, testId },
    });
  },

  async getScenarioTestResults(options?: {
    scenarioId?: string;
    limit?: number;
    offset?: number;
  }): Promise<unknown[]> {
    const queryParams = buildQueryParams(options || {});
    return apiRequest<unknown[]>(`/e2e-testing/scenario-results${queryParams}`);
  },

  async triggerTestRun(options?: {
    suiteId?: string;
    environment?: string;
    tags?: string[];
  }): Promise<{ runId: string }> {
    return apiRequest<{ runId: string }>('/e2e-testing/trigger-run', {
      method: 'POST',
      body: options || {},
    });
  },

  async getRunStatus(runId: string): Promise<unknown> {
    return apiRequest<unknown>(`/e2e-testing/runs/${runId}/status`);
  },

  async getCoverage(runId?: string): Promise<unknown> {
    const endpoint = runId ? `/e2e-testing/coverage/${runId}` : '/e2e-testing/coverage';
    return apiRequest<unknown>(endpoint);
  },

  async getScenarioSuggestions(feature: string): Promise<string[]> {
    return apiRequest<string[]>(`/e2e-testing/suggestions?feature=${encodeURIComponent(feature)}`);
  },

  async runCucumberTests(options?: {
    feature?: string;
    tags?: string[];
    parallel?: boolean;
  }): Promise<{ runId: string }> {
    return apiRequest<{ runId: string }>('/e2e-testing/cucumber/run', {
      method: 'POST',
      body: options || {},
    });
  },

  async getCucumberResults(runId: string): Promise<unknown> {
    return apiRequest<unknown>(`/e2e-testing/cucumber/results/${runId}`);
  },
};