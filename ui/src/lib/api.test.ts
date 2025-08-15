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
      const mockMetrics = { totalRuns: 10, successRate: 0.8, averageDuration: 5000, stageMetrics: {} };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      } as Response);

      const result = await analyticsApi.getValidationMetrics();
      expect(result).toEqual(mockMetrics);
      expect(fetch).toHaveBeenCalledWith('/api/analytics/validation-metrics', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get validation runs', async () => {
      const mockRuns = [{ id: '1', timestamp: new Date().toISOString(), success: true, duration: 5000, stages: [] }];
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRuns,
      } as Response);

      const result = await analyticsApi.getValidationRuns();
      expect(result).toEqual(mockRuns);
      expect(fetch).toHaveBeenCalledWith('/api/analytics/validation-runs', {
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