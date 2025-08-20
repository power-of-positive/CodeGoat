#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function assignTaskNumbers() {
  console.log('🔄 Task number migration script (legacy - taskNumber field not in current schema)');

  try {
    // NOTE: taskNumber field doesn't exist in current Prisma schema
    // This script is kept for reference but disabled to prevent TypeScript errors
    console.log('⚠️ This script is disabled because taskNumber field is not in current schema');
    console.log('📋 Current TodoTask schema uses UUID id field instead');

    // Get all tasks to show current state
    const allTasks = await prisma.todoTask.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    console.log(`📊 Current tasks in database: ${allTasks.length}`);
    if (allTasks.length > 0) {
      console.log('✅ Tasks are identified by UUID id field');
      allTasks.slice(0, 3).forEach((task, index) => {
        console.log(
          `  ${index + 1}. ${task.id.substring(0, 8)}: ${task.content.substring(0, 60)}...`
        );
      });
    }

    /*
    // COMMENTED OUT: Original migration code for taskNumber field
    // This would need schema changes to work
    
    const tasksWithoutNumbers = await prisma.todoTask.findMany({
      where: { taskNumber: null },
      orderBy: { createdAt: 'asc' }
    });
    
    const highestTaskNumber = await prisma.todoTask.findFirst({
      where: { taskNumber: { not: null } },
      orderBy: { taskNumber: 'desc' },
      select: { taskNumber: true }
    });
    
    let startingNumber = (highestTaskNumber?.taskNumber || 0) + 1;
    
    for (let i = 0; i < tasksWithoutNumbers.length; i++) {
      const task = tasksWithoutNumbers[i];
      const taskNumber = startingNumber + i;
      
      await prisma.todoTask.update({
        where: { id: task.id },
        data: { taskNumber }
      });
    }
    */
  } catch (error) {
    console.error('❌ Error in migration script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if called directly
if (require.main === module) {
  assignTaskNumbers().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { assignTaskNumbers };
