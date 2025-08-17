#!/usr/bin/env npx ts-node

/**
 * Optimized Log Cleanup Script
 * 
 * Provides advanced log cleanup with performance metrics and flexible policies.
 */

import { join } from 'path';
import { WinstonLogger } from '../src/logger-winston';
import { OptimizedLogCleaner } from '../src/utils/optimized-log-cleaner';

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
  console.log('📊 Log directory statistics (before cleanup):');
  console.log(`  Total files: ${stats.totalFiles}`);
  console.log(`  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Average file size: ${(stats.averageFileSize / 1024).toFixed(2)} KB`);
  
  if (stats.oldestFile && stats.newestFile) {
    console.log(`  Oldest file: ${stats.oldestFile.toLocaleDateString()}`);
    console.log(`  Newest file: ${stats.newestFile.toLocaleDateString()}`);
  }

  console.log('  Size by log level:');
  for (const [level, size] of Object.entries(stats.sizeByLevel)) {
    console.log(`    ${level}: ${((size as number) / 1024 / 1024).toFixed(2)} MB`);
  }
  console.log();
}

function displayCleanupResults(result: CleanupResult): void {
  console.log('✅ Cleanup completed successfully!\n');
  console.log('📈 Cleanup Results:');
  console.log(`  Files deleted: ${result.deletedFiles}`);
  console.log(`  Files compressed: ${result.compressedFiles}`);
  console.log(`  Space freed: ${(result.freedSpace / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Processing time: ${result.processingTime} ms`);
}

function displayPostCleanupStats(statsBefore: LogStats, statsAfter: LogStats): void {
  console.log('\n📊 Log directory statistics (after cleanup):');
  console.log(`  Total files: ${statsAfter.totalFiles}`);
  console.log(`  Total size: ${(statsAfter.totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  const spaceSaved = statsBefore.totalSize - statsAfter.totalSize;
  const percentageSaved = ((spaceSaved / statsBefore.totalSize) * 100).toFixed(1);
  console.log(`  Space saved: ${(spaceSaved / 1024 / 1024).toFixed(2)} MB (${percentageSaved}%)`);
}

function assessPerformance(statsBefore: LogStats, result: CleanupResult): void {
  console.log('\n⚡ Performance Assessment:');
  const processingSpeed = (statsBefore.totalSize / 1024 / 1024) / (result.processingTime / 1000);
  console.log(`  Processing speed: ${processingSpeed.toFixed(2)} MB/s`);
  
  if (result.processingTime < 5000) {
    console.log('  Performance: Excellent ✅');
  } else if (result.processingTime < 15000) {
    console.log('  Performance: Good ✅');
  } else {
    console.log('  Performance: Needs optimization ⚠️');
  }
}

function displayOptimizationRecommendations(statsAfter: LogStats, result: CleanupResult, statsBefore: LogStats): void {
  console.log('\n💡 Recommendations:');
  if (statsAfter.totalFiles > 30) {
    console.log('  - Consider reducing maxLogFiles for better performance');
  }
  if (statsAfter.totalSize > 50 * 1024 * 1024) {
    console.log('  - Consider reducing maxLogAge for active development');
  }
  if (result.compressedFiles === 0 && statsBefore.totalFiles > 10) {
    console.log('  - Consider enabling log compression to save space');
  }
  if (result.compressedFiles > 0) {
    console.log(`  - Log compression is working well (${result.compressedFiles} files compressed)`);
  }
}

async function main() {
  console.log('🧹 Starting optimized log cleanup...\n');

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
      maxLogSize: 5 * 1024 * 1024,
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

    console.log('🚀 Performing optimized cleanup...');
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
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}