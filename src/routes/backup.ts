import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Configuration
const BACKUP_CONFIG = {
  backupDir: path.join(process.cwd(), 'backups'),
  dbPath: path.join(process.cwd(), 'prisma', 'kanban.db'),
} as const;

interface BackupInfo {
  filename: string;
  timestamp: string;
  size: number;
  type: 'manual' | 'auto';
  description?: string;
}

function listBackups(): BackupInfo[] {
  if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_CONFIG.backupDir)
    .filter(file => file.startsWith('kanban-backup-') && file.endsWith('.db'))
    .map(file => {
      const filePath = path.join(BACKUP_CONFIG.backupDir, file);
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

function createBackupHandler(logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { description } = req.body;
      
      // Use the backup script to create the backup
      const command = description 
        ? `npx tsx scripts/database-backup.ts create "${description}"` 
        : `npx tsx scripts/database-backup.ts create`;
        
      const output = execSync(command, { cwd: process.cwd(), encoding: 'utf8' });
      logger.info(`Backup created: ${output.trim()}`);
      
      // Get updated backup list
      const backups = listBackups();
      const latestBackup = backups[0];
      
      res.status(201).json({
        message: 'Backup created successfully',
        backup: latestBackup,
        backups: backups.slice(0, 10), // Return latest 10 backups
      });
    } catch (error) {
      logger.error('Failed to create backup', error as Error);
      res.status(500).json({ 
        error: 'Failed to create backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

function getBackupsHandler(logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = 20 } = req.query;
      const backups = listBackups().slice(0, parseInt(limit as string));
      
      // Get database status
      const dbStats = fs.existsSync(BACKUP_CONFIG.dbPath) 
        ? fs.statSync(BACKUP_CONFIG.dbPath)
        : null;
      
      res.json({
        backups,
        totalCount: listBackups().length,
        database: dbStats ? {
          path: BACKUP_CONFIG.dbPath,
          size: dbStats.size,
          lastModified: dbStats.mtime.toISOString(),
        } : null,
      });
    } catch (error) {
      logger.error('Failed to get backups', error as Error);
      res.status(500).json({ error: 'Failed to get backup list' });
    }
  };
}

function restoreBackupHandler(logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        res.status(400).json({ error: 'Backup filename is required' });
        return;
      }
      
      // Use the backup script to restore
      const command = `npx tsx scripts/database-backup.ts restore "${filename}"`;
      const output = execSync(command, { cwd: process.cwd(), encoding: 'utf8' });
      logger.info(`Backup restored: ${output.trim()}`);
      
      res.json({
        message: 'Backup restored successfully',
        filename,
        output: output.trim(),
      });
    } catch (error) {
      logger.error('Failed to restore backup', error as Error);
      res.status(500).json({ 
        error: 'Failed to restore backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

function deleteBackupHandler(logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        res.status(400).json({ error: 'Backup filename is required' });
        return;
      }
      
      const backupPath = path.join(BACKUP_CONFIG.backupDir, filename);
      
      if (!fs.existsSync(backupPath)) {
        res.status(404).json({ error: 'Backup file not found' });
        return;
      }
      
      // Delete the backup file
      fs.unlinkSync(backupPath);
      logger.info(`Backup deleted: ${filename}`);
      
      res.json({
        message: 'Backup deleted successfully',
        filename,
      });
    } catch (error) {
      logger.error('Failed to delete backup', error as Error);
      res.status(500).json({ 
        error: 'Failed to delete backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

function getBackupStatusHandler(logger: ILogger) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const backups = listBackups();
      const manualBackups = backups.filter(b => b.type === 'manual');
      const autoBackups = backups.filter(b => b.type === 'auto');
      
      const dbStats = fs.existsSync(BACKUP_CONFIG.dbPath) 
        ? fs.statSync(BACKUP_CONFIG.dbPath)
        : null;
      
      res.json({
        database: dbStats ? {
          path: BACKUP_CONFIG.dbPath,
          size: dbStats.size,
          lastModified: dbStats.mtime.toISOString(),
        } : null,
        backupDirectory: BACKUP_CONFIG.backupDir,
        totalBackups: backups.length,
        manualBackups: manualBackups.length,
        autoBackups: autoBackups.length,
        totalBackupSize: backups.reduce((sum, b) => sum + b.size, 0),
        latestBackup: backups[0] || null,
      });
    } catch (error) {
      logger.error('Failed to get backup status', error as Error);
      res.status(500).json({ error: 'Failed to get backup status' });
    }
  };
}

export function createBackupRoutes(logger: ILogger): Router {
  const router = Router();

  router.get('/', getBackupsHandler(logger));
  router.get('/status', getBackupStatusHandler(logger));
  router.post('/create', createBackupHandler(logger));
  router.post('/restore/:filename', restoreBackupHandler(logger));
  router.delete('/:filename', deleteBackupHandler(logger));

  return router;
}