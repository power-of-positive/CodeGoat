#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
}

async function fetchTasksFromDatabase() {
  try {
    console.log('🔍 Fetching tasks from database...');
    
    // Fetch all todo tasks
    const todoTasks = await prisma.todoTask.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`📋 Found ${todoTasks.length} todo tasks in database`);
    
    // Fetch all kanban tasks
    const kanbanTasks = await prisma.task.findMany({
      include: {
        project: true,
        attempts: true,
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`🎯 Found ${kanbanTasks.length} kanban tasks in database`);
    
    // Convert todo tasks to TodoItem format
    const todoItems: TodoItem[] = todoTasks.map(task => ({
      id: task.id,
      content: task.content,
      status: task.status.toLowerCase() as 'pending' | 'in_progress' | 'completed',
      priority: task.priority.toLowerCase() as 'high' | 'medium' | 'low',
      startTime: task.startTime?.toISOString(),
      endTime: task.endTime?.toISOString(),
      duration: task.duration || undefined,
    }));
    
    // Convert kanban tasks to TodoItem format
    const kanbanItems: TodoItem[] = kanbanTasks.map((task, index) => ({
      id: `KANBAN-${String(index + 1).padStart(3, '0')}`,
      content: `${task.title}: ${task.description || 'No description'}`,
      status: task.status === 'DONE' ? 'completed' : 
              task.status === 'INPROGRESS' ? 'in_progress' : 'pending',
      priority: task.priority.toLowerCase() as 'high' | 'medium' | 'low',
    }));
    
    // Combine all tasks
    const allTasks = [...todoItems, ...kanbanItems];
    
    console.log(`📊 Total tasks to write: ${allTasks.length}`);
    
    // Write to todo-list.json
    const todoListPath = path.join(process.cwd(), 'todo-list.json');
    await fs.promises.writeFile(todoListPath, JSON.stringify(allTasks, null, 2));
    
    console.log('✅ Successfully updated todo-list.json with all database tasks');
    
    // Print summary
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    const pending = allTasks.filter(t => t.status === 'pending').length;
    
    console.log('\n📈 Task Summary:');
    console.log(`   Completed: ${completed}`);
    console.log(`   In Progress: ${inProgress}`);
    console.log(`   Pending: ${pending}`);
    console.log(`   Total: ${allTasks.length}`);
    
    return allTasks;
    
  } catch (error) {
    console.error('❌ Error fetching tasks from database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fetchTasksFromDatabase()
    .then(() => {
      console.log('\n🎉 Task fetch completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { fetchTasksFromDatabase };