#!/usr/bin/env npx tsx

/**
 * Claude Code Stop Hook - Blocks completion if pre-commit checks fail or code review needed
 * Outputs JSON with decision and reason to control Claude's stopping behavior
 *
 * This replaces the shell script wrapper for better security and consistency.
 * All logic is now in TypeScript with proper validation and error handling.
 */

// Disable dotenv debug messages at the process level
process.env.DOTENV_CONFIG_DEBUG = 'false';

// Intercept stderr write to completely block dotenv messages
const originalStderrWrite = process.stderr.write;
process.stderr.write = function(string: string | Uint8Array, encoding?: string | ((err?: Error) => void), fd?: ((err?: Error) => void)): boolean {
  const str = string.toString();
  if (str.includes('[dotenv@') || str.includes('injecting env') || str.includes('tip:')) {
    return true; // Pretend write succeeded but do nothing
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return originalStderrWrite.call(process.stderr, string, encoding as any, fd as any);
};

// Completely suppress dotenv debug output by overriding console methods before any imports
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

// Override console methods to filter dotenv messages
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('[dotenv@') || message.includes('injecting env') || message.includes('tip:')) {
    return; // Silently ignore dotenv messages
  }
  originalConsoleError.apply(console, args);
};

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('[dotenv@') || message.includes('injecting env') || message.includes('tip:')) {
    return; // Silently ignore dotenv messages
  }
  originalConsoleLog.apply(console, args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('[dotenv@') || message.includes('injecting env') || message.includes('tip:')) {
    return; // Silently ignore dotenv messages
  }
  originalConsoleWarn.apply(console, args);
};

// Also override process.stderr.write for any direct stderr writes (reusing earlier declaration)
process.stderr.write = function(chunk: string | Buffer, encoding?: string | ((error?: Error | null) => void), callback?: (error?: Error | null) => void) {
  const str = chunk.toString();
  
  // Filter out dotenv debug messages
  if (str.includes('[dotenv@') || str.includes('injecting env') || str.includes('tip:')) {
    // Silently ignore dotenv messages
    if (typeof encoding === 'function') {
      encoding(); // Call callback if encoding is actually the callback
    } else if (typeof callback === 'function') {
      callback();
    }
    return true;
  }
  
  // Pass through other stderr content
  if (typeof encoding === 'function') {
    return originalStderrWrite.call(process.stderr, chunk, undefined, encoding);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalStderrWrite.call(process.stderr, chunk, encoding as any, callback);
  }
};

import { execSync } from 'child_process';
import * as process from 'process';
import * as path from 'path';

// Load environment variables manually to avoid dotenv debug output
const projectRoot = path.resolve(__dirname, '..');

// Use test environment for pre-commit hooks and testing contexts
// Set environment variable early to indicate we're in Claude stop hook context
process.env.CLAUDE_STOP_HOOK = 'true';

// Manually load .env.e2e file without any debug output and override existing values
const envPath = path.join(projectRoot, '.env.e2e');
try {
  const envFile = require('fs').readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line: string) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      // Remove quotes if present
      const value = match[2].replace(/^"(.*)"$/, '$1');
      process.env[match[1]] = value; // Always override, don't check existing
    }
  });
  
  // Ensure DATABASE_URL is properly set for Prisma
  if (process.env.KANBAN_DATABASE_URL && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.KANBAN_DATABASE_URL;
  }
  
} catch {
  // Silently ignore if .env.e2e doesn't exist
}
// Skip Winston logger import to avoid dotenv loading from src/
// import { WinstonLogger } from '../src/logger-winston';
// Delay imports that might load dotenv

// Create Winston logger directly without importing from src/ (which loads dotenv)
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'claude-stop-hook.log'),
      level: 'info'
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'claude-stop-hook-error.log'),
      level: 'error'
    })
  ]
});

// Log that the hook is being called
logger.info('🔥 CLAUDE STOP HOOK EXECUTING', {
  timestamp: new Date().toISOString(),
  arguments: process.argv.slice(2),
  claudeToolInput: process.env.CLAUDE_TOOL_INPUT || ''
});

// Safety check: ensure we're running from the correct directory
const currentDir = process.cwd();
const expectedDir = '/Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat';
if (currentDir !== expectedDir) {
  logger.warn('⚠️ Hook running from wrong directory', {
    currentDir,
    expectedDir
  });
  logger.info('⚠️ Exiting to prevent infinite loop');
  process.exit(0); // Exit successfully to allow completion
}

// Environment variables already loaded at the top of the file

logger.info('🔧 Loaded environment', { envPath });
if (process.env.OPENAI_API_KEY) {
  logger.info('🔧 OPENAI_API_KEY is loaded');
} else {
  logger.warn('🔧 OPENAI_API_KEY is NOT loaded');
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
    logger.info('ℹ️ No CLAUDE_TOOL_INPUT provided - allowing completion');
    return { shouldBlock: false };
  }

  try {
    const todos: TodoItem[] = JSON.parse(todoInput);
    
    if (!Array.isArray(todos)) {
      logger.warn('⚠️ CLAUDE_TOOL_INPUT is not an array - allowing completion');
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

    logger.info(`✅ Todo validation passed - ${allUnfinished.length} unfinished tasks (no high priority)`);
    return { shouldBlock: false };

  } catch (error) {
    logger.warn(`⚠️ Error parsing CLAUDE_TOOL_INPUT: ${error} - allowing completion`);
    return { shouldBlock: false };
  }
}

/**
 * Strip ANSI color codes and clean up output
 */
function stripAnsiCodes(text: string): string {
  // Remove ANSI escape sequences using character code
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Parse validation output to extract detailed error information
 */
function parseValidationOutput(stdout: string, stderr: string, code: number | null): Error {
  const fullOutput = stripAnsiCodes(`${stdout}\n${stderr}`).trim();

  if (code === 2) {
    const errorLines = fullOutput
      .split('\n')
      .filter(
        line =>
          line.includes('FAIL') ||
          line.includes('failed') ||
          (line.includes('error') && !line.includes('console.error'))
      );

    const MAX_ERROR_DISPLAY = 5;
    let detailedMessage = `Validation failed`;
    if (errorLines.length > 0) {
      const cleanErrors = errorLines
        .slice(0, MAX_ERROR_DISPLAY)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      if (cleanErrors.length > 0) {
        detailedMessage += `: ${cleanErrors.join(', ')}`;
      }
    }
    if (errorLines.length > MAX_ERROR_DISPLAY) {
      detailedMessage += ` and ${errorLines.length - MAX_ERROR_DISPLAY} more errors`;
    }

    return new Error(detailedMessage);
  } else {
    const LAST_LINES_COUNT = 10;
    const LAST_LINES_SLICE_OFFSET = -LAST_LINES_COUNT;
    let detailedMessage = `Validation failed with exit code ${code}`;
    if (fullOutput) {
      const lastLines = fullOutput.split('\n').slice(LAST_LINES_SLICE_OFFSET).join('\n');
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
        stdio: ['pipe', 'pipe', 'pipe'], // Redirect all stdio to pipes
        cwd: process.cwd(),
        env: {
          ...process.env,
          DEBUG: '', // Suppress all debug output including dotenv
          DOTENV_CONFIG_DEBUG: 'false' // Suppress dotenv logs
        }
      }
    );

    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      stdout += output;
      // Log validation output to file instead of stdout
      logger.info('Validation stdout', { output: output.trim() });
    });

    child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      stderr += output;
      // Log validation errors to file instead of stderr
      logger.warn('Validation stderr', { output: output.trim() });
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
 * Handle validation checks with timeout (using database-driven validation stages with todo list validation)
 */
async function handleValidationChecks(): Promise<void> {
  logger.info('🧪 Running complete validation pipeline from database including todo list...');

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
    logger.info('✅ All validation checks passed including todo list');
  } catch (error) {
    logger.error('⚠️ Validation checks failed', error instanceof Error ? error : new Error(String(error)));
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
  logger.info('🤖 Running LLM code review (secondary quality check)...');
  
  // Dynamic import to avoid loading dotenv at startup
  const {
    performCodeReview,
    shouldBlockClaude,
    processReviewResults,
  } = await import('./lib/utils/review-processor');
  
  const reviewComments = await performCodeReview(allChanges);

  if (shouldBlockClaude(reviewComments)) {
    logger.warn('⚠️ LLM review found issues - blocking completion');
    const result = processReviewResults(reviewComments);
    const blockResult = {
      decision: 'block',
      reason: result.reason || 'LLM review found medium or high severity issues',
    };
    console.log(JSON.stringify(blockResult));
    process.exit(2);
  }

  logger.info('✅ LLM review passed - all quality gates cleared');
}

/**
 * Main stop hook execution with global timeout
 */
async function main(): Promise<void> {
  // Set a global timeout for the entire stop hook - must be longer than validation timeout
  const GLOBAL_TIMEOUT = 1500000; // 25 minutes
  const globalTimeout = setTimeout(() => {
    logger.error('⚠️ Stop hook timed out after 25 minutes');
    console.log('{"decision": "block", "reason": "Stop hook execution timed out"}');
    process.exit(2);
  }, GLOBAL_TIMEOUT);

  try {
    // First, validate todo list from CLAUDE_TOOL_INPUT before running expensive validation
    logger.info('🔍 Checking todo list from CLAUDE_TOOL_INPUT...');
    const todoValidation = validateTodoList();
    if (todoValidation.shouldBlock) {
      logger.warn('⚠️ Todo validation failed - blocking completion');
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
      logger.warn('⚠️ Uncommitted files detected - blocking completion');
      logger.info('💡 Please commit your changes before completing');
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
    logger.error('Stop hook error', error instanceof Error ? error : new Error(String(error)));
    console.log('{"decision": "block", "reason": "Stop hook execution failed"}');
    process.exit(2); // Exit with code 2 to indicate block decision
  }
}

main().catch(error => {
  logger.error('Unhandled error', error instanceof Error ? error : new Error(String(error)));
  process.exit(2);
});
