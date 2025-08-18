#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function assignTaskNumbers() {
  console.log('🔄 Assigning task numbers to existing TodoTask records...');
  
  try {
    // Get all tasks without task numbers, ordered by creation date
    const tasksWithoutNumbers = await prisma.todoTask.findMany({
      where: {
        taskNumber: null
      },
      orderBy: {
        createdAt: 'asc' // Assign numbers based on creation order
      }
    });
    
    console.log(`📋 Found ${tasksWithoutNumbers.length} tasks without task numbers`);
    
    if (tasksWithoutNumbers.length === 0) {
      console.log('✅ All tasks already have task numbers assigned');
      return;
    }
    
    // Get the highest existing task number to continue from there
    const highestTaskNumber = await prisma.todoTask.findFirst({
      where: {
        taskNumber: { not: null }
      },
      orderBy: {
        taskNumber: 'desc'
      },
      select: {
        taskNumber: true
      }
    });
    
    let startingNumber = (highestTaskNumber?.taskNumber || 0) + 1;
    
    console.log(`🚀 Starting task number assignment from ${startingNumber}`);
    
    // Assign task numbers to each task
    for (let i = 0; i < tasksWithoutNumbers.length; i++) {
      const task = tasksWithoutNumbers[i];
      const taskNumber = startingNumber + i;
      
      await prisma.todoTask.update({
        where: { id: task.id },
        data: { taskNumber }
      });
      
      console.log(`✅ Assigned TASK-${taskNumber.toString().padStart(3, '0')} to: ${task.content.substring(0, 60)}...`);
    }
    
    console.log(`\n🎉 Successfully assigned task numbers to ${tasksWithoutNumbers.length} tasks!`);
    console.log(`📊 Task numbers now range from TASK-001 to TASK-${(startingNumber + tasksWithoutNumbers.length - 1).toString().padStart(3, '0')}`);
    
  } catch (error) {
    console.error('❌ Error assigning task numbers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if called directly
if (require.main === module) {
  assignTaskNumbers()
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { assignTaskNumbers };