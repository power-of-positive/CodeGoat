#!/usr/bin/env ts-node

import { WinstonLogger } from '../src/logger-winston';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cleanup script to remove app log files created by tests
 */

const LOG_DIRECTORIES = ['tests/api-e2e/logs', 'logs', 'ui/logs'];

function cleanupAppLogFiles() {
  console.log('🧹 Cleaning up app log files...');

  let totalCleaned = 0;

  for (const logDir of LOG_DIRECTORIES) {
    const fullPath = path.join(process.cwd(), logDir);

    if (fs.existsSync(fullPath)) {
      console.log(`📂 Checking directory: ${logDir}`);

      const files = fs.readdirSync(fullPath);
      const appLogFiles = files.filter(
        file => (file === 'app.log' || file.match(/^app\d+\.log$/)) && file.endsWith('.log')
      );

      if (appLogFiles.length > 0) {
        console.log(`🗑️  Found ${appLogFiles.length} app log files:`, appLogFiles.join(', '));

        appLogFiles.forEach(file => {
          try {
            fs.unlinkSync(path.join(fullPath, file));
            totalCleaned++;
            console.log(`   ✅ Removed: ${file}`);
          } catch (error) {
            console.error(`   ❌ Failed to remove ${file}:`, error);
          }
        });
      } else {
        console.log('   ✨ No app log files found');
      }
    } else {
      console.log(`   ⚠️  Directory not found: ${logDir}`);
    }
  }

  console.log(`\n🎉 Cleanup complete! Removed ${totalCleaned} app log files.`);

  // Use the WinstonLogger cleanup method as well
  try {
    WinstonLogger.cleanupAppLogFiles(path.join(process.cwd(), 'tests/api-e2e/logs'));
    console.log('✅ WinstonLogger cleanup completed');
  } catch (error) {
    console.warn('⚠️  WinstonLogger cleanup failed:', error);
  }
}

if (require.main === module) {
  cleanupAppLogFiles();
}

export { cleanupAppLogFiles };
