/* eslint-disable max-lines */
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

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('API Client', () => {
  beforeEach(() => {
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('settingsApi', () => {
    it('should get settings', async () => {
      const mockConfig = { enableMetrics: true, validation: { stages: [] } };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      } as Response);
      const result = await settingsApi.getSettings();
      expect(result).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledWith('/api/settings', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should update settings', async () => {
      const mockConfig = { enableMetrics: false };
      const updatedConfig = { enableMetrics: false, validation: { stages: [] } };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedConfig,
      } as Response);
      const result = await settingsApi.updateSettings(mockConfig);
      expect(result).toEqual(updatedConfig);
      expect(fetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockConfig),
      });
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
        json: async () => ({ stages: mockStages }),
      } as Response);

      const result = await settingsApi.getValidationStages();
      expect(result).toEqual(mockStages);
      expect(fetch).toHaveBeenCalledWith('/api/settings/validation/stages', {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('analyticsApi', () => {
    it('should get validation metrics', async () => {
      const mockAnalytics = {
        totalSessions: 10,
        successRate: 80,
        averageTimeToSuccess: 5000,
        stageSuccessRates: { lint: { attempts: 10, successes: 8, rate: 80 } },
        averageStageTime: { lint: 1500 },
      };
      const mockStages = [
        {
          id: 'lint',
          name: 'Code Linting',
          enabled: true,
          timeout: 30000,
          continueOnFailure: false,
          priority: 1,
        },
      ];
      const expectedMetrics = {
        totalRuns: 10,
        successfulRuns: 8,
        failedRuns: 2,
        successRate: 0.8,
        averageDuration: 5000,
        stageMetrics: {
          lint: {
            id: 'lint',
            name: 'Code Linting',
            enabled: true,
            attempts: 10,
            successes: 8,
            successRate: 0.8,
            averageDuration: 1500,
            totalRuns: 10,
          },
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalytics,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stages: mockStages }),
        } as Response);

      const result = await analyticsApi.getValidationMetrics();
      expect(result).toEqual(expectedMetrics);
      expect(fetch).toHaveBeenCalledWith('/api/analytics/', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(fetch).toHaveBeenCalledWith('/api/settings/validation/stages', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get validation runs', async () => {
      const mockRuns = [
        {
          id: 'session-1',
          timestamp: '2025-08-29T20:00:00.000Z',
          success: true,
          totalTime: 5000,
          stages: [{ stageId: 'lint', stageName: 'Lint', success: true, duration: 1000 }],
        },
      ];
      const expectedRuns = [
        {
          id: 'session-1',
          timestamp: '2025-08-29T20:00:00.000Z',
          success: true,
          duration: 5000,
          stages: [{ id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 }],
        },
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runs: mockRuns }),
      } as Response);

      const result = await analyticsApi.getValidationRuns();
      expect(result).toEqual(expectedRuns);
      expect(fetch).toHaveBeenCalledWith('/api/validation-runs?limit=1000', {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(settingsApi.getSettings()).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      );
    });

    it('should handle validation stages API error gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(settingsApi.getValidationStages()).rejects.toThrow(
        'API request failed: 404 Not Found'
      );
    });

    it('should handle add validation stage API error', async () => {
      const newStage = {
        name: 'Test',
        command: 'test',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
        order: 0,
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(settingsApi.addValidationStage(newStage)).rejects.toThrow(
        'API request failed: 400 Bad Request'
      );
    });

    it('should handle update validation stage API error', async () => {
      const updates = { name: 'Updated' };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(settingsApi.updateValidationStage('lint', updates)).rejects.toThrow(
        'API request failed: 403 Forbidden'
      );
    });

    it('should handle remove validation stage API error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(settingsApi.removeValidationStage('nonexistent')).rejects.toThrow(
        'API request failed: 404 Not Found'
      );
    });

    it('should handle analytics metrics API error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(analyticsApi.getValidationMetrics()).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      );
    });

    it('should handle analytics runs API error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      } as Response);

      await expect(analyticsApi.getValidationRuns()).rejects.toThrow(
        'API request failed: 502 Bad Gateway'
      );
    });

    it('should handle API responses with success: false', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: 'Custom error message' }),
      } as Response);

      await expect(settingsApi.getSettings()).rejects.toThrow('Custom error message');
    });

    it('should handle API responses with success: false and no message', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      } as Response);

      await expect(settingsApi.getSettings()).rejects.toThrow('API request failed');
    });
  });

  describe('configApi', () => {
    it('should return default config', async () => {
      const result = await configApi.getConfig();
      expect(result).toHaveProperty('os_type', 'unknown');
      expect(result).toHaveProperty('architecture', 'unknown');
      expect(result).toHaveProperty('config');
      expect(result.config).toHaveProperty('theme', 'light');
    });

    it('should save config using settingsApi', async () => {
      const config = { theme: 'dark' as any, enableMetrics: true };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => config,
      } as Response);

      const result = await configApi.saveConfig(config as any);
      expect(result).toEqual(config);
    });
  });

  describe('githubAuthApi', () => {
    it('should return false for github token check', async () => {
      const result = await githubAuthApi.checkGithubToken();
      expect(result).toEqual({ valid: false, data: null });
    });
  });

  describe('taskApi', () => {
    it('should get tasks from API', async () => {
      const mockTasks = [{ id: '1', content: 'Task 1', status: 'pending', priority: 'high' }];
      const mockResponse = { success: true, data: mockTasks };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
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

      await expect(taskApi.getTasks()).rejects.toThrow('Network error');
    });

    it('should create task', async () => {
      const task = {
        content: 'New task',
        status: 'pending' as const,
        priority: 'medium' as const,
        taskType: 'task' as const,
        executorId: 'claude_code',
      };
      const responseTask = { ...task, id: 'task-123' };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => responseTask,
      } as Response);

      const result = await taskApi.createTask(task);
      expect(result).toEqual(responseTask);
      expect(fetch).toHaveBeenCalledWith(
        '/api/tasks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(task),
        })
      );
    });

    it('should update task', async () => {
      const updates = { status: 'completed' as const };
      const responseTask = {
        id: 'task-123',
        content: 'Task',
        status: 'completed' as const,
        priority: 'medium' as const,
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => responseTask,
      } as Response);

      const result = await taskApi.updateTask('task-123', updates);
      expect(result).toEqual(responseTask);
      expect(fetch).toHaveBeenCalledWith(
        '/api/tasks/task-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });

    it('should delete task', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await taskApi.deleteTask('task-123');
      expect(fetch).toHaveBeenCalledWith(
        '/api/tasks/task-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle addValidationStage API call', async () => {
      const mockStage = {
        name: 'Test Stage',
        command: 'npm test',
        enabled: true,
        timeout: 60000,
        continueOnFailure: false,
        order: 1,
        priority: 1,
      };

      const responseStage = { ...mockStage, id: 'stage-123' };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stage: responseStage }),
      } as Response);

      const result = await settingsApi.addValidationStage(mockStage);
      expect(result).toEqual(responseStage);
      expect(fetch).toHaveBeenCalledWith(
        '/api/settings/validation/stages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockStage),
        })
      );
    });

    it('should handle updateValidationStage API call', async () => {
      const updates = { name: 'Updated Stage' };
      const responseStage = { id: 'stage-123', name: 'Updated Stage', enabled: true };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stage: responseStage }),
      } as Response);

      const result = await settingsApi.updateValidationStage('stage-123', updates);
      expect(result).toEqual(responseStage);
      expect(fetch).toHaveBeenCalledWith(
        '/api/settings/validation/stages/stage-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });

    it('should handle removeValidationStage API call', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await settingsApi.removeValidationStage('stage-123');
      expect(fetch).toHaveBeenCalledWith(
        '/api/settings/validation/stages/stage-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('analyticsApi advanced features', () => {
    it('should get stage history', async () => {
      const mockHistory = {
        stageId: 'lint',
        history: {
          timeline: [
            { date: '2023-01-01', attempts: 5, successes: 4, rate: 0.8, avgDuration: 1000 }
          ],
          trends: {
            successTrend: 0.05,
            durationTrend: -100,
            totalAttempts: 50,
            totalSuccesses: 45
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      } as Response);

      const result = await analyticsApi.getStageHistory('lint', 30);
      expect(result).toEqual(mockHistory);
      expect(fetch).toHaveBeenCalledWith('/api/analytics/stages/lint/history?days=30', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get stage statistics', async () => {
      const mockStats = {
        stageId: 'lint',
        statistics: {
          overview: {
            totalAttempts: 100,
            totalSuccesses: 85,
            totalFailures: 15,
            successRate: 0.85,
            averageDuration: 1500,
            medianDuration: 1200,
            minDuration: 800,
            maxDuration: 3000,
            standardDeviation: 400
          },
          recentRuns: [
            {
              timestamp: '2023-01-01T12:00:00Z',
              success: true,
              duration: 1200,
              sessionId: 'session-123'
            }
          ],
          performanceMetrics: {
            durationsPercentiles: {
              p50: 1200,
              p90: 2000,
              p95: 2500,
              p99: 2900
            },
            successRateByTimeOfDay: {
              '12': { attempts: 10, successes: 9, rate: 0.9 }
            },
            failureReasons: {
              'timeout': 5,
              'error': 10
            }
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      } as Response);

      const result = await analyticsApi.getStageStatistics('lint');
      expect(result).toEqual(mockStats);
      expect(fetch).toHaveBeenCalledWith('/api/analytics/stages/lint/statistics', {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('taskApi extended methods', () => {
    it('should get a single task with validation runs', async () => {
      const mockTask = {
        id: 'task-123',
        content: 'Task content',
        status: 'pending',
        priority: 'high',
        validationRuns: [
          { id: 'run-1', status: 'passed' },
          { id: 'run-2', status: 'failed' }
        ]
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTask,
      } as Response);

      const result = await taskApi.getTask('task-123');
      expect(result).toEqual(mockTask);
      expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123', {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });


  describe('claudeWorkersApi', () => {
    it('should start a worker', async () => {
      const mockResponse = {
        workerId: 'worker-123',
        taskId: 'task-123',
        status: 'running',
        pid: 12345,
        logFile: '/path/to/log.log',
        startTime: '2023-01-01T00:00:00.000Z',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.startWorker({
        taskId: 'task-123',
        taskContent: 'Test task content',
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-123',
          taskContent: 'Test task content',
        }),
      });
    });

    it('should start a worker with working directory', async () => {
      const mockResponse = {
        workerId: 'worker-456',
        taskId: 'task-456',
        status: 'starting' as const,
        logFile: '/path/to/log2.log',
        startTime: '2023-01-01T01:00:00.000Z',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.startWorker({
        taskId: 'task-456',
        taskContent: 'Test task content',
        workingDirectory: '/custom/working/dir',
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-456',
          taskContent: 'Test task content',
          workingDirectory: '/custom/working/dir',
        }),
      });
    });

    it('should get workers status', async () => {
      const mockResponse = {
        workers: [],
        activeCount: 0,
        totalCount: 0,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.getWorkersStatus();

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/status', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get specific worker status', async () => {
      const mockResponse = {
        id: 'worker-123',
        taskId: 'task-123',
        taskContent: 'Test content',
        status: 'running',
        startTime: '2023-01-01T00:00:00.000Z',
        pid: 12345,
        logFile: '/path/to/log.log',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.getWorkerStatus('worker-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should stop a worker', async () => {
      const mockResponse = {
        workerId: 'worker-123',
        status: 'stopped',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.stopWorker('worker-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get worker logs', async () => {
      const mockResponse = {
        workerId: 'worker-123',
        logs: 'Log content here',
        logFile: '/path/to/log.log',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.getWorkerLogs('worker-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/logs', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should merge worktree', async () => {
      const mockResponse = {
        message: 'Successfully merged changes from worker-123',
        workerId: 'worker-123',
        mergedBranch: 'feature-branch',
        hasChanges: true,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.mergeWorktree('worker-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/merge-worktree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should open VSCode', async () => {
      const mockResponse = {
        message: 'Opened worktree in VSCode',
        workerId: 'worker-123',
        worktreePath: '/path/to/worktree',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.openVSCode('worker-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/open-vscode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get blocked commands', async () => {
      const mockResponse = {
        workerId: 'worker-123',
        blockedCommands: 2,
        blockedCommandsList: [
          {
            timestamp: '2023-01-01T00:00:00Z',
            command: 'rm -rf /',
            reason: 'Dangerous command',
            suggestion: 'Use specific file paths',
          },
          {
            timestamp: '2023-01-01T00:01:00Z',
            command: 'sudo shutdown',
            reason: 'Requires elevated privileges',
          },
        ],
        hasPermissionSystem: true,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.getBlockedCommands('worker-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/blocked-commands', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get validation runs', async () => {
      const mockResponse = {
        workerId: 'worker-123',
        validationRuns: [
          {
            id: 'run-123',
            timestamp: '2023-01-01T00:00:00Z',
            stages: [
              {
                name: 'lint',
                command: 'npm run lint',
                status: 'passed' as const,
                duration: 2500,
                output: 'All checks passed',
              },
              {
                name: 'test',
                command: 'npm test',
                status: 'failed' as const,
                duration: 15000,
                error: 'Test suite failed',
              },
            ],
            overallStatus: 'failed' as const,
            metricsFile: 'metrics-123.json',
          },
        ],
        totalRuns: 1,
        lastRun: {
          id: 'run-123',
          timestamp: '2023-01-01T00:00:00Z',
          overallStatus: 'failed' as const,
        },
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.getValidationRuns('worker-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/validation-runs', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get validation run details', async () => {
      const mockResponse = {
        workerId: 'worker-123',
        runId: 'run-123',
        validationRun: {
          id: 'run-123',
          timestamp: '2023-01-01T00:00:00Z',
          stages: [
            {
              name: 'lint',
              command: 'npm run lint',
              status: 'passed' as const,
              duration: 2500,
              output: 'All checks passed',
            },
          ],
          overallStatus: 'passed' as const,
          metricsFile: 'metrics-123.json',
        },
        metrics: { someMetric: 'value' },
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.getValidationRunDetails('worker-123', 'run-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/validation-runs/run-123', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should send worker message', async () => {
      const mockResponse = {
        workerId: 'worker-123',
        message: 'Hello worker',
        response: 'Message received',
        success: true,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.sendWorkerMessage('worker-123', {
        message: 'Hello worker',
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello worker' }),
      });
    });

    it('should send follow-up', async () => {
      const mockResponse = {
        message: 'Follow-up sent successfully',
        workerId: 'worker-123',
        timestamp: '2023-01-01T00:00:00Z',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.sendFollowUp('worker-123', 'Additional instructions');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Additional instructions' }),
      });
    });

    it('should merge worker with custom commit message', async () => {
      const mockResponse = {
        success: true,
        message: 'Worker merged successfully',
        branch: 'feature-branch',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.mergeWorker('worker-123', 'Custom commit message');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitMessage: 'Custom commit message' }),
      });
    });

    it('should merge worker changes', async () => {
      const mockResponse = {
        message: 'Changes merged successfully',
        commitHash: 'abc123def',
        targetBranch: 'main',
        commitMessage: 'Automated changes',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await claudeWorkersApi.mergeWorkerChanges('worker-123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/claude-workers/worker-123/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    });
  });

  describe('permissionApi', () => {
    it('should get permission config', async () => {
      const mockConfig = {
        allowedActions: ['READ', 'WRITE'],
        blockedPaths: ['/sensitive'],
        requireConfirmation: true,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      } as Response);

      const result = await permissionApi.getConfig();
      expect(result).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledWith('/api/permissions/config', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should update permission config', async () => {
      const configUpdate = { enableLogging: true };
      const updatedConfig = {
        rules: [],
        defaultAllow: false,
        enableStrictMode: false,
        enableLogging: true,
        strictMode: false,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedConfig,
      } as Response);

      const result = await permissionApi.updateConfig(configUpdate);
      expect(result).toEqual(updatedConfig);
      expect(fetch).toHaveBeenCalledWith('/api/permissions/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configUpdate),
      });
    });

    it('should get permission rules', async () => {
      const mockRules = [{ id: '1', action: 'READ', path: '/test', allowed: true }];
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRules,
      } as Response);

      const result = await permissionApi.getRules();
      expect(result).toEqual(mockRules);
      expect(fetch).toHaveBeenCalledWith('/api/permissions/rules', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should create permission rule', async () => {
      const newRule = { action: 'file_write' as any, resource: '/new', allowed: true, priority: 1, scope: 'specific_path' as any };
      const createdRule = { id: '2', ...newRule };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => createdRule,
      } as Response);

      const result = await permissionApi.createRule(newRule);
      expect(result).toEqual(createdRule);
      expect(fetch).toHaveBeenCalledWith('/api/permissions/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
    });

    it('should update permission rule', async () => {
      const updates = { allowed: false };
      const updatedRule = { id: '1', action: 'read', path: '/test', allowed: false };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedRule,
      } as Response);

      const result = await permissionApi.updateRule('1', updates);
      expect(result).toEqual(updatedRule);
      expect(fetch).toHaveBeenCalledWith('/api/permissions/rules/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    });

    it('should delete permission rule', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await permissionApi.deleteRule('1');
      expect(fetch).toHaveBeenCalledWith('/api/permissions/rules/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should test permission', async () => {
      const context = {
        action: 'read' as any,
        target: '/test/file.txt',
        worktreeDir: '/workspace',
      };
      const testResult = {
        allowed: true,
        reason: 'Permitted by rule',
        matchingRule: { id: '1', action: 'read', path: '/test', allowed: true },
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => testResult,
      } as Response);

      const result = await permissionApi.testPermission(context);
      expect(result).toEqual(testResult);
      expect(fetch).toHaveBeenCalledWith('/api/permissions/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
    });

    it('should get default configs', async () => {
      const defaults = {
        strict: { allowedActions: ['READ'], requireConfirmation: true },
        permissive: { allowedActions: ['READ', 'WRITE', 'EXECUTE'], requireConfirmation: false },
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => defaults,
      } as Response);

      const result = await permissionApi.getDefaultConfigs();
      expect(result).toEqual(defaults);
      expect(fetch).toHaveBeenCalledWith('/api/permissions/defaults', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should import Claude settings', async () => {
      const importResult = {
        importedRules: 5,
        totalRules: 10,
        config: { allowedActions: ['READ'], requireConfirmation: true },
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => importResult,
      } as Response);

      const result = await permissionApi.importClaudeSettings();
      expect(result).toEqual(importResult);
      expect(fetch).toHaveBeenCalledWith('/api/permissions/import-claude-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('e2eTestingApi', () => {
    it('should get test suites', async () => {
      const mockSuites = [{
        id: 'suite-1',
        name: 'Login Tests',
        tests: [],
        totalTests: 5,
        passedTests: 4,
        failedTests: 1,
        duration: 15000,
        timestamp: '2023-01-01T00:00:00Z',
      }];
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuites,
      } as Response);

      const result = await e2eTestingApi.getTestSuites();
      expect(result).toEqual(mockSuites);
      expect(fetch).toHaveBeenCalledWith('/api/e2e/suites?', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get test suites with parameters', async () => {
      const mockSuites = [];
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuites,
      } as Response);

      const params = {
        limit: 10,
        offset: 0,
        status: 'passed',
        dateFrom: '2023-01-01',
        dateTo: '2023-01-31',
      };
      await e2eTestingApi.getTestSuites(params);
      expect(fetch).toHaveBeenCalledWith('/api/e2e/suites?limit=10&offset=0&status=passed&dateFrom=2023-01-01&dateTo=2023-01-31', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get specific test suite', async () => {
      const mockSuite = {
        id: 'suite-1',
        name: 'Login Tests',
        tests: [],
        totalTests: 5,
        passedTests: 4,
        failedTests: 1,
        duration: 15000,
        timestamp: '2023-01-01T00:00:00Z',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuite,
      } as Response);

      const result = await e2eTestingApi.getTestSuite('suite-1');
      expect(result).toEqual(mockSuite);
      expect(fetch).toHaveBeenCalledWith('/api/e2e/suites/suite-1', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should validate gherkin content', async () => {
      const mockValidation = {
        valid: true,
        errors: [],
        warnings: ['Consider adding more specific assertions'],
        suggestions: ['Use more descriptive scenario names'],
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidation,
      } as Response);

      const gherkinContent = 'Given I am on the login page';
      const result = await e2eTestingApi.validateGherkin(gherkinContent);
      expect(result).toEqual(mockValidation);
      expect(fetch).toHaveBeenCalledWith('/api/e2e/gherkin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gherkinContent }),
      });
    });

    it('should generate step definitions', async () => {
      const mockStepDefs = {
        stepDefinitions: [
          'Given(/^I am on the login page$/, async () => {',
          '  // Implementation here',
          '});',
        ],
        language: 'typescript',
        framework: 'playwright',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStepDefs,
      } as Response);

      const gherkinContent = 'Given I am on the login page';
      const result = await e2eTestingApi.generateStepDefinitions(gherkinContent);
      expect(result).toEqual(mockStepDefs);
      expect(fetch).toHaveBeenCalledWith('/api/e2e/step-definitions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gherkinContent }),
      });
    });

    describe('additional e2e testing methods', () => {
      it('should get test history', async () => {
        const mockHistory = {
          id: 'history-123',
          suiteRuns: [
            {
              id: 'suite-1',
              name: 'Login Tests',
              tests: [],
              totalTests: 5,
              passedTests: 4,
              failedTests: 1,
              duration: 15000,
              timestamp: '2023-01-01T00:00:00Z',
            },
          ],
          totalRuns: 10,
          successRate: 0.8,
          averageDuration: 12000,
          lastRunTimestamp: '2023-01-01T12:00:00Z',
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockHistory,
        } as Response);

        const result = await e2eTestingApi.getTestHistory('login.spec.ts');
        expect(result).toEqual(mockHistory);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/history?testFile=login.spec.ts', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get test history with all parameters', async () => {
        const mockHistory = { id: 'history-456', suiteRuns: [], totalRuns: 0, successRate: 0, averageDuration: 0, lastRunTimestamp: '' };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockHistory,
        } as Response);

        const result = await e2eTestingApi.getTestHistory('login.spec.ts', 'should login successfully', 7);
        expect(result).toEqual(mockHistory);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/history?testFile=login.spec.ts&testName=should%20login%20successfully&days=7', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get analytics without parameters', async () => {
        const mockAnalytics = {
          overview: {
            totalSuites: 10,
            totalTests: 50,
            successRate: 0.85,
            averageDuration: 8000,
            recentRuns: 25,
          },
          trends: [
            {
              date: '2023-01-01',
              totalRuns: 5,
              passed: 4,
              failed: 1,
              skipped: 0,
              successRate: 0.8,
              averageDuration: 7500,
            },
          ],
          topFailingTests: [
            {
              testFile: 'auth.spec.ts',
              testName: 'should handle invalid credentials',
              failureRate: 0.3,
              recentFailures: 3,
              lastFailure: '2023-01-01T10:00:00Z',
            },
          ],
          performanceTrends: [
            {
              testFile: 'dashboard.spec.ts',
              testName: 'should load dashboard quickly',
              averageDuration: 5000,
              trend: 150, // getting slower
            },
          ],
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalytics,
        } as Response);

        const result = await e2eTestingApi.getAnalytics();
        expect(result).toEqual(mockAnalytics);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/analytics?', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get analytics with parameters', async () => {
        const params = { days: 30, groupBy: 'file' as const };
        const mockAnalytics = {
          overview: { totalSuites: 5, totalTests: 25, successRate: 0.9, averageDuration: 6000, recentRuns: 15 },
          trends: [],
          topFailingTests: [],
          performanceTrends: [],
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalytics,
        } as Response);

        const result = await e2eTestingApi.getAnalytics(params);
        expect(result).toEqual(mockAnalytics);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/analytics?days=30&groupBy=file', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should link scenario to test', async () => {
        const testData = {
          playwrightTestFile: 'login.spec.ts',
          playwrightTestName: 'should login successfully',
          cucumberSteps: ['Given user is on login page', 'When user enters credentials'],
        };

        const linkedScenario = {
          id: 'scenario-123',
          title: 'User Login',
          feature: 'Authentication',
          description: 'Test user login functionality',
          gherkinContent: 'Given... When... Then...',
          given: 'user is on login page',
          when: 'user enters credentials',
          then: 'user is logged in',
          status: 'pending' as const,
          playwrightTestFile: 'login.spec.ts',
          playwrightTestName: 'should login successfully',
          cucumberSteps: ['Given user is on login page', 'When user enters credentials'],
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => linkedScenario,
        } as Response);

        const result = await e2eTestingApi.linkScenarioToTest('task-123', 'scenario-123', testData);
        expect(result).toEqual(linkedScenario);
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123/link-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData),
        });
      });

      it('should get scenario test results', async () => {
        const mockResults = {
          scenario: {
            id: 'scenario-123',
            title: 'User Login',
            feature: 'Authentication',
            description: 'Test login functionality',
            gherkinContent: 'Given... When... Then...',
            given: 'user is on login page',
            when: 'user enters credentials',
            then: 'user is logged in',
            status: 'passed' as const,
          },
          testResults: [
            {
              id: 'result-1',
              testName: 'should login successfully',
              status: 'passed' as const,
              duration: 3000,
              timestamp: '2023-01-01T00:00:00Z',
            },
          ],
          analytics: {
            totalRuns: 10,
            passedRuns: 9,
            failedRuns: 1,
            successRate: 0.9,
            averageDuration: 3200,
          },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults,
        } as Response);

        const result = await e2eTestingApi.getScenarioTestResults('task-123', 'scenario-123');
        expect(result).toEqual(mockResults);
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123/test-results?', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get scenario test results with parameters', async () => {
        const params = { limit: 5, offset: 10 };
        const mockResults = {
          scenario: { id: 'scenario-123', title: 'Test', feature: 'Feature', description: '', gherkinContent: '', given: '', when: '', then: '', status: 'pending' as const },
          testResults: [],
          analytics: { totalRuns: 0, passedRuns: 0, failedRuns: 0, successRate: 0, averageDuration: 0 },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults,
        } as Response);

        const result = await e2eTestingApi.getScenarioTestResults('task-123', 'scenario-123', params);
        expect(result).toEqual(mockResults);
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123/test-results?limit=5&offset=10', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should trigger test run', async () => {
        const runParams = {
          testFile: 'login.spec.ts',
          testName: 'should login successfully',
          browser: 'chrome',
          headless: true,
          timeout: 30000,
        };

        const mockResponse = {
          runId: 'run-123',
          status: 'started' as const,
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await e2eTestingApi.triggerTestRun(runParams);
        expect(result).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(runParams),
        });
      });

      it('should trigger test run with minimal parameters', async () => {
        const runParams = { testFile: 'basic.spec.ts' };
        const mockResponse = { runId: 'run-456', status: 'queued' as const };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await e2eTestingApi.triggerTestRun(runParams);
        expect(result).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(runParams),
        });
      });

      it('should get run status', async () => {
        const mockStatus = {
          runId: 'run-123',
          status: 'completed' as const,
          progress: {
            totalTests: 10,
            completedTests: 10,
            currentTest: undefined,
          },
          results: {
            id: 'suite-123',
            name: 'Login Test Suite',
            tests: [],
            totalTests: 10,
            passedTests: 9,
            failedTests: 1,
            duration: 25000,
            timestamp: '2023-01-01T00:00:00Z',
          },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatus,
        } as Response);

        const result = await e2eTestingApi.getRunStatus('run-123');
        expect(result).toEqual(mockStatus);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/runs/run-123', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get coverage', async () => {
        const mockCoverage = {
          overview: {
            totalScenarios: 50,
            linkedScenarios: 40,
            unlinkedScenarios: 10,
            coveragePercentage: 80,
          },
          byFeature: [
            {
              feature: 'Authentication',
              totalScenarios: 15,
              linkedScenarios: 12,
              coveragePercentage: 80,
            },
          ],
          trends: [
            {
              date: '2023-01-01',
              coverage: 75,
            },
          ],
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockCoverage,
        } as Response);

        const result = await e2eTestingApi.getCoverage();
        expect(result).toEqual(mockCoverage);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/coverage', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get scenario suggestions', async () => {
        const mockSuggestions = [
          {
            testFile: 'login.spec.ts',
            testName: 'should login with valid credentials',
            confidence: 0.95,
            matchingKeywords: ['login', 'credentials', 'valid'],
          },
          {
            testFile: 'auth.spec.ts',
            testName: 'should authenticate user',
            confidence: 0.8,
            matchingKeywords: ['authenticate', 'user'],
          },
        ];

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuggestions,
        } as Response);

        const result = await e2eTestingApi.getScenarioSuggestions('scenario-123');
        expect(result).toEqual(mockSuggestions);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/scenario-suggestions?scenarioId=scenario-123', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should run cucumber tests', async () => {
        const runParams = {
          features: ['authentication.feature', 'dashboard.feature'],
          tags: ['@smoke', '@regression'],
          parallel: true,
        };

        const mockResponse = {
          runId: 'cucumber-run-123',
          status: 'started' as const,
          message: 'Cucumber tests started successfully',
          estimatedDuration: 180000,
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await e2eTestingApi.runCucumberTests(runParams);
        expect(result).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/cucumber/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(runParams),
        });
      });

      it('should run cucumber tests with minimal parameters', async () => {
        const runParams = { parallel: false };
        const mockResponse = {
          runId: 'cucumber-run-456',
          status: 'started' as const,
          message: 'Cucumber tests started',
          estimatedDuration: 120000,
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await e2eTestingApi.runCucumberTests(runParams);
        expect(result).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/cucumber/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(runParams),
        });
      });

      it('should get cucumber results', async () => {
        const mockResults = {
          runId: 'cucumber-run-123',
          status: 'completed' as const,
          duration: 165000,
          summary: {
            features: 3,
            scenarios: 15,
            steps: 45,
            passed: 40,
            failed: 3,
            skipped: 2,
            pending: 0,
          },
          features: [
            {
              name: 'Authentication',
              scenarios: [
                {
                  name: 'Valid user login',
                  status: 'passed' as const,
                  duration: 3000,
                  steps: [
                    {
                      step: 'Given user is on login page',
                      status: 'passed' as const,
                    },
                    {
                      step: 'When user enters valid credentials',
                      status: 'passed' as const,
                    },
                  ],
                },
              ],
            },
          ],
          reportPath: '/reports/cucumber-report.html',
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults,
        } as Response);

        const result = await e2eTestingApi.getCucumberResults('cucumber-run-123');
        expect(result).toEqual(mockResults);
        expect(fetch).toHaveBeenCalledWith('/api/e2e/cucumber/results/cucumber-run-123', {
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });
  });

  describe('taskApi extended methods', () => {
    it('should get task analytics', async () => {
      const mockAnalytics = {
        overview: {
          totalTasks: 50,
          completedTasks: 30,
          inProgressTasks: 10,
          pendingTasks: 10,
          completionRate: '60%',
          averageCompletionTimeMinutes: 45,
        },
        priorityBreakdown: {
          high: { total: 15, completed: 12, completionRate: '80%' },
          medium: { total: 20, completed: 15, completionRate: '75%' },
          low: { total: 15, completed: 3, completionRate: '20%' },
        },
        recentCompletions: [],
        dailyCompletions: [{ date: '2023-01-01', completed: 5 }],
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics,
      } as Response);

      const result = await taskApi.getTaskAnalytics();
      expect(result).toEqual(mockAnalytics);
      expect(fetch).toHaveBeenCalledWith('/api/tasks/analytics', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should add scenario to task', async () => {
      const scenario = {
        title: 'Login Test',
        feature: 'Authentication',
        description: 'Test user login',
        gherkinContent: 'Given... When... Then...',
        given: 'user is on login page',
        when: 'user enters credentials',
        then: 'user is logged in',
        status: 'pending' as const,
      };
      const createdScenario = { id: 'scenario-123', ...scenario };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => createdScenario,
      } as Response);

      const result = await taskApi.addScenarioToTask('task-123', scenario);
      expect(result).toEqual(createdScenario);
      expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });
    });

    it('should update task scenario', async () => {
      const updates = { status: 'passed' as const };
      const updatedScenario = {
        id: 'scenario-123',
        title: 'Login Test',
        status: 'passed' as const,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedScenario,
      } as Response);

      const result = await taskApi.updateTaskScenario('task-123', 'scenario-123', updates);
      expect(result).toEqual(updatedScenario);
      expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    });

    it('should delete task scenario', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await taskApi.deleteTaskScenario('task-123', 'scenario-123');
      expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    describe('scenario execution methods', () => {
      it('should get scenario executions without parameters', async () => {
        const mockExecutions = [
          {
            id: 'exec-1',
            scenarioId: 'scenario-123',
            status: 'passed' as const,
            executedAt: '2023-01-01T00:00:00Z',
            executionDuration: 5000,
            stepResults: [
              {
                step: 'Given user is on login page',
                status: 'passed' as const,
                duration: 1000,
              },
            ],
            environment: 'test',
            executedBy: 'user-123',
          },
        ];

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockExecutions,
        } as Response);

        const result = await taskApi.getScenarioExecutions('task-123', 'scenario-123');
        expect(result).toEqual(mockExecutions);
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123/executions?', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get scenario executions with parameters', async () => {
        const mockExecutions = [];
        const params = { limit: 10, offset: 5 };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockExecutions,
        } as Response);

        const result = await taskApi.getScenarioExecutions('task-123', 'scenario-123', params);
        expect(result).toEqual(mockExecutions);
        expect(fetch).toHaveBeenCalledWith(
          '/api/tasks/task-123/scenarios/scenario-123/executions?limit=10&offset=5',
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      });

      it('should create scenario execution', async () => {
        const executionData = {
          status: 'passed' as const,
          executionDuration: 3000,
          stepResults: [
            {
              step: 'Given user is logged in',
              status: 'passed' as const,
              duration: 1500,
            },
          ],
          environment: 'production',
          executedBy: 'automated-test',
        };

        const createdExecution = {
          id: 'exec-456',
          scenarioId: 'scenario-123',
          ...executionData,
          executedAt: '2023-01-01T00:00:00Z',
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => createdExecution,
        } as Response);

        const result = await taskApi.createScenarioExecution('task-123', 'scenario-123', executionData);
        expect(result).toEqual(createdExecution);
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123/executions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(executionData),
        });
      });

      it('should create scenario execution with minimal data', async () => {
        const executionData = {
          status: 'failed' as const,
          errorMessage: 'Test failed unexpectedly',
        };

        const createdExecution = {
          id: 'exec-789',
          scenarioId: 'scenario-123',
          ...executionData,
          executedAt: '2023-01-01T00:00:00Z',
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => createdExecution,
        } as Response);

        const result = await taskApi.createScenarioExecution('task-123', 'scenario-123', executionData);
        expect(result).toEqual(createdExecution);
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123/executions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(executionData),
        });
      });

      it('should get scenario analytics without days parameter', async () => {
        const mockAnalytics = {
          summary: {
            totalExecutions: 25,
            passedExecutions: 20,
            failedExecutions: 3,
            skippedExecutions: 2,
            successRate: 0.8,
            averageDuration: 4500,
          },
          trends: [
            {
              date: '2023-01-01',
              total: 5,
              passed: 4,
              failed: 1,
              skipped: 0,
            },
          ],
          recentExecutions: [
            {
              id: 'exec-recent-1',
              status: 'passed',
              executedAt: '2023-01-01T12:00:00Z',
              executionDuration: 4000,
              environment: 'test',
              executedBy: 'user-456',
            },
          ],
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalytics,
        } as Response);

        const result = await taskApi.getScenarioAnalytics('task-123', 'scenario-123');
        expect(result).toEqual(mockAnalytics);
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123/analytics', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get scenario analytics with days parameter', async () => {
        const mockAnalytics = {
          summary: {
            totalExecutions: 10,
            passedExecutions: 8,
            failedExecutions: 2,
            skippedExecutions: 0,
            successRate: 0.8,
            averageDuration: 3500,
          },
          trends: [],
          recentExecutions: [],
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalytics,
        } as Response);

        const result = await taskApi.getScenarioAnalytics('task-123', 'scenario-123', 7);
        expect(result).toEqual(mockAnalytics);
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123/scenarios/scenario-123/analytics?days=7', {
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });
  });

  describe('buildStageAnalyticsQueryParams utility function', () => {
    it('should return empty string when no params provided', () => {
      // We need to test the helper function indirectly through the API methods that use it
      // Since buildStageAnalyticsQueryParams is not exported, we test it through getStageAnalytics
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ overview: {}, stageStatistics: [], trends: [], insights: {} }),
      } as Response);

      analyticsApi.getStageAnalytics();
      expect(fetch).toHaveBeenCalledWith('/api/validation-runs/analytics/stages', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should build query params with all parameters', async () => {
      const params = {
        days: 30,
        environment: 'production',
        stageId: 'lint',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ overview: {}, stageStatistics: [], trends: [], insights: {} }),
      } as Response);

      await analyticsApi.getStageAnalytics(params);
      expect(fetch).toHaveBeenCalledWith(
        '/api/validation-runs/analytics/stages?days=30&environment=production&stageId=lint&startDate=2023-01-01&endDate=2023-01-31',
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    it('should build query params with partial parameters', async () => {
      const params = { days: 7, stageId: 'test' };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ overview: {}, stageStatistics: [], trends: [], insights: {} }),
      } as Response);

      await analyticsApi.getStageAnalytics(params);
      expect(fetch).toHaveBeenCalledWith(
        '/api/validation-runs/analytics/stages?days=7&stageId=test',
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });
  });

  describe('analyticsApi extended database methods', () => {
    describe('getValidationRunsFromDB', () => {
      it('should get validation runs without parameters', async () => {
        const mockRuns = {
          validationRuns: [
            {
              id: 'run-1',
              timestamp: new Date('2023-01-01'),
              success: true,
              duration: 5000,
              stages: [
                {
                  id: 'lint',
                  name: 'Lint',
                  success: true,
                  duration: 1000,
                  output: 'All good',
                },
              ],
            },
          ],
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockRuns,
        } as Response);

        const result = await analyticsApi.getValidationRunsFromDB();
        expect(result).toEqual(mockRuns);
        expect(fetch).toHaveBeenCalledWith('/api/analytics/validation-runs', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get validation runs with limit parameter', async () => {
        const mockRuns = { validationRuns: [] };
        const params = { limit: 10 };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockRuns,
        } as Response);

        const result = await analyticsApi.getValidationRunsFromDB(params);
        expect(result).toEqual(mockRuns);
        expect(fetch).toHaveBeenCalledWith('/api/analytics/validation-runs?limit=10', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get validation runs with todoTaskId parameter', async () => {
        const mockRuns = { validationRuns: [] };
        const params = { todoTaskId: 'task-123' };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockRuns,
        } as Response);

        const result = await analyticsApi.getValidationRunsFromDB(params);
        expect(result).toEqual(mockRuns);
        expect(fetch).toHaveBeenCalledWith('/api/analytics/validation-runs?todoTaskId=task-123', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get validation runs with all parameters', async () => {
        const mockRuns = { validationRuns: [] };
        const params = { limit: 5, todoTaskId: 'task-456' };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockRuns,
        } as Response);

        const result = await analyticsApi.getValidationRunsFromDB(params);
        expect(result).toEqual(mockRuns);
        expect(fetch).toHaveBeenCalledWith('/api/analytics/validation-runs?limit=5&todoTaskId=task-456', {
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });

    describe('getValidationStatisticsFromDB', () => {
      it('should get validation statistics without days parameter', async () => {
        const mockStats = {
          statistics: {
            totalRuns: 100,
            successfulRuns: 85,
            failedRuns: 15,
            successRate: 0.85,
            averageDuration: 5000,
            recentTrend: {
              totalRuns: 20,
              successRate: 0.9,
            },
            stageStatistics: {
              lint: {
                totalAttempts: 100,
                successfulAttempts: 95,
                successRate: 0.95,
                averageDuration: 1500,
              },
            },
          },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats,
        } as Response);

        const result = await analyticsApi.getValidationStatisticsFromDB();
        expect(result).toEqual(mockStats);
        expect(fetch).toHaveBeenCalledWith('/api/analytics/validation-statistics', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get validation statistics with days parameter', async () => {
        const mockStats = {
          statistics: {
            totalRuns: 50,
            successfulRuns: 42,
            failedRuns: 8,
            successRate: 0.84,
            averageDuration: 4500,
            recentTrend: { totalRuns: 10, successRate: 0.8 },
            stageStatistics: {},
          },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats,
        } as Response);

        const result = await analyticsApi.getValidationStatisticsFromDB(30);
        expect(result).toEqual(mockStats);
        expect(fetch).toHaveBeenCalledWith('/api/analytics/validation-statistics?days=30', {
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });

    describe('getValidationRunById', () => {
      it('should get validation run by ID', async () => {
        const mockRun = {
          id: 'run-123',
          taskId: 'task-456',
          sessionId: 'session-789',
          timestamp: '2023-01-01T00:00:00Z',
          startTime: 1672531200000,
          totalTime: 5000,
          totalStages: 5,
          passedStages: 4,
          failedStages: 1,
          success: false,
          triggerType: 'manual',
          environment: 'development',
          gitCommit: 'abc123',
          gitBranch: 'main',
          stages: [
            {
              id: 'stage-1',
              stageId: 'lint',
              stageName: 'Code Linting',
              success: true,
              duration: 1000,
              command: 'npm run lint',
              exitCode: 0,
              output: 'All checks passed',
              enabled: true,
              continueOnFailure: false,
              order: 1,
            },
          ],
          logs: [
            {
              id: 'log-1',
              stageId: 'lint',
              level: 'info',
              message: 'Starting lint check',
              timestamp: '2023-01-01T00:00:00Z',
              metadata: { stage: 'lint' },
            },
          ],
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRun }),
        } as Response);

        const result = await analyticsApi.getValidationRunById('run-123');
        expect(result).toEqual(mockRun);
        expect(fetch).toHaveBeenCalledWith('/api/validation-runs/run-123', {
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });

    describe('getStageAnalytics', () => {
      it('should get stage analytics without parameters', async () => {
        const mockAnalytics = {
          overview: {
            totalStages: 5,
            period: '30 days',
            totalStageExecutions: 500,
          },
          stageStatistics: [
            {
              stageId: 'lint',
              stageName: 'Code Linting',
              totalRuns: 100,
              successfulRuns: 95,
              failedRuns: 5,
              successRate: 0.95,
              totalDuration: 150000,
              avgDuration: 1500,
              minDuration: 800,
              maxDuration: 3000,
              reliability: 'excellent' as const,
            },
          ],
          trends: [
            {
              date: '2023-01-01',
              stageId: 'lint',
              stageName: 'Code Linting',
              totalRuns: 10,
              successfulRuns: 9,
              failedRuns: 1,
              successRate: 0.9,
              avgDuration: 1400,
            },
          ],
          insights: {
            problematicStages: [],
            topPerformingStages: [],
            stageExecutionPattern: [
              {
                runId: 'run-123',
                timestamp: '2023-01-01T00:00:00Z',
                stageSequence: [
                  {
                    stageId: 'lint',
                    success: true,
                    duration: 1500,
                  },
                ],
              },
            ],
          },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalytics,
        } as Response);

        const result = await analyticsApi.getStageAnalytics();
        expect(result).toEqual(mockAnalytics);
        expect(fetch).toHaveBeenCalledWith('/api/validation-runs/analytics/stages', {
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });

    describe('getHistoricalData', () => {
      it('should get historical data without parameters', async () => {
        const mockData = {
          timeline: [
            {
              timestamp: '2023-01-01T00:00:00Z',
              runs: [],
              totalRuns: 10,
              successfulRuns: 8,
              failedRuns: 2,
              averageDuration: 5000,
              successRate: 0.8,
              stagePerformance: {
                lint: {
                  success: 8,
                  total: 10,
                  avgDuration: 1500,
                  successRate: 0.8,
                },
              },
            },
          ],
          summary: {
            totalPeriods: 30,
            granularity: 'daily',
            dateRange: {
              start: '2023-01-01',
              end: '2023-01-31',
            },
          },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        } as Response);

        const result = await analyticsApi.getHistoricalData();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/validation-runs/analytics/history', {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      it('should get historical data with all parameters', async () => {
        const params = {
          days: 7,
          granularity: 'hourly' as const,
          environment: 'production',
          includeStages: true,
        };

        const mockData = {
          timeline: [],
          summary: {
            totalPeriods: 7,
            granularity: 'hourly',
            dateRange: { start: '2023-01-01', end: '2023-01-07' },
          },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        } as Response);

        const result = await analyticsApi.getHistoricalData(params);
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith(
          '/api/validation-runs/analytics/history?days=7&granularity=hourly&environment=production&includeStages=true',
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      });

      it('should handle includeStages false parameter', async () => {
        const params = { includeStages: false };
        const mockData = { timeline: [], summary: { totalPeriods: 30, granularity: 'daily', dateRange: { start: '', end: '' } } };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        } as Response);

        await analyticsApi.getHistoricalData(params);
        expect(fetch).toHaveBeenCalledWith(
          '/api/validation-runs/analytics/history?includeStages=false',
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      });
    });

    describe('getPerformanceComparison', () => {
      it('should get performance comparison with required parameters', async () => {
        const params = {
          period1Start: '2023-01-01',
          period1End: '2023-01-15',
          period2Start: '2023-01-16',
          period2End: '2023-01-31',
        };

        const mockComparison = {
          periods: {
            period1: {
              label: 'Period 1',
              totalRuns: 50,
              successfulRuns: 40,
              failedRuns: 10,
              successRate: 0.8,
              avgDuration: 5000,
              stages: [
                {
                  stageId: 'lint',
                  stageName: 'Code Linting',
                  totalRuns: 50,
                  successfulRuns: 45,
                  successRate: 0.9,
                  avgDuration: 1500,
                },
              ],
            },
            period2: {
              label: 'Period 2',
              totalRuns: 60,
              successfulRuns: 54,
              failedRuns: 6,
              successRate: 0.9,
              avgDuration: 4500,
              stages: [
                {
                  stageId: 'lint',
                  stageName: 'Code Linting',
                  totalRuns: 60,
                  successfulRuns: 57,
                  successRate: 0.95,
                  avgDuration: 1400,
                },
              ],
            },
          },
          comparison: {
            overall: {
              successRate: { value: 0.1, percentage: 12.5, trend: 'up' as const },
              avgDuration: { value: -500, percentage: -10, trend: 'down' as const },
              totalRuns: { value: 10, percentage: 20, trend: 'up' as const },
            },
            stages: [
              {
                stageId: 'lint',
                stageName: 'Code Linting',
                status: 'compared' as const,
                successRateChange: { value: 0.05, percentage: 5.6, trend: 'up' as const },
                durationChange: { value: -100, percentage: -6.7, trend: 'down' as const },
                runsChange: { value: 10, percentage: 20, trend: 'up' as const },
              },
            ],
          },
          insights: {
            improved: 1,
            degraded: 0,
            stable: 0,
            newStages: 0,
            removedStages: 0,
          },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockComparison,
        } as Response);

        const result = await analyticsApi.getPerformanceComparison(params);
        expect(result).toEqual(mockComparison);
        expect(fetch).toHaveBeenCalledWith(
          '/api/validation-runs/analytics/comparison?period1Start=2023-01-01&period1End=2023-01-15&period2Start=2023-01-16&period2End=2023-01-31',
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      });

      it('should get performance comparison with environment parameter', async () => {
        const params = {
          period1Start: '2023-01-01',
          period1End: '2023-01-15',
          period2Start: '2023-01-16',
          period2End: '2023-01-31',
          environment: 'production',
        };

        const mockComparison = {
          periods: { period1: {}, period2: {} },
          comparison: { overall: {}, stages: [] },
          insights: { improved: 0, degraded: 0, stable: 0, newStages: 0, removedStages: 0 },
        };

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockComparison,
        } as Response);

        const result = await analyticsApi.getPerformanceComparison(params);
        expect(result).toEqual(mockComparison);
        expect(fetch).toHaveBeenCalledWith(
          '/api/validation-runs/analytics/comparison?period1Start=2023-01-01&period1End=2023-01-15&period2Start=2023-01-16&period2End=2023-01-31&environment=production',
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      });
    });
  });

  describe('comprehensive error handling for new API methods', () => {
    describe('analyticsApi extended methods error handling', () => {
      it('should handle getValidationRunsFromDB API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response);

        await expect(analyticsApi.getValidationRunsFromDB()).rejects.toThrow(
          'API request failed: 500 Internal Server Error'
        );
      });

      it('should handle getValidationStatisticsFromDB API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);

        await expect(analyticsApi.getValidationStatisticsFromDB(30)).rejects.toThrow(
          'API request failed: 404 Not Found'
        );
      });

      it('should handle getValidationRunById API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        } as Response);

        await expect(analyticsApi.getValidationRunById('run-123')).rejects.toThrow(
          'API request failed: 403 Forbidden'
        );
      });

      it('should handle getStageAnalytics API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
        } as Response);

        await expect(analyticsApi.getStageAnalytics()).rejects.toThrow(
          'API request failed: 502 Bad Gateway'
        );
      });

      it('should handle getHistoricalData API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        } as Response);

        await expect(analyticsApi.getHistoricalData()).rejects.toThrow(
          'API request failed: 429 Too Many Requests'
        );
      });

      it('should handle getPerformanceComparison API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        } as Response);

        const params = {
          period1Start: '2023-01-01',
          period1End: '2023-01-15',
          period2Start: '2023-01-16',
          period2End: '2023-01-31',
        };

        await expect(analyticsApi.getPerformanceComparison(params)).rejects.toThrow(
          'API request failed: 400 Bad Request'
        );
      });
    });

    describe('taskApi scenario methods error handling', () => {
      it('should handle getScenarioExecutions API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);

        await expect(taskApi.getScenarioExecutions('task-123', 'scenario-123')).rejects.toThrow(
          'API request failed: 404 Not Found'
        );
      });

      it('should handle createScenarioExecution API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
        } as Response);

        const executionData = { status: 'failed' as const, errorMessage: 'Test failed' };
        await expect(taskApi.createScenarioExecution('task-123', 'scenario-123', executionData)).rejects.toThrow(
          'API request failed: 422 Unprocessable Entity'
        );
      });

      it('should handle getScenarioAnalytics API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        } as Response);

        await expect(taskApi.getScenarioAnalytics('task-123', 'scenario-123')).rejects.toThrow(
          'API request failed: 503 Service Unavailable'
        );
      });
    });

    describe('e2eTestingApi methods error handling', () => {
      it('should handle getTestHistory API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response);

        await expect(e2eTestingApi.getTestHistory('login.spec.ts')).rejects.toThrow(
          'API request failed: 500 Internal Server Error'
        );
      });

      it('should handle getAnalytics API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response);

        await expect(e2eTestingApi.getAnalytics()).rejects.toThrow(
          'API request failed: 401 Unauthorized'
        );
      });

      it('should handle linkScenarioToTest API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 409,
          statusText: 'Conflict',
        } as Response);

        const testData = {
          playwrightTestFile: 'login.spec.ts',
          playwrightTestName: 'should login successfully',
        };

        await expect(e2eTestingApi.linkScenarioToTest('task-123', 'scenario-123', testData)).rejects.toThrow(
          'API request failed: 409 Conflict'
        );
      });

      it('should handle getScenarioTestResults API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);

        await expect(e2eTestingApi.getScenarioTestResults('task-123', 'scenario-123')).rejects.toThrow(
          'API request failed: 404 Not Found'
        );
      });

      it('should handle triggerTestRun API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        } as Response);

        await expect(e2eTestingApi.triggerTestRun({ testFile: 'login.spec.ts' })).rejects.toThrow(
          'API request failed: 503 Service Unavailable'
        );
      });

      it('should handle getRunStatus API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);

        await expect(e2eTestingApi.getRunStatus('run-123')).rejects.toThrow(
          'API request failed: 404 Not Found'
        );
      });

      it('should handle getCoverage API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response);

        await expect(e2eTestingApi.getCoverage()).rejects.toThrow(
          'API request failed: 500 Internal Server Error'
        );
      });

      it('should handle getScenarioSuggestions API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
        } as Response);

        await expect(e2eTestingApi.getScenarioSuggestions('scenario-123')).rejects.toThrow(
          'API request failed: 422 Unprocessable Entity'
        );
      });

      it('should handle runCucumberTests API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        } as Response);

        await expect(e2eTestingApi.runCucumberTests({ parallel: true })).rejects.toThrow(
          'API request failed: 400 Bad Request'
        );
      });

      it('should handle getCucumberResults API error', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);

        await expect(e2eTestingApi.getCucumberResults('cucumber-run-123')).rejects.toThrow(
          'API request failed: 404 Not Found'
        );
      });
    });

    describe('API responses with success: false', () => {
      it('should handle analyticsApi getValidationRunsFromDB with success: false', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false, message: 'Validation runs not available' }),
        } as Response);

        await expect(analyticsApi.getValidationRunsFromDB()).rejects.toThrow('Validation runs not available');
      });

      it('should handle taskApi createScenarioExecution with success: false', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false, message: 'Scenario execution failed to create' }),
        } as Response);

        const executionData = { status: 'passed' as const };
        await expect(taskApi.createScenarioExecution('task-123', 'scenario-123', executionData)).rejects.toThrow(
          'Scenario execution failed to create'
        );
      });

      it('should handle e2eTestingApi triggerTestRun with success: false', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false, message: 'Test execution could not be triggered' }),
        } as Response);

        await expect(e2eTestingApi.triggerTestRun({ testFile: 'test.spec.ts' })).rejects.toThrow(
          'Test execution could not be triggered'
        );
      });

      it('should handle API responses with success: false and no message', async () => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false }),
        } as Response);

        await expect(analyticsApi.getStageAnalytics()).rejects.toThrow('API request failed');
      });
    });
  });

  describe('edge cases and special scenarios', () => {
    it('should handle empty responses gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await analyticsApi.getValidationRunsFromDB();
      expect(result).toEqual({});
    });

    it('should handle null responses', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      } as Response);

      const result = await taskApi.getScenarioExecutions('task-123', 'scenario-123');
      expect(result).toEqual({ data: null });
    });

    it('should handle network timeout scenarios', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      await expect(e2eTestingApi.getCoverage()).rejects.toThrow('Request timeout');
    });

    it('should handle malformed JSON responses', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token in JSON');
        },
      } as unknown as Response);

      await expect(analyticsApi.getHistoricalData()).rejects.toThrow('Unexpected token in JSON');
    });

    it('should handle URLSearchParams edge cases with undefined values', async () => {
      const params = { limit: undefined as any, offset: undefined as any };
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as Response);

      // URLSearchParams will include undefined values as strings, which is expected behavior
      await taskApi.getScenarioExecutions('task-123', 'scenario-123', params);
      expect(fetch).toHaveBeenCalledWith(
        '/api/tasks/task-123/scenarios/scenario-123/executions?limit=undefined&offset=undefined',
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    it('should handle URL encoding of special characters', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'history-123', suiteRuns: [], totalRuns: 0, successRate: 0, averageDuration: 0, lastRunTimestamp: '' }),
      } as Response);

      await e2eTestingApi.getTestHistory('special/path with spaces.spec.ts', 'test with & symbols');
      expect(fetch).toHaveBeenCalledWith(
        '/api/e2e/history?testFile=special%2Fpath%20with%20spaces.spec.ts&testName=test%20with%20%26%20symbols',
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    it('should handle empty query parameters correctly', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ overview: {}, stageStatistics: [], trends: [], insights: {} }),
      } as Response);

      await analyticsApi.getStageAnalytics({});
      expect(fetch).toHaveBeenCalledWith('/api/validation-runs/analytics/stages', {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });
});
