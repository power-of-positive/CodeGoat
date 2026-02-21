#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const completedTaskIds = ['CODEGOAT-021', 'CODEGOAT-029', 'CODEGOAT-030'];

async function updateRemainingTasks() {
  try {
    console.log('Updating remaining completed tasks in database...');

    for (const taskId of completedTaskIds) {
      const result = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Updated ${taskId}: ${result.title}`);
    }

    // Update the todo-list.json backup
    const backupPath = path.join(process.cwd(), 'todo-list.json');
    if (fs.existsSync(backupPath)) {
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      backup.tasks = backup.tasks.map(
        (task: { id: string; status: string; [key: string]: unknown }) => {
          if (completedTaskIds.includes(task.id)) {
            return { ...task, status: 'COMPLETED' };
          }
          return task;
        }
      );
      backup.lastUpdate = new Date().toISOString();
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
      console.log('✅ Updated todo-list.json backup');
    }

    console.log('\n🎉 Additional tasks marked as completed!');
  } catch (error) {
    console.error('❌ Error updating tasks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  updateRemainingTasks().catch(console.error);
}

export { updateRemainingTasks };
