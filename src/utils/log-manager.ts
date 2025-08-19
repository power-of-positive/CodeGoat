import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);

export class LogManager {
  private logsDir: string;
  private maxLogAge: number; // in days
  private maxLogSize: number; // in bytes

  constructor(logsDir: string = './logs', maxLogAge: number = 7, maxLogSize: number = 50 * 1024 * 1024) {
    this.logsDir = logsDir;
    this.maxLogAge = maxLogAge;
    this.maxLogSize = maxLogSize;
  }

  /**
   * Organize logs into dated subfolders
   */
  async organizeLogs(): Promise<void> {
    try {
      // Ensure logs directory exists
      await this.ensureDirectory(this.logsDir);

      const files = await readdir(this.logsDir);
      
      for (const file of files) {
        const filePath = path.join(this.logsDir, file);
        const fileStat = await stat(filePath);
        
        // Skip directories
        if (fileStat.isDirectory()) continue;
        
        // Skip non-log files
        if (!this.isLogFile(file)) continue;

        // Create date-based subfolder
        const fileDate = new Date(fileStat.birthtime);
        const dateFolder = this.formatDateFolder(fileDate);
        const targetDir = path.join(this.logsDir, dateFolder);
        
        await this.ensureDirectory(targetDir);
        
        // Move file to dated folder
        const targetPath = path.join(targetDir, file);
        if (!fs.existsSync(targetPath)) {
          await rename(filePath, targetPath);
          console.error(`📁 Moved ${file} to ${dateFolder}/`);
        }
      }
    } catch (error) {
      console.error('Error organizing logs:', error);
    }
  }

  /**
   * Clean up old logs and empty files
   */
  async cleanupLogs(): Promise<{
    deletedFiles: number;
    deletedSize: number;
    emptyFilesDeleted: number;
  }> {
    let deletedFiles = 0;
    let deletedSize = 0;
    let emptyFilesDeleted = 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.maxLogAge);

      await this.walkDirectory(this.logsDir, async (filePath: string, fileStat: fs.Stats) => {
        // Delete old files
        if (fileStat.mtime < cutoffDate) {
          await unlink(filePath);
          deletedFiles++;
          deletedSize += fileStat.size;
          console.error(`🗑️ Deleted old log file: ${path.relative(this.logsDir, filePath)}`);
          return;
        }

        // Delete empty log files
        if (fileStat.size === 0 && this.isLogFile(path.basename(filePath))) {
          await unlink(filePath);
          emptyFilesDeleted++;
          console.error(`🗑️ Deleted empty log file: ${path.relative(this.logsDir, filePath)}`);
          return;
        }

        // Delete app*.log files that match the problematic pattern
        const fileName = path.basename(filePath);
        if (this.isProblematicAppLogFile(fileName) && fileStat.size < 1024) { // Less than 1KB
          await unlink(filePath);
          emptyFilesDeleted++;
          console.error(`🗑️ Deleted problematic app log file: ${fileName}`);
        }
      });

    } catch (error) {
      console.error('Error cleaning up logs:', error);
    }

    return { deletedFiles, deletedSize, emptyFilesDeleted };
  }

  /**
   * Get log statistics
   */
  async getLogStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: string | null;
    newestFile: string | null;
    emptyFiles: number;
    appLogFiles: number;
  }> {
    let totalFiles = 0;
    let totalSize = 0;
    let oldestFile: { path: string; mtime: Date } | null = null;
    let newestFile: { path: string; mtime: Date } | null = null;
    let emptyFiles = 0;
    let appLogFiles = 0;

    await this.walkDirectory(this.logsDir, async (filePath: string, fileStat: fs.Stats) => {
      if (!this.isLogFile(path.basename(filePath))) return;

      totalFiles++;
      totalSize += fileStat.size;

      if (fileStat.size === 0) {
        emptyFiles++;
      }

      if (this.isProblematicAppLogFile(path.basename(filePath))) {
        appLogFiles++;
      }

      if (!oldestFile || fileStat.mtime < oldestFile.mtime) {
        oldestFile = { path: filePath, mtime: fileStat.mtime };
      }

      if (!newestFile || fileStat.mtime > newestFile.mtime) {
        newestFile = { path: filePath, mtime: fileStat.mtime };
      }
    });

    return {
      totalFiles,
      totalSize,
      oldestFile: oldestFile?.path || null,
      newestFile: newestFile?.path || null,
      emptyFiles,
      appLogFiles,
    };
  }

  /**
   * Schedule automatic cleanup
   */
  scheduleCleanup(intervalHours: number = 24): ReturnType<typeof setInterval> {
    const interval = intervalHours * 60 * 60 * 1000; // Convert to milliseconds
    
    return setInterval(async () => {
      console.error('🧹 Running scheduled log cleanup...');
      await this.organizeLogs();
      const stats = await this.cleanupLogs();
      console.error(`✅ Log cleanup completed: ${stats.deletedFiles} old files, ${stats.emptyFilesDeleted} empty files deleted`);
    }, interval);
  }

  // Private helper methods

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch {
      // Directory might already exist, ignore error
    }
  }

  private formatDateFolder(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isLogFile(fileName: string): boolean {
    return fileName.endsWith('.log') || fileName.endsWith('.txt');
  }

  private isProblematicAppLogFile(fileName: string): boolean {
    // Match patterns like app123.log, app-456.log, etc.
    return /^app[\d-]+\.log$/.test(fileName);
  }

  private async walkDirectory(
    dirPath: string, 
    callback: (filePath: string, fileStat: fs.Stats) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const entryStat = await stat(fullPath);
        
        if (entryStat.isDirectory()) {
          // Recursively walk subdirectories
          await this.walkDirectory(fullPath, callback);
        } else {
          await callback(fullPath, entryStat);
        }
      }
    } catch (error) {
      console.warn(`Could not walk directory ${dirPath}:`, error);
    }
  }
}

// Export a default instance
export const logManager = new LogManager();