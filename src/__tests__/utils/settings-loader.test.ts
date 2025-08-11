import { SettingsLoader } from '../../utils/settings-loader';
import fs from 'fs/promises';
import path from 'path';

jest.mock('fs/promises');

describe('SettingsLoader', () => {
  let settingsLoader: SettingsLoader;

  beforeEach(() => {
    settingsLoader = new SettingsLoader();
    jest.clearAllMocks();
    // Clear any cached settings between tests
    (settingsLoader as any).cachedSettings = null;
    (settingsLoader as any).lastLoadTime = 0;
  });

  describe('loadSettings', () => {
    it('should load settings from file successfully', async () => {
      const mockSettings = {
        fallback: {
          maxRetries: 5,
          retryDelay: 2000,
          enableFallbacks: true,
          fallbackOnContextLength: true,
          fallbackOnRateLimit: false,
          fallbackOnServerError: false,
        },
        validation: {
          stages: [
            {
              id: 'custom-test',
              name: 'Custom Test',
              command: 'npm run test:custom',
              timeout: 45000,
              enabled: true,
              continueOnFailure: false,
              order: 1,
            },
          ],
          enableMetrics: false,
          maxAttempts: 3,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const result = await settingsLoader.loadSettings();

      expect(result).toEqual(mockSettings);
      expect(fs.readFile).toHaveBeenCalledWith(path.join(process.cwd(), 'settings.json'), 'utf-8');
    });

    it('should return default settings when file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const result = await settingsLoader.loadSettings();

      expect(result).toEqual({
        fallback: {
          maxRetries: 3,
          retryDelay: 1000,
          enableFallbacks: true,
          fallbackOnContextLength: true,
          fallbackOnRateLimit: true,
          fallbackOnServerError: false,
        },
        validation: {
          stages: expect.arrayContaining([
            expect.objectContaining({ id: 'lint' }),
            expect.objectContaining({ id: 'typecheck' }),
            expect.objectContaining({ id: 'test' }),
          ]),
          enableMetrics: true,
          maxAttempts: 5,
        },
      });
    });

    it('should return default settings when file has invalid JSON', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json content');

      const result = await settingsLoader.loadSettings();

      expect(result.fallback).toEqual({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      });
    });

    it('should cache settings for subsequent calls', async () => {
      const mockSettings = { fallback: { maxRetries: 3 } };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      // First call
      await settingsLoader.loadSettings();
      // Second call
      await settingsLoader.loadSettings();

      // File should only be read once due to caching
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should reload settings after cache TTL expires', async () => {
      const mockSettings = { fallback: { maxRetries: 3 } };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      // Override cache TTL for testing
      (settingsLoader as any).CACHE_TTL = 0;

      // First call
      await settingsLoader.loadSettings();
      // Second call after TTL expires
      await settingsLoader.loadSettings();

      // File should be read twice
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFallbackSettings', () => {
    it('should return fallback settings from loaded settings', async () => {
      const mockSettings = {
        fallback: {
          maxRetries: 5,
          retryDelay: 2000,
          enableFallbacks: false,
          fallbackOnContextLength: false,
          fallbackOnRateLimit: true,
          fallbackOnServerError: true,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const result = await settingsLoader.getFallbackSettings();

      expect(result).toEqual(mockSettings.fallback);
    });

    it('should return default fallback settings when no settings exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const result = await settingsLoader.getFallbackSettings();

      expect(result).toEqual({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      });
    });

    it('should return default fallback settings when fallback key is missing', async () => {
      const mockSettings = {
        validation: { stages: [], enableMetrics: true, maxAttempts: 5 },
      };

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockSettings)) // First call for settings.json
        .mockRejectedValue({ code: 'ENOENT' }); // Subsequent calls for default config files

      const result = await settingsLoader.getFallbackSettings();

      expect(result).toEqual({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      });
    });
  });

  describe('getValidationSettings', () => {
    it('should return validation settings from loaded settings', async () => {
      const mockSettings = {
        validation: {
          stages: [
            {
              id: 'lint',
              name: 'Linting',
              command: 'eslint .',
              timeout: 30000,
              enabled: true,
              continueOnFailure: false,
              order: 1,
            },
          ],
          enableMetrics: false,
          maxAttempts: 2,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const result = await settingsLoader.getValidationSettings();

      expect(result).toEqual(mockSettings.validation);
    });

    it('should return default validation settings when no settings exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const result = await settingsLoader.getValidationSettings();

      expect(result).toEqual({
        stages: expect.arrayContaining([
          expect.objectContaining({ id: 'lint' }),
          expect.objectContaining({ id: 'typecheck' }),
          expect.objectContaining({ id: 'test' }),
        ]),
        enableMetrics: true,
        maxAttempts: 5,
      });
    });

    it('should return default validation settings when validation key is missing', async () => {
      const mockSettings = {
        fallback: { maxRetries: 3, retryDelay: 1000, enableFallbacks: true },
      };

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockSettings)) // First call for settings.json
        .mockRejectedValue({ code: 'ENOENT' }); // Subsequent calls for default config files

      const result = await settingsLoader.getValidationSettings();

      expect(result).toEqual({
        stages: expect.arrayContaining([
          expect.objectContaining({ id: 'lint' }),
          expect.objectContaining({ id: 'typecheck' }),
          expect.objectContaining({ id: 'test' }),
        ]),
        enableMetrics: true,
        maxAttempts: 5,
      });
    });
  });

  describe('invalidateCache', () => {
    it('should clear cached settings', async () => {
      const mockSettings = { fallback: { maxRetries: 3 } };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      // Load settings to cache them
      await settingsLoader.loadSettings();
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Invalidate cache
      settingsLoader.invalidateCache();

      // Next load should read from file again
      await settingsLoader.loadSettings();
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle permission errors gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({
        code: 'EACCES',
        message: 'Permission denied',
      });

      const result = await settingsLoader.loadSettings();

      // Should return default settings instead of throwing
      expect(result.fallback?.maxRetries).toBe(3);
      expect(result.validation?.enableMetrics).toBe(true);
    });

    it('should handle corrupted settings file gracefully', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('{ invalid json }');

      const result = await settingsLoader.loadSettings();

      // Should return default settings when JSON parsing fails
      expect(result.fallback?.maxRetries).toBe(3);
      expect(result.validation?.enableMetrics).toBe(true);
    });

    it('should handle network/IO errors gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await settingsLoader.loadSettings();

      // Should return default settings for any other errors
      expect(result.fallback?.maxRetries).toBe(3);
      expect(result.validation?.enableMetrics).toBe(true);
    });
  });
});
