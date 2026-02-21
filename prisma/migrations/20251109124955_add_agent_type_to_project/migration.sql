-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "git_repo_path" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL DEFAULT 'claude_code',
    "setup_script" TEXT NOT NULL DEFAULT '',
    "dev_script" TEXT NOT NULL DEFAULT '',
    "cleanup_script" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_projects" ("cleanup_script", "created_at", "description", "dev_script", "git_repo_path", "id", "name", "setup_script", "updated_at") SELECT "cleanup_script", "created_at", "description", "dev_script", "git_repo_path", "id", "name", "setup_script", "updated_at" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE UNIQUE INDEX "projects_git_repo_path_key" ON "projects"("git_repo_path");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
