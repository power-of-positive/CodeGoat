import { claudeWorkersApi } from './workers-api';
import { taskApi } from './tasks-api';
import { settingsApi } from './settings-api';
import { configApi, githubAuthApi, permissionApi, e2eTestingApi } from './other-apis';
import { apiRequest } from './api-base';

jest.mock('./api-base', () => {
  const actual = jest.requireActual('./api-base');
  return {
    ...actual,
    apiRequest: jest.fn(),
  };
});

const mockedApiRequest = apiRequest as jest.Mock;

describe('API wrapper utilities', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  describe('claudeWorkersApi', () => {
    it('starts a worker with POST payload', async () => {
      const request = { taskId: 'task-1', taskContent: 'Do the thing', workingDirectory: '/tmp' };
      const expected = { workerId: 'worker-1' };
      mockedApiRequest.mockResolvedValueOnce(expected);

      const result = await claudeWorkersApi.startWorker(request);

      expect(mockedApiRequest).toHaveBeenCalledWith('/claude-workers/start', {
        method: 'POST',
        body: request,
      });
      expect(result).toEqual(expected);
    });

    it('returns empty array when getWorkers fails', async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error('network down'));

      const result = await claudeWorkersApi.getWorkers();

      expect(result).toEqual([]);
    });

    it('returns fallback metrics when getWorkersStatus fails', async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error('oops'));

      const result = await claudeWorkersApi.getWorkersStatus();

      expect(result).toEqual({
        workers: [],
        activeCount: 0,
        totalCount: 0,
        totalBlockedCommands: 0,
      });
    });

    it('requests worker status with dynamic id', async () => {
      mockedApiRequest.mockResolvedValueOnce({ id: 'worker-7' });

      await claudeWorkersApi.getWorkerStatus('worker-7');

      expect(mockedApiRequest).toHaveBeenCalledWith('/claude-workers/worker-7');
    });

    it('stops a worker with optional cleanup flag', async () => {
      mockedApiRequest.mockResolvedValue(undefined);

      await claudeWorkersApi.stopWorker('worker-9', true);

      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/claude-workers/worker-9/stop?cleanupWorktree=true',
        { method: 'POST' }
      );
    });

    it('fetches worker logs with query params', async () => {
      mockedApiRequest.mockResolvedValueOnce(['log line']);

      await claudeWorkersApi.getWorkerLogs('worker-2', { lines: 50, follow: true });

      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/claude-workers/worker-2/logs?lines=50&follow=true'
      );
    });

    it('merges worktree with optional commit message', async () => {
      mockedApiRequest
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ id: 'run-1' });

      await claudeWorkersApi.mergeWorktree('worker-3', 'final commit');
      await claudeWorkersApi.deleteWorker('worker-3');
      await claudeWorkersApi.getValidationRunDetails('run-1');

      expect(mockedApiRequest).toHaveBeenCalledWith('/claude-workers/worker-3/merge', {
        method: 'POST',
        body: { commitMessage: 'final commit' },
      });
      expect(mockedApiRequest).toHaveBeenCalledWith('/claude-workers/worker-3', {
        method: 'DELETE',
      });
      expect(mockedApiRequest).toHaveBeenCalledWith(
        '/claude-workers/validation-runs/run-1'
      );
    });

    it('opens VS Code for a worker', async () => {
      mockedApiRequest.mockResolvedValue(undefined);

      await claudeWorkersApi.openVSCode('worker-4');

      expect(mockedApiRequest).toHaveBeenCalledWith('/claude-workers/worker-4/open-vscode', {
        method: 'POST',
      });
    });

    it('returns empty array when blocked commands request fails', async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error('blocked'));

      const result = await claudeWorkersApi.getBlockedCommands();

      expect(result).toEqual([]);
    });

    it('returns empty array when validation run request fails', async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error('no runs'));

      const result = await claudeWorkersApi.getValidationRuns();

      expect(result).toEqual([]);
    });

    it('sends worker messages and follow ups', async () => {
      mockedApiRequest.mockResolvedValue(undefined);

      await claudeWorkersApi.sendMessage('worker-5', 'hello');
      await claudeWorkersApi.sendFollowup('worker-5', 'extra details');

      expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/claude-workers/worker-5/message', {
        method: 'POST',
        body: { message: 'hello' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/claude-workers/worker-5/followup', {
        method: 'POST',
        body: { message: 'extra details' },
      });
    });

    it('merges worker changes with arbitrary options', async () => {
      mockedApiRequest.mockResolvedValue(undefined);

      await claudeWorkersApi.mergeWorkerChanges('worker-6', { squash: true });

      expect(mockedApiRequest).toHaveBeenCalledWith('/claude-workers/worker-6/merge', {
        method: 'POST',
        body: { squash: true },
      });
    });

    it('starts and stops dev server with default body', async () => {
      mockedApiRequest.mockResolvedValueOnce({
        message: 'started',
        workerId: 'worker-7',
        worktreePath: '/tmp',
        servers: [],
      });
      mockedApiRequest.mockResolvedValueOnce({
        message: 'stopped',
        workerId: 'worker-7',
        stopped: ['backend'],
      });

      await claudeWorkersApi.startDevServer('worker-7');
      await claudeWorkersApi.stopDevServer('worker-7', 'backend');

      expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/claude-workers/worker-7/start-dev-server', {
        method: 'POST',
        body: { type: 'both' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/claude-workers/worker-7/stop-dev-server', {
        method: 'POST',
        body: { type: 'backend' },
      });
    });

    it('fetches dev server status and commit details', async () => {
      mockedApiRequest
        .mockResolvedValueOnce({ workerId: 'worker-8', status: { backend: { running: true } } })
        .mockResolvedValueOnce({ commitMessage: 'message', changedFiles: [], diffStat: '', summary: { filesChanged: 0, fileTypes: {}, directories: [] } })
        .mockResolvedValueOnce({ diff: 'diff', diffStat: '', changedFiles: [], worktreePath: '/tmp' });

      await claudeWorkersApi.getDevServerStatus('worker-8');
      await claudeWorkersApi.generateCommitMessage('worker-8');
      await claudeWorkersApi.getWorkerDiff('worker-8');

      expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/claude-workers/worker-8/dev-server-status');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/claude-workers/worker-8/generate-commit-message');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(3, '/claude-workers/worker-8/diff');
    });
  });

  describe('taskApi', () => {
    it('returns tasks from API and handles failures', async () => {
      mockedApiRequest.mockResolvedValueOnce([{ id: 'task-1' }]);
      const tasks = await taskApi.getTasks();
      expect(tasks).toEqual([{ id: 'task-1' }]);

      mockedApiRequest.mockRejectedValueOnce(new Error('boom'));
      const fallback = await taskApi.getTasks();
      expect(fallback).toEqual([]);
    });

    it('fetches task details with validation runs when requested', async () => {
      mockedApiRequest.mockResolvedValueOnce({ id: 'task-2' });

      await taskApi.getTask('task-2', true);

      expect(mockedApiRequest).toHaveBeenCalledWith('/tasks/task-2?includeValidationRuns=true');
    });

    it('creates, updates, deletes tasks and scenarios', async () => {
      mockedApiRequest
        .mockResolvedValueOnce({ id: 'task-3' })
        .mockResolvedValueOnce({ id: 'task-3', status: 'done' })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ id: 'scenario-1' })
        .mockResolvedValueOnce({ id: 'scenario-1', title: 'Updated' })
        .mockResolvedValueOnce(undefined);

      await taskApi.createTask({ content: 'New task' });
      await taskApi.updateTask('task-3', { status: 'done' } as any);
      await taskApi.deleteTask('task-3');
      await taskApi.addScenario('task-3', {
        title: 'Scenario',
        feature: 'Feature',
        description: 'Desc',
        gherkinContent: 'Given',
        status: 'pending',
      } as any);
      await taskApi.updateTaskScenario('task-3', 'scenario-1', { title: 'Updated' } as any);
      await taskApi.deleteTaskScenario('task-3', 'scenario-1');

      expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/tasks', {
        method: 'POST',
        body: { content: 'New task' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/tasks/task-3', {
        method: 'PUT',
        body: { status: 'done' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(3, '/tasks/task-3', { method: 'DELETE' });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(4, '/tasks/task-3/scenarios', {
        method: 'POST',
        body: expect.objectContaining({ title: 'Scenario' }),
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(5, '/tasks/task-3/scenarios/scenario-1', {
        method: 'PUT',
        body: { title: 'Updated' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(6, '/tasks/task-3/scenarios/scenario-1', {
        method: 'DELETE',
      });
    });

    it('builds analytics query params', async () => {
      mockedApiRequest.mockResolvedValueOnce({ totalTasks: 5 });

      await taskApi.getTaskAnalytics({ taskId: 'task-4', days: 7, includeScenarios: true });

      expect(mockedApiRequest).toHaveBeenCalledWith('/tasks/analytics?taskId=task-4&days=7&includeScenarios=true');
    });

    it('returns stub data for scenario analytics helpers', async () => {
      const executions = await taskApi.getScenarioExecutions('task', 'scenario');
      const analytics = await taskApi.getScenarioAnalytics('task', 'scenario');

      expect(executions).toEqual([]);
      expect(analytics).toMatchObject({
        totalExecutions: 0,
        successRate: 0,
      });
    });
  });

  describe('settingsApi', () => {
    it('fetches and updates settings', async () => {
      mockedApiRequest
        .mockResolvedValueOnce({ maxAttempts: 3, sessionTimeout: 60, validationStages: [] })
        .mockResolvedValueOnce({ maxAttempts: 5, sessionTimeout: 30, validationStages: [] });

      await settingsApi.getSettings();
      await settingsApi.updateSettings({ maxAttempts: 5 });

      expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/settings');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/settings', {
        method: 'PUT',
        body: { maxAttempts: 5 },
      });
    });

    it('handles validation stage helpers', async () => {
      mockedApiRequest
        .mockResolvedValueOnce([{ id: 'stage-1' }])
        .mockResolvedValueOnce({ id: 'stage-1' })
        .mockResolvedValueOnce({ id: 'stage-1', name: 'Updated' })
        .mockResolvedValueOnce(undefined);

      await settingsApi.getValidationStages();
      await settingsApi.addValidationStage({ name: 'Lint' } as any);
      await settingsApi.updateValidationStage('stage-1', { name: 'Updated' });
      await settingsApi.removeValidationStage('stage-1');

      expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/validation-stage-configs');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/validation-stage-configs', {
        method: 'POST',
        body: { name: 'Lint' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(3, '/validation-stage-configs/stage-1', {
        method: 'PUT',
        body: { name: 'Updated' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(4, '/validation-stage-configs/stage-1', {
        method: 'DELETE',
      });
    });

    it('returns empty validation stage list when request fails', async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error('stage error'));

      const stages = await settingsApi.getValidationStages();

      expect(stages).toEqual([]);
    });
  });

  describe('config and permission APIs', () => {
    it('returns default config and saves config through API', async () => {
      const config = await configApi.getConfig();
      expect(config).toMatchObject({
        theme: 'light',
        autoRefresh: true,
        notifications: true,
      });

      mockedApiRequest.mockResolvedValueOnce(undefined);
      await configApi.saveConfig({ theme: 'dark' });

      expect(mockedApiRequest).toHaveBeenCalledWith('/settings', {
        method: 'PUT',
        body: { theme: 'dark' },
      });
    });

    it('wraps permission endpoints', async () => {
      mockedApiRequest
        .mockResolvedValueOnce({ config: true })
        .mockResolvedValueOnce({ updated: true })
        .mockResolvedValueOnce(['rule'])
        .mockResolvedValueOnce({ id: 'rule-1' })
        .mockResolvedValueOnce({ id: 'rule-1', updated: true })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce(['defaults'])
        .mockResolvedValueOnce(undefined);

      await permissionApi.getPermissionConfig();
      await permissionApi.updatePermissionConfig({ config: true });
      await permissionApi.getPermissionRules();
      await permissionApi.createPermissionRule({ id: 'rule-1' });
      await permissionApi.updatePermissionRule('rule-1', { updated: true });
      await permissionApi.deletePermissionRule('rule-1');
      await permissionApi.testPermission('write', 'file.txt');
      await permissionApi.getDefaultConfigs();
      await permissionApi.importClaudeSettings();

      expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/permissions/config');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/permissions/config', {
        method: 'PUT',
        body: { config: true },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(3, '/permissions/rules');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(4, '/permissions/rules', {
        method: 'POST',
        body: { id: 'rule-1' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(5, '/permissions/rules/rule-1', {
        method: 'PUT',
        body: { updated: true },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(6, '/permissions/rules/rule-1', {
        method: 'DELETE',
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(7, '/permissions/test', {
        method: 'POST',
        body: { action: 'write', resource: 'file.txt' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(8, '/permissions/default-configs');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(9, '/permissions/import-claude-settings', {
        method: 'POST',
      });
    });

    it('reports GitHub token as unavailable', async () => {
      const result = await githubAuthApi.checkGithubToken();
      expect(result).toBe(false);
    });
  });

  describe('e2eTestingApi', () => {
    it('builds query params and posts payloads for test management', async () => {
      mockedApiRequest
        .mockResolvedValueOnce([{ id: 'suite-1' }])
        .mockResolvedValueOnce({ id: 'suite-1' })
        .mockResolvedValueOnce({ valid: true })
        .mockResolvedValueOnce({ stepDefinitions: 'Given When Then' })
        .mockResolvedValueOnce([{ id: 'history-1' }])
        .mockResolvedValueOnce({ summary: true })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ runId: 'run-1' })
        .mockResolvedValueOnce({ runId: 'run-1' })
        .mockResolvedValueOnce({ status: 'running' })
        .mockResolvedValueOnce({ coverage: {} })
        .mockResolvedValueOnce(['Scenario idea'])
        .mockResolvedValueOnce({ runId: 'cucumber-run' })
        .mockResolvedValueOnce({ results: [] });

      await e2eTestingApi.getTestSuites({ feature: 'feature', status: 'passed', limit: 5 });
      await e2eTestingApi.getTestSuite('suite-1');
      await e2eTestingApi.validateGherkin('Feature:');
      await e2eTestingApi.generateStepDefinitions('Feature:');
      await e2eTestingApi.getTestHistory({ suiteId: 'suite-1', limit: 2 });
      await e2eTestingApi.getAnalytics({ days: 7, includeDetails: true });
      await e2eTestingApi.linkScenarioToTest('scenario-1', 'test-1');
      await e2eTestingApi.getScenarioTestResults({ scenarioId: 'scenario-1' });
      await e2eTestingApi.triggerTestRun({ suiteId: 'suite-1', environment: 'ci' });
      await e2eTestingApi.getRunStatus('run-1');
      await e2eTestingApi.getCoverage('run-1');
      await e2eTestingApi.getScenarioSuggestions('Feature');
      await e2eTestingApi.runCucumberTests({ feature: 'feature' });
      await e2eTestingApi.getCucumberResults('cucumber-run');

      expect(mockedApiRequest).toHaveBeenNthCalledWith(
        1,
        '/e2e-testing/suites?feature=feature&status=passed&limit=5'
      );
      expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/e2e-testing/suites/suite-1');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(3, '/e2e-testing/validate-gherkin', {
        method: 'POST',
        body: { content: 'Feature:' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(4, '/e2e-testing/generate-steps', {
        method: 'POST',
        body: { gherkinContent: 'Feature:' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(
        5,
        '/e2e-testing/history?suiteId=suite-1&limit=2'
      );
      expect(mockedApiRequest).toHaveBeenNthCalledWith(
        6,
        '/e2e-testing/analytics?days=7&includeDetails=true'
      );
      expect(mockedApiRequest).toHaveBeenNthCalledWith(7, '/e2e-testing/link-scenario', {
        method: 'POST',
        body: { scenarioId: 'scenario-1', testId: 'test-1' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(
        8,
        '/e2e-testing/scenario-results?scenarioId=scenario-1'
      );
      expect(mockedApiRequest).toHaveBeenNthCalledWith(9, '/e2e-testing/trigger-run', {
        method: 'POST',
        body: { suiteId: 'suite-1', environment: 'ci' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(10, '/e2e-testing/runs/run-1/status');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(11, '/e2e-testing/coverage/run-1');
      expect(mockedApiRequest).toHaveBeenNthCalledWith(
        12,
        '/e2e-testing/suggestions?feature=Feature'
      );
      expect(mockedApiRequest).toHaveBeenNthCalledWith(13, '/e2e-testing/cucumber/run', {
        method: 'POST',
        body: { feature: 'feature' },
      });
      expect(mockedApiRequest).toHaveBeenNthCalledWith(
        14,
        '/e2e-testing/cucumber/results/cucumber-run'
      );
    });
  });
});
