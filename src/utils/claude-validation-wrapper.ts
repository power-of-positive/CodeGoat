import { ClaudeCodeExecutor, ClaudeExecutorOptions, ClaudeExecutorResult } from './claude-executor';
import { ValidationRunner } from '../../scripts/validate-task';
import { WinstonLogger } from '../logger-winston';
import { PermissionManager } from './permissions';
import * as path from 'path';

export interface ValidationWrapperOptions extends ClaudeExecutorOptions {
  enableValidation?: boolean;
  validationSettings?: string;
  skipValidationOnFailure?: boolean;
  validationTimeout?: number;
}

export interface WrappedExecutorResult extends ClaudeExecutorResult {
  validationResults?: {
    success: boolean;
    totalStages: number;
    passed: number;
    failed: number;
    totalTime: number;
    stages: Array<{
      id: string;
      name: string;
      success: boolean;
      duration: number;
      error?: string;
    }>;
  };
  validationSkipped?: boolean;
  validationError?: string;
}

/**
 * ClaudeValidationWrapper: Wrapper around ClaudeCodeExecutor that runs validation checks
 * 
 * This class wraps the Claude Code executor to automatically run validation stages
 * after Claude completes its execution. This provides quality control by ensuring
 * that any changes Claude makes pass the configured validation pipeline.
 * 
 * Features:
 * - Runs validation pipeline after Claude execution
 * - Configurable validation settings
 * - Can optionally skip validation on Claude execution failure
 * - Includes validation results in the response
 * - Proper error handling and logging
 */
export class ClaudeValidationWrapper {
  private readonly executor: ClaudeCodeExecutor;
  private readonly enableValidation: boolean;
  private readonly validationSettings?: string;
  private readonly skipValidationOnFailure: boolean;
  private readonly validationTimeout: number;
  private readonly logger?: WinstonLogger;

  constructor(options: ValidationWrapperOptions, logger?: WinstonLogger) {
    // Create the underlying Claude executor
    this.executor = new ClaudeCodeExecutor(options, logger);
    
    // Configure validation options
    this.enableValidation = options.enableValidation ?? true;
    this.validationSettings = options.validationSettings;
    this.skipValidationOnFailure = options.skipValidationOnFailure ?? false;
    this.validationTimeout = options.validationTimeout ?? 180000; // 3 minutes default
    this.logger = logger;

    this.logger?.info('Claude Validation Wrapper initialized', {
      worktreeDir: options.worktreeDir,
      enableValidation: this.enableValidation,
      validationSettings: this.validationSettings,
      skipValidationOnFailure: this.skipValidationOnFailure,
      validationTimeout: this.validationTimeout
    });
  }

  /**
   * Execute Claude with automatic validation
   */
  async execute(prompt: string): Promise<WrappedExecutorResult> {
    this.logger?.info('Starting Claude execution with validation wrapper', {
      enableValidation: this.enableValidation,
      promptLength: prompt.length
    });

    // Execute Claude first
    const claudeResult = await this.executor.spawn(prompt);

    this.logger?.info('Claude execution completed', {
      exitCode: claudeResult.exitCode,
      stdoutLength: claudeResult.stdout.length,
      stderrLength: claudeResult.stderr.length
    });

    // Prepare the wrapped result
    const result: WrappedExecutorResult = {
      ...claudeResult,
      validationSkipped: false,
      validationResults: undefined,
      validationError: undefined
    };

    // Determine if we should run validation
    const shouldRunValidation = this.shouldRunValidation(claudeResult);
    
    if (!shouldRunValidation.run) {
      result.validationSkipped = true;
      this.logger?.info('Skipping validation', { reason: shouldRunValidation.reason });
      return result;
    }

    // Run validation pipeline
    try {
      this.logger?.info('Running validation pipeline after Claude execution');
      const validationResults = await this.runValidation();
      
      result.validationResults = {
        success: validationResults.success,
        totalStages: validationResults.totalStages,
        passed: validationResults.passed,
        failed: validationResults.failed,
        totalTime: validationResults.totalTime,
        stages: validationResults.stages
      };

      this.logger?.info('Validation pipeline completed', {
        success: validationResults.success,
        passed: validationResults.passed,
        failed: validationResults.failed,
        totalTime: validationResults.totalTime
      });

    } catch (error) {
      const errorMessage = (error as Error).message;
      result.validationError = errorMessage;
      
      this.logger?.error('Validation pipeline failed', error as Error);
    }

    return result;
  }

  /**
   * Determine if validation should run based on Claude execution result and configuration
   */
  private shouldRunValidation(claudeResult: ClaudeExecutorResult): { run: boolean; reason?: string } {
    if (!this.enableValidation) {
      return { run: false, reason: 'Validation disabled in configuration' };
    }

    if (this.skipValidationOnFailure && claudeResult.exitCode !== 0) {
      return { 
        run: false, 
        reason: `Claude execution failed (exit code: ${claudeResult.exitCode}) and skipValidationOnFailure is enabled` 
      };
    }

    return { run: true };
  }

  /**
   * Run the validation pipeline using the ValidationRunner
   */
  private async runValidation(): Promise<{
    success: boolean;
    totalStages: number;
    passed: number;
    failed: number;
    totalTime: number;
    stages: Array<{
      id: string;
      name: string;
      success: boolean;
      duration: number;
      error?: string;
    }>;
  }> {
    return new Promise(async (resolve, reject) => {
      const sessionId = `claude-wrapper-${Date.now()}`;
      
      // Set up timeout for validation
      const timeout = setTimeout(() => {
        reject(new Error(`Validation pipeline timed out after ${this.validationTimeout}ms`));
      }, this.validationTimeout);

      try {
        const runner = new ValidationRunner({
          sessionId,
          settingsPath: this.validationSettings
        });

        const success = await runner.runValidation();
        
        // Get the results from the runner
        const results = runner.getResults();
        
        clearTimeout(timeout);
        
        resolve({
          success,
          totalStages: results.totalStages || 0,
          passed: results.passed || 0,
          failed: results.failed || 0,
          totalTime: results.totalTime || 0,
          stages: results.stages || []
        });

        await runner.cleanup();
        
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Get the underlying Claude executor (for advanced usage)
   */
  getExecutor(): ClaudeCodeExecutor {
    return this.executor;
  }

  /**
   * Check if validation is enabled
   */
  isValidationEnabled(): boolean {
    return this.enableValidation;
  }

  /**
   * Get validation configuration
   */
  getValidationConfig() {
    return {
      enableValidation: this.enableValidation,
      validationSettings: this.validationSettings,
      skipValidationOnFailure: this.skipValidationOnFailure,
      validationTimeout: this.validationTimeout
    };
  }

  /**
   * Run validation manually (without executing Claude)
   */
  async runValidationOnly(): Promise<WrappedExecutorResult['validationResults']> {
    if (!this.enableValidation) {
      throw new Error('Validation is disabled');
    }

    try {
      const validationResults = await this.runValidation();
      return validationResults;
    } catch (error) {
      throw new Error(`Manual validation failed: ${(error as Error).message}`);
    }
  }

  // Delegate methods to the underlying executor
  getWorktreeDir(): string {
    return this.executor.getWorktreeDir();
  }

  getClaudeCommand(): string {
    return this.executor.getClaudeCommand();
  }

  checkPermission(action: any, target?: string): boolean {
    return this.executor.checkPermission(action, target);
  }

  getPermissionManager(): PermissionManager | undefined {
    return this.executor.getPermissionManager();
  }

  isExecutionPermitted(): boolean {
    return this.executor.isExecutionPermitted();
  }
}