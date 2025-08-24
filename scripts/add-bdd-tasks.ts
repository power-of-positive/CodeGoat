#!/usr/bin/env npx ts-node

import { PrismaClient, TodoStatus, TodoPriority, TaskType } from '@prisma/client';

const prisma = new PrismaClient();

const tasks = [
  {
    content: 'Audit and link existing BDD scenarios to Playwright tests via cucumber',
    status: TodoStatus.IN_PROGRESS,
    priority: TodoPriority.HIGH,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
  {
    content: 'Implement story completion validation requiring BDD scenarios and tests',
    status: TodoStatus.PENDING,
    priority: TodoPriority.HIGH,
    taskType: TaskType.STORY,
    executorId: 'claude-code',
  },
  {
    content: 'Fix missing validation step details page',
    status: TodoStatus.PENDING,
    priority: TodoPriority.MEDIUM,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
  {
    content: 'Fix recent runs links in analytics page to show run details',
    status: TodoStatus.PENDING,
    priority: TodoPriority.MEDIUM,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
  {
    content: 'Fix run details links in task details page',
    status: TodoStatus.PENDING,
    priority: TodoPriority.MEDIUM,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
  {
    content: 'Add Playwright tests for all BDD functionality',
    status: TodoStatus.PENDING,
    priority: TodoPriority.HIGH,
    taskType: TaskType.TASK,
    executorId: 'claude-code',
  },
];

async function addTasks() {
  try {
    console.log('Adding BDD-related tasks to database...');

    for (const taskData of tasks) {
      const task = await prisma.todoTask.create({
        data: {
          id: crypto.randomUUID(),
          ...taskData,
          startTime: taskData.status === TodoStatus.IN_PROGRESS ? new Date() : undefined,
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
