#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

// Todo list item interface
interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
}

// Define possible todo list file paths (prioritize todo-list.json)
const TODO_LIST_FILES = [
  path.join(process.cwd(), 'todo-list.json'),
  path.join(process.cwd(), '.claude_todo.json'),
  path.join(process.cwd(), 'TODO-Kanban-Implementation.md')
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

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
      const nextTaskMatch = content.substring(taskStartIndex + match[0].length).search(/### KANBAN-\d+:/);
      const taskEndIndex = nextTaskMatch === -1 
        ? content.length 
        : taskStartIndex + match[0].length + nextTaskMatch;
      
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
        priority: priority.toLowerCase() as 'high' | 'medium' | 'low'
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
    if (!todo.id || (!todo.id.match(/^(kanban|todo)-\d+$/) && !todo.id.match(/^\d+$/))) {
      errors.push(`Todo item ${index + 1}: Invalid ID format (expected: kanban-XXX, todo-XXX, or numeric)`);
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
    const pendingItem = todos.find(
      todo => todo.priority === priority && todo.status === 'pending'
    );
    if (pendingItem) {
      return pendingItem;
    }
  }
  
  return null; // All tasks completed!
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
  console.log(`${colors.bold}📈 Progress: ${completionPercentage}% (${completedTasks}/${totalTasks})${colors.reset}`);
}

/**
 * Find and parse todo list from available sources
 */
function findAndParseTodoList(): { todos: TodoItem[]; filePath: string | null } {
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
        return { todos, filePath };
      }
    }
  }
  
  return { todos: [], filePath: null };
}

/**
 * Main execution function
 */
function main(): number {
  console.log(`${colors.bold}${colors.blue}🔍 Todo List Validation Hook${colors.reset}\n`);
  
  // Find and parse todo list
  const { todos, filePath } = findAndParseTodoList();
  
  if (!filePath) {
    console.error(`${colors.red}❌ No todo list file found. Expected files:${colors.reset}`);
    TODO_LIST_FILES.forEach(file => {
      console.error(`${colors.red}   • ${path.basename(file)}${colors.reset}`);
    });
    return 1;
  }
  
  if (todos.length === 0) {
    console.error(`${colors.red}❌ No valid todo items found in ${path.basename(filePath)}${colors.reset}`);
    return 1;
  }
  
  // Validate format
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
  
  // Display statistics
  displayStatistics(todos);
  
  // Check for unfinished tasks
  const unfinishedTasks = todos.filter(
    todo => todo.status === 'pending' || todo.status === 'in_progress'
  );
  
  if (unfinishedTasks.length > 0) {
    console.error(`\n${colors.red}❌ Validation failed: ${unfinishedTasks.length} unfinished task(s) detected${colors.reset}`);
    console.error(`${colors.red}📋 Unfinished tasks:${colors.reset}`);
    unfinishedTasks.forEach(task => {
      console.error(`${colors.red}   • [${task.priority}] ${task.content} (${task.status})${colors.reset}`);
    });
    console.error(`\n${colors.yellow}💡 Please complete all tasks before proceeding${colors.reset}`);
    return 1;
  }
  
  console.log(`\n${colors.bold}${colors.green}🎉 All tasks are completed!${colors.reset}`);
  console.log(`\n${colors.green}✅ Todo list validation passed${colors.reset}`);
  return 0;
}

// Run the script
if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

export { parseTodoListFromMarkdown, validateTodoListFormat, getNextTodoItem };