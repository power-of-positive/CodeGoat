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

  // Set a timeout to prevent infinite loops - increased for comprehensive validation
  const VALIDATION_TIMEOUT = 1200000; // 20 minutes
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("Validation checks timed out after 20 minutes")),
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
    process.exit(1); // Exit with code 1 to indicate validation failure
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
  // Set a global timeout for the entire stop hook - must be longer than validation timeout
  const GLOBAL_TIMEOUT = 1500000; // 25 minutes
  const globalTimeout = setTimeout(() => {
    console.error("⚠️ Stop hook timed out after 25 minutes");
    console.log(
      '{"decision": "block", "reason": "Stop hook execution timed out"}',
    );
    process.exit(2);
  }, GLOBAL_TIMEOUT);

  try {
    // Run validation pipeline first (includes todo list validation via settings.json)
    await handleValidationChecks();

    // Then check for uncommitted files (since validation passed)
    if (hasUncommittedFiles()) {
      console.error("⚠️ Uncommitted files detected - blocking completion");
      console.error("💡 Please commit your changes before completing");
      const blockResult = {
        decision: "block",
        reason:
          "Uncommitted files detected. Please commit or stash changes before completing.",
      };
      console.log(JSON.stringify(blockResult));
      process.exit(1); // Exit with code 1 to indicate block decision
    }

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
    process.exit(1); // Exit with code 1 to indicate block decision
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(2);
});
