-- Normalize legacy task status values after schema creation
UPDATE "tasks"
SET "status" = 'pending'
WHERE "status" IN ('todo', 'pending');

UPDATE "tasks"
SET "status" = 'in_progress'
WHERE "status" IN ('inprogress', 'inreview', 'in_progress');

UPDATE "tasks"
SET "status" = 'completed'
WHERE "status" IN ('done', 'cancelled', 'completed');
