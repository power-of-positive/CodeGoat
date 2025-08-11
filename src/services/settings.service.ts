import fs from 'fs/promises';
import path from 'path';
import { ILogger } from '../logger-interface';
import {
  settingsSchema,
  fallbackSettingsSchema,
  validationStageSchema,
} from '../types/settings.types';
import type {
  Settings,
  PartialSettings,
  FallbackSettings,
  ValidationSettings,
  ValidationStage,
} from '../types/settings.types';
import type { LoggingSettings } from '../types/settings.types';
import { DEFAULT_SETTINGS } from '../constants/settings.constants';

// Re-export types for backward compatibility
export type {
  Settings,
  PartialSettings,
  FallbackSettings,
  ValidationSettings,
  ValidationStage,
  LoggingSettings,
} from '../types/settings.types';

export class SettingsService {
  private settingsPath: string;
  private logger: ILogger;

  constructor(logger: ILogger, settingsPath?: string) {
    this.logger = logger;
    this.settingsPath = settingsPath || path.join(process.cwd(), 'settings.json');
  }

  /**
   * Load settings from file or return defaults
   */
  async loadSettings(): Promise<Settings> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      const parsed = JSON.parse(content);
      // Validate and merge with defaults
      const defaultSettings = await DEFAULT_SETTINGS;
      return { ...defaultSettings, ...parsed };
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        // File doesn't exist, return defaults
        this.logger.info('Settings file not found, using defaults');
        return await DEFAULT_SETTINGS;
      }
      this.logger.error('Failed to load settings', error as Error);
      return await DEFAULT_SETTINGS;
    }
  }

  /**
   * Save settings to file
   */
  async saveSettings(settings: Settings): Promise<void> {
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      this.logger.info('Settings saved successfully');
    } catch (error) {
      this.logger.error('Failed to save settings', error as Error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get all settings
   */
  async getSettings(): Promise<Settings> {
    return this.loadSettings();
  }

  /**
   * Update settings (partial update supported)
   */
  async updateSettings(updates: PartialSettings): Promise<Settings> {
    const currentSettings = await this.loadSettings();

    // Deep merge settings with partial updates
    const mergedSettings = {
      ...currentSettings,
      ...updates,
      fallback: updates.fallback
        ? {
            ...currentSettings.fallback,
            ...updates.fallback,
          }
        : currentSettings.fallback,
      validation: updates.validation
        ? {
            ...currentSettings.validation,
            ...updates.validation,
          }
        : currentSettings.validation,
      logging: updates.logging
        ? {
            ...currentSettings.logging,
            ...updates.logging,
          }
        : currentSettings.logging,
    };

    // Validate the merged settings
    const validatedSettings = settingsSchema.parse(mergedSettings);

    await this.saveSettings(validatedSettings);
    return validatedSettings;
  }

  /**
   * Get fallback settings
   */
  async getFallbackSettings(): Promise<FallbackSettings> {
    const settings = await this.loadSettings();
    const defaultSettings = await DEFAULT_SETTINGS;
    return settings.fallback || defaultSettings.fallback!;
  }

  /**
   * Update fallback settings
   */
  async updateFallbackSettings(fallbackSettings: FallbackSettings): Promise<FallbackSettings> {
    const validated = fallbackSettingsSchema.parse(fallbackSettings);
    const currentSettings = await this.loadSettings();

    currentSettings.fallback = validated;
    await this.saveSettings(currentSettings);

    this.logger.info('Fallback settings updated', { settings: validated });
    return validated;
  }

  /**
   * Get validation settings
   */
  async getValidationSettings(): Promise<ValidationSettings> {
    const settings = await this.loadSettings();
    const defaultSettings = await DEFAULT_SETTINGS;
    return settings.validation || defaultSettings.validation!;
  }

  /**
   * Update validation settings
   */
  async updateValidationSettings(
    validationSettings: ValidationSettings
  ): Promise<ValidationSettings> {
    const currentSettings = await this.loadSettings();

    currentSettings.validation = validationSettings;
    await this.saveSettings(currentSettings);

    this.logger.info('Validation settings updated', {
      stageCount: validationSettings.stages.length,
    });

    return validationSettings;
  }

  /**
   * Add a validation stage
   */
  async addValidationStage(stage: ValidationStage): Promise<ValidationStage> {
    const validated = validationStageSchema.parse(stage);
    const currentSettings = await this.loadSettings();

    if (!currentSettings.validation) {
      const defaultSettings = await DEFAULT_SETTINGS;
      currentSettings.validation = defaultSettings.validation!;
    }

    // Check for duplicate ID
    const existingStage = currentSettings.validation.stages.find(s => s.id === validated.id);

    if (existingStage) {
      throw new Error('Stage with this ID already exists');
    }

    currentSettings.validation.stages.push(validated);
    currentSettings.validation.stages.sort((a, b) => a.order - b.order);

    await this.saveSettings(currentSettings);
    this.logger.info('Validation stage added', { stageId: validated.id });

    return validated;
  }

  /**
   * Update a validation stage
   */
  async updateValidationStage(
    id: string,
    updates: Partial<ValidationStage>
  ): Promise<ValidationStage> {
    const currentSettings = await this.loadSettings();

    if (!currentSettings.validation?.stages) {
      throw new Error('No validation stages found');
    }

    const stageIndex = currentSettings.validation.stages.findIndex(s => s.id === id);
    if (stageIndex === -1) {
      throw new Error('Validation stage not found');
    }

    const updatedStage = {
      ...currentSettings.validation.stages[stageIndex],
      ...updates,
      id, // Preserve original ID
    };

    const validated = validationStageSchema.parse(updatedStage);
    currentSettings.validation.stages[stageIndex] = validated;
    currentSettings.validation.stages.sort((a, b) => a.order - b.order);

    await this.saveSettings(currentSettings);
    this.logger.info('Validation stage updated', { stageId: id });

    return validated;
  }

  /**
   * Remove a validation stage
   */
  async removeValidationStage(id: string): Promise<void> {
    const currentSettings = await this.loadSettings();

    if (!currentSettings.validation?.stages) {
      throw new Error('No validation stages found');
    }

    const initialLength = currentSettings.validation.stages.length;
    currentSettings.validation.stages = currentSettings.validation.stages.filter(
      stage => stage.id !== id
    );

    if (currentSettings.validation.stages.length === initialLength) {
      throw new Error('Validation stage not found');
    }

    await this.saveSettings(currentSettings);
    this.logger.info('Validation stage removed', { stageId: id });
  }

  /**
   * Get a specific validation stage
   */
  async getValidationStage(id: string): Promise<ValidationStage | undefined> {
    const settings = await this.loadSettings();
    return settings.validation?.stages.find(s => s.id === id);
  }

  /**
   * Get enabled validation stages in order
   */
  async getEnabledValidationStages(): Promise<ValidationStage[]> {
    const settings = await this.loadSettings();
    if (!settings.validation?.stages) {
      return [];
    }

    return settings.validation.stages
      .filter(stage => stage.enabled)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Validate settings without saving
   */
  validateSettings(settings: unknown): Settings {
    return settingsSchema.parse(settings);
  }

  /**
   * Validate fallback settings without saving
   */
  validateFallbackSettings(settings: unknown): FallbackSettings {
    return fallbackSettingsSchema.parse(settings);
  }

  /**
   * Validate validation stage without saving
   */
  validateValidationStage(stage: unknown): ValidationStage {
    return validationStageSchema.parse(stage);
  }

  /**
   * Get logging settings
   */
  async getLoggingSettings(): Promise<LoggingSettings> {
    const settings = await this.loadSettings();
    const defaultSettings = await DEFAULT_SETTINGS;
    return settings.logging || defaultSettings.logging!;
  }
}
