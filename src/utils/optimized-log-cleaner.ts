import fs from 'fs/promises';
import path from 'path';
import { ILogger } from '../logger-interface';

interface OptimizedLogCleanerConfig {
  logsDir: string;
  maxLogFiles: number;
  maxLogAge: number; // days
  maxLogSize: number; // bytes
  compressionEnabled?: boolean;
  retentionPolicy?: {
    critical: number; // days
    error: number; // days
    info: number; // days
    debug: number; // days
  };
}

interface LogFileInfo {
  name: string;
  fullPath: string;
  size: number;
  mtime: Date;
  level: string;
}

/**
 * Optimized Log Cleaner with performance improvements and advanced features
 */
export class OptimizedLogCleaner {
  private config: OptimizedLogCleanerConfig;
  private logger: ILogger;

  constructor(config: OptimizedLogCleanerConfig, logger: ILogger) {
    this.config = {
      compressionEnabled: true,
      retentionPolicy: {
        critical: 90,
        error: 30,
        info: 14,
        debug: 7,
      },
      ...config,
    };
    this.logger = logger;
  }

  async cleanLogs(): Promise<{
    deletedFiles: number;
    compressedFiles: number;
    freedSpace: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    let deletedFiles = 0;
    let compressedFiles = 0;
    let freedSpace = 0;

    try {
      await this.ensureLogsDirExists();

      // Get all log files with metadata in parallel
      const logFiles = await this.getLogFilesWithMetadata();

      if (logFiles.length === 0) {
        return {
          deletedFiles,
          compressedFiles,
          freedSpace,
          processingTime: Date.now() - startTime,
        };
      }

      // Process different cleanup strategies in parallel
      const [sizeRotationResult, ageCleanupResult, countLimitResult] = await Promise.all([
        this.optimizedSizeRotation(logFiles),
        this.optimizedAgeCleanup(logFiles),
        this.optimizedCountLimit(logFiles),
      ]);

      deletedFiles = ageCleanupResult.deleted + countLimitResult.deleted;
      compressedFiles = sizeRotationResult.compressed;
      freedSpace = ageCleanupResult.freedSpace + countLimitResult.freedSpace;

      this.logger.info('Log cleanup completed', {
        deletedFiles,
        compressedFiles,
        freedSpace: `${(freedSpace / 1024 / 1024).toFixed(2)}MB`,
        processingTime: `${Date.now() - startTime}ms`,
      });
    } catch (error) {
      this.logger.error('Failed to clean logs', error as Error);
    }

    return {
      deletedFiles,
      compressedFiles,
      freedSpace,
      processingTime: Date.now() - startTime,
    };
  }

  private async ensureLogsDirExists(): Promise<void> {
    try {
      await fs.access(this.config.logsDir);
    } catch {
      await fs.mkdir(this.config.logsDir, { recursive: true });
    }
  }

  /**
   * Get all log files with metadata in a single pass
   */
  private async getLogFilesWithMetadata(): Promise<LogFileInfo[]> {
    try {
      const files = await fs.readdir(this.config.logsDir);
      const logFiles = files.filter(file => file.endsWith('.log'));

      // Get all file stats in parallel
      const fileInfoPromises = logFiles.map(async (file): Promise<LogFileInfo> => {
        const fullPath = path.join(this.config.logsDir, file);
        const stats = await fs.stat(fullPath);

        return {
          name: file,
          fullPath,
          size: stats.size,
          mtime: stats.mtime,
          level: this.extractLogLevel(file),
        };
      });

      return await Promise.all(fileInfoPromises);
    } catch {
      return [];
    }
  }

  /**
   * Extract log level from filename for retention policy
   */
  private extractLogLevel(filename: string): string {
    const name = filename.toLowerCase();
    if (name.includes('error') || name.includes('exception')) return 'error';
    if (name.includes('warn')) return 'warn';
    if (name.includes('info') || name.includes('access')) return 'info';
    if (name.includes('debug')) return 'debug';
    return 'info'; // default
  }

  /**
   * Optimized size-based rotation with optional compression
   */
  private async optimizedSizeRotation(logFiles: LogFileInfo[]): Promise<{
    compressed: number;
  }> {
    let compressed = 0;
    const oversizedFiles = logFiles.filter(file => file.size > this.config.maxLogSize);

    if (oversizedFiles.length === 0) {
      return { compressed };
    }

    // Process oversized files in parallel batches
    const batchSize = 3; // Process 3 files at a time to avoid overwhelming I/O
    for (let i = 0; i < oversizedFiles.length; i += batchSize) {
      const batch = oversizedFiles.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async file => {
          try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedName = `${path.parse(file.name).name}_${timestamp}.log`;
            const rotatedPath = path.join(this.config.logsDir, rotatedName);

            await fs.rename(file.fullPath, rotatedPath);

            // Create new empty log file
            await fs.writeFile(file.fullPath, '');

            // Compress the rotated file if enabled
            if (this.config.compressionEnabled) {
              await this.compressLogFile(rotatedPath);
              compressed++;
            }
          } catch (error) {
            this.logger.warn?.(
              `Failed to rotate log file ${file.name}: ${(error as Error).message}`
            );
          }
        })
      );
    }

    return { compressed };
  }

  /**
   * Optimized age-based cleanup with level-specific retention
   */
  private async optimizedAgeCleanup(logFiles: LogFileInfo[]): Promise<{
    deleted: number;
    freedSpace: number;
  }> {
    let deleted = 0;
    let freedSpace = 0;
    const now = Date.now();

    const filesToDelete = logFiles.filter(file => {
      const ageInDays = (now - file.mtime.getTime()) / (24 * 60 * 60 * 1000);
      const retentionDays =
        this.config.retentionPolicy![file.level as keyof typeof this.config.retentionPolicy] ||
        this.config.maxLogAge;

      return ageInDays > retentionDays;
    });

    if (filesToDelete.length === 0) {
      return { deleted, freedSpace };
    }

    // Delete files in parallel batches
    const batchSize = 5;
    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async file => {
          await fs.unlink(file.fullPath);
          return file.size;
        })
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          deleted++;
          freedSpace += result.value;
          this.logger.debug?.(`Deleted old log file: ${batch[index].name}`);
        } else {
          this.logger.warn?.(
            `Failed to delete log file: ${batch[index].name}: ${(result.reason as Error).message}`
          );
        }
      });
    }

    return { deleted, freedSpace };
  }

  /**
   * Optimized count-based limitation
   */
  private async optimizedCountLimit(logFiles: LogFileInfo[]): Promise<{
    deleted: number;
    freedSpace: number;
  }> {
    let deleted = 0;
    let freedSpace = 0;

    if (logFiles.length <= this.config.maxLogFiles) {
      return { deleted, freedSpace };
    }

    // Sort by modification time (oldest first) and get files to delete
    const sortedFiles = logFiles.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
    const filesToDelete = sortedFiles.slice(0, logFiles.length - this.config.maxLogFiles);

    // Delete files in parallel batches
    const batchSize = 5;
    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async file => {
          await fs.unlink(file.fullPath);
          return file.size;
        })
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          deleted++;
          freedSpace += result.value;
          this.logger.debug?.(`Deleted excess log file: ${batch[index].name}`);
        } else {
          this.logger.warn?.(
            `Failed to delete log file: ${batch[index].name}: ${(result.reason as Error).message}`
          );
        }
      });
    }

    return { deleted, freedSpace };
  }

  /**
   * Compress log file using gzip (requires zlib)
   */
  private async compressLogFile(filePath: string): Promise<void> {
    try {
      const zlib = await import('zlib');
      const { createReadStream, createWriteStream } = await import('fs');
      const { pipeline } = await import('stream/promises');

      const gzipPath = `${filePath}.gz`;
      const readStream = createReadStream(filePath);
      const gzipStream = zlib.createGzip({ level: 6 }); // Balanced compression
      const writeStream = createWriteStream(gzipPath);

      await pipeline(readStream, gzipStream, writeStream);

      // Remove original file after successful compression
      await fs.unlink(filePath);

      this.logger.debug?.(`Compressed log file: ${path.basename(filePath)}`);
    } catch (error) {
      this.logger.warn?.(
        `Failed to compress log file: ${path.basename(filePath)}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get statistics about log directory
   */
  async getLogStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
    sizeByLevel: Record<string, number>;
  }> {
    const logFiles = await this.getLogFilesWithMetadata();

    if (logFiles.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        averageFileSize: 0,
        oldestFile: null,
        newestFile: null,
        sizeByLevel: {},
      };
    }

    const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);
    const oldestFile = logFiles.reduce((oldest, file) =>
      file.mtime < oldest.mtime ? file : oldest
    ).mtime;
    const newestFile = logFiles.reduce((newest, file) =>
      file.mtime > newest.mtime ? file : newest
    ).mtime;

    const sizeByLevel: Record<string, number> = {};
    logFiles.forEach(file => {
      sizeByLevel[file.level] = (sizeByLevel[file.level] || 0) + file.size;
    });

    return {
      totalFiles: logFiles.length,
      totalSize,
      averageFileSize: Math.round(totalSize / logFiles.length),
      oldestFile,
      newestFile,
      sizeByLevel,
    };
  }
}
