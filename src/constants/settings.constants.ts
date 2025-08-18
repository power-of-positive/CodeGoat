import fs from 'fs/promises';
import path from 'path';
import { Settings, LoggingSettings, ValidationStage, FallbackSettings } from '../types/settings.types';

// Default logging configuration
function getDefaultLogging(): LoggingSettings {
  return {
    level: 'info',
    enableConsole: true,
    enableFile: true,
    logsDir: './logs',
    accessLogFile: 'access.log',
    appLogFile: 'app.log',
    errorLogFile: 'error.log',
    maxFileSize: '10485760',
    maxFiles: '10',
    datePattern: 'YYYY-MM-DD',
  };
}

// Helper functions for creating validation stages
function createLintStage(): ValidationStage {
  return {
    id: 'lint',
    name: 'Code Linting',
    command: 'npm run lint',
    timeout: 30000,
    enabled: true,
    continueOnFailure: false,
    priority: 1,
  };
}

function createTypeCheckStage(): ValidationStage {
  return {
    id: 'typecheck',
    name: 'Type Checking',
    command: 'npm run type-check',
    timeout: 30000,
    enabled: true,
    continueOnFailure: false,
    priority: 2,
  };
}

function createTestStage(): ValidationStage {
  return {
    id: 'test',
    name: 'Unit Tests',
    command: 'npm test',
    timeout: 60000,
    enabled: true,
    continueOnFailure: true,
    priority: 3,
  };
}

function createTypeScriptPreferenceStage(): ValidationStage {
  return {
    id: 'typescript-preference',
    name: 'TypeScript Preference Check',
    command: 'ts-node scripts/check-typescript-preference.ts',
    timeout: 10000,
    enabled: true,
    continueOnFailure: true,
    priority: 4,
  };
}

function createE2EStage(): ValidationStage {
  return {
    id: 'e2e',
    name: 'E2E Tests',
    command: 'cd ui && npm run test:e2e',
    timeout: 120000,
    enabled: false,
    continueOnFailure: true,
    priority: 5,
  };
}

// Default validation stages configuration
function getDefaultValidationStages(): ValidationStage[] {
  return [
    createLintStage(),
    createTypeCheckStage(),
    createTestStage(),
    createTypeScriptPreferenceStage(),
    createE2EStage(),
  ];
}

// Default fallback configuration
function getDefaultFallback(): FallbackSettings {
  return {
    maxRetries: 3,
    retryDelay: 1000,
    enableFallbacks: true,
    fallbackOnContextLength: true,
    fallbackOnRateLimit: true,
    fallbackOnServerError: false,
  };
}

// Hardcoded fallback settings when JSON files are not available
function getHardcodedDefaults(): Settings {
  return {
    fallback: getDefaultFallback(),
    validation: {
      stages: getDefaultValidationStages(),
      enableMetrics: true,
      maxAttempts: 5,
    },
    logging: getDefaultLogging(),
  };
}

// Load default settings from JSON configuration files
async function loadDefaultSettings(): Promise<Settings> {
  try {
    const configPath = path.join(__dirname, '../config/default-settings.json');
    const content = await fs.readFile(configPath, 'utf-8');
    const jsonSettings = JSON.parse(content);
    
    // Add logging defaults and any missing properties
    return {
      ...jsonSettings,
      logging: jsonSettings.logging || getDefaultLogging(),
    };
  } catch {
    // Fallback to hardcoded defaults if JSON file is missing
    return getHardcodedDefaults();
  }
}

// Export a promise that resolves to the default settings
export const DEFAULT_SETTINGS = loadDefaultSettings();
