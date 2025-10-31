-- Migration: Change Task.duration from TEXT to INTEGER
-- Description: Convert duration field from human-readable string (e.g., "1h 30m") to milliseconds (INTEGER)
-- Since there's no existing data with duration values, we can safely change the type

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "parent_task_attempt" TEXT,
    "template_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "tags" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "task_type" TEXT DEFAULT 'task',
    "executor_id" TEXT,
    "start_time" DATETIME,
    "end_time" DATETIME,
    "duration" INTEGER,
    "content" TEXT,
    FOREIGN KEY ("template_id") REFERENCES "task_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("parent_task_attempt") REFERENCES "task_attempts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data - duration will be NULL for all existing rows
INSERT INTO "new_tasks" (
    "id", "project_id", "parent_task_attempt", "template_id", "title", "description",
    "status", "priority", "tags", "created_at", "updated_at", "task_type",
    "executor_id", "start_time", "end_time", "content"
)
SELECT
    "id", "project_id", "parent_task_attempt", "template_id", "title", "description",
    "status", "priority", "tags", "created_at", "updated_at", "task_type",
    "executor_id", "start_time", "end_time", "content"
FROM "tasks";

DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
