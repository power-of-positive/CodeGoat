import { SettingsService } from '../../services/settings.service';
import { createMockLogger } from '../../test-helpers/logger.mock';
import fs from 'fs/promises';
import { z } from 'zod';

jest.mock('fs/promises');

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    settingsService = new SettingsService(mockLogger);
    jest.clearAllMocks();
  });

  describe('loadSettings', () => {
    it('should load settings from file', async () => {
      const mockSettings = {
        fallback: { maxRetries: 5, retryDelay: 2000, enableFallbacks: true },
        validation: { stages: [], enableMetrics: false, maxAttempts: 3 },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const settings = await settingsService.loadSettings();

      expect(settings).toEqual(expect.objectContaining(mockSettings));
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf-8');
    });

    it('should return default settings when file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const settings = await settingsService.loadSettings();

      expect(settings.fallback).toEqual({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Settings file not found, using defaults');
    });

    it('should return default settings on error', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

      const settings = await settingsService.loadSettings();

      expect(settings).toHaveProperty('fallback');
      expect(settings).toHaveProperty('validation');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('saveSettings', () => {
    it('should save settings to file', async () => {
      const settings = {
        fallback: { maxRetries: 5 },
        validation: { stages: [], enableMetrics: true, maxAttempts: 5 },
      };

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await settingsService.saveSettings(settings as any);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        JSON.stringify(settings, null, 2),
        'utf-8'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Settings saved successfully');
    });

    it('should throw error when save fails', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write error'));

      await expect(settingsService.saveSettings({} as any)).rejects.toThrow(
        'Failed to save settings'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should update settings with partial updates', async () => {
      const currentSettings = {
        fallback: { maxRetries: 3, retryDelay: 1000, enableFallbacks: true },
        validation: { stages: [], enableMetrics: true, maxAttempts: 5 },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const updates = { fallback: { maxRetries: 5 } };
      const result = await settingsService.updateSettings(updates);

      expect(result.fallback?.maxRetries).toBe(5);
      expect(result.fallback?.retryDelay).toBe(1000); // Preserved
    });

    it('should validate settings before updating', async () => {
      const invalidUpdates = { fallback: { maxRetries: 15 } }; // Too high

      await expect(settingsService.updateSettings(invalidUpdates)).rejects.toThrow(z.ZodError);
    });
  });

  describe('getFallbackSettings', () => {
    it('should return fallback settings', async () => {
      const mockSettings = {
        fallback: {
          maxRetries: 5,
          retryDelay: 2000,
          enableFallbacks: false,
          fallbackOnContextLength: true,
          fallbackOnRateLimit: false,
          fallbackOnServerError: true,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const fallback = await settingsService.getFallbackSettings();

      expect(fallback).toEqual(mockSettings.fallback);
    });

    it('should return default fallback settings when not set', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));

      const fallback = await settingsService.getFallbackSettings();

      expect(fallback.maxRetries).toBe(3);
      expect(fallback.enableFallbacks).toBe(true);
    });
  });

  describe('addValidationStage', () => {
    it('should add new validation stage', async () => {
      const currentSettings = {
        validation: { stages: [], enableMetrics: true, maxAttempts: 5 },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const newStage = {
        id: 'custom-check',
        name: 'Custom Check',
        command: 'npm run custom',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        order: 1,
      };

      const result = await settingsService.addValidationStage(newStage);

      expect(result).toEqual(newStage);
      expect(mockLogger.info).toHaveBeenCalledWith('Validation stage added', {
        stageId: 'custom-check',
      });
    });

    it('should reject duplicate stage IDs', async () => {
      const currentSettings = {
        validation: {
          stages: [{ id: 'lint', name: 'Lint' }],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));

      const duplicateStage = {
        id: 'lint',
        name: 'Another Lint',
        command: 'eslint',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        order: 1,
      };

      await expect(settingsService.addValidationStage(duplicateStage)).rejects.toThrow(
        'Stage with this ID already exists'
      );
    });

    it('should sort stages by order', async () => {
      const currentSettings = {
        validation: {
          stages: [
            { id: 'test', order: 3 },
            { id: 'lint', order: 1 },
          ],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const newStage = {
        id: 'typecheck',
        name: 'Type Check',
        command: 'tsc',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        order: 2,
      };

      await settingsService.addValidationStage(newStage);

      const savedSettings = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      const stageIds = savedSettings.validation.stages.map((s: any) => s.id);
      expect(stageIds).toEqual(['lint', 'typecheck', 'test']);
    });
  });

  describe('removeValidationStage', () => {
    it('should remove validation stage', async () => {
      const currentSettings = {
        validation: {
          stages: [
            { id: 'lint', name: 'Lint' },
            { id: 'test', name: 'Test' },
          ],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await settingsService.removeValidationStage('lint');

      const savedSettings = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedSettings.validation.stages).toHaveLength(1);
      expect(savedSettings.validation.stages[0].id).toBe('test');
      expect(mockLogger.info).toHaveBeenCalledWith('Validation stage removed', { stageId: 'lint' });
    });

    it('should throw error when stage not found', async () => {
      const currentSettings = {
        validation: { stages: [{ id: 'lint' }] },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));

      await expect(settingsService.removeValidationStage('nonexistent')).rejects.toThrow(
        'Validation stage not found'
      );
    });
  });

  describe('getEnabledValidationStages', () => {
    it('should return only enabled stages in order', async () => {
      const currentSettings = {
        validation: {
          stages: [
            { id: 'test', enabled: true, order: 3 },
            { id: 'lint', enabled: true, order: 1 },
            { id: 'disabled', enabled: false, order: 2 },
            { id: 'typecheck', enabled: true, order: 2 },
          ],
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));

      const stages = await settingsService.getEnabledValidationStages();

      expect(stages).toHaveLength(3);
      expect(stages.map(s => s.id)).toEqual(['lint', 'typecheck', 'test']);
    });

    it('should return default enabled stages when no settings exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const stages = await settingsService.getEnabledValidationStages();

      // Should return default enabled stages except e2e which is disabled by default
      expect(stages).toHaveLength(4);
      expect(stages.map(s => s.id)).toEqual(['lint', 'typecheck', 'test', 'typescript-preference']);
    });
  });

  describe('validation methods', () => {
    it('should validate settings without saving', () => {
      const validSettings = {
        fallback: { maxRetries: 5 },
      };

      const result = settingsService.validateSettings(validSettings);
      expect(result).toHaveProperty('fallback.maxRetries', 5);
    });

    it('should throw on invalid settings', () => {
      const invalidSettings = {
        fallback: { maxRetries: 'invalid' },
      };

      expect(() => settingsService.validateSettings(invalidSettings)).toThrow(z.ZodError);
    });

    it('should validate fallback settings', () => {
      const validFallback = {
        maxRetries: 5,
        retryDelay: 2000,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: false,
        fallbackOnServerError: false,
      };

      const result = settingsService.validateFallbackSettings(validFallback);
      expect(result).toEqual(validFallback);
    });

    it('should validate validation stage', () => {
      const validStage = {
        id: 'test',
        name: 'Test',
        command: 'npm test',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        order: 1,
      };

      const result = settingsService.validateValidationStage(validStage);
      expect(result).toEqual(validStage);
    });
  });
});
