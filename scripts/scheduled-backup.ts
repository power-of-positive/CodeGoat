#!/usr/bin/env tsx

import { createBackup, cleanupOldBackups } from './database-backup';

// Configuration for scheduled backups
const BACKUP_CONFIG = {
  intervalMinutes: 60, // Backup every hour by default
  description: 'scheduled',
} as const;

async function performScheduledBackup(): Promise<void> {
  try {
    console.log('🕐 Starting scheduled backup...');
    
    // Create automated backup
    createBackup('auto', BACKUP_CONFIG.description);
    
    // Clean up old backups
    cleanupOldBackups();
    
    console.log('✅ Scheduled backup completed successfully.');
  } catch (error) {
    console.error('❌ Scheduled backup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// CLI Interface for scheduled backups
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'run':
    case 'backup': {
      await performScheduledBackup();
      break;
    }

    case 'start-daemon': {
      console.log(`🔄 Starting backup daemon (every ${BACKUP_CONFIG.intervalMinutes} minutes)...`);
      console.log('💡 Use Ctrl+C to stop the daemon.');
      
      // Perform initial backup
      await performScheduledBackup();
      
      // Set up interval for periodic backups
      setInterval(async () => {
        await performScheduledBackup();
      }, BACKUP_CONFIG.intervalMinutes * 60 * 1000);
      
      // Keep the process alive
      process.stdin.resume();
      break;
    }

    case 'install-cron': {
      console.log('\n📅 To install a cron job for automated backups, add this line to your crontab:\n');
      console.log(`# Backup database every hour`);
      console.log(`0 * * * * cd ${process.cwd()} && npm run backup:scheduled:run 2>&1 | logger -t database-backup`);
      console.log('\nTo edit your crontab, run: crontab -e');
      console.log();
      break;
    }

    default: {
      console.log('\n⏰ Scheduled Database Backup\n');
      console.log('Usage:');
      console.log('  npm run backup:scheduled:run           - Run a single scheduled backup');
      console.log('  npm run backup:scheduled:daemon        - Start backup daemon (runs continuously)');
      console.log('  npm run backup:scheduled:install-cron  - Show cron installation instructions');
      console.log();
      console.log(`Configuration:`);
      console.log(`  Interval: Every ${BACKUP_CONFIG.intervalMinutes} minutes`);
      console.log(`  Description: "${BACKUP_CONFIG.description}"`);
      console.log();
      break;
    }
  }
}

if (require.main === module) {
  main();
}

export { performScheduledBackup };