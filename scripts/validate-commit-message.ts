#!/usr/bin/env node

/**
 * Validate commit messages to ensure they contain task IDs from tasks database
 * This enforces traceability between commits and tasks
 */

import * as fs from 'fs';
import { execSync } from 'child_process';

interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  assignee_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface CommitMessageConfig {
  requireTaskId: boolean;
  taskIdPattern: RegExp;
  excludePatterns: string[];
  apiBaseUrl: string;
}

const DEFAULT_CONFIG: CommitMessageConfig = {
  requireTaskId: true,
  taskIdPattern: /^CODEGOAT-(\d+):/i,
  excludePatterns: [
    '^Merge ',
    '^Revert ',
    '^Initial commit',
    '^WIP',
    '^fixup!',
    '^squash!'
  ],
  apiBaseUrl: 'http://localhost:3000'
};

/**
 * Load tasks from database via API
 */
async function loadTasksFromAPI(apiBaseUrl: string): Promise<Task[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/tasks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to load tasks from API: ${response.status} ${response.statusText}`);
      return [];
    }

    const tasks = await response.json();
    return Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    console.warn(`⚠️  Error loading tasks from API:`, (error as Error).message);
    return [];
  }
}

/**
 * Create a new task via API
 */
async function createTask(apiBaseUrl: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to create task: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as Task;
  } catch (error) {
    console.warn(`⚠️  Error creating task:`, (error as Error).message);
    return null;
  }
}

/**
 * Update task status via API
 */
async function updateTaskStatus(apiBaseUrl: string, taskId: string, status: Task['status']): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to update task ${taskId}: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`⚠️  Error updating task ${taskId}:`, (error as Error).message);
    return false;
  }
}

function extractTaskId(message: string, pattern: RegExp): string | null {
  const match = message.match(pattern);
  return match ? match[1] : null;
}

function isExcludedMessage(message: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => new RegExp(pattern).test(message));
}

/**
 * Detect if commit message indicates task completion
 */
function isTaskCompletionCommit(message: string): boolean {
  const completionIndicators = [
    /\bcomplete[ds]?\b/i,
    /\bfinish(ed)?\b/i,
    /\bdone\b/i,
    /\bfix(ed)?\b/i,
    /\bresolved?\b/i,
    /\bimplement(ed)?\b/i,
    /\badd(ed)?\b/i,
    /\bclos(ed|e)\b/i,
    /\bdelivered?\b/i,
    /\bready\b/i,
    /\bfinal\b/i
  ];
  
  return completionIndicators.some(pattern => pattern.test(message));
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
  } catch {
    console.error('❌ Failed to get commit message');
    process.exit(1);
  }
}

/**
 * Handle task creation or status updates
 */
async function handleTaskOperations(
  config: CommitMessageConfig,
  taskId: string,
  commitMessage: string,
  tasks: Task[]
): Promise<void> {
  const task = tasks.find(t => t.id === taskId);
  
  if (!task) {
    // Task doesn't exist, create it as in_progress
    console.log(`📝 Task ${taskId} not found, creating new task...`);
    
    // Extract task content from commit message (everything after the colon)
    const contentMatch = commitMessage.match(/^CODEGOAT-\d+:\s*(.+)/i);
    const content = contentMatch ? contentMatch[1].split('\n')[0].trim() : `Task ${taskId}`;
    
    const newTask = await createTask(config.apiBaseUrl, {
      content,
      status: 'in_progress',
      priority: 'medium',
      assignee_id: 'claude'
    });
    
    if (newTask) {
      console.log(`✅ Created new task: ${newTask.content}`);
      console.log(`   Status: ${newTask.status}, Priority: ${newTask.priority}`);
    } else {
      console.warn('⚠️  Failed to create task, but allowing commit to proceed');
    }
  } else {
    console.log(`✅ Found existing task: ${task.content.substring(0, 60)}...`);
    console.log(`   Current status: ${task.status}, Priority: ${task.priority}`);
    
    // Check if this commit indicates task completion
    const isCompletionCommit = isTaskCompletionCommit(commitMessage);
    
    if (isCompletionCommit && task.status !== 'completed') {
      console.log(`🎉 Commit indicates task completion, marking task ${taskId} as completed...`);
      const updated = await updateTaskStatus(config.apiBaseUrl, taskId, 'completed');
      if (updated) {
        console.log(`✅ Task ${taskId} marked as completed`);
      } else {
        console.warn('⚠️  Failed to update task status to completed, but allowing commit to proceed');
      }
    } else if (task.status === 'pending') {
      // If task is pending and not a completion commit, mark it as in_progress
      console.log(`🔄 Marking task ${taskId} as in_progress...`);
      const updated = await updateTaskStatus(config.apiBaseUrl, taskId, 'in_progress');
      if (updated) {
        console.log(`✅ Task ${taskId} marked as in_progress`);
      } else {
        console.warn('⚠️  Failed to update task status, but allowing commit to proceed');
      }
    }
  }
}

async function validateCommitMessage(): Promise<void> {
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
    console.error('❌ Commit message must follow CODEGOAT-{id}: format');
    console.error('💡 Example formats:');
    console.error('   - CODEGOAT-123: implement new feature');
    console.error('   - CODEGOAT-456: fix pagination issue');
    console.error('   - CODEGOAT-789: update dependencies');
    process.exit(1);
  }
  
  console.log(`📋 Found task reference: ${taskId}`);
  
  // Load tasks from database
  const tasks = await loadTasksFromAPI(config.apiBaseUrl);
  if (tasks.length === 0) {
    console.log('⚠️  Could not load tasks from database, skipping validation');
    process.exit(0);
  }
  
  await handleTaskOperations(config, taskId, commitMessage, tasks);
  console.log('✅ Commit message validation passed');
}

// Run validation
if (require.main === module) {
  validateCommitMessage()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', (error as Error).message);
      process.exit(1);
    });
}

export { validateCommitMessage, extractTaskId, loadTasksFromAPI, createTask, updateTaskStatus, isTaskCompletionCommit };