// Import and re-export LogEntry from types to avoid duplication
import type { LogEntry } from './types/logs.types';
export type { LogEntry } from './types/logs.types';

export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  debug?(message: string, meta?: Record<string, unknown>): void;
  log?(entry: LogEntry): void;
  middleware?(): unknown;
}
