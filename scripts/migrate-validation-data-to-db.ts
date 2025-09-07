#!/usr/bin/env ts-node

/**
 * Migrate validation data from JSON files to SQLite database
 *
 * This script processes validation-metrics.json and validation-sessions.json
 * and populates the new ValidationRun, ValidationStage, and ValidationLog models
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDatabaseService, createDatabaseService } from '../src/services/database';
import { WinstonLogger } from '../src/logger-winston';
import { LogLevel } from '@prisma/client';

// Initialize database service first
const logger = new WinstonLogger({
  level: 'info',
  logsDir: path.join(process.cwd(), 'logs'),
  enableConsole: true,
  enableFile: false,
});
createDatabaseService(logger);

// Interface for the original JSON validation data structure
interface OriginalValidationRun {
  timestamp: string;
  startTime: number;
  totalTime: number;
  totalStages: number;
  passed: number;
  failed: number;
  success: boolean;
  stages: OriginalValidationStage[];
}

interface OriginalValidationStage {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  command?: string;
  exitCode?: number;
  output?: string;
  error?: string;
  enabled?: boolean;
  continueOnFailure?: boolean;
}

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

/**
 * Read and parse validation metrics JSON file
 */
function readValidationMetrics(): OriginalValidationRun[] {
  const metricsPath = path.join(process.cwd(), 'validation-metrics.json');

  if (!fs.existsSync(metricsPath)) {
    console.error(`${colors.yellow}⚠️  validation-metrics.json not found, skipping${colors.reset}`);
    return [];
  }

  try {
    const content = fs.readFileSync(metricsPath, 'utf-8');
    const data = JSON.parse(content) as OriginalValidationRun[];
    console.error(
      `${colors.blue}📊 Found ${data.length} validation runs in JSON file${colors.reset}`
    );
    return data;
  } catch (error) {
    console.error(`${colors.red}❌ Error reading validation-metrics.json: ${error}${colors.reset}`);
    return [];
  }
}

/**
 * Read and parse validation sessions JSON file
 */
function readValidationSessions(): any[] {
  const sessionsPath = path.join(process.cwd(), 'validation-sessions.json');

  if (!fs.existsSync(sessionsPath)) {
    console.error(
      `${colors.yellow}⚠️  validation-sessions.json not found, skipping${colors.reset}`
    );
    return [];
  }

  try {
    const content = fs.readFileSync(sessionsPath, 'utf-8');
    const data = JSON.parse(content) as any[];
    console.error(
      `${colors.blue}📊 Found ${data.length} validation sessions in JSON file${colors.reset}`
    );
    return data;
  } catch (error) {
    console.error(
      `${colors.red}❌ Error reading validation-sessions.json: ${error}${colors.reset}`
    );
    return [];
  }
}

/**
 * Migrate validation runs to database
 */
async function migrateValidationRuns(runs: OriginalValidationRun[]): Promise<void> {
  const db = getDatabaseService();
  let migratedCount = 0;
  let errorCount = 0;

  console.error(
    `${colors.cyan}🔄 Starting migration of ${runs.length} validation runs...${colors.reset}`
  );

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];

    try {
      // Create validation run
      const validationRun = await db.validationRun.create({
        data: {
          timestamp: new Date(run.timestamp),
          startTime: BigInt(run.startTime),
          totalTime: run.totalTime,
          totalStages: run.totalStages,
          passedStages: run.passed,
          failedStages: run.failed,
          success: run.success,
          triggerType: 'historical', // Mark as migrated data
          environment: 'development',
        },
      });

      // Create validation stages for this run
      for (let j = 0; j < run.stages.length; j++) {
        const stage = run.stages[j];

        await db.validationStage.create({
          data: {
            runId: validationRun.id,
            stageId: stage.id,
            stageName: stage.name,
            success: stage.success,
            duration: stage.duration,
            command: stage.command || null,
            exitCode: stage.exitCode || null,
            output: stage.output || null,
            errorMessage: stage.error || null,
            enabled: stage.enabled ?? true,
            continueOnFailure: stage.continueOnFailure ?? false,
            order: j + 1,
          },
        });
      }

      // Create a summary log for the run
      await db.validationLog.create({
        data: {
          runId: validationRun.id,
          level: run.success ? LogLevel.INFO : LogLevel.ERROR,
          message: `Validation run ${run.success ? 'completed successfully' : 'failed'}: ${run.passed}/${run.totalStages} stages passed`,
        },
      });

      migratedCount++;

      if (migratedCount % 100 === 0) {
        console.error(
          `${colors.cyan}  📈 Migrated ${migratedCount}/${runs.length} runs...${colors.reset}`
        );
      }
    } catch (error) {
      console.error(`${colors.red}❌ Error migrating run ${i + 1}: ${error}${colors.reset}`);
      errorCount++;

      // Continue migration even if some runs fail
      if (errorCount > 10) {
        console.error(
          `${colors.red}❌ Too many errors (${errorCount}), stopping migration${colors.reset}`
        );
        break;
      }
    }
  }

  console.error(
    `${colors.green}✅ Migration completed: ${migratedCount} runs migrated${colors.reset}`
  );
  if (errorCount > 0) {
    console.error(`${colors.yellow}⚠️  ${errorCount} runs failed to migrate${colors.reset}`);
  }
}

/**
 * Clean up old JSON files (create backups first)
 */
async function cleanupJsonFiles(): Promise<void> {
  const files = ['validation-metrics.json', 'validation-sessions.json'];

  for (const filename of files) {
    const filepath = path.join(process.cwd(), filename);

    if (fs.existsSync(filepath)) {
      const backupPath = `${filepath}.backup.${Date.now()}`;

      try {
        fs.copyFileSync(filepath, backupPath);
        console.error(
          `${colors.blue}💾 Created backup: ${path.basename(backupPath)}${colors.reset}`
        );

        // Optionally remove original file (comment out to keep originals)
        // fs.unlinkSync(filepath);
        // console.error(`${colors.green}🗑️  Removed original: ${filename}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}❌ Error backing up ${filename}: ${error}${colors.reset}`);
      }
    }
  }
}

/**
 * Display migration summary
 */
async function displaySummary(): Promise<void> {
  const db = getDatabaseService();

  try {
    const totalRuns = await db.validationRun.count();
    const totalStages = await db.validationStage.count();
    const totalLogs = await db.validationLog.count();
    const successfulRuns = await db.validationRun.count({ where: { success: true } });

    const successRate = totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(1) : '0';

    console.error(`\\n${colors.bold}${colors.green}📊 Migration Summary:${colors.reset}`);
    console.error(`${colors.cyan}   • Total Validation Runs: ${totalRuns}${colors.reset}`);
    console.error(`${colors.cyan}   • Total Validation Stages: ${totalStages}${colors.reset}`);
    console.error(`${colors.cyan}   • Total Validation Logs: ${totalLogs}${colors.reset}`);
    console.error(
      `${colors.cyan}   • Success Rate: ${successRate}% (${successfulRuns}/${totalRuns})${colors.reset}`
    );

    // Get some recent runs for verification
    const recentRuns = await db.validationRun.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        stages: true,
        _count: {
          select: {
            stages: true,
            logs: true,
          },
        },
      },
    });

    if (recentRuns.length > 0) {
      console.error(`\\n${colors.bold}${colors.blue}🕐 Recent Validation Runs:${colors.reset}`);
      recentRuns.forEach((run, index) => {
        const status = run.success
          ? `${colors.green}✅ PASS${colors.reset}`
          : `${colors.red}❌ FAIL${colors.reset}`;
        console.error(
          `   ${index + 1}. ${run.timestamp.toISOString()} - ${status} (${run.passedStages}/${run.totalStages} stages, ${run._count.logs} logs)`
        );
      });
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error generating summary: ${error}${colors.reset}`);
  }
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  console.error(
    `${colors.bold}${colors.blue}🚀 Validation Data Migration to SQLite${colors.reset}\\n`
  );

  try {
    // Check if we've already migrated (avoid duplicate data)
    const db = getDatabaseService();
    const existingRuns = await db.validationRun.count();

    if (existingRuns > 0) {
      console.error(
        `${colors.yellow}⚠️  Found ${existingRuns} existing validation runs in database${colors.reset}`
      );
      console.error(
        `${colors.yellow}   This script will add new data. Consider clearing the database first if you want a clean migration.${colors.reset}\\n`
      );
    }

    // Read JSON data
    const validationRuns = readValidationMetrics();
    const validationSessions = readValidationSessions();

    if (validationRuns.length === 0 && validationSessions.length === 0) {
      console.error(`${colors.yellow}⚠️  No data found to migrate${colors.reset}`);
      return;
    }

    // Migrate validation runs
    if (validationRuns.length > 0) {
      await migrateValidationRuns(validationRuns);
    }

    // TODO: Handle validation sessions if needed
    if (validationSessions.length > 0) {
      console.error(
        `${colors.blue}ℹ️  Validation sessions migration not implemented yet (${validationSessions.length} sessions skipped)${colors.reset}`
      );
    }

    // Display summary
    await displaySummary();

    // Create backups of original files
    await cleanupJsonFiles();

    console.error(
      `\\n${colors.bold}${colors.green}🎉 Migration completed successfully!${colors.reset}`
    );
    console.error(
      `${colors.cyan}   Validation data is now available via the API at /api/validation-runs${colors.reset}`
    );
  } catch (error) {
    console.error(`${colors.red}❌ Migration failed: ${error}${colors.reset}`);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(`${colors.red}❌ Unexpected error: ${error}${colors.reset}`);
      process.exit(1);
    });
}

export { main as migrateValidationData };
