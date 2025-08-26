-- CreateTable
CREATE TABLE "validation_stage_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stage_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "timeout" INTEGER NOT NULL DEFAULT 60000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "continue_on_failure" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL,
    "description" TEXT,
    "environment" TEXT,
    "category" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "validation_stage_configs_stage_id_key" ON "validation_stage_configs"("stage_id");
