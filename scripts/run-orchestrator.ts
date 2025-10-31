#!/usr/bin/env npx tsx

/**
 * Claude Task Orchestrator CLI
 *
 * This script provides a command-line interface to run the Claude Task Orchestrator
 * which automatically processes tasks from the database with validation loops.
 *
 * Usage:
 *   npx tsx scripts/run-orchestrator.ts [options]
 *
 * Options:
 *   --continuous    Run in continuous mode (keeps running)
 *   --single        Run a single cycle and exit
 *   --prompt "text" Execute specific prompt instead of fetching from database
 *   --max-retries N Maximum retries per validation failure (default: 3)
 *   --max-task-retries N Maximum retries per task (default: 2)
 *   --timeout N     Validation timeout in milliseconds (default: 300000)
 *   --no-validation Disable validation pipeline
 *   --settings PATH Path to settings.json (default: ./settings.json)
 *   --claude-command CMD Claude command to execute (default: claude)
 *   --worktree-dir PATH Working directory (default: current directory)
 *   --enable-worktrees Use git worktrees for isolation
 *   --poll-interval N Polling interval for continuous mode in ms (default: 5000)
 *   --filter-priority PRIORITY Only process tasks with specified priority (high/medium/low)
 *   --help          Show this help message
 *
 * Examples:
 *   # Run single cycle
 *   npx tsx scripts/run-orchestrator.ts --single
 *
 *   # Run in continuous mode
 *   npx tsx scripts/run-orchestrator.ts --continuous
 *
 *   # Execute specific prompt
 *   npx tsx scripts/run-orchestrator.ts --prompt "Fix the TypeScript errors in the codebase"
 *
 *   # Run with custom settings
 *   npx tsx scripts/run-orchestrator.ts --continuous --max-retries 5 --timeout 600000
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { ClaudeTaskOrchestrator, OrchestratorOptions } from '../src/utils/claude-task-orchestrator';
import { WinstonLogger } from '../src/logger-winston';
import { PermissionManager } from '../src/utils/permissions';
import { createDatabaseService, getDatabaseService } from '../src/services/database';
import { Task } from '@prisma/client';
import { Priority, TaskStatus, TaskType, TaskStatusType, TaskTypeType } from '../src/types/enums';

// Load environment variables
dotenv.config({ path: '.env' });

interface CLIOptions {
  continuous: boolean;
  single: boolean;
  prompt?: string;
  maxRetries: number;
  maxTaskRetries: number;
  timeout: number;
  noValidation: boolean;
  settings: string;
  claudeCommand: string;
  worktreeDir: string;
  enableWorktrees: boolean;
  pollInterval: number;
  filterPriority?: 'high' | 'medium' | 'low';
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    continuous: false,
    single: false,
    maxRetries: 3,
    maxTaskRetries: 2,
    timeout: 300000, // 5 minutes
    noValidation: false,
    settings: path.join(process.cwd(), 'settings.json'),
    claudeCommand: 'claude -p',
    worktreeDir: process.cwd(),
    enableWorktrees: false,
    pollInterval: 5000,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--continuous':
        options.continuous = true;
        break;
      case '--single':
        options.single = true;
        break;
      case '--prompt':
        options.prompt = args[++i];
        break;
      case '--max-retries':
        options.maxRetries = parseInt(args[++i], 10);
        break;
      case '--max-task-retries':
        options.maxTaskRetries = parseInt(args[++i], 10);
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--no-validation':
        options.noValidation = true;
        break;
      case '--settings':
        options.settings = args[++i];
        break;
      case '--claude-command':
        options.claudeCommand = args[++i];
        break;
      case '--worktree-dir':
        options.worktreeDir = args[++i];
        break;
      case '--enable-worktrees':
        options.enableWorktrees = true;
        break;
      case '--poll-interval':
        options.pollInterval = parseInt(args[++i], 10);
        break;
      case '--filter-priority':
        options.filterPriority = args[++i] as 'high' | 'medium' | 'low';
        break;
      case '--help':
        options.help = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp(): void {
  const help = `
Claude Task Orchestrator CLI

This script provides a command-line interface to run the Claude Task Orchestrator
which automatically processes tasks from the database with validation loops.

Usage:
  npx tsx scripts/run-orchestrator.ts [options]
  
Options:
  --continuous       Run in continuous mode (keeps running)
  --single          Run a single cycle and exit
  --prompt "text"   Execute specific prompt instead of fetching from database
  --max-retries N   Maximum retries per validation failure (default: 3)
  --max-task-retries N Maximum retries per task (default: 2)
  --timeout N       Validation timeout in milliseconds (default: 300000)
  --no-validation   Disable validation pipeline
  --settings PATH   Path to settings.json (default: ./settings.json)
  --claude-command CMD Claude command to execute (default: claude)
  --worktree-dir PATH Working directory (default: current directory)
  --enable-worktrees Use git worktrees for isolation
  --poll-interval N Polling interval for continuous mode in ms (default: 5000)
  --filter-priority PRIORITY Only process tasks with specified priority (high/medium/low)
  --help           Show this help message

Examples:
  # Run single cycle
  npx tsx scripts/run-orchestrator.ts --single

  # Run in continuous mode
  npx tsx scripts/run-orchestrator.ts --continuous

  # Execute specific prompt
  npx tsx scripts/run-orchestrator.ts --prompt "Fix the TypeScript errors in the codebase"

  # Run with custom settings
  npx tsx scripts/run-orchestrator.ts --continuous --max-retries 5 --timeout 600000

  # Run with priority filter
  npx tsx scripts/run-orchestrator.ts --continuous --filter-priority high
`;

  console.log(help);
}

/**
 * Create a task filter based on options
 */
function createTaskFilter(options: CLIOptions): ((task: Task) => boolean) | undefined {
  if (!options.filterPriority) {
    return undefined;
  }

  const priorityMap = {
    high: Priority.HIGH,
    medium: Priority.MEDIUM,
    low: Priority.LOW,
  };

  const targetPriority = priorityMap[options.filterPriority];

  return (task: Task) => task.priority === targetPriority;
}

/**
 * Create a task for a custom prompt
 */
async function createPromptTask(prompt: string): Promise<Task> {
  const db = getDatabaseService();

  // Generate next CODEGOAT ID
  const tasks = await db.task.findMany({
    where: {
      id: { startsWith: 'CODEGOAT-' },
    },
    orderBy: { id: 'desc' },
    take: 1,
  });

  let nextNumber = 1;
  if (tasks.length > 0) {
    const lastId = tasks[0].id;
    const numberMatch = lastId.match(/CODEGOAT-(\d+)/);
    if (numberMatch) {
      nextNumber = parseInt(numberMatch[1], 10) + 1;
    }
  }

  const taskId = `CODEGOAT-${nextNumber.toString().padStart(3, '0')}`;

  // Create task in database
  const task = await db.task.create({
    data: {
      id: taskId,
      title: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      content: prompt,
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      taskType: TaskType.TASK,
    },
  });

  return task;
}

/**
 * Main execution function
 */

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  // Validate arguments
  if (options.continuous && options.single) {
    console.error('Error: Cannot specify both --continuous and --single');
    process.exit(1);
  }

  if (!options.continuous && !options.single && !options.prompt) {
    console.error('Error: Must specify either --continuous, --single, or --prompt');
    process.exit(1);
  }

  // Create logger
  const logger = new WinstonLogger({
    level: 'info',
    enableConsole: true,
    enableFile: true,
    logsDir: './logs',
  });

  try {
    // Initialize database service
    createDatabaseService(logger);

    // Create permission manager (optional)
    const permissionConfig = {
      rules: [],
      defaultAllow: true,
      enableLogging: true,
      strictMode: false,
    };
    const permissionManager = new PermissionManager(permissionConfig, logger);

    // Create task filter
    const taskFilter = createTaskFilter(options);

    // Create orchestrator options
    const orchestratorOptions: OrchestratorOptions = {
      worktreeDir: options.worktreeDir,
      claudeCommand: options.claudeCommand,
      permissionManager,
      maxRetries: options.maxRetries,
      maxTaskRetries: options.maxTaskRetries,
      validationSettings: options.settings,
      enableValidation: !options.noValidation,
      validationTimeout: options.timeout,
      taskFilter,
      enableWorktrees: options.enableWorktrees,
      continuousMode: options.continuous,
      pollInterval: options.pollInterval,
    };

    // Create orchestrator
    const orchestrator = new ClaudeTaskOrchestrator(orchestratorOptions, logger);

    // Handle custom prompt
    if (options.prompt) {
      logger.info('Creating task for custom prompt', { promptLength: options.prompt.length });
      await createPromptTask(options.prompt);
    }

    // Set up signal handlers for graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await orchestrator.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await orchestrator.stop();
      process.exit(0);
    });

    // Run orchestrator
    if (options.continuous) {
      logger.info('Starting orchestrator in continuous mode', { options: orchestratorOptions });
      await orchestrator.start();
    } else {
      logger.info('Running single orchestrator cycle', { options: orchestratorOptions });
      const result = await orchestrator.runSingleCycle();

      // Print results
      console.log('\n=== Orchestrator Results ===');
      console.log(`Tasks Processed: ${result.metrics.tasksProcessed}`);
      console.log(`Tasks Completed: ${result.metrics.tasksCompleted}`);
      console.log(`Tasks Failed: ${result.metrics.tasksFailed}`);
      console.log(`Total Claude Executions: ${result.metrics.totalClaudeExecutions}`);
      console.log(`Total Validation Runs: ${result.totalValidationRuns}`);
      console.log(`Average Attempts per Task: ${result.metrics.averageAttemptsPerTask}`);
      console.log(`Average Validation Time: ${result.metrics.averageValidationTime}ms`);
      console.log(`Total Duration: ${result.totalDuration}ms`);
      console.log(`Overall Success: ${result.success}`);

      if (result.completedTasks.length > 0) {
        console.log('\n=== Completed Tasks ===');
        for (const task of result.completedTasks) {
          console.log(
            `- ${task.task.id}: ${task.task.content?.substring(0, 80)}${task.task.content && task.task.content.length > 80 ? '...' : ''}`
          );
          console.log(
            `  Attempts: ${task.attempts}, Duration: ${task.totalDuration}ms, Validations: ${task.validationResults.length}`
          );
        }
      }

      if (result.failedTasks.length > 0) {
        console.log('\n=== Failed Tasks ===');
        for (const task of result.failedTasks) {
          console.log(
            `- ${task.task.id}: ${task.task.content?.substring(0, 80)}${task.task.content && task.task.content.length > 80 ? '...' : ''}`
          );
          console.log(`  Error: ${task.error}`);
          console.log(
            `  Attempts: ${task.attempts}, Duration: ${task.totalDuration}ms, Validations: ${task.validationResults.length}`
          );
        }
      }
    }
  } catch (error) {
    logger.error('Orchestrator failed with error', error as Error);
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
