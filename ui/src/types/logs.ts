import type { NormalizedEntry } from '../../../shared/types';

export interface UnifiedLogEntry {
  id: string;
  ts: number; // epoch-ms timestamp for sorting and react-window key
  processId: string;
  processName: string;
  channel: 'raw' | 'stdout' | 'stderr' | 'normalized' | 'process_start';
  payload: string | NormalizedEntry | ProcessStartPayload;
}

export interface ProcessStartPayload {
  processId: string;
  runReason: string;
  startedAt: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
}

export interface LogParseResult {
  timestamp: string;
  level?: string;
  prefix?: string;
  content: string;
}

export interface WorkerLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'stdout' | 'stderr';
  content: string;
  processId?: string;
  workerId?: string;
}
