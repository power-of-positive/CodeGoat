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

const execAsync = promisify(exec);

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

interface ValidationStageResult {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  output?: string;
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
  cyan: '\x1b[36m'
};

class ValidationRunner {
  private settingsPath: string;
  private sessionId: string | null;
  private startTime: number;
  private results: ValidationResults;

  constructor(options: ValidationRunnerOptions = {}) {
    this.settingsPath = options.settingsPath || path.join(process.cwd(), 'settings.json');
    this.sessionId = options.sessionId || null;
    this.startTime = Date.now();
    this.results = {
      totalStages: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      stages: [],
      totalTime: 0,
      success: false
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

  async runValidation(): Promise<boolean> {
    console.log(`${colors.blue}${colors.bright}🔍 Running Validation Pipeline${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    if (this.sessionId) {
      console.log(`${colors.cyan}📊 Session ID: ${this.sessionId}${colors.reset}`);
    }
    
    console.log(`${colors.cyan}⏰ Started at: ${new Date().toISOString()}${colors.reset}\n`);

    try {
      const settings = await this.loadSettings();
      const validationSettings = settings.validation;
      const stages = validationSettings?.stages || [];
      
      // Filter and sort enabled stages
      const enabledStages = stages
        .filter((stage: ValidationStage) => stage.enabled)
        .sort((a: ValidationStage, b: ValidationStage) => (a.order || 0) - (b.order || 0));

      if (enabledStages.length === 0) {
        console.log(`${colors.yellow}⚠️  No validation stages configured or enabled${colors.reset}`);
        this.results.success = true;
        this.saveMetrics();
        return true;
      }

      this.results.totalStages = enabledStages.length;
      console.log(`${colors.cyan}🎯 Running ${enabledStages.length} validation stages...\n${colors.reset}`);

      let overallSuccess = true;

      for (let i = 0; i < enabledStages.length; i++) {
        const stage = enabledStages[i];
        const stageNumber = i + 1;
        
        console.log(`${colors.bright}[${stageNumber}/${enabledStages.length}] ${stage.name}${colors.reset}`);
        console.log(`${colors.cyan}    Command: ${stage.command}${colors.reset}`);
        
        const stageResult = await this.runStage(stage);
        this.results.stages.push(stageResult);
        
        if (stageResult.success) {
          this.results.passed++;
          console.log(`${colors.green}    ✅ Passed (${stageResult.duration}ms)${colors.reset}\n`);
        } else {
          this.results.failed++;
          console.log(`${colors.red}    ❌ Failed (${stageResult.duration}ms)${colors.reset}`);
          if (stageResult.error) {
            console.log(`${colors.red}    Error: ${stageResult.error}${colors.reset}`);
          }
          console.log('');
          
          if (!stage.continueOnFailure) {
            console.log(`${colors.red}🛑 Stage failed and continueOnFailure is false. Stopping pipeline.${colors.reset}\n`);
            overallSuccess = false;
            break;
          } else {
            console.log(`${colors.yellow}⚠️  Stage failed but continuing due to continueOnFailure setting${colors.reset}\n`);
          }
        }
      }

      this.results.success = overallSuccess && this.results.failed === 0;
      this.results.totalTime = Date.now() - this.startTime;

      await this.saveMetrics();
      this.printSummary();

      return this.results.success;
    } catch (error) {
      console.error(`${colors.red}💥 Validation pipeline failed: ${(error as Error).message}${colors.reset}`);
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
        timeout: stage.timeout || 30000,
        cwd: stage.workingDir || process.cwd(),
        encoding: 'utf8' as const
      };

      const { stdout, stderr } = await execAsync(stage.command, options);
      const duration = Date.now() - startTime;

      return {
        id: stage.id,
        name: stage.name,
        success: true,
        duration,
        output: stdout || stderr
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        id: stage.id,
        name: stage.name,
        success: false,
        duration,
        error: error.message || 'Unknown error',
        output: error.stdout || error.stderr
      };
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      const metricsPath = path.join(process.cwd(), 'validation-metrics.json');
      let existingMetrics: any[] = [];

      try {
        const content = await fs.readFile(metricsPath, 'utf-8');
        existingMetrics = JSON.parse(content);
      } catch {
        // File doesn't exist, start with empty array
      }

      const metricsEntry = {
        timestamp: new Date().toISOString(),
        startTime: this.startTime,
        totalTime: this.results.totalTime,
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
          error: stage.error
        }))
      };

      existingMetrics.push(metricsEntry);
      
      // Keep only the last 1000 entries
      if (existingMetrics.length > 1000) {
        existingMetrics = existingMetrics.slice(-1000);
      }

      await fs.writeFile(metricsPath, JSON.stringify(existingMetrics, null, 2));
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Could not save metrics: ${(error as Error).message}${colors.reset}`);
    }
  }

  private printSummary(): void {
    console.log(`${colors.bright}${colors.blue}📊 Validation Summary${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    const successRate = this.results.totalStages > 0 ? 
      Math.round((this.results.passed / this.results.totalStages) * 100) : 0;
    
    console.log(`${colors.cyan}Total stages: ${this.results.totalStages}${colors.reset}`);
    console.log(`${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.log(`${colors.cyan}Success rate: ${successRate}%${colors.reset}`);
    console.log(`${colors.cyan}Total time: ${this.results.totalTime}ms${colors.reset}`);
    
    if (this.results.success) {
      console.log(`\n${colors.green}${colors.bright}✅ All validations passed!${colors.reset}`);
    } else {
      console.log(`\n${colors.red}${colors.bright}❌ Validation failed${colors.reset}`);
      console.log(`${colors.red}Please fix the issues above before proceeding.${colors.reset}`);
    }
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
  
  const success = await runner.runValidation();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { ValidationRunner };