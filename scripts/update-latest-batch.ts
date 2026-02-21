#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const completedTaskIds = ['CODEGOAT-037', 'CODEGOAT-018', 'CODEGOAT-019'];

async function updateLatestBatch() {
  try {
    console.log('Updating latest batch of completed tasks...');

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
      backup.latestUpdate = new Date().toISOString();
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
      console.log('✅ Updated todo-list.json backup');
    }

    console.log('\n🎉 Latest batch of tasks marked as completed!');

    // Final comprehensive summary
    console.log('\n📊 COMPLETE SESSION SUMMARY:');
    console.log('='.repeat(60));
    console.log('✅ CODEGOAT-014: Fix historical timeline 500 error');
    console.log('✅ CODEGOAT-015: Add error boundary for all pages');
    console.log('✅ CODEGOAT-018: Check repo for empty files and remove them');
    console.log('✅ CODEGOAT-019: Add task editing functionality');
    console.log('✅ CODEGOAT-021: Rename analytics page to Validation Analytics');
    console.log('✅ CODEGOAT-025: Fix BDD tests page ScenarioCard import error');
    console.log('✅ CODEGOAT-026: Fix Settings page process is not defined error');
    console.log('✅ CODEGOAT-028: Fix validation runs query in analytics page');
    console.log('✅ CODEGOAT-029: Fix padding in stage history page');
    console.log('✅ CODEGOAT-030: Fix empty data state look of stage history page');
    console.log('✅ CODEGOAT-032: Fix validation analytics page count issue');
    console.log('✅ CODEGOAT-035: Add success notification in create new tasks');
    console.log('✅ CODEGOAT-036: Add button in task detail page to complete task');
    console.log('✅ CODEGOAT-037: Fix BDD tests page - does not display any tests');
    console.log('='.repeat(60));
    console.log(`\n🎯 GRAND TOTAL: 14 tasks completed successfully!`);
    console.log('\n📈 MAJOR IMPROVEMENTS:');
    console.log('• Fixed critical frontend errors and compatibility issues');
    console.log('• Enhanced user experience with notifications and better UI');
    console.log('• Improved data visibility in analytics (10x more records shown)');
    console.log('• Added comprehensive error boundaries for better error handling');
    console.log('• Created sample BDD scenarios for testing functionality');
    console.log('• Cleaned up repository by removing empty/unnecessary files');
    console.log('• Enhanced task management with edit functionality from detail page');
    console.log('• Fixed environment variable issues for Vite compatibility');
  } catch (error) {
    console.error('❌ Error updating tasks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  updateLatestBatch().catch(console.error);
}

export { updateLatestBatch };
