/*
  Warnings:

  - You are about to drop the `execution_metrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `execution_process_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `execution_processes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `executor_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `parent_task_attempt` on the `tasks` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "task_tags_taskId_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "execution_metrics";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "execution_process_logs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "execution_processes";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "executor_sessions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "task_attempts";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "task_tags";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "template_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "task_type" TEXT DEFAULT 'task',
    "executor_id" TEXT,
    "start_time" DATETIME,
    "end_time" DATETIME,
    "content" TEXT,
    CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("content", "created_at", "description", "end_time", "executor_id", "id", "priority", "project_id", "start_time", "status", "task_type", "template_id", "title", "updated_at") SELECT "content", "created_at", "description", "end_time", "executor_id", "id", "priority", "project_id", "start_time", "status", "task_type", "template_id", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
