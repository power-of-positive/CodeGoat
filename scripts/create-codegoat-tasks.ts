#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TaskData {
  id: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  taskType: 'STORY' | 'TASK';
}

/**
 * CODEGOAT tasks from BDD specifications
 */
const tasks: TaskData[] = [
  {
    id: 'CODEGOAT-001',
    content: 'Audit and link existing BDD scenarios to Playwright tests via cucumber',
    priority: 'HIGH',
    taskType: 'STORY'
  },
  {
    id: 'CODEGOAT-014',
    content: 'Switching across agents in analytics page does not change the data displayed',
    priority: 'MEDIUM',
    taskType: 'STORY'
  },
  {
    id: 'CODEGOAT-015',
    content: 'Add task editing functionality to the tasks board',
    priority: 'HIGH',
    taskType: 'STORY'
  },
  {
    id: 'CODEGOAT-017',
    content: 'Reorganise folder structure of the files',
    priority: 'MEDIUM',
    taskType: 'TASK'
  },
  {
    id: 'CODEGOAT-018',
    content: 'Increase test coverage to 90%',
    priority: 'HIGH',
    taskType: 'TASK'
  },
  {
    id: 'CODEGOAT-019',
    content: 'Tighten eslint rules to improve quality',
    priority: 'MEDIUM',
    taskType: 'TASK'
  },
  {
    id: 'CODEGOAT-022',
    content: 'Add task duration charts and time range filters',
    priority: 'MEDIUM',
    taskType: 'STORY'
  },
  {
    id: 'CODEGOAT-024',
    content: 'Add BDD test coverage reporting',
    priority: 'HIGH',
    taskType: 'STORY'
  },
  {
    id: 'CODEGOAT-025',
    content: 'Create comprehensive BDD scenarios for all todo-list.json tasks',
    priority: 'HIGH',
    taskType: 'STORY'
  },
  {
    id: 'CODEGOAT-026',
    content: 'Decouple business logic from API routes',
    priority: 'MEDIUM',
    taskType: 'TASK'
  },
  {
    id: 'CODEGOAT-027',
    content: 'Add analytics for workers',
    priority: 'MEDIUM',
    taskType: 'STORY'
  },
  {
    id: 'CODEGOAT-028',
    content: 'Analytics page performance investigation',
    priority: 'MEDIUM',
    taskType: 'TASK'
  },
];

async function createCodegoatTasks() {
  try {
    console.log('🔍 Creating CODEGOAT tasks in the database...');
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const taskData of tasks) {
      try {
        // Check if task already exists
        const existingTask = await prisma.task.findUnique({
          where: { id: taskData.id }
        });

        if (existingTask) {
          console.log(`⚠️  Task already exists: ${taskData.id}`);
          skippedCount++;
          continue;
        }

        // Create the task
        await prisma.task.create({
          data: {
            id: taskData.id,
            title: taskData.content, // Add required title field
            content: taskData.content,
            status: 'PENDING',
            priority: taskData.priority,
            taskType: taskData.taskType,
          }
        });

        console.log(`✅ Created task: ${taskData.id}`);
        createdCount++;

      } catch (error) {
        console.error(`❌ Error creating task ${taskData.id}:`, error);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${createdCount} tasks`);
    console.log(`   ⚠️  Skipped: ${skippedCount} tasks`);
    console.log(`   📈 Total processed: ${tasks.length} tasks`);

  } catch (error) {
    console.error('💥 Script failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  createCodegoatTasks()
    .then(() => {
      console.log('\n🎉 CODEGOAT task creation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { createCodegoatTasks };