/**
 * Kanban Types - Following vibe-kanban API schema
 */

// Generic API Response wrapper (from vibe-kanban)
export type ApiResponse<T, E = T> = {
  success: boolean;
  data: T | null;
  error_data: E | null;
  message: string | null;
};

// Task status enumeration (from vibe-kanban)
export type TaskStatus = 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled';

// Task priority enumeration
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Execution process status (from vibe-kanban)
export type ExecutionProcessStatus = 'running' | 'completed' | 'failed' | 'killed';

// Execution process run reason (from vibe-kanban)
export type ExecutionProcessRunReason =
  | 'setupscript'
  | 'cleanupscript'
  | 'codingagent'
  | 'devserver';

// Base coding agents (from vibe-kanban)
export type BaseCodingAgent = 'CLAUDE_CODE' | 'AMP' | 'GEMINI' | 'CODEX' | 'OPENCODE';

// Attempt status enumeration
export type AttemptStatus = 'created' | 'running' | 'completed' | 'failed' | 'cancelled';

// Process types
export type ProcessType = 'setupscript' | 'codingagent' | 'devserver' | 'validation' | 'cleanup';

// Log streams
export type LogStream = 'stdout' | 'stderr';

// Project types (from vibe-kanban schema)
export interface Project {
  id: string;
  name: string;
  description?: string;
  git_repo_path: string;
  setup_script?: string;
  dev_script?: string;
  cleanup_script?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectWithBranch extends Project {
  current_branch?: string;
}

export interface CreateProject {
  name: string;
  git_repo_path: string;
  use_existing_repo: boolean;
  setup_script?: string;
  dev_script?: string;
  cleanup_script?: string;
}

export interface UpdateProject {
  name?: string;
  git_repo_path?: string;
  setup_script?: string;
  dev_script?: string;
  cleanup_script?: string;
}

// Task types (from vibe-kanban)
export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  parent_task_attempt?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskWithAttemptStatus extends Task {
  has_in_progress_attempt: boolean;
  has_merged_attempt: boolean;
  last_attempt_failed: boolean;
  base_coding_agent: string;
}

export interface CreateTask {
  project_id: string;
  title: string;
  description?: string;
  parent_task_attempt?: string;
}

export interface UpdateTask {
  title?: string;
  description?: string;
  status?: TaskStatus;
  parent_task_attempt?: string;
}

// Task attempt types (from vibe-kanban)
export interface TaskAttempt {
  id: string;
  task_id: string;
  container_ref?: string;
  branch?: string;
  base_branch: string;
  merge_commit?: string;
  executor: string;
  base_coding_agent: string;
  pr_url?: string;
  pr_number?: bigint;
  pr_status?: string;
  pr_merged_at?: string;
  worktree_deleted: boolean;
  setup_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskAttempt {
  task_id: string;
  profile?: string;
  base_branch: string;
}

export interface CreateFollowUpAttempt {
  prompt: string;
}

// Execution process types (from vibe-kanban)
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

// Task template types (from vibe-kanban)
export interface TaskTemplate {
  id: string;
  project_id?: string;
  title: string;
  description?: string;
  template_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskTemplate {
  project_id?: string;
  title: string;
  description?: string;
  template_name: string;
}

export interface UpdateTaskTemplate {
  title?: string;
  description?: string;
  template_name?: string;
}

// Git branch info (from vibe-kanban)
export interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  last_commit_date: Date;
}

// Search results (from vibe-kanban)
export interface SearchResult {
  path: string;
  is_file: boolean;
  match_type: 'FileName' | 'DirectoryName' | 'FullPath';
}

// Branch status (from vibe-kanban)
export interface BranchStatus {
  is_behind: boolean;
  commits_behind: number;
  commits_ahead: number;
  up_to_date: boolean;
  merged: boolean;
  has_uncommitted_changes: boolean;
  base_branch_name: string;
}

// Diff types (from vibe-kanban)
export interface WorktreeDiff {
  files: FileDiff[];
}

export interface FileDiff {
  path: string;
  chunks: DiffChunk[];
}

export interface DiffChunk {
  chunk_type: 'Equal' | 'Insert' | 'Delete';
  content: string;
}

// Normalized conversation logs (from vibe-kanban)
export interface NormalizedConversation {
  entries: NormalizedEntry[];
  session_id?: string;
  executor_type: string;
  prompt?: string;
  summary?: string;
}

export interface NormalizedEntry {
  timestamp?: string;
  entry_type: NormalizedEntryType;
  content: string;
}

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

// GitHub integration types (from vibe-kanban)
export interface CreateGitHubPrRequest {
  title: string;
  body?: string;
  base_branch?: string;
}

export interface RebaseTaskAttemptRequest {
  new_base_branch?: string;
}

// GitHub service errors
export enum GitHubServiceError {
  TOKEN_INVALID = 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  REPO_NOT_FOUND_OR_NO_ACCESS = 'REPO_NOT_FOUND_OR_NO_ACCESS',
}

// Device flow types (from vibe-kanban)
export interface DeviceFlowStartResponse {
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export type DevicePollStatus = 'SLOW_DOWN' | 'AUTHORIZATION_PENDING' | 'SUCCESS';
export type CheckTokenResponse = 'VALID' | 'INVALID';

// AI Models (CodeGoat enhancement)
export interface AiModel {
  id: string;
  name: string;
  description?: string;
  endpoint_url: string;
  provider: string; // 'openai', 'anthropic', 'local', 'custom'
  model_id: string;
  parameters?: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAiModel {
  name: string;
  description?: string;
  endpoint_url: string;
  api_key: string;
  provider: string;
  model_id: string;
  parameters?: Record<string, unknown>;
}

export interface UpdateAiModel {
  name?: string;
  description?: string;
  endpoint_url?: string;
  api_key?: string;
  provider?: string;
  model_id?: string;
  parameters?: Record<string, unknown>;
  enabled?: boolean;
}

// Execution metrics (CodeGoat enhancement)
export interface ExecutionMetric {
  id: string;
  attempt_id: string;
  model_used: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  duration_ms?: number;
  success: boolean;
  validation_passed?: boolean;
  cost_estimate?: number;
  created_at: string;
}
