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
import { runPrecommitChecks } from "./lib";
import {
  performCodeReview,
  shouldBlockClaude,
  processReviewResults,
} from "./lib/utils/review-processor";

// Todo list types for validation
interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
  id: string;
}

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
console.log("🔧 Loaded environment from:", envPath);
if (process.env.OPENAI_API_KEY) {
  console.log("🔧 OPENAI_API_KEY is loaded");
} else {
  console.log("🔧 OPENAI_API_KEY is NOT loaded");
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
 * Parse and validate todo list from CLAUDE_TOOL_INPUT or todo-list.json file
 * Blocks Claude if there are unfinished high priority tasks
 */
function validateTodoList(): { shouldBlock: boolean; reason?: string } {
  let todos: TodoItem[] = [];
  let todoSource = "";

  // Try to get todos from CLAUDE_TOOL_INPUT first
  const toolInput = process.env.CLAUDE_TOOL_INPUT;
  if (toolInput) {
    try {
      console.error("📝 Reading todo list from CLAUDE_TOOL_INPUT");
      
      // Handle different possible formats
      if (toolInput.startsWith('[')) {
        // Direct array format
        todos = JSON.parse(toolInput);
        todoSource = "CLAUDE_TOOL_INPUT";
      } else {
        // Try to extract JSON from tool input
        const match = toolInput.match(/\[[\s\S]*\]/);
        if (match) {
          todos = JSON.parse(match[0]);
          todoSource = "CLAUDE_TOOL_INPUT";
        }
      }
    } catch (error) {
      console.error("📝 Failed to parse CLAUDE_TOOL_INPUT:", error);
    }
  }

  // If no todos from CLAUDE_TOOL_INPUT, try reading from todo-list.json file
  if (todos.length === 0) {
    const todoFilePath = path.join(process.cwd(), "todo-list.json");
    try {
      console.error("📝 Reading todo list from todo-list.json");
      if (fs.existsSync(todoFilePath)) {
        const fileContent = fs.readFileSync(todoFilePath, "utf-8");
        todos = JSON.parse(fileContent);
        todoSource = "todo-list.json";
      }
    } catch (error) {
      console.error("📝 Failed to read todo-list.json:", error);
    }
  }

  // If still no todos found, allow completion
  if (todos.length === 0) {
    console.error("📝 No todo list found in CLAUDE_TOOL_INPUT or todo-list.json");
    return { shouldBlock: false };
  }

  if (!Array.isArray(todos)) {
    console.error("📝 Todo list is not an array");
    return { shouldBlock: false };
  }

  console.error(`📝 Using todo list from: ${todoSource}`);

  try {
    // Filter for unfinished tasks
    const unfinishedTasks = todos.filter(
      (todo: TodoItem) => todo.status === "pending" || todo.status === "in_progress"
    );

    // Filter for high priority unfinished tasks
    const highPriorityUnfinished = unfinishedTasks.filter(
      (todo: TodoItem) => todo.priority === "high"
    );

    console.error(`📝 Todo list analysis:`);
    console.error(`   Total tasks: ${todos.length}`);
    console.error(`   Unfinished tasks: ${unfinishedTasks.length}`);
    console.error(`   High priority unfinished: ${highPriorityUnfinished.length}`);

    if (highPriorityUnfinished.length > 0) {
      const taskList = highPriorityUnfinished
        .map((task: TodoItem) => `  - ${task.content}`)
        .join('\n');
      
      return {
        shouldBlock: true,
        reason: `High priority tasks remain unfinished:\n${taskList}`
      };
    }

    // Check if there are many medium/low priority unfinished tasks
    if (unfinishedTasks.length >= 10) {
      return {
        shouldBlock: true,
        reason: `Too many unfinished tasks (${unfinishedTasks.length}). Please complete some tasks before stopping.`
      };
    }

    console.error("✅ Todo list validation passed");
    return { shouldBlock: false };

  } catch (error) {
    console.error("📝 Error validating todo list:", error);
    // Don't block on parse errors - allow completion
    return { shouldBlock: false };
  }
}

/**
 * Handle precommit checks with timeout
 */
async function handlePrecommitChecks(): Promise<void> {
  console.error("🧪 Running E2E tests and quality checks first...");

  // Set a timeout to prevent infinite loops
  const PRECOMMIT_TIMEOUT = 120000; // 2 minutes
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("Precommit checks timed out after 2 minutes")),
      PRECOMMIT_TIMEOUT,
    );
  });

  try {
    const precommitResult = await Promise.race([
      runPrecommitChecks(),
      timeoutPromise,
    ]);

    if (precommitResult.decision === "block") {
      console.error("⚠️ Pre-commit checks failed - blocking completion");
      const blockResult = {
        decision: "block",
        reason: precommitResult.reason || "Pre-commit checks failed",
      };
      console.log(JSON.stringify(blockResult));
      process.exit(2);
    }

    console.error("✅ Pre-commit checks passed");
  } catch (error) {
    console.error("⚠️ Pre-commit checks error:", error);
    const blockResult = {
      decision: "block",
      reason:
        error instanceof Error ? error.message : "Pre-commit checks failed",
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
    // First check: Block if there are unfinished high priority todos
    const todoValidation = validateTodoList();
    if (todoValidation.shouldBlock) {
      console.error("⚠️ Unfinished high priority tasks detected - blocking completion");
      console.error("💡 Please complete the high priority tasks before stopping");
      const blockResult = {
        decision: "block",
        reason: todoValidation.reason || "Unfinished high priority tasks detected",
      };
      console.log(JSON.stringify(blockResult));
      process.exit(2);
    }

    // Second check: Block if there are uncommitted files
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

    await handlePrecommitChecks();
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
