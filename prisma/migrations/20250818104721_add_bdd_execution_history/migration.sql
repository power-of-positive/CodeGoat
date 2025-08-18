-- CreateTable
CREATE TABLE "bdd_scenario_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "executed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "execution_duration" INTEGER,
    "error_message" TEXT,
    "step_results" TEXT,
    "environment" TEXT,
    "executed_by" TEXT,
    "gherkin_snapshot" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bdd_scenario_executions_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "bdd_scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
