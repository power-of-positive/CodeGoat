/*
  Warnings:

  - You are about to drop the column `tags` on the `tasks` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "task_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "task_tags_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    CONSTRAINT "tasks_parent_task_attempt_fkey" FOREIGN KEY ("parent_task_attempt") REFERENCES "task_attempts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("content", "created_at", "description", "end_time", "executor_id", "id", "parent_task_attempt", "priority", "project_id", "start_time", "status", "task_type", "template_id", "title", "updated_at") SELECT "content", "created_at", "description", "end_time", "executor_id", "id", "parent_task_attempt", "priority", "project_id", "start_time", "status", "task_type", "template_id", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "task_tags_taskId_name_key" ON "task_tags"("taskId", "name");
