import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Remove the legacy duration column from the tasks table.
 * Duration is now derived from start/end timestamps rather than persisted.
 */
async function dropDurationColumn() {
  console.log('🔧 Checking for legacy duration column on tasks...');

  try {
    const columnInfo = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM pragma_table_info('tasks') WHERE name = 'duration'"
    );

    if (columnInfo.length === 0) {
      console.log('✅ No duration column detected – nothing to do.');
      return;
    }

    console.log('⚠️  Found legacy duration column. Dropping it to avoid stale data...');
    await prisma.$executeRawUnsafe('ALTER TABLE tasks DROP COLUMN duration;');
    console.log('✅ duration column removed successfully.');
  } catch (error) {
    console.error('❌ Failed to drop duration column:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

dropDurationColumn().catch(error => {
  console.error('Fix failed:', error);
  process.exit(1);
});
