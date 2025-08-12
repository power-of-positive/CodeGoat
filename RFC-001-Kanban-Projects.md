# RFC 001: Local-First TypeScript Kanban Board with AI Agent Integration

## Summary
Implement a local-first project management system with Kanban boards in TypeScript, closely following vibe-kanban's architecture but with enhanced functionality. The application runs entirely locally, allowing users to configure their own AI model endpoints while providing visual task management, automated task execution with configurable validation pipelines, and comprehensive analytics.

## Motivation
- **Local-First Architecture**: Inspired by vibe-kanban's local execution model
- **Data Privacy**: All data remains on user's machine, no cloud dependencies
- **AI Flexibility**: Users configure their own AI model endpoints (OpenAI, Anthropic, local models, etc.)
- **Simple Authentication**: Basic local application access, no external auth required
- **GitHub Integration**: Local Git operations with optional remote push/PR creation
- **Proven Patterns**: Build upon vibe-kanban's successful task execution model

## Detailed Design

### 1. Local-First Architecture

#### 1.1 Core Principles
- **No Cloud Dependencies**: Application runs entirely on user's machine
- **Local Data Storage**: SQLite database stored locally
- **User-Configured Endpoints**: AI models configured by user (not managed centrally)
- **Optional Network**: Only for AI API calls and optional GitHub integration
- **Simple Setup**: Single npm command installation like vibe-kanban

#### 1.2 Comparison with vibe-kanban
```
vibe-kanban              →  Our Implementation
├── Rust backend         →  Node.js/TypeScript backend
├── Local SQLite         →  Local SQLite (same)
├── Local execution      →  Local execution (same)
├── GitHub integration   →  Enhanced GitHub integration
└── Basic UI             →  Enhanced React UI with analytics
```

### 2. Data Models (Based on vibe-kanban Schema)

#### 2.1 Core Entities (Exact vibe-kanban Schema)
```sql
-- Projects table (from vibe-kanban)
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    git_repo_path TEXT NOT NULL UNIQUE DEFAULT '',
    setup_script TEXT DEFAULT '',
    dev_script TEXT DEFAULT '', -- Note: vibe-kanban uses 'dev_script' not 'dev_server_script'
    cleanup_script TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (from vibe-kanban)
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_attempt TEXT REFERENCES task_attempts(id) ON DELETE SET NULL, -- Note: references task_attempts, not tasks
    template_id TEXT REFERENCES task_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('todo', 'inprogress', 'inreview', 'done', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    tags TEXT, -- JSON array
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Task templates (from vibe-kanban)
CREATE TABLE task_templates (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, -- NULL for global templates
    template_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    default_prompt TEXT NOT NULL,
    tags TEXT, -- JSON array
    estimated_hours INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, template_name)
);

-- Task attempts (from vibe-kanban)
CREATE TABLE task_attempts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    worktree_path TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    merge_commit TEXT,
    executor TEXT NOT NULL, -- AI model used
    status TEXT NOT NULL CHECK (status IN ('created', 'running', 'completed', 'failed', 'cancelled')),
    stdout TEXT,
    stderr TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
);

-- Execution processes (from vibe-kanban)
CREATE TABLE execution_processes (
    id TEXT PRIMARY KEY,
    task_attempt_id TEXT NOT NULL REFERENCES task_attempts(id) ON DELETE CASCADE,
    process_type TEXT NOT NULL CHECK (process_type IN ('setupscript', 'codingagent', 'devserver', 'validation', 'cleanup')),
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'killed')),
    command TEXT NOT NULL,
    args TEXT, -- JSON array
    working_directory TEXT NOT NULL,
    stdout TEXT,
    stderr TEXT,
    exit_code INTEGER,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Execution process logs (from vibe-kanban)
CREATE TABLE execution_process_logs (
    id TEXT PRIMARY KEY,
    execution_process_id TEXT NOT NULL REFERENCES execution_processes(id) ON DELETE CASCADE,
    stream TEXT NOT NULL CHECK (stream IN ('stdout', 'stderr')),
    data TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Executor sessions (from vibe-kanban)
CREATE TABLE executor_sessions (
    id TEXT PRIMARY KEY,
    task_attempt_id TEXT NOT NULL REFERENCES task_attempts(id) ON DELETE CASCADE,
    executor TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'killed')),
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2 vibe-kanban API Response Types
```typescript
// Generic API Response wrapper (from vibe-kanban)
type ApiResponse<T, E = T> = {
  success: boolean;
  data: T | null;
  error_data: E | null;
  message: string | null;
};

// Task status enumeration (from vibe-kanban)
type TaskStatus = "todo" | "inprogress" | "inreview" | "done" | "cancelled";

// Execution process status (from vibe-kanban)
type ExecutionProcessStatus = "running" | "completed" | "failed" | "killed";

// Execution process run reason (from vibe-kanban)
type ExecutionProcessRunReason = "setupscript" | "cleanupscript" | "codingagent" | "devserver";

// Base coding agents (from vibe-kanban)
type BaseCodingAgent = "CLAUDE_CODE" | "AMP" | "GEMINI" | "CODEX" | "OPENCODE";

// Enhanced task with attempt status (from vibe-kanban)
interface TaskWithAttemptStatus extends Task {
  has_in_progress_attempt: boolean;
  has_merged_attempt: boolean;
  last_attempt_failed: boolean;
  base_coding_agent: string;
}

// Git branch info (from vibe-kanban)
interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  last_commit_date: Date;
}

// Search results (from vibe-kanban)
interface SearchResult {
  path: string;
  is_file: boolean;
  match_type: "FileName" | "DirectoryName" | "FullPath";
}

// Branch status (from vibe-kanban)
interface BranchStatus {
  is_behind: boolean;
  commits_behind: number;
  commits_ahead: number;
  up_to_date: boolean;
  merged: boolean;
  has_uncommitted_changes: boolean;
  base_branch_name: string;
}

// Diff types (from vibe-kanban)
interface WorktreeDiff {
  files: FileDiff[];
}

interface FileDiff {
  path: string;
  chunks: DiffChunk[];
}

interface DiffChunk {
  chunk_type: "Equal" | "Insert" | "Delete";
  content: string;
}

// Normalized conversation logs (from vibe-kanban)
interface NormalizedConversation {
  entries: NormalizedEntry[];
  session_id: string | null;
  executor_type: string;
  prompt: string | null;
  summary: string | null;
}

interface NormalizedEntry {
  timestamp: string | null;
  entry_type: NormalizedEntryType;
  content: string;
}

type NormalizedEntryType = 
  | { type: "user_message" }
  | { type: "assistant_message" }
  | { type: "tool_use"; tool_name: string; action_type: ActionType }
  | { type: "system_message" }
  | { type: "error_message" }
  | { type: "thinking" };
```

#### 2.3 CodeGoat Enhancements (Our Additions)
```sql
-- AI model configurations (user-configured endpoints)
CREATE TABLE ai_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    endpoint_url TEXT NOT NULL,
    api_key TEXT NOT NULL, -- Encrypted local storage
    provider TEXT NOT NULL, -- 'openai', 'anthropic', 'local', 'custom'
    model_id TEXT NOT NULL, -- e.g., 'gpt-4', 'claude-3-sonnet'
    parameters TEXT, -- JSON: temperature, max_tokens, etc.
    enabled BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Execution metrics for analytics
CREATE TABLE execution_metrics (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL REFERENCES task_attempts(id) ON DELETE CASCADE,
    model_used TEXT NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    duration_ms INTEGER,
    success BOOLEAN NOT NULL,
    validation_passed BOOLEAN,
    cost_estimate REAL, -- Estimated cost in USD
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.4 TypeScript Interfaces (vibe-kanban Compatible)
```typescript
// Project types (from vibe-kanban schema)
interface Project {
    id: string;
    name: string;
    description?: string;
    gitRepoPath: string;
    setupScript: string;
    devScript: string; // vibe-kanban uses 'devScript' not 'devServerScript'
    cleanupScript: string;
    createdAt: string;
    updatedAt: string;
}

// Task types (exactly from vibe-kanban)
interface Task {
    id: string;
    projectId: string;
    parentTaskAttempt?: string; // vibe-kanban references task_attempts, not tasks
    templateId?: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

// Task template (from vibe-kanban)
interface TaskTemplate {
    id: string;
    projectId?: string; // NULL for global templates
    templateName: string;
    title: string;
    description?: string;
    defaultPrompt: string;
    tags: string[];
    estimatedHours?: number;
    createdAt: string;
    updatedAt: string;
}

// Task attempt (from vibe-kanban)
interface TaskAttempt {
    id: string;
    taskId: string;
    worktreePath: string;
    branchName: string;
    mergeCommit?: string;
    executor: string; // AI model used
    status: AttemptStatus;
    stdout?: string;
    stderr?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

// Execution process (from vibe-kanban)
interface ExecutionProcess {
    id: string;
    taskAttemptId: string;
    processType: ProcessType;
    status: ProcessStatus;
    command: string;
    args: string[];
    workingDirectory: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// Execution process log (from vibe-kanban)
interface ExecutionProcessLog {
    id: string;
    executionProcessId: string;
    stream: 'stdout' | 'stderr';
    data: string;
    createdAt: string;
}

// Executor session (from vibe-kanban)
interface ExecutorSession {
    id: string;
    taskAttemptId: string;
    executor: string;
    status: ProcessStatus;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// Enums (from vibe-kanban)
type TaskStatus = 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type AttemptStatus = 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
type ProcessType = 'setupscript' | 'codingagent' | 'devserver' | 'validation' | 'cleanup';
type ProcessStatus = 'running' | 'completed' | 'failed' | 'killed';

// AI Model configuration (our CodeGoat addition)
interface AIModel {
    id: string;
    name: string;
    description?: string;
    endpointUrl: string;
    provider: 'openai' | 'anthropic' | 'local' | 'custom';
    modelId: string;
    parameters: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        [key: string]: any;
    };
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

// Project settings (our CodeGoat addition for enhanced functionality)
interface ProjectSettings {
    defaultBranch: string;
    workTreePrefix: string;
    defaultAgentModel: string; // Reference to ai_models.name
    fallbackModels: string[]; // Array of model names
    validationTimeout: number;
    autoCleanupWorkTrees: boolean;
    maxRetryAttempts: number; // Validation loop retry count
    enableMetrics: boolean;
    githubIntegration: {
        enabled: boolean;
        autoCreatePR: boolean;
        prTemplate?: string;
    };
}
```

### 3. API Endpoints (vibe-kanban Compatible)

#### 3.1 Authentication API (Enhanced for Local-First)
```typescript
// GitHub OAuth (optional for PR creation)
POST   /api/auth/github/device/start     - Start GitHub device flow
POST   /api/auth/github/device/poll      - Poll for device authorization
GET    /api/auth/github/check            - Check GitHub token validity

// Local authentication (our addition)
POST   /api/auth/login                   - Local application login
POST   /api/auth/logout                  - Logout session
GET    /api/auth/status                  - Check auth status
```

#### 3.2 Projects API (vibe-kanban Compatible)
```typescript
GET    /api/projects                     - Get all projects
POST   /api/projects                     - Create new project
GET    /api/projects/:id                 - Get specific project
PUT    /api/projects/:id                 - Update project
DELETE /api/projects/:id                 - Delete project
GET    /api/projects/:id/branches        - Get git branches for project
GET    /api/projects/:id/search          - Search files within project (?q=query)
POST   /api/projects/:id/open-editor     - Open project in editor
```

#### 3.3 Tasks API (vibe-kanban Compatible)
```typescript
GET    /api/tasks                        - Get tasks (?project_id=uuid)
POST   /api/tasks                        - Create new task
POST   /api/tasks/create-and-start       - Create task and start attempt
GET    /api/tasks/:id                    - Get specific task
PUT    /api/tasks/:id                    - Update task
DELETE /api/tasks/:id                    - Delete task and attempts
```

#### 3.4 Task Attempts API (vibe-kanban Compatible)
```typescript
GET    /api/task-attempts                - Get attempts (?task_id=uuid)
POST   /api/task-attempts                - Create new attempt
GET    /api/task-attempts/:id            - Get specific attempt
POST   /api/task-attempts/:id/follow-up  - Create follow-up execution
GET    /api/task-attempts/:id/diff       - Stream diff changes (SSE)
POST   /api/task-attempts/:id/merge      - Merge attempt to base branch
POST   /api/task-attempts/:id/rebase     - Rebase attempt on new base
POST   /api/task-attempts/:id/pr         - Create GitHub PR
GET    /api/task-attempts/:id/branch-status - Get git branch status
POST   /api/task-attempts/:id/open-editor - Open worktree in editor
POST   /api/task-attempts/:id/delete-file - Delete file (?file_path=path)
POST   /api/task-attempts/:id/start-dev-server - Start dev server
GET    /api/task-attempts/:id/children   - Get child tasks
POST   /api/task-attempts/:id/stop       - Stop all running executions
```

#### 3.5 Execution Processes API (vibe-kanban Compatible)
```typescript
GET    /api/execution-processes          - Get processes (?task_attempt_id=uuid)
GET    /api/execution-processes/:id      - Get specific process
GET    /api/execution-processes/:id/raw-logs - Stream raw logs (SSE)
GET    /api/execution-processes/:id/normalized-logs - Stream normalized logs (SSE)
POST   /api/execution-processes/:id/stop - Stop running process
```

#### 3.6 Task Templates API (vibe-kanban Compatible)
```typescript
GET    /api/task-templates               - Get templates (?project_id=uuid)
POST   /api/task-templates               - Create template
GET    /api/task-templates/:id           - Get specific template
PUT    /api/task-templates/:id           - Update template
DELETE /api/task-templates/:id           - Delete template
```

#### 3.7 Configuration API (vibe-kanban Compatible)
```typescript
GET    /api/config                       - Get system configuration
PUT    /api/config                       - Update configuration
```

#### 3.8 AI Model Management API (Our CodeGoat Addition)
```typescript
GET    /api/ai-models                    - List configured AI models
POST   /api/ai-models                    - Add new AI model endpoint
GET    /api/ai-models/:id                - Get model details
PUT    /api/ai-models/:id                - Update model configuration
DELETE /api/ai-models/:id                - Delete model configuration
POST   /api/ai-models/:id/test           - Test model connection
```

#### 3.9 Real-time Events (vibe-kanban Compatible)
```typescript
GET    /api/stream/:process_id           - WebSocket streaming for process updates
GET    /api/events                       - Server-Sent Events for DB changes
```

#### 3.10 Analytics API (Our CodeGoat Addition)
```typescript
GET    /api/analytics/validation-stats   - Local validation metrics
GET    /api/analytics/models             - Model performance metrics
GET    /api/analytics/export             - Export metrics (local file)
```

### 3. UI Components (React/TypeScript)

#### URL-Based Navigation Structure
```
/projects                    - Project list dashboard
/projects/:id                - Project kanban board
/projects/:id/settings       - Project configuration
/projects/:id/analytics      - Project metrics & validation stats
/tasks/:id                   - Task detail view with execution history
/attempts/:id                - Execution attempt details with real-time logs
/templates                   - Global task template management
/analytics                   - Cross-project analytics dashboard
```

#### Project Dashboard (`/projects`)
```typescript
interface ProjectDashboardProps {
  projects: Project[];
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onArchiveProject: (projectId: string) => void;
}

// Features:
// - Grid/list view toggle
// - Project status indicators (active/archived)
// - Quick actions (open, settings, validate, archive)
// - Search and filter by status
// - Import/export project configurations
```

#### Kanban Board Component (`/projects/:id`)
```typescript
interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  templates: TaskTemplate[];
  onTaskCreate: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskExecute: (taskId: string, options: ExecutionOptions) => void;
  onTaskDelete: (taskId: string) => void;
}

interface ExecutionOptions {
  agentModel?: string; // Override project default
  promptOverride?: string; // Override task description
  validationOnly?: boolean; // Skip agent, only run validation
}

// Features:
// - Drag and drop between columns (todo, inprogress, inreview, done, cancelled)
// - Task filtering by priority, tags, assignee
// - Bulk operations (move multiple tasks, bulk execute)
// - Real-time status updates via WebSockets
// - Task templates dropdown for quick creation
```

#### Task Card Component
```typescript
interface TaskCardProps {
  task: Task;
  attempts: TaskAttempt[];
  canExecute: boolean;
  onEdit: (task: Task) => void;
  onExecute: (taskId: string, options: ExecutionOptions) => void;
  onViewHistory: (taskId: string) => void;
  onDuplicate: (task: Task) => void;
  draggable?: boolean;
}

// Features:
// - Status indicators (with execution progress)
// - Priority badges and tag display
// - Last execution result summary
// - Quick actions menu (edit, execute, duplicate, delete)
// - Execution progress bar for running tasks
// - Agent model indicator
```

#### Task Execution Modal
```typescript
interface TaskExecutionModalProps {
  task: Task;
  project: Project;
  availableModels: string[]; // From CodeGoat proxy configuration
  onExecute: (options: ExecutionOptions) => void;
  onCancel: () => void;
}

// Features:
// - Agent model selection (with fallback chain preview)
// - Prompt editing with template merge
// - Validation script preview
// - Advanced options (cleanup settings, GitHub integration)
// - Execution confirmation with resource usage estimates
```

#### Real-time Execution Viewer (`/attempts/:id`)
```typescript
interface ExecutionViewerProps {
  attempt: TaskAttempt;
  processes: ExecutionProcess[];
  activities: TaskAttemptActivity[];
  onCancel: () => void;
  onRetry: () => void;
}

// Features:
// - Live process output streaming (stdout/stderr)
// - Process timeline with status indicators
// - Resource usage monitoring
// - Cancellation controls
// - Automatic scroll to latest output
// - Export logs functionality
```

### 4. GitHub Integration & Worktree Management

#### Git Worktree Service (TypeScript)
```typescript
class GitWorktreeService {
  constructor(private project: Project) {}

  async createWorktree(task: Task): Promise<WorktreeInfo> {
    const branchName = `${this.project.settings.workTreePrefix}${task.id}`;
    const worktreePath = path.join(this.project.gitRepoPath, '..', branchName);
    
    // Create worktree with new branch
    await execAsync(`git worktree add ${worktreePath} -b ${branchName}`, {
      cwd: this.project.gitRepoPath
    });
    
    return {
      path: worktreePath,
      branch: branchName,
      createdAt: new Date()
    };
  }

  async cleanupWorktree(branchName: string): Promise<void> {
    const worktreePath = path.join(this.project.gitRepoPath, '..', branchName);
    
    // Remove worktree and branch
    await execAsync(`git worktree remove ${worktreePath}`, {
      cwd: this.project.gitRepoPath
    });
    await execAsync(`git branch -D ${branchName}`, {
      cwd: this.project.gitRepoPath
    });
  }

  async listActiveWorktrees(): Promise<WorktreeInfo[]> {
    // Parse git worktree list output
    // Return active worktrees for this project
  }
}

interface WorktreeInfo {
  path: string;
  branch: string;
  createdAt: Date;
  taskId?: string;
}
```

#### Task Execution Flow (Enhanced from vibe-kanban)
```typescript
class TaskExecutionService {
  constructor(
    private gitService: GitWorktreeService,
    private proxyService: ProxyService, // CodeGoat proxy integration
    private metricsService: MetricsService
  ) {}

  async executeTask(task: Task, project: Project, options: ExecutionOptions): Promise<TaskAttempt> {
    const attempt = await this.createAttempt(task, options);
    
    try {
      // 1. Create isolated worktree
      const worktree = await this.gitService.createWorktree(task);
      await this.recordActivity(attempt.id, 'worktree_created');

      // 2. Run setup script
      if (project.setupScript) {
        await this.executeProcess(attempt, 'setupscript', project.setupScript, worktree.path);
      }

      // 3. Execute AI agent via CodeGoat proxy
      const agentModel = options.agentModel || project.settings.defaultAgentModel;
      const prompt = options.promptOverride || task.description || '';
      
      await this.executeAgent(attempt, agentModel, prompt, worktree.path);

      // 4. Run validation script
      if (!options.validationOnly && project.validationScript) {
        await this.executeProcess(attempt, 'validation', project.validationScript, worktree.path);
      }

      // 5. Create PR if enabled
      if (project.settings.githubIntegration.autoCreatePR) {
        await this.createPullRequest(attempt, worktree);
      }

      // 6. Cleanup if configured
      if (project.settings.autoCleanupWorkTrees) {
        await this.gitService.cleanupWorktree(worktree.branch);
      }

      return await this.completeAttempt(attempt);
    } catch (error) {
      return await this.failAttempt(attempt, error);
    }
  }

  private async executeAgent(attempt: TaskAttempt, model: string, prompt: string, cwd: string): Promise<void> {
    // Use CodeGoat proxy to execute agent with fallback models
    const response = await this.proxyService.chat({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      workingDirectory: cwd,
      fallbackModels: this.project.settings.fallbackModels
    });

    // Track which model was actually used for analytics
    await this.metricsService.recordAgentExecution({
      attemptId: attempt.id,
      modelUsed: response.modelUsed,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      duration: response.duration,
      success: true
    });
  }
}
```

### 5. Database Schema (SQLite with TypeScript/Prisma)

#### Core Tables (Exact vibe-kanban Schema)
```sql
-- Projects table (from vibe-kanban)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  git_repo_path TEXT NOT NULL UNIQUE DEFAULT '',
  setup_script TEXT DEFAULT '',
  dev_script TEXT DEFAULT '', -- vibe-kanban uses 'dev_script'
  cleanup_script TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (from vibe-kanban)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_attempt TEXT REFERENCES task_attempts(id) ON DELETE SET NULL, -- vibe-kanban references task_attempts
  template_id TEXT REFERENCES task_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'inprogress', 'inreview', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  tags TEXT, -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Task templates (from vibe-kanban)
CREATE TABLE task_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, -- NULL for global templates
  template_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  default_prompt TEXT NOT NULL,
  tags TEXT, -- JSON array
  estimated_hours INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, template_name)
);

-- Task execution attempts (from vibe-kanban)
CREATE TABLE task_attempts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worktree_path TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  merge_commit TEXT,
  executor TEXT NOT NULL, -- AI model used
  status TEXT NOT NULL CHECK (status IN ('created', 'running', 'completed', 'failed', 'cancelled')),
  stdout TEXT,
  stderr TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- Individual process tracking (from vibe-kanban)
CREATE TABLE execution_processes (
  id TEXT PRIMARY KEY,
  task_attempt_id TEXT NOT NULL REFERENCES task_attempts(id) ON DELETE CASCADE,
  process_type TEXT NOT NULL CHECK (process_type IN ('setupscript', 'codingagent', 'devserver', 'validation', 'cleanup')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'killed')),
  command TEXT NOT NULL,
  args TEXT, -- JSON array
  working_directory TEXT NOT NULL,
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Process logs for streaming (from vibe-kanban)
CREATE TABLE execution_process_logs (
  id TEXT PRIMARY KEY,
  execution_process_id TEXT NOT NULL REFERENCES execution_processes(id) ON DELETE CASCADE,
  stream TEXT NOT NULL CHECK (stream IN ('stdout', 'stderr')),
  data TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Executor sessions (from vibe-kanban)
CREATE TABLE executor_sessions (
  id TEXT PRIMARY KEY,
  task_attempt_id TEXT NOT NULL REFERENCES task_attempts(id) ON DELETE CASCADE,
  executor TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'killed')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced metrics for CodeGoat integration (our addition)
CREATE TABLE execution_metrics (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES task_attempts(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  fallback_count INTEGER DEFAULT 0,
  validation_passed BOOLEAN,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### Prisma Schema Definition (vibe-kanban Compatible)
```typescript
// schema.prisma
model Project {
  id            String   @id @default(uuid())
  name          String
  description   String?
  gitRepoPath   String   @unique @map("git_repo_path")
  setupScript   String   @default("") @map("setup_script")
  devScript     String   @default("") @map("dev_script") // vibe-kanban naming
  cleanupScript String   @default("") @map("cleanup_script")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  tasks         Task[]
  taskTemplates TaskTemplate[]
  @@map("projects")
}

model Task {
  id                 String     @id @default(uuid())
  projectId          String     @map("project_id")
  parentTaskAttempt  String?    @map("parent_task_attempt") // vibe-kanban references task_attempts
  templateId         String?    @map("template_id")
  title              String
  description        String?
  status             TaskStatus @default(TODO)
  priority           Priority   @default(MEDIUM)
  tags               Json       // string[]
  createdAt          DateTime   @default(now()) @map("created_at")
  updatedAt          DateTime   @updatedAt @map("updated_at")
  
  project            Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentAttempt      TaskAttempt? @relation("TaskHierarchy", fields: [parentTaskAttempt], references: [id])
  template           TaskTemplate? @relation(fields: [templateId], references: [id])
  attempts           TaskAttempt[]
  
  @@map("tasks")
}

model TaskTemplate {
  id             String   @id @default(uuid())
  projectId      String?  @map("project_id")
  templateName   String   @map("template_name")
  title          String
  description    String?
  defaultPrompt  String   @map("default_prompt")
  tags           Json     // string[]
  estimatedHours Int?     @map("estimated_hours")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  
  project        Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks          Task[]
  
  @@unique([projectId, templateName])
  @@map("task_templates")
}

model TaskAttempt {
  id           String        @id @default(uuid())
  taskId       String        @map("task_id")
  worktreePath String        @map("worktree_path")
  branchName   String        @map("branch_name")
  mergeCommit  String?       @map("merge_commit")
  executor     String
  status       AttemptStatus
  stdout       String?
  stderr       String?
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  completedAt  DateTime?     @map("completed_at")
  
  task               Task                  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  childTasks         Task[]                @relation("TaskHierarchy")
  executionProcesses ExecutionProcess[]
  executorSessions   ExecutorSession[]
  
  @@map("task_attempts")
}

model ExecutionProcess {
  id               String        @id @default(uuid())
  taskAttemptId    String        @map("task_attempt_id")
  processType      ProcessType   @map("process_type")
  status           ProcessStatus
  command          String
  args             Json          // string[]
  workingDirectory String        @map("working_directory")
  stdout           String?
  stderr           String?
  exitCode         Int?          @map("exit_code")
  startedAt        DateTime?     @map("started_at")
  completedAt      DateTime?     @map("completed_at")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")
  
  taskAttempt      TaskAttempt             @relation(fields: [taskAttemptId], references: [id], onDelete: Cascade)
  logs             ExecutionProcessLog[]
  
  @@map("execution_processes")
}

model ExecutionProcessLog {
  id                  String          @id @default(uuid())
  executionProcessId  String          @map("execution_process_id")
  stream              LogStream
  data                String
  createdAt           DateTime        @default(now()) @map("created_at")
  
  executionProcess    ExecutionProcess @relation(fields: [executionProcessId], references: [id], onDelete: Cascade)
  
  @@map("execution_process_logs")
}

model ExecutorSession {
  id            String        @id @default(uuid())
  taskAttemptId String        @map("task_attempt_id")
  executor      String
  status        ProcessStatus
  startedAt     DateTime?     @map("started_at")
  completedAt   DateTime?     @map("completed_at")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  
  taskAttempt   TaskAttempt   @relation(fields: [taskAttemptId], references: [id], onDelete: Cascade)
  
  @@map("executor_sessions")
}

enum TaskStatus {
  TODO        @map("todo")
  INPROGRESS  @map("inprogress")
  INREVIEW    @map("inreview")
  DONE        @map("done")
  CANCELLED   @map("cancelled")
}

enum Priority {
  LOW     @map("low")
  MEDIUM  @map("medium")
  HIGH    @map("high")
  URGENT  @map("urgent")
}

enum AttemptStatus {
  CREATED   @map("created")
  RUNNING   @map("running")
  COMPLETED @map("completed")
  FAILED    @map("failed")
  CANCELLED @map("cancelled")
}

enum ProcessType {
  SETUPSCRIPT @map("setupscript")
  CODINGAGENT @map("codingagent")
  DEVSERVER   @map("devserver")
  VALIDATION  @map("validation")
  CLEANUP     @map("cleanup")
}

enum ProcessStatus {
  RUNNING   @map("running")
  COMPLETED @map("completed")
  FAILED    @map("failed")
  KILLED    @map("killed")
}

enum LogStream {
  STDOUT @map("stdout")
  STDERR @map("stderr")
}
```

### 6. Integration with CodeGoat Infrastructure

#### Proxy Service Integration
```typescript
// Extend existing proxy service for agent execution
interface ProxyService {
  chat(request: ChatRequest): Promise<ChatResponse>;
  getAvailableModels(): Promise<string[]>;
  getModelFallbackChain(model: string): Promise<string[]>;
}

interface ChatRequest {
  model: string;
  messages: Message[];
  workingDirectory?: string;
  fallbackModels?: string[];
  maxTokens?: number;
  temperature?: number;
}

interface ChatResponse {
  content: string;
  modelUsed: string; // Actual model used (after fallbacks)
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  duration: number;
  fallbackAttempts: number;
}
```

#### Settings API Extension
```typescript
// Extend existing settings API for kanban configuration
interface KanbanSettings {
  enabled: boolean;
  defaultWorkTreePrefix: string;
  maxConcurrentExecutions: number;
  defaultValidationTimeout: number;
  githubIntegration: {
    enabled: boolean;
    defaultPRTemplate: string;
  };
}

// New endpoints in existing settings API
PUT  /api/settings/kanban                - Update kanban settings
GET  /api/settings/kanban                - Get kanban settings
POST /api/settings/kanban/projects/import - Import project configurations
```

### 7. Real-time Updates & WebSockets

#### WebSocket Events
```typescript
// Real-time updates for task execution
interface WebSocketEvents {
  // Task status updates
  'task:status-changed': { taskId: string; status: TaskStatus; timestamp: Date };
  'task:created': { task: Task };
  'task:updated': { taskId: string; changes: Partial<Task> };
  
  // Execution updates
  'execution:started': { attemptId: string; taskId: string };
  'execution:progress': { attemptId: string; processType: ProcessType; status: ProcessStatus };
  'execution:completed': { attemptId: string; success: boolean; duration: number };
  'execution:logs': { attemptId: string; processId: string; output: string; stream: 'stdout' | 'stderr' };
  
  // Project updates
  'project:worktree-created': { projectId: string; branch: string; taskId: string };
  'project:worktree-cleaned': { projectId: string; branch: string };
}
```

### 8. Analytics & Metrics Dashboard

#### Validation Statistics Service
```typescript
class ValidationStatsService {
  async getProjectStats(projectId: string, dateRange?: DateRange): Promise<ProjectStats> {
    return {
      totalAttempts: number;
      successRate: number;
      averageDuration: number;
      modelUsage: ModelUsageStats[];
      validationTrends: ValidationTrendData[];
      mostFailedTasks: FailedTaskSummary[];
    };
  }

  async getCrossProjectStats(): Promise<GlobalStats> {
    return {
      totalProjects: number;
      totalTasks: number;
      globalSuccessRate: number;
      modelPerformance: ModelPerformanceData[];
      projectRankings: ProjectRanking[];
    };
  }
}

interface ModelUsageStats {
  model: string;
  usageCount: number;
  successRate: number;
  averageDuration: number;
  fallbackRate: number;
}
```

## Implementation Plan

### Phase 1: Foundation & URL Navigation (High Priority)
- [ ] Implement URL-based navigation in existing UI
- [ ] Set up database schema with Prisma
- [ ] Create basic Projects and Tasks API endpoints
- [ ] Extend settings API for kanban configuration

### Phase 2: Core Kanban Features
- [ ] Build Project Dashboard with URL routing
- [ ] Implement Kanban Board component with drag/drop
- [ ] Add Task Card components and modals
- [ ] Create Task Template system

### Phase 3: GitHub & Execution Integration
- [ ] Implement GitWorktreeService
- [ ] Build TaskExecutionService with CodeGoat proxy integration
- [ ] Add real-time WebSocket updates
- [ ] Create execution viewer with live logs

### Phase 4: Analytics & Advanced Features
- [ ] Build validation statistics dashboard
- [ ] Add cross-project analytics
- [ ] Implement export/import capabilities
- [ ] Add bulk operations and advanced filtering

### Phase 5: Polish & Optimization
- [ ] Performance optimization for large projects
- [ ] Enhanced error handling and recovery
- [ ] UI/UX improvements based on usage
- [ ] Comprehensive testing and documentation

## Risks & Mitigation Strategies

### Technical Risks
1. **Disk Space Management**: Implement automatic cleanup policies and disk usage monitoring
2. **Concurrent Execution Limits**: Add queue management and resource throttling
3. **Orphaned Worktrees**: Implement cleanup jobs and health checks
4. **Process Management**: Add proper process cleanup and timeout handling

### Security Considerations
1. **Prompt Injection**: Sanitize and validate user inputs
2. **File System Access**: Restrict worktree paths to project directories
3. **Command Execution**: Validate and sandbox script execution
4. **Resource Exhaustion**: Implement execution limits and monitoring

### Operational Risks
1. **Integration Complexity**: Incremental rollout with feature flags
2. **Data Migration**: Careful schema migration planning
3. **User Adoption**: Comprehensive documentation and onboarding
4. **Performance Impact**: Load testing and monitoring

## Success Metrics

1. **Functional Metrics**
   - Task execution success rate > 90%
   - Average task completion time
   - User adoption rate
   - Feature utilization

2. **Technical Metrics**
   - API response times < 200ms
   - WebSocket connection stability
   - Database query performance
   - Resource usage optimization

3. **Business Metrics**
   - Developer productivity improvement
   - Validation script compliance
   - Cross-project code quality trends
   - Model usage optimization