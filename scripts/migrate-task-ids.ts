#!/usr/bin/env npx ts-node

/**
 * Migration script to convert existing UUID-based task IDs to CODEGOAT-XXX format
 * and remove the taskNumber field
 */

import { PrismaClient } from '@prisma/client';

interface ExistingTask {
  id: string;
  taskNumber?: number;
  content: string;
  status: any;
  priority: any;
  taskType: any;
  executorId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: string;
  createdAt: Date;
  updatedAt: Date;
}

async function migrateTaskIds() {
  console.log('🔄 Starting task ID migration...');

  const db = new PrismaClient();

  try {
    // Get all existing tasks
    const existingTasks = (await db.todoTask.findMany({
      orderBy: { createdAt: 'asc' },
    })) as ExistingTask[];

    console.log(`📊 Found ${existingTasks.length} tasks to migrate`);

    if (existingTasks.length === 0) {
      console.log('✅ No tasks to migrate');
      return;
    }

    // Create a mapping from old ID to new CODEGOAT ID
    const idMapping = new Map<string, string>();

    for (let i = 0; i < existingTasks.length; i++) {
      const task = existingTasks[i];
      const newId = `CODEGOAT-${(i + 1).toString().padStart(3, '0')}`;
      idMapping.set(task.id, newId);

      console.log(`🔄 Mapping ${task.id.substring(0, 8)}... -> ${newId}`);
    }

    // Start transaction to safely migrate data
    await db.$transaction(async tx => {
      console.log('🔄 Starting database transaction...');

      // Delete all existing tasks first (since we need to change primary keys)
      const deleteResult = await tx.todoTask.deleteMany({});
      console.log(`🗑️  Deleted ${deleteResult.count} existing tasks`);

      // Re-create tasks with new CODEGOAT IDs
      for (const [oldId, newId] of idMapping.entries()) {
        const task = existingTasks.find(t => t.id === oldId)!;

        await tx.todoTask.create({
          data: {
            id: newId,
            content: task.content,
            status: task.status,
            priority: task.priority,
            taskType: task.taskType,
            executorId: task.executorId,
            startTime: task.startTime,
            endTime: task.endTime,
            duration: task.duration,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          },
        });

        console.log(`✅ Created task ${newId}: ${task.content.substring(0, 50)}...`);
      }

      console.log('💾 Transaction completed successfully');
    });

    console.log('🎉 Migration completed successfully!');

    // Verify migration
    const migratedTasks = await db.todoTask.findMany({
      orderBy: { id: 'asc' },
    });

    console.log(`✅ Verification: ${migratedTasks.length} tasks with CODEGOAT IDs found`);
    migratedTasks.forEach(task => {
      console.log(`   - ${task.id}: ${task.content.substring(0, 60)}...`);
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  migrateTaskIds()
    .then(() => {
      console.log('🎉 Task ID migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Task ID migration failed:', error);
      process.exit(1);
    });
}

export { migrateTaskIds };
