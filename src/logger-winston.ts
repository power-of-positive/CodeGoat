import winston from 'winston';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { ILogger, LogEntry } from './logger-interface';

export interface WinstonLoggerConfig {
  level: string;
  logsDir: string;
  enableConsole: boolean;
  enableFile: boolean;
  maxFiles: string;
  maxSize: string;
}

export class WinstonLogger implements ILogger {
  private logger: winston.Logger;
  private logsDir: string;

  /* eslint-disable max-lines-per-function */
  constructor(config: Partial<WinstonLoggerConfig> = {}) {
    this.logsDir = config.logsDir || path.join(process.cwd(), 'logs');

    const transports: winston.transport[] = [];

    // Console transport
    if (config.enableConsole !== false) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          ),
        })
      );
    }

    // File transports
    if (config.enableFile !== false) {
      // General application log
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logsDir, 'app.log'),
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          maxsize: parseInt(config.maxSize || '10485760'), // 10MB
          maxFiles: parseInt(config.maxFiles || '5'),
        })
      );

      // Error-only log
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logsDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          maxsize: parseInt(config.maxSize || '10485760'), // 10MB
          maxFiles: parseInt(config.maxFiles || '3'),
        })
      );

      // Access log for HTTP requests
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logsDir, 'access.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, message, ...meta }) => {
              // Special format for access logs
              if (meta.method && meta.path) {
                return `${timestamp} ${meta.method} ${meta.path} ${meta.statusCode || '-'} ${meta.duration || '-'}ms`;
              }
              return `${timestamp} ${message}`;
            })
          ),
          maxsize: parseInt(config.maxSize || '10485760'), // 10MB
          maxFiles: parseInt(config.maxFiles || '10'),
        })
      );
    }

    this.logger = winston.createLogger({
      level: config.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      // Handle uncaught exceptions
      exceptionHandlers:
        config.enableFile !== false
          ? [
              new winston.transports.File({
                filename: path.join(this.logsDir, 'exceptions.log'),
              }),
            ]
          : [],
      // Handle unhandled promise rejections
      rejectionHandlers:
        config.enableFile !== false
          ? [
              new winston.transports.File({
                filename: path.join(this.logsDir, 'rejections.log'),
              }),
            ]
          : [],
    });
  }
  /* eslint-enable max-lines-per-function */

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.logger.error(message, {
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
      ...meta,
    });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  // HTTP access logging
  logAccess(entry: LogEntry): void {
    // Use a separate logger instance for access logs to avoid mixing with app logs
    this.logger.info('HTTP Request', {
      method: entry.method,
      path: entry.path,
      statusCode: entry.statusCode,
      duration: entry.duration,
      routeName: entry.routeName,
      targetUrl: entry.targetUrl,
      timestamp: entry.timestamp,
    });
  }

  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    const logAccess = this.logAccess.bind(this);
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      const originalEnd = res.end;

      /* eslint-disable @typescript-eslint/no-explicit-any */
      res.end = function (this: Response, ...args: any[]) {
        res.end = originalEnd;
        const result = originalEnd.apply(this, args as any);

        const duration = Date.now() - startTime;
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          /* eslint-disable @typescript-eslint/no-explicit-any */
          routeName: (req as any).routeName,
          targetUrl: (req as any).targetUrl,
          /* eslint-enable @typescript-eslint/no-explicit-any */
        };

        logAccess(entry);
        return result;
        /* eslint-disable @typescript-eslint/no-explicit-any */
      } as any;
      /* eslint-enable @typescript-eslint/no-explicit-any */

      next();
    };
  }

  // Compatibility methods for existing LogEntry interface
  log(entry: LogEntry): void {
    this.logAccess(entry);
  }
}
