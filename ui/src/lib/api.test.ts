import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { settingsApi, analyticsApi } from './api';

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
        stageSuccessRates: { lint: { attempts: 10, successes: 8, rate: 80 } }
      };
      const expectedMetrics = {
        totalRuns: 10,
        successfulRuns: 8,
        failedRuns: 2,
        successRate: 80,
        averageDuration: 5000,
        stageMetrics: { lint: { attempts: 10, successes: 8, rate: 80 } }
      };
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics,
      } as Response);

      const result = await analyticsApi.getValidationMetrics();
      expect(result).toEqual(expectedMetrics);
      expect(fetch).toHaveBeenCalledWith('/api/analytics/', {
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
      expect(fetch).toHaveBeenCalledWith('/api/analytics/sessions', {
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
  });
});