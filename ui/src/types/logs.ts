// Log types for the UI
export interface LogPatch {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: any;
}

export interface LogEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessStartPayload {
  process_id: string;
  command: string;
  working_directory?: string;
  environment?: Record<string, string>;
}

export interface UnifiedLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
  process_id?: string;
}