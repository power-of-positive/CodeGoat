export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  routeName?: string;
  targetUrl?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseSize?: number;
  userAgent?: string;
  clientIp?: string;
  level?: string;
  message?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LogsQuery {
  limit?: number;
  offset?: number;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  offset: number;
  limit: number;
}

export interface LogsConfig {
  logsDir: string;
  accessLogFile: string;
  appLogFile: string;
  errorLogFile: string;
  maxEntriesPerFile: number;
}
