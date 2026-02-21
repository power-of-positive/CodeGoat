# Vibe Kanban API Schema Documentation

This document provides a comprehensive reference for the Vibe Kanban REST API, including all endpoints, request/response schemas, and data types.

## Base Information

- **Base URL**: `/api`
- **Protocol**: HTTP/1.1
- **Content-Type**: `application/json`
- **WebSocket Streaming**: `/api/stream/:process_id` for real-time updates

## Authentication

GitHub OAuth2 with Device Flow:

- Device flow start: `POST /api/auth/github/device/start`
- Device flow polling: `POST /api/auth/github/device/poll`
- Token validation: `GET /api/auth/github/check`

## Core Data Models

### Common Types

```typescript
// Generic API Response wrapper
type ApiResponse<T, E = T> = {
  success: boolean;
  data: T | null;
  error_data: E | null;
  message: string | null;
};

// Task status enumeration
type TaskStatus = "todo" | "inprogress" | "inreview" | "done" | "cancelled";

// Execution process status
type ExecutionProcessStatus = "running" | "completed" | "failed" | "killed";

// Execution process run reason
type ExecutionProcessRunReason =
  | "setupscript"
  | "cleanupscript"
  | "codingagent"
  | "devserver";

// Base coding agents
type BaseCodingAgent = "CLAUDE_CODE" | "AMP" | "GEMINI" | "CODEX" | "OPENCODE";
```

## Projects API

### Project Data Model

```typescript
type Project = {
  id: string;
  name: string;
  git_repo_path: string;
  setup_script: string | null;
  dev_script: string | null;
  cleanup_script: string | null;
  created_at: Date;
  updated_at: Date;
};

type ProjectWithBranch = Project & {
  current_branch: string | null;
};

type CreateProject = {
  name: string;
  git_repo_path: string;
  use_existing_repo: boolean;
  setup_script: string | null;
  dev_script: string | null;
  cleanup_script: string | null;
};

type UpdateProject = {
  name: string | null;
  git_repo_path: string | null;
  setup_script: string | null;
  dev_script: string | null;
  cleanup_script: string | null;
};
```

### Project Endpoints

#### `GET /api/projects`

Get all projects.

**Response**: `ApiResponse<Project[]>`

#### `POST /api/projects`

Create a new project.

**Request Body**: `CreateProject`
**Response**: `ApiResponse<Project>`

#### `GET /api/projects/{id}`

Get a specific project by ID.

**Response**: `ApiResponse<Project>`

#### `PUT /api/projects/{id}`

Update a project.

**Request Body**: `UpdateProject`
**Response**: `ApiResponse<Project>`

#### `DELETE /api/projects/{id}`

Delete a project.

**Response**: `ApiResponse<void>`

#### `GET /api/projects/{id}/branches`

Get all git branches for a project.

**Response**: `ApiResponse<GitBranch[]>`

```typescript
type GitBranch = {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  last_commit_date: Date;
};
```

#### `GET /api/projects/{id}/search?q={query}`

Search files within a project repository.

**Query Parameters**:

- `q` (required): Search query string

**Response**: `ApiResponse<SearchResult[]>`

```typescript
type SearchResult = {
  path: string;
  is_file: boolean;
  match_type: SearchMatchType;
};

type SearchMatchType = "FileName" | "DirectoryName" | "FullPath";
```

#### `POST /api/projects/{id}/open-editor`

Open project in configured editor.

**Request Body** (optional):

```typescript
{
  editor_type?: string;
}
```

**Response**: `ApiResponse<void>`

## Tasks API

### Task Data Model

```typescript
type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  parent_task_attempt: string | null;
  created_at: string;
  updated_at: string;
};

type TaskWithAttemptStatus = Task & {
  has_in_progress_attempt: boolean;
  has_merged_attempt: boolean;
  last_attempt_failed: boolean;
  base_coding_agent: string;
};

type CreateTask = {
  project_id: string;
  title: string;
  description: string | null;
  parent_task_attempt: string | null;
};

type UpdateTask = {
  title: string | null;
  description: string | null;
  status: TaskStatus | null;
  parent_task_attempt: string | null;
};
```

### Task Endpoints

#### `GET /api/tasks?project_id={uuid}`

Get all tasks for a project.

**Query Parameters**:

- `project_id` (required): Project UUID

**Response**: `ApiResponse<TaskWithAttemptStatus[]>`

#### `POST /api/tasks`

Create a new task.

**Request Body**: `CreateTask`
**Response**: `ApiResponse<Task>`

#### `POST /api/tasks/create-and-start`

Create a task and immediately start an attempt.

**Request Body**: `CreateTask`
**Response**: `ApiResponse<TaskWithAttemptStatus>`

#### `GET /api/tasks/{task_id}`

Get a specific task.

**Response**: `ApiResponse<Task>`

#### `PUT /api/tasks/{task_id}`

Update a task.

**Request Body**: `UpdateTask`
**Response**: `ApiResponse<Task>`

#### `DELETE /api/tasks/{task_id}`

Delete a task and all its attempts.

**Response**: `ApiResponse<void>`

## Task Attempts API

### Task Attempt Data Model

```typescript
type TaskAttempt = {
  id: string;
  task_id: string;
  container_ref: string | null;
  branch: string | null;
  base_branch: string;
  merge_commit: string | null;
  base_coding_agent: string;
  pr_url: string | null;
  pr_number: bigint | null;
  pr_status: string | null;
  pr_merged_at: string | null;
  worktree_deleted: boolean;
  setup_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreateTaskAttemptBody = {
  task_id: string;
  profile: string | null;
  base_branch: string;
};
```

### Task Attempt Endpoints

#### `GET /api/task-attempts?task_id={uuid}`

Get all attempts for a task.

**Query Parameters**:

- `task_id` (optional): Filter by specific task UUID

**Response**: `ApiResponse<TaskAttempt[]>`

#### `POST /api/task-attempts`

Create a new task attempt.

**Request Body**: `CreateTaskAttemptBody`
**Response**: `ApiResponse<TaskAttempt>`

#### `GET /api/task-attempts/{id}`

Get a specific task attempt.

**Response**: `ApiResponse<TaskAttempt>`

#### `POST /api/task-attempts/{id}/follow-up`

Create a follow-up execution for an attempt.

**Request Body**:

```typescript
type CreateFollowUpAttempt = {
  prompt: string;
};
```

**Response**: `ApiResponse<ExecutionProcess>`

#### `GET /api/task-attempts/{id}/diff`

Stream diff changes for the attempt (Server-Sent Events).

**Response**: SSE stream of `WorktreeDiff` events

```typescript
type WorktreeDiff = {
  files: FileDiff[];
};

type FileDiff = {
  path: string;
  chunks: DiffChunk[];
};

type DiffChunk = {
  chunk_type: DiffChunkType;
  content: string;
};

type DiffChunkType = "Equal" | "Insert" | "Delete";
```

#### `POST /api/task-attempts/{id}/merge`

Merge the task attempt changes to base branch.

**Response**: `ApiResponse<void>`

#### `POST /api/task-attempts/{id}/rebase`

Rebase the attempt on a new base branch.

**Request Body** (optional):

```typescript
type RebaseTaskAttemptRequest = {
  new_base_branch: string | null;
};
```

**Response**: `ApiResponse<void>`

#### `POST /api/task-attempts/{id}/pr`

Create a GitHub pull request.

**Request Body**:

```typescript
type CreateGitHubPrRequest = {
  title: string;
  body: string | null;
  base_branch: string | null;
};
```

**Response**: `ApiResponse<string, GitHubServiceError>`

#### `GET /api/task-attempts/{id}/branch-status`

Get git branch status information.

**Response**: `ApiResponse<BranchStatus>`

```typescript
type BranchStatus = {
  is_behind: boolean;
  commits_behind: number;
  commits_ahead: number;
  up_to_date: boolean;
  merged: boolean;
  has_uncommitted_changes: boolean;
  base_branch_name: string;
};
```

#### `POST /api/task-attempts/{id}/open-editor`

Open the attempt worktree in editor.

**Request Body** (optional):

```typescript
{
  editor_type?: string;
}
```

**Response**: `ApiResponse<void>`

#### `POST /api/task-attempts/{id}/delete-file?file_path={path}`

Delete a file from the attempt worktree.

**Query Parameters**:

- `file_path` (required): Path to file to delete

**Response**: `ApiResponse<void>`

#### `POST /api/task-attempts/{id}/start-dev-server`

Start the development server for this attempt.

**Response**: `ApiResponse<void>`

#### `GET /api/task-attempts/{id}/children`

Get tasks that were created as children of this attempt.

**Response**: `ApiResponse<Task[]>`

#### `POST /api/task-attempts/{id}/stop`

Stop all running executions for this attempt.

**Response**: `ApiResponse<void>`

## Execution Processes API

### Execution Process Data Model

```typescript
type ExecutionProcess = {
  id: string;
  task_id: string | null;
  worker_id: string | null;
  run_reason: ExecutionProcessRunReason;
  status: ExecutionProcessStatus;
  command: string | null;
  args: string | null;
  working_directory: string | null;
  stdout_summary: string | null;
  stderr_summary: string | null;
  exit_code: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
```

### Execution Process Endpoints

#### `GET /api/execution-processes?task_id={uuid}&worker_id={uuid}`

Get execution processes filtered by task and/or worker.

**Query Parameters**:

- `task_id` (optional): Task UUID
- `worker_id` (optional): Worker UUID

**Response**: `ApiResponse<ExecutionProcess[]>`

#### `GET /api/execution-processes/{id}`

Get a specific execution process.

**Response**: `ApiResponse<ExecutionProcess>`

#### `GET /api/execution-processes/{id}/raw-logs`

Stream raw logs for an execution process (Server-Sent Events).

**Response**: SSE stream of raw log data

#### `GET /api/execution-processes/{id}/normalized-logs`

Stream normalized conversation logs (Server-Sent Events).

**Response**: SSE stream of `NormalizedConversation` events

```typescript
type NormalizedConversation = {
  entries: NormalizedEntry[];
  session_id: string | null;
  executor_type: string;
  prompt: string | null;
  summary: string | null;
};

type NormalizedEntry = {
  timestamp: string | null;
  entry_type: NormalizedEntryType;
  content: string;
};

type NormalizedEntryType =
  | { type: "user_message" }
  | { type: "assistant_message" }
  | { type: "tool_use"; tool_name: string; action_type: ActionType }
  | { type: "system_message" }
  | { type: "error_message" }
  | { type: "thinking" };

type ActionType =
  | { action: "file_read"; path: string }
  | { action: "file_write"; path: string }
  | { action: "command_run"; command: string }
  | { action: "search"; query: string }
  | { action: "web_fetch"; url: string }
  | { action: "task_create"; description: string }
  | { action: "plan_presentation"; plan: string }
  | { action: "other"; description: string };
```

#### `POST /api/execution-processes/{id}/stop`

Stop a running execution process.

**Response**: `ApiResponse<void>`

## Task Templates API

### Task Template Data Model

```typescript
type TaskTemplate = {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  template_name: string;
  created_at: string;
  updated_at: string;
};

type CreateTaskTemplate = {
  project_id: string | null;
  title: string;
  description: string | null;
  template_name: string;
};

type UpdateTaskTemplate = {
  title: string | null;
  description: string | null;
  template_name: string | null;
};
```

### Task Template Endpoints

Templates are managed through the same router pattern but details would need to be verified in the actual implementation.

## Configuration API

### Configuration Data Model

```typescript
type Config = {
  config_version: string;
  theme: ThemeMode;
  profile: string;
  disclaimer_acknowledged: boolean;
  onboarding_acknowledged: boolean;
  github_login_acknowledged: boolean;
  telemetry_acknowledged: boolean;
  notifications: NotificationConfig;
  editor: EditorConfig;
  github: GitHubConfig;
  analytics_enabled: boolean | null;
  workspace_dir: string | null;
};

type ThemeMode =
  | "LIGHT"
  | "DARK"
  | "SYSTEM"
  | "PURPLE"
  | "GREEN"
  | "BLUE"
  | "ORANGE"
  | "RED";

type NotificationConfig = {
  sound_enabled: boolean;
  push_enabled: boolean;
  sound_file: SoundFile;
};

type EditorConfig = {
  editor_type: EditorType;
  custom_command: string | null;
};

type EditorType =
  | "VS_CODE"
  | "CURSOR"
  | "WINDSURF"
  | "INTELLI_J"
  | "ZED"
  | "CUSTOM";

type GitHubConfig = {
  pat: string | null;
  oauth_token: string | null;
  username: string | null;
  primary_email: string | null;
  default_pr_base: string | null;
};
```

Configuration endpoints would be available for reading and updating system configuration.

## Events API

Real-time updates are provided through Server-Sent Events for:

- Database changes (tasks, attempts, execution processes)
- Log streaming (raw and normalized)
- Diff streaming
- Process status updates

Event stream format uses JSON Patch operations:

```typescript
type EventPatch = {
  op: string;
  path: string;
  value: EventPatchInner;
};

type EventPatchInner = {
  db_op: string;
  record: RecordTypes;
};

type RecordTypes =
  | { type: "TASK"; data: Task }
  | { type: "TASK_ATTEMPT"; data: TaskAttempt }
  | { type: "EXECUTION_PROCESS"; data: ExecutionProcess }
  | { type: "DELETED_TASK"; data: { rowid: bigint } }
  | { type: "DELETED_TASK_ATTEMPT"; data: { rowid: bigint } }
  | { type: "DELETED_EXECUTION_PROCESS"; data: { rowid: bigint } };
```

## Authentication Endpoints

### GitHub OAuth Device Flow

#### `POST /api/auth/github/device/start`

Start GitHub device authorization flow.

**Response**: `ApiResponse<DeviceFlowStartResponse>`

```typescript
type DeviceFlowStartResponse = {
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};
```

#### `POST /api/auth/github/device/poll`

Poll for device authorization completion.

**Response**: `ApiResponse<DevicePollStatus>`

```typescript
type DevicePollStatus = "SLOW_DOWN" | "AUTHORIZATION_PENDING" | "SUCCESS";
```

#### `GET /api/auth/github/check`

Check if GitHub token is valid.

**Response**: `ApiResponse<CheckTokenResponse>`

```typescript
type CheckTokenResponse = "VALID" | "INVALID";
```

## Error Handling

All API responses follow the `ApiResponse<T, E>` format. Errors include:

### GitHub Service Errors

```typescript
enum GitHubServiceError {
  TOKEN_INVALID = "TOKEN_INVALID",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  REPO_NOT_FOUND_OR_NO_ACCESS = "REPO_NOT_FOUND_OR_NO_ACCESS",
}
```

### HTTP Status Codes

- `200 OK`: Success
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Health Check

#### `GET /api/health`

Service health check endpoint.

**Response**: Simple health status

## File System Integration

### Directory Listing

```typescript
type DirectoryEntry = {
  name: string;
  path: string;
  is_directory: boolean;
  is_git_repo: boolean;
  last_modified: bigint | null;
};

type DirectoryListResponse = {
  entries: DirectoryEntry[];
  current_path: string;
};
```

## Agent Profiles and Commands

### Agent Configuration

```typescript
type AgentProfile = {
  label: string;
  agent: BaseCodingAgent;
  command: CommandBuilder;
};

type CommandBuilder = {
  base: string;
  params: string[] | null;
};

type AgentProfiles = {
  profiles: AgentProfile[];
};
```

## Repository Information

### GitHub Integration

```typescript
type RepositoryInfo = {
  id: bigint;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
};
```

This API schema provides comprehensive coverage of the Vibe Kanban system's REST endpoints, supporting project management, task orchestration, AI agent execution, and real-time collaboration features.
