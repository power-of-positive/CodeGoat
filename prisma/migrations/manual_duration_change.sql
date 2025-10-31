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
    "duration" TEXT,
    "content" TEXT,
    FOREIGN KEY ("template_id") REFERENCES "task_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("parent_task_attempt") REFERENCES "task_attempts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("content", "created_at", "description", "duration", "end_time", "executor_id", "id", "parent_task_attempt", "priority", "project_id", "start_time", "status", "tags", "task_type", "template_id", "title", "updated_at") SELECT "content", "created_at", "description", "duration", "end_time", "executor_id", "id", "parent_task_attempt", "priority", "project_id", "start_time", "status", "tags", "task_type", "template_id", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

