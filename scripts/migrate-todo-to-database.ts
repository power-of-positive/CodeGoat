#!/usr/bin/env npx ts-node

import fs from 'fs/promises';
import path from 'path';
import { createDatabaseService } from '../src/services/database';
import { WinstonLogger } from '../src/logger-winston';
import { TodoStatus, TodoPriority } from '@prisma/client';

interface JsonTask {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startTime?: string;
  endTime?: string;
  duration?: string;
}

// Status mapping between JSON and Prisma enum
const statusMapping: Record<string, TodoStatus> = {
  pending: TodoStatus.PENDING,
  in_progress: TodoStatus.IN_PROGRESS,
  completed: TodoStatus.COMPLETED,
};

// Priority mapping between JSON and Prisma enum
const priorityMapping: Record<string, TodoPriority> = {
  low: TodoPriority.LOW,
  medium: TodoPriority.MEDIUM,
  high: TodoPriority.HIGH,
};

async function migrateTodoTasks() {
  const logger = new WinstonLogger();
  const db = createDatabaseService(logger);

  try {
    logger.info('Starting todo task migration...');

    // Read the JSON file
    const todoListPath = path.join(process.cwd(), 'todo-list.json');
    const jsonData = await fs.readFile(todoListPath, 'utf-8');
    const tasks: JsonTask[] = JSON.parse(jsonData);

    logger.info(`Found ${tasks.length} tasks in todo-list.json`);

    // Check existing tasks in database to avoid duplicates
    const existingTasks = await db.todoTask.findMany({
      select: { id: true },
    });
    const existingIds = new Set(existingTasks.map(t => t.id));

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        if (existingIds.has(task.id)) {
          logger.debug(`Skipping task ${task.id} - already exists in database`);
          skipped++;
          continue;
        }

        // Convert JSON task to database format
        const dbTask = {
          id: task.id,
          content: task.content,
          status: statusMapping[task.status] || TodoStatus.PENDING,
          priority: priorityMapping[task.priority] || TodoPriority.MEDIUM,
          startTime: task.startTime ? new Date(task.startTime) : null,
          endTime: task.endTime ? new Date(task.endTime) : null,
          duration: task.duration || null,
        };

        await db.todoTask.create({
          data: dbTask,
        });

        logger.debug(`Migrated task ${task.id}: ${task.content.substring(0, 50)}...`);
        migrated++;
      } catch (error) {
        logger.error(`Failed to migrate task ${task.id}:`, error as Error);
        failed++;
      }
    }

    logger.info(`Migration completed: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);

    // Verify migration
    const totalInDb = await db.todoTask.count();
    logger.info(`Total tasks now in database: ${totalInDb}`);

    if (migrated > 0) {
      logger.info('✅ Migration successful! Tasks have been migrated to the database.');

      // Optionally backup the JSON file
      const backupPath = path.join(process.cwd(), `todo-list.json.backup.${Date.now()}`);
      await fs.copyFile(todoListPath, backupPath);
      logger.info(`📋 Backup created at: ${backupPath}`);
    }
  } catch (error) {
    logger.error('Migration failed:', error as Error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateTodoTasks()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateTodoTasks };
