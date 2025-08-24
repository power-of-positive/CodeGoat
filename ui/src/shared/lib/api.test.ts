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
      const mockSessions = {
        sessions: [
          {
            sessionId: 'session-1',
            startTime: Date.now(),
            finalSuccess: true,
            totalDuration: 5000,
            attempts: [
              { stages: [{ id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 }] },
            ],
          },
        ],
      };
      const expectedRuns = [
        {
          id: 'session-1',
          timestamp: new Date(mockSessions.sessions[0].startTime).toISOString(),
          success: true,
          duration: 5000,
          stages: [{ id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 }],
        },
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      } as Response);

      const result = await analyticsApi.getValidationRuns();
      expect(result).toEqual(expectedRuns);
      expect(fetch).toHaveBeenCalledWith('/api/analytics/sessions?limit=1000', {
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
  });
});
