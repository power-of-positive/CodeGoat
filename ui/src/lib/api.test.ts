import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { settingsApi, analyticsApi, configApi, githubAuthApi, taskApi } from './api';

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
      const mockStages = [{ id: '1', name: 'lint', command: 'npm run lint', enabled: true, timeout: 30000, continueOnFailure: false, priority: 1 }];
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
        averageStageTime: { lint: 1500 }
      };
      const mockStages = [
        { id: 'lint', name: 'Code Linting', enabled: true, timeout: 30000, continueOnFailure: false, priority: 1 }
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
            totalRuns: 10 
          } 
        }
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
            attempts: [{ stages: [{ id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 }] }]
          }
        ]
      };
      const expectedRuns = [
        {
          id: 'session-1',
          timestamp: new Date(mockSessions.sessions[0].startTime).toISOString(),
          success: true,
          duration: 5000,
          stages: [{ id: 'lint', name: 'Lint', success: true, duration: 1000, attempt: 1 }]
        }
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

      await expect(settingsApi.getSettings()).rejects.toThrow('API request failed: 500 Internal Server Error');
    });

    it('should handle validation stages API error gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(settingsApi.getValidationStages()).rejects.toThrow('API request failed: 404 Not Found');
    });

    it('should handle add validation stage API error', async () => {
      const newStage = { 
        name: 'Test', 
        command: 'test', 
        timeout: 30000, 
        enabled: true, 
        continueOnFailure: false, 
        priority: 1 
      };
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(settingsApi.addValidationStage(newStage)).rejects.toThrow('API request failed: 400 Bad Request');
    });

    it('should handle update validation stage API error', async () => {
      const updates = { name: 'Updated' };
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(settingsApi.updateValidationStage('lint', updates)).rejects.toThrow('API request failed: 403 Forbidden');
    });

    it('should handle remove validation stage API error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(settingsApi.removeValidationStage('nonexistent')).rejects.toThrow('API request failed: 404 Not Found');
    });

    it('should handle analytics metrics API error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(analyticsApi.getValidationMetrics()).rejects.toThrow('API request failed: 500 Internal Server Error');
    });

    it('should handle analytics runs API error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      } as Response);

      await expect(analyticsApi.getValidationRuns()).rejects.toThrow('API request failed: 502 Bad Gateway');
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
      expect(fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    it('should handle getTasks error gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      await expect(taskApi.getTasks()).rejects.toThrow('Network error');
    });

    it('should create task', async () => {
      const task = { 
        content: 'New task', 
        status: 'pending' as const, 
        priority: 'medium' as const,
        taskType: 'task' as const,
        executorId: 'claude_code'
      };
      const responseTask = { ...task, id: 'task-123' };
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => responseTask,
      } as Response);

      const result = await taskApi.createTask(task);
      expect(result).toEqual(responseTask);
      expect(fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(task)
      }));
    });

    it('should update task', async () => {
      const updates = { status: 'completed' as const };
      const responseTask = { id: 'task-123', content: 'Task', status: 'completed' as const, priority: 'medium' as const };
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => responseTask,
      } as Response);

      const result = await taskApi.updateTask('task-123', updates);
      expect(result).toEqual(responseTask);
      expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updates)
      }));
    });

    it('should delete task', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await taskApi.deleteTask('task-123');
      expect(fetch).toHaveBeenCalledWith('/api/tasks/task-123', expect.objectContaining({
        method: 'DELETE'
      }));
    });

    it('should handle addValidationStage API call', async () => {
      const mockStage = {
        name: 'Test Stage',
        command: 'npm test',
        enabled: true,
        timeout: 60000,
        continueOnFailure: false,
        order: 1,
        priority: 1
      };
      
      const responseStage = { ...mockStage, id: 'stage-123' };
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stage: responseStage }),
      } as Response);

      const result = await settingsApi.addValidationStage(mockStage);
      expect(result).toEqual(responseStage);
      expect(fetch).toHaveBeenCalledWith('/api/settings/validation/stages', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockStage)
      }));
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
      expect(fetch).toHaveBeenCalledWith('/api/settings/validation/stages/stage-123', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updates)
      }));
    });

    it('should handle removeValidationStage API call', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await settingsApi.removeValidationStage('stage-123');
      expect(fetch).toHaveBeenCalledWith('/api/settings/validation/stages/stage-123', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });
});