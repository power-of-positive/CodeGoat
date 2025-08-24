import { WinstonLogger } from '../logger-winston';

/**
 * Types of actions that can be restricted by the permissions system
 */
export enum ActionType {
  // File system operations
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  FILE_DELETE = 'file_delete',
  DIRECTORY_CREATE = 'directory_create',
  DIRECTORY_DELETE = 'directory_delete',

  // Network operations
  NETWORK_REQUEST = 'network_request',
  NETWORK_LISTEN = 'network_listen',

  // Process operations
  PROCESS_SPAWN = 'process_spawn',
  PROCESS_KILL = 'process_kill',

  // System operations
  SYSTEM_COMMAND = 'system_command',
  ENVIRONMENT_READ = 'environment_read',
  ENVIRONMENT_WRITE = 'environment_write',

  // Claude-specific operations
  CLAUDE_EXECUTE = 'claude_execute',
  CLAUDE_PROMPT = 'claude_prompt',
}

/**
 * Scope of permission restriction
 */
export enum PermissionScope {
  GLOBAL = 'global',
  WORKTREE = 'worktree',
  SPECIFIC_PATH = 'specific_path',
  PATTERN = 'pattern',
}

/**
 * Permission rule defining what is allowed or forbidden
 */
export interface PermissionRule {
  id: string;
  action: ActionType;
  scope: PermissionScope;
  target?: string; // Specific path, pattern, or other target
  allowed: boolean;
  reason?: string;
  priority: number; // Higher number = higher priority
}

/**
 * Configuration for the permission system
 */
export interface PermissionConfig {
  rules: PermissionRule[];
  defaultAllow: boolean; // Default behavior when no rules match
  enableLogging: boolean;
  strictMode: boolean; // If true, any ambiguity results in denial
}

/**
 * Context for permission checks
 */
export interface PermissionContext {
  action: ActionType;
  target?: string;
  worktreeDir?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Result of a permission check
 */
export interface PermissionResult {
  allowed: boolean;
  reason: string;
  matchingRule?: PermissionRule;
  appliedDefault?: boolean;
}

/**
 * Permission manager for validating actions against rules
 */
export class PermissionManager {
  private config: PermissionConfig;
  private logger?: WinstonLogger;

  constructor(config: PermissionConfig, logger?: WinstonLogger) {
    this.config = config;
    this.logger = logger;

    // Sort rules by priority (highest first)
    this.config.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if an action is permitted
   */
  checkPermission(context: PermissionContext): PermissionResult {
    this.logger?.debug('Checking permission', {
      action: context.action,
      target: context.target,
      worktreeDir: context.worktreeDir,
    });

    // Find the highest priority matching rule
    const matchingRule = this.findMatchingRule(context);

    if (matchingRule) {
      const result: PermissionResult = {
        allowed: matchingRule.allowed,
        reason:
          matchingRule.reason ??
          `Rule ${matchingRule.id}: ${matchingRule.allowed ? 'allowed' : 'denied'}`,
        matchingRule,
      };

      if (this.config.enableLogging) {
        this.logger?.info('Permission check result', {
          action: context.action,
          target: context.target,
          allowed: result.allowed,
          ruleId: matchingRule.id,
          reason: result.reason,
        });
      }

      return result;
    }

    // No matching rule found, use default behavior
    const result: PermissionResult = {
      allowed: this.config.defaultAllow,
      reason: `No matching rule found, using default: ${this.config.defaultAllow ? 'allowed' : 'denied'}`,
      appliedDefault: true,
    };

    if (this.config.enableLogging) {
      this.logger?.info('Permission check result (default)', {
        action: context.action,
        target: context.target,
        allowed: result.allowed,
        reason: result.reason,
      });
    }

    return result;
  }

  /**
   * Find the highest priority rule that matches the context
   */
  private findMatchingRule(context: PermissionContext): PermissionRule | null {
    for (const rule of this.config.rules) {
      if (this.ruleMatches(rule, context)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Check if a rule matches the given context
   */
  private ruleMatches(rule: PermissionRule, context: PermissionContext): boolean {
    // Action must match
    if (rule.action !== context.action) {
      return false;
    }

    // Check scope-specific matching
    switch (rule.scope) {
      case PermissionScope.GLOBAL:
        return true;

      case PermissionScope.WORKTREE:
        if (context.worktreeDir === undefined) {
          return false;
        }
        // If there's no target (e.g., for CLAUDE_EXECUTE), just check if worktreeDir is provided
        if (context.target === undefined) {
          return true;
        }
        // For file operations, check if target is within worktree
        return this.pathMatches(context.worktreeDir, context.target);

      case PermissionScope.SPECIFIC_PATH:
        return (
          rule.target !== undefined &&
          context.target !== undefined &&
          this.pathMatches(rule.target, context.target)
        );

      case PermissionScope.PATTERN:
        return (
          rule.target !== undefined &&
          context.target !== undefined &&
          this.patternMatches(rule.target, context.target)
        );

      default:
        return false;
    }
  }

  /**
   * Check if a path matches exactly
   */
  private pathMatches(rulePath: string, targetPath: string): boolean {
    // Normalize paths for comparison
    const normalizeRule = rulePath.replace(/\/+$/, '');
    const normalizeTarget = targetPath.replace(/\/+$/, '');
    return normalizeRule === normalizeTarget || targetPath.startsWith(normalizeRule + '/');
  }

  /**
   * Check if a target matches a pattern (simple glob-like matching)
   */
  private patternMatches(pattern: string, target: string): boolean {
    // Convert simple glob patterns to regex
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');

    try {
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(target);
    } catch (error) {
      this.logger?.warn('Invalid pattern in permission rule', {
        pattern,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Add a new permission rule
   */
  addRule(rule: PermissionRule): void {
    this.config.rules.push(rule);
    // Re-sort by priority
    this.config.rules.sort((a, b) => b.priority - a.priority);

    this.logger?.info('Added permission rule', {
      ruleId: rule.id,
      action: rule.action,
      scope: rule.scope,
      allowed: rule.allowed,
    });
  }

  /**
   * Remove a permission rule by ID
   */
  removeRule(ruleId: string): boolean {
    const initialLength = this.config.rules.length;
    this.config.rules = this.config.rules.filter(rule => rule.id !== ruleId);

    const removed = this.config.rules.length < initialLength;
    if (removed) {
      this.logger?.info('Removed permission rule', { ruleId });
    }

    return removed;
  }

  /**
   * Update the configuration
   */
  updateConfig(newConfig: Partial<PermissionConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.rules) {
      // Re-sort by priority
      this.config.rules.sort((a, b) => b.priority - a.priority);
    }

    this.logger?.info('Updated permission configuration', newConfig);
  }

  /**
   * Get current configuration (read-only)
   */
  getConfig(): Readonly<PermissionConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Validate that an action is allowed, throwing an error if not
   */
  requirePermission(context: PermissionContext): void {
    const result = this.checkPermission(context);
    if (!result.allowed) {
      throw new PermissionError(
        `Action ${context.action} denied: ${result.reason}`,
        context,
        result
      );
    }
  }
}

/**
 * Error thrown when a permission check fails
 */
export class PermissionError extends Error {
  public readonly context: PermissionContext;
  public readonly result: PermissionResult;

  constructor(message: string, context: PermissionContext, result: PermissionResult) {
    super(message);
    this.name = 'PermissionError';
    this.context = context;
    this.result = result;
  }
}

/**
 * Default permission configurations for common scenarios
 */
export const DefaultPermissions = {
  /**
   * Restrictive configuration - only allows basic operations
   */
  restrictive(): PermissionConfig {
    return {
      defaultAllow: false,
      enableLogging: true,
      strictMode: true,
      rules: [
        {
          id: 'allow-claude-execute',
          action: ActionType.CLAUDE_EXECUTE,
          scope: PermissionScope.WORKTREE,
          allowed: true,
          reason: 'Claude execution allowed in worktree',
          priority: 100,
        },
        {
          id: 'allow-file-read',
          action: ActionType.FILE_READ,
          scope: PermissionScope.WORKTREE,
          allowed: true,
          reason: 'File reading allowed in worktree',
          priority: 90,
        },
        {
          id: 'deny-system-commands',
          action: ActionType.SYSTEM_COMMAND,
          scope: PermissionScope.GLOBAL,
          allowed: false,
          reason: 'System commands are forbidden for security',
          priority: 200,
        },
        {
          id: 'deny-network-access',
          action: ActionType.NETWORK_REQUEST,
          scope: PermissionScope.GLOBAL,
          allowed: false,
          reason: 'Network access is forbidden',
          priority: 200,
        },
      ],
    };
  },

  /**
   * Permissive configuration - allows most operations
   */
  permissive(): PermissionConfig {
    return {
      defaultAllow: true,
      enableLogging: true,
      strictMode: false,
      rules: [
        {
          id: 'deny-sensitive-files',
          action: ActionType.FILE_WRITE,
          scope: PermissionScope.PATTERN,
          target: '*/etc/*',
          allowed: false,
          reason: 'Writing to system configuration directories is forbidden',
          priority: 200,
        },
        {
          id: 'deny-file-deletion',
          action: ActionType.FILE_DELETE,
          scope: PermissionScope.GLOBAL,
          allowed: false,
          reason: 'File deletion is forbidden for safety',
          priority: 150,
        },
      ],
    };
  },

  /**
   * Development configuration - balanced approach
   */
  development(): PermissionConfig {
    return {
      defaultAllow: true,
      enableLogging: true,
      strictMode: false,
      rules: [
        {
          id: 'allow-worktree-operations',
          action: ActionType.FILE_WRITE,
          scope: PermissionScope.WORKTREE,
          allowed: true,
          reason: 'File operations allowed in worktree',
          priority: 200,
        },
        {
          id: 'deny-outside-worktree',
          action: ActionType.FILE_WRITE,
          scope: PermissionScope.GLOBAL,
          allowed: false,
          reason: 'File operations outside worktree are forbidden',
          priority: 150,
        },
        {
          id: 'allow-safe-commands',
          action: ActionType.SYSTEM_COMMAND,
          scope: PermissionScope.PATTERN,
          target: 'git *',
          allowed: true,
          reason: 'Git commands are allowed',
          priority: 120,
        },
      ],
    };
  },
};
