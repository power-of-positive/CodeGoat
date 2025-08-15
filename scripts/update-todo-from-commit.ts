#!/usr/bin/env ts-node

/**
 * Update todo list from successful commit
 * 
 * This script automatically updates todo-list.json when a commit with a task ID
 * is successfully made. It extracts the task ID from the commit message and:
 * - Marks the task as completed
 * - Adds endTime timestamp
 * - Calculates duration if startTime exists
 * 
 * Expected commit message format: "Task XX: description" or "Task ID-XX: description"
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
}

const TODO_LIST_PATH = path.join(process.cwd(), 'todo-list.json');

function getLatestCommitMessage(): string {
  try {
    return execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error('Failed to get latest commit message:', error);
    return '';
  }
}

function extractTaskId(commitMessage: string): string | null {
  // Match patterns like "Task 55:", "Task ID-55:", "task 55:", etc.
  const patterns = [
    /^Task\s+(\d+):/i,
    /^Task\s+ID-(\d+):/i,
    /^(\d+):/,  // Just number followed by colon
  ];
  
  for (const pattern of patterns) {
    const match = commitMessage.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

function loadTodoList(): TodoItem[] {
  try {
    if (!fs.existsSync(TODO_LIST_PATH)) {
      console.log('No todo-list.json found, creating empty list');
      return [];
    }
    
    const content = fs.readFileSync(TODO_LIST_PATH, 'utf-8');
    const todos = JSON.parse(content);
    
    if (!Array.isArray(todos)) {
      console.error('Invalid todo list format: expected array');
      return [];
    }
    
    return todos;
  } catch (error) {
    console.error('Failed to load todo list:', error);
    return [];
  }
}

function saveTodoList(todos: TodoItem[]): boolean {
  try {
    const content = JSON.stringify(todos, null, 2);
    fs.writeFileSync(TODO_LIST_PATH, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save todo list:', error);
    return false;
  }
}

function calculateDuration(startTime: string, endTime: string): string {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (diffHours > 0) {
      return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
    } else {
      return `${diffMinutes}m`;
    }
  } catch (error) {
    console.error('Failed to calculate duration:', error);
    return '';
  }
}

function updateTodoItem(todos: TodoItem[], taskId: string): boolean {
  const todoIndex = todos.findIndex(todo => todo.id === taskId);
  
  if (todoIndex === -1) {
    console.log(`Task ${taskId} not found in todo list`);
    return false;
  }
  
  const todo = todos[todoIndex];
  
  // Only update if task is not already completed
  if (todo.status === 'completed') {
    console.log(`Task ${taskId} is already completed`);
    return false;
  }
  
  const endTime = new Date().toISOString();
  
  // Update the todo item
  todos[todoIndex] = {
    ...todo,
    status: 'completed',
    endTime: endTime,
    duration: todo.startTime ? calculateDuration(todo.startTime, endTime) : undefined
  };
  
  console.log(`✅ Marked task ${taskId} as completed`);
  console.log(`   Task: ${todo.content}`);
  if (todo.startTime) {
    console.log(`   Duration: ${todos[todoIndex].duration}`);
  }
  
  return true;
}

function main(): void {
  console.log('🔄 Checking for task completion from commit...');
  
  const commitMessage = getLatestCommitMessage();
  if (!commitMessage) {
    console.log('No commit message found');
    return;
  }
  
  console.log(`📝 Commit message: ${commitMessage.split('\\n')[0]}`);
  
  const taskId = extractTaskId(commitMessage);
  if (!taskId) {
    console.log('No task ID found in commit message');
    console.log('ℹ️  To enable automatic todo updates, use format: "Task XX: description"');
    return;
  }
  
  console.log(`🎯 Found task ID: ${taskId}`);
  
  const todos = loadTodoList();
  if (todos.length === 0) {
    console.log('No todos found to update');
    return;
  }
  
  const updated = updateTodoItem(todos, taskId);
  if (updated) {
    const saved = saveTodoList(todos);
    if (saved) {
      console.log('💾 Todo list updated successfully');
      
      // Get updated stats
      const completed = todos.filter(t => t.status === 'completed').length;
      const total = todos.length;
      const percentage = Math.round((completed / total) * 100);
      
      console.log(`📊 Progress: ${completed}/${total} tasks completed (${percentage}%)`);
    } else {
      console.error('❌ Failed to save todo list');
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { extractTaskId, updateTodoItem, calculateDuration };