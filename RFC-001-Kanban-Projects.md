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

#### 2.1 Core Entities (Mirroring vibe-kanban)
```sql
-- Projects table (enhanced from vibe-kanban)
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    git_repo_path TEXT NOT NULL UNIQUE DEFAULT '',
    setup_script TEXT DEFAULT '',
    dev_server_script TEXT DEFAULT '',
    validation_script TEXT DEFAULT '',
    cleanup_script TEXT DEFAULT '',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    settings TEXT, -- JSON: ProjectSettings
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (from vibe-kanban)
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
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

-- Process activity log (from vibe-kanban)
CREATE TABLE task_attempt_activities (
    id TEXT PRIMARY KEY,
    task_attempt_id TEXT NOT NULL REFERENCES task_attempts(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN (
        'worktree_created', 'setup_started', 'setup_completed', 'setup_failed',
        'agent_started', 'agent_completed', 'agent_failed',
        'validation_started', 'validation_passed', 'validation_failed',
        'pr_created', 'cleanup_completed'
    )),
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2 AI Model Configuration (Local Endpoints)
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

#### 2.3 TypeScript Interfaces
```typescript
// Project types (enhanced from vibe-kanban)
interface Project {
    id: string;
    name: string;
    description?: string;
    gitRepoPath: string;
    setupScript: string;
    devServerScript: string;
    validationScript: string;
    cleanupScript?: string;
    status: 'active' | 'archived';
    settings: ProjectSettings;
    createdAt: string;
    updatedAt: string;
}

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

// Task types (exactly from vibe-kanban)
interface Task {
    id: string;
    projectId: string;
    parentTaskId?: string;
    templateId?: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

type TaskStatus = 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

// AI Model configuration
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
```

### 3. Local API Endpoints (Express.js/TypeScript)

#### 3.1 AI Model Configuration API
```typescript
// Local AI model management
GET    /api/ai-models                    - List configured AI models
POST   /api/ai-models                    - Add new AI model endpoint  
GET    /api/ai-models/:id                - Get model details
PUT    /api/ai-models/:id                - Update model configuration
DELETE /api/ai-models/:id                - Delete model configuration
POST   /api/ai-models/:id/test           - Test model connection

// Authentication (local only)
POST   /api/auth/login                   - Basic local login
POST   /api/auth/logout                  - Logout session
GET    /api/auth/status                  - Check auth status
```

#### 3.2 Core APIs (Following vibe-kanban patterns)
```typescript
// Projects API (enhanced from vibe-kanban)
GET    /api/projects                     - List all projects
POST   /api/projects                     - Create project
GET    /api/projects/:id                 - Get project details  
PUT    /api/projects/:id                 - Update project
DELETE /api/projects/:id                 - Archive project

// Tasks API (from vibe-kanban)
GET    /api/projects/:projectId/tasks    - List project tasks
POST   /api/projects/:projectId/tasks    - Create task
GET    /api/tasks/:id                    - Get task details
PUT    /api/tasks/:id                    - Update task
DELETE /api/tasks/:id                    - Delete task

// Task execution (like vibe-kanban but enhanced)
POST   /api/tasks/:id/execute            - Execute task with local agent
GET    /api/tasks/:id/attempts           - Get execution attempts
GET    /api/attempts/:id                 - Get attempt details with processes
POST   /api/attempts/:id/cancel          - Cancel running attempt

// Templates (from vibe-kanban)
GET    /api/templates                    - List all templates
POST   /api/templates                    - Create global template
GET    /api/projects/:id/templates       - List project templates
POST   /api/projects/:id/templates       - Create project template

// Real-time execution monitoring
GET    /api/attempts/:id/processes       - List processes for attempt  
GET    /api/processes/:id/logs           - Stream process logs (SSE)
POST   /api/processes/:id/kill           - Kill running process

// Local analytics
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

#### Core Tables (Based on vibe-kanban schema)
```sql
-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  git_repo_path TEXT NOT NULL UNIQUE DEFAULT '',
  setup_script TEXT DEFAULT '',
  dev_server_script TEXT DEFAULT '',
  validation_script TEXT DEFAULT '',
  cleanup_script TEXT DEFAULT '',
  settings TEXT, -- JSON: ProjectSettings
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES task_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'inprogress', 'inreview', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  tags TEXT, -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Task templates
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

-- Task execution attempts
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

-- Individual process tracking within attempts
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

-- Activity log for attempts
CREATE TABLE task_attempt_activities (
  id TEXT PRIMARY KEY,
  task_attempt_id TEXT NOT NULL REFERENCES task_attempts(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN (
    'worktree_created', 'setup_started', 'setup_completed', 'setup_failed',
    'agent_started', 'agent_completed', 'agent_failed',
    'validation_started', 'validation_passed', 'validation_failed',
    'pr_created', 'cleanup_completed'
  )),
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced metrics for CodeGoat integration
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

#### Prisma Schema Definition
```typescript
// schema.prisma
model Project {
  id                String   @id @default(uuid())
  name              String
  description       String?
  gitRepoPath       String   @unique @map("git_repo_path")
  setupScript       String   @default("") @map("setup_script")
  devServerScript   String   @default("") @map("dev_server_script")
  validationScript  String   @default("") @map("validation_script")
  cleanupScript     String?  @map("cleanup_script")
  settings          Json     // ProjectSettings type
  status            ProjectStatus @default(ACTIVE)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  tasks            Task[]
  taskTemplates    TaskTemplate[]
  @@map("projects")
}

model Task {
  id           String     @id @default(uuid())
  projectId    String     @map("project_id")
  parentTaskId String?    @map("parent_task_id")
  templateId   String?    @map("template_id")
  title        String
  description  String?
  status       TaskStatus @default(TODO)
  priority     Priority   @default(MEDIUM)
  tags         Json       // string[]
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  
  project      Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentTask   Task?      @relation("TaskHierarchy", fields: [parentTaskId], references: [id])
  subtasks     Task[]     @relation("TaskHierarchy")
  template     TaskTemplate? @relation(fields: [templateId], references: [id])
  attempts     TaskAttempt[]
  
  @@map("tasks")
}

// Additional models for TaskAttempt, ExecutionProcess, etc.
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