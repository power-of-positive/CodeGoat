#!/usr/bin/env node

/**
 * Validate commit messages to ensure they contain task IDs from todo-list.json
 * This enforces traceability between commits and tasks
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
}

interface CommitMessageConfig {
  requireTaskId: boolean;
  taskIdPattern: RegExp;
  excludePatterns: string[];
  todoListPath: string;
}

const DEFAULT_CONFIG: CommitMessageConfig = {
  requireTaskId: true,
  taskIdPattern: /(?:task|fix|feat|chore|docs|style|refactor|test|build|ci|perf|revert)(?:\s*#?|\s*:?\s*)(\d+)/i,
  excludePatterns: [
    '^Merge ',
    '^Revert ',
    '^Initial commit',
    '^WIP',
    '^fixup!',
    '^squash!'
  ],
  todoListPath: path.join(process.cwd(), 'todo-list.json')
};

function loadTodoList(todoListPath: string): TodoItem[] {
  try {
    const content = fs.readFileSync(todoListPath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`⚠️  Could not load todo list from ${todoListPath}`);
    return [];
  }
}

function extractTaskId(message: string, pattern: RegExp): string | null {
  const match = message.match(pattern);
  return match ? match[1] : null;
}

function isExcludedMessage(message: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => new RegExp(pattern).test(message));
}

function getCommitMessage(): string {
  try {
    // Try to get the commit message from the file (used by git hooks)
    const commitMsgFile = process.argv[2];
    if (commitMsgFile && fs.existsSync(commitMsgFile)) {
      return fs.readFileSync(commitMsgFile, 'utf-8').trim();
    }
    
    // Fallback to getting the last commit message
    return execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error('❌ Failed to get commit message');
    process.exit(1);
  }
}

function validateCommitMessage(): void {
  const config = DEFAULT_CONFIG;
  const commitMessage = getCommitMessage();
  
  console.log('🔍 Validating commit message...');
  console.log(`📝 Message: ${commitMessage.split('\n')[0]}`); // First line only
  
  // Check if message is excluded
  if (isExcludedMessage(commitMessage, config.excludePatterns)) {
    console.log('✅ Commit message is excluded from validation');
    process.exit(0);
  }
  
  // Extract task ID
  const taskId = extractTaskId(commitMessage, config.taskIdPattern);
  
  if (!taskId) {
    console.error('❌ Commit message must reference a task ID');
    console.error('💡 Example formats:');
    console.error('   - feat: implement feature (task #123)');
    console.error('   - fix: resolve issue - task 123');
    console.error('   - chore: update dependencies [task-123]');
    process.exit(1);
  }
  
  console.log(`📋 Found task reference: ${taskId}`);
  
  // Load and validate against todo list
  const todos = loadTodoList(config.todoListPath);
  if (todos.length > 0) {
    const taskExists = todos.some(todo => todo.id === taskId);
    
    if (!taskExists) {
      console.error(`❌ Task ID ${taskId} not found in todo-list.json`);
      console.error('💡 Available task IDs:');
      const activeTaskIds = todos
        .filter(t => t.status !== 'completed')
        .map(t => `   - ${t.id}: ${t.content.substring(0, 50)}...`)
        .slice(0, 10);
      activeTaskIds.forEach(id => console.error(id));
      if (todos.filter(t => t.status !== 'completed').length > 10) {
        console.error('   ... and more');
      }
      process.exit(1);
    }
    
    const task = todos.find(t => t.id === taskId)!;
    console.log(`✅ Valid task reference: ${task.content.substring(0, 60)}...`);
    console.log(`   Status: ${task.status}, Priority: ${task.priority}`);
  } else {
    console.log('⚠️  Todo list is empty, skipping task validation');
  }
  
  console.log('✅ Commit message validation passed');
}

// Run validation
if (require.main === module) {
  try {
    validateCommitMessage();
  } catch (error) {
    console.error('❌ Validation failed:', (error as Error).message);
    process.exit(1);
  }
}

export { validateCommitMessage, extractTaskId, loadTodoList };