#!/usr/bin/env npx ts-node

/**
 * Log Statistics Script
 *
 * Provides detailed analysis of log directory without performing cleanup.
 */

import { join } from 'path';
import { WinstonLogger } from '../src/logger-winston';
import { OptimizedLogCleaner } from '../src/utils/optimized-log-cleaner';

// Constants
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * KB_PER_MB;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const LEVEL_NAME_PADDING = 8;
const SIZE_PADDING = 8;
const MS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

// Log analysis thresholds
const LOG_FILE_COUNT_THRESHOLDS = {
  HIGH: 100,
  MODERATE: 50
};
const LOG_SIZE_THRESHOLDS_MB = {
  HIGH: 500,
  MODERATE: 100,
  LARGE_AVG_FILE: 50,
  MODERATE_AVG_FILE: 10
};
const LOG_AGE_THRESHOLDS_DAYS = {
  VERY_OLD: 90,
  OLD: 30
};
const LOG_LEVEL_PERCENTAGE_THRESHOLDS = {
  DEBUG_WARNING: 0.3,
  INFO_WARNING: 0.5
};

// Configuration defaults
const DEFAULT_MAX_LOG_FILES = 50;
const DEFAULT_MAX_LOG_AGE_DAYS = 30;
const DEFAULT_MAX_LOG_SIZE_MB = 10;
const DECIMAL_PLACES = 2;
const PERCENTAGE_DECIMAL_PLACES = 1;

interface LogStats {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  oldestFile: Date | null;
  newestFile: Date | null;
  sizeByLevel: Record<string, number>;
}

function displayOverallStats(stats: LogStats): void {
  console.log('📈 Overall Statistics:');
  console.log(`  Total log files: ${stats.totalFiles}`);
  console.log(`  Total size: ${(stats.totalSize / BYTES_PER_MB).toFixed(DECIMAL_PLACES)} MB`);
  console.log(`  Average file size: ${(stats.averageFileSize / BYTES_PER_KB).toFixed(DECIMAL_PLACES)} KB`);

  if (stats.oldestFile && stats.newestFile) {
    const ageInDays = (Date.now() - stats.oldestFile.getTime()) / MS_PER_DAY;
    console.log(
      `  Oldest file: ${stats.oldestFile.toLocaleDateString()} (${Math.floor(ageInDays)} days ago)`
    );
    console.log(`  Newest file: ${stats.newestFile.toLocaleDateString()}`);
  }
}

function displaySizeByLevel(stats: LogStats): void {
  console.log('\n📋 Size by Log Level:');
  const totalSizeForPercentage = Object.values(stats.sizeByLevel).reduce(
    (a: number, b: number) => a + b,
    0
  );
  for (const [level, size] of Object.entries(stats.sizeByLevel).sort(
    ([, a]: [string, number], [, b]: [string, number]) => b - a
  )) {
    const percentage = (((size as number) / totalSizeForPercentage) * 100).toFixed(PERCENTAGE_DECIMAL_PLACES);
    console.log(
      `  ${level.padEnd(LEVEL_NAME_PADDING)}: ${((size as number) / BYTES_PER_MB).toFixed(DECIMAL_PLACES).padStart(SIZE_PADDING)} MB (${percentage.padStart(5)}%)`
    );
  }
}

function performHealthAssessment(stats: LogStats): void {
  console.log('\n🔍 Health Assessment:');

  if (stats.totalFiles > LOG_FILE_COUNT_THRESHOLDS.HIGH) {
    console.log('  ⚠️  High number of log files - consider cleanup');
  } else if (stats.totalFiles > LOG_FILE_COUNT_THRESHOLDS.MODERATE) {
    console.log('  ⚠️  Moderate number of log files - monitoring recommended');
  } else {
    console.log('  ✅ Log file count is healthy');
  }

  if (stats.totalSize > LOG_SIZE_THRESHOLDS_MB.HIGH * BYTES_PER_MB) {
    // 500MB
    console.log('  ⚠️  Large log directory size - cleanup recommended');
  } else if (stats.totalSize > LOG_SIZE_THRESHOLDS_MB.MODERATE * BYTES_PER_MB) {
    // 100MB
    console.log('  ⚠️  Moderate log directory size - monitoring recommended');
  } else {
    console.log('  ✅ Log directory size is healthy');
  }

  if (stats.averageFileSize > LOG_SIZE_THRESHOLDS_MB.LARGE_AVG_FILE * BYTES_PER_MB) {
    // 50MB
    console.log('  ⚠️  Large average file size - consider log rotation');
  } else if (stats.averageFileSize > LOG_SIZE_THRESHOLDS_MB.MODERATE_AVG_FILE * BYTES_PER_MB) {
    // 10MB
    console.log('  ⚠️  Moderate average file size - monitoring recommended');
  } else {
    console.log('  ✅ Average file size is healthy');
  }

  if (stats.oldestFile) {
    const ageInDays = (Date.now() - stats.oldestFile.getTime()) / MS_PER_DAY;
    if (ageInDays > LOG_AGE_THRESHOLDS_DAYS.VERY_OLD) {
      console.log('  ⚠️  Very old log files present - consider cleanup');
    } else if (ageInDays > LOG_AGE_THRESHOLDS_DAYS.OLD) {
      console.log('  ⚠️  Old log files present - monitoring recommended');
    } else {
      console.log('  ✅ Log file age is healthy');
    }
  }
}

function displayRecommendations(stats: LogStats): void {
  console.log('\n💡 Recommendations:');
  if (stats.totalFiles > LOG_FILE_COUNT_THRESHOLDS.MODERATE) {
    console.log('  - Run log cleanup: npm run logs:clean:optimized');
  }
  if (stats.totalSize > LOG_SIZE_THRESHOLDS_MB.MODERATE * BYTES_PER_MB) {
    console.log('  - Enable log compression to reduce disk usage');
  }
  if (stats.sizeByLevel.debug > stats.totalSize * LOG_LEVEL_PERCENTAGE_THRESHOLDS.DEBUG_WARNING) {
    console.log('  - Consider reducing debug log level in production');
  }
  if (stats.sizeByLevel.info > stats.totalSize * LOG_LEVEL_PERCENTAGE_THRESHOLDS.INFO_WARNING) {
    console.log('  - Review info log verbosity for optimization');
  }

  console.log('\n🛠️  Available Commands:');
  console.log('  npm run logs:clean:optimized  - Run optimized log cleanup');
  console.log('  npm run logs:clean           - Run standard log cleanup');
  console.log('  npm run logs:stats           - Show this analysis');
}

async function main() {
  console.log('📊 Log Directory Analysis\n');

  const logsDir = join(process.cwd(), 'logs');

  const logger = new WinstonLogger({
    level: 'error',
    logsDir,
    enableConsole: false,
    enableFile: false,
  });

  const cleaner = new OptimizedLogCleaner(
    {
      logsDir,
      maxLogFiles: DEFAULT_MAX_LOG_FILES,
      maxLogAge: DEFAULT_MAX_LOG_AGE_DAYS,
      maxLogSize: DEFAULT_MAX_LOG_SIZE_MB * BYTES_PER_MB,
    },
    logger
  );

  try {
    const stats = await cleaner.getLogStats();

    displayOverallStats(stats);
    displaySizeByLevel(stats);
    performHealthAssessment(stats);
    displayRecommendations(stats);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}
