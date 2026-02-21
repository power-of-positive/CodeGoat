#!/usr/bin/env node

/**
 * Validate commit messages to ensure they contain task IDs from tasks database
 * This enforces traceability between commits and tasks
 */

import * as fs from 'fs';
import { execSync } from 'child_process';

// Constants
const TASK_CONTENT_DISPLAY_LENGTH = 60;

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
  excludePatterns: ['^Revert ', '^Initial commit', '^WIP', '^fixup!', '^squash!'],
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

/**
 * Detect if commit message is a merge commit
 */
function isMergeCommit(message: string): boolean {
  return /^Merge\s+(branch|pull\s+request|remote-tracking\s+branch)/i.test(message);
}

/**
 * Extract task ID from merge commit message
 * Handles formats like:
 * - "Merge branch 'CODEGOAT-042-feature-name'"
 * - "Merge pull request #123 from user/CODEGOAT-042-fix"
 * - Regular task ID patterns in merge message
 */
function extractTaskIdFromMerge(message: string, patterns: RegExp[]): string | null {
  // First try to extract from branch name in merge message
  const branchPatterns = [
    /Merge\s+branch\s+'([^']+)'/i,
    /Merge\s+branch\s+"([^"]+)"/i,
    /Merge\s+pull\s+request\s+#\d+\s+from\s+[^\/]+\/(.+)/i,
  ];

  for (const branchPattern of branchPatterns) {
    const branchMatch = message.match(branchPattern);
    if (branchMatch && branchMatch[1]) {
      const branchName = branchMatch[1];
      // Try to extract task ID from branch name
      const taskId = extractTaskId(branchName, patterns);
      if (taskId) {
        return taskId;
      }
    }
  }

  // Fallback to regular task ID extraction from entire message
  return extractTaskId(message, patterns);
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
 * Extract task content from commit message using various patterns
 */
function extractTaskContent(taskId: string, commitMessage: string): string {
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

  return content;
}

/**
 * Check if we should enforce strict task validation
 * Can be disabled via environment variable for flexibility
 */
function shouldEnforceTaskValidation(): boolean {
  return process.env.SKIP_TASK_VALIDATION !== 'true';
}

/**
 * Create a new task when it doesn't exist
 */
async function handleNewTask(
  config: CommitMessageConfig,
  taskId: string,
  commitMessage: string
): Promise<void> {
  if (shouldEnforceTaskValidation()) {
    console.error(`❌ Task ${taskId} does not exist in the database`);
    console.error(`💡 Please create the task first or use an existing task ID`);
    console.error(`💡 To bypass this check, set SKIP_TASK_VALIDATION=true`);
    process.exit(1);
  }

  console.error(`📝 Task ${taskId} not found, creating new task...`);

  const content = extractTaskContent(taskId, commitMessage);

  const newTask = await createTask(config.apiBaseUrl, {
    content,
    status: 'in_progress',
    priority: 'medium',
    taskType: 'task',
    executorId: 'claude-code',
  });

  if (newTask) {
    console.error(`✅ Created new task [${newTask.id}]: ${newTask.content}`);
    console.error(`   Status: ${newTask.status}, Priority: ${newTask.priority}`);
  } else {
    console.warn('⚠️  Failed to create task, but allowing commit to proceed');
  }
}

/**
 * Handle merge commit - automatically mark task as completed
 */
async function handleMergeCommit(
  config: CommitMessageConfig,
  task: Task,
  commitMessage: string
): Promise<void> {
  console.error(
    `🔀 Merge commit detected for task [${task.id}]: ${task.content.substring(0, TASK_CONTENT_DISPLAY_LENGTH)}...`
  );
  console.error(`   Current status: ${task.status}, Priority: ${task.priority}`);

  if (task.status === 'completed') {
    console.error(`✅ Task [${task.id}] is already completed`);
    return;
  }

  // Merge commits automatically mark tasks as completed
  console.error(`🎉 Successful merge detected, marking task [${task.id}] as completed...`);
  const updated = await updateTaskStatus(config.apiBaseUrl, task.id, 'completed');
  if (updated) {
    console.error(`✅ Task [${task.id}] marked as completed after successful merge`);
  } else {
    console.error('❌ Failed to update task status to completed');
    console.error('💡 Task must be marked as completed before merge can proceed');
    process.exit(1);
  }
}

/**
 * Handle existing task status updates
 */
async function handleExistingTask(
  config: CommitMessageConfig,
  task: Task,
  commitMessage: string,
  isMerge: boolean = false
): Promise<void> {
  // If this is a merge commit, handle it specially
  if (isMerge) {
    await handleMergeCommit(config, task, commitMessage);
    return;
  }

  console.error(
    `✅ Found existing task [${task.id}]: ${task.content.substring(0, TASK_CONTENT_DISPLAY_LENGTH)}...`
  );
  console.error(`   Current status: ${task.status}, Priority: ${task.priority}`);

  // Check if this commit indicates task completion
  const isCompletionCommit = isTaskCompletionCommit(commitMessage);

  if (isCompletionCommit && task.status !== 'completed') {
    console.error(`🎉 Commit indicates task completion, marking task [${task.id}] as completed...`);
    const updated = await updateTaskStatus(config.apiBaseUrl, task.id, 'completed');
    if (updated) {
      console.error(`✅ Task [${task.id}] marked as completed`);
    } else {
      console.warn('⚠️  Failed to update task status to completed, but allowing commit to proceed');
    }
  } else if (task.status === 'pending') {
    // If task is pending and not a completion commit, mark it as in_progress
    console.error(`🔄 Marking task [${task.id}] as in_progress...`);
    const updated = await updateTaskStatus(config.apiBaseUrl, task.id, 'in_progress');
    if (updated) {
      console.error(`✅ Task [${task.id}] marked as in_progress`);
    } else {
      console.warn('⚠️  Failed to update task status, but allowing commit to proceed');
    }
  }
}

/**
 * Handle task creation or status updates (simplified main function)
 */
async function handleTaskOperations(
  config: CommitMessageConfig,
  taskId: string,
  commitMessage: string,
  tasks: Task[],
  isMerge: boolean = false
): Promise<void> {
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    // For merge commits, task MUST exist
    if (isMerge) {
      console.error(`❌ Task ${taskId} does not exist in the database`);
      console.error(`💡 Cannot merge without an existing task - please create the task first`);
      process.exit(1);
    }
    await handleNewTask(config, taskId, commitMessage);
  } else {
    await handleExistingTask(config, task, commitMessage, isMerge);
  }
}

async function validateCommitMessage(): Promise<void> {
  const config = DEFAULT_CONFIG;
  const commitMessage = getCommitMessage();

  console.error('🔍 Validating commit message...');
  console.error(`📝 Message: ${commitMessage.split('\n')[0]}`); // First line only

  // Check if message is excluded
  if (isExcludedMessage(commitMessage, config.excludePatterns)) {
    console.error('✅ Commit message is excluded from validation');
    process.exit(0);
  }

  // Detect if this is a merge commit
  const isMerge = isMergeCommit(commitMessage);
  if (isMerge) {
    console.error('🔀 Merge commit detected');
  }

  // Extract task ID (use special extraction for merge commits)
  const taskId = isMerge
    ? extractTaskIdFromMerge(commitMessage, config.taskIdPatterns)
    : extractTaskId(commitMessage, config.taskIdPatterns);

  if (!taskId) {
    if (isMerge) {
      console.error('❌ Merge commit must contain a valid task reference in branch name or message');
      console.error('💡 Supported formats:');
      console.error('   - Merge branch "CODEGOAT-001-feature-name"');
      console.error('   - Merge pull request #123 from user/CODEGOAT-042-fix');
      console.error('   - Branch names containing CODEGOAT-XXX, TASK-XXX, or KANBAN-XXX');
    } else {
      console.error('❌ Commit message must contain a valid task reference');
      console.error('💡 Supported formats:');
      console.error('   - CODEGOAT-001: implement new feature (recommended)');
      console.error('   - CODEGOAT-123: fix pagination issue');
      console.error('   - TASK-456: update dependencies (legacy)');
    }
    process.exit(1);
  }

  console.error(`📋 Found task reference: ${taskId}`);

  // Load tasks from database
  const tasks = await loadTasksFromAPI(config.apiBaseUrl);
  if (tasks.length === 0) {
    console.error('⚠️  Could not load tasks from database, skipping validation');
    process.exit(0);
  }

  console.error(`📊 Loaded ${tasks.length} tasks from database`);

  await handleTaskOperations(config, taskId, commitMessage, tasks, isMerge);
  console.error('✅ Commit message validation passed');
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
  extractTaskIdFromMerge,
  isMergeCommit,
  loadTasksFromAPI,
  createTask,
  updateTaskStatus,
  isTaskCompletionCommit,
  handleMergeCommit,
};
