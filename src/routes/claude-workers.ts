import express from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CommandInterceptor, formatCommandAnalysis } from '../utils/command-interceptor';
import { WorktreeManager } from '../utils/worktree-manager';
import { ValidationRunner } from '../../scripts/validate-task';
import { getDatabaseService } from '../services/database';
import { TaskStatus } from '@prisma/client';
import { logManager } from '../utils/log-manager';
import { ClaudeLogProcessor } from '../utils/claude-log-processor';
// import { WinstonLogger } from '../logger-winston';

const router = express.Router();

// HTTP Status Codes
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_OK = 200;

// Magic Numbers
const RANDOM_STRING_LENGTH = 9;
const SUBSTR_START_INDEX = 2;
const STRING_TRUNCATE_LENGTH = 100;
const DATE_COMPONENT_PADDING = 2;
const PAD_CHAR = '0';
const VALIDATION_DEFAULT_MAX_ATTEMPTS = 3;
const POLLING_INTERVAL_MS = 500;
const COMPLETION_CHECK_INTERVAL_MS = 1000;
const VSCODE_TIMEOUT_MS = 10000;
const TASK_CONTENT_SUBSTRING_LENGTH = 50;
const MONTH_OFFSET = 1;
const BASE36_RADIX = 36;

interface ValidationRun {
  id: string;
  timestamp: Date;
  stages: Array<{
    name: string;
    command: string;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
    duration?: number;
    output?: string;
    error?: string;
  }>;
  overallStatus: 'pending' | 'running' | 'passed' | 'failed';
  metricsFile?: string;
}

interface ClaudeWorker {
  id: string;
  taskId: string;
  taskContent: string;
  process: ChildProcess | null;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped' | 'validating';
  startTime: Date;
  endTime?: Date;
  logFile: string;
  pid?: number;
  interceptor?: CommandInterceptor;
  blockedCommands: number;
  blockedCommandsList: Array<{
    timestamp: string;
    command: string;
    reason: string;
    suggestion?: string;
  }>;
  worktreePath?: string;
  worktreeManager?: WorktreeManager;
  claudeLogProcessor?: ClaudeLogProcessor;
  structuredEntries: Array<{
    type: string;
    content: string;
    metadata?: unknown;
    timestamp?: string;
  }>;
  validationPassed?: boolean;
  validationRuns: ValidationRun[];
  validationAttempts?: number;
  maxValidationAttempts?: number;
}

// In-memory storage for active workers
const activeWorkers = new Map<string, ClaudeWorker>();

/**
 * Update task status in database
 */
async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  workerId?: string
): Promise<void> {
  try {
    const db = getDatabaseService();

    // Check if task exists
    const existingTask = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      // Task not found warning disabled
      return;
    }

    // Prepare update data
    const updateData: {
      status: TaskStatus;
      executorId?: string;
      startTime?: Date;
      endTime?: Date;
    } = {
      status,
    };

    // Set executor when starting task
    if (status === TaskStatus.IN_PROGRESS && workerId) {
      updateData.executorId = workerId;
      updateData.startTime = new Date();
    }

    // Set end time when completing task
    if (status === TaskStatus.COMPLETED) {
      updateData.endTime = new Date();
    }

    await db.task.update({
      where: { id: taskId },
      data: updateData,
    });

    console.error(
      `📝 Updated task ${taskId} status to ${status}${workerId ? ` (executor: ${workerId})` : ''}`
    );
  } catch (error) {
    console.error(`❌ Failed to update task ${taskId} status:`, error);
  }
}

/**
 * Run validation checks after worker completion
 */
async function runValidationChecks(
  worker: ClaudeWorker
): Promise<{ success: boolean; results?: ValidationRun; message?: string }> {
  try {
    console.error(`🔍 Running validation checks for worker ${worker.id}...`);
    worker.status = 'validating';

    // Create new validation run
    const validationRun: ValidationRun = {
      id: `validation-${Date.now()}-${Math.random().toString(BASE36_RADIX).substr(SUBSTR_START_INDEX, RANDOM_STRING_LENGTH)}`,
      timestamp: new Date(),
      stages: [],
      overallStatus: 'running',
      metricsFile: path.join(path.dirname(worker.logFile), `validation-${worker.id}.json`),
    };
    worker.validationRuns.push(validationRun);

    // Write to log file
    const logMessage =
      `\n=== Running Validation Checks ===\n` +
      `Worker: ${worker.id}\n` +
      `Task: ${worker.taskId}\n` +
      `Validation Run ID: ${validationRun.id}\n` +
      `Started at: ${new Date().toISOString()}\n\n`;

    try {
      fs.appendFileSync(worker.logFile, logMessage);
    } catch (logError) {
      console.error(`Failed to write validation start log for worker ${worker.id}:`, logError);
    }

    // Create validation runner with session ID based on worker ID
    const runner = new ValidationRunner({
      sessionId: worker.id,
      settingsPath: path.join(process.cwd(), 'settings.json'),
    });

    // TODO: Capture individual stage results from ValidationRunner
    // For now, we'll create basic stages
    const stages = ['lint', 'type-check', 'test', 'e2e'];
    for (const stageName of stages) {
      validationRun.stages.push({
        name: stageName,
        command: `npm run ${stageName}`,
        status: 'pending',
      });
    }

    const success = await runner.runValidation();
    await runner.cleanup();

    // Update validation run status
    validationRun.overallStatus = success ? 'passed' : 'failed';
    validationRun.stages.forEach(stage => {
      if (stage.status === 'pending') {
        stage.status = success ? 'passed' : 'failed';
      }
    });

    worker.validationPassed = success;

    // Write validation result to log file
    const resultMessage = success
      ? `✅ Validation passed for worker ${worker.id}\n`
      : `❌ Validation failed for worker ${worker.id}\n`;

    try {
      fs.appendFileSync(worker.logFile, `${resultMessage}\n`);
    } catch (logError) {
      console.error(`Failed to write validation result log for worker ${worker.id}:`, logError);
    }

    if (success) {
      console.error(`✅ Validation checks passed for worker ${worker.id}`);
      return { success: true };
    } else {
      console.error(`❌ Validation checks failed for worker ${worker.id}`);

      // Create detailed failure message
      const failedStages = validationRun.stages.filter(stage => stage.status === 'failed');
      const failureMessage = `Validation failed on ${failedStages.length} stage(s): ${failedStages.map(s => s.name).join(', ')}. Please fix the following issues and try again:\n\n${failedStages.map(stage => `• ${stage.name}: ${stage.error ?? 'Failed without specific error message'}`).join('\n')}`;

      return {
        success: false,
        results: validationRun,
        message: failureMessage,
      };
    }
  } catch (error) {
    // Validation error logging disabled
    worker.validationPassed = false;

    try {
      fs.appendFileSync(worker.logFile, `❌ Validation error: ${(error as Error).message}\n`);
    } catch (logError) {
      console.error(`Failed to write validation error log for worker ${worker.id}:`, logError);
    }

    return {
      success: false,
      message: `Validation error: ${(error as Error).message}`,
    };
  }
}

/**
 * Restart worker with validation feedback
 */
function restartWorkerWithFeedback(worker: ClaudeWorker, validationMessage: string): void {
  try {
    console.error(
      `🔄 Restarting worker ${worker.id} with validation feedback (attempt ${(worker.validationAttempts ?? 0) + 1}/${worker.maxValidationAttempts})`
    );

    // Increment validation attempts
    worker.validationAttempts = (worker.validationAttempts ?? 0) + 1;

    // Stop current process if running (it should already be finished, but just in case)
    if (worker.process && !worker.process.killed) {
      worker.process.kill('SIGTERM');
    }
    worker.process = null;

    // Reset worker status
    worker.status = 'running';
    worker.endTime = undefined;

    // Write validation feedback to log file
    const feedbackMessage = `\n🔄 VALIDATION FEEDBACK (Attempt ${worker.validationAttempts}/${worker.maxValidationAttempts})\n${validationMessage}\n\nRestarting to address these issues...\n\n`;

    try {
      fs.appendFileSync(worker.logFile, feedbackMessage);
    } catch (logError) {
      console.error(
        `Failed to write validation feedback to log for worker ${worker.id}:`,
        logError
      );
    }

    // Create validation feedback prompt for Claude
    const feedbackPrompt = `The validation checks failed after your previous work completed. Here are the specific issues that need to be fixed:

${validationMessage}

Please review these validation failures and fix all the issues. Make sure to:
1. Address each failed validation stage
2. Test your changes locally if possible
3. Ensure all validation checks pass before completing

Continue working from where you left off and fix these validation issues.`;

    // Start new Claude Code process with feedback
    const workDir = worker.worktreePath; // Use worktreePath directly

    const claudeArgs = ['npx', '@anthropic/claude-code@latest', '--message', feedbackPrompt];

    console.error(
      `🚀 Restarting Claude Code process for worker ${worker.id} with validation feedback`
    );

    const claudeProcess = spawn('bash', ['-c', claudeArgs.join(' ')], {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
      },
    });

    worker.process = claudeProcess;
    worker.pid = claudeProcess.pid;

    // Set up basic process handlers for the restarted worker
    claudeProcess.on('close', (code: number | null) => {
      console.error(`🔄 Restarted worker ${worker.id} process exited with code ${code}`);
      // The main process handler will take care of validation on the next completion
    });
  } catch (error) {
    console.error(`❌ Failed to restart worker ${worker.id} with feedback:`, error);
    worker.status = 'failed';
  }
}

/**
 * Load max validation attempts from settings
 */
async function getMaxValidationAttempts(): Promise<number> {
  try {
    const settingsPath = path.join(process.cwd(), 'settings.json');
    const settingsContent = await fs.promises.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(settingsContent);
    return settings.validation?.maxAttempts ?? VALIDATION_DEFAULT_MAX_ATTEMPTS;
  } catch (error) {
    console.error('Failed to load validation settings, using default maxAttempts=3:', error);
    return VALIDATION_DEFAULT_MAX_ATTEMPTS;
  }
}

// Validation and feedback functions temporarily removed to fix server stability
// TODO: Re-implement with proper error handling to prevent server crashes

/**
 * Monitor command output for potential security issues
 */
function monitorCommandOutput(worker: ClaudeWorker, output: string): string {
  if (!worker.interceptor) {
    return output;
  }

  const lines = output.split('\n');
  const monitoredLines: string[] = [];

  for (const line of lines) {
    let monitoredLine = line;

    // Look for command patterns in the output
    const commandPatterns = [
      /Executing command:\s*(.+)$/i,
      /Running:\s*(.+)$/i,
      /\$\s*(.+)$/,
      />\s*(.+)$/,
      // Match common CLI output patterns
      /^[a-zA-Z_][a-zA-Z0-9_-]*\s+/,
    ];

    for (const pattern of commandPatterns) {
      const match = line.match(pattern);
      if (match) {
        const command = match[1] || match[0];

        // Skip common non-command outputs
        if (isNonCommand(command)) {
          continue;
        }

        // Analyze the command
        const analysis = worker.interceptor.analyzeCommand(command);

        if (!analysis.allowed) {
          worker.blockedCommands++;

          // Store blocked command details
          worker.blockedCommandsList.push({
            timestamp: new Date().toISOString(),
            command: command,
            reason: analysis.reason || 'Command not allowed',
            suggestion: analysis.suggestion,
          });

          const blockMessage = `\n🚫 COMMAND BLOCKED: ${formatCommandAnalysis(analysis)}\n`;
          monitoredLine += blockMessage;

          console.error(`[PERMISSION DENIED] Worker ${worker.id}: ${command}`);
          console.error(`Reason: ${analysis.reason}`);
        } else if (analysis.severity === 'warning') {
          // Warning messages disabled to reduce noise
        }

        break; // Only process first matching pattern per line
      }
    }

    monitoredLines.push(monitoredLine);
  }

  return monitoredLines.join('\n');
}

/**
 * Check if a string is likely not a command
 */
function isNonCommand(str: string): boolean {
  const trimmed = str.trim();

  // Skip empty strings
  if (!trimmed) {
    return true;
  }

  // Skip pure output/log messages
  if (/^(error|warning|info|debug|log):/i.test(trimmed)) {
    return true;
  }

  // Skip URLs
  if (/^https?:\/\//.test(trimmed)) {
    return true;
  }

  // Skip file paths without command context
  if (/^[./~]/.test(trimmed) && !trimmed.includes(' ')) {
    return true;
  }

  // Skip numbers/timestamps
  if (/^\d+([:.]\d+)*$/.test(trimmed)) {
    return true;
  }

  // Skip JSON-like content
  if (/^[{[]/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Generate unique worker ID
 */
function generateWorkerId(): string {
  return `claude-worker-${Date.now()}-${Math.random().toString(BASE36_RADIX).substr(SUBSTR_START_INDEX, RANDOM_STRING_LENGTH)}`;
}

/**
 * Create log directory with date-based organization
 */
function ensureLogDirectory(): string {
  const today = new Date();
  const dateFolder = `${today.getFullYear()}-${(today.getMonth() + MONTH_OFFSET).toString().padStart(DATE_COMPONENT_PADDING, PAD_CHAR)}-${today.getDate().toString().padStart(DATE_COMPONENT_PADDING, PAD_CHAR)}`;
  const logDir = path.join(process.cwd(), 'logs', 'workers', dateFolder);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

/**
 * Start a Claude Code worker for a specific task
 */
router.post('/start', async (req, res) => {
  try {
    const { taskId, taskContent, workingDirectory } = req.body;

    if (!taskId || !taskContent) {
      return res.status(HTTP_BAD_REQUEST).json({
        success: false,
        error: 'taskId and taskContent are required',
      });
    }

    const workerId = generateWorkerId();
    const logDir = ensureLogDirectory();
    const logFile = path.join(logDir, `${workerId}.log`);

    // Create Git worktree manager
    const worktreeManager = new WorktreeManager();

    // Create isolated Git worktree for this task
    let workDir: string;
    try {
      if (workingDirectory) {
        workDir = workingDirectory;
      } else {
        workDir = await worktreeManager.createWorktree({
          taskId,
          workerId,
        });
      }
    } catch (error) {
      console.error(`Failed to create worktree for worker ${workerId}:`, error);
      return res.status(HTTP_INTERNAL_SERVER_ERROR).json({
        success: false,
        error: `Failed to create worktree: ${(error as Error).message}`,
      });
    }

    // Create command interceptor for permission checking
    // Using console as a simplified logger interface
    const logger = {
      debug: console.debug.bind(console),

      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    } as unknown as Parameters<typeof CommandInterceptor.createDefault>[0]; // Type assertion to bypass complex WinstonLogger interface
    const interceptor = await CommandInterceptor.createDefault(logger, workDir);

    // Create the worker entry
    const worker: ClaudeWorker = {
      id: workerId,
      taskId,
      taskContent,
      process: null,
      status: 'starting',
      startTime: new Date(),
      logFile,
      interceptor,
      blockedCommands: 0,
      blockedCommandsList: [],
      worktreePath: workDir,
      worktreeManager,
      claudeLogProcessor: new ClaudeLogProcessor(),
      structuredEntries: [],
      validationRuns: [],
      validationAttempts: 0,
      maxValidationAttempts: VALIDATION_DEFAULT_MAX_ATTEMPTS, // Will be updated from settings
    };

    // Load max validation attempts from settings
    worker.maxValidationAttempts = await getMaxValidationAttempts();

    activeWorkers.set(workerId, worker);

    // Prepare Claude Code command with proper npx usage and JSON streaming
    // Send prompt via stdin like the example-ts-backend does
    const claudeCommand = 'npx';
    const claudeArgs = [
      '-y',
      '@anthropic-ai/claude-code@latest',
      '-p',
      '--dangerously-skip-permissions',
      '--verbose',
      '--output-format=stream-json',
      // No prompt argument - we'll send it via stdin
    ];

    console.error(`🚀 Starting Claude Code worker ${workerId} for task ${taskId}`);
    console.error(`📁 Working directory: ${workDir}`);
    console.error(`📝 Task: ${taskContent}`);

    // Spawn Claude Code process
    const claudeProcess = spawn(claudeCommand, claudeArgs, {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: {
        ...process.env,
        CLAUDE_TASK_ID: taskId,
        CLAUDE_WORKER_ID: workerId,
      },
    });

    worker.process = claudeProcess;
    worker.pid = claudeProcess.pid;
    worker.status = 'running';

    // Update task status to in_progress when worker starts
    try {
      await updateTaskStatus(taskId, TaskStatus.IN_PROGRESS, workerId);
    } catch {
      // Task status update error logging disabled
    }

    // Create log file stream
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    let logStreamClosed = false;

    // Log initial info
    logStream.write(`=== Claude Code Worker ${workerId} Started ===\n`);
    logStream.write(`Task ID: ${taskId}\n`);
    logStream.write(`Task Content: ${taskContent}\n`);
    logStream.write(`Working Directory: ${workDir}\n`);
    logStream.write(`Start Time: ${worker.startTime.toISOString()}\n`);
    logStream.write(`PID: ${claudeProcess.pid}\n`);
    logStream.write(`Command: ${claudeCommand} ${claudeArgs.join(' ')}\n`);
    logStream.write('=== Output ===\n');

    // Handle process output with command monitoring and JSON stream processing
    console.error(`[${workerId}] Setting up stdout/stderr listeners`);

    claudeProcess.stdout?.on('data', data => {
      const output = data.toString();
      console.error(`[${workerId}] STDOUT: ${output.length} bytes received`);
      const monitoredOutput = monitorCommandOutput(worker, output);
      logStream.write(`STDOUT: ${monitoredOutput}`);

      // Process JSON stream lines using Claude log processor
      const lines = output.split('\n').filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (worker.claudeLogProcessor) {
            const entries = worker.claudeLogProcessor.toNormalizedEntries(
              json,
              worker.worktreePath ?? ''
            );
            // Convert to our internal format
            worker.structuredEntries.push(
              ...entries.map(entry => ({
                type: entry.entry_type.type,
                content: entry.content,
                metadata: entry.metadata,
              }))
            );
          }
        } catch {
          // Not JSON, treat as regular output
          worker.structuredEntries.push({
            type: 'SystemMessage',
            content: line,
          });
        }
      }
    });

    claudeProcess.stderr?.on('data', data => {
      const output = data.toString();
      console.error(`[${workerId}] STDERR: ${output.trim()}`);
      const monitoredOutput = monitorCommandOutput(worker, output);
      logStream.write(`STDERR: ${monitoredOutput}`);
    });

    // Add debug listeners for stream events
    claudeProcess.stdout?.on('end', () => {
      console.error(`[${workerId}] STDOUT stream ended`);
      logStream.write('STDOUT stream ended\n');
    });

    claudeProcess.stderr?.on('end', () => {
      console.error(`[${workerId}] STDERR stream ended`);
      logStream.write('STDERR stream ended\n');
    });

    // Send prompt via stdin like the example-ts-backend does
    if (claudeProcess.stdin) {
      console.error(
        `[${workerId}] Sending prompt via stdin: ${taskContent.substring(0, STRING_TRUNCATE_LENGTH)}...`
      );
      logStream.write(`Sending prompt via stdin: ${taskContent}\n`);
      claudeProcess.stdin.write(taskContent);
      claudeProcess.stdin.end();
    } else {
      console.error(`[${workerId}] ERROR: stdin not available`);
      logStream.write('ERROR: stdin not available\n');
    }

    // Handle process completion
    claudeProcess.on('close', code => {
      (async () => {
        try {
          worker.endTime = new Date();
          const duration = worker.endTime.getTime() - worker.startTime.getTime();

          if (!logStreamClosed && !logStream.destroyed) {
            logStream.write(`\n=== Process Completed ===\n`);
            logStream.write(`Exit Code: ${code}\n`);

            // Provide better information about exit codes
            if (code === 0) {
              logStream.write(`Status: SUCCESS - Process completed normally\n`);
            } else if (code === null) {
              logStream.write(
                `Status: TERMINATED - Process was killed by signal (likely SIGTERM from manual stop)\n`
              );
            } else if (code > 0) {
              logStream.write(`Status: ERROR - Process exited with error code ${code}\n`);
            } else {
              logStream.write(`Status: UNKNOWN - Process exited with unexpected code ${code}\n`);
            }

            logStream.write(`End Time: ${worker.endTime.toISOString()}\n`);
            logStream.write(`Duration: ${duration}ms\n`);
            logStream.end();
            logStreamClosed = true;
          }

          console.error(`🏁 Claude Code worker ${workerId} completed with exit code ${code}`);

          if (code === 0) {
            console.error(`✅ Worker ${workerId} completed successfully`);

            // Run validation checks on successful completion
            try {
              const validationResult = await runValidationChecks(worker);

              if (validationResult.success) {
                console.error(`✅ Worker ${workerId} passed validation, marking task as completed`);
                worker.status = 'completed';
                worker.validationPassed = true;
                // Task will be marked as completed when merge happens (task 5)
              } else {
                console.error(`❌ Worker ${workerId} failed validation checks`);

                // Check if we can retry with feedback
                const currentAttempts = worker.validationAttempts ?? 0;
                const maxAttempts = worker.maxValidationAttempts ?? 3;

                if (currentAttempts < maxAttempts && validationResult.message) {
                  console.error(
                    `🔄 Restarting worker ${workerId} with validation feedback (attempt ${currentAttempts + 1}/${maxAttempts})`
                  );
                  restartWorkerWithFeedback(worker, validationResult.message);
                  // Don't clean up worktree yet, worker is restarting
                  return;
                } else {
                  console.error(
                    `❌ Worker ${workerId} exceeded max validation attempts (${maxAttempts}), marking as failed`
                  );
                  worker.status = 'failed';
                  worker.validationPassed = false;
                }
              }
            } catch {
              // Validation error logging disabled
              worker.status = 'failed';
              worker.validationPassed = false;
            }
          } else {
            worker.status = 'failed';
            console.error(`❌ Worker ${workerId} failed with exit code ${code}`);
          }

          // Clean up worktree after completion
          if (worker.worktreeManager && worker.worktreePath && !workingDirectory) {
            worker.worktreeManager
              .removeWorktree(worker.worktreePath)
              .then(() => {
                console.error(`🧹 Cleaned up worktree for worker ${workerId}`);
              })
              .catch(_cleanupError => {
                // Worktree cleanup error logging disabled
              });
          }
        } catch (error) {
          console.error(`❌ Error handling worker ${workerId} completion:`, error);
          worker.status = 'failed';
          if (!logStreamClosed && !logStream.destroyed) {
            logStream.end();
            logStreamClosed = true;
          }
        }
      })().catch(error => {
        console.error(`❌ Unhandled async error in worker ${workerId} completion:`, error);
        worker.status = 'failed';
      });
    });

    claudeProcess.on('error', error => {
      try {
        worker.status = 'failed';
        worker.endTime = new Date();

        if (!logStreamClosed && !logStream.destroyed) {
          logStream.write(`\n=== Process Error ===\n`);
          logStream.write(`Error: ${error.message}\n`);
          logStream.end();
          logStreamClosed = true;
        }

        console.error(`❌ Claude Code worker ${workerId} failed:`, error);

        // Clean up worktree after error
        if (worker.worktreeManager && worker.worktreePath && !workingDirectory) {
          worker.worktreeManager
            .removeWorktree(worker.worktreePath)
            .then(() => {
              console.error(`🧹 Cleaned up worktree for failed worker ${workerId}`);
            })
            .catch(cleanupError => {
              console.error(
                `⚠️ Failed to cleanup worktree for failed worker ${workerId}:`,
                cleanupError
              );
            });
        }
      } catch (err) {
        console.error(`❌ Error handling worker ${workerId} error:`, err);
        worker.status = 'failed';
        if (!logStreamClosed && !logStream.destroyed) {
          logStream.end();
          logStreamClosed = true;
        }
      }
    });

    res.json({
      success: true,
      data: {
        workerId,
        taskId,
        status: worker.status,
        pid: worker.pid,
        logFile,
        startTime: worker.startTime,
      },
    });
  } catch (error) {
    console.error('Error starting Claude Code worker:', error);
    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get status of all workers
 */
router.get('/status', (req, res) => {
  const workers = Array.from(activeWorkers.values()).map(worker => ({
    id: worker.id,
    taskId: worker.taskId,
    taskContent: worker.taskContent.substring(0, STRING_TRUNCATE_LENGTH) + '...',
    status: worker.status,
    startTime: worker.startTime,
    endTime: worker.endTime,
    pid: worker.pid,
    logFile: worker.logFile,
    blockedCommands: worker.blockedCommands,
    hasPermissionSystem: !!worker.interceptor,
    validationPassed: worker.validationPassed,
    validationRuns: worker.validationRuns?.length || 0,
  }));

  res.json({
    success: true,
    data: {
      workers,
      activeCount: workers.filter(w => w.status === 'running').length,
      totalCount: workers.length,
      totalBlockedCommands: workers.reduce((sum, w) => sum + w.blockedCommands, 0),
    },
  });
});

/**
 * Get specific worker status
 */
router.get('/:workerId', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  res.json({
    success: true,
    data: {
      id: worker.id,
      taskId: worker.taskId,
      taskContent: worker.taskContent,
      status: worker.status,
      startTime: worker.startTime,
      endTime: worker.endTime,
      pid: worker.pid,
      logFile: worker.logFile,
    },
  });
});

/**
 * Stop all workers
 */
router.post('/stop-all', (req, res) => {
  let stoppedCount = 0;

  for (const [workerId, worker] of activeWorkers.entries()) {
    if (worker.process && worker.status === 'running') {
      console.error(`🛑 Stopping Claude Code worker ${workerId}`);
      worker.process.kill('SIGTERM');
      worker.status = 'stopped';
      worker.endTime = new Date();
      stoppedCount++;
    }
  }

  res.json({
    success: true,
    data: {
      message: `Stopped ${stoppedCount} workers`,
      stoppedCount,
    },
  });
});

/**
 * Clear completed/failed workers from memory
 */
router.post('/clear', (req, res) => {
  const before = activeWorkers.size;

  for (const [workerId, worker] of activeWorkers.entries()) {
    if (
      worker.status === 'completed' ||
      worker.status === 'failed' ||
      worker.status === 'stopped'
    ) {
      activeWorkers.delete(workerId);
    }
  }

  const after = activeWorkers.size;
  const cleared = before - after;

  res.json({
    success: true,
    data: {
      message: `Cleared ${cleared} workers`,
      clearedCount: cleared,
      remainingCount: after,
    },
  });
});

/**
 * Stop a specific worker
 */
router.post('/:workerId/stop', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  if (worker.process && worker.status === 'running') {
    console.error(`🛑 Stopping Claude Code worker ${workerId}`);

    // Write termination reason to log file before killing process
    try {
      const logMessage =
        `\n=== Manual Termination ===\n` +
        `Reason: Worker stopped manually via API/UI\n` +
        `Terminated by: User request\n` +
        `Termination time: ${new Date().toISOString()}\n` +
        `Signal: SIGTERM\n\n`;

      fs.appendFileSync(worker.logFile, logMessage);
    } catch (logError) {
      console.error(`Failed to write termination log for worker ${workerId}:`, logError);
    }

    worker.process.kill('SIGTERM');
    worker.status = 'stopped';
    worker.endTime = new Date();
  }

  res.json({
    success: true,
    data: {
      workerId,
      status: worker.status,
    },
  });
});

/**
 * Get worker logs
 */
router.get('/:workerId/logs', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  try {
    const logs = fs.readFileSync(worker.logFile, 'utf-8');
    res.json({
      success: true,
      data: {
        workerId,
        logs,
        logFile: worker.logFile,
      },
    });
  } catch {
    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to read log file',
    });
  }
});

/**
 * Send message to a running worker
 */
router.post('/:workerId/message', (req, res) => {
  const { workerId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: 'Message content is required',
    });
  }

  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  if (worker.status !== 'running') {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: `Cannot send message to worker with status: ${worker.status}`,
    });
  }

  if (!worker.process?.stdin) {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: 'Worker process is not available for input',
    });
  }

  try {
    // Log the message being sent
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [USER MESSAGE] ${message}\n`;
    fs.appendFileSync(worker.logFile, logEntry);

    // Add to structured entries
    worker.structuredEntries.push({
      timestamp,
      type: 'UserMessage',
      content: message,
      metadata: { source: 'api' },
    });

    // Send message to worker process via stdin
    worker.process.stdin.write(`${message}\n`);

    res.json({
      success: true,
      data: {
        workerId,
        message,
        timestamp,
        status: 'sent',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: `Failed to send message: ${errorMessage}`,
    });
  }
});

/**
 * Get structured entries from worker
 */
router.get('/:workerId/entries', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  res.json({
    success: true,
    data: {
      workerId,
      entries: worker.structuredEntries,
      totalEntries: worker.structuredEntries.length,
      lastUpdate:
        worker.structuredEntries.length > 0
          ? worker.structuredEntries[worker.structuredEntries.length - 1].timestamp
          : worker.startTime.toISOString(),
    },
  });
});

/**
 * Cleanup worktrees for completed/failed workers
 */
router.post('/cleanup-worktrees', async (req, res) => {
  try {
    const worktreeBaseDir = path.join(path.dirname(process.cwd()), 'claude-worktrees');
    let cleanedCount = 0;

    for (const [workerId, worker] of activeWorkers.entries()) {
      if (
        worker.status === 'completed' ||
        worker.status === 'failed' ||
        worker.status === 'stopped'
      ) {
        try {
          // Extract task info from worktree path if it exists
          const worktreePath = path.join(
            worktreeBaseDir,
            `worktree-${worker.taskId}-${workerId.split('-').pop()}`
          );
          await fs.promises.rm(worktreePath, { recursive: true, force: true });
          cleanedCount++;
        } catch {
          // Worktree cleanup warning disabled
        }
      }
    }

    res.json({
      success: true,
      data: {
        message: `Cleaned up ${cleanedCount} worktrees`,
        cleanedCount,
      },
    });
  } catch (error) {
    console.error('Error cleaning up worktrees:', error);
    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to cleanup worktrees',
    });
  }
});

/**
 * Merge worktree changes back to main branch
 */
router.post('/:workerId/merge-worktree', async (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  if (!worker.worktreePath) {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: 'No worktree associated with this worker',
    });
  }

  try {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);

    // Check if there are any changes to commit
    const { stdout: statusOutput } = await execAsync('git status --porcelain', {
      cwd: worker.worktreePath,
    });

    if (statusOutput.trim()) {
      // Commit changes in worktree
      await execAsync('git add .', { cwd: worker.worktreePath });
      await execAsync(`git commit -m "Task ${worker.taskId}: Changes from worker ${workerId}"`, {
        cwd: worker.worktreePath,
      });
    }

    // Get current branch in worktree
    const { stdout: currentBranch } = await execAsync('git branch --show-current', {
      cwd: worker.worktreePath,
    });

    const branchName = currentBranch.trim() || 'HEAD';

    // Switch to main branch and merge
    await execAsync('git checkout main', { cwd: process.cwd() });
    await execAsync(`git merge ${branchName}`, { cwd: process.cwd() });

    // Mark task as completed after successful merge (only if validation passed)
    if (worker.validationPassed === true) {
      try {
        await updateTaskStatus(worker.taskId, TaskStatus.COMPLETED);
        console.error(`✅ Task ${worker.taskId} marked as completed after successful merge`);
      } catch {
        // Task completion error logging disabled
      }
    } else {
      // Task validation warning disabled
    }

    // Clean up worktree after successful merge
    if (worker.worktreeManager && worker.worktreePath) {
      try {
        await worker.worktreeManager.removeWorktree(worker.worktreePath);
        console.error(`🧹 Cleaned up worktree ${worker.worktreePath} after successful merge`);
      } catch {
        // Worktree cleanup error logging disabled
      }
    }

    res.json({
      success: true,
      data: {
        message: `Successfully merged changes from worktree ${workerId}`,
        workerId,
        mergedBranch: branchName,
        hasChanges: !!statusOutput.trim(),
        worktreeCleaned: true,
      },
    });
  } catch (error) {
    console.error(`Error merging worktree for worker ${workerId}:`, error);
    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: `Failed to merge worktree: ${(error as Error).message}`,
    });
  }
});

/**
 * Open worktree in VSCode
 */
router.post('/:workerId/open-vscode', async (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  if (!worker.worktreePath) {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: 'No worktree associated with this worker',
    });
  }

  try {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);

    // Check if the worktree directory exists
    if (!fs.existsSync(worker.worktreePath)) {
      return res.status(HTTP_NOT_FOUND).json({
        success: false,
        error: 'Worktree directory not found',
      });
    }

    // Try to open in VSCode - using 'code' command
    await execAsync(`code "${worker.worktreePath}"`, {
      timeout: VSCODE_TIMEOUT_MS, // 10 second timeout
    });

    res.json({
      success: true,
      data: {
        message: `Opened worktree in VSCode: ${worker.worktreePath}`,
        workerId,
        worktreePath: worker.worktreePath,
      },
    });
  } catch (error) {
    console.error(`Error opening VSCode for worker ${workerId}:`, error);

    // Provide helpful error message if 'code' command not found
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
      return res.status(HTTP_INTERNAL_SERVER_ERROR).json({
        success: false,
        error:
          'VSCode command line tools not installed. Install VSCode and enable shell command integration.',
      });
    }

    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: `Failed to open VSCode: ${errorMessage}`,
    });
  }
});

/**
 * Get blocked commands for a specific worker
 */
router.get('/:workerId/blocked-commands', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  res.json({
    success: true,
    data: {
      workerId,
      blockedCommands: worker.blockedCommands,
      blockedCommandsList: worker.blockedCommandsList,
      hasPermissionSystem: !!worker.interceptor,
    },
  });
});

/**
 * Get validation runs for a specific worker
 */
router.get('/:workerId/validation-runs', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  res.json({
    success: true,
    data: {
      workerId,
      validationRuns: worker.validationRuns || [],
      totalRuns: worker.validationRuns?.length || 0,
      lastRun:
        worker.validationRuns?.length > 0
          ? worker.validationRuns[worker.validationRuns.length - 1]
          : null,
    },
  });
});

/**
 * Get specific validation run details
 */
router.get('/:workerId/validation-runs/:runId', (req, res) => {
  const { workerId, runId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  const validationRun = worker.validationRuns?.find(run => run.id === runId);

  if (!validationRun) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Validation run not found',
    });
  }

  // Try to read metrics file if available
  let metrics = null;
  if (validationRun.metricsFile) {
    try {
      const metricsContent = fs.readFileSync(validationRun.metricsFile, 'utf-8');
      metrics = JSON.parse(metricsContent);
    } catch {
      // Metrics file read warning disabled
    }
  }

  res.json({
    success: true,
    data: {
      workerId,
      runId,
      validationRun,
      metrics,
    },
  });
});

/**
 * Get log statistics
 */
router.get('/logs/stats', async (req, res) => {
  try {
    const stats = await logManager.getLogStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting log stats:', error);
    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to get log statistics',
    });
  }
});

/**
 * Clean up old logs
 */
router.post('/logs/cleanup', async (req, res) => {
  try {
    console.error('🧹 Starting manual log cleanup...');
    await logManager.organizeLogs();
    const cleanupResult = await logManager.cleanupLogs();

    res.json({
      success: true,
      data: {
        message: 'Log cleanup completed successfully',
        ...cleanupResult,
      },
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to cleanup logs',
    });
  }
});

/**
 * Enhanced log streaming endpoint with normalized entries
 */
router.get('/:workerId/enhanced-logs', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  // Set up Server-Sent Events
  res.writeHead(HTTP_OK, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  let lastLogIndex = 0;
  let lastEntryIndex = 0;

  const sendUpdate = () => {
    try {
      const patches: Array<{ op: string; path: string; value: unknown }> = [];

      // Send new structured entries if available
      if (worker.structuredEntries && worker.structuredEntries.length > lastEntryIndex) {
        const newEntries = worker.structuredEntries.slice(lastEntryIndex);
        lastEntryIndex = worker.structuredEntries.length;

        newEntries.forEach(entry => {
          patches.push({
            op: 'add',
            path: `/entries/-`,
            value: {
              type: 'NORMALIZED_ENTRY',
              content: {
                entry_type: { type: entry.type },
                content: entry.content,
                metadata: entry.metadata,
                // Removed timestamp to prevent constant rerenders
              },
            },
          });
        });
      }

      // Fallback to raw logs only if no structured entries are available yet
      if (
        worker.structuredEntries.length === 0 &&
        worker.logFile &&
        fs.existsSync(worker.logFile)
      ) {
        try {
          const logs = fs.readFileSync(worker.logFile, 'utf-8');
          const logLines = logs.split('\n').filter(line => line.trim());

          if (logLines.length > lastLogIndex) {
            const newLines = logLines.slice(lastLogIndex);
            lastLogIndex = logLines.length;

            newLines.forEach(line => {
              // Determine if stderr or stdout based on content
              const isStderr =
                line.includes('STDERR:') || line.includes('Error:') || line.includes('❌');
              patches.push({
                op: 'add',
                path: `/entries/-`,
                value: {
                  type: isStderr ? 'STDERR' : 'STDOUT',
                  content: line,
                },
              });
            });
          }
        } catch (logError) {
          console.error(`Failed to read log file for worker ${workerId}:`, logError);
        }
      }

      if (patches.length > 0) {
        res.write(`event: json_patch\n`);
        res.write(`data: ${JSON.stringify(patches)}\n\n`);
      }
    } catch (error) {
      console.error(`Error sending enhanced log update for worker ${workerId}:`, error);
    }
  };

  // Send initial state
  sendUpdate();

  // Set up polling for updates
  const intervalId = setInterval(sendUpdate, POLLING_INTERVAL_MS);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
  });

  // Send finished event when worker completes
  const checkCompletion = () => {
    if (
      worker.status === 'completed' ||
      worker.status === 'failed' ||
      worker.status === 'stopped'
    ) {
      res.write(`event: finished\n`);
      res.write(`data: ${JSON.stringify({ status: worker.status })}\n\n`);
      clearInterval(intervalId);
      clearInterval(completionCheckId);
      res.end();
    }
  };

  const completionCheckId = setInterval(checkCompletion, COMPLETION_CHECK_INTERVAL_MS);
});

/**
 * Send follow-up comment to a running worker
 */
router.post('/:workerId/follow-up', (req, res) => {
  const { workerId } = req.params;
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: 'Prompt is required',
    });
  }

  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  if (worker.status !== 'running') {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: 'Worker is not running',
    });
  }

  if (!worker.process?.stdin) {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: 'Worker process is not available for input',
    });
  }

  try {
    // Send the prompt to the Claude process stdin
    worker.process.stdin.write(prompt + '\n');

    // Log the follow-up action
    const logEntry = `[FOLLOW-UP] User sent prompt: ${prompt.substring(0, STRING_TRUNCATE_LENGTH)}${prompt.length > STRING_TRUNCATE_LENGTH ? '...' : ''}`;
    fs.appendFileSync(worker.logFile, `\n${new Date().toISOString()} ${logEntry}\n`);

    // Add to structured entries
    worker.structuredEntries.push({
      type: 'follow_up',
      content: prompt,
      timestamp: new Date().toISOString(),
      metadata: {
        workerId,
        taskId: worker.taskId,
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Follow-up prompt sent successfully',
        workerId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to send follow-up:', error);
    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to send follow-up prompt',
    });
  }
});

/**
 * Merge changes from worker's worktree
 */
router.post('/:workerId/merge', async (req, res) => {
  const { workerId } = req.params;
  const { commitMessage } = req.body;

  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(HTTP_NOT_FOUND).json({
      success: false,
      error: 'Worker not found',
    });
  }

  if (!worker.worktreeManager || !worker.worktreePath) {
    return res.status(HTTP_BAD_REQUEST).json({
      success: false,
      error: 'Worker does not have a worktree',
    });
  }

  try {
    // Get the current branch from worktree
    const { execSync } = await import('child_process');
    const worktreePath = worker.worktreePath;

    // Check if there are changes to commit
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf8',
    });

    if (!status.trim()) {
      return res.status(HTTP_BAD_REQUEST).json({
        success: false,
        error: 'No changes to commit',
      });
    }

    // Stage all changes
    execSync('git add -A', { cwd: worktreePath });

    // Create commit message
    const defaultMessage = `Task ${worker.taskId}: ${worker.taskContent.substring(0, TASK_CONTENT_SUBSTRING_LENGTH)}...`;
    const finalMessage = commitMessage ?? defaultMessage;

    // Commit changes
    execSync(`git commit -m "${finalMessage}"`, { cwd: worktreePath });

    // Get commit hash
    const commitHash = execSync('git rev-parse HEAD', {
      cwd: worktreePath,
      encoding: 'utf8',
    }).trim();

    // Merge to main branch (or current branch)
    const currentBranch = execSync('git branch --show-current', {
      cwd: path.dirname(worktreePath),
      encoding: 'utf8',
    }).trim();

    // Cherry-pick the commit to main branch
    execSync(`git cherry-pick ${commitHash}`, {
      cwd: path.dirname(worktreePath),
    });

    // Log the merge action
    const logEntry = `[MERGE] Changes merged to ${currentBranch} branch with commit ${commitHash}`;
    fs.appendFileSync(worker.logFile, `\n${new Date().toISOString()} ${logEntry}\n`);

    // Add to structured entries
    worker.structuredEntries.push({
      type: 'merge',
      content: finalMessage,
      timestamp: new Date().toISOString(),
      metadata: {
        workerId,
        taskId: worker.taskId,
        commitHash,
        targetBranch: currentBranch,
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Changes merged successfully',
        commitHash,
        targetBranch: currentBranch,
        commitMessage: finalMessage,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to merge changes:', error);
    res.status(HTTP_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: `Failed to merge changes: ${errorMessage}`,
    });
  }
});

export default router;
