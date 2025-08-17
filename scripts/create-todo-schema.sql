-- SQLite schema for todo task management system
-- Generated from Prisma schema for task #7

-- Todo tasks table (Simple task management from todo-list.json)
CREATE TABLE IF NOT EXISTS "todo_tasks" (
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

-- Validation runs table (Associated with todo tasks)
CREATE TABLE IF NOT EXISTS "validation_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "todo_task_id" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "duration" INTEGER NOT NULL,
    "stages" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("todo_task_id") REFERENCES "todo_tasks" ("id") ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_todo_tasks_status" ON "todo_tasks" ("status");
CREATE INDEX IF NOT EXISTS "idx_todo_tasks_priority" ON "todo_tasks" ("priority");
CREATE INDEX IF NOT EXISTS "idx_validation_runs_todo_task_id" ON "validation_runs" ("todo_task_id");
CREATE INDEX IF NOT EXISTS "idx_validation_runs_timestamp" ON "validation_runs" ("timestamp");

-- Update trigger for todo_tasks.updated_at
CREATE TRIGGER IF NOT EXISTS "update_todo_tasks_updated_at"
AFTER UPDATE ON "todo_tasks"
FOR EACH ROW
BEGIN
    UPDATE "todo_tasks" SET "updated_at" = CURRENT_TIMESTAMP WHERE "id" = NEW."id";
END;