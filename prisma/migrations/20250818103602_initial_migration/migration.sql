-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "git_repo_path" TEXT NOT NULL,
    "setup_script" TEXT NOT NULL DEFAULT '',
    "dev_script" TEXT NOT NULL DEFAULT '',
    "cleanup_script" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "parent_task_attempt" TEXT,
    "template_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "tags" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_parent_task_attempt_fkey" FOREIGN KEY ("parent_task_attempt") REFERENCES "task_attempts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "template_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "default_prompt" TEXT NOT NULL,
    "tags" TEXT,
    "estimated_hours" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "task_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_id" TEXT NOT NULL,
    "worktree_path" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "merge_commit" TEXT,
    "executor" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stdout" TEXT,
    "stderr" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    CONSTRAINT "task_attempts_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "execution_processes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_attempt_id" TEXT NOT NULL,
    "process_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "args" TEXT,
    "working_directory" TEXT NOT NULL,
    "stdout" TEXT,
    "stderr" TEXT,
    "exit_code" INTEGER,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "execution_processes_task_attempt_id_fkey" FOREIGN KEY ("task_attempt_id") REFERENCES "task_attempts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "execution_process_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "execution_process_id" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "execution_process_logs_execution_process_id_fkey" FOREIGN KEY ("execution_process_id") REFERENCES "execution_processes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "executor_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_attempt_id" TEXT NOT NULL,
    "executor" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "executor_sessions_task_attempt_id_fkey" FOREIGN KEY ("task_attempt_id") REFERENCES "task_attempts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "endpoint_url" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "parameters" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "execution_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attempt_id" TEXT NOT NULL,
    "model_used" TEXT NOT NULL,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "duration_ms" INTEGER,
    "success" BOOLEAN NOT NULL,
    "validation_passed" BOOLEAN,
    "cost_estimate" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "execution_metrics_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "task_attempts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "todo_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "start_time" DATETIME,
    "end_time" DATETIME,
    "duration" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "validation_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "todo_task_id" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "duration" INTEGER NOT NULL,
    "stages" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "validation_runs_todo_task_id_fkey" FOREIGN KEY ("todo_task_id") REFERENCES "todo_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bdd_scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "todo_task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gherkin_content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "executed_at" DATETIME,
    "execution_duration" INTEGER,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bdd_scenarios_todo_task_id_fkey" FOREIGN KEY ("todo_task_id") REFERENCES "todo_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_git_repo_path_key" ON "projects"("git_repo_path");

-- CreateIndex
CREATE UNIQUE INDEX "task_templates_project_id_template_name_key" ON "task_templates"("project_id", "template_name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_name_key" ON "ai_models"("name");
