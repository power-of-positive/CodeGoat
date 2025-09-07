#!/usr/bin/env node

/**
 * Claude Code validation hook script
 *
 * This script runs validation stages configured in settings.json when Claude Code attempts to stop/complete a task.
 * It executes user-configured validation stages sequentially and tracks timing and success metrics.
 */

// Suppress all dotenv debug messages completely before any imports (including Prisma's)
delete process.env.DEBUG;
delete process.env.DOTENV_CONFIG_DEBUG;
delete process.env.DOTENV_DEBUG;

// Intercept process.stderr.write to filter out dotenv debug messages
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function (chunk: any, encoding?: any, callback?: any): boolean {
  const str = chunk?.toString ? chunk.toString() : String(chunk);
  if (str.includes('[dotenv@') || str.includes('[DEBUG]')) {
    return true; // Pretend write succeeded but do nothing
  }
  // Call with the exact parameters expected
  if (callback) {
    return originalStderrWrite(chunk, encoding, callback);
  } else if (encoding) {
    return originalStderrWrite(chunk, encoding);
  } else {
    return originalStderrWrite(chunk);
  }
} as any;

// Load environment variables - use test database for pre-commit hooks
import dotenv from 'dotenv';
import path from 'path';

// Use test environment for pre-commit hooks and testing contexts
const isPreCommitContext =
  process.env.CLAUDE_STOP_HOOK === 'true' ||
  process.argv.includes('--test') ||
  process.argv.some(arg => arg.includes('precommit'));
const envPath = isPreCommitContext ? '.env.e2e' : '.env';

// Suppress dotenv console output temporarily during config
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
console.log = () => {};
console.warn = () => {};
dotenv.config({ path: envPath, override: true });
console.log = originalConsoleLog;
console.warn = originalConsoleWarn;

// Ensure DATABASE_URL is set for Prisma when in test context
if (isPreCommitContext && process.env.KANBAN_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.KANBAN_DATABASE_URL;
}

import fs from 'fs/promises';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { Settings, ValidationStage } from '../src/types/settings.types';
import { PrismaClient } from '@prisma/client';
import { getEnabledValidationStages } from '../src/services/validation-stage-config.service';

// Constants
const DEFAULT_STAGE_TIMEOUT_MS = 120000; // Increased to 2 minutes per stage

const execAsync = promisify(exec);

// Track running processes for cleanup
const runningProcesses = new Set<ChildProcess>();

// Cleanup function
function cleanupProcesses() {
  console.error(`${colors?.yellow || '\x1b[33m'}🧹 Cleaning up ${runningProcesses.size} running processes...${colors?.reset || '\x1b[0m'}`);
  
  for (const process of runningProcesses) {
    try {
      if (process.pid && !process.killed) {
        // Try graceful termination first
        process.kill('SIGTERM');
        
        // Force kill after 2 seconds if still running
        setTimeout(() => {
          if (process.pid && !process.killed) {
            process.kill('SIGKILL');
          }
        }, 2000);
      }
    } catch (error) {
      // Process may already be dead
    }
  }
  
  runningProcesses.clear();
}

// Setup process cleanup on exit
process.on('exit', cleanupProcesses);
process.on('SIGINT', () => {
  cleanupProcesses();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupProcesses();
  process.exit(0);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  cleanupProcesses();
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  cleanupProcesses();
  process.exit(1);
});

interface ValidationError {
  message?: string;
  stdout?: string;
  stderr?: string;
}

interface ValidationStageResult {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

interface ValidationMetrics {
  timestamp: string;
  stages: ValidationStageResult[];
  totalTime: number;
  totalDuration: number;
  success: boolean;
}

// ANSI color codes for console output
interface Colors {
  reset: string;
  bright: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
}

interface ValidationRunnerOptions {
  settingsPath?: string;
  sessionId?: string | null;
  enableParallel?: boolean;
}

interface ValidationResults {
  totalStages: number;
  passed: number;
  failed: number;
  skipped: number;
  stages: ValidationStageResult[];
  totalTime: number;
  success: boolean;
}

const colors: Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class ValidationRunner {
  private settingsPath: string;
  private sessionId: string | null;
  private startTime: number;
  private results: ValidationResults;
  private db: PrismaClient;
  private enableParallel: boolean;
  private enabledStages: ValidationStage[] = []; // Store enabled stages for later reference

  constructor(options: ValidationRunnerOptions = {}) {
    this.settingsPath = options.settingsPath || path.join(process.cwd(), 'settings.json');
    this.sessionId = options.sessionId || null;
    this.enableParallel = options.enableParallel ?? true; // Default to parallel
    this.startTime = Date.now();
    this.db = new PrismaClient();
    this.results = {
      totalStages: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      stages: [],
      totalTime: 0,
      success: false,
    };
  }

  async loadSettings(): Promise<Settings> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Return empty settings object if file doesn't exist
        return {
          fallback: {
            maxRetries: 3,
            retryDelay: 1000,
            enableFallbacks: true,
            fallbackOnContextLength: true,
            fallbackOnRateLimit: true,
            fallbackOnServerError: false,
          },
          validation: {
            stages: [],
            enableMetrics: true,
            maxAttempts: 5,
          },
          logging: {
            level: 'info',
            enableConsole: true,
            enableFile: true,
            logsDir: './logs',
            accessLogFile: 'access.log',
            appLogFile: 'app.log',
            errorLogFile: 'error.log',
            maxFileSize: '10485760',
            maxFiles: '10',
            datePattern: 'YYYY-MM-DD',
          },
        };
      }
      throw error;
    }
  }

  private async findCurrentTask(): Promise<string | null> {
    try {
      // Look for a task that's currently in progress
      const inProgressTask = await this.db.task.findFirst({
        where: {
          status: 'IN_PROGRESS',
          // Only look for todo tasks (not project tasks)
          OR: [{ projectId: null }, { id: { startsWith: 'CODEGOAT-' } }],
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return inProgressTask?.id || null;
    } catch (error) {
      console.warn(
        `${colors.yellow}⚠️  Could not find current task: ${(error as Error).message}${colors.reset}`
      );
      return null;
    }
  }

  private printValidationHeader(): void {
    console.error(`${colors.blue}${colors.bright}🔍 Running Validation Pipeline${colors.reset}`);
    console.error(
      `${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );

    if (this.sessionId) {
      console.error(`${colors.cyan}📊 Session ID: ${this.sessionId}${colors.reset}`);
    }

    console.error(`${colors.cyan}⏰ Started at: ${new Date().toISOString()}${colors.reset}\n`);
  }

  private async processStage(
    stage: ValidationStage,
    stageNumber: number,
    totalStages: number
  ): Promise<boolean> {
    console.error(`${colors.bright}[${stageNumber}/${totalStages}] ${stage.name}${colors.reset}`);
    console.error(`${colors.cyan}    Command: ${stage.command}${colors.reset}`);

    const stageResult = await this.runStage(stage);
    this.results.stages.push(stageResult);

    if (stageResult.success) {
      this.results.passed++;
      console.error(`${colors.green}    ✅ Passed (${stageResult.duration}ms)${colors.reset}\n`);
      return true;
    } else {
      this.results.failed++;
      console.error(`${colors.red}    ❌ Failed (${stageResult.duration}ms)${colors.reset}`);
      if (stageResult.error) {
        console.error(`${colors.red}    Error: ${stageResult.error}${colors.reset}`);
      }
      console.error('');

      if (!stage.continueOnFailure) {
        const fixGuidance = this.getStageFixGuidance(stage, stageResult);
        console.error(
          `${colors.red}Stage failed and continueOnFailure is false. Stopping pipeline.${colors.reset}`
        );
        console.error(`${colors.yellow}Fix guidance: ${fixGuidance}${colors.reset}\n`);
        return false;
      } else {
        console.error(
          `${colors.yellow}Stage failed but continuing due to continueOnFailure setting${colors.reset}\n`
        );
        return true;
      }
    }
  }

  private async processStageParallel(
    stage: ValidationStage,
    stageNumber: number,
    totalStages: number
  ): Promise<{ stage: ValidationStage; result: ValidationStageResult; shouldContinue: boolean }> {
    console.error(
      `${colors.bright}[${stageNumber}/${totalStages}] Starting ${stage.name}${colors.reset}`
    );
    console.error(`${colors.cyan}    Command: ${stage.command}${colors.reset}`);

    const stageResult = await this.runStage(stage);

    const shouldContinue = stageResult.success || stage.continueOnFailure;

    if (stageResult.success) {
      console.error(
        `${colors.green}[${stageNumber}/${totalStages}] ✅ ${stage.name} Passed (${stageResult.duration}ms)${colors.reset}`
      );
    } else {
      console.error(
        `${colors.red}[${stageNumber}/${totalStages}] ❌ ${stage.name} Failed (${stageResult.duration}ms)${colors.reset}`
      );
      if (stageResult.error) {
        console.error(`${colors.red}    Error: ${stageResult.error}${colors.reset}`);
      }

      if (!stage.continueOnFailure) {
        const fixGuidance = this.getStageFixGuidance(stage, stageResult);
        console.error(
          `${colors.red}    Stage failed and continueOnFailure is false.${colors.reset}`
        );
        console.error(`${colors.yellow}    Fix guidance: ${fixGuidance}${colors.reset}`);
      } else {
        console.error(
          `${colors.yellow}    Stage failed but continuing due to continueOnFailure setting${colors.reset}`
        );
      }
    }

    return { stage, result: stageResult, shouldContinue };
  }

  private getStageFixGuidance(stage: ValidationStage, _stageResult: ValidationStageResult): string {
    const stageName = stage.name.toLowerCase();
    const command = stage.command.toLowerCase();

    // Provide stage-specific guidance
    if (stageName.includes('lint') || command.includes('lint')) {
      return 'Fix the linting errors by running "npm run lint:fix" or manually address the style/quality issues. DO NOT disable the lint stage - proper code quality is essential.';
    }

    if (stageName.includes('type') || command.includes('type')) {
      return 'Fix the TypeScript type errors by reviewing and correcting type annotations, imports, or configurations. DO NOT disable type checking - type safety is critical.';
    }

    if (stageName.includes('test') || command.includes('test')) {
      return 'Fix the failing tests by debugging the test logic, updating test expectations, or fixing the underlying code. DO NOT disable or delete tests - they ensure code quality and prevent regressions.';
    }

    if (stageName.includes('coverage') || command.includes('coverage')) {
      return 'Improve test coverage by writing additional tests for uncovered code paths. DO NOT disable coverage checks - comprehensive testing is vital.';
    }

    if (
      stageName.includes('e2e') ||
      stageName.includes('playwright') ||
      command.includes('playwright')
    ) {
      return 'Fix E2E test failures by debugging browser automation issues, updating selectors, or fixing application logic. DO NOT disable E2E tests - they validate the complete user experience.';
    }

    if (stageName.includes('audit') || command.includes('audit')) {
      return 'Fix security vulnerabilities by running "npm audit fix" or updating vulnerable dependencies. DO NOT disable security audits - they protect against known vulnerabilities.';
    }

    if (stageName.includes('duplication') || command.includes('duplication')) {
      return 'Reduce code duplication by refactoring common logic into shared functions or modules. DO NOT disable duplication checks - they improve code maintainability.';
    }

    if (stageName.includes('typescript preference') || command.includes('typescript-preference')) {
      return 'Convert JavaScript files to TypeScript or ensure TypeScript is properly configured. DO NOT disable TypeScript preference - it improves code quality and developer experience.';
    }

    if (stageName.includes('uncommitted') || command.includes('uncommitted')) {
      return 'Commit your changes using "git add . && git commit -m \'your message\'" or stash them if they are work-in-progress. DO NOT disable uncommitted file checks - they ensure clean deployments.';
    }

    if (stageName.includes('todo') || command.includes('todo')) {
      return 'Complete all high-priority todo items or mark them as completed in your todo list. DO NOT disable todo validation - it ensures tasks are properly finished.';
    }

    // Generic guidance for unknown stages
    return `Review and fix the specific errors shown above for the "${stage.name}" stage. DO NOT disable this validation stage - each stage serves an important purpose in maintaining code quality and reliability. Focus on addressing the root cause of the failure.`;
  }

  private async loadValidationStages(): Promise<void> {
    // Load validation stages from database first
    this.enabledStages = await getEnabledValidationStages();

    // Fallback to settings file if no stages in database
    if (this.enabledStages.length === 0) {
      console.error(
        `${colors.yellow}⚠️  No validation stages configured in database, falling back to settings file${colors.reset}`
      );

      try {
        const settings = await this.loadSettings();
        const fileStages = settings.validation?.stages?.filter(stage => stage.enabled) || [];
        this.enabledStages = fileStages;

        if (this.enabledStages.length > 0) {
          console.error(
            `${colors.cyan}📄 Loaded ${this.enabledStages.length} validation stages from settings file${colors.reset}`
          );
        }
      } catch (error) {
        console.error(
          `${colors.red}❌ Failed to load validation stages from settings file: ${(error as Error).message}${colors.reset}`
        );
      }
    }
  }

  private async runParallelStages(): Promise<boolean> {
    console.error(
      `${colors.cyan}🚀 Starting all validation stages in parallel...\n${colors.reset}`
    );

    const stagePromises = this.enabledStages.map((stage, index) =>
      this.processStageParallel(stage, index + 1, this.enabledStages.length)
    );

    const stageResults = await Promise.all(stagePromises);

    // Sort results by original order to maintain consistency
    stageResults.sort((a, b) => {
      const aIndex = this.enabledStages.findIndex(s => s.id === a.stage.id);
      const bIndex = this.enabledStages.findIndex(s => s.id === b.stage.id);
      return aIndex - bIndex;
    });

    let overallSuccess = true;

    // Process results and update counters
    for (const { result, shouldContinue } of stageResults) {
      this.results.stages.push(result);

      if (result.success) {
        this.results.passed++;
      } else {
        this.results.failed++;
        if (!shouldContinue) {
          overallSuccess = false;
        }
      }
    }

    // Check if any stage failed with continueOnFailure=false
    const criticalFailures = stageResults.filter(
      ({ result, shouldContinue }) => !result.success && !shouldContinue
    );

    if (criticalFailures.length > 0) {
      console.error(
        `\n${colors.red}❌ ${criticalFailures.length} critical stage(s) failed:${colors.reset}`
      );
      for (const { stage } of criticalFailures) {
        console.error(`${colors.red}  - ${stage.name}${colors.reset}`);
      }
      overallSuccess = false;
    }

    return overallSuccess;
  }

  private async runSequentialStages(): Promise<boolean> {
    for (let i = 0; i < this.enabledStages.length; i++) {
      const shouldContinue = await this.processStage(
        this.enabledStages[i],
        i + 1,
        this.enabledStages.length
      );
      if (!shouldContinue) {
        return false;
      }
    }
    return true;
  }

  async runValidation(): Promise<boolean> {
    this.printValidationHeader();

    try {
      await this.loadValidationStages();

      if (this.enabledStages.length === 0) {
        console.error(
          `${colors.yellow}⚠️  No validation stages configured or enabled${colors.reset}`
        );
        this.results.success = true;
        this.saveMetrics();
        return true;
      }

      this.results.totalStages = this.enabledStages.length;

      const executionMode = this.enableParallel ? 'parallel' : 'sequential';
      console.error(
        `${colors.cyan}🎯 Running ${this.enabledStages.length} validation stages from database (${executionMode})...\n${colors.reset}`
      );

      const overallSuccess = this.enableParallel
        ? await this.runParallelStages()
        : await this.runSequentialStages();

      this.results.success = overallSuccess;
      this.results.totalTime = Date.now() - this.startTime;

      await this.saveMetrics();
      this.printSummary();

      return this.results.success;
    } catch (error) {
      console.error(
        `${colors.red}💥 Validation pipeline failed: ${(error as Error).message}${colors.reset}`
      );
      this.results.success = false;
      this.results.totalTime = Date.now() - this.startTime;
      await this.saveMetrics();
      return false;
    }
  }

  private async runStage(stage: ValidationStage): Promise<ValidationStageResult> {
    const startTime = Date.now();
    let stageProcess: ChildProcess | null = null;
    let warningTimeout: NodeJS.Timeout | null = null;

    try {
      const timeout = stage.timeout || DEFAULT_STAGE_TIMEOUT_MS;
      
      // Create a promise-based approach with proper process tracking
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        // Use shell execution to properly handle complex commands with pipes, redirections, etc.
        const isShellCommand = stage.command.includes('&&') || 
                              stage.command.includes('||') || 
                              stage.command.includes('|') || 
                              stage.command.includes('cd ') ||
                              stage.command.includes('>') ||
                              stage.command.includes('<');
        
        let command: string;
        let args: string[];
        
        if (isShellCommand) {
          // Use shell for complex commands
          command = '/bin/sh';
          args = ['-c', stage.command];
        } else {
          // Parse simple commands
          const parts = stage.command.split(' ');
          command = parts[0];
          args = parts.slice(1);
        }
        
        // Spawn process with proper options
        stageProcess = spawn(command, args, {
          cwd: stage.workingDir || process.cwd(),
          env: {
            ...process.env,
            CI: 'true',
            FORCE_COLOR: '0',
            NODE_OPTIONS: '--max-old-space-size=4096',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false, // Keep as child process for proper cleanup
        });
        
        // Track this process for cleanup
        runningProcesses.add(stageProcess);
        
        let stdout = '';
        let stderr = '';
        let isResolved = false;
        
        // Collect output
        stageProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        
        stageProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
        
        // Handle process completion
        stageProcess.on('close', (code) => {
          if (!isResolved) {
            isResolved = true;
            runningProcesses.delete(stageProcess!);
            
            if (code === 0) {
              resolve({ stdout, stderr });
            } else {
              reject({
                message: `Process exited with code ${code}`,
                stdout,
                stderr,
              });
            }
          }
        });
        
        stageProcess.on('error', (error) => {
          if (!isResolved) {
            isResolved = true;
            runningProcesses.delete(stageProcess!);
            reject({
              message: error.message,
              stdout,
              stderr,
            });
          }
        });
        
        // Set up timeout
        const timeoutHandle = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            
            // Try graceful termination first
            if (stageProcess && !stageProcess.killed) {
              stageProcess.kill('SIGTERM');
              
              // Force kill after 2 seconds
              setTimeout(() => {
                if (stageProcess && !stageProcess.killed) {
                  stageProcess.kill('SIGKILL');
                }
              }, 2000);
            }
            
            runningProcesses.delete(stageProcess!);
            reject({
              message: `Stage timed out after ${timeout}ms`,
              stdout,
              stderr,
            });
          }
        }, timeout);
        
        // Add warning timeout
        warningTimeout = setTimeout(() => {
          console.error(
            `${colors.yellow}⚠️  Stage "${stage.name}" is taking longer than expected...${colors.reset}`
          );
        }, timeout / 2);
        
        // Cleanup timeout on completion
        stageProcess.on('close', () => {
          clearTimeout(timeoutHandle);
          if (warningTimeout) clearTimeout(warningTimeout);
        });
      });

      const duration = Date.now() - startTime;
      
      return {
        id: stage.id,
        name: stage.name,
        success: true,
        duration,
        output: result.stdout || result.stderr,
      };
    } catch (error: unknown) {
      const validationError = error as ValidationError;
      const duration = Date.now() - startTime;

      // Ensure process is cleaned up
      if (stageProcess && !((stageProcess as any).killed)) {
        try {
          (stageProcess as ChildProcess).kill('SIGKILL');
          runningProcesses.delete(stageProcess);
        } catch {
          // Process may already be dead
        }
      }
      
      if (warningTimeout) clearTimeout(warningTimeout);

      return {
        id: stage.id,
        name: stage.name,
        success: false,
        duration,
        error: validationError.message || 'Unknown error',
        output: validationError.stdout || validationError.stderr,
      };
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      const currentTaskId = await this.findCurrentTask();
      await this.saveToDatabase(currentTaskId);
      await this.saveToFile();
    } catch (error) {
      console.warn(
        `${colors.yellow}⚠️  Could not save metrics: ${(error as Error).message}${colors.reset}`
      );
    }
  }

  private async saveToDatabase(currentTaskId: string | null): Promise<void> {
    try {
      const validationRun = await this.db.validationRun.create({
        data: {
          taskId: currentTaskId,
          timestamp: new Date(),
          totalTime: this.results.totalTime,
          totalStages: this.results.stages.length,
          passedStages: this.results.stages.filter(s => s.success).length,
          failedStages: this.results.stages.filter(s => !s.success).length,
          success: this.results.success,
          triggerType: 'validation_script',
          environment: 'development',
        },
      });

      await this.createStageRecords(validationRun.id);
      this.logDatabaseSaveResult(currentTaskId);
    } catch (dbError) {
      console.warn(
        `${colors.yellow}⚠️  Could not save to database: ${(dbError as Error).message}${colors.reset}`
      );
    }
  }

  private async createStageRecords(runId: string): Promise<void> {
    for (let i = 0; i < this.results.stages.length; i++) {
      const stage = this.results.stages[i];
      await this.db.validationStage.create({
        data: {
          runId,
          stageId: stage.id,
          stageName: stage.name,
          success: stage.success,
          duration: stage.duration,
          command: null,
          exitCode: null,
          output: stage.output || null,
          errorMessage: stage.error || null,
          enabled: true,
          continueOnFailure: false,
          order: i + 1,
        },
      });
    }
  }

  private logDatabaseSaveResult(currentTaskId: string | null): void {
    if (currentTaskId) {
      console.error(
        `${colors.cyan}📊 Validation run saved to database and associated with task ${currentTaskId}${colors.reset}`
      );
    } else {
      console.error(
        `${colors.cyan}📊 Validation run saved to database (no associated task)${colors.reset}`
      );
    }
  }

  private async saveToFile(): Promise<void> {
    const metricsPath = path.join(process.cwd(), 'validation-metrics.json');
    const existingMetrics = await this.loadExistingMetrics(metricsPath);
    const metricsEntry = this.createMetricsEntry();

    existingMetrics.push(metricsEntry);

    const trimmedMetrics = this.trimMetricsHistory(existingMetrics);
    await fs.writeFile(metricsPath, JSON.stringify(trimmedMetrics, null, 2));
  }

  private async loadExistingMetrics(metricsPath: string): Promise<ValidationMetrics[]> {
    try {
      const content = await fs.readFile(metricsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private createMetricsEntry() {
    return {
      timestamp: new Date().toISOString(),
      startTime: this.startTime,
      totalTime: this.results.totalTime,
      totalDuration: this.results.totalTime,
      totalStages: this.results.totalStages,
      passed: this.results.passed,
      failed: this.results.failed,
      success: this.results.success,
      sessionId: this.sessionId,
      stages: this.results.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        success: stage.success,
        duration: stage.duration,
        output: stage.output,
        error: stage.error,
      })),
    };
  }

  private trimMetricsHistory(existingMetrics: ValidationMetrics[]): ValidationMetrics[] {
    const MAX_ENTRIES = 1000;
    return existingMetrics.length > MAX_ENTRIES
      ? existingMetrics.slice(-MAX_ENTRIES)
      : existingMetrics;
  }

  private printSummary(): void {
    console.error(`${colors.bright}${colors.blue}📊 Validation Summary${colors.reset}`);
    console.error(
      `${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
    );

    const successRate =
      this.results.totalStages > 0
        ? Math.round((this.results.passed / this.results.totalStages) * 100)
        : 0;

    const executionMode = this.enableParallel ? 'Parallel' : 'Sequential';
    console.error(`${colors.cyan}Execution mode: ${executionMode}${colors.reset}`);
    console.error(`${colors.cyan}Total stages: ${this.results.totalStages}${colors.reset}`);
    console.error(`${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.error(`${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.error(`${colors.cyan}Success rate: ${successRate}%${colors.reset}`);
    console.error(`${colors.cyan}Total time: ${this.results.totalTime}ms${colors.reset}`);

    if (this.results.success) {
      console.error(`\n${colors.green}${colors.bright}✅ All validations passed!${colors.reset}`);
      if (this.enableParallel) {
        console.error(`${colors.green}🚀 Parallel execution completed successfully${colors.reset}`);
      }
    } else {
      console.error(`\n${colors.red}${colors.bright}❌ Validation failed${colors.reset}`);
      console.error(`${colors.red}Please fix the issues above before proceeding.${colors.reset}`);

      // Output structured failure information for re-triggering
      this.outputFailureDetails();
    }
  }

  private outputFailureDetails(): void {
    const failedStages = this.results.stages.filter(stage => !stage.success);
    if (failedStages.length === 0) {
      return;
    }

    console.error('\n' + colors.yellow + '🔄 RETRIGGER_FAILURES_START' + colors.reset);
    for (const stage of failedStages) {
      const stageConfig = this.getStageConfig(stage.id);
      if (stageConfig) {
        const fixGuidance = this.getStageFixGuidance(stageConfig, stage);
        console.error(`FAILED_STAGE: ${stage.name}`);
        console.error(`FIX_GUIDANCE: ${fixGuidance}`);
        if (stage.error) {
          console.error(`ERROR_DETAILS: ${stage.error}`);
        }
        console.error('---');
      }
    }
    console.error(colors.yellow + '🔄 RETRIGGER_FAILURES_END' + colors.reset);
  }

  private getStageConfig(stageId: string): ValidationStage | null {
    // Find the stage configuration from the enabled stages we loaded
    return this.enabledStages.find(stage => stage.id === stageId) || null;
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up any remaining processes
      cleanupProcesses();
      
      // Disconnect from database
      await this.db.$disconnect();
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Cleanup warning: ${(error as Error).message}${colors.reset}`);
    }
  }

  /**
   * Get the validation results (for use by wrapper classes)
   */
  getResults(): ValidationResults {
    return this.results;
  }
}

// CLI execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments: [sessionId] [--settings=path] [--parallel=true/false] [--sequential]
  let sessionId: string | null = null;
  let settingsPath: string | undefined = undefined;
  let enableParallel: boolean = true; // Default to parallel

  for (const arg of args) {
    if (arg.startsWith('--settings=')) {
      settingsPath = arg.split('=')[1];
    } else if (arg.startsWith('--parallel=')) {
      enableParallel = arg.split('=')[1].toLowerCase() === 'true';
    } else if (arg === '--sequential') {
      enableParallel = false;
    } else if (!sessionId) {
      sessionId = arg;
    }
  }

  const runner = new ValidationRunner({ sessionId, settingsPath, enableParallel });

  try {
    const success = await runner.runValidation();
    await runner.cleanup();
    cleanupProcesses(); // Ensure final cleanup
    process.exit(success ? 0 : 2);
  } catch (error) {
    console.error(`${colors.red}Fatal validation error: ${(error as Error).message}${colors.reset}`);
    await runner.cleanup();
    cleanupProcesses(); // Ensure final cleanup
    process.exit(2);
  }
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(2);
  });
}

export { ValidationRunner };
