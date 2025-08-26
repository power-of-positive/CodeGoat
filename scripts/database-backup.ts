#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

// Constants
const BYTES_PER_KB = 1024;
const SQLITE_HEADER_LENGTH = 16;
const TABLE_PADDING = {
  TYPE: 8,
  FILENAME: 40, 
  SIZE: 10,
  DATE: 20
};
const SEPARATOR_LINE_LENGTH = 88;
const DECIMAL_PLACES_FOR_SIZE = 1;

// Configuration
const CONFIG = {
  dbPath: path.join(process.cwd(), 'prisma', 'kanban.db'),
  testDbPath: path.join(process.cwd(), 'prisma', 'kanban-test.db'),
  backupDir: path.join(process.cwd(), 'backups'),
  maxBackups: 50, // Keep last 50 backups
  cronBackups: 10, // Keep last 10 automated backups
} as const;

interface BackupMetadata {
  filename: string;
  timestamp: string;
  size: number;
  type: 'manual' | 'auto';
  description?: string;
}

function ensureBackupDir(): void {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
}

function generateBackupFilename(type: 'manual' | 'auto', description?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = description ? `-${description.replace(/[^a-zA-Z0-9-]/g, '-')}` : '';
  return `kanban-backup-${type}-${timestamp}${suffix}.db`;
}

function createBackup(type: 'manual' | 'auto' = 'manual', description?: string): BackupMetadata {
  ensureBackupDir();
  
  if (!fs.existsSync(CONFIG.dbPath)) {
    throw new Error(`Database file not found: ${CONFIG.dbPath}`);
  }

  const filename = generateBackupFilename(type, description);
  const backupPath = path.join(CONFIG.backupDir, filename);
  
  // Copy the database file
  fs.copyFileSync(CONFIG.dbPath, backupPath);
  
  const stats = fs.statSync(backupPath);
  const metadata: BackupMetadata = {
    filename,
    timestamp: new Date().toISOString(),
    size: stats.size,
    type,
    description,
  };

  console.log(`✅ Backup created: ${filename} (${(stats.size / BYTES_PER_KB).toFixed(DECIMAL_PLACES_FOR_SIZE)} KB)`);
  return metadata;
}

function listBackups(): BackupMetadata[] {
  ensureBackupDir();
  
  const files = fs.readdirSync(CONFIG.backupDir)
    .filter(file => file.startsWith('kanban-backup-') && file.endsWith('.db'))
    .map(file => {
      const filePath = path.join(CONFIG.backupDir, file);
      const stats = fs.statSync(filePath);
      
      // Parse filename to extract metadata
      const match = file.match(/kanban-backup-(manual|auto)-(.+?)(?:-(.+?))?\.db$/);
      const type = (match?.[1] as 'manual' | 'auto') || 'manual';
      const timestampRaw = match?.[2] || '';
      // Convert ISO string format back: 2025-08-22T07-10-28-901Z -> 2025-08-22T07:10:28.901Z
      const timestamp = timestampRaw.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z') || '';
      const description = match?.[3]?.replace(/-/g, ' ');
      
      return {
        filename: file,
        timestamp: timestamp || stats.mtime.toISOString(),
        size: stats.size,
        type,
        description,
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return files;
}

function restoreBackup(filename: string): void {
  const backupPath = path.join(CONFIG.backupDir, filename);
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${filename}`);
  }

  // Create a backup of the current database before restoring
  const preRestoreBackup = generateBackupFilename('auto', 'pre-restore');
  const preRestorePath = path.join(CONFIG.backupDir, preRestoreBackup);
  if (fs.existsSync(CONFIG.dbPath)) {
    fs.copyFileSync(CONFIG.dbPath, preRestorePath);
    console.log(`📁 Current database backed up as: ${preRestoreBackup}`);
  }

  // Restore the backup
  fs.copyFileSync(backupPath, CONFIG.dbPath);
  
  const stats = fs.statSync(CONFIG.dbPath);
  console.log(`✅ Database restored from: ${filename} (${(stats.size / BYTES_PER_KB).toFixed(DECIMAL_PLACES_FOR_SIZE)} KB)`);
  console.log(`⚠️  Please restart the application to ensure proper database connection.`);
}

function cleanupOldBackups(): void {
  const backups = listBackups();
  const manualBackups = backups.filter(b => b.type === 'manual');
  const autoBackups = backups.filter(b => b.type === 'auto');

  // Remove old manual backups (keep last CONFIG.maxBackups)
  if (manualBackups.length > CONFIG.maxBackups) {
    const toDelete = manualBackups.slice(CONFIG.maxBackups);
    toDelete.forEach(backup => {
      fs.unlinkSync(path.join(CONFIG.backupDir, backup.filename));
      console.log(`🗑️  Deleted old manual backup: ${backup.filename}`);
    });
  }

  // Remove old automated backups (keep last CONFIG.cronBackups)
  if (autoBackups.length > CONFIG.cronBackups) {
    const toDelete = autoBackups.slice(CONFIG.cronBackups);
    toDelete.forEach(backup => {
      fs.unlinkSync(path.join(CONFIG.backupDir, backup.filename));
      console.log(`🗑️  Deleted old auto backup: ${backup.filename}`);
    });
  }
}

function verifyBackup(filename: string): boolean {
  const backupPath = path.join(CONFIG.backupDir, filename);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${filename}`);
    return false;
  }

  try {
    // Try to read the SQLite header to verify it's a valid database
    const buffer = fs.readFileSync(backupPath);
    const header = buffer.subarray(0, SQLITE_HEADER_LENGTH).toString('ascii');
    
    if (header.startsWith('SQLite format 3')) {
      console.log(`✅ Backup verified: ${filename}`);
      return true;
    } else {
      console.error(`❌ Invalid SQLite file: ${filename}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error verifying backup ${filename}:`, error);
    return false;
  }
}

function formatBackupList(backups: BackupMetadata[]): void {
  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }

  console.log('\n📦 Available Backups:\n');
  console.log('Type'.padEnd(TABLE_PADDING.TYPE) + 'Filename'.padEnd(TABLE_PADDING.FILENAME) + 'Size'.padEnd(TABLE_PADDING.SIZE) + 'Date'.padEnd(TABLE_PADDING.DATE) + 'Description');
  console.log('-'.repeat(SEPARATOR_LINE_LENGTH));
  
  backups.forEach(backup => {
    const type = backup.type.toUpperCase().padEnd(TABLE_PADDING.TYPE - 1);
    const filename = backup.filename.padEnd(TABLE_PADDING.FILENAME - 1);
    const size = `${(backup.size / BYTES_PER_KB).toFixed(DECIMAL_PLACES_FOR_SIZE)} KB`.padEnd(TABLE_PADDING.SIZE - 1);
    const date = new Date(backup.timestamp).toLocaleString().padEnd(TABLE_PADDING.DATE - 1);
    const description = backup.description || '';
    
    console.log(`${type} ${filename} ${size} ${date} ${description}`);
  });
  console.log();
}

function handleBackupCommands(command: string, args: string[]): void {
  const description = args.join(' ').trim() || undefined;
  
  switch (command) {
    case 'create':
    case 'backup':
      createBackup('manual', description);
      cleanupOldBackups();
      break;
    case 'auto':
      createBackup('auto', description);
      cleanupOldBackups();
      break;
  }
}

function handleVerifyCommands(command: string, args: string[]): void {
  switch (command) {
    case 'verify': {
      const filename = args[0];
      if (!filename) {
        console.error('❌ Please specify a backup filename to verify.');
        process.exit(1);
      }
      verifyBackup(filename);
      break;
    }
    case 'verify-all': {
      const backups = listBackups();
      let allValid = true;
      backups.forEach(backup => {
        if (!verifyBackup(backup.filename)) {
          allValid = false;
        }
      });
      if (allValid && backups.length > 0) {
        console.log(`✅ All ${backups.length} backups are valid.`);
      }
      break;
    }
  }
}

function handleStatusCommand(): void {
  console.log('\n📊 Backup Status:\n');
  console.log(`Database: ${CONFIG.dbPath}`);
  console.log(`Backup Directory: ${CONFIG.backupDir}`);
  console.log(`Max Manual Backups: ${CONFIG.maxBackups}`);
  console.log(`Max Auto Backups: ${CONFIG.cronBackups}`);
  
  if (fs.existsSync(CONFIG.dbPath)) {
    const dbStats = fs.statSync(CONFIG.dbPath);
    console.log(`Database Size: ${(dbStats.size / BYTES_PER_KB).toFixed(DECIMAL_PLACES_FOR_SIZE)} KB`);
    console.log(`Last Modified: ${dbStats.mtime.toLocaleString()}`);
  } else {
    console.log('❌ Database file not found!');
  }

  const backups = listBackups();
  console.log(`Total Backups: ${backups.length}`);
  console.log(`Manual Backups: ${backups.filter(b => b.type === 'manual').length}`);
  console.log(`Auto Backups: ${backups.filter(b => b.type === 'auto').length}`);
  
  if (backups.length > 0) {
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    console.log(`Total Backup Size: ${(totalSize / BYTES_PER_KB).toFixed(DECIMAL_PLACES_FOR_SIZE)} KB`);
    console.log(`Latest Backup: ${backups[0].filename} (${new Date(backups[0].timestamp).toLocaleString()})`);
  }
  console.log();
}

function showHelp(): void {
  console.log('\n📦 Database Backup Manager\n');
  console.log('Usage:');
  console.log('  npm run backup:create [description]  - Create a manual backup');
  console.log('  npm run backup:auto [description]    - Create an automatic backup');
  console.log('  npm run backup:list                  - List all backups');
  console.log('  npm run backup:restore <filename>    - Restore from backup');
  console.log('  npm run backup:verify <filename>     - Verify backup integrity');
  console.log('  npm run backup:verify-all            - Verify all backups');
  console.log('  npm run backup:cleanup               - Clean up old backups');
  console.log('  npm run backup:status                - Show backup status');
  console.log('\nExamples:');
  console.log('  npm run backup:create "Before major update"');
  console.log('  npm run backup:restore kanban-backup-manual-2025-08-22T10-30-00-000Z.db');
  console.log();
}

// Handle list commands
function handleListCommands(command: string): void {
  if (command === 'list' || command === 'ls') {
    const backups = listBackups();
    formatBackupList(backups);
  }
}

// Handle restore commands
function handleRestoreCommands(command: string, args: string[]): void {
  if (command === 'restore') {
    const filename = args[0];
    if (!filename) {
      console.error('❌ Please specify a backup filename to restore.');
      console.error('Usage: npm run backup:restore <filename>');
      process.exit(1);
    }
    restoreBackup(filename);
  }
}

// Handle cleanup commands
function handleCleanupCommands(command: string): void {
  if (command === 'cleanup') {
    cleanupOldBackups();
    console.log('✅ Cleanup completed.');
  }
}

// Handle status commands
function handleStatusCommands(command: string): void {
  if (command === 'status') {
    handleStatusCommand();
  }
}

// Execute command handler
function executeCommand(command: string, args: string[]): void {
  // Handle backup commands
  if (['create', 'backup', 'auto'].includes(command)) {
    handleBackupCommands(command, args);
    return;
  }

  // Handle list commands
  if (['list', 'ls'].includes(command)) {
    handleListCommands(command);
    return;
  }

  // Handle restore commands
  if (command === 'restore') {
    handleRestoreCommands(command, args);
    return;
  }

  // Handle verify commands
  if (['verify', 'verify-all'].includes(command)) {
    handleVerifyCommands(command, args);
    return;
  }

  // Handle cleanup commands
  if (command === 'cleanup') {
    handleCleanupCommands(command);
    return;
  }

  // Handle status commands
  if (command === 'status') {
    handleStatusCommands(command);
    return;
  }

  // Default: show help
  showHelp();
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    executeCommand(command, args);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { createBackup, listBackups, restoreBackup, verifyBackup, cleanupOldBackups };