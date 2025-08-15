// Frontend-specific types for task details and diff processing
import type { ExecutionProcess } from 'shared/types';

export interface ProcessedLine {
  line_number: number;
  content: string;
  type: 'added' | 'removed' | 'context' | 'header';
  old_line_number?: number;
  new_line_number?: number;
}

export interface ProcessedSection {
  id: string;
  header: string;
  start_line: number;
  end_line: number;
  lines: ProcessedLine[];
  file_path?: string;
  change_type: 'added' | 'removed' | 'modified';
}

export interface AttemptData {
  id: string;
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executor?: string;
  worktree_path?: string;
  branch?: string;
  created_at: string;
  updated_at: string;
  
  // Extended data from API
  logs?: LogEntry[];
  diff?: DiffData;
  processes?: ExecutionProcess[] | { data: ExecutionProcess[] };
  runningProcessDetails?: Record<string, ExecutionProcess>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface DiffData {
  files: DiffFile[];
  summary: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
}

export interface DiffFile {
  path: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
}

export interface DiffChunk {
  header: string;
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  old_line_number?: number;
  new_line_number?: number;
}

// ExecutionProcess type imported from shared/types