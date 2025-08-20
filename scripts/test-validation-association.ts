#!/usr/bin/env npx ts-node

import { PrismaClient } from '@prisma/client';

async function testValidationAssociation() {
  const db = new PrismaClient();

  try {
    console.log('Testing validation run association...');

    // Find the current task
    const task = await db.todoTask.findFirst({
      where: { status: 'IN_PROGRESS' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!task) {
      console.log('No task in progress found');
      return;
    }

    console.log('Found task:', task.id);

    // Create a validation run
    const run = await db.validationRun.create({
      data: {
        todoTaskId: task.id,
        timestamp: new Date(),
        success: true,
        duration: 500,
        stages: JSON.stringify([
          {
            id: 'test-stage',
            name: 'Test Stage',
            success: true,
            duration: 500,
            output: 'Test validation passed',
          },
        ]),
      },
    });

    console.log('Created validation run:', run.id, 'associated with task:', task.id);

    // Verify the association
    const taskWithRuns = await db.todoTask.findUnique({
      where: { id: task.id },
      include: { validationRuns: { orderBy: { createdAt: 'desc' }, take: 3 } },
    });

    console.log('Task now has', taskWithRuns?.validationRuns.length, 'validation runs');

    // Show the latest validation run details
    if (taskWithRuns?.validationRuns.length) {
      const latestRun = taskWithRuns.validationRuns[0];
      console.log('Latest run:', {
        id: latestRun.id,
        success: latestRun.success,
        duration: latestRun.duration,
        timestamp: latestRun.timestamp,
      });
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  testValidationAssociation();
}

export { testValidationAssociation };
