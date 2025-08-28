#!/usr/bin/env node

/**
 * Claude Code validation hook script
 *
 * This script runs validation stages configured in settings.json when Claude Code attempts to stop/complete a task.
 * It executes user-configured validation stages sequentially and tracks timing and success metrics.
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Settings, ValidationStage } from '../src/types/settings.types';
import { PrismaClient } from '@prisma/client';
import { getEnabledValidationStages } from '../src/services/validation-stage-config.service';

// Constants
const DEFAULT_STAGE_TIMEOUT_MS = 30000;

const execAsync = promisify(exec);

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

  constructor(options: ValidationRunnerOptions = {}) {
    this.settingsPath = options.settingsPath || path.join(process.cwd(), 'settings.json');
    this.sessionId = options.sessionId || null;
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
          OR: [
            { projectId: null },
            { id: { startsWith: 'CODEGOAT-' } },
          ],
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
    console.error(
      `${colors.bright}[${stageNumber}/${totalStages}] ${stage.name}${colors.reset}`
    );
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
        console.error(
          `${colors.red}🛑 Stage failed and continueOnFailure is false. Stopping pipeline.${colors.reset}\n`
        );
        return false;
      } else {
        console.error(
          `${colors.yellow}⚠️  Stage failed but continuing due to continueOnFailure setting${colors.reset}\n`
        );
        return true;
      }
    }
  }

  async runValidation(): Promise<boolean> {
    this.printValidationHeader();

    try {
      // Load validation stages from database instead of settings.json
      const enabledStages = await getEnabledValidationStages();

      if (enabledStages.length === 0) {
        console.error(
          `${colors.yellow}⚠️  No validation stages configured or enabled in database${colors.reset}`
        );
        this.results.success = true;
        this.saveMetrics();
        return true;
      }

      this.results.totalStages = enabledStages.length;
      console.error(
        `${colors.cyan}🎯 Running ${enabledStages.length} validation stages from database...\n${colors.reset}`
      );

      let overallSuccess = true;

      for (let i = 0; i < enabledStages.length; i++) {
        const shouldContinue = await this.processStage(enabledStages[i], i + 1, enabledStages.length);
        if (!shouldContinue) {
          overallSuccess = false;
          break;
        }
      }

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

    try {
      const options = {
        timeout: stage.timeout || DEFAULT_STAGE_TIMEOUT_MS,
        cwd: stage.workingDir || process.cwd(),
        encoding: 'utf8' as const,
      };

      const { stdout, stderr } = await execAsync(stage.command, options);
      const duration = Date.now() - startTime;

      return {
        id: stage.id,
        name: stage.name,
        success: true,
        duration,
        output: stdout || stderr,
      };
    } catch (error: unknown) {
      const validationError = error as ValidationError;
      const duration = Date.now() - startTime;

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

    console.error(`${colors.cyan}Total stages: ${this.results.totalStages}${colors.reset}`);
    console.error(`${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.error(`${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.error(`${colors.cyan}Success rate: ${successRate}%${colors.reset}`);
    console.error(`${colors.cyan}Total time: ${this.results.totalTime}ms${colors.reset}`);

    if (this.results.success) {
      console.error(`\n${colors.green}${colors.bright}✅ All validations passed!${colors.reset}`);
    } else {
      console.error(`\n${colors.red}${colors.bright}❌ Validation failed${colors.reset}`);
      console.error(`${colors.red}Please fix the issues above before proceeding.${colors.reset}`);
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.db.$disconnect();
    } catch {
      // Ignore cleanup errors
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

  // Parse arguments: [sessionId] [--settings=path]
  let sessionId: string | null = null;
  let settingsPath: string | undefined = undefined;

  for (const arg of args) {
    if (arg.startsWith('--settings=')) {
      settingsPath = arg.split('=')[1];
    } else if (!sessionId) {
      sessionId = arg;
    }
  }

  const runner = new ValidationRunner({ sessionId, settingsPath });

  try {
    const success = await runner.runValidation();
    await runner.cleanup();
    process.exit(success ? 0 : 2);
  } catch (error) {
    await runner.cleanup();
    throw error;
  }
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(2);
  });
}

export { ValidationRunner };
