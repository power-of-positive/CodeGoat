import fs from 'fs/promises';
import path from 'path';
import { ILogger } from '../logger-interface';
import { SettingsService, LoggingSettings } from './settings.service';
import { LogEntry, LogsQuery, LogsResponse, LogsConfig } from '../types/logs.types';

// Re-export types for backward compatibility
export type { LogEntry, LogsQuery, LogsResponse, LogsConfig } from '../types/logs.types';

export class LogsService {
  private config: LogsConfig;
  private logger: ILogger;
  private settingsService: SettingsService;

  constructor(logger: ILogger, settingsService: SettingsService, config: Partial<LogsConfig> = {}) {
    this.logger = logger;
    this.settingsService = settingsService;
    this.config = {
      logsDir: config.logsDir || path.join(process.cwd(), 'logs'),
      accessLogFile: config.accessLogFile || 'access.log',
      appLogFile: config.appLogFile || 'app.log',
      errorLogFile: config.errorLogFile || 'error.log',
      maxEntriesPerFile: config.maxEntriesPerFile || 1000,
    };
  }

  /**
   * Get recent request logs with pagination
   */
  async getRequestLogs(query: LogsQuery = {}): Promise<LogsResponse> {
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    try {
      const logs: LogEntry[] = [];

      // Read access logs (HTTP requests)
      await this.readAccessLogs(logs);

      // Read app logs for additional request details
      await this.readAppLogs(logs, true); // Filter for requests only

      // Sort by timestamp (most recent first) and apply pagination
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const paginatedLogs = logs.slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        total: logs.length,
        offset,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to read request logs', error as Error);
      throw new Error('Failed to read request logs');
    }
  }

  /**
   * Get error logs with pagination
   */
  async getErrorLogs(query: LogsQuery = {}): Promise<LogsResponse> {
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    try {
      const logs: LogEntry[] = [];
      const errorLogPath = path.join(this.config.logsDir, this.config.errorLogFile);

      try {
        const errorLogContent = await fs.readFile(errorLogPath, 'utf-8');
        const errorLines = errorLogContent
          .trim()
          .split('\n')
          .filter(line => line);

        for (const line of errorLines.slice(-this.config.maxEntriesPerFile)) {
          try {
            const logEntry = JSON.parse(line) as LogEntry;
            logs.push(logEntry);
          } catch {
            // Skip malformed JSON lines
          }
        }
      } catch {
        // Error log might not exist yet
      }

      // Sort by timestamp (most recent first) and apply pagination
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const paginatedLogs = logs.slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        total: logs.length,
        offset,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to read error logs', error as Error);
      throw new Error('Failed to read error logs');
    }
  }

  /**
   * Get a specific log entry by timestamp
   */
  async getLogEntry(timestamp: string): Promise<LogEntry | null> {
    try {
      const appLogPath = path.join(this.config.logsDir, this.config.appLogFile);
      const appLogContent = await fs.readFile(appLogPath, 'utf-8');
      const appLines = appLogContent
        .trim()
        .split('\n')
        .filter(line => line);

      for (const line of appLines) {
        try {
          const logEntry = JSON.parse(line) as LogEntry;

          if (logEntry.timestamp === timestamp) {
            return logEntry;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to read log entry', error as Error);
      throw new Error('Failed to read log entry');
    }
  }

  /**
   * Update logs configuration
   */
  updateConfig(newConfig: Partial<LogsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current logs configuration
   */
  getConfig(): LogsConfig {
    return { ...this.config };
  }

  /**
   * Get current logging settings from settings service
   */
  async getLoggingSettings(): Promise<LoggingSettings | null> {
    try {
      const settings = await this.settingsService.getSettings();
      return settings.logging || null;
    } catch (error) {
      this.logger.error('Failed to get logging settings', error as Error);
      return null;
    }
  }

  /**
   * Update logging configuration from settings
   */
  async syncConfigFromSettings(): Promise<void> {
    const loggingSettings = await this.getLoggingSettings();
    if (loggingSettings) {
      this.config = {
        ...this.config,
        logsDir: loggingSettings.logsDir,
        accessLogFile: loggingSettings.accessLogFile,
        appLogFile: loggingSettings.appLogFile,
        errorLogFile: loggingSettings.errorLogFile,
      };
    }
  }

  /**
   * Read access logs and add to logs array
   */
  private async readAccessLogs(logs: LogEntry[]): Promise<void> {
    try {
      const accessLogPath = path.join(this.config.logsDir, this.config.accessLogFile);
      const accessLogContent = await fs.readFile(accessLogPath, 'utf-8');
      const accessLines = accessLogContent
        .trim()
        .split('\n')
        .filter(line => line);

      this.parseAccessLogLines(accessLines, logs);
    } catch {
      // Access log might not exist yet
    }
  }

  /**
   * Parse access log lines and add valid entries to logs array
   */
  private parseAccessLogLines(accessLines: string[], logs: LogEntry[]): void {
    for (const line of accessLines.slice(-this.config.maxEntriesPerFile)) {
      const parsedEntry = this.parseAccessLogLine(line);
      if (parsedEntry) {
        logs.push(parsedEntry);
      }
    }
  }

  /**
   * Parse a single access log line
   */
  private parseAccessLogLine(line: string): LogEntry | null {
    try {
      // Try to parse as JSON first (new format)
      const logEntry = JSON.parse(line);
      if (logEntry.message === 'HTTP Request' && logEntry.method && logEntry.path) {
        return this.createLogEntryFromJSON(logEntry);
      }
    } catch {
      // Try to parse old format: timestamp method path statusCode duration
      return this.parseOldFormatLogLine(line);
    }
    return null;
  }

  /**
   * Create LogEntry from JSON log data
   */
  private createLogEntryFromJSON(logEntry: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      timestamp: logEntry.timestamp as string,
      method: logEntry.method as string,
      path: logEntry.path as string,
      statusCode: logEntry.statusCode as number | undefined,
      duration: logEntry.duration as number | undefined,
    };

    // Add optional fields if they exist
    if (logEntry.routeName) entry.routeName = logEntry.routeName as string;
    if (logEntry.targetUrl) entry.targetUrl = logEntry.targetUrl as string;
    if (logEntry.requestHeaders)
      entry.requestHeaders = logEntry.requestHeaders as Record<string, string>;
    if (logEntry.requestBody) entry.requestBody = logEntry.requestBody;
    if (logEntry.responseHeaders)
      entry.responseHeaders = logEntry.responseHeaders as Record<string, string>;
    if (logEntry.responseBody) entry.responseBody = logEntry.responseBody;
    if (logEntry.responseSize) entry.responseSize = logEntry.responseSize as number;
    if (logEntry.userAgent) entry.userAgent = logEntry.userAgent as string;
    if (logEntry.clientIp) entry.clientIp = logEntry.clientIp as string;
    if (logEntry.error) entry.error = logEntry.error as string;

    return entry;
  }

  /**
   * Parse old format log line (timestamp method path statusCode duration)
   */
  private parseOldFormatLogLine(line: string): LogEntry | null {
    try {
      const match = line.match(/^(.+?) (\w+) (.+?) (\d+|-) (.+?)ms$/);
      if (match) {
        const [, timestamp, method, path, statusCode, duration] = match;
        return {
          timestamp,
          method,
          path,
          statusCode: statusCode === '-' ? undefined : parseInt(statusCode),
          duration: duration === '-' ? undefined : parseInt(duration),
        };
      }
    } catch {
      // Skip malformed lines
    }
    return null;
  }

  /**
   * Read app logs and add to logs array
   */
  private async readAppLogs(logs: LogEntry[], requestsOnly = false): Promise<void> {
    try {
      const appLogPath = path.join(this.config.logsDir, this.config.appLogFile);
      const appLogContent = await fs.readFile(appLogPath, 'utf-8');
      const appLines = appLogContent
        .trim()
        .split('\n')
        .filter(line => line);

      for (const line of appLines.slice(-this.config.maxEntriesPerFile)) {
        try {
          const logEntry = JSON.parse(line) as LogEntry;

          // Filter for request-related logs if requested
          if (requestsOnly && !(logEntry.method && logEntry.path)) {
            continue;
          }

          logs.push({
            timestamp: logEntry.timestamp,
            level: logEntry.level,
            message: logEntry.message,
            method: logEntry.method,
            path: logEntry.path,
            statusCode: logEntry.statusCode,
            duration: logEntry.duration,
            routeName: logEntry.routeName,
            targetUrl: logEntry.targetUrl,
            meta: logEntry.error ? { error: logEntry.error } : undefined,
          });
        } catch {
          // Skip malformed JSON lines
        }
      }
    } catch {
      // App log might not exist yet
    }
  }
}
