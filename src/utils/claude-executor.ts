import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { WinstonLogger } from '../logger-winston';
import { PermissionManager, ActionType, PermissionContext } from './permissions';
import { orchestratorStreamManager } from './orchestrator-stream';

export interface ClaudeExecutorOptions {
  worktreeDir: string;
  claudeCommand: string;
  permissionManager?: PermissionManager;
  streamSessionId?: string; // For streaming output
  streamTaskId?: string; // For streaming output
}

export interface ClaudeExecutorResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ClaudeSettings {
  permissions?: {
    deny?: string[];
  };
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
  private readonly streamSessionId?: string;
  private readonly streamTaskId?: string;

  constructor(options: ClaudeExecutorOptions, logger?: WinstonLogger) {
    this.worktreeDir = options.worktreeDir;
    this.claudeCommand = options.claudeCommand;
    this.logger = logger;
    this.permissionManager = options.permissionManager;
    this.streamSessionId = options.streamSessionId;
    this.streamTaskId = options.streamTaskId;
  }

  /**
   * Get the worktree directory
   */
  getWorktreeDir(): string {
    return this.worktreeDir;
  }

  /**
   * Get the Claude command
   */
  getClaudeCommand(): string {
    return this.claudeCommand;
  }

  /**
   * Get the permission manager
   */
  getPermissionManager(): PermissionManager | undefined {
    return this.permissionManager;
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
        additionalData: { prompt, command: this.claudeCommand },
      };

      this.permissionManager.requirePermission(context);
    }

    // Check .claude/settings deny patterns
    this.validateCommand(this.claudeCommand);

    // Additional validation for common Claude Code operations based on prompt content
    this.validatePromptAgainstClaudeSettings(prompt);

    this.logger?.info('Starting Claude executor', {
      worktreeDir: this.worktreeDir,
      command: this.claudeCommand,
    });

    // Broadcast Claude start if streaming enabled
    if (this.streamSessionId && this.streamTaskId) {
      orchestratorStreamManager.broadcastClaudeStart(
        this.streamSessionId,
        this.streamTaskId,
        1,
        prompt
      );
    }

    return new Promise((resolve, reject) => {
      try {
        // Parse the command into executable and arguments
        const [executable, ...args] = this.parseShellCommand(this.claudeCommand);

        // Add the prompt as the final argument
        args.push(prompt);

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

            // Stream output if streaming enabled
            if (this.streamSessionId && this.streamTaskId) {
              orchestratorStreamManager.broadcastClaudeOutput(
                this.streamSessionId,
                this.streamTaskId,
                chunk,
                false
              );
            }
          });
        }

        // Collect stderr data
        if (childProcess.stderr) {
          childProcess.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            stderr += chunk;
            this.logger?.debug('Claude stderr chunk', { chunk });

            // Stream error output if streaming enabled
            if (this.streamSessionId && this.streamTaskId) {
              orchestratorStreamManager.broadcastClaudeOutput(
                this.streamSessionId,
                this.streamTaskId,
                chunk,
                true
              );
            }
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
            stderrLength: stderr.length,
          });

          resolve({
            stdout,
            stderr,
            exitCode,
          });
        });

        // Close stdin since we're using --print mode with prompt as argument
        if (childProcess.stdin) {
          childProcess.stdin.end();
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
   * Check if execution is permitted for this executor
   */
  isExecutionPermitted(): boolean {
    return this.checkPermission(ActionType.CLAUDE_EXECUTE, this.claudeCommand);
  }

  /**
   * Load .claude/settings.json deny patterns
   */
  private loadClaudeSettingsDenyPatterns(): string[] {
    try {
      const claudeSettingsPath = path.join(process.cwd(), '.claude/settings.json');

      if (!fs.existsSync(claudeSettingsPath)) {
        return [];
      }

      const settingsContent = fs.readFileSync(claudeSettingsPath, 'utf-8');
      const settings: ClaudeSettings = JSON.parse(settingsContent);

      return settings.permissions?.deny ?? [];
    } catch (error) {
      this.logger?.warn('Failed to load .claude/settings.json deny patterns', {
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Check if a command or file operation matches any .claude/settings deny pattern
   */
  private isCommandDeniedByClaudeSettings(
    action: string,
    target: string
  ): { denied: boolean; matchedPattern?: string } {
    const denyPatterns = this.loadClaudeSettingsDenyPatterns();

    for (const pattern of denyPatterns) {
      // Parse pattern format like "Update(settings.json)" or "Edit(*.ts)"
      const match = pattern.match(/^(\w+)\((.+)\)$/);
      if (match) {
        const [, patternAction, patternTarget] = match;

        // Check if action matches (case-insensitive)
        const actionMatches =
          action.toLowerCase() === patternAction.toLowerCase() ||
          (action.toLowerCase() === 'write' && patternAction.toLowerCase() === 'update') ||
          (action.toLowerCase() === 'write' && patternAction.toLowerCase() === 'edit');

        if (actionMatches) {
          // Check if target matches (supports basic wildcards)
          const targetMatches = this.matchesPattern(target, patternTarget);

          if (targetMatches) {
            return { denied: true, matchedPattern: pattern };
          }
        }
      } else {
        // Handle plain patterns (fallback for non-standard formats)
        if (target.includes(pattern) || this.matchesPattern(target, pattern)) {
          return { denied: true, matchedPattern: pattern };
        }
      }
    }

    return { denied: false };
  }

  /**
   * Simple pattern matching supporting wildcards (* and ?)
   */
  private matchesPattern(target: string, pattern: string): boolean {
    // Convert glob pattern to regex
    let regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');

    // Add anchors for exact matching
    regexPattern = '^' + regexPattern + '$';

    try {
      const regex = new RegExp(regexPattern, 'i'); // Case-insensitive
      return regex.test(target);
    } catch {
      // If regex is invalid, fall back to simple string matching
      return target.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  /**
   * Validate a potential file operation against .claude/settings deny patterns
   */
  validateFileOperation(
    action: 'read' | 'write' | 'delete' | 'update' | 'edit',
    filePath: string
  ): void {
    const result = this.isCommandDeniedByClaudeSettings(action, filePath);

    if (result.denied) {
      const error = new Error(
        `File operation denied by .claude/settings.json: ${action}(${filePath}) ` +
          `matches deny pattern "${result.matchedPattern}"`
      );
      this.logger?.warn('File operation blocked by Claude settings', {
        action,
        filePath,
        matchedPattern: result.matchedPattern,
      });
      throw error;
    }
  }

  /**
   * Validate a command against .claude/settings deny patterns
   */
  validateCommand(command: string): void {
    // Extract command name and potential file targets from the command
    const parts = command.split(' ');
    const baseCommand = parts[0];

    // Check common file operation patterns
    const fileOperationPatterns = [
      { commands: ['update', 'edit', 'write', 'modify'], action: 'update' },
      { commands: ['read', 'cat', 'less', 'view'], action: 'read' },
      { commands: ['delete', 'rm', 'remove'], action: 'delete' },
    ];

    for (const opPattern of fileOperationPatterns) {
      if (opPattern.commands.includes(baseCommand.toLowerCase())) {
        // Check if any arguments could be file paths
        for (let i = 1; i < parts.length; i++) {
          const arg = parts[i];

          // Skip flags/options starting with -
          if (arg.startsWith('-')) {
            continue;
          }

          // Check this argument as potential file target
          const result = this.isCommandDeniedByClaudeSettings(opPattern.action, arg);

          if (result.denied) {
            const error = new Error(
              `Command denied by .claude/settings.json: ${command} ` +
                `matches deny pattern "${result.matchedPattern}"`
            );
            this.logger?.warn('Command blocked by Claude settings', {
              command,
              matchedPattern: result.matchedPattern,
            });
            throw error;
          }
        }
      }
    }
  }

  /**
   * Validate a prompt for potential file operations mentioned in content
   */
  private validatePromptAgainstClaudeSettings(prompt: string): void {
    // Look for common file operation patterns in the prompt
    const fileOperationRegexes = [
      /(?:update|edit|modify|write to)\s+([^\s]+\.[a-zA-Z0-9]+)/gi, // "update file.ext"
      /(?:read|view|open)\s+([^\s]+\.[a-zA-Z0-9]+)/gi, // "read file.ext"
      /(?:delete|remove)\s+([^\s]+\.[a-zA-Z0-9]+)/gi, // "delete file.ext"
    ];

    const actionMap = {
      update: 'update',
      edit: 'update',
      modify: 'update',
      write: 'update',
      read: 'read',
      view: 'read',
      open: 'read',
      delete: 'delete',
      remove: 'delete',
    };

    for (const regex of fileOperationRegexes) {
      let match;
      while ((match = regex.exec(prompt)) !== null) {
        const [fullMatch, fileName] = match;
        const action = fullMatch.toLowerCase().split(' ')[0];
        const mappedAction = actionMap[action as keyof typeof actionMap];

        if (mappedAction) {
          const result = this.isCommandDeniedByClaudeSettings(mappedAction, fileName);

          if (result.denied) {
            const error = new Error(
              `Prompt contains denied file operation: ${action} ${fileName} ` +
                `matches deny pattern "${result.matchedPattern}"`
            );
            this.logger?.warn('Prompt blocked by Claude settings', {
              action,
              fileName,
              matchedPattern: result.matchedPattern,
            });
            throw error;
          }
        }
      }
    }
  }
}
