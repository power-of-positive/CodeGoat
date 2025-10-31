#!/usr/bin/env node
/**
 * Clear worker-related data from the database
 *
 * This script clears:
 * - Task executor assignments (executorId)
 * - Task attempts and execution history
 * - Execution processes and logs
 * - Executor sessions
 * - Execution metrics
 * - Validation runs, stages, and logs
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function promptConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question('⚠️  This will delete all worker-related data. Are you sure? (yes/no): ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function clearWorkerData() {
  console.log('🔍 Checking worker-related data in database...\n');

  try {
    // Get counts before deletion
    const tasksWithExecutor = await prisma.task.count({
      where: { executorId: { not: null } },
    });
    const taskAttempts = await prisma.taskAttempt.count();
    const executionProcesses = await prisma.executionProcess.count();
    const executorSessions = await prisma.executorSession.count();
    const executionMetrics = await prisma.executionMetric.count();
    const validationRuns = await prisma.validationRun.count();
    const validationStages = await prisma.validationStage.count();
    const validationLogs = await prisma.validationLog.count();

    console.log('Current data:');
    console.log(`  📋 Tasks with executor assignments: ${tasksWithExecutor}`);
    console.log(`  🔄 Task attempts: ${taskAttempts}`);
    console.log(`  ⚙️  Execution processes: ${executionProcesses}`);
    console.log(`  🔗 Executor sessions: ${executorSessions}`);
    console.log(`  📊 Execution metrics: ${executionMetrics}`);
    console.log(`  ✅ Validation runs: ${validationRuns}`);
    console.log(`  📝 Validation stages: ${validationStages}`);
    console.log(`  📄 Validation logs: ${validationLogs}\n`);

    if (
      tasksWithExecutor === 0 &&
      taskAttempts === 0 &&
      executionProcesses === 0 &&
      executorSessions === 0 &&
      executionMetrics === 0 &&
      validationRuns === 0
    ) {
      console.log('✨ No worker-related data found. Nothing to clear.');
      return;
    }

    // Confirm deletion
    const confirmed = await promptConfirmation();
    if (!confirmed) {
      console.log('❌ Operation cancelled.');
      return;
    }

    console.log('\n🗑️  Clearing worker-related data...\n');

    // Clear in order respecting foreign key constraints
    // Start with dependent tables first

    // 1. Clear validation logs (depends on validation runs)
    if (validationLogs > 0) {
      await prisma.validationLog.deleteMany();
      console.log(`✅ Deleted ${validationLogs} validation logs`);
    }

    // 2. Clear validation stages (depends on validation runs)
    if (validationStages > 0) {
      await prisma.validationStage.deleteMany();
      console.log(`✅ Deleted ${validationStages} validation stages`);
    }

    // 3. Clear validation runs
    if (validationRuns > 0) {
      await prisma.validationRun.deleteMany();
      console.log(`✅ Deleted ${validationRuns} validation runs`);
    }

    // 4. Clear execution process logs (depends on execution processes)
    const executionProcessLogs = await prisma.executionProcessLog.count();
    if (executionProcessLogs > 0) {
      await prisma.executionProcessLog.deleteMany();
      console.log(`✅ Deleted ${executionProcessLogs} execution process logs`);
    }

    // 5. Clear execution processes (depends on task attempts)
    if (executionProcesses > 0) {
      await prisma.executionProcess.deleteMany();
      console.log(`✅ Deleted ${executionProcesses} execution processes`);
    }

    // 6. Clear executor sessions (depends on task attempts)
    if (executorSessions > 0) {
      await prisma.executorSession.deleteMany();
      console.log(`✅ Deleted ${executorSessions} executor sessions`);
    }

    // 7. Clear execution metrics (depends on task attempts)
    if (executionMetrics > 0) {
      await prisma.executionMetric.deleteMany();
      console.log(`✅ Deleted ${executionMetrics} execution metrics`);
    }

    // 8. Clear task attempts
    if (taskAttempts > 0) {
      await prisma.taskAttempt.deleteMany();
      console.log(`✅ Deleted ${taskAttempts} task attempts`);
    }

    // 9. Clear executor assignments from tasks
    if (tasksWithExecutor > 0) {
      await prisma.task.updateMany({
        where: { executorId: { not: null } },
        data: { executorId: null },
      });
      console.log(`✅ Cleared executor assignments from ${tasksWithExecutor} tasks`);
    }

    console.log('\n✨ Worker-related data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing worker data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearWorkerData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
