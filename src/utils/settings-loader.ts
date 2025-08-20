import fs from 'fs/promises';
import path from 'path';
import {
  Settings,
  FallbackSettings,
  ValidationSettings,
  ValidationStage,
} from '../types/settings.types';

export class SettingsLoader {
  private settingsPath: string;
  private cachedSettings: Settings | null = null;
  private lastLoadTime = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.settingsPath = path.join(process.cwd(), 'settings.json');
  }

  async loadSettings(): Promise<Settings> {
    const now = Date.now();

    // Return cached settings if they're still fresh
    if (this.cachedSettings && now - this.lastLoadTime < this.CACHE_TTL) {
      return this.cachedSettings;
    }

    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      this.cachedSettings = JSON.parse(content);
      this.lastLoadTime = now;
      return this.cachedSettings!;
    } catch {
      const defaultSettings = await this.getDefaultSettings();
      this.cachedSettings = defaultSettings;
      this.lastLoadTime = now;
      return defaultSettings;
    }
  }

  private async getDefaultSettings(): Promise<Settings> {
    return {
      fallback: await this.getDefaultFallbackSettings(),
      validation: await this.getDefaultValidationSettings(),
    };
  }

  private async getDefaultFallbackSettings(): Promise<FallbackSettings> {
    try {
      const configPath = path.join(__dirname, '../config/default-fallback.json');
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Fallback to hardcoded defaults if JSON file is missing
      return {
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      };
    }
  }

  private async getDefaultValidationSettings(): Promise<ValidationSettings> {
    try {
      const configPath = path.join(__dirname, '../config/default-validation.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const baseSettings = JSON.parse(content);

      const stages = await this.getDefaultValidationStages();
      return {
        ...baseSettings,
        stages,
      };
    } catch {
      // Fallback to hardcoded defaults if JSON file is missing
      return {
        stages: await this.getDefaultValidationStages(),
        enableMetrics: true,
        maxAttempts: 5,
      };
    }
  }

  private async getDefaultValidationStages(): Promise<ValidationStage[]> {
    try {
      const configPath = path.join(__dirname, '../config/default-validation-stages.json');
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Fallback to hardcoded defaults if JSON file is missing
      return [
        {
          id: 'lint',
          name: 'Code Linting',
          command: 'npm run lint',
          timeout: 30000,
          enabled: true,
          continueOnFailure: false,
          priority: 1,
        },
        {
          id: 'typecheck',
          name: 'Type Checking',
          command: 'npm run type-check',
          timeout: 30000,
          enabled: true,
          continueOnFailure: false,
          priority: 2,
        },
        {
          id: 'test',
          name: 'Unit Tests',
          command: 'npm test',
          timeout: 60000,
          enabled: true,
          continueOnFailure: true,
          priority: 3,
        },
      ];
    }
  }

  async getFallbackSettings(): Promise<FallbackSettings> {
    const settings = await this.loadSettings();
    return settings.fallback || (await this.getDefaultFallbackSettings());
  }

  async getValidationSettings(): Promise<ValidationSettings> {
    const settings = await this.loadSettings();
    return settings.validation || (await this.getDefaultValidationSettings());
  }

  invalidateCache(): void {
    this.cachedSettings = null;
    this.lastLoadTime = 0;
  }
}
