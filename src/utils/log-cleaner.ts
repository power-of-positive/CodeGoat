import fs from 'fs/promises';
import path from 'path';
import { ILogger } from '../logger-interface';

interface LogCleanerConfig {
  logsDir: string;
  maxLogFiles: number;
  maxLogAge: number; // days
  maxLogSize: number; // bytes
}

export class LogCleaner {
  private config: LogCleanerConfig;
  private logger: ILogger;

  constructor(config: LogCleanerConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
  }

  async cleanLogs(): Promise<void> {
    try {
      await this.ensureLogsDirExists();
      await this.rotateLogsBySize();
      await this.cleanOldLogs();
      await this.limitLogFileCount();
    } catch (error) {
      this.logger.error('Failed to clean logs', error as Error);
    }
  }

  private async ensureLogsDirExists(): Promise<void> {
    try {
      await fs.access(this.config.logsDir);
    } catch {
      await fs.mkdir(this.config.logsDir, { recursive: true });
    }
  }

  private async rotateLogsBySize(): Promise<void> {
    const files = await this.getLogFiles();

    for (const file of files) {
      const filePath = path.join(this.config.logsDir, file);
      const stats = await fs.stat(filePath);

      if (stats.size > this.config.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedName = `${path.parse(file).name}_${timestamp}.log`;
        const rotatedPath = path.join(this.config.logsDir, rotatedName);

        await fs.rename(filePath, rotatedPath);
        // Create new empty log file
        await fs.writeFile(filePath, '');
      }
    }
  }

  private async cleanOldLogs(): Promise<void> {
    const files = await this.getLogFiles();
    const maxAge = this.config.maxLogAge * 24 * 60 * 60 * 1000; // Convert days to ms
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(this.config.logsDir, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        this.logger.info(`Deleted old log file: ${file}`);
      }
    }
  }

  private async limitLogFileCount(): Promise<void> {
    const files = await this.getLogFiles();

    if (files.length > this.config.maxLogFiles) {
      // Sort by modification time (oldest first)
      const filesWithStats = await Promise.all(
        files.map(async file => ({
          name: file,
          mtime: (await fs.stat(path.join(this.config.logsDir, file))).mtime,
        }))
      );

      filesWithStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      const filesToDelete = filesWithStats.slice(0, files.length - this.config.maxLogFiles);

      for (const { name } of filesToDelete) {
        await fs.unlink(path.join(this.config.logsDir, name));
        this.logger.info(`Deleted excess log file: ${name}`);
      }
    }
  }

  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.logsDir);
      return files.filter(file => file.endsWith('.log'));
    } catch {
      return [];
    }
  }
}
