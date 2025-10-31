import { PrismaClient } from '@prisma/client';
import { parseDuration } from '../src/utils/parse-duration';

const prisma = new PrismaClient();

/**
 * Fix the duration column in the tasks table
 * Converts TEXT duration values to INTEGER milliseconds
 */
async function fixDurationColumn() {
  console.log('🔧 Starting duration column fix...');

  try {
    // Get all tasks with non-null duration values
    const tasks = await prisma.$queryRawUnsafe<Array<{ id: string; duration: string | number | null }>>(
      'SELECT id, duration FROM tasks WHERE duration IS NOT NULL'
    );

    console.log(`Found ${tasks.length} tasks with duration values`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const task of tasks) {
      try {
        let durationMs: number | null = null;

        // Check if duration is already a number (integer milliseconds)
        if (typeof task.duration === 'number') {
          durationMs = task.duration;
          console.log(`✓ Task ${task.id}: duration already numeric (${durationMs}ms)`);
        }
        // If it's a string, parse it
        else if (typeof task.duration === 'string') {
          // Check if it's a numeric string
          if (/^\d+$/.test(task.duration)) {
            durationMs = parseInt(task.duration, 10);
            console.log(`✓ Task ${task.id}: converted numeric string "${task.duration}" to ${durationMs}ms`);
          } else {
            // Parse human-readable format like "3h 32m"
            durationMs = parseDuration(task.duration);
            console.log(`✓ Task ${task.id}: converted "${task.duration}" to ${durationMs}ms`);
          }
        }

        // Update the task with the numeric duration
        if (durationMs !== null) {
          await prisma.$executeRawUnsafe(
            'UPDATE tasks SET duration = ? WHERE id = ?',
            durationMs,
            task.id
          );
          fixedCount++;
        }
      } catch (error) {
        console.error(`✗ Error processing task ${task.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ Duration fix complete!`);
    console.log(`   - Fixed: ${fixedCount} tasks`);
    console.log(`   - Errors: ${errorCount} tasks`);

    // Now update the schema to INTEGER if it's still TEXT
    console.log('\n🔄 Checking column type...');
    const schemaInfo = await prisma.$queryRawUnsafe<Array<{ type: string }>>(
      "SELECT type FROM pragma_table_info('tasks') WHERE name = 'duration'"
    );

    if (schemaInfo.length > 0 && schemaInfo[0].type === 'TEXT') {
      console.log('⚠️  Column is still TEXT type. Changing to INTEGER...');

      // Create a new table with INTEGER duration
      await prisma.$executeRawUnsafe(`
        PRAGMA foreign_keys=OFF;

        CREATE TABLE "new_tasks" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "project_id" TEXT,
          "parent_task_attempt" TEXT,
          "template_id" TEXT,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "status" TEXT NOT NULL DEFAULT 'todo',
          "priority" TEXT NOT NULL DEFAULT 'medium',
          "tags" TEXT,
          "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" DATETIME NOT NULL,
          "task_type" TEXT DEFAULT 'task',
          "executor_id" TEXT,
          "start_time" DATETIME,
          "end_time" DATETIME,
          "duration" INTEGER,
          "content" TEXT,
          FOREIGN KEY ("template_id") REFERENCES "task_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          FOREIGN KEY ("parent_task_attempt") REFERENCES "task_attempts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );

        INSERT INTO "new_tasks" SELECT * FROM "tasks";
        DROP TABLE "tasks";
        ALTER TABLE "new_tasks" RENAME TO "tasks";

        PRAGMA foreign_keys=ON;
      `);

      console.log('✅ Column type changed to INTEGER');
    } else {
      console.log('✓ Column is already INTEGER type');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDurationColumn().catch(error => {
  console.error('Fix failed:', error);
  process.exit(1);
});
