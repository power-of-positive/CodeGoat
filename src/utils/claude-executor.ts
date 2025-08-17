import { spawn, ChildProcess } from 'child_process';
import { WinstonLogger } from '../logger-winston';
import { PermissionManager, ActionType, PermissionContext } from './permissions';

export interface ClaudeExecutorOptions {
  worktreeDir: string;
  claudeCommand: string;
  permissionManager?: PermissionManager;
}

export interface ClaudeExecutorResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * ClaudeCodeExecutor: TypeScript Executor for running Claude CLI agent
 * 
 * Provides a programmatic interface for running the Claude CLI agent in a specified 
 * worktree directory, sending it a prompt, and collecting its output. Designed to 
 * mirror the behavior of the Rust-based executor in the original backend.
 */
export class ClaudeCodeExecutor {
  private readonly worktreeDir: string;
  private readonly claudeCommand: string;
  private readonly logger?: WinstonLogger;
  private readonly permissionManager?: PermissionManager;

  constructor(options: ClaudeExecutorOptions, logger?: WinstonLogger) {
    this.worktreeDir = options.worktreeDir;
    this.claudeCommand = options.claudeCommand;
    this.logger = logger;
    this.permissionManager = options.permissionManager;
  }

  /**
   * Spawns Claude agent process with the given prompt and collects output
   */
  async spawn(prompt: string): Promise<ClaudeExecutorResult> {
    // Check permissions before executing
    if (this.permissionManager) {
      const context: PermissionContext = {
        action: ActionType.CLAUDE_EXECUTE,
        worktreeDir: this.worktreeDir,
        additionalData: { prompt, command: this.claudeCommand }
      };
      
      this.permissionManager.requirePermission(context);
    }

    this.logger?.info('Starting Claude executor', {
      worktreeDir: this.worktreeDir,
      command: this.claudeCommand
    });

    return new Promise((resolve, reject) => {
      try {
        // Parse the command into executable and arguments
        const [executable, ...args] = this.parseShellCommand(this.claudeCommand);
        
        this.logger?.debug('Parsed command', { executable, args });

        // Spawn the process
        const childProcess: ChildProcess = spawn(executable, args, {
          cwd: this.worktreeDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
        });

        let stdout = '';
        let stderr = '';

        // Collect stdout data
        if (childProcess.stdout) {
          childProcess.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString();
            stdout += chunk;
            this.logger?.debug('Claude stdout chunk', { chunk });
          });
        }

        // Collect stderr data
        if (childProcess.stderr) {
          childProcess.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            stderr += chunk;
            this.logger?.debug('Claude stderr chunk', { chunk });
          });
        }

        // Handle process errors
        childProcess.on('error', (error: Error) => {
          this.logger?.error('Claude process error', error);
          reject(new Error(`Failed to start Claude process: ${error.message}`));
        });

        // Handle process exit
        childProcess.on('close', (code: number | null, signal: string | null) => {
          const exitCode = code ?? -1;
          
          this.logger?.info('Claude process completed', {
            exitCode,
            signal,
            stdoutLength: stdout.length,
            stderrLength: stderr.length
          });

          resolve({
            stdout,
            stderr,
            exitCode
          });
        });

        // Send the prompt to stdin and close the stream
        if (childProcess.stdin) {
          this.logger?.debug('Sending prompt to Claude', { promptLength: prompt.length });
          childProcess.stdin.write(prompt);
          childProcess.stdin.end();
        } else {
          reject(new Error('Failed to access Claude process stdin'));
        }

      } catch (error) {
        this.logger?.error('Error spawning Claude process', error as Error);
        reject(error);
      }
    });
  }

  /**
   * Parses a shell command string into executable and arguments array
   * Handles quoted arguments properly
   */
  private parseShellCommand(cmd: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        // Start of quoted string
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        // End of quoted string
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes && char === ' ') {
        // Space outside quotes - end current argument
        if (current.length > 0) {
          result.push(current);
          current = '';
        }
      } else if (!inQuotes && char === '\\' && i + 1 < cmd.length) {
        // Escape sequence outside quotes
        i++; // Skip the backslash
        current += cmd[i];
      } else {
        // Regular character
        current += char;
      }
    }
    
    // Add the last argument if any
    if (current.length > 0) {
      result.push(current);
    }
    
    return result;
  }

  /**
   * Gets the working directory for this executor
   */
  getWorktreeDir(): string {
    return this.worktreeDir;
  }

  /**
   * Gets the Claude command for this executor
   */
  getClaudeCommand(): string {
    return this.claudeCommand;
  }

  /**
   * Check if a specific action is permitted without executing it
   */
  checkPermission(action: ActionType, target?: string): boolean {
    if (!this.permissionManager) {
      return true; // No permission manager means everything is allowed
    }

    const context: PermissionContext = {
      action,
      // Don't pass target for CLAUDE_EXECUTE as it's not a file path
      target: action === ActionType.CLAUDE_EXECUTE ? undefined : target,
      worktreeDir: this.worktreeDir,
    };

    const result = this.permissionManager.checkPermission(context);
    return result.allowed;
  }

  /**
   * Get the permission manager instance
   */
  getPermissionManager(): PermissionManager | undefined {
    return this.permissionManager;
  }

  /**
   * Check if execution is permitted for this executor
   */
  isExecutionPermitted(): boolean {
    return this.checkPermission(ActionType.CLAUDE_EXECUTE, this.claudeCommand);
  }
}