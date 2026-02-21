#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const completedTaskIds = [
  'CODEGOAT-014',
  'CODEGOAT-015',
  'CODEGOAT-025',
  'CODEGOAT-026',
  'CODEGOAT-028',
  'CODEGOAT-032',
];

async function updateCompletedTasks() {
  try {
    console.log('Updating completed tasks in database...');

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
            return { ...task, status: 'completed' };
          }
          return task;
        }
      );
      backup.completedAt = new Date().toISOString();
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
      console.log('✅ Updated todo-list.json backup');
    }

    console.log('\n🎉 All specified tasks marked as completed!');
  } catch (error) {
    console.error('❌ Error updating tasks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  updateCompletedTasks().catch(console.error);
}

export { updateCompletedTasks };
