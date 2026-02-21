#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const completedTaskIds = ['CODEGOAT-035', 'CODEGOAT-036'];

async function updateFinalBatch() {
  try {
    console.log('Updating final batch of completed tasks...');

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
      backup.finalUpdate = new Date().toISOString();
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
      console.log('✅ Updated todo-list.json backup');
    }

    console.log('\n🎉 Final batch of tasks marked as completed!');

    // Summary
    console.log('\n📊 SUMMARY OF ALL COMPLETED TASKS:');
    console.log('✅ CODEGOAT-014: Fix historical timeline 500 error');
    console.log('✅ CODEGOAT-015: Add error boundary for all pages');
    console.log('✅ CODEGOAT-021: Rename analytics page to Validation Analytics');
    console.log('✅ CODEGOAT-025: Fix BDD tests page ScenarioCard import error');
    console.log('✅ CODEGOAT-026: Fix Settings page process is not defined error');
    console.log('✅ CODEGOAT-028: Fix validation runs query in analytics page');
    console.log('✅ CODEGOAT-029: Fix padding in stage history page');
    console.log('✅ CODEGOAT-030: Fix empty data state look of stage history page');
    console.log('✅ CODEGOAT-032: Fix validation analytics page count issue');
    console.log('✅ CODEGOAT-035: Add success notification in create new tasks');
    console.log('✅ CODEGOAT-036: Add button in task detail page to complete task');
    console.log(`\n🎯 Total: 11 tasks completed successfully!`);
  } catch (error) {
    console.error('❌ Error updating tasks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  updateFinalBatch().catch(console.error);
}

export { updateFinalBatch };
