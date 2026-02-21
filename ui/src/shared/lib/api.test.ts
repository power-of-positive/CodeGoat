import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  settingsApi,
  analyticsApi,
  configApi,
  githubAuthApi,
  taskApi,
  claudeWorkersApi,
  permissionApi,
  e2eTestingApi,
} from './api';
import { apiRequest, APIError, buildQueryParams } from './api-base';

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('API Client', () => {
  beforeEach(() => {
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('settingsApi', () => {
    it('should get settings', async () => {
      const mockConfig = { maxAttempts: 3, sessionTimeout: 3600, validationStages: [] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      } as Response);
      const result = await settingsApi.getSettings();
      expect(result).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should update settings', async () => {
      const mockConfig = { maxAttempts: 5 };
      const updatedConfig = { maxAttempts: 5, sessionTimeout: 3600, validationStages: [] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedConfig,
      } as Response);
      const result = await settingsApi.updateSettings(mockConfig);
      expect(result).toEqual(updatedConfig);
      expect(fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockConfig),
        })
      );
    });

    it('should get validation stages', async () => {
      const mockStages = [
        {
          id: '1',
          name: 'lint',
          command: 'npm run lint',
          enabled: true,
          timeout: 30000,
          continueOnFailure: false,
          priority: 1,
        },
      ];
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStages,
      } as Response);

      const result = await settingsApi.getValidationStages();
      expect(result).toEqual(mockStages);
      expect(fetch).toHaveBeenCalledWith(
        '/api/validation-stage-configs',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle validation stages API error gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await settingsApi.getValidationStages();
      expect(result).toEqual([]);
    });
  });

  describe('analyticsApi', () => {
    it('should get validation metrics', async () => {
      const mockAnalytics = {
        totalRuns: 10,
        successRate: 80,
        averageDuration: 5000,
        stages: [],
        recentRuns: [],
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics,
      } as Response);

      const result = await analyticsApi.getValidationMetrics();
      expect(result).toEqual(mockAnalytics);
      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/validation-metrics',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle analytics metrics API error gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await analyticsApi.getValidationMetrics();
      expect(result).toEqual({
        totalRuns: 0,
        successRate: 0,
        averageDuration: 0,
        stages: [],
        recentRuns: [],
      });
    });

    it('should get validation runs', async () => {
      const mockRuns = [
        {
          id: 'session-1',
          timestamp: '2025-08-29T20:00:00.000Z',
          success: true,
          duration: 5000,
          stages: [],
        },
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRuns,
      } as Response);

      const result = await analyticsApi.getValidationRuns();
      expect(result).toEqual(mockRuns);
      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/validation-runs',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle analytics runs API error gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      } as Response);

      const result = await analyticsApi.getValidationRuns();
      expect(result).toEqual([]);
    });
  });

  describe('taskApi', () => {
    it('should get tasks from API', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          content: 'Test task',
          status: 'pending' as const,
          priority: 'medium' as const,
          taskType: 'task' as const,
        },
      ];
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      } as Response);

      const result = await taskApi.getTasks();
      expect(result).toEqual(mockTasks);
      expect(fetch).toHaveBeenCalledWith(
        '/api/tasks',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle getTasks error gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await taskApi.getTasks();
      expect(result).toEqual([]);
    });

    it('should create task', async () => {
      const newTask = { content: 'New task', priority: 'high' as const };
      const createdTask = {
        id: 'task-new',
        ...newTask,
        status: 'pending' as const,
        taskType: 'task' as const,
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => createdTask,
      } as Response);

      const result = await taskApi.createTask(newTask);
      expect(result).toEqual(createdTask);
      expect(fetch).toHaveBeenCalledWith(
        '/api/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask),
        })
      );
    });

    it('should get task analytics', async () => {
      const mockAnalytics = {
        totalTasks: 10,
        completedTasks: 8,
        averageDuration: 5000,
        scenarios: [],
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics,
      } as Response);

      const result = await taskApi.getTaskAnalytics({ taskId: 'task-123' });
      expect(result).toEqual(mockAnalytics);
      expect(fetch).toHaveBeenCalledWith(
        '/api/tasks/analytics?taskId=task-123',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('claudeWorkersApi', () => {
    it('should start a worker', async () => {
      const mockWorker = {
        id: 'worker-123',
        taskId: 'task-123',
        taskContent: 'Test task content',
        status: 'starting' as const,
        pid: 12345,
        logFile: '/tmp/worker-123.log',
        startTime: '2024-01-15T10:00:00Z',
        blockedCommands: 0,
        hasPermissionSystem: true,
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorker,
      } as Response);

      const result = await claudeWorkersApi.startWorker({
        taskId: 'task-123',
        taskContent: 'Test task content',
      });
      expect(result).toEqual(mockWorker);
      expect(fetch).toHaveBeenCalledWith(
        '/api/claude-workers/start',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: 'task-123', taskContent: 'Test task content' }),
        })
      );
    });

    it('should get workers status', async () => {
      const mockStatus = {
        workers: [],
        activeCount: 0,
        totalCount: 0,
        totalBlockedCommands: 0,
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      } as Response);

      const result = await claudeWorkersApi.getWorkersStatus();
      expect(result).toEqual(mockStatus);
      expect(fetch).toHaveBeenCalledWith(
        '/api/claude-workers/status',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('configApi', () => {
    it('should return default config', async () => {
      const result = await configApi.getConfig();
      expect(result).toEqual({
        theme: 'light',
        autoRefresh: true,
        notifications: true,
      });
    });
  });

  describe('githubAuthApi', () => {
    it('should return false for github token check', async () => {
      const result = await githubAuthApi.checkGithubToken();
      expect(result).toBe(false);
    });
  });

  describe('permissionApi', () => {
    it('should get permission config', async () => {
      const mockConfig = { enabled: true, rules: [] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      } as Response);

      const result = await permissionApi.getPermissionConfig();
      expect(result).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledWith(
        '/api/permissions/config',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('e2eTestingApi', () => {
    it('should get test suites', async () => {
      const mockSuites = [{ id: 'suite-1', name: 'Login Tests', status: 'active' }];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuites,
      } as Response);

      const result = await e2eTestingApi.getTestSuites();
      expect(result).toEqual(mockSuites);
      expect(fetch).toHaveBeenCalledWith(
        '/api/e2e-testing/suites',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw error when fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(settingsApi.getSettings()).rejects.toThrow('HTTP error! status: 500');
    });
  });
});

  describe('apiRequest error handling', () => {
    it('throws APIError when API responds with success=false', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: 'bad-news' }),
      } as Response);

      await expect(apiRequest('/test-endpoint')).rejects.toBeInstanceOf(APIError);
    });

    it('wraps AbortError into a timeout APIError', async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';

      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(abortError);

      await expect(apiRequest('/test-endpoint')).rejects.toMatchObject({
        message: 'Request timeout - server took too long to respond',
        status: 408,
      });
    });
  });

  describe('apiRequest utilities', () => {
    it('stringifies primitive request bodies', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await apiRequest('/test-endpoint', { method: 'POST', body: 'payload' });

      const [, init] = (fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      expect(init?.body).toBe('payload');
    });

    it('buildQueryParams skips undefined values and encodes entries', () => {
      const query = buildQueryParams({
        taskId: '42',
        empty: '',
        unset: undefined,
        include: true,
      });

      expect(query).toBe('?taskId=42&include=true');
    });

    it('buildQueryParams returns empty string when nothing to append', () => {
      expect(buildQueryParams({})).toBe('');
    });
  });
