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
import { runPrecommitChecks } from "./lib";
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
