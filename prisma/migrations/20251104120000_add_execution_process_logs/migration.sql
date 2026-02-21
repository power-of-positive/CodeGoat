-- Create execution process tracking tables
CREATE TABLE "execution_processes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_id" TEXT,
    "worker_id" TEXT,
    "run_reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "command" TEXT,
    "args" TEXT,
    "working_directory" TEXT,
    "stdout_summary" TEXT,
    "stderr_summary" TEXT,
    "exit_code" INTEGER,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "execution_processes_task_id_fkey"
        FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "execution_process_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "execution_process_id" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "execution_process_logs_process_id_fkey"
        FOREIGN KEY ("execution_process_id") REFERENCES "execution_processes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_execution_processes_task_id" ON "execution_processes" ("task_id");
CREATE INDEX "idx_execution_processes_run_reason" ON "execution_processes" ("run_reason");
CREATE INDEX "idx_execution_processes_status" ON "execution_processes" ("status");

CREATE INDEX "idx_execution_process_logs_process_sequence"
    ON "execution_process_logs" ("execution_process_id", "sequence");
