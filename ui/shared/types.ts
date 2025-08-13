/**
 * Shared types for Kanban application
 * Based on backend types with additional frontend requirements
 */

// Re-export all types from backend
export * from '../../src/types/kanban.types';

// Additional types needed by frontend that aren't in backend types

// Theme and UI types
export type ThemeMode = 'light' | 'dark' | 'system';
export type EditorType = 'vscode' | 'cursor' | 'other';
export type SoundFile = string;

// Base coding agents (define here since it's needed by AgentProfile)
export type BaseCodingAgent = 'CLAUDE_CODE' | 'AMP' | 'GEMINI' | 'CODEX' | 'OPENCODE';

// Agent profiles
export interface AgentProfile {
  id: string;
  name: string;
  description?: string;
  base_coding_agent: BaseCodingAgent;
  enabled: boolean;
}

// Directory listing types
export interface DirectoryEntry {
  name: string;
  path: string;
  is_file: boolean;
  children?: DirectoryEntry[];
}

export interface DirectoryListResponse {
  entries: DirectoryEntry[];
  current_path: string;
}

// Diff chunk types
export type DiffChunkType = 'Equal' | 'Insert' | 'Delete';

// Execution process summary (extended from base ExecutionProcess)
export interface ExecutionProcessSummary extends ExecutionProcess {
  duration_ms?: number;
  logs_available: boolean;
  error_count: number;
  warning_count: number;
}

// Normalized conversation types (define base types here)
export type NormalizedEntryType =
  | { type: 'user_message' }
  | { type: 'assistant_message' }
  | { type: 'tool_use'; tool_name: string; action_type: ActionType }
  | { type: 'system_message' }
  | { type: 'error_message' }
  | { type: 'thinking' };

export type ActionType =
  | { action: 'file_read'; path: string }
  | { action: 'file_write'; path: string }
  | { action: 'command_run'; command: string }
  | { action: 'search'; query: string }
  | { action: 'web_fetch'; url: string }
  | { action: 'task_create'; description: string }
  | { action: 'plan_presentation'; plan: string }
  | { action: 'other'; description: string };

export interface NormalizedEntry {
  timestamp?: string;
  entry_type: NormalizedEntryType;
  content: string;
}

export interface NormalizedConversation {
  entries: NormalizedEntry[];
  session_id?: string;
  executor_type: string;
  prompt?: string;
  summary?: string;
}

export interface NormalizedConversationExtended extends NormalizedConversation {
  process_id?: string;
  task_attempt_id?: string;
}

// Execution process types (base definitions)
export type ExecutionProcessStatus = 'running' | 'completed' | 'failed' | 'killed';
export type ExecutionProcessRunReason =
  | 'setupscript'
  | 'cleanupscript'  
  | 'codingagent'
  | 'devserver';

export interface ExecutionProcess {
  id: string;
  task_attempt_id: string;
  run_reason: ExecutionProcessRunReason;
  status: ExecutionProcessStatus;
  exit_code?: bigint;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Config and settings types
export interface UserSystemInfo {
  os_type: string;
  architecture: string;
  shell: string;
  home_directory: string;
  current_directory: string;
}

export interface Config {
  theme: ThemeMode;
  editor: EditorType;
  sound_enabled: boolean;
  sound_file?: SoundFile;
  auto_save: boolean;
  github_token?: string;
  user_system_info?: UserSystemInfo;
  disclaimer_acknowledged?: boolean;
  onboarding_acknowledged?: boolean;
  telemetry_acknowledged?: boolean;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: string;
}

// Task execution states
export type TaskExecutionState = 'idle' | 'running' | 'completed' | 'failed';

// Additional utility types
export type JSONValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONValue[] 
  | { [key: string]: JSONValue };

export interface APIError {
  message: string;
  code: string;
  details?: JSONValue;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

// Re-export base coding agents for consistency
export { BaseCodingAgent } from '../../src/types/kanban.types';