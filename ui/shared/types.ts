/**
 * Shared types for Kanban application
 * Based on backend types with additional frontend requirements
 */

// Re-export all types from backend
export * from '../../src/types/kanban.types';

// Additional types needed by frontend that aren't in backend types

// Theme and UI types
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark', 
  SYSTEM = 'system'
}
export enum EditorType {
  VSCODE = 'vscode',
  CURSOR = 'cursor', 
  OTHER = 'other'
}
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
  is_directory: boolean;
  is_git_repo: boolean;
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
  config: Config;
  environment: Environment | null;
  profiles: AgentProfile[] | null;
}

export interface Config {
  theme: ThemeMode | 'light' | 'dark' | 'system';
  editor: {
    editor_type: EditorType;
    custom_command: string | null;
  };
  sound_enabled: boolean;
  sound_file?: SoundFile;
  auto_save: boolean;
  github?: {
    token?: string;
  };
  user_system_info?: UserSystemInfo;
  disclaimer_acknowledged?: boolean;
  onboarding_acknowledged?: boolean;
  telemetry_acknowledged?: boolean;
  github_login_acknowledged?: boolean;
  profile: string;
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

// Missing types that were imported by frontend
export interface Environment {
  name: string;
  description?: string;
  variables: Record<string, string>;
}

// Re-export and define additional required types
export enum DevicePollStatus {
  SLOW_DOWN = 'SLOW_DOWN',
  AUTHORIZATION_PENDING = 'AUTHORIZATION_PENDING', 
  SUCCESS = 'SUCCESS',
  EXPIRED = 'EXPIRED',
  ACCESS_DENIED = 'ACCESS_DENIED'
}

export interface CheckTokenResponse {
  valid: boolean;
  data: {
    token?: string;
    username?: string;
    oauth_token?: string;
  } | null;
}

export interface DeviceFlowStartResponse {
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

// JSON Patch type for live updates
export interface PatchType {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

// Keyboard shortcuts configuration
export interface KeyboardShortcutsConfig {
  [key: string]: {
    key: string;
    description: string;
    action: () => void;
  };
}

// Branch status information
export interface BranchStatus {
  is_behind: boolean;
  commits_behind: number;
  commits_ahead: number;
  up_to_date: boolean;
  can_fast_forward: boolean;
  can_merge: boolean;
  diverged: boolean;
}