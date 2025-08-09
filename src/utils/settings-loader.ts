import fs from 'fs/promises';
import path from 'path';

interface FallbackSettings {
  maxRetries: number;
  retryDelay: number;
  enableFallbacks: boolean;
  fallbackOnContextLength: boolean;
  fallbackOnRateLimit: boolean;
  fallbackOnServerError: boolean;
}

interface ValidationStage {
  id: string;
  name: string;
  command: string;
  workingDir?: string;
  timeout: number;
  enabled: boolean;
  continueOnFailure: boolean;
  order: number;
}

interface ValidationSettings {
  stages: ValidationStage[];
  enableMetrics: boolean;
  maxAttempts: number;
}

interface Settings {
  fallback?: FallbackSettings;
  validation?: ValidationSettings;
}

export class SettingsLoader {
  private settingsPath: string;
  private cachedSettings: Settings | null = null;
  private lastLoadTime = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.settingsPath = path.join(process.cwd(), 'settings.json');
  }

  // eslint-disable-next-line max-lines-per-function
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
      // Return default settings if file doesn't exist or is invalid
      const defaultSettings: Settings = {
        fallback: {
          maxRetries: 3,
          retryDelay: 1000,
          enableFallbacks: true,
          fallbackOnContextLength: true,
          fallbackOnRateLimit: true,
          fallbackOnServerError: false,
        },
        validation: {
          stages: [
            {
              id: 'lint',
              name: 'Code Linting',
              command: 'npm run lint',
              timeout: 30000,
              enabled: true,
              continueOnFailure: false,
              order: 1,
            },
            {
              id: 'typecheck',
              name: 'Type Checking',
              command: 'npm run type-check',
              timeout: 30000,
              enabled: true,
              continueOnFailure: false,
              order: 2,
            },
            {
              id: 'test',
              name: 'Unit Tests',
              command: 'npm test',
              timeout: 60000,
              enabled: true,
              continueOnFailure: true,
              order: 3,
            },
          ],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      this.cachedSettings = defaultSettings;
      this.lastLoadTime = now;
      return defaultSettings;
    }
  }

  getFallbackSettings(): Promise<FallbackSettings> {
    return this.loadSettings().then(
      settings =>
        settings.fallback || {
          maxRetries: 3,
          retryDelay: 1000,
          enableFallbacks: true,
          fallbackOnContextLength: true,
          fallbackOnRateLimit: true,
          fallbackOnServerError: false,
        }
    );
  }

  getValidationSettings(): Promise<ValidationSettings> {
    return this.loadSettings().then(
      settings =>
        settings.validation || {
          stages: [],
          enableMetrics: true,
          maxAttempts: 5,
        }
    );
  }

  invalidateCache(): void {
    this.cachedSettings = null;
    this.lastLoadTime = 0;
  }
}
