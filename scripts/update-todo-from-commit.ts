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

/**
 * Load tasks from database via API
 */
async function loadTasksFromDatabase(): Promise<TodoItem[]> {
  try {
    const response = await fetch(TASKS_ENDPOINT, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
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
    console.log(`✅ Updated todo-list.json`);
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

  if (durationMs < 0) return 'Invalid duration';

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
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
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.warn(
        `⚠️ Failed to update task ${taskId} in database: ${response.status} ${response.statusText}`
      );
      return false;
    }

    console.log(`✅ Updated task ${taskId} in database`);
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
      signal: AbortSignal.timeout(2000), // 2 second timeout
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
      endDate.setHours(endDate.getHours() - 1);
      updates.startTime = endDate.toISOString();
    }
  }

  // Calculate duration
  if (updates.startTime && updates.endTime) {
    updates.duration = calculateDuration(updates.startTime, updates.endTime);
  }

  console.log(`✅ Marking task ${taskId} as completed`);
  console.log(`   Content: ${task.content.substring(0, 60)}...`);
  console.log(`   Duration: ${updates.duration || 'Unknown'}`);

  // Update via API if available, otherwise update local file
  if (apiAvailable) {
    console.log(`🔄 Updating task ${taskId} in database...`);
    const dbUpdateSuccess = await updateTaskInDatabase(taskId, updates);

    if (dbUpdateSuccess) {
      console.log(`✅ Task ${taskId} completed successfully in database`);
    } else {
      console.warn(`⚠️  Failed to update task ${taskId} in database, falling back to local file`);
      // Fallback to local file update
      Object.assign(task, updates);
      const todoListPath = path.join(process.cwd(), 'todo-list.json');
      saveTodoList(todoListPath, todos);
    }
  } else {
    console.log(`📝 Updating task ${taskId} in local todo-list.json...`);
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
    console.log('🔄 Loading tasks from database...');
    todos = await loadTasksFromDatabase();
    console.log(`📋 Loaded ${todos.length} tasks from database`);
  } else {
    console.warn('⚠️  API server not available, falling back to local todo-list.json');
    const todoListPath = path.join(process.cwd(), 'todo-list.json');
    todos = loadTodoList(todoListPath);
  }

  if (todos.length === 0) {
    console.log('⚠️  No todos found');
    return;
  }

  const commit = getCommitInfo(commitRef);
  console.log(`🔍 Processing commit: ${commit.hash.substring(0, 7)}`);
  console.log(`📝 Message: ${commit.message.split('\n')[0]}`);

  // Check if commit has CODEGOAT prefix
  const codegoatTaskId = extractTaskId(commit.message, CODEGOAT_PATTERN);

  if (codegoatTaskId) {
    console.log(`🐐 Found CODEGOAT task reference: ${codegoatTaskId}`);
    await processTaskCompletion(todos, commit, codegoatTaskId, apiAvailable);
  } else {
    console.log(`ℹ️  No CODEGOAT prefix found, task remains unchanged`);
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
