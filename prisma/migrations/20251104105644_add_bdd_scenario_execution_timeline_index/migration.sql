-- CreateIndex
CREATE INDEX "idx_bdd_scenario_execution_timeline" ON "bdd_scenario_executions"("scenario_id", "executed_at");
