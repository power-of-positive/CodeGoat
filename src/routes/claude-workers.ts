import express from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CommandInterceptor, formatCommandAnalysis } from '../utils/command-interceptor';
import { WorktreeManager } from '../utils/worktree-manager';
import { ValidationRunner } from '../../scripts/validate-task';
import { getDatabaseService } from '../services/database';
import { TodoStatus } from '@prisma/client';
// import { WinstonLogger } from '../logger-winston';

const router = express.Router();

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
  structuredEntries: Array<{
    timestamp: string;
    type: string;
    content: string;
    metadata?: unknown;
  }>;
  validationPassed?: boolean;
}

// In-memory storage for active workers
const activeWorkers = new Map<string, ClaudeWorker>();

/**
 * Update task status in database
 */
async function updateTaskStatus(taskId: string, status: TodoStatus, workerId?: string): Promise<void> {
  try {
    const db = getDatabaseService();
    
    // Check if task exists
    const existingTask = await db.todoTask.findUnique({
      where: { id: taskId }
    });
    
    if (!existingTask) {
      console.warn(`⚠️ Task ${taskId} not found in database`);
      return;
    }
    
    // Prepare update data
    const updateData: {
      status: TodoStatus;
      executorId?: string;
      startTime?: Date;
      endTime?: Date;
    } = {
      status
    };
    
    // Set executor when starting task
    if (status === TodoStatus.IN_PROGRESS && workerId) {
      updateData.executorId = workerId;
      updateData.startTime = new Date();
    }
    
    // Set end time when completing task
    if (status === TodoStatus.COMPLETED) {
      updateData.endTime = new Date();
    }
    
    await db.todoTask.update({
      where: { id: taskId },
      data: updateData
    });
    
    console.error(`📝 Updated task ${taskId} status to ${status}${workerId ? ` (executor: ${workerId})` : ''}`);
    
  } catch (error) {
    console.error(`❌ Failed to update task ${taskId} status:`, error);
  }
}

/**
 * Run validation checks after worker completion
 */
async function runValidationChecks(worker: ClaudeWorker): Promise<boolean> {
  try {
    console.error(`🔍 Running validation checks for worker ${worker.id}...`);
    worker.status = 'validating';
    
    // Write to log file
    const logMessage = `\n=== Running Validation Checks ===\n` +
      `Worker: ${worker.id}\n` +
      `Task: ${worker.taskId}\n` +
      `Started at: ${new Date().toISOString()}\n\n`;
    
    try {
      fs.appendFileSync(worker.logFile, logMessage);
    } catch (logError) {
      console.error(`Failed to write validation start log for worker ${worker.id}:`, logError);
    }

    // Create validation runner with session ID based on worker ID
    const runner = new ValidationRunner({ 
      sessionId: worker.id,
      settingsPath: path.join(process.cwd(), 'settings.json')
    });

    const success = await runner.runValidation();
    await runner.cleanup();

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
    } else {
      console.error(`❌ Validation checks failed for worker ${worker.id}`);
    }

    return success;
  } catch (error) {
    console.error(`⚠️ Error running validation for worker ${worker.id}:`, error);
    worker.validationPassed = false;

    try {
      fs.appendFileSync(worker.logFile, `❌ Validation error: ${(error as Error).message}\n`);
    } catch (logError) {
      console.error(`Failed to write validation error log for worker ${worker.id}:`, logError);
    }

    return false;
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
      /^[a-zA-Z_][a-zA-Z0-9_-]*\s+/
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
            suggestion: analysis.suggestion
          });
          
          const blockMessage = `\n🚫 COMMAND BLOCKED: ${formatCommandAnalysis(analysis)}\n`;
          monitoredLine += blockMessage;
          
          console.error(`[PERMISSION DENIED] Worker ${worker.id}: ${command}`);
          console.error(`Reason: ${analysis.reason}`);
        } else if (analysis.severity === 'warning') {
          const warningMessage = `\n⚠️  COMMAND WARNING: ${formatCommandAnalysis(analysis)}\n`;
          monitoredLine += warningMessage;
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
  if (!trimmed) return true;
  
  // Skip pure output/log messages
  if (/^(error|warning|info|debug|log):/i.test(trimmed)) return true;
  
  // Skip URLs
  if (/^https?:\/\//.test(trimmed)) return true;
  
  // Skip file paths without command context
  if (/^[./~]/.test(trimmed) && !trimmed.includes(' ')) return true;
  
  // Skip numbers/timestamps
  if (/^\d+([:.]\d+)*$/.test(trimmed)) return true;
  
  // Skip JSON-like content
  if (/^[{[]/.test(trimmed)) return true;
  
  return false;
}

/**
 * Generate unique worker ID
 */
function generateWorkerId(): string {
  return `claude-worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process Claude JSON output into structured entries
 */
function processClaudeJson(claudeJson: unknown): Array<{timestamp: string; type: string; content: string; metadata?: unknown}> {
  const timestamp = new Date().toISOString();
  
  if (!claudeJson || typeof claudeJson !== 'object') return [];
  const typedJson = claudeJson as Record<string, unknown>;
  const type = typeof typedJson.type === 'string' ? typedJson.type : undefined;
  const subtype = typeof typedJson.subtype === 'string' ? typedJson.subtype : undefined;
  const model = typeof typedJson.model === 'string' ? typedJson.model : undefined;
  const tool_name = typeof typedJson.tool_name === 'string' ? typedJson.tool_name : undefined;
  const is_error = typeof typedJson.is_error === 'boolean' ? typedJson.is_error : false;
  
  switch (type) {
    case 'system': {
      if (subtype === 'init') {
        return [{
          timestamp,
          type: 'SystemInit',
          content: `System initialized${model ? ` with model: ${model}` : ''}`,
          metadata: claudeJson
        }];
      }
      return [{
        timestamp,
        type: 'SystemMessage',
        content: subtype ? `System: ${subtype}` : 'System message',
        metadata: claudeJson,
      }];
    }
    case 'assistant': {
      const message = typedJson.message;
      const entries: Array<{timestamp: string; type: string; content: string; metadata?: unknown}> = [];
      
      if (message && typeof message === 'object') {
        const messageObj = message as Record<string, unknown>;
        const content = messageObj.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            const entry = contentItemToEntry(item, 'assistant', timestamp);
            if (entry) entries.push(entry);
          }
        }
      }
      return entries;
    }
    case 'user': {
      const message = typedJson.message;
      const entries: Array<{timestamp: string; type: string; content: string; metadata?: unknown}> = [];
      
      if (message && typeof message === 'object') {
        const messageObj = message as Record<string, unknown>;
        const content = messageObj.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            const entry = contentItemToEntry(item, 'user', timestamp);
            if (entry) entries.push(entry);
          }
        }
      }
      return entries;
    }
    case 'tool_use': {
      return [{
        timestamp,
        type: 'ToolUse',
        content: `Tool use: ${tool_name || 'unknown'}`,
        metadata: claudeJson,
      }];
    }
    case 'tool_result':
    case 'result':
      if (is_error) {
        return [{
          timestamp,
          type: 'Error',
          content: `Tool result error: ${JSON.stringify(typedJson.result)}`,
          metadata: claudeJson
        }];
      }
      return [];
    default:
      return [{
        timestamp,
        type: 'SystemMessage',
        content: 'Unrecognized JSON message from Claude',
        metadata: claudeJson
      }];
  }
}

/**
 * Convert Claude content item to entry
 */
function contentItemToEntry(item: unknown, role: string, timestamp: string): {timestamp: string; type: string; content: string; metadata: unknown} | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const typedItem = item as Record<string, unknown>;
  const type = typeof typedItem.type === 'string' ? typedItem.type : undefined;
  const text = typeof typedItem.text === 'string' ? typedItem.text : '';
  const thinking = typeof typedItem.thinking === 'string' ? typedItem.thinking : '';
  const name = typeof typedItem.name === 'string' ? typedItem.name : 'unknown';
  
  switch (type) {
    case 'text':
      return {
        timestamp,
        type: role === 'user' ? 'UserMessage' : 'AssistantMessage',
        content: text,
        metadata: item,
      };
    case 'thinking':
      return {
        timestamp,
        type: 'Thinking',
        content: thinking,
        metadata: item,
      };
    case 'tool_use':
      return {
        timestamp,
        type: 'ToolUse',
        content: `Tool use: ${name}`,
        metadata: item,
      };
    default:
      return undefined;
  }
}

/**
 * Create log directory if it doesn't exist
 */
function ensureLogDirectory(): string {
  const logDir = path.join(process.cwd(), 'claude-worker-logs');
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
      return res.status(400).json({
        success: false,
        error: 'taskId and taskContent are required'
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
          workerId
        });
      }
    } catch (error) {
      console.error(`Failed to create worktree for worker ${workerId}:`, error);
      return res.status(500).json({
        success: false,
        error: `Failed to create worktree: ${(error as Error).message}`
      });
    }

    // Create command interceptor for permission checking  
    // Using console as a simplified logger interface
    const logger = {
      // eslint-disable-next-line no-console
      debug: console.debug.bind(console),
      // eslint-disable-next-line no-console  
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
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
      structuredEntries: []
    };

    activeWorkers.set(workerId, worker);

    // Prepare Claude Code command with proper npx usage and JSON streaming
    // Send prompt via stdin like the example-ts-backend does
    const claudeCommand = 'npx';
    const claudeArgs = [
      '-y', '@anthropic-ai/claude-code@latest',
      '-p', 
      '--dangerously-skip-permissions',
      '--verbose',
      '--output-format=stream-json'
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
        CLAUDE_WORKER_ID: workerId
      }
    });

    worker.process = claudeProcess;
    worker.pid = claudeProcess.pid;
    worker.status = 'running';

    // Update task status to in_progress when worker starts
    try {
      await updateTaskStatus(taskId, TodoStatus.IN_PROGRESS, workerId);
    } catch (error) {
      console.error(`⚠️ Failed to update task status for ${taskId}:`, error);
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
    
    claudeProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.error(`[${workerId}] STDOUT: ${output.length} bytes received`);
      const monitoredOutput = monitorCommandOutput(worker, output);
      logStream.write(`STDOUT: ${monitoredOutput}`);
      
      // Process JSON stream lines
      const lines = output.split('\n').filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const entries = processClaudeJson(json);
          worker.structuredEntries.push(...entries);
        } catch {
          // Not JSON, treat as regular output
          worker.structuredEntries.push({
            timestamp: new Date().toISOString(),
            type: 'SystemMessage',
            content: line,
          });
        }
      }
    });

    claudeProcess.stderr?.on('data', (data) => {
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
      console.error(`[${workerId}] Sending prompt via stdin: ${taskContent.substring(0, 100)}...`);
      logStream.write(`Sending prompt via stdin: ${taskContent}\n`);
      claudeProcess.stdin.write(taskContent);
      claudeProcess.stdin.end();
    } else {
      console.error(`[${workerId}] ERROR: stdin not available`);
      logStream.write('ERROR: stdin not available\n');
    }

    // Handle process completion
    claudeProcess.on('close', async (code) => {
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
            logStream.write(`Status: TERMINATED - Process was killed by signal (likely SIGTERM from manual stop)\n`);
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
            const validationPassed = await runValidationChecks(worker);
            worker.status = validationPassed ? 'completed' : 'failed';
            
            if (validationPassed) {
              console.error(`✅ Worker ${workerId} passed validation, marking task as completed`);
              // Task will be marked as completed when merge happens (task 5)
            } else {
              console.error(`❌ Worker ${workerId} failed validation checks`);
            }
          } catch (validationError) {
            console.error(`⚠️ Validation error for worker ${workerId}:`, validationError);
            worker.status = 'failed';
            worker.validationPassed = false;
          }
        } else {
          worker.status = 'failed';
          console.error(`❌ Worker ${workerId} failed with exit code ${code}`);
        }

        // Clean up worktree after completion
        if (worker.worktreeManager && worker.worktreePath && !workingDirectory) {
          worker.worktreeManager.removeWorktree(worker.worktreePath)
            .then(() => {
              console.error(`🧹 Cleaned up worktree for worker ${workerId}`);
            })
            .catch(cleanupError => {
              console.error(`⚠️ Failed to cleanup worktree for worker ${workerId}:`, cleanupError);
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
    });

    claudeProcess.on('error', (error) => {
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
          worker.worktreeManager.removeWorktree(worker.worktreePath)
            .then(() => {
              console.error(`🧹 Cleaned up worktree for failed worker ${workerId}`);
            })
            .catch(cleanupError => {
              console.error(`⚠️ Failed to cleanup worktree for failed worker ${workerId}:`, cleanupError);
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
        startTime: worker.startTime
      }
    });

  } catch (error) {
    console.error('Error starting Claude Code worker:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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
    taskContent: worker.taskContent.substring(0, 100) + '...',
    status: worker.status,
    startTime: worker.startTime,
    endTime: worker.endTime,
    pid: worker.pid,
    logFile: worker.logFile,
    blockedCommands: worker.blockedCommands,
    hasPermissionSystem: !!worker.interceptor,
    validationPassed: worker.validationPassed
  }));

  res.json({
    success: true,
    data: {
      workers,
      activeCount: workers.filter(w => w.status === 'running').length,
      totalCount: workers.length,
      totalBlockedCommands: workers.reduce((sum, w) => sum + w.blockedCommands, 0)
    }
  });
});

/**
 * Get specific worker status
 */
router.get('/:workerId', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(404).json({
      success: false,
      error: 'Worker not found'
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
      logFile: worker.logFile
    }
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
      stoppedCount
    }
  });
});

/**
 * Clear completed/failed workers from memory
 */
router.post('/clear', (req, res) => {
  const before = activeWorkers.size;
  
  for (const [workerId, worker] of activeWorkers.entries()) {
    if (worker.status === 'completed' || worker.status === 'failed' || worker.status === 'stopped') {
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
      remainingCount: after
    }
  });
});

/**
 * Stop a specific worker
 */
router.post('/:workerId/stop', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(404).json({
      success: false,
      error: 'Worker not found'
    });
  }

  if (worker.process && worker.status === 'running') {
    console.error(`🛑 Stopping Claude Code worker ${workerId}`);
    
    // Write termination reason to log file before killing process
    try {
      const logMessage = `\n=== Manual Termination ===\n` +
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
      status: worker.status
    }
  });
});

/**
 * Get worker logs
 */
router.get('/:workerId/logs', (req, res) => {
  const { workerId } = req.params;
  const worker = activeWorkers.get(workerId);

  if (!worker) {
    return res.status(404).json({
      success: false,
      error: 'Worker not found'
    });
  }

  try {
    const logs = fs.readFileSync(worker.logFile, 'utf-8');
    res.json({
      success: true,
      data: {
        workerId,
        logs,
        logFile: worker.logFile
      }
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to read log file'
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
    return res.status(404).json({
      success: false,
      error: 'Worker not found'
    });
  }

  res.json({
    success: true,
    data: {
      workerId,
      entries: worker.structuredEntries,
      totalEntries: worker.structuredEntries.length,
      lastUpdate: worker.structuredEntries.length > 0 
        ? worker.structuredEntries[worker.structuredEntries.length - 1].timestamp 
        : worker.startTime.toISOString()
    }
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
      if (worker.status === 'completed' || worker.status === 'failed' || worker.status === 'stopped') {
        try {
          // Extract task info from worktree path if it exists
          const worktreePath = path.join(worktreeBaseDir, `worktree-${worker.taskId}-${workerId.split('-').pop()}`);
          await fs.promises.rm(worktreePath, { recursive: true, force: true });
          cleanedCount++;
        } catch (error) {
          console.warn(`Failed to cleanup worktree for worker ${workerId}:`, error);
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        message: `Cleaned up ${cleanedCount} worktrees`,
        cleanedCount
      }
    });
  } catch (error) {
    console.error('Error cleaning up worktrees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup worktrees'
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
    return res.status(404).json({
      success: false,
      error: 'Worker not found'
    });
  }

  if (!worker.worktreePath) {
    return res.status(400).json({
      success: false,
      error: 'No worktree associated with this worker'
    });
  }

  try {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);

    // Check if there are any changes to commit
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { 
      cwd: worker.worktreePath 
    });

    if (statusOutput.trim()) {
      // Commit changes in worktree
      await execAsync('git add .', { cwd: worker.worktreePath });
      await execAsync(`git commit -m "Task ${worker.taskId}: Changes from worker ${workerId}"`, { 
        cwd: worker.worktreePath 
      });
    }

    // Get current branch in worktree
    const { stdout: currentBranch } = await execAsync('git branch --show-current', { 
      cwd: worker.worktreePath 
    });
    
    const branchName = currentBranch.trim() || 'HEAD';

    // Switch to main branch and merge
    await execAsync('git checkout main', { cwd: process.cwd() });
    await execAsync(`git merge ${branchName}`, { cwd: process.cwd() });

    // Mark task as completed after successful merge (only if validation passed)
    if (worker.validationPassed === true) {
      try {
        await updateTaskStatus(worker.taskId, TodoStatus.COMPLETED);
        console.error(`✅ Task ${worker.taskId} marked as completed after successful merge`);
      } catch (error) {
        console.error(`⚠️ Failed to mark task ${worker.taskId} as completed:`, error);
      }
    } else {
      console.warn(`⚠️ Task ${worker.taskId} not marked as completed - validation did not pass`);
    }

    res.json({
      success: true,
      data: {
        message: `Successfully merged changes from worktree ${workerId}`,
        workerId,
        mergedBranch: branchName,
        hasChanges: !!statusOutput.trim()
      }
    });

  } catch (error) {
    console.error(`Error merging worktree for worker ${workerId}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to merge worktree: ${(error as Error).message}`
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
    return res.status(404).json({
      success: false,
      error: 'Worker not found'
    });
  }

  if (!worker.worktreePath) {
    return res.status(400).json({
      success: false,
      error: 'No worktree associated with this worker'
    });
  }

  try {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);

    // Check if the worktree directory exists
    if (!fs.existsSync(worker.worktreePath)) {
      return res.status(404).json({
        success: false,
        error: 'Worktree directory not found'
      });
    }

    // Try to open in VSCode - using 'code' command
    await execAsync(`code "${worker.worktreePath}"`, { 
      timeout: 10000 // 10 second timeout
    });

    res.json({
      success: true,
      data: {
        message: `Opened worktree in VSCode: ${worker.worktreePath}`,
        workerId,
        worktreePath: worker.worktreePath
      }
    });

  } catch (error) {
    console.error(`Error opening VSCode for worker ${workerId}:`, error);
    
    // Provide helpful error message if 'code' command not found
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
      return res.status(500).json({
        success: false,
        error: 'VSCode command line tools not installed. Install VSCode and enable shell command integration.'
      });
    }

    res.status(500).json({
      success: false,
      error: `Failed to open VSCode: ${errorMessage}`
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
    return res.status(404).json({
      success: false,
      error: 'Worker not found'
    });
  }

  res.json({
    success: true,
    data: {
      workerId,
      blockedCommands: worker.blockedCommands,
      blockedCommandsList: worker.blockedCommandsList,
      hasPermissionSystem: !!worker.interceptor
    }
  });
});


export default router;