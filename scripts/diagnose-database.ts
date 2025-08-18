#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

async function diagnoseDatabasePath() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Database Diagnostic Report');
  console.log('=============================');
  
  console.log('\n📊 Environment Configuration:');
  console.log(`DATABASE_URL: ${process.env.KANBAN_DATABASE_URL}`);
  console.log(`Current Working Directory: ${process.cwd()}`);
  
  try {
    // Test connection and get basic stats
    const taskCount = await prisma.todoTask.count();
    console.log(`\n📋 TodoTask Statistics:`);
    console.log(`Total tasks: ${taskCount}`);
    
    if (taskCount > 0) {
      // Get task number statistics
      const tasksWithNumbers = await prisma.todoTask.count({
        where: { taskNumber: { not: null } }
      });
      
      console.log(`Tasks with task numbers: ${tasksWithNumbers}`);
      console.log(`Tasks without task numbers: ${taskCount - tasksWithNumbers}`);
      
      // Show a few sample tasks
      const sampleTasks = await prisma.todoTask.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          taskNumber: true,
          content: true,
          status: true,
          priority: true,
          createdAt: true
        }
      });
      
      console.log(`\n📝 Sample Tasks (latest 3):`);
      sampleTasks.forEach((task, index) => {
        const taskId = task.taskNumber ? `TASK-${task.taskNumber.toString().padStart(3, '0')}` : task.id.substring(0, 8);
        console.log(`${index + 1}. [${taskId}] ${task.content.substring(0, 60)}... (${task.status})`);
      });
      
      // Check for the highest task number
      const highestTask = await prisma.todoTask.findFirst({
        where: { taskNumber: { not: null } },
        orderBy: { taskNumber: 'desc' },
        select: { taskNumber: true }
      });
      
      if (highestTask) {
        console.log(`\n🔝 Highest task number: TASK-${highestTask.taskNumber!.toString().padStart(3, '0')}`);
      }
    } else {
      console.log('No TodoTask records found');
    }
    
    // Test a few other tables for comparison
    const validationRunCount = await prisma.validationRun.count().catch(() => null);
    const bddScenarioCount = await prisma.bDDScenario.count().catch(() => null);
    
    console.log(`\n🏗️  Other Table Statistics:`);
    console.log(`ValidationRuns: ${validationRunCount ?? 'N/A'}`);
    console.log(`BDDScenarios: ${bddScenarioCount ?? 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
  
  // Also check file system for database files
  console.log('\n💾 Database Files Found:');
  const fs = require('fs');
  const glob = require('glob');
  
  const dbFiles = glob.sync('**/*.db', { ignore: ['node_modules/**', '.git/**'] }) as string[];
  dbFiles.forEach((file: string) => {
    const fullPath = path.resolve(file);
    const stats = fs.statSync(fullPath);
    console.log(`📄 ${file}: ${Math.round(stats.size / 1024)}KB, modified ${stats.mtime.toISOString()}`);
  });
}

// Run the diagnostic
if (require.main === module) {
  diagnoseDatabasePath()
    .catch((error) => {
      console.error('Diagnostic failed:', error);
      process.exit(1);
    });
}