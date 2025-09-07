#!/usr/bin/env npx ts-node

/**
 * Optimized Log Cleanup Script
 *
 * Provides advanced log cleanup with performance metrics and flexible policies.
 */

import { join } from 'path';
import { WinstonLogger } from '../src/logger-winston';
import { OptimizedLogCleaner } from '../src/utils/optimized-log-cleaner';

// Constants
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * KB_PER_MB;
const MS_PER_SECOND = 1000;
const DECIMAL_PLACES = 2;
const PERCENTAGE_DECIMAL_PLACES = 1;

// Performance thresholds
const PERFORMANCE_THRESHOLDS_MS = {
  EXCELLENT: 5000,
  GOOD: 15000,
};

// Recommendation thresholds
const RECOMMENDATION_THRESHOLDS = {
  MAX_FILES_WARNING: 30,
  MAX_SIZE_MB_WARNING: 50,
  MIN_FILES_FOR_COMPRESSION_RECOMMENDATION: 10,
};

interface LogStats {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  oldestFile: Date | null;
  newestFile: Date | null;
  sizeByLevel: Record<string, number>;
}

interface CleanupResult {
  deletedFiles: number;
  compressedFiles: number;
  freedSpace: number;
  processingTime: number;
}

function displayPreCleanupStats(stats: LogStats): void {
  console.error('📊 Log directory statistics (before cleanup):');
  console.error(`  Total files: ${stats.totalFiles}`);
  console.error(`  Total size: ${(stats.totalSize / BYTES_PER_MB).toFixed(DECIMAL_PLACES)} MB`);
  console.error(
    `  Average file size: ${(stats.averageFileSize / BYTES_PER_KB).toFixed(DECIMAL_PLACES)} KB`
  );

  if (stats.oldestFile && stats.newestFile) {
    console.error(`  Oldest file: ${stats.oldestFile.toLocaleDateString()}`);
    console.error(`  Newest file: ${stats.newestFile.toLocaleDateString()}`);
  }

  console.error('  Size by log level:');
  for (const [level, size] of Object.entries(stats.sizeByLevel)) {
    console.error(`    ${level}: ${((size as number) / BYTES_PER_MB).toFixed(DECIMAL_PLACES)} MB`);
  }
  console.error();
}

function displayCleanupResults(result: CleanupResult): void {
  console.error('✅ Cleanup completed successfully!\n');
  console.error('📈 Cleanup Results:');
  console.error(`  Files deleted: ${result.deletedFiles}`);
  console.error(`  Files compressed: ${result.compressedFiles}`);
  console.error(`  Space freed: ${(result.freedSpace / BYTES_PER_MB).toFixed(DECIMAL_PLACES)} MB`);
  console.error(`  Processing time: ${result.processingTime} ms`);
}

function displayPostCleanupStats(statsBefore: LogStats, statsAfter: LogStats): void {
  console.error('\n📊 Log directory statistics (after cleanup):');
  console.error(`  Total files: ${statsAfter.totalFiles}`);
  console.error(
    `  Total size: ${(statsAfter.totalSize / BYTES_PER_MB).toFixed(DECIMAL_PLACES)} MB`
  );

  const spaceSaved = statsBefore.totalSize - statsAfter.totalSize;
  const percentageSaved = ((spaceSaved / statsBefore.totalSize) * 100).toFixed(
    PERCENTAGE_DECIMAL_PLACES
  );
  console.error(
    `  Space saved: ${(spaceSaved / BYTES_PER_MB).toFixed(DECIMAL_PLACES)} MB (${percentageSaved}%)`
  );
}

function assessPerformance(statsBefore: LogStats, result: CleanupResult): void {
  console.error('\n⚡ Performance Assessment:');
  const processingSpeed =
    statsBefore.totalSize / BYTES_PER_MB / (result.processingTime / MS_PER_SECOND);
  console.error(`  Processing speed: ${processingSpeed.toFixed(2)} MB/s`);

  if (result.processingTime < PERFORMANCE_THRESHOLDS_MS.EXCELLENT) {
    console.error('  Performance: Excellent ✅');
  } else if (result.processingTime < PERFORMANCE_THRESHOLDS_MS.GOOD) {
    console.error('  Performance: Good ✅');
  } else {
    console.error('  Performance: Needs optimization ⚠️');
  }
}

function displayOptimizationRecommendations(
  statsAfter: LogStats,
  result: CleanupResult,
  statsBefore: LogStats
): void {
  console.error('\n💡 Recommendations:');
  if (statsAfter.totalFiles > RECOMMENDATION_THRESHOLDS.MAX_FILES_WARNING) {
    console.error('  - Consider reducing maxLogFiles for better performance');
  }
  if (statsAfter.totalSize > RECOMMENDATION_THRESHOLDS.MAX_SIZE_MB_WARNING * BYTES_PER_MB) {
    console.error('  - Consider reducing maxLogAge for active development');
  }
  if (
    result.compressedFiles === 0 &&
    statsBefore.totalFiles > RECOMMENDATION_THRESHOLDS.MIN_FILES_FOR_COMPRESSION_RECOMMENDATION
  ) {
    console.error('  - Consider enabling log compression to save space');
  }
  if (result.compressedFiles > 0) {
    console.error(
      `  - Log compression is working well (${result.compressedFiles} files compressed)`
    );
  }
}

async function main() {
  console.error('🧹 Starting optimized log cleanup...\n');

  const logsDir = join(process.cwd(), 'logs');

  const logger = new WinstonLogger({
    level: 'info',
    logsDir,
    enableConsole: true,
    enableFile: false,
  });

  const cleaner = new OptimizedLogCleaner(
    {
      logsDir,
      maxLogFiles: 25,
      maxLogAge: 14,
      maxLogSize: 5 * BYTES_PER_KB * KB_PER_MB,
      compressionEnabled: true,
      retentionPolicy: {
        critical: 60,
        error: 21,
        info: 7,
        debug: 3,
      },
    },
    logger
  );

  try {
    const statsBefore = await cleaner.getLogStats();
    displayPreCleanupStats(statsBefore);

    console.error('🚀 Performing optimized cleanup...');
    const result = await cleaner.cleanLogs();

    displayCleanupResults(result);

    const statsAfter = await cleaner.getLogStats();
    displayPostCleanupStats(statsBefore, statsAfter);
    assessPerformance(statsBefore, result);
    displayOptimizationRecommendations(statsAfter, result, statsBefore);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
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
