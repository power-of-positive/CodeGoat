import fs from 'fs/promises';
import path from 'path';
import {
  PermissionManager,
  ActionType,
  PermissionConfig,
  PermissionContext,
  DefaultPermissions,
} from './permissions';
import { WinstonLogger } from '../logger-winston';

/**
 * Command pattern definition
 */
interface CommandPattern {
  pattern: RegExp;
  action: ActionType;
  targetIndex: number;
}

/**
 * Command patterns and their corresponding permission actions
 */
const COMMAND_PATTERNS: CommandPattern[] = [
  // File operations
  {
    pattern: /^(cat|less|more|head|tail|grep|find|locate)\s+(.+)$/,
    action: ActionType.FILE_READ,
    targetIndex: 2,
  },
  { pattern: /^(vim|nano|emacs|code|subl)\s+(.+)$/, action: ActionType.FILE_WRITE, targetIndex: 2 },
  { pattern: /^(echo|tee|printf)\s+.*>\s*(.+)$/, action: ActionType.FILE_WRITE, targetIndex: 2 },
  { pattern: /^(cp|mv|rsync)\s+.*\s+(.+)$/, action: ActionType.FILE_WRITE, targetIndex: 2 },
  { pattern: /^(rm|unlink)\s+(.+)$/, action: ActionType.FILE_DELETE, targetIndex: 2 },
  { pattern: /^(mkdir|mktemp)\s+(.+)$/, action: ActionType.DIRECTORY_CREATE, targetIndex: 2 },
  {
    pattern: /^(rmdir|rm\s+-r|rm\s+-rf)\s+(.+)$/,
    action: ActionType.DIRECTORY_DELETE,
    targetIndex: 2,
  },

  // Network operations
  {
    pattern: /^(curl|wget|http|fetch)\s+(.+)$/,
    action: ActionType.NETWORK_REQUEST,
    targetIndex: 2,
  },
  { pattern: /^(nc|netcat|socat)\s+.*-l.*$/, action: ActionType.NETWORK_LISTEN, targetIndex: 0 },

  // Process operations
  { pattern: /^(kill|killall|pkill)\s+(.+)$/, action: ActionType.PROCESS_KILL, targetIndex: 2 },

  // System commands
  { pattern: /^(sudo|su)\s+(.+)$/, action: ActionType.SYSTEM_COMMAND, targetIndex: 1 },
  { pattern: /^(chmod|chown|chgrp)\s+(.+)$/, action: ActionType.SYSTEM_COMMAND, targetIndex: 2 },
  {
    pattern: /^(service|systemctl|launchctl)\s+(.+)$/,
    action: ActionType.SYSTEM_COMMAND,
    targetIndex: 2,
  },

  // Environment operations
  { pattern: /^(export|unset)\s+(.+)$/, action: ActionType.ENVIRONMENT_WRITE, targetIndex: 2 },
];

/**
 * Result of command analysis
 */
export interface CommandAnalysisResult {
  allowed: boolean;
  reason: string;
  action?: ActionType;
  target?: string;
  severity: 'info' | 'warning' | 'error';
  suggestion?: string;
}

/**
 * Command interceptor that analyzes commands for permission compliance
 */
export class CommandInterceptor {
  private permissionManager: PermissionManager;
  private logger: WinstonLogger;
  private worktreeDir: string;
  private claudeDenyList: string[] = [];

  constructor(permissionManager: PermissionManager, logger: WinstonLogger, worktreeDir: string) {
    this.permissionManager = permissionManager;
    this.logger = logger;
    this.worktreeDir = worktreeDir;
    this.loadClaudeDenyList();
  }

  /**
   * Load deny list from .claude/settings.json
   */
  private async loadClaudeDenyList(): Promise<void> {
    try {
      const settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
      const settingsContent = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsContent);

      if (settings.permissions?.deny && Array.isArray(settings.permissions.deny)) {
        this.claudeDenyList = settings.permissions.deny;
        // Deny list loading info disabled
      }
    } catch {
      // Settings loading warning disabled
    }
  }

  /**
   * Check if command matches Claude deny list patterns
   */
  private matchesClaudeDenyPattern(command: string): { matches: boolean; pattern?: string } {
    for (const denyPattern of this.claudeDenyList) {
      // Handle Bash command patterns like "Bash(HUSKY=0*:"
      if (denyPattern.startsWith('Bash(') && denyPattern.endsWith(':')) {
        const bashPattern = denyPattern.slice(5, -1); // Remove "Bash(" and ":"
        const regexPattern = bashPattern.replace(/\*/g, '.*'); // Convert * to regex .*
        if (new RegExp(regexPattern).test(command)) {
          return { matches: true, pattern: denyPattern };
        }
      }

      // Parse Update() patterns
      const updateMatch = denyPattern.match(/^Update\((.+)\)$/);
      if (updateMatch) {
        const filePath = updateMatch[1];
        // Check if command is trying to edit/write to this file
        const fileEditPatterns = [
          new RegExp(
            `\\b(vim|nano|emacs|code|subl)\\s+.*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
          ),
          new RegExp(`>\\s*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
          new RegExp(`>>\\s*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
          new RegExp(`\\becho\\s+.*>\\s*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
          new RegExp(`\\btee\\s+.*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
        ];

        for (const pattern of fileEditPatterns) {
          if (pattern.test(command)) {
            return { matches: true, pattern: denyPattern };
          }
        }
      }
    }
    return { matches: false };
  }

  /**
   * Analyze a command for permission compliance
   */
  analyzeCommand(command: string): CommandAnalysisResult {
    const trimmedCommand = command.trim();

    // Check Claude deny list first (only use user-defined deny list)
    const claudeDenyMatch = this.matchesClaudeDenyPattern(trimmedCommand);
    if (claudeDenyMatch.matches) {
      // Command blocking log disabled
      return {
        allowed: false,
        reason: `❌ Command blocked by .claude/settings.json deny list: ${claudeDenyMatch.pattern}`,
        severity: 'error',
        // Suggestion removed to reduce noise
      };
    }

    // Try to match command patterns
    for (const pattern of COMMAND_PATTERNS) {
      const match = trimmedCommand.match(pattern.pattern);
      if (match) {
        const target = match[pattern.targetIndex] || trimmedCommand; // Extract target path/argument

        // Check permission
        const context: PermissionContext = {
          action: pattern.action,
          target: this.resolveTarget(target),
          worktreeDir: this.worktreeDir,
          additionalData: { originalCommand: command },
        };

        const permissionResult = this.permissionManager.checkPermission(context);

        if (!permissionResult.allowed) {
          return {
            allowed: false,
            reason: `🚫 Command blocked by permissions: ${permissionResult.reason}`,
            action: pattern.action,
            target,
            severity: 'error',
            // Suggestion removed to reduce noise
          };
        }

        // Command is allowed
        return {
          allowed: true,
          reason: `✅ Command permitted: ${permissionResult.reason}`,
          action: pattern.action,
          target,
          severity: 'info',
        };
      }
    }

    // Command doesn't match known patterns - check if it's a general system command
    const context: PermissionContext = {
      action: ActionType.SYSTEM_COMMAND,
      target: trimmedCommand.split(' ')[0], // First word is the command
      worktreeDir: this.worktreeDir,
      additionalData: { originalCommand: command },
    };

    const permissionResult = this.permissionManager.checkPermission(context);

    if (!permissionResult.allowed) {
      return {
        allowed: false,
        reason: `🚫 Command blocked by permissions: ${permissionResult.reason}`,
        action: ActionType.SYSTEM_COMMAND,
        target: context.target,
        severity: 'error',
        // Suggestion removed to reduce noise
      };
    }

    // Default allow with warning for unrecognized commands
    return {
      allowed: true,
      reason: `⚠️ Command not recognized but permitted by default permissions`,
      action: ActionType.SYSTEM_COMMAND,
      target: context.target,
      severity: 'warning',
      // Suggestion removed to reduce noise
    };
  }

  /**
   * Resolve target path relative to worktree
   */
  private resolveTarget(target: string): string {
    if (!target) return '';

    // Handle relative paths
    if (!path.isAbsolute(target)) {
      return path.join(this.worktreeDir, target);
    }

    return target;
  }

  /**
   * Generate helpful suggestions for blocked commands (disabled)
   */
  private generateSuggestion(_action: ActionType, _target: string, _reason: string): string {
    // Suggestions disabled to reduce noise
    return '';
  }

  /**
   * Create command interceptor with default configuration
   */
  static async createDefault(
    logger: WinstonLogger,
    worktreeDir: string
  ): Promise<CommandInterceptor> {
    const permissionsConfigPath = path.join(process.cwd(), 'permissions-config.json');

    let config: PermissionConfig;
    try {
      const data = await fs.readFile(permissionsConfigPath, 'utf-8');
      config = JSON.parse(data);
    } catch {
      // Use restrictive default if no config exists
      config = DefaultPermissions.development(); // More permissive for development
    }

    const permissionManager = new PermissionManager(config, logger);
    return new CommandInterceptor(permissionManager, logger, worktreeDir);
  }
}

/**
 * Format command analysis result for display
 */
export function formatCommandAnalysis(result: CommandAnalysisResult): string {
  const lines = [result.reason];

  if (result.action && result.target) {
    lines.push(`Action: ${result.action}`);
    lines.push(`Target: ${result.target}`);
  }

  // Suggestions disabled to reduce noise

  return lines.join('\n');
}
