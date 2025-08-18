import { ClaudeValidationWrapper, ValidationWrapperOptions } from './claude-validation-wrapper';
import { PermissionManager, DefaultPermissions } from './permissions';
import { WinstonLogger } from '../logger-winston';
import * as path from 'path';
import * as fs from 'fs';

export interface ClaudeValidationFactoryOptions {
  worktreeDir: string;
  claudeCommand?: string;
  enableValidation?: boolean;
  validationSettings?: string;
  skipValidationOnFailure?: boolean;
  validationTimeout?: number;
  permissionMode?: 'restrictive' | 'permissive' | 'development' | 'disabled';
  logger?: WinstonLogger;
}

/**
 * Factory for creating Claude Validation Wrapper instances with sensible defaults
 */
export class ClaudeValidationFactory {
  /**
   * Create a new Claude Validation Wrapper with default configuration
   */
  static create(options: ClaudeValidationFactoryOptions): ClaudeValidationWrapper {
    const logger = options.logger;

    // Set up default Claude command if not provided
    const claudeCommand = options.claudeCommand || this.detectClaudeCommand(logger);
    
    // Set up permission manager based on mode
    let permissionManager: PermissionManager | undefined;
    if (options.permissionMode && options.permissionMode !== 'disabled') {
      const permissionConfig = this.getPermissionConfigByMode(options.permissionMode);
      permissionManager = new PermissionManager(permissionConfig, logger);
      
      logger?.info('Permission manager initialized', { mode: options.permissionMode });
    }

    // Determine validation settings path
    const validationSettings = options.validationSettings || this.findValidationSettings(options.worktreeDir);

    // Create wrapper options
    const wrapperOptions: ValidationWrapperOptions = {
      worktreeDir: options.worktreeDir,
      claudeCommand,
      permissionManager,
      enableValidation: options.enableValidation ?? true,
      validationSettings,
      skipValidationOnFailure: options.skipValidationOnFailure ?? false,
      validationTimeout: options.validationTimeout ?? 180000 // 3 minutes
    };

    logger?.info('Creating Claude Validation Wrapper', {
      worktreeDir: options.worktreeDir,
      claudeCommand,
      enableValidation: wrapperOptions.enableValidation,
      validationSettings,
      permissionMode: options.permissionMode || 'disabled'
    });

    return new ClaudeValidationWrapper(wrapperOptions, logger);
  }

  /**
   * Create a wrapper with development-friendly defaults
   */
  static createForDevelopment(worktreeDir: string, logger?: WinstonLogger): ClaudeValidationWrapper {
    return this.create({
      worktreeDir,
      enableValidation: true,
      skipValidationOnFailure: false,
      permissionMode: 'development',
      validationTimeout: 300000, // 5 minutes for development
      logger
    });
  }

  /**
   * Create a wrapper with production-ready defaults
   */
  static createForProduction(worktreeDir: string, logger?: WinstonLogger): ClaudeValidationWrapper {
    return this.create({
      worktreeDir,
      enableValidation: true,
      skipValidationOnFailure: true,
      permissionMode: 'restrictive',
      validationTimeout: 180000, // 3 minutes
      logger
    });
  }

  /**
   * Create a wrapper with validation disabled (Claude executor only)
   */
  static createWithoutValidation(worktreeDir: string, logger?: WinstonLogger): ClaudeValidationWrapper {
    return this.create({
      worktreeDir,
      enableValidation: false,
      permissionMode: 'disabled',
      logger
    });
  }

  /**
   * Auto-detect Claude command based on system
   */
  private static detectClaudeCommand(logger?: WinstonLogger): string {
    const possibleCommands = [
      'claude-code',
      'claude',
      'npx claude-code',
      '/usr/local/bin/claude-code',
      '/opt/homebrew/bin/claude-code'
    ];

    // Try to find claude command in PATH
    for (const cmd of possibleCommands) {
      try {
        const { execSync } = require('child_process');
        execSync(`which ${cmd.split(' ')[0]}`, { stdio: 'ignore' });
        logger?.info('Detected Claude command', { command: cmd });
        return cmd;
      } catch {
        // Command not found, try next
      }
    }

    logger?.warn('Could not auto-detect Claude command, using default');
    return 'claude-code';
  }

  /**
   * Find validation settings file in worktree directory
   */
  private static findValidationSettings(worktreeDir: string): string | undefined {
    const possiblePaths = [
      path.join(worktreeDir, 'settings.json'),
      path.join(worktreeDir, 'claude-settings.json'),
      path.join(worktreeDir, '.claude', 'validation.json'),
      path.join(process.cwd(), 'settings.json') // fallback to project root
    ];

    for (const settingsPath of possiblePaths) {
      if (fs.existsSync(settingsPath)) {
        return settingsPath;
      }
    }

    return undefined;
  }

  /**
   * Get permission configuration by mode
   */
  private static getPermissionConfigByMode(mode: 'restrictive' | 'permissive' | 'development') {
    switch (mode) {
      case 'restrictive':
        return DefaultPermissions.restrictive();
      case 'permissive':
        return DefaultPermissions.permissive();
      case 'development':
        return DefaultPermissions.development();
      default:
        return DefaultPermissions.development();
    }
  }
}