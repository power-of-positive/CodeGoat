import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ILogger, LogEntry } from './logger-interface';
import { safeStringify, getSafeSize } from './utils/json';

// Constants
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;

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
  private forceTestEnvironment?: boolean;

  constructor(config: Partial<WinstonLoggerConfig> & { forceTestEnvironment?: boolean } = {}) {
    this.logsDir = config.logsDir ?? path.join(process.cwd(), 'logs');
    this.forceTestEnvironment = config.forceTestEnvironment;
    const effectiveConfig = this.applyTestEnvironmentOverrides(config);
    const transports = this.createTransports(effectiveConfig);
    this.logger = this.createLogger(effectiveConfig, transports);
  }

  /**
   * Apply test environment overrides to prevent log file creation in test environments
   */
  private applyTestEnvironmentOverrides(
    config: Partial<WinstonLoggerConfig>
  ): Partial<WinstonLoggerConfig> {
    const isTestEnvironment = this.forceTestEnvironment ?? this.isTestEnvironment();

    if (isTestEnvironment) {
      // If forceTestEnvironment is explicitly false and enableFile is explicitly true, honor that
      if (this.forceTestEnvironment === false && config.enableFile === true) {
        return config;
      }
      
      return {
        ...config,
        enableFile: false, // Disable file logging in test environments
        enableConsole: config.enableConsole ?? true, // Keep console logging for test visibility
      };
    }

    return config;
  }

  /**
   * Detect if we're running in a test environment
   */
  private isTestEnvironment(): boolean {
    // Check NODE_ENV
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    // Check if we're running Jest
    if (process.env.JEST_WORKER_ID !== undefined) {
      return true;
    }

    // Check if we're in a test directory path
    const cwd = process.cwd();
    if (
      cwd.includes('/tests/') ||
      cwd.includes('\\tests\\') ||
      this.logsDir.includes('/tests/') ||
      this.logsDir.includes('\\tests\\')
    ) {
      return true;
    }

    // Check for common test runners in process arguments
    const processArgs = process.argv.join(' ');
    if (
      processArgs.includes('jest') ||
      processArgs.includes('mocha') ||
      processArgs.includes('vitest') ||
      processArgs.includes('playwright')
    ) {
      return true;
    }

    return false;
  }

  private createTransports(config: Partial<WinstonLoggerConfig>): winston.transport[] {
    const transports: winston.transport[] = [];

    if (config.enableConsole !== false) {
      transports.push(this.createConsoleTransport());
    }

    if (config.enableFile !== false) {
      transports.push(...this.createFileTransports(config));
    }

    return transports;
  }

  private createConsoleTransport(): winston.transport {
    return new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? safeStringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    });
  }

  private createFileTransports(config: Partial<WinstonLoggerConfig>): winston.transport[] {
    const transports: winston.transport[] = [];

    // Ensure logs directory exists
    this.ensureLogsDirectoryExists();

    // General application log with better rotation settings
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logsDir, 'app.log'),
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        maxsize: parseInt(config.maxSize ?? '10485760'),
        maxFiles: parseInt(config.maxFiles ?? '5'),
        tailable: true, // Keep most recent log in base filename
        zippedArchive: false, // Don't compress to avoid empty files
      })
    );

    // Error-only log
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logsDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        maxsize: parseInt(config.maxSize ?? '10485760'),
        maxFiles: parseInt(config.maxFiles ?? '3'),
        tailable: true,
        zippedArchive: false,
      })
    );

    // Access log for HTTP requests
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logsDir, 'access.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, message, ...meta }) => {
            if (meta.method && meta.path) {
              return `${timestamp} ${meta.method} ${meta.path} ${meta.statusCode ?? '-'} ${meta.duration ?? '-'}ms`;
            }
            return `${timestamp} ${message}`;
          })
        ),
        maxsize: parseInt(config.maxSize ?? '10485760'),
        maxFiles: parseInt(config.maxFiles ?? '10'),
        tailable: true,
        zippedArchive: false,
      })
    );

    return transports;
  }

  private createLogger(
    config: Partial<WinstonLoggerConfig>,
    transports: winston.transport[]
  ): winston.Logger {
    return winston.createLogger({
      level: config.level ?? 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      exceptionHandlers:
        config.enableFile !== false
          ? [new winston.transports.File({ filename: path.join(this.logsDir, 'exceptions.log') })]
          : [],
      rejectionHandlers:
        config.enableFile !== false
          ? [new winston.transports.File({ filename: path.join(this.logsDir, 'rejections.log') })]
          : [],
    });
  }

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
      requestHeaders: entry.requestHeaders,
      requestBody: entry.requestBody,
      responseHeaders: entry.responseHeaders,
      responseBody: entry.responseBody,
      responseSize: entry.responseSize,
      userAgent: entry.userAgent,
      clientIp: entry.clientIp,
      timestamp: entry.timestamp,
    });
  }

  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      const originalEnd = res.end;
      const requestData = this.captureRequestData(req);
      const chunks: Buffer[] = [];

      res.end = this.createEndHandler({
        originalEnd,
        startTime,
        req,
        res,
        requestData,
        chunks,
      });
      next();
    };
  }

  private captureRequestData(req: Request): {
    requestHeaders: Record<string, string>;
    requestBody: unknown;
    clientIp: string;
    userAgent: string;
  } {
    return {
      requestHeaders: this.sanitizeHeaders(req.headers),
      requestBody: this.captureRequestBody(req),
      clientIp: req.ip ?? req.socket?.remoteAddress ?? 'unknown',
      userAgent: req.get?.('user-agent') ?? req.headers?.['user-agent'] ?? 'unknown',
    };
  }

  private createEndHandler(config: {
    originalEnd: Response['end'];
    startTime: number;
    req: Request;
    res: Response;
    requestData: {
      requestHeaders: Record<string, string>;
      requestBody: unknown;
      clientIp: string;
      userAgent: string;
    };
    chunks: Buffer[];
  }): Response['end'] {
    const { originalEnd, startTime, req, res, requestData, chunks } = config;
    const logAccess = this.logAccess.bind(this);
    const sanitizeHeaders = this.sanitizeHeaders.bind(this);
    const parseResponseBody = this.parseResponseBody.bind(this);

    return function (this: Response, ...args: unknown[]) {
      res.end = originalEnd;

      if (args.length > 0 && args[0]) {
        if (Buffer.isBuffer(args[0])) {
          chunks.push(args[0]);
        } else if (typeof args[0] === 'string') {
          chunks.push(Buffer.from(args[0]));
        }
      }

      const result = originalEnd.apply(this, args as Parameters<typeof originalEnd>);
      const duration = Date.now() - startTime;
      const responseBody = parseResponseBody(chunks);

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ...requestData,
        responseHeaders: sanitizeHeaders(res.getHeaders ? res.getHeaders() : {}),
        responseBody,
        responseSize: chunks.length > 0 ? Buffer.concat(chunks).length : 0,
        routeName: (req as Request & { routeName?: string }).routeName,
        targetUrl: (req as Request & { targetUrl?: string }).targetUrl,
      };

      logAccess(entry);
      return result;
    } as Response['end'];
  }

  private parseResponseBody(chunks: Buffer[]): unknown {
    try {
      if (chunks.length > 0) {
        const fullResponse = Buffer.concat(chunks).toString();
        return JSON.parse(fullResponse);
      }
    } catch {
      // Keep raw response if JSON parsing fails
      return chunks.length > 0 ? Buffer.concat(chunks).toString() : undefined;
    }
    return undefined;
  }

  private sanitizeHeaders(
    headers: Record<string, string | string[] | number | undefined> | unknown
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};

    if (!headers || typeof headers !== 'object') {
      return sanitized;
    }

    const headersObj = headers as Record<string, unknown>;

    for (const [key, value] of Object.entries(headersObj)) {
      // Skip sensitive headers
      if (
        key.toLowerCase().includes('authorization') ||
        key.toLowerCase().includes('cookie') ||
        key.toLowerCase().includes('x-api-key')
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (Array.isArray(value)) {
        sanitized[key] = value.join(', ');
      } else if (value !== undefined && value !== null) {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  private captureRequestBody(req: Request): unknown {
    // Only capture body for non-GET requests and if body exists
    if (req.method === 'GET' || !req.body) {
      return undefined;
    }

    // Check if body is too large (> 1MB)
    const bodyStr = safeStringify(req.body);
    if (bodyStr.length > BYTES_PER_KB * KB_PER_MB) {
      return `[Body too large: ${getSafeSize(req.body)}]`;
    }

    return req.body;
  }

  // Compatibility methods for existing LogEntry interface
  log(entry: LogEntry): void {
    this.logAccess(entry);
  }

  /**
   * Ensure the logs directory exists
   */
  private ensureLogsDirectoryExists(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Clean up app log files (utility method for testing)
   */
  static cleanupAppLogFiles(logsDir: string): void {
    if (!fs.existsSync(logsDir)) {
      return;
    }

    const files = fs.readdirSync(logsDir);
    const appLogFiles = files.filter(
      file => (file === 'app.log' || file.match(/^app\d+\.log$/)) && file.endsWith('.log')
    );

    appLogFiles.forEach(file => {
      try {
        fs.unlinkSync(path.join(logsDir, file));
      } catch (error) {
        // Ignore errors when cleaning up
        console.warn(`Failed to cleanup log file ${file}:`, error);
      }
    });
  }

  /**
   * Check if running in test environment (static method for external use)
   */
  static isTestEnvironment(): boolean {
    // Check NODE_ENV
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    // Check if we're running Jest
    if (process.env.JEST_WORKER_ID !== undefined) {
      return true;
    }

    // Check for common test runners in process arguments
    const processArgs = process.argv.join(' ');
    if (
      processArgs.includes('jest') ||
      processArgs.includes('mocha') ||
      processArgs.includes('vitest') ||
      processArgs.includes('playwright')
    ) {
      return true;
    }

    return false;
  }
}
