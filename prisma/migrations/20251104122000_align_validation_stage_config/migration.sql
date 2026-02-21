PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_validation_stages" (
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
  CONSTRAINT "validation_stages_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "validation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "validation_stages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "validation_stage_configs" ("stage_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_validation_stages" (
  "id",
  "run_id",
  "stage_id",
  "stage_name",
  "success",
  "duration",
  "command",
  "exit_code",
  "output",
  "error_message",
  "enabled",
  "continue_on_failure",
  "order",
  "created_at"
) SELECT
  "id",
  "run_id",
  "stage_id",
  "stage_name",
  "success",
  "duration",
  "command",
  "exit_code",
  "output",
  "error_message",
  "enabled",
  "continue_on_failure",
  "order",
  "created_at"
FROM "validation_stages";

DROP TABLE "validation_stages";
ALTER TABLE "new_validation_stages" RENAME TO "validation_stages";

CREATE INDEX "idx_validation_stages_stage_id"
  ON "validation_stages" ("stage_id");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
