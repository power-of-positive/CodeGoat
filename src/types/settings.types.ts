import { z } from 'zod';

// Validation schemas
export const fallbackSettingsSchema = z.object({
  maxRetries: z.number().int().min(1).max(10).default(3),
  retryDelay: z.number().int().min(100).max(10000).default(1000), // ms
  enableFallbacks: z.boolean().default(true),
  fallbackOnContextLength: z.boolean().default(true),
  fallbackOnRateLimit: z.boolean().default(true),
  fallbackOnServerError: z.boolean().default(false),
});

export const validationStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  command: z.string(),
  workingDir: z.string().optional(),
  timeout: z.number().int().min(1000).max(300000).default(30000), // ms
  enabled: z.boolean().default(true),
  continueOnFailure: z.boolean().default(false),
  priority: z.number().int().min(0).default(0),
});

export const loggingSettingsSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(true),
  logsDir: z.string().default('./logs'),
  accessLogFile: z.string().default('access.log'),
  appLogFile: z.string().default('app.log'),
  errorLogFile: z.string().default('error.log'),
  maxFileSize: z.string().default('10485760'), // 10MB
  maxFiles: z.string().default('10'),
  datePattern: z.string().default('YYYY-MM-DD'),
});

export const settingsSchema = z.object({
  fallback: fallbackSettingsSchema.optional(),
  validation: z
    .object({
      stages: z.array(validationStageSchema).default([]),
      enableMetrics: z.boolean().default(true),
      maxAttempts: z.number().int().min(1).max(20).default(5),
    })
    .optional(),
  logging: loggingSettingsSchema.optional(),
});

// Types
export type FallbackSettings = z.infer<typeof fallbackSettingsSchema>;
export type ValidationStage = z.infer<typeof validationStageSchema>;
export type ValidationSettings = {
  stages: ValidationStage[];
  enableMetrics: boolean;
  maxAttempts: number;
};
export type LoggingSettings = z.infer<typeof loggingSettingsSchema>;
export type Settings = z.infer<typeof settingsSchema>;

// Partial update types
export type PartialFallbackSettings = Partial<FallbackSettings>;
export type PartialValidationSettings = Partial<ValidationSettings>;
export type PartialLoggingSettings = Partial<LoggingSettings>;
export type PartialSettings = {
  fallback?: PartialFallbackSettings;
  validation?: PartialValidationSettings;
  logging?: PartialLoggingSettings;
};
