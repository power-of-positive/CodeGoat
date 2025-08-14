#!/usr/bin/env npx tsx

/**
 * Test script for todo list validation in claude-stop hook
 */

import { execSync } from "child_process";

// Test data - simulating high priority unfinished tasks
const testTodos = [
  {
    content: "Fix success rate calculation showing 5507.2% - implement proper percentage calculation",
    status: "pending",
    priority: "high",
    id: "26"
  },
  {
    content: "Add statistic of average time per stage taken in analytics",
    status: "pending", 
    priority: "medium",
    id: "27"
  },
  {
    content: "Mirror vibe-kanban Rust backend functionality - support same agent running and worktree management capabilities",
    status: "pending",
    priority: "high", 
    id: "48"
  },
  {
    content: "Add todo list validation to claude-stop hook - block Claude from stopping if unfinished tasks exist",
    status: "in_progress",
    priority: "high",
    id: "49"
  },
  {
    content: "Fix broken task details opening when clicking on task",
    status: "completed",
    priority: "high",
    id: "46"
  }
];

console.log("🧪 Testing todo list validation...");

// Test 1: With high priority unfinished tasks (should block)
console.log("\n📋 Test 1: High priority unfinished tasks (should block)");
const todosWithHighPriority = JSON.stringify(testTodos);
process.env.CLAUDE_TOOL_INPUT = todosWithHighPriority;

try {
  const result = execSync("npx tsx scripts/claude-stop-hook.ts", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  console.log("❌ Hook should have blocked but didn't");
  console.log("Result:", result);
} catch (error: any) {
  if (error.status === 2) {
    console.log("✅ Hook correctly blocked due to high priority tasks");
    console.log("Error output:", error.stderr);
  } else {
    console.log("❌ Unexpected error:", error);
  }
}

// Test 2: Only completed and medium priority tasks (should allow)
console.log("\n📋 Test 2: Only completed and medium priority tasks (should allow)");
const completedTodos = testTodos.filter(todo => 
  todo.status === "completed" || todo.priority === "medium"
);
process.env.CLAUDE_TOOL_INPUT = JSON.stringify(completedTodos);

try {
  const result = execSync("npx tsx scripts/claude-stop-hook.ts", {
    encoding: "utf-8", 
    stdio: ["pipe", "pipe", "pipe"]
  });
  console.log("✅ Hook correctly allowed completion");
  console.log("Result:", JSON.parse(result.trim()));
} catch (error: any) {
  console.log("❌ Hook should have allowed but blocked:", error.stderr);
}

// Test 3: No todo list (should allow)
console.log("\n📋 Test 3: No todo list provided (should allow)");
delete process.env.CLAUDE_TOOL_INPUT;

try {
  const result = execSync("npx tsx scripts/claude-stop-hook.ts", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"] 
  });
  console.log("✅ Hook correctly allowed completion when no todos provided");
  console.log("Result:", JSON.parse(result.trim()));
} catch (error: any) {
  console.log("❌ Hook should have allowed but blocked:", error.stderr);
}

console.log("\n🎉 Todo validation testing completed!");