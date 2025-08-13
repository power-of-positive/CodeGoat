# Vibe Kanban Database Schema Documentation

This document provides a comprehensive overview of the Vibe Kanban database schema, including all tables, relationships, constraints, and key functionality.

## Overview

Vibe Kanban uses SQLite as its database engine with the following key characteristics:

- **Foreign key constraints enabled** via `PRAGMA foreign_keys = ON`
- **UUID primary keys** for all entities
- **DateTime fields** using ISO 8601 format with subsecond precision
- **Automatic timestamps** with `created_at` and `updated_at` fields
- **SQLX migrations** for schema versioning and evolution

## Core Tables

### Projects Table

Central table representing coding projects.

```sql
CREATE TABLE projects (
    id            BLOB PRIMARY KEY,
    name          TEXT NOT NULL,
    git_repo_path TEXT NOT NULL DEFAULT '' UNIQUE,
    setup_script  TEXT DEFAULT '',
    dev_script    TEXT,
    cleanup_script TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now', 'subsec'))
);
```

**Key Features:**

- `git_repo_path`: Unique constraint ensures one project per repository
- **Scripts**: Setup, development, and cleanup scripts for project lifecycle
- **GitHub Integration**: Projects link to GitHub repositories for OAuth and PR management

### Tasks Table

Individual coding tasks within projects.

```sql
CREATE TABLE tasks (
    id                   BLOB PRIMARY KEY,
    project_id           BLOB NOT NULL,
    title                TEXT NOT NULL,
    description          TEXT,
    status               TEXT NOT NULL DEFAULT 'todo'
                         CHECK (status IN ('todo','inprogress','done','cancelled','inreview')),
    parent_task_attempt  BLOB, -- Foreign key to parent TaskAttempt
    created_at           TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_attempt) REFERENCES task_attempts(id)
);
```

**Status Values:**

- `todo`: Initial state
- `inprogress`: Task is being worked on
- `inreview`: Task is under review
- `done`: Task completed successfully
- `cancelled`: Task was cancelled

**Hierarchical Tasks:**

- `parent_task_attempt`: Enables sub-task creation from task attempts

### Task Attempts Table

Execution attempts for tasks, representing individual coding sessions.

```sql
CREATE TABLE task_attempts (
    id                    BLOB PRIMARY KEY,
    task_id               BLOB NOT NULL,
    container_ref         TEXT, -- Path to worktree or cloud container id
    branch                TEXT, -- Git branch name
    base_branch           TEXT NOT NULL, -- Base branch (e.g., 'main')
    merge_commit          TEXT,
    base_coding_agent     TEXT NOT NULL, -- 'claude-code', 'gemini', 'amp', etc.
    pr_url                TEXT,
    pr_number             INTEGER,
    pr_status             TEXT, -- 'open', 'closed', 'merged'
    pr_merged_at          TEXT,
    worktree_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    setup_completed_at    TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

**Key Features:**

- **Git Integration**: Branch management and PR tracking
- **Multi-Agent Support**: Different coding agents (Claude, Gemini, Amp)
- **Worktree Management**: Isolated development environments
- **Lifecycle Tracking**: Setup completion and cleanup status

### Execution Processes Table

Individual processes running within task attempts.

```sql
CREATE TABLE execution_processes (
    id                BLOB PRIMARY KEY,
    task_attempt_id   BLOB NOT NULL,
    run_reason        TEXT NOT NULL DEFAULT 'setupscript'
                         CHECK (run_reason IN ('setupscript','cleanupscript','codingagent','devserver')),
    executor_action   TEXT NOT NULL, -- JSON ExecutorAction
    status            TEXT NOT NULL DEFAULT 'running'
                         CHECK (status IN ('running','completed','failed','killed')),
    exit_code         INTEGER,
    started_at        TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    completed_at      TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    FOREIGN KEY (task_attempt_id) REFERENCES task_attempts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_execution_processes_task_attempt_id ON execution_processes(task_attempt_id);
CREATE INDEX idx_execution_processes_status ON execution_processes(status);
CREATE INDEX idx_execution_processes_type ON execution_processes(run_reason);
CREATE INDEX idx_execution_process_task_attempt_index ON execution_processes(task_attempt_id, run_reason, created_at);
```

**Run Reasons:**

- `setupscript`: Project setup/initialization
- `cleanupscript`: Environment cleanup
- `codingagent`: AI coding agent execution
- `devserver`: Development server processes

**Virtual Columns:**

- `executor_action_type`: Computed from JSON executor_action field for efficient querying

### Execution Process Logs Table

Streaming logs for execution processes.

```sql
CREATE TABLE execution_process_logs (
    execution_id      BLOB PRIMARY KEY,
    logs              TEXT NOT NULL,      -- JSONL format (one LogMsg per line)
    byte_size         INTEGER NOT NULL,
    inserted_at       TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    FOREIGN KEY (execution_id) REFERENCES execution_processes(id) ON DELETE CASCADE
);

CREATE INDEX idx_execution_process_logs_inserted_at ON execution_process_logs(inserted_at);
```

**Log Format:**

- **JSONL**: One JSON log message per line
- **Streaming**: Real-time log ingestion and retrieval
- **Size Tracking**: Byte size for efficient pagination

### Executor Sessions Table

AI agent session management and context.

```sql
CREATE TABLE executor_sessions (
    id                   BLOB PRIMARY KEY,
    task_attempt_id      BLOB NOT NULL,
    execution_process_id BLOB NOT NULL,
    session_id           TEXT, -- External session ID (Claude/Amp)
    prompt               TEXT,
    summary              TEXT, -- Final assistant message
    created_at           TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    FOREIGN KEY (task_attempt_id) REFERENCES task_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (execution_process_id) REFERENCES execution_processes(id) ON DELETE CASCADE
);
```

**Features:**

- **Session Continuity**: Links to external AI service sessions
- **Prompt Tracking**: Stores prompts sent to AI agents
- **Summary Capture**: Final assistant responses for context

### Task Templates Table

Reusable task templates for quick task creation.

```sql
CREATE TABLE task_templates (
    id            BLOB PRIMARY KEY,
    project_id    BLOB,  -- NULL for global templates
    title         TEXT NOT NULL,
    description   TEXT,
    template_name TEXT NOT NULL,  -- Display name
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes and constraints
CREATE INDEX idx_task_templates_project_id ON task_templates(project_id);

-- Unique constraints for template names
CREATE UNIQUE INDEX idx_task_templates_unique_name_project
ON task_templates(project_id, template_name)
WHERE project_id IS NOT NULL;

CREATE UNIQUE INDEX idx_task_templates_unique_name_global
ON task_templates(template_name)
WHERE project_id IS NULL;
```

**Template Scoping:**

- **Global Templates**: `project_id IS NULL`, available across all projects
- **Project Templates**: `project_id` specific, scoped to individual projects
- **Name Uniqueness**: Enforced within scope (global vs project-specific)

## Entity Relationships

### Primary Relationships

```
projects (1) ←→ (∞) tasks
tasks (1) ←→ (∞) task_attempts
task_attempts (1) ←→ (∞) execution_processes
execution_processes (1) ←→ (1) execution_process_logs
execution_processes (1) ←→ (1) executor_sessions
projects (1) ←→ (∞) task_templates
task_attempts (1) ←→ (∞) tasks (parent_task_attempt)
```

### Key Relationships

1. **Project → Tasks**: One-to-many, cascading deletes
2. **Task → TaskAttempts**: One-to-many, representing multiple execution attempts
3. **TaskAttempt → ExecutionProcesses**: One-to-many, different process types per attempt
4. **ExecutionProcess → Logs**: One-to-one, streaming log storage
5. **ExecutionProcess → ExecutorSession**: One-to-one, AI agent session tracking
6. **TaskAttempt → Tasks (Hierarchical)**: Self-referencing through parent_task_attempt

## Data Types and Constraints

### UUID Fields

All primary keys use `BLOB` type to store UUIDs efficiently in SQLite.

### DateTime Fields

- **Format**: ISO 8601 with subsecond precision
- **Default**: `datetime('now', 'subsec')`
- **Timezone**: UTC (handled by application layer)

### Enum Constraints

Implemented using `CHECK` constraints for data integrity:

- **Task Status**: `('todo','inprogress','done','cancelled','inreview')`
- **Process Status**: `('running','completed','failed','killed')`
- **Process Run Reason**: `('setupscript','cleanupscript','codingagent','devserver')`

### JSON Fields

- **executor_action**: Complex JSON objects storing action parameters
- **logs**: JSONL format for structured log messages

## Indexes and Performance

### Primary Indexes

- All tables have UUID primary keys with automatic index creation
- Foreign key columns automatically indexed by SQLite

### Custom Indexes

- `idx_execution_processes_task_attempt_id`: Fast task attempt process lookup
- `idx_execution_processes_status`: Running process queries
- `idx_execution_processes_type`: Process type filtering
- `idx_execution_process_task_attempt_index`: Composite index for complex queries
- `idx_execution_process_logs_inserted_at`: Log chronological ordering
- `idx_task_templates_project_id`: Template project filtering

## Business Logic and Patterns

### Task Lifecycle

1. **Creation**: Task created with 'todo' status
2. **Execution**: TaskAttempt created with coding agent assignment
3. **Processing**: Multiple ExecutionProcesses run (setup → coding → cleanup)
4. **Completion**: Task marked as 'done' or 'failed' based on attempt outcomes

### Worktree Management

- `container_ref`: Stores worktree path or cloud container reference
- `worktree_deleted`: Tracks cleanup status for resource management
- **Cleanup Logic**: 24-hour expiration for inactive worktrees

### Multi-Agent Support

- `base_coding_agent`: Supports multiple AI agents (Claude, Gemini, Amp)
- **Executor Actions**: JSON-based action parameters for different agent types
- **Session Management**: External session ID tracking for continuity

### GitHub Integration

- **PR Tracking**: URL, number, status, and merge timestamps
- **Branch Management**: Base and feature branch tracking
- **Merge Commits**: Integration commit SHA storage

### Hierarchical Tasks

- **Sub-tasks**: Created from parent task attempts
- **Context Inheritance**: Sub-tasks inherit project and attempt context

## Migration History

The schema has evolved through 30+ migrations, with key milestones:

- **20250617**: Initial schema with basic project/task/attempt structure
- **20250620**: Execution processes and activity tracking
- **20250623**: Executor sessions and agent type support
- **20250701**: Branch and PR tracking enhancements
- **20250715**: Task templates system
- **20250729**: Execution process logs separation
- **20250805**: Executor action type optimizations

## Performance Considerations

### Query Patterns

- **Task Lists**: Optimized with status and attempt status joins
- **Process Monitoring**: Efficient running process queries
- **Log Streaming**: Indexed by insertion time for chronological access

### Data Volume

- **Log Retention**: Large text logs separated into dedicated table
- **Process History**: Full execution history maintained for debugging
- **Cleanup Automation**: Expired worktree and process cleanup

### Scaling Considerations

- **SQLite Limitations**: Single-writer, suitable for development/small teams
- **Migration Path**: Schema designed for potential PostgreSQL migration
- **Index Strategy**: Balanced between query performance and write overhead
