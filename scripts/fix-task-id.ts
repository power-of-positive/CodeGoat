#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTaskId() {
  try {
    const task = await prisma.task.findFirst({
      where: { id: 'comprehensive-bdd' },
    });

    if (task) {
      // Delete the task with invalid ID since it's likely a test task
      await prisma.task.delete({
        where: { id: 'comprehensive-bdd' },
      });
      console.log('✅ Deleted task with invalid ID: comprehensive-bdd');
    } else {
      console.log('⚠️ Task with ID comprehensive-bdd not found');
    }
  } catch (error) {
    console.error('❌ Error fixing task ID:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixTaskId().catch(console.error);
}

export { fixTaskId };
