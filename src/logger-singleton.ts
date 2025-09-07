import path from 'path';
import { WinstonLogger, WinstonLoggerConfig } from './logger-winston';

let globalLogger: WinstonLogger | null = null;

/**
 * Get or create a singleton logger instance to prevent multiple loggers
 * from creating conflicting log files (app1.log, app2.log, etc.)
 */
export function getLogger(config?: Partial<WinstonLoggerConfig>): WinstonLogger {
  if (!globalLogger) {
    globalLogger = new WinstonLogger({
      level: 'info',
      logsDir: path.join(process.cwd(), 'logs'),
      enableConsole: process.env.NODE_ENV !== 'test',
      enableFile: true,
      maxFiles: '5',
      maxSize: '10485760', // 10MB
      ...config,
    });
  }
  return globalLogger;
}

/**
 * Reset the singleton logger (mainly for testing)
 */
export function resetLogger(): void {
  globalLogger = null;
}
