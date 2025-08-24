#!/usr/bin/env npx tsx

/**
 * Claude Code Stop Hook - Blocks completion if pre-commit checks fail or code review needed
 * Outputs JSON with decision and reason to control Claude's stopping behavior
 *
 * This replaces the shell script wrapper for better security and consistency.
 * All logic is now in TypeScript with proper validation and error handling.
 */

import { execSync } from 'child_process';
import * as process from 'process';
import { config } from 'dotenv';
import * as path from 'path';
import {
  performCodeReview,
  shouldBlockClaude,
  processReviewResults,
} from './lib/utils/review-processor';

// Log that the hook is being called (stderr to match shell version)
console.error(`🔥 CLAUDE STOP HOOK EXECUTING - ${new Date()}`);
console.error(`🔥 Hook arguments: ${process.argv.slice(2).join(' ')}`);
console.error(`🔥 Environment vars: CLAUDE_TOOL_INPUT=${process.env.CLAUDE_TOOL_INPUT || ''}`);

// Safety check: ensure we're running from the correct directory
const currentDir = process.cwd();
const expectedDir = '/Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat';
if (currentDir !== expectedDir) {
  console.error(`⚠️ Hook running from wrong directory: ${currentDir}`);
  console.error(`⚠️ Expected directory: ${expectedDir}`);
  console.error(`⚠️ Exiting to prevent infinite loop`);
  process.exit(0); // Exit successfully to allow completion
}

// Load environment variables synchronously at startup
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
config({ path: envPath });

// Set environment variable to indicate we're in Claude stop hook context
process.env.CLAUDE_STOP_HOOK = 'true';

console.log('🔧 Loaded environment from:', envPath);
if (process.env.OPENAI_API_KEY) {
  console.log('🔧 OPENAI_API_KEY is loaded');
} else {
  console.log('🔧 OPENAI_API_KEY is NOT loaded');
}

/**
 * Get list of changed files from git
 */
function getChangedFiles(): string {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' }) || '';
    const unstaged = execSync('git diff --name-only', { encoding: 'utf-8' }) || '';
    const untracked =
      execSync('git ls-files --others --exclude-standard', {
        encoding: 'utf-8',
      }) || '';

    return [staged, unstaged, untracked].filter(Boolean).join('\n');
  } catch {
    return '';
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
 * Todo item interface for validation
 */
interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
}

/**
 * Validate todo list from CLAUDE_TOOL_INPUT environment variable
 */
function validateTodoList(): { shouldBlock: boolean; reason?: string } {
  const todoInput = process.env.CLAUDE_TOOL_INPUT;
  
  if (!todoInput) {
    console.error('ℹ️ No CLAUDE_TOOL_INPUT provided - allowing completion');
    return { shouldBlock: false };
  }

  try {
    const todos: TodoItem[] = JSON.parse(todoInput);
    
    if (!Array.isArray(todos)) {
      console.error('⚠️ CLAUDE_TOOL_INPUT is not an array - allowing completion');
      return { shouldBlock: false };
    }

    // Check for high priority unfinished tasks
    const highPriorityUnfinished = todos.filter(
      todo => todo.priority === 'high' && (todo.status === 'pending' || todo.status === 'in_progress')
    );

    if (highPriorityUnfinished.length > 0) {
      const taskList = highPriorityUnfinished
        .map(task => `  - ${task.content}`)
        .join('\n');
      return {
        shouldBlock: true,
        reason: `High priority tasks remain unfinished:\n${taskList}`
      };
    }

    // Check for too many unfinished tasks
    const allUnfinished = todos.filter(
      todo => todo.status === 'pending' || todo.status === 'in_progress'
    );

    if (allUnfinished.length >= 10) {
      return {
        shouldBlock: true,
        reason: `Too many unfinished tasks (${allUnfinished.length}). Please complete some tasks before stopping.`
      };
    }

    console.error(`✅ Todo validation passed - ${allUnfinished.length} unfinished tasks (no high priority)`);
    return { shouldBlock: false };

  } catch (error) {
    console.error(`⚠️ Error parsing CLAUDE_TOOL_INPUT: ${error} - allowing completion`);
    return { shouldBlock: false };
  }
}

/**
 * Parse validation output to extract detailed error information
 */
function parseValidationOutput(stdout: string, stderr: string, code: number | null): Error {
  const fullOutput = `${stdout}\n${stderr}`.trim();

  if (code === 2) {
    const errorLines = fullOutput
      .split('\n')
      .filter(
        line =>
          line.includes('error') ||
          line.includes('failed') ||
          line.includes('FAIL') ||
          line.includes('✖') ||
          line.includes('❌') ||
          line.includes('Coverage')
      );

    let detailedMessage = `Validation blocked with exit code 2`;
    if (errorLines.length > 0) {
      detailedMessage += `:\n${errorLines.slice(0, 10).join('\n')}`;
    }
    if (errorLines.length > 10) {
      detailedMessage += `\n... and ${errorLines.length - 10} more errors`;
    }

    return new Error(detailedMessage);
  } else {
    let detailedMessage = `Validation failed with exit code ${code}`;
    if (fullOutput) {
      const lastLines = fullOutput.split('\n').slice(-10).join('\n');
      detailedMessage += `:\n${lastLines}`;
    }
    return new Error(detailedMessage);
  }
}

/**
 * Create validation process promise
 */
function createValidationProcess(sessionId: string): Promise<void> {
  const { spawn } = require('child_process');

  return new Promise<void>((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(
      'npx',
      ['ts-node', 'scripts/validate-task.ts', sessionId, '--settings=settings-precommit.json'],
      {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: process.cwd(),
      }
    );

    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    child.on('exit', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(parseValidationOutput(stdout, stderr, code));
      }
    });

    child.on('error', (error: Error) => {
      reject(new Error(`Validation process error: ${error.message}`));
    });
  });
}

/**
 * Handle validation checks with timeout (using settings.json with todo list validation)
 */
async function handleValidationChecks(): Promise<void> {
  console.error('🧪 Running complete validation pipeline including todo list...');

  const VALIDATION_TIMEOUT = 1200000; // 20 minutes
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error('Validation checks timed out after 20 minutes')),
      VALIDATION_TIMEOUT
    );
  });

  try {
    const sessionId = `claude-stop-${Date.now()}`;
    const validationPromise = createValidationProcess(sessionId);

    await Promise.race([validationPromise, timeoutPromise]);
    console.error('✅ All validation checks passed including todo list');
  } catch (error) {
    console.error('⚠️ Validation checks failed:', error);
    const blockResult = {
      decision: 'block',
      reason: error instanceof Error ? error.message : 'Validation checks failed',
    };
    console.log(JSON.stringify(blockResult));
    process.exit(2);
  }
}

/**
 * Handle LLM review
 */
async function handleLLMReview(allChanges: string): Promise<void> {
  console.error('🤖 Running LLM code review (secondary quality check)...');
  const reviewComments = await performCodeReview(allChanges);

  if (shouldBlockClaude(reviewComments)) {
    console.error('⚠️ LLM review found issues - blocking completion');
    const result = processReviewResults(reviewComments);
    const blockResult = {
      decision: 'block',
      reason: result.reason || 'LLM review found medium or high severity issues',
    };
    console.log(JSON.stringify(blockResult));
    process.exit(2);
  }

  console.error('✅ LLM review passed - all quality gates cleared');
}

/**
 * Main stop hook execution with global timeout
 */
async function main(): Promise<void> {
  // Set a global timeout for the entire stop hook - must be longer than validation timeout
  const GLOBAL_TIMEOUT = 1500000; // 25 minutes
  const globalTimeout = setTimeout(() => {
    console.error('⚠️ Stop hook timed out after 25 minutes');
    console.log('{"decision": "block", "reason": "Stop hook execution timed out"}');
    process.exit(2);
  }, GLOBAL_TIMEOUT);

  try {
    // First, validate todo list from CLAUDE_TOOL_INPUT before running expensive validation
    console.error('🔍 Checking todo list from CLAUDE_TOOL_INPUT...');
    const todoValidation = validateTodoList();
    if (todoValidation.shouldBlock) {
      console.error('⚠️ Todo validation failed - blocking completion');
      const blockResult = {
        decision: 'block',
        reason: todoValidation.reason || 'High priority tasks remain unfinished',
      };
      console.log(JSON.stringify(blockResult));
      process.exit(2);
    }

    // Run validation pipeline (includes additional validation via settings.json)
    await handleValidationChecks();

    // Then check for uncommitted files (since validation passed)
    if (hasUncommittedFiles()) {
      console.error('⚠️ Uncommitted files detected - blocking completion');
      console.error('💡 Please commit your changes before completing');
      const blockResult = {
        decision: 'block',
        reason: 'Uncommitted files detected. Please commit or stash changes before completing.',
      };
      console.log(JSON.stringify(blockResult));
      process.exit(2); // Exit with code 2 to indicate block decision
    }

    const allChanges = getChangedFiles();

    if (allChanges) {
      await handleLLMReview(allChanges);
    }

    clearTimeout(globalTimeout);
    // Play the "I am done" sound
    try {
      execSync('say "I am done" 2>/dev/null', { stdio: 'ignore' });
    } catch {
      // Ignore if say command fails
    }
    console.log('{"decision": "approve"}');
    process.exit(0);
  } catch (error) {
    clearTimeout(globalTimeout);
    console.error('Stop hook error:', error);
    console.log('{"decision": "block", "reason": "Stop hook execution failed"}');
    process.exit(2); // Exit with code 2 to indicate block decision
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(2);
});
