#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function fetchAndBackupTasks() {
  try {
    // Fetch all tasks with status TODO, PENDING, or IN_PROGRESS
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { status: 'TODO' },
          { status: 'PENDING' },
          { status: 'IN_PROGRESS' },
          { status: 'INPROGRESS' },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    console.log(`Found ${tasks.length} incomplete tasks`);

    // Format tasks for backup
    const backupData = {
      timestamp: new Date().toISOString(),
      totalTasks: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags ? JSON.parse(task.tags) : [],
        taskType: task.taskType,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
    };

    // Save backup to todo-list.json
    const backupPath = path.join(process.cwd(), 'todo-list.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`Tasks backed up to ${backupPath}`);

    // Display tasks
    console.log('\n=== Incomplete Tasks ===\n');
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. [${task.id}] ${task.title}`);
      console.log(`   Status: ${task.status} | Priority: ${task.priority}`);
      if (task.description) {
        console.log(`   Description: ${task.description.substring(0, 100)}...`);
      }
      console.log();
    });

    return tasks;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  fetchAndBackupTasks().catch(console.error);
}

export { fetchAndBackupTasks };
