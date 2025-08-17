# Database Schema Documentation

## Task Management System Database Schema

This document describes the SQLite database schema for the CodeGoat task management system, supporting both todo-list tasks and validation run tracking.

### Tables

#### `todo_tasks`
Simple task management table supporting the todo-list.json structure:

```sql
CREATE TABLE "todo_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium', 
    "start_time" DATETIME,
    "end_time" DATETIME,
    "duration" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Unique task identifier (matches todo-list.json structure)
- `content`: Task description/content
- `status`: Task status (`pending`, `in_progress`, `completed`)
- `priority`: Task priority (`low`, `medium`, `high`)
- `start_time`: Optional timestamp when task was started
- `end_time`: Optional timestamp when task was completed
- `duration`: Human-readable duration string (e.g., "1h 30m")
- `created_at`: Automatic timestamp when record was created
- `updated_at`: Automatic timestamp when record was last updated

#### `validation_runs`
Tracks validation pipeline runs, optionally associated with todo tasks:

```sql
CREATE TABLE "validation_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "todo_task_id" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "duration" INTEGER NOT NULL,
    "stages" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("todo_task_id") REFERENCES "todo_tasks" ("id") ON DELETE SET NULL
);
```

**Fields:**
- `id`: Unique validation run identifier (UUID)
- `todo_task_id`: Optional foreign key to associated todo task
- `timestamp`: When the validation run occurred
- `success`: Whether the overall validation run succeeded
- `duration`: Duration in milliseconds
- `stages`: JSON array of ValidationStageResult objects stored as text
- `created_at`: Automatic timestamp when record was created

**Relationships:**
- Many validation runs can be associated with one todo task
- When a todo task is deleted, associated validation runs set `todo_task_id` to NULL

### Indexes

Performance indexes are created for common query patterns:

```sql
CREATE INDEX "idx_todo_tasks_status" ON "todo_tasks" ("status");
CREATE INDEX "idx_todo_tasks_priority" ON "todo_tasks" ("priority");
CREATE INDEX "idx_validation_runs_todo_task_id" ON "validation_runs" ("todo_task_id");
CREATE INDEX "idx_validation_runs_timestamp" ON "validation_runs" ("timestamp");
```

### Triggers

Automatic timestamp updating:

```sql
CREATE TRIGGER "update_todo_tasks_updated_at"
AFTER UPDATE ON "todo_tasks"
FOR EACH ROW
BEGIN
    UPDATE "todo_tasks" SET "updated_at" = CURRENT_TIMESTAMP WHERE "id" = NEW."id";
END;
```

### Usage Examples

**Insert a new todo task:**
```sql
INSERT INTO todo_tasks (id, content, status, priority) 
VALUES ('task-123', 'Implement user authentication', 'in_progress', 'high');
```

**Associate a validation run with a task:**
```sql
INSERT INTO validation_runs (id, todo_task_id, success, duration, stages)
VALUES (
    'run-456', 
    'task-123', 
    1, 
    45000, 
    '[{"id":"lint","name":"Code Linting","success":true,"duration":15000}]'
);
```

**Query tasks with their validation runs:**
```sql
SELECT t.*, COUNT(vr.id) as validation_count
FROM todo_tasks t
LEFT JOIN validation_runs vr ON t.id = vr.todo_task_id
GROUP BY t.id
ORDER BY t.created_at DESC;
```

### Migration from todo-list.json

The schema is designed to maintain compatibility with the existing todo-list.json structure while adding database benefits:

- All existing task fields are preserved
- IDs remain the same for seamless migration
- Additional fields support enhanced functionality
- Validation runs can be optionally linked to tasks

### Database Files

- **Development:** `prisma/kanban.db`
- **Test:** `prisma/kanban-test.db` 
- **Schema:** `prisma/schema.prisma`
- **Migration SQL:** `scripts/create-todo-schema.sql`