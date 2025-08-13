#!/usr/bin/env npx ts-node

/**
 * Optimized Log Cleanup Script
 * 
 * Provides advanced log cleanup with performance metrics and flexible policies.
 */

import { join } from 'path';
import { WinstonLogger } from '../src/logger-winston';
import { OptimizedLogCleaner } from '../src/utils/optimized-log-cleaner';

async function main() {
  console.log('🧹 Starting optimized log cleanup...\n');

  const logsDir = join(process.cwd(), 'logs');
  
  // Create logger for cleanup operations
  const logger = new WinstonLogger({
    level: 'info',
    logsDir,
    enableConsole: true,
    enableFile: false, // Don't create more log files during cleanup
  });

  // Create optimized log cleaner with advanced configuration
  const cleaner = new OptimizedLogCleaner(
    {
      logsDir,
      maxLogFiles: 25, // Reduced from 50 for better performance
      maxLogAge: 14,   // Reduced from 30 days for active development
      maxLogSize: 5 * 1024 * 1024, // 5MB instead of 10MB
      compressionEnabled: true,
      retentionPolicy: {
        critical: 60, // Critical errors kept for 60 days
        error: 21,    // Errors kept for 21 days
        info: 7,      // Info logs kept for 7 days
        debug: 3,     // Debug logs kept for 3 days
      },
    },
    logger
  );

  try {
    // Get statistics before cleanup
    console.log('📊 Log directory statistics (before cleanup):');
    const statsBefore = await cleaner.getLogStats();
    console.log(`  Total files: ${statsBefore.totalFiles}`);
    console.log(`  Total size: ${(statsBefore.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Average file size: ${(statsBefore.averageFileSize / 1024).toFixed(2)} KB`);
    
    if (statsBefore.oldestFile && statsBefore.newestFile) {
      console.log(`  Oldest file: ${statsBefore.oldestFile.toLocaleDateString()}`);
      console.log(`  Newest file: ${statsBefore.newestFile.toLocaleDateString()}`);
    }

    console.log('  Size by log level:');
    for (const [level, size] of Object.entries(statsBefore.sizeByLevel)) {
      console.log(`    ${level}: ${(size / 1024 / 1024).toFixed(2)} MB`);
    }
    console.log();

    // Perform cleanup
    console.log('🚀 Performing optimized cleanup...');
    const result = await cleaner.cleanLogs();

    // Show results
    console.log('✅ Cleanup completed successfully!\n');
    console.log('📈 Cleanup Results:');
    console.log(`  Files deleted: ${result.deletedFiles}`);
    console.log(`  Files compressed: ${result.compressedFiles}`);
    console.log(`  Space freed: ${(result.freedSpace / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Processing time: ${result.processingTime} ms`);

    // Get statistics after cleanup
    console.log('\n📊 Log directory statistics (after cleanup):');
    const statsAfter = await cleaner.getLogStats();
    console.log(`  Total files: ${statsAfter.totalFiles}`);
    console.log(`  Total size: ${(statsAfter.totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    const spaceSaved = statsBefore.totalSize - statsAfter.totalSize;
    const percentageSaved = ((spaceSaved / statsBefore.totalSize) * 100).toFixed(1);
    console.log(`  Space saved: ${(spaceSaved / 1024 / 1024).toFixed(2)} MB (${percentageSaved}%)`);
    
    // Performance assessment
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

    // Recommendations
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