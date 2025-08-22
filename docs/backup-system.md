# Database Backup System

This document describes the comprehensive database backup and recovery system implemented for CodeGoat.

## Overview

The backup system provides:
- **Timestamped backups** with automatic filename generation
- **Manual and automated backup types** for different use cases
- **Easy rollback/recovery** with verification
- **Automatic cleanup** of old backups to manage disk space
- **API endpoints** for programmatic access
- **Scheduled backups** for regular maintenance

## Quick Start

### Create a Manual Backup
```bash
npm run backup:create "Before major changes"
```

### List All Backups
```bash
npm run backup:list
```

### Restore from Backup
```bash
npm run backup:restore kanban-backup-manual-2025-08-22T10-30-00-000Z.db
```

### Check System Status
```bash
npm run backup:status
```

## Command Reference

### Manual Backup Operations
- `npm run backup:create [description]` - Create a manual backup with optional description
- `npm run backup:list` - List all available backups
- `npm run backup:restore <filename>` - Restore database from backup file
- `npm run backup:verify <filename>` - Verify backup file integrity
- `npm run backup:verify-all` - Verify all backup files
- `npm run backup:cleanup` - Remove old backups based on retention policy
- `npm run backup:status` - Show detailed backup system status

### Automated Backup Operations
- `npm run backup:auto [description]` - Create an automated backup
- `npm run backup:scheduled:run` - Run a single scheduled backup
- `npm run backup:scheduled:daemon` - Start continuous backup daemon
- `npm run backup:scheduled:install-cron` - Show cron installation instructions

## Backup Types

### Manual Backups
- Created on-demand by users
- Retention: Keep last 50 backups
- Filename format: `kanban-backup-manual-YYYY-MM-DDTHH-mm-ss-sssZ[-description].db`
- Use cases: Before major updates, testing, maintenance

### Automated Backups
- Created by scheduled processes
- Retention: Keep last 10 backups
- Filename format: `kanban-backup-auto-YYYY-MM-DDTHH-mm-ss-sssZ[-description].db`
- Use cases: Regular maintenance, CI/CD pipelines, monitoring systems

## Configuration

The backup system can be configured by modifying the `CONFIG` object in `scripts/database-backup.ts`:

```typescript
const CONFIG = {
  dbPath: path.join(process.cwd(), 'prisma', 'kanban.db'),
  testDbPath: path.join(process.cwd(), 'prisma', 'kanban-test.db'),
  backupDir: path.join(process.cwd(), 'backups'),
  maxBackups: 50, // Keep last 50 manual backups
  cronBackups: 10, // Keep last 10 automated backups
} as const;
```

## API Endpoints

The backup system provides REST API endpoints at `/api/backup`:

### GET /api/backup/status
Get backup system status and statistics.

**Response:**
```json
{
  "database": {
    "path": "/path/to/kanban.db",
    "size": 647168,
    "lastModified": "2025-08-22T07:00:00.000Z"
  },
  "backupDirectory": "/path/to/backups",
  "totalBackups": 5,
  "manualBackups": 3,
  "autoBackups": 2,
  "totalBackupSize": 3235840,
  "latestBackup": {
    "filename": "kanban-backup-manual-2025-08-22T10-30-00-000Z.db",
    "timestamp": "2025-08-22T10:30:00.000Z",
    "size": 647168,
    "type": "manual"
  }
}
```

### GET /api/backup
List all available backups with pagination.

**Query Parameters:**
- `limit` (optional): Maximum number of backups to return (default: 20)

**Response:**
```json
{
  "backups": [
    {
      "filename": "kanban-backup-manual-2025-08-22T10-30-00-000Z.db",
      "timestamp": "2025-08-22T10:30:00.000Z",
      "size": 647168,
      "type": "manual",
      "description": "Before major update"
    }
  ],
  "totalCount": 5,
  "database": {
    "path": "/path/to/kanban.db",
    "size": 647168,
    "lastModified": "2025-08-22T07:00:00.000Z"
  }
}
```

### POST /api/backup/create
Create a new manual backup.

**Request Body:**
```json
{
  "description": "Optional backup description"
}
```

**Response:**
```json
{
  "message": "Backup created successfully",
  "backup": {
    "filename": "kanban-backup-manual-2025-08-22T10-30-00-000Z-description.db",
    "timestamp": "2025-08-22T10:30:00.000Z",
    "size": 647168,
    "type": "manual",
    "description": "Optional backup description"
  },
  "backups": [...]
}
```

### POST /api/backup/restore/:filename
Restore database from a backup file.

**Response:**
```json
{
  "message": "Backup restored successfully",
  "filename": "kanban-backup-manual-2025-08-22T10-30-00-000Z.db",
  "output": "✅ Database restored from: kanban-backup-manual-2025-08-22T10-30-00-000Z.db (632.0 KB)"
}
```

### DELETE /api/backup/:filename
Delete a backup file.

**Response:**
```json
{
  "message": "Backup deleted successfully",
  "filename": "kanban-backup-manual-2025-08-22T10-30-00-000Z.db"
}
```

## Scheduled Backups

### Setting Up Automated Backups

#### Option 1: Cron Job (Recommended for Production)
```bash
# Get cron installation instructions
npm run backup:scheduled:install-cron

# Example cron entry (backup every hour):
0 * * * * cd /path/to/codegoat && npm run backup:scheduled:run 2>&1 | logger -t database-backup
```

#### Option 2: Background Daemon
```bash
# Start continuous backup daemon (every 60 minutes)
npm run backup:scheduled:daemon
```

### Customizing Schedule
Modify the `BACKUP_CONFIG` in `scripts/scheduled-backup.ts`:

```typescript
const BACKUP_CONFIG = {
  intervalMinutes: 60, // Change backup interval
  description: 'scheduled', // Change backup description
} as const;
```

## Safety Features

### Pre-restore Backup
Before restoring any backup, the system automatically creates a backup of the current database with the filename pattern `kanban-backup-auto-TIMESTAMP-pre-restore.db`.

### Backup Verification
All backup files can be verified to ensure they are valid SQLite databases:
```bash
# Verify single backup
npm run backup:verify kanban-backup-manual-2025-08-22T10-30-00-000Z.db

# Verify all backups
npm run backup:verify-all
```

### Automatic Cleanup
The system automatically removes old backups based on the configured retention policy:
- Manual backups: Keep last 50
- Automated backups: Keep last 10

## Troubleshooting

### Common Issues

**Error: Database file not found**
- Check that the database path is correct in the configuration
- Ensure the Prisma database exists at `prisma/kanban.db`

**Error: Permission denied**
- Ensure the application has write permissions to the backup directory
- Check that the backup directory exists and is writable

**Error: Invalid SQLite file**
- The backup file may be corrupted
- Try creating a new backup and verify it immediately

### Recovery Scenarios

**Complete Database Loss**
1. List available backups: `npm run backup:list`
2. Choose the most recent valid backup
3. Restore: `npm run backup:restore <filename>`
4. Restart the application

**Partial Data Corruption**
1. Create a backup of the current state: `npm run backup:create "before-recovery"`
2. Restore from a known good backup
3. Compare and merge any missing data manually

**Rollback After Failed Update**
1. The system automatically creates a pre-restore backup
2. If issues occur, restore from the pre-restore backup
3. Use `npm run backup:list` to find the pre-restore backup

## Integration Examples

### Before Major Updates
```bash
npm run backup:create "Before v2.0 update"
# Perform update
# If issues occur:
npm run backup:restore kanban-backup-manual-TIMESTAMP-Before-v2.0-update.db
```

### CI/CD Pipeline
```yaml
# In your deployment script
- name: Create backup
  run: npm run backup:create "Deploy $(date +%Y%m%d-%H%M%S)"

- name: Deploy application
  run: ./deploy.sh

- name: Verify deployment
  run: ./verify.sh
  
# If verification fails:
- name: Rollback on failure
  if: failure()
  run: npm run backup:restore $(npm run backup:list | head -2 | tail -1 | awk '{print $2}')
```

## File Structure

```
backups/                              # Backup directory
├── kanban-backup-manual-*.db         # Manual backups
└── kanban-backup-auto-*.db          # Automated backups

scripts/
├── database-backup.ts               # Main backup script
└── scheduled-backup.ts             # Scheduled backup handler

src/routes/
└── backup.ts                      # API endpoints

docs/
└── backup-system.md              # This documentation
```

## Security Considerations

- Backup files contain sensitive data and should be protected accordingly
- Consider encrypting backups for production environments
- Regularly test restore procedures to ensure backups are valid
- Monitor backup storage usage to prevent disk space issues
- Implement proper access controls for backup API endpoints

## Performance Impact

- Backup creation time scales with database size
- Typical backup time for a 1MB database: < 1 second
- Disk space usage: Each backup requires space equal to the database size
- Automatic cleanup prevents unlimited storage growth