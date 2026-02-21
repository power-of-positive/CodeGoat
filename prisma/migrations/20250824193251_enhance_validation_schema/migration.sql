/*
  Warnings:

  - You are about to drop the `todo_tasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `todo_task_id` on the `bdd_scenarios` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `validation_runs` table. All the data in the column will be lost.
  - You are about to drop the column `stages` on the `validation_runs` table. All the data in the column will be lost.
  - You are about to drop the column `todo_task_id` on the `validation_runs` table. All the data in the column will be lost.
  - Added the required column `task_id` to the `bdd_scenarios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `failed_stages` to the `validation_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passed_stages` to the `validation_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTime` to the `validation_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_stages` to the `validation_runs` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "todo_tasks";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "validation_stages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "run_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "stage_name" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER NOT NULL,
    "command" TEXT,
    "exit_code" INTEGER,
    "output" TEXT,
    "error_message" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "continue_on_failure" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "validation_stages_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "validation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "validation_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "run_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "validation_logs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "validation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bdd_scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gherkin_content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "executed_at" DATETIME,
    "execution_duration" INTEGER,
    "error_message" TEXT,
    "playwright_test_file" TEXT,
    "playwright_test_name" TEXT,
    "cucumber_steps" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bdd_scenarios_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bdd_scenarios" ("created_at", "cucumber_steps", "description", "error_message", "executed_at", "execution_duration", "feature", "gherkin_content", "id", "playwright_test_file", "playwright_test_name", "status", "title", "updated_at") SELECT "created_at", "cucumber_steps", "description", "error_message", "executed_at", "execution_duration", "feature", "gherkin_content", "id", "playwright_test_file", "playwright_test_name", "status", "title", "updated_at" FROM "bdd_scenarios";
DROP TABLE "bdd_scenarios";
ALTER TABLE "new_bdd_scenarios" RENAME TO "bdd_scenarios";
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "parent_task_attempt" TEXT,
    "template_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
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
    CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_parent_task_attempt_fkey" FOREIGN KEY ("parent_task_attempt") REFERENCES "task_attempts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("created_at", "description", "id", "parent_task_attempt", "priority", "project_id", "status", "tags", "template_id", "title", "updated_at") SELECT "created_at", "description", "id", "parent_task_attempt", "priority", "project_id", "status", "tags", "template_id", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE TABLE "new_validation_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_id" TEXT,
    "session_id" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_time" BIGINT,
    "totalTime" INTEGER NOT NULL,
    "total_stages" INTEGER NOT NULL,
    "passed_stages" INTEGER NOT NULL,
    "failed_stages" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "trigger_type" TEXT,
    "environment" TEXT,
    "git_commit" TEXT,
    "git_branch" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "validation_runs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_validation_runs" ("created_at", "id", "success", "timestamp") SELECT "created_at", "id", "success", "timestamp" FROM "validation_runs";
DROP TABLE "validation_runs";
ALTER TABLE "new_validation_runs" RENAME TO "validation_runs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
