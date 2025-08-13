#!/usr/bin/env npx ts-node

/**
 * Log Statistics Script
 * 
 * Provides detailed analysis of log directory without performing cleanup.
 */

import { join } from 'path';
import { WinstonLogger } from '../src/logger-winston';
import { OptimizedLogCleaner } from '../src/utils/optimized-log-cleaner';

async function main() {
  console.log('📊 Log Directory Analysis\n');

  const logsDir = join(process.cwd(), 'logs');
  
  // Create minimal logger for analysis
  const logger = new WinstonLogger({
    level: 'error', // Minimal logging for analysis
    logsDir,
    enableConsole: false,
    enableFile: false,
  });

  const cleaner = new OptimizedLogCleaner(
    {
      logsDir,
      maxLogFiles: 50,
      maxLogAge: 30,
      maxLogSize: 10 * 1024 * 1024, // 10MB
    },
    logger
  );

  try {
    const stats = await cleaner.getLogStats();
    
    console.log('📈 Overall Statistics:');
    console.log(`  Total log files: ${stats.totalFiles}`);
    console.log(`  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Average file size: ${(stats.averageFileSize / 1024).toFixed(2)} KB`);
    
    if (stats.oldestFile && stats.newestFile) {
      const ageInDays = (Date.now() - stats.oldestFile.getTime()) / (24 * 60 * 60 * 1000);
      console.log(`  Oldest file: ${stats.oldestFile.toLocaleDateString()} (${Math.floor(ageInDays)} days ago)`);
      console.log(`  Newest file: ${stats.newestFile.toLocaleDateString()}`);
    }

    console.log('\n📋 Size by Log Level:');
    const totalSizeForPercentage = Object.values(stats.sizeByLevel).reduce((a, b) => a + b, 0);
    for (const [level, size] of Object.entries(stats.sizeByLevel).sort(([,a], [,b]) => b - a)) {
      const percentage = ((size / totalSizeForPercentage) * 100).toFixed(1);
      console.log(`  ${level.padEnd(8)}: ${(size / 1024 / 1024).toFixed(2).padStart(8)} MB (${percentage.padStart(5)}%)`);
    }

    // Health assessment
    console.log('\n🔍 Health Assessment:');
    
    if (stats.totalFiles > 100) {
      console.log('  ⚠️  High number of log files - consider cleanup');
    } else if (stats.totalFiles > 50) {
      console.log('  ⚠️  Moderate number of log files - monitoring recommended');
    } else {
      console.log('  ✅ Log file count is healthy');
    }

    if (stats.totalSize > 500 * 1024 * 1024) { // 500MB
      console.log('  ⚠️  Large log directory size - cleanup recommended');
    } else if (stats.totalSize > 100 * 1024 * 1024) { // 100MB
      console.log('  ⚠️  Moderate log directory size - monitoring recommended');
    } else {
      console.log('  ✅ Log directory size is healthy');
    }

    if (stats.averageFileSize > 50 * 1024 * 1024) { // 50MB
      console.log('  ⚠️  Large average file size - consider log rotation');
    } else if (stats.averageFileSize > 10 * 1024 * 1024) { // 10MB
      console.log('  ⚠️  Moderate average file size - monitoring recommended');
    } else {
      console.log('  ✅ Average file size is healthy');
    }

    if (stats.oldestFile) {
      const ageInDays = (Date.now() - stats.oldestFile.getTime()) / (24 * 60 * 60 * 1000);
      if (ageInDays > 90) {
        console.log('  ⚠️  Very old log files present - consider cleanup');
      } else if (ageInDays > 30) {
        console.log('  ⚠️  Old log files present - monitoring recommended');
      } else {
        console.log('  ✅ Log file age is healthy');
      }
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (stats.totalFiles > 50) {
      console.log('  - Run log cleanup: npm run logs:clean:optimized');
    }
    if (stats.totalSize > 100 * 1024 * 1024) {
      console.log('  - Enable log compression to reduce disk usage');
    }
    if (stats.sizeByLevel.debug > stats.totalSize * 0.3) {
      console.log('  - Consider reducing debug log level in production');
    }
    if (stats.sizeByLevel.info > stats.totalSize * 0.5) {
      console.log('  - Review info log verbosity for optimization');
    }

    console.log('\n🛠️  Available Commands:');
    console.log('  npm run logs:clean:optimized  - Run optimized log cleanup');
    console.log('  npm run logs:clean           - Run standard log cleanup');
    console.log('  npm run logs:stats           - Show this analysis');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
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