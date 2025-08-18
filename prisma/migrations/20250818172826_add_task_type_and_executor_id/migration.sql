-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_todo_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "task_type" TEXT NOT NULL DEFAULT 'task',
    "executor_id" TEXT,
    "start_time" DATETIME,
    "end_time" DATETIME,
    "duration" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_todo_tasks" ("content", "created_at", "duration", "end_time", "id", "priority", "start_time", "status", "updated_at") SELECT "content", "created_at", "duration", "end_time", "id", "priority", "start_time", "status", "updated_at" FROM "todo_tasks";
DROP TABLE "todo_tasks";
ALTER TABLE "new_todo_tasks" RENAME TO "todo_tasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
