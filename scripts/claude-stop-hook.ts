#!/usr/bin/env npx tsx

/**
 * Claude Code Stop Hook - Blocks completion if pre-commit checks fail or code review needed
 * Outputs JSON with decision and reason to control Claude's stopping behavior
 *
 * This replaces the shell script wrapper for better security and consistency.
 * All logic is now in TypeScript with proper validation and error handling.
 */

import { execSync } from "child_process";
import * as process from "process";
import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import {
  performCodeReview,
  shouldBlockClaude,
  processReviewResults,
} from "./lib/utils/review-processor";

// Log that the hook is being called (stderr to match shell version)
console.error(`🔥 CLAUDE STOP HOOK EXECUTING - ${new Date()}`);
console.error(`🔥 Hook arguments: ${process.argv.slice(2).join(" ")}`);
console.error(
  `🔥 Environment vars: CLAUDE_TOOL_INPUT=${
    process.env.CLAUDE_TOOL_INPUT || ""
  }`,
);

// Safety check: ensure we're running from the correct directory
const currentDir = process.cwd();
const expectedDir = "/Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat";
if (currentDir !== expectedDir) {
  console.error(`⚠️ Hook running from wrong directory: ${currentDir}`);
  console.error(`⚠️ Expected directory: ${expectedDir}`);
  console.error(`⚠️ Exiting to prevent infinite loop`);
  process.exit(0); // Exit successfully to allow completion
}

// Load environment variables synchronously at startup
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
config({ path: envPath });

// Set environment variable to indicate we're in Claude stop hook context
process.env.CLAUDE_STOP_HOOK = "true";

console.log("🔧 Loaded environment from:", envPath);
if (process.env.OPENAI_API_KEY) {
  console.log("🔧 OPENAI_API_KEY is loaded");
} else {
  console.log("🔧 OPENAI_API_KEY is NOT loaded");
}

// Todo list interfaces
interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
}

// API configuration
const API_BASE_URL = 'http://localhost:3001/api';
const TASKS_ENDPOINT = `${API_BASE_URL}/tasks`;

/**
 * Check if API server is available
 */
async function isApiServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
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
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      console.error(`⚠️ Failed to update task ${taskId} in database: ${response.status} ${response.statusText}`);
      return false;
    }

    console.error(`✅ Updated task ${taskId} in database`);
    return true;
  } catch (error) {
    console.error(`⚠️ Error updating task ${taskId} in database:`, (error as Error).message);
    return false;
  }
}

/**
 * Load todo list from JSON file
 */
function loadTodoList(): TodoItem[] {
  const todoListPath = path.join(process.cwd(), 'todo-list.json');
  try {
    if (fs.existsSync(todoListPath)) {
      const content = fs.readFileSync(todoListPath, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.error('❌ Failed to load todo list:', error);
  }
  return [];
}

/**
 * Save todo list to JSON file
 */
function saveTodoList(todos: TodoItem[]): void {
  const todoListPath = path.join(process.cwd(), 'todo-list.json');
  try {
    fs.writeFileSync(todoListPath, JSON.stringify(todos, null, 2));
  } catch (error) {
    console.error('❌ Failed to save todo list:', error);
  }
}

/**
 * Get the next highest priority pending task
 */
function getNextPendingTask(todos: TodoItem[]): TodoItem | null {
  const priorityOrder = ['high', 'medium', 'low'] as const;
  
  for (const priority of priorityOrder) {
    const pendingTask = todos.find(
      todo => todo.priority === priority && todo.status === 'pending'
    );
    if (pendingTask) {
      return pendingTask;
    }
  }
  
  return null;
}

/**
 * Check todo list status and manage task assignment
 */
async function checkTodoListStatus(): Promise<{ shouldBlock: boolean; reason: string; nextTask?: TodoItem }> {
  console.error('📋 Checking todo list status...');
  
  const todos = loadTodoList();
  if (todos.length === 0) {
    console.error('✅ No todo list found - allowing completion');
    return { shouldBlock: false, reason: '' };
  }
  
  const inProgressTasks = todos.filter(todo => todo.status === 'in_progress');
  const pendingTasks = todos.filter(todo => todo.status === 'pending');
  const highPriorityPending = pendingTasks.filter(todo => todo.priority === 'high');
  
  console.error(`📊 Todo status: ${inProgressTasks.length} in-progress, ${pendingTasks.length} pending (${highPriorityPending.length} high priority)`);
  
  // If there are in-progress tasks, provide feedback about them
  if (inProgressTasks.length > 0) {
    console.error('🔄 Found in-progress tasks:');
    inProgressTasks.forEach(task => {
      console.error(`   • [${task.priority}] ${task.content} (ID: ${task.id})`);
    });
    
    return {
      shouldBlock: true,
      reason: `${inProgressTasks.length} task(s) are currently in progress. Please complete them before stopping: ${inProgressTasks.map(t => `#${t.id}`).join(', ')}`
    };
  }
  
  // If no in-progress tasks but there are pending ones, auto-assign the next one
  if (pendingTasks.length > 0) {
    const nextTask = getNextPendingTask(todos);
    if (nextTask) {
      // Auto-assign the next task
      nextTask.status = 'in_progress';
      nextTask.startTime = new Date().toISOString();
      saveTodoList(todos);
      
      console.error(`🎯 Auto-assigned next task: [${nextTask.priority}] ${nextTask.content} (ID: ${nextTask.id})`);
      
      // Try to sync with database
      console.error(`🔄 Syncing task assignment with database...`);
      const apiAvailable = await isApiServerAvailable();
      
      if (apiAvailable) {
        const dbUpdateSuccess = await updateTaskInDatabase(nextTask.id, {
          status: nextTask.status,
          startTime: nextTask.startTime
        });
        
        if (dbUpdateSuccess) {
          console.error(`✅ Task assignment synchronized with database`);
        } else {
          console.error(`⚠️  Task assigned in todo-list.json but failed to sync with database`);
        }
      } else {
        console.error(`⚠️  API server not available - task assigned in todo-list.json only`);
      }
      
      return {
        shouldBlock: true,
        reason: `Auto-assigned next pending task (#${nextTask.id}): ${nextTask.content}. Please work on this task before stopping.`,
        nextTask
      };
    }
  }
  
  // All tasks completed
  console.error('🎉 All tasks are completed!');
  return { shouldBlock: false, reason: '' };
}

/**
 * Get list of changed files from git
 */
function getChangedFiles(): string {
  try {
    const staged =
      execSync("git diff --cached --name-only", { encoding: "utf-8" }) || "";
    const unstaged =
      execSync("git diff --name-only", { encoding: "utf-8" }) || "";
    const untracked =
      execSync("git ls-files --others --exclude-standard", {
        encoding: "utf-8",
      }) || "";

    return [staged, unstaged, untracked].filter(Boolean).join("\n");
  } catch {
    return "";
  }
}

/**
 * Check if there are uncommitted files in the repository
 */
function hasUncommittedFiles(): boolean {
  const changes = getChangedFiles();
  return changes.trim().length > 0;
}


/**
 * Handle validation checks with timeout (using settings.json with todo list validation)
 */
async function handleValidationChecks(): Promise<void> {
  console.error("🧪 Running complete validation pipeline including todo list...");

  // Set a timeout to prevent infinite loops
  const VALIDATION_TIMEOUT = 180000; // 3 minutes
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("Validation checks timed out after 3 minutes")),
      VALIDATION_TIMEOUT,
    );
  });

  try {
    // Run the validation script with settings.json (includes todo list validation)
    const sessionId = `claude-stop-${Date.now()}`;
    const { spawn } = require("child_process");
    
    const validationPromise = new Promise<void>((resolve, reject) => {
      const child = spawn("npx", ["ts-node", "scripts/validate-task.ts", sessionId, "--settings=settings.json"], {
        stdio: ["inherit", "inherit", "inherit"],
        cwd: process.cwd()
      });
      
      child.on("exit", (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Validation failed with exit code ${code}`));
        }
      });
      
      child.on("error", (error: Error) => {
        reject(error);
      });
    });

    await Promise.race([validationPromise, timeoutPromise]);
    console.error("✅ All validation checks passed including todo list");
  } catch (error) {
    console.error("⚠️ Validation checks failed:", error);
    const blockResult = {
      decision: "block",
      reason:
        error instanceof Error ? error.message : "Validation checks failed",
    };
    console.log(JSON.stringify(blockResult));
    process.exit(2);
  }
}

/**
 * Handle LLM review
 */
async function handleLLMReview(allChanges: string): Promise<void> {
  console.error("🤖 Running LLM code review (secondary quality check)...");
  const reviewComments = await performCodeReview(allChanges);

  if (shouldBlockClaude(reviewComments)) {
    console.error("⚠️ LLM review found issues - blocking completion");
    const result = processReviewResults(reviewComments);
    const blockResult = {
      decision: "block",
      reason:
        result.reason || "LLM review found medium or high severity issues",
    };
    console.log(JSON.stringify(blockResult));
    process.exit(2);
  }

  console.error("✅ LLM review passed - all quality gates cleared");
}

/**
 * Main stop hook execution with global timeout
 */
async function main(): Promise<void> {
  // Set a global timeout for the entire stop hook
  const GLOBAL_TIMEOUT = 150000; // 2.5 minutes
  const globalTimeout = setTimeout(() => {
    console.error("⚠️ Stop hook timed out after 2.5 minutes");
    console.log(
      '{"decision": "block", "reason": "Stop hook execution timed out"}',
    );
    process.exit(2);
  }, GLOBAL_TIMEOUT);

  try {
    // First check: Block if there are uncommitted files
    if (hasUncommittedFiles()) {
      console.error("⚠️ Uncommitted files detected - blocking completion");
      console.error("💡 Please commit your changes before completing");
      const blockResult = {
        decision: "block",
        reason:
          "Uncommitted files detected. Please commit or stash changes before completing.",
      };
      console.log(JSON.stringify(blockResult));
      process.exit(2);
    }

    // Second check: Todo list validation and task management
    const todoStatus = await checkTodoListStatus();
    if (todoStatus.shouldBlock) {
      console.error("⚠️ Todo list check failed - blocking completion");
      console.error("💡 Complete your assigned tasks before stopping");
      const blockResult = {
        decision: "block",
        reason: todoStatus.reason,
      };
      console.log(JSON.stringify(blockResult));
      process.exit(2);
    }

    await handleValidationChecks();
    const allChanges = getChangedFiles();

    if (allChanges) {
      await handleLLMReview(allChanges);
    }

    clearTimeout(globalTimeout);
    // Play the "I am done" sound
    try {
      execSync('say "I am done" 2>/dev/null', { stdio: "ignore" });
    } catch {
      // Ignore if say command fails
    }
    console.log('{"decision": "approve"}');
    process.exit(0);
  } catch (error) {
    clearTimeout(globalTimeout);
    console.error("Stop hook error:", error);
    console.log(
      '{"decision": "block", "reason": "Stop hook execution failed"}',
    );
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(2);
});
