// Log streaming types adapted from vibe-kanban
export interface NormalizedEntry {
  timestamp?: string;
  entry_type: NormalizedEntryType;
  content: string;
  metadata?: unknown;
}

export type NormalizedEntryType =
  | { type: 'user_message' }
  | { type: 'assistant_message' }
  | { type: 'system_message' }
  | { type: 'thinking' }
  | { type: 'error_message' }
  | { type: 'tool_use'; tool_name?: string; action_type?: ActionType };

export interface ActionType {
  action:
    | 'file_read'
    | 'file_edit'
    | 'command_run'
    | 'search'
    | 'web_fetch'
    | 'task_create'
    | 'plan_presentation'
    | 'todo_management';
  path?: string;
  changes?: unknown[];
}

export interface ClaudeMessage {
  id?: string;
  message_type?: string;
  role: string;
  model?: string;
  content: ClaudeContentItem[];
  stop_reason?: string;
}

export type ClaudeContentItem =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown; is_error?: boolean };

export type ClaudeJson =
  | {
      type: 'system';
      subtype?: string;
      session_id?: string;
      cwd?: string;
      tools?: unknown[];
      model?: string;
    }
  | { type: 'assistant'; message: ClaudeMessage; session_id?: string }
  | { type: 'user'; message: ClaudeMessage; session_id?: string }
  | { type: 'tool_use'; tool_name: string; input: unknown; session_id?: string }
  | { type: 'tool_result'; result: unknown; is_error?: boolean; session_id?: string }
  | { type: 'result'; subtype?: string; is_error?: boolean; duration_ms?: number; result?: unknown }
  | { type: string };

export type PatchType =
  | { type: 'NORMALIZED_ENTRY'; content: NormalizedEntry }
  | { type: 'STDOUT'; content: string }
  | { type: 'STDERR'; content: string };

export interface UnifiedLogEntry {
  id: string;
  ts: number; // epoch-ms timestamp for sorting
  processId: string;
  processName: string;
  channel: 'stdout' | 'stderr' | 'normalized' | 'process_start';
  payload: string | NormalizedEntry | ProcessStartPayload;
}

export interface ProcessStartPayload {
  processId: string;
  runReason: string;
  startedAt: string;
  status: string;
}
