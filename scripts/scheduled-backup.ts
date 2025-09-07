#!/usr/bin/env tsx

import { createBackup, cleanupOldBackups } from './database-backup';

// Time constants
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;

// Configuration for scheduled backups
const BACKUP_CONFIG = {
  intervalMinutes: 60, // Backup every hour by default
  description: 'scheduled',
} as const;

async function performScheduledBackup(): Promise<void> {
  try {
    console.error('🕐 Starting scheduled backup...');

    // Create automated backup
    createBackup('auto', BACKUP_CONFIG.description);

    // Clean up old backups
    cleanupOldBackups();

    console.error('✅ Scheduled backup completed successfully.');
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
      console.error(
        `🔄 Starting backup daemon (every ${BACKUP_CONFIG.intervalMinutes} minutes)...`
      );
      console.error('💡 Use Ctrl+C to stop the daemon.');

      // Perform initial backup
      await performScheduledBackup();

      // Set up interval for periodic backups
      setInterval(
        async () => {
          await performScheduledBackup();
        },
        BACKUP_CONFIG.intervalMinutes * SECONDS_PER_MINUTE * MS_PER_SECOND
      );

      // Keep the process alive
      process.stdin.resume();
      break;
    }

    case 'install-cron': {
      console.error(
        '\n📅 To install a cron job for automated backups, add this line to your crontab:\n'
      );
      console.error(`# Backup database every hour`);
      console.error(
        `0 * * * * cd ${process.cwd()} && npm run backup:scheduled:run 2>&1 | logger -t database-backup`
      );
      console.error('\nTo edit your crontab, run: crontab -e');
      console.error();
      break;
    }

    default: {
      console.error('\n⏰ Scheduled Database Backup\n');
      console.error('Usage:');
      console.error('  npm run backup:scheduled:run           - Run a single scheduled backup');
      console.error(
        '  npm run backup:scheduled:daemon        - Start backup daemon (runs continuously)'
      );
      console.error(
        '  npm run backup:scheduled:install-cron  - Show cron installation instructions'
      );
      console.error();
      console.error(`Configuration:`);
      console.error(`  Interval: Every ${BACKUP_CONFIG.intervalMinutes} minutes`);
      console.error(`  Description: "${BACKUP_CONFIG.description}"`);
      console.error();
      break;
    }
  }
}

if (require.main === module) {
  main();
}

export { performScheduledBackup };
