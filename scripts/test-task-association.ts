#!/usr/bin/env npx ts-node

import { PrismaClient, TodoStatus, TodoPriority } from '@prisma/client';

async function testTaskAssociation() {
  const db = new PrismaClient();

  try {
    console.log('Creating test task...');

    // Create a test task in progress
    const testTask = await db.todoTask.create({
      data: {
        id: 'test-task-123',
        content: 'Test task for validation run association',
        status: TodoStatus.IN_PROGRESS,
        priority: TodoPriority.HIGH,
        startTime: new Date(),
      },
    });

    console.log('Test task created:', testTask.id);

    // Check validation runs before
    const runsBefore = await db.validationRun.count();
    console.log('Validation runs before:', runsBefore);

    return testTask.id;
  } catch (error) {
    console.error('Error creating test task:', error);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  testTaskAssociation();
}

export { testTaskAssociation };
