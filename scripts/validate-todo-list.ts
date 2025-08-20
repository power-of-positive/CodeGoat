#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

// Todo list item interface
interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string; // CODEGOAT-001, CODEGOAT-055, etc.
}

// Configuration interface
interface ValidationConfig {
  maxUnfinishedTasks: number;
  allowedInProgressTasks: number;
  failOnExcess: boolean;
  onlyFailOnHighPriority: boolean;
}

const DEFAULT_CONFIG: ValidationConfig = {
  maxUnfinishedTasks: 0, // No unfinished tasks allowed
  allowedInProgressTasks: 1, // Allow one in-progress task
  failOnExcess: true, // Actually fail to block stopping
  onlyFailOnHighPriority: false, // Fail on any unfinished tasks (blocks Claude Code until ALL tasks done)
};

// Define possible todo list file paths (prioritize todo-list.json)
const TODO_LIST_FILES = [
  path.join(process.cwd(), 'todo-list.json'),
  path.join(process.cwd(), '.claude_todo.json'),
  path.join(process.cwd(), 'TODO-Kanban-Implementation.md'),
];

// API configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TASKS_ENDPOINT = `${API_BASE_URL}/tasks`;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

/**
 * Load validation configuration
 */
function loadValidationConfig(): ValidationConfig {
  const configPath = path.join(process.cwd(), 'todo-validation-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...configData };
    } catch {
      console.warn(
        `${colors.yellow}⚠️  Failed to load validation config, using defaults${colors.reset}`
      );
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

/**
 * Check if the server is running
 */
async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch tasks from the API
 */
async function fetchTasksFromAPI(): Promise<TodoItem[]> {
  try {
    console.log(`${colors.blue}🌐 Fetching tasks from API...${colors.reset}`);

    const response = await fetch(TASKS_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const apiResponse = (await response.json()) as
      | { success?: boolean; data?: TodoItem[] }
      | TodoItem[];

    // Handle wrapped API response format
    let tasks: TodoItem[];
    if (
      typeof apiResponse === 'object' &&
      'success' in apiResponse &&
      apiResponse.success &&
      Array.isArray(apiResponse.data)
    ) {
      tasks = apiResponse.data;
    } else if (Array.isArray(apiResponse)) {
      tasks = apiResponse;
    } else {
      throw new Error('Invalid API response: expected array of tasks or {success: true, data: []}');
    }

    console.log(
      `${colors.green}✅ Successfully fetched ${tasks.length} tasks from API${colors.reset}`
    );
    return tasks;
  } catch (error) {
    console.error(`${colors.red}❌ Failed to fetch tasks from API: ${error}${colors.reset}`);
    throw error;
  }
}

/**
 * Parse todo list from JSON format
 */
function parseTodoListFromJSON(filePath: string): TodoItem[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Handle different JSON formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.todos && Array.isArray(data.todos)) {
      return data.todos;
    } else {
      console.error(`${colors.red}Invalid JSON format in ${filePath}${colors.reset}`);
      return [];
    }
  } catch (error) {
    console.error(`${colors.red}Error parsing JSON todo list: ${error}${colors.reset}`);
    return [];
  }
}

/**
 * Parse the TODO markdown file and extract todo items
 */
function parseTodoListFromMarkdown(filePath: string): TodoItem[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const todoItems: TodoItem[] = [];

    // Regular expression to match todo items in markdown
    // Matches patterns like: "### KANBAN-001: Database Schema Implementation"
    // followed by "**Priority**: High" and checkboxes
    const taskRegex = /### (KANBAN-\d+): (.+?)\n\*\*Priority\*\*: (High|Medium|Low)/gi;
    const matches = content.matchAll(taskRegex);

    for (const match of matches) {
      const [, taskId, taskTitle, priority] = match;

      // Extract the section content for this task
      const taskStartIndex = match.index!;
      const nextTaskMatch = content
        .substring(taskStartIndex + match[0].length)
        .search(/### KANBAN-\d+:/);
      const taskEndIndex =
        nextTaskMatch === -1 ? content.length : taskStartIndex + match[0].length + nextTaskMatch;

      const taskSection = content.substring(taskStartIndex, taskEndIndex);

      // Count completed and total checkboxes
      const completedCheckboxes = (taskSection.match(/- \[x\]/gi) || []).length;
      const totalCheckboxes = (taskSection.match(/- \[[x\s]\]/gi) || []).length;

      // Determine status based on completion
      let status: TodoItem['status'] = 'pending';
      if (completedCheckboxes === totalCheckboxes && totalCheckboxes > 0) {
        status = 'completed';
      } else if (completedCheckboxes > 0) {
        status = 'in_progress';
      }

      todoItems.push({
        id: taskId.toLowerCase(),
        content: taskTitle.trim(),
        status,
        priority: priority.toLowerCase() as 'high' | 'medium' | 'low',
      });
    }

    return todoItems;
  } catch (error) {
    console.error(`${colors.red}Error reading todo list file: ${error}${colors.reset}`);
    return [];
  }
}

/**
 * Validate the todo list format and structure
 */
function validateTodoListFormat(todos: TodoItem[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if we have any todos
  if (todos.length === 0) {
    errors.push('No todo items found in the todo list');
    return { valid: false, errors };
  }

  // Validate each todo item
  todos.forEach((todo, index) => {
    // Check required fields
    if (!todo.id || todo.id.trim().length === 0) {
      errors.push(`Todo item ${index + 1}: Missing or empty ID`);
    }

    if (!todo.content || todo.content.trim().length === 0) {
      errors.push(`Todo item ${index + 1}: Missing content`);
    }

    if (!['pending', 'in_progress', 'completed'].includes(todo.status)) {
      errors.push(`Todo item ${index + 1}: Invalid status (${todo.status})`);
    }

    if (!['high', 'medium', 'low'].includes(todo.priority)) {
      errors.push(`Todo item ${index + 1}: Invalid priority (${todo.priority})`);
    }
  });

  // Check for duplicate IDs
  const ids = todos.map(t => t.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate todo IDs found: ${duplicateIds.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get the next todo item to work on
 */
function getNextTodoItem(todos: TodoItem[]): TodoItem | null {
  // Priority order: high -> medium -> low
  // Status priority: in_progress -> pending (skip completed)
  const priorityOrder = ['high', 'medium', 'low'] as const;

  for (const priority of priorityOrder) {
    // First check for in_progress items of this priority
    const inProgressItem = todos.find(
      todo => todo.priority === priority && todo.status === 'in_progress'
    );
    if (inProgressItem) {
      return inProgressItem;
    }

    // Then check for pending items of this priority
    const pendingItem = todos.find(todo => todo.priority === priority && todo.status === 'pending');
    if (pendingItem) {
      return pendingItem;
    }
  }

  return null; // All tasks completed!
}

/**
 * Auto-assign the next pending task to in_progress via API
 */
async function autoAssignNextPendingTask(
  todos: TodoItem[]
): Promise<{ success: boolean; assignedTask?: TodoItem; error?: string }> {
  try {
    // Check if there's already a task in progress
    const inProgressTasks = todos.filter(task => task.status === 'in_progress');
    if (inProgressTasks.length > 0) {
      console.log(
        `${colors.blue}ℹ️  Task already in progress: ${inProgressTasks[0].content}${colors.reset}`
      );
      return { success: true, assignedTask: inProgressTasks[0] };
    }

    // Find the next pending task by priority
    const nextTask = getNextTodoItem(todos.filter(task => task.status === 'pending'));
    if (!nextTask) {
      console.log(`${colors.green}✅ No pending tasks to assign${colors.reset}`);
      return { success: true };
    }

    console.log(
      `${colors.yellow}🔄 Auto-assigning pending task [${nextTask.id}] to in_progress: ${nextTask.content}${colors.reset}`
    );

    // Update the task status via API
    const response = await fetch(`${TASKS_ENDPOINT}/${nextTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'in_progress',
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Failed to update task status: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { success: boolean; data: TodoItem };
    if (!result.success) {
      throw new Error('API returned success: false');
    }

    console.log(
      `${colors.green}✅ Successfully assigned task [${result.data.id}] to in_progress: ${result.data.content}${colors.reset}`
    );
    return { success: true, assignedTask: result.data };
  } catch (error) {
    const errorMessage = `Failed to auto-assign pending task: ${error}`;
    console.error(`${colors.red}❌ ${errorMessage}${colors.reset}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Display project statistics
 */
function displayStatistics(todos: TodoItem[]): void {
  const totalTasks = todos.length;
  const completedTasks = todos.filter(t => t.status === 'completed').length;
  const inProgressTasks = todos.filter(t => t.status === 'in_progress').length;
  const pendingTasks = todos.filter(t => t.status === 'pending').length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  console.log(`\n${colors.bold}${colors.blue}📊 Project Statistics:${colors.reset}`);
  console.log(`${colors.green}✅ Completed: ${completedTasks}${colors.reset}`);
  console.log(`${colors.yellow}🔄 In Progress: ${inProgressTasks}${colors.reset}`);
  console.log(`${colors.blue}📋 Pending: ${pendingTasks}${colors.reset}`);
  console.log(
    `${colors.bold}📈 Progress: ${completionPercentage}% (${completedTasks}/${totalTasks})${colors.reset}`
  );
}

/**
 * Find and parse todo list from available sources (API first, then files)
 */
async function findAndParseTodoList(): Promise<{ todos: TodoItem[]; source: string }> {
  // First try to fetch from API
  if (await isServerRunning()) {
    try {
      const todos = await fetchTasksFromAPI();
      if (todos.length > 0) {
        return { todos, source: 'API' };
      }
    } catch {
      console.warn(
        `${colors.yellow}⚠️  API fetch failed, falling back to file-based parsing${colors.reset}`
      );
    }
  } else {
    console.log(`${colors.yellow}⚠️  Server not running, using file-based parsing${colors.reset}`);
  }

  // Fall back to file-based parsing
  for (const filePath of TODO_LIST_FILES) {
    if (fs.existsSync(filePath)) {
      console.log(`${colors.blue}📖 Found todo list: ${path.basename(filePath)}${colors.reset}`);

      let todos: TodoItem[] = [];
      if (filePath.endsWith('.json')) {
        todos = parseTodoListFromJSON(filePath);
      } else if (filePath.endsWith('.md')) {
        todos = parseTodoListFromMarkdown(filePath);
      }

      if (todos.length > 0) {
        return { todos, source: path.basename(filePath) };
      }
    }
  }

  return { todos: [], source: 'none' };
}

function performBasicValidation(todos: TodoItem[], source: string): number {
  if (source === 'none') {
    console.error(`${colors.red}❌ No todo list source found. Tried:${colors.reset}`);
    console.error(`${colors.red}   • API: ${TASKS_ENDPOINT}${colors.reset}`);
    TODO_LIST_FILES.forEach(file => {
      console.error(`${colors.red}   • File: ${path.basename(file)}${colors.reset}`);
    });
    return 1;
  }

  if (todos.length === 0) {
    console.error(`${colors.red}❌ No valid todo items found from ${source}${colors.reset}`);
    return 1;
  }

  return 0;
}

function validateFormat(todos: TodoItem[]): number {
  console.log(`${colors.blue}🔍 Validating todo list format...${colors.reset}`);
  const validation = validateTodoListFormat(todos);

  if (!validation.valid) {
    console.error(`${colors.red}❌ Todo list validation failed:${colors.reset}`);
    validation.errors.forEach(error => {
      console.error(`${colors.red}   • ${error}${colors.reset}`);
    });
    return 1;
  }

  console.log(`${colors.green}✅ Todo list format is valid${colors.reset}`);
  return 0;
}

async function handleAutoAssignment(todos: TodoItem[]): Promise<boolean> {
  if (!(await isServerRunning())) {
    return true;
  }

  const assignmentResult = await autoAssignNextPendingTask(todos);
  if (!assignmentResult.success) {
    console.error(
      `${colors.red}❌ Failed to auto-assign pending task: ${assignmentResult.error}${colors.reset}`
    );
    return false;
  }

  // Update local state for validation logic
  if (assignmentResult.assignedTask) {
    const taskIndex = todos.findIndex(t => t.id === assignmentResult.assignedTask!.id);
    if (taskIndex >= 0) {
      todos[taskIndex].status = 'in_progress';
    }
  }

  return true;
}

function determineValidationFailure(
  todos: TodoItem[],
  config: ValidationConfig
): { shouldFail: boolean; hasUnfinishedTasks: boolean } {
  const pendingTasks = todos.filter(todo => todo.status === 'pending');
  const inProgressTasks = todos.filter(todo => todo.status === 'in_progress');
  const unfinishedTasks = [...pendingTasks, ...inProgressTasks];

  let shouldFail = false;
  let hasUnfinishedTasks = false;

  if (config.onlyFailOnHighPriority) {
    const highPriorityUnfinished = unfinishedTasks.filter(task => task.priority === 'high');
    if (highPriorityUnfinished.length > 0) {
      shouldFail = config.failOnExcess;
      hasUnfinishedTasks = true;
    }
  } else {
    // Always block if there are ANY unfinished tasks
    if (pendingTasks.length > 0 || inProgressTasks.length > 0) {
      shouldFail = true;
      hasUnfinishedTasks = true;
    }
  }

  return { shouldFail, hasUnfinishedTasks };
}

function logTaskStatus(todos: TodoItem[], shouldFail: boolean): number {
  const pendingTasks = todos.filter(todo => todo.status === 'pending');
  const inProgressTasks = todos.filter(todo => todo.status === 'in_progress');
  const unfinishedTasks = [...pendingTasks, ...inProgressTasks];

  const messageType = shouldFail ? 'BLOCKED' : 'completed with warnings';
  const icon = shouldFail ? '🚫' : '⚠️ ';
  const color = shouldFail ? colors.red : colors.yellow;

  console.log(
    `\n${color}${colors.bold}${icon} Claude Code Stop ${messageType.toUpperCase()}: ${unfinishedTasks.length} unfinished task(s) detected${colors.reset}`
  );
  console.log(`${color}📋 Unfinished tasks:${colors.reset}`);
  unfinishedTasks.forEach(task => {
    console.log(
      `${color}   • [${task.id}] [${task.priority.toUpperCase()}] ${task.content} (${task.status.replace('_', ' ').toUpperCase()})${colors.reset}`
    );
  });

  if (shouldFail) {
    console.error(`\n${colors.red}${colors.bold}🛑 CLAUDE CODE STOP BLOCKED${colors.reset}`);
    console.error(
      `${colors.red}Claude Code cannot complete until all tasks are finished.${colors.reset}`
    );

    if (inProgressTasks.length > 0) {
      const currentTask = inProgressTasks[0];
      console.error(
        `${colors.yellow}💡 Continue working on [${currentTask.id}]: ${currentTask.content}${colors.reset}`
      );
    } else if (pendingTasks.length > 0) {
      console.error(
        `${colors.yellow}💡 Next task has been auto-assigned. Continue working.${colors.reset}`
      );
    }

    return 2;
  } else {
    console.log(`\n${colors.yellow}💡 Consider completing tasks when convenient${colors.reset}`);
    console.log(`\n${colors.green}✅ Todo list validation passed with warnings${colors.reset}`);
    return 0;
  }
}

async function checkTaskCompletionAndAutoAssign(
  todos: TodoItem[],
  config: ValidationConfig
): Promise<number> {
  const pendingTasks = todos.filter(todo => todo.status === 'pending');
  const inProgressTasks = todos.filter(todo => todo.status === 'in_progress');

  console.log(
    `\n${colors.bold}${colors.blue}🔍 Task Completion Check & Auto-Assignment${colors.reset}`
  );
  console.log(
    `${colors.cyan}📊 Current status: ${pendingTasks.length} pending, ${inProgressTasks.length} in-progress${colors.reset}`
  );

  // Auto-assign next pending task if none in progress
  const assignmentSuccess = await handleAutoAssignment(todos);
  if (!assignmentSuccess) {
    return 2;
  }

  // Determine validation result
  const { shouldFail, hasUnfinishedTasks } = determineValidationFailure(todos, config);

  if (hasUnfinishedTasks) {
    return logTaskStatus(todos, shouldFail);
  }

  const unfinishedTasks = todos.filter(todo => todo.status !== 'completed');
  if (unfinishedTasks.length === 0) {
    console.log(
      `\n${colors.bold}${colors.green}🎉 ALL TASKS COMPLETED! Claude Code is free to stop.${colors.reset}`
    );
  }

  console.log(
    `\n${colors.green}✅ Todo list validation passed - no blocking issues${colors.reset}`
  );
  return 0;
}

/**
 * Main execution function
 */
async function main(): Promise<number> {
  console.log(`${colors.bold}${colors.blue}🔍 Todo List Validation${colors.reset}\n`);

  const { todos, source } = await findAndParseTodoList();

  console.log(`${colors.blue}📋 Using todo source: ${source}${colors.reset}\n`);

  const basicValidationResult = performBasicValidation(todos, source);
  if (basicValidationResult !== 0) {
    return basicValidationResult;
  }

  const formatValidationResult = validateFormat(todos);
  if (formatValidationResult !== 0) {
    return formatValidationResult;
  }

  displayStatistics(todos);
  const config = loadValidationConfig();

  return await checkTaskCompletionAndAutoAssign(todos, config);
}

// Run the script
if (require.main === module) {
  main()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error(`${colors.red}❌ Script execution failed: ${error}${colors.reset}`);
      process.exit(1);
    });
}

export { parseTodoListFromMarkdown, validateTodoListFormat, getNextTodoItem };
