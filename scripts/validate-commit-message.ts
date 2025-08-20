#!/usr/bin/env node

/**
 * Validate commit messages to ensure they contain task IDs from tasks database
 * This enforces traceability between commits and tasks
 */

import * as fs from 'fs';
import { execSync } from 'child_process';

interface Task {
  id: string; // CODEGOAT-001, CODEGOAT-055, etc.
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  taskType: 'story' | 'task';
  executorId?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface CommitMessageConfig {
  requireTaskId: boolean;
  taskIdPatterns: RegExp[]; // Multiple patterns for different formats
  excludePatterns: string[];
  apiBaseUrl: string;
}

const DEFAULT_CONFIG: CommitMessageConfig = {
  requireTaskId: true,
  taskIdPatterns: [
    /\bCODEGOAT-(\d{3})\b/gi, // Primary: CODEGOAT-001, CODEGOAT-042, etc.
    /\bTASK-(\d{3,})\b/gi, // Legacy: TASK-001, TASK-042, etc.
    /\bKANBAN-(\d+)\b/gi, // Legacy: KANBAN-001, etc.
  ],
  excludePatterns: ['^Merge ', '^Revert ', '^Initial commit', '^WIP', '^fixup!', '^squash!'],
  apiBaseUrl: 'http://localhost:3000',
};

/**
 * Load tasks from database via API
 */
async function loadTasksFromAPI(apiBaseUrl: string): Promise<Task[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/tasks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to load tasks from API: ${response.status} ${response.statusText}`);
      return [];
    }

    const result = (await response.json()) as ApiResponse<Task[]>;
    return result.data || [];
  } catch (error) {
    console.warn(`⚠️  Error loading tasks from API:`, (error as Error).message);
    return [];
  }
}

/**
 * Create a new task via API
 */
async function createTask(
  apiBaseUrl: string,
  task: Omit<Task, 'id' | 'startTime' | 'endTime' | 'duration'>
): Promise<Task | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to create task: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = (await response.json()) as ApiResponse<Task>;
    return result.data || null;
  } catch (error) {
    console.warn(`⚠️  Error creating task:`, (error as Error).message);
    return null;
  }
}

/**
 * Update task status via API
 */
async function updateTaskStatus(
  apiBaseUrl: string,
  taskId: string,
  status: Task['status']
): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      console.warn(
        `⚠️  Failed to update task ${taskId}: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const result = (await response.json()) as ApiResponse<Task>;
    return result.success;
  } catch (error) {
    console.warn(`⚠️  Error updating task ${taskId}:`, (error as Error).message);
    return false;
  }
}

/**
 * Extract task ID from commit message
 */
function extractTaskId(message: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[0]; // Return full match like "CODEGOAT-042"
    }
  }
  return null;
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
    /\bfinal\b/i,
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

    // Extract task content from commit message
    let content = `Task ${taskId}`;

    // Try different patterns to extract content
    const patterns = [
      /^CODEGOAT-\d+:\s*(.+)/i, // "CODEGOAT-42: fix bug"
      /^TASK-\d+:\s*(.+)/i, // "TASK-001: implement feature" (legacy)
      /^[A-Z]+-\d+:\s*(.+)/i, // Generic "PREFIX-123: description"
    ];

    for (const pattern of patterns) {
      const contentMatch = commitMessage.match(pattern);
      if (contentMatch) {
        content = contentMatch[1].split('\n')[0].trim();
        break;
      }
    }

    // If no pattern matched, use the first line of the commit message
    if (content === `Task ${taskId}`) {
      const firstLine = commitMessage.split('\n')[0].trim();
      content = firstLine || content;
    }

    const newTask = await createTask(config.apiBaseUrl, {
      content,
      status: 'in_progress',
      priority: 'medium',
      taskType: 'task',
      executorId: 'claude-code',
    });

    if (newTask) {
      console.log(`✅ Created new task [${newTask.id}]: ${newTask.content}`);
      console.log(`   Status: ${newTask.status}, Priority: ${newTask.priority}`);
    } else {
      console.warn('⚠️  Failed to create task, but allowing commit to proceed');
    }
  } else {
    console.log(`✅ Found existing task [${task.id}]: ${task.content.substring(0, 60)}...`);
    console.log(`   Current status: ${task.status}, Priority: ${task.priority}`);

    // Check if this commit indicates task completion
    const isCompletionCommit = isTaskCompletionCommit(commitMessage);

    if (isCompletionCommit && task.status !== 'completed') {
      console.log(`🎉 Commit indicates task completion, marking task [${task.id}] as completed...`);
      const updated = await updateTaskStatus(config.apiBaseUrl, task.id, 'completed');
      if (updated) {
        console.log(`✅ Task [${task.id}] marked as completed`);
      } else {
        console.warn(
          '⚠️  Failed to update task status to completed, but allowing commit to proceed'
        );
      }
    } else if (task.status === 'pending') {
      // If task is pending and not a completion commit, mark it as in_progress
      console.log(`🔄 Marking task [${task.id}] as in_progress...`);
      const updated = await updateTaskStatus(config.apiBaseUrl, task.id, 'in_progress');
      if (updated) {
        console.log(`✅ Task [${task.id}] marked as in_progress`);
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
  const taskId = extractTaskId(commitMessage, config.taskIdPatterns);

  if (!taskId) {
    console.error('❌ Commit message must contain a valid task reference');
    console.error('💡 Supported formats:');
    console.error('   - CODEGOAT-001: implement new feature (recommended)');
    console.error('   - CODEGOAT-123: fix pagination issue');
    console.error('   - TASK-456: update dependencies (legacy)');
    process.exit(1);
  }

  console.log(`📋 Found task reference: ${taskId}`);

  // Load tasks from database
  const tasks = await loadTasksFromAPI(config.apiBaseUrl);
  if (tasks.length === 0) {
    console.log('⚠️  Could not load tasks from database, skipping validation');
    process.exit(0);
  }

  console.log(`📊 Loaded ${tasks.length} tasks from database`);

  await handleTaskOperations(config, taskId, commitMessage, tasks);
  console.log('✅ Commit message validation passed');
}

// Run validation
if (require.main === module) {
  validateCommitMessage()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', (error as Error).message);
      process.exit(1);
    });
}

export {
  validateCommitMessage,
  extractTaskId,
  loadTasksFromAPI,
  createTask,
  updateTaskStatus,
  isTaskCompletionCommit,
};
