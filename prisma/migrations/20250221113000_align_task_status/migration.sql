-- Normalize legacy task statuses to the canonical Kanban states
UPDATE "tasks"
SET "status" = 'pending'
WHERE "status" IN ('pending');

UPDATE "tasks"
SET "status" = 'in_progress'
WHERE "status" IN ('inprogress', 'inreview');

UPDATE "tasks"
SET "status" = 'completed'
WHERE "status" IN ('done', 'cancelled');
