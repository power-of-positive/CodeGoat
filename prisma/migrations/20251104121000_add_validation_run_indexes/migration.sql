CREATE INDEX "idx_validation_runs_session_id"
  ON "validation_runs" ("session_id");

CREATE INDEX "idx_validation_runs_git_commit"
  ON "validation_runs" ("git_commit");

CREATE INDEX "idx_validation_runs_git_branch"
  ON "validation_runs" ("git_branch");
