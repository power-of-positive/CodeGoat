import express from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CommandInterceptor, formatCommandAnalysis } from '../utils/command-interceptor';
// import { WinstonLogger } from '../logger-winston';

const router = express.Router();

interface ClaudeWorker {
  id: string;
  taskId: string;
  taskContent: string;
  process: ChildProcess | null;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped';
  startTime: Date;
  endTime?: Date;
  logFile: string;
  pid?: number;
  interceptor?: CommandInterceptor;
  blockedCommands: number;
}

// In-memory storage for active workers
const activeWorkers = new Map<string, ClaudeWorker>();

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
    const workDir = workingDirectory || process.cwd();

    // Create command interceptor for permission checking  
    // Using console as a simplified logger interface
    const logger = {
      debug: console.debug.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any; // Type assertion to bypass complex WinstonLogger interface
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
      blockedCommands: 0
    };

    activeWorkers.set(workerId, worker);

    // Prepare Claude Code command
    const claudeCommand = 'claude-code';
    const claudeArgs = [
      '--message', taskContent,
      '--cwd', workDir,
      '--no-confirm',
      '--format', 'json'
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

    // Create log file stream
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // Log initial info
    logStream.write(`=== Claude Code Worker ${workerId} Started ===\n`);
    logStream.write(`Task ID: ${taskId}\n`);
    logStream.write(`Task Content: ${taskContent}\n`);
    logStream.write(`Working Directory: ${workDir}\n`);
    logStream.write(`Start Time: ${worker.startTime.toISOString()}\n`);
    logStream.write(`PID: ${claudeProcess.pid}\n`);
    logStream.write(`Command: ${claudeCommand} ${claudeArgs.join(' ')}\n`);
    logStream.write('=== Output ===\n');

    // Handle process output with command monitoring
    claudeProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      const monitoredOutput = monitorCommandOutput(worker, output);
      logStream.write(`STDOUT: ${monitoredOutput}`);
      console.error(`[${workerId}] ${output.trim()}`);
    });

    claudeProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      const monitoredOutput = monitorCommandOutput(worker, output);
      logStream.write(`STDERR: ${monitoredOutput}`);
      console.error(`[${workerId}] ${output.trim()}`);
    });

    // Handle process completion
    claudeProcess.on('close', (code) => {
      worker.endTime = new Date();
      worker.status = code === 0 ? 'completed' : 'failed';
      
      const duration = worker.endTime.getTime() - worker.startTime.getTime();
      logStream.write(`\n=== Process Completed ===\n`);
      logStream.write(`Exit Code: ${code}\n`);
      logStream.write(`End Time: ${worker.endTime.toISOString()}\n`);
      logStream.write(`Duration: ${duration}ms\n`);
      logStream.end();

      console.error(`🏁 Claude Code worker ${workerId} completed with exit code ${code}`);
      
      // Auto-start next task if this one completed successfully
      if (code === 0) {
        setTimeout(() => autoStartNextTask(workerId), 1000);
      }
    });

    claudeProcess.on('error', (error) => {
      worker.status = 'failed';
      worker.endTime = new Date();
      
      logStream.write(`\n=== Process Error ===\n`);
      logStream.write(`Error: ${error.message}\n`);
      logStream.end();

      console.error(`❌ Claude Code worker ${workerId} failed:`, error);
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
    hasPermissionSystem: !!worker.interceptor
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
 * Auto-start next pending task
 */
async function autoStartNextTask(completedWorkerId: string) {
  try {
    console.error(`🔄 Looking for next pending task after ${completedWorkerId} completion`);
    
    // This would integrate with your task API to get next pending task
    // For now, this is a placeholder
    const response = await fetch('http://localhost:3000/api/tasks');
    const tasksData = await response.json() as { data?: Array<{ id: string; content: string; status: string }> };
    
    const pendingTask = tasksData.data?.find((task) => task.status === 'pending');
    
    if (pendingTask) {
      console.error(`🚀 Auto-starting next task: ${pendingTask.id}`);
      
      // Start new worker for next task
      const startResponse = await fetch('http://localhost:3000/api/claude-workers/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: pendingTask.id,
          taskContent: pendingTask.content
        })
      });
      
      if (startResponse.ok) {
        console.error(`✅ Successfully started worker for task ${pendingTask.id}`);
      }
    } else {
      console.error(`✅ No more pending tasks - all done!`);
    }
  } catch (error) {
    console.error('Error auto-starting next task:', error);
  }
}

export default router;