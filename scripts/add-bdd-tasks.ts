#!/usr/bin/env npx ts-node

import { PrismaClient, TaskStatus, Priority, TaskType } from '@prisma/client';

const prisma = new PrismaClient();

const tasks = [
  {
    content: 'Audit and link existing BDD scenarios to Playwright tests via cucumber',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
  {
    content: 'Implement story completion validation requiring BDD scenarios and tests',
    status: TaskStatus.PENDING,
    priority: Priority.HIGH,
    taskType: TaskType.STORY,
    executorId: 'claude-code',
  },
  {
    content: 'Fix missing validation step details page',
    status: TaskStatus.PENDING,
    priority: Priority.MEDIUM,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
  {
    content: 'Fix recent runs links in analytics page to show run details',
    status: TaskStatus.PENDING,
    priority: Priority.MEDIUM,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
  {
    content: 'Fix run details links in task details page',
    status: TaskStatus.PENDING,
    priority: Priority.MEDIUM,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
  {
    content: 'Add Playwright tests for all BDD functionality',
    status: TaskStatus.PENDING,
    priority: Priority.HIGH,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
];

async function addTasks() {
  try {
    console.log('Adding BDD-related tasks to database...');

    for (const taskData of tasks) {
      const task = await prisma.task.create({
        data: {
          id: crypto.randomUUID(),
          title: taskData.content, // Set title same as content for unified schema
          ...taskData,
          startTime: taskData.status === TaskStatus.IN_PROGRESS ? new Date() : undefined,
        },
      });
      console.log(`✓ Added task: ${task.content}`);
    }

    console.log('\n✅ All BDD tasks added successfully!');
  } catch (error) {
    console.error('❌ Error adding tasks:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  addTasks();
}
