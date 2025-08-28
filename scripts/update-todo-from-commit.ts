#!/usr/bin/env node

/**
 * Update todo-list.json based on commit messages
 * Automatically marks tasks as completed and tracks timing when commits contain "codegoat" prefix
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
  assignee_id?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
}

interface CommitInfo {
  hash: string;
  message: string;
  timestamp: string;
  author: string;
}

// Pattern to match CODEGOAT-{id}: prefix and extract task ID
const CODEGOAT_PATTERN = /^CODEGOAT-(\d+):/i;

// API configuration
const API_BASE_URL = 'http://localhost:3001/api';
const TASKS_ENDPOINT = `${API_BASE_URL}/tasks`;

// Timeout constants (in milliseconds)
const API_TIMEOUT_MS = 5000; // 5 second timeout for API requests
const HEALTH_CHECK_TIMEOUT_MS = 2000; // 2 second timeout for health checks

// Time constants
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DEFAULT_TASK_DURATION_HOURS = 1; // Default assumption for task duration when start time unknown
const CONTENT_PREVIEW_LENGTH = 60; // Characters to show in task content preview
const COMMIT_HASH_PREFIX_LENGTH = 7; // Length of commit hash to show in log

/**
 * Load tasks from database via API
 */
async function loadTasksFromDatabase(): Promise<TodoItem[]> {
  try {
    const response = await fetch(TASKS_ENDPOINT, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(
        `⚠️ Failed to load tasks from database: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const tasks = await response.json();
    return Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    console.warn(`⚠️ Error loading tasks from database:`, (error as Error).message);
    return [];
  }
}

function loadTodoList(todoListPath: string): TodoItem[] {
  try {
    const content = fs.readFileSync(todoListPath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    console.error(`❌ Could not load todo list from ${todoListPath}`);
    return [];
  }
}

function saveTodoList(todoListPath: string, todos: TodoItem[]): void {
  try {
    fs.writeFileSync(todoListPath, JSON.stringify(todos, null, 2) + '\n', 'utf-8');
    console.error(`✅ Updated todo-list.json`);
  } catch (error) {
    console.error(`❌ Failed to save todo list: ${(error as Error).message}`);
    throw error;
  }
}

function getCommitInfo(commitRef: string = 'HEAD'): CommitInfo {
  try {
    const hash = execSync(`git rev-parse ${commitRef}`, { encoding: 'utf-8' }).trim();
    const message = execSync(`git log -1 --pretty=%B ${commitRef}`, { encoding: 'utf-8' }).trim();
    const timestamp = execSync(`git log -1 --pretty=%aI ${commitRef}`, {
      encoding: 'utf-8',
    }).trim();
    const author = execSync(`git log -1 --pretty=%an ${commitRef}`, { encoding: 'utf-8' }).trim();

    return { hash, message, timestamp, author };
  } catch (error) {
    console.error(`❌ Failed to get commit info: ${(error as Error).message}`);
    throw error;
  }
}

function extractTaskId(message: string, pattern: RegExp): string | null {
  const match = message.match(pattern);
  return match ? match[1] : null;
}

function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationMs = end - start;

  if (durationMs < 0) {
    return 'Invalid duration';
  }

  const seconds = Math.floor(durationMs / MILLISECONDS_PER_SECOND);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const days = Math.floor(hours / HOURS_PER_DAY);

  if (days > 0) {
    return `${days}d ${hours % HOURS_PER_DAY}h ${minutes % MINUTES_PER_HOUR}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % MINUTES_PER_HOUR}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % SECONDS_PER_MINUTE}s`;
  } else {
    return `${seconds}s`;
  }
}

function findTaskStartTime(taskId: string): string | null {
  try {
    // Search git log for when task was first referenced (any commit mentioning the task)
    const logOutput = execSync(
      `git log --grep="task.*#?${taskId}" --grep="#${taskId}" --pretty="%aI" --reverse`,
      { encoding: 'utf-8' }
    ).trim();

    const timestamps = logOutput.split('\n').filter(Boolean);
    return timestamps.length > 0 ? timestamps[0] : null;
  } catch {
    return null;
  }
}

/**
 * Update task status in database via API
 */
async function updateTaskInDatabase(taskId: string, updates: Partial<TodoItem>): Promise<boolean> {
  try {
    const response = await fetch(`${TASKS_ENDPOINT}/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(
        `⚠️ Failed to update task ${taskId} in database: ${response.status} ${response.statusText}`
      );
      return false;
    }

    console.error(`✅ Updated task ${taskId} in database`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Error updating task ${taskId} in database:`, (error as Error).message);
    return false;
  }
}

/**
 * Check if API server is available
 */
async function isApiServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Process task completion based on commit message
 */
async function processTaskCompletion(
  todos: TodoItem[],
  commit: CommitInfo,
  taskId: string,
  apiAvailable: boolean
): Promise<void> {
  const task = todos.find(t => t.id === taskId);
  if (!task) {
    console.error(`❌ Task ${taskId} not found`);
    return;
  }

  // Prepare task updates
  const updates: Partial<TodoItem> = {
    status: 'completed',
    endTime: commit.timestamp,
  };

  // Try to find start time
  if (!task.startTime) {
    const startTime = findTaskStartTime(taskId);
    if (startTime) {
      updates.startTime = startTime;
    } else {
      // Use a reasonable default (1 hour before completion)
      const endDate = new Date(commit.timestamp);
      endDate.setHours(endDate.getHours() - DEFAULT_TASK_DURATION_HOURS);
      updates.startTime = endDate.toISOString();
    }
  }

  // Calculate duration
  if (updates.startTime && updates.endTime) {
    updates.duration = calculateDuration(updates.startTime, updates.endTime);
  }

  console.error(`✅ Marking task ${taskId} as completed`);
  console.error(`   Content: ${task.content.substring(0, CONTENT_PREVIEW_LENGTH)}...`);
  console.error(`   Duration: ${updates.duration || 'Unknown'}`);

  // Update via API if available, otherwise update local file
  if (apiAvailable) {
    console.error(`🔄 Updating task ${taskId} in database...`);
    const dbUpdateSuccess = await updateTaskInDatabase(taskId, updates);

    if (dbUpdateSuccess) {
      console.error(`✅ Task ${taskId} completed successfully in database`);
    } else {
      console.warn(`⚠️  Failed to update task ${taskId} in database, falling back to local file`);
      // Fallback to local file update
      Object.assign(task, updates);
      const todoListPath = path.join(process.cwd(), 'todo-list.json');
      saveTodoList(todoListPath, todos);
    }
  } else {
    console.error(`📝 Updating task ${taskId} in local todo-list.json...`);
    Object.assign(task, updates);
    const todoListPath = path.join(process.cwd(), 'todo-list.json');
    saveTodoList(todoListPath, todos);
  }
}

async function updateTaskFromCommit(commitRef: string = 'HEAD'): Promise<void> {
  // First check if API is available
  const apiAvailable = await isApiServerAvailable();
  let todos: TodoItem[] = [];

  if (apiAvailable) {
    console.error('🔄 Loading tasks from database...');
    todos = await loadTasksFromDatabase();
    console.error(`📋 Loaded ${todos.length} tasks from database`);
  } else {
    console.warn('⚠️  API server not available, falling back to local todo-list.json');
    const todoListPath = path.join(process.cwd(), 'todo-list.json');
    todos = loadTodoList(todoListPath);
  }

  if (todos.length === 0) {
    console.error('⚠️  No todos found');
    return;
  }

  const commit = getCommitInfo(commitRef);
  console.error(`🔍 Processing commit: ${commit.hash.substring(0, COMMIT_HASH_PREFIX_LENGTH)}`);
  console.error(`📝 Message: ${commit.message.split('\n')[0]}`);

  // Check if commit has CODEGOAT prefix
  const codegoatTaskId = extractTaskId(commit.message, CODEGOAT_PATTERN);

  if (codegoatTaskId) {
    console.error(`🐐 Found CODEGOAT task reference: ${codegoatTaskId}`);
    await processTaskCompletion(todos, commit, codegoatTaskId, apiAvailable);
  } else {
    console.error(`ℹ️  No CODEGOAT prefix found, task remains unchanged`);
  }
}

// Support running as a git hook or standalone
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const commitRef = args[0] || 'HEAD';

  try {
    await updateTaskFromCommit(commitRef);
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    // Don't exit with error code to avoid blocking commits
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { updateTaskFromCommit, calculateDuration, extractTaskId };
