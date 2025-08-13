import { OptimizedLogCleaner } from '../../utils/optimized-log-cleaner';
import fs from 'fs/promises';
import path from 'path';
import { ILogger } from '../../logger-interface';
import * as zlib from 'zlib';
import * as fsSync from 'fs';
import { pipeline } from 'stream/promises';

// Mock modules
jest.mock('fs/promises');
jest.mock('zlib');
jest.mock('fs');
jest.mock('stream/promises');

describe('OptimizedLogCleaner', () => {
  let cleaner: OptimizedLogCleaner;
  let mockLogger: jest.Mocked<ILogger>;
  const testLogsDir = '/test/logs';
  const testConfig = {
    logsDir: testLogsDir,
    maxLogFiles: 5,
    maxLogAge: 7,
    maxLogSize: 1024 * 1024, // 1MB
    compressionEnabled: true,
    retentionPolicy: {
      critical: 90,
      error: 30,
      info: 14,
      debug: 7,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    cleaner = new OptimizedLogCleaner(testConfig, mockLogger);
  });

  describe('cleanLogs', () => {
    it('should return empty results when no log files exist', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await cleaner.cleanLogs();

      expect(result).toEqual({
        deletedFiles: 0,
        compressedFiles: 0,
        freedSpace: 0,
        processingTime: expect.any(Number),
      });
      // No cleanup log when there are no files
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should create logs directory if it does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await cleaner.cleanLogs();

      expect(fs.mkdir).toHaveBeenCalledWith(testLogsDir, { recursive: true });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Permission denied');
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      (fs.mkdir as jest.Mock).mockRejectedValue(error);

      const result = await cleaner.cleanLogs();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to clean logs', error);
      expect(result.deletedFiles).toBe(0);
      expect(result.compressedFiles).toBe(0);
    });

    it('should process log files for cleanup', async () => {
      const mockFiles = ['app.log', 'error.log', 'debug.log', 'readme.txt'];
      const mockStats = {
        size: 500 * 1024, // 500KB
        mtime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await cleaner.cleanLogs();

      expect(result.deletedFiles).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Log cleanup completed', expect.any(Object));
    });
  });

  describe('getLogFilesWithMetadata', () => {
    it('should filter only .log files', async () => {
      const mockFiles = ['app.log', 'error.log', 'readme.txt', 'config.json'];
      const mockStats = {
        size: 1024,
        mtime: new Date(),
      };

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);

      // Use reflection to test private method
      const getLogFilesWithMetadata = (cleaner as any).getLogFilesWithMetadata.bind(cleaner);
      const result = await getLogFilesWithMetadata();

      expect(result).toHaveLength(2);
      expect(result.every((file: any) => file.name.endsWith('.log'))).toBe(true);
    });

    it('should return empty array on error', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Read error'));

      const getLogFilesWithMetadata = (cleaner as any).getLogFilesWithMetadata.bind(cleaner);
      const result = await getLogFilesWithMetadata();

      expect(result).toEqual([]);
    });
  });

  describe('extractLogLevel', () => {
    it('should extract correct log levels from filenames', () => {
      const extractLogLevel = (cleaner as any).extractLogLevel.bind(cleaner);

      expect(extractLogLevel('error.log')).toBe('error');
      expect(extractLogLevel('exception.log')).toBe('error');
      expect(extractLogLevel('warning.log')).toBe('warn');
      expect(extractLogLevel('info.log')).toBe('info');
      expect(extractLogLevel('access.log')).toBe('info');
      expect(extractLogLevel('debug.log')).toBe('debug');
      expect(extractLogLevel('app.log')).toBe('info'); // default
    });
  });

  describe('optimizedSizeRotation', () => {
    it('should rotate oversized files', async () => {
      const oversizedFile = {
        name: 'app.log',
        fullPath: '/test/logs/app.log',
        size: 2 * 1024 * 1024, // 2MB
        mtime: new Date(),
        level: 'info',
      };

      (fs.rename as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      
      // Mock compression
      const mockGzip = {
        on: jest.fn(),
        pipe: jest.fn().mockReturnThis(),
      };
      (zlib.createGzip as jest.Mock).mockReturnValue(mockGzip);
      (fsSync.createReadStream as jest.Mock).mockReturnValue({ on: jest.fn() });
      (fsSync.createWriteStream as jest.Mock).mockReturnValue({ on: jest.fn() });
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const optimizedSizeRotation = (cleaner as any).optimizedSizeRotation.bind(cleaner);
      const result = await optimizedSizeRotation([oversizedFile]);

      expect(fs.rename).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(oversizedFile.fullPath, '');
      expect(result.compressed).toBe(1);
    });

    it('should handle rotation errors gracefully', async () => {
      const oversizedFile = {
        name: 'app.log',
        fullPath: '/test/logs/app.log',
        size: 2 * 1024 * 1024,
        mtime: new Date(),
        level: 'info',
      };

      (fs.rename as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const optimizedSizeRotation = (cleaner as any).optimizedSizeRotation.bind(cleaner);
      const result = await optimizedSizeRotation([oversizedFile]);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(result.compressed).toBe(0);
    });

    it('should skip rotation when no oversized files', async () => {
      const normalFile = {
        name: 'app.log',
        fullPath: '/test/logs/app.log',
        size: 500 * 1024, // 500KB
        mtime: new Date(),
        level: 'info',
      };

      const optimizedSizeRotation = (cleaner as any).optimizedSizeRotation.bind(cleaner);
      const result = await optimizedSizeRotation([normalFile]);

      expect(fs.rename).not.toHaveBeenCalled();
      expect(result.compressed).toBe(0);
    });
  });

  describe('optimizedAgeCleanup', () => {
    it('should delete old files based on retention policy', async () => {
      const oldDebugFile = {
        name: 'debug.log',
        fullPath: '/test/logs/debug.log',
        size: 1024,
        mtime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
        level: 'debug',
      };

      const recentErrorFile = {
        name: 'error.log',
        fullPath: '/test/logs/error.log',
        size: 1024,
        mtime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days old
        level: 'error',
      };

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const optimizedAgeCleanup = (cleaner as any).optimizedAgeCleanup.bind(cleaner);
      const result = await optimizedAgeCleanup([oldDebugFile, recentErrorFile]);

      expect(fs.unlink).toHaveBeenCalledWith(oldDebugFile.fullPath);
      expect(fs.unlink).not.toHaveBeenCalledWith(recentErrorFile.fullPath);
      expect(result.deleted).toBe(1);
      expect(result.freedSpace).toBe(1024);
    });

    it('should handle deletion errors gracefully', async () => {
      const oldFile = {
        name: 'old.log',
        fullPath: '/test/logs/old.log',
        size: 1024,
        mtime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        level: 'info',
      };

      (fs.unlink as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const optimizedAgeCleanup = (cleaner as any).optimizedAgeCleanup.bind(cleaner);
      const result = await optimizedAgeCleanup([oldFile]);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(result.deleted).toBe(0);
      expect(result.freedSpace).toBe(0);
    });
  });

  describe('optimizedCountLimit', () => {
    it('should delete oldest files when count exceeds limit', async () => {
      const files = Array.from({ length: 8 }, (_, i) => ({
        name: `log${i}.log`,
        fullPath: `/test/logs/log${i}.log`,
        size: 1024,
        mtime: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        level: 'info',
      }));

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const optimizedCountLimit = (cleaner as any).optimizedCountLimit.bind(cleaner);
      const result = await optimizedCountLimit(files);

      expect(fs.unlink).toHaveBeenCalledTimes(3); // 8 files - 5 max = 3 to delete
      expect(result.deleted).toBe(3);
      expect(result.freedSpace).toBe(3 * 1024);
    });

    it('should not delete files when within limit', async () => {
      const files = Array.from({ length: 3 }, (_, i) => ({
        name: `log${i}.log`,
        fullPath: `/test/logs/log${i}.log`,
        size: 1024,
        mtime: new Date(),
        level: 'info',
      }));

      const optimizedCountLimit = (cleaner as any).optimizedCountLimit.bind(cleaner);
      const result = await optimizedCountLimit(files);

      expect(fs.unlink).not.toHaveBeenCalled();
      expect(result.deleted).toBe(0);
    });
  });

  describe('compressLogFile', () => {
    it('should compress and remove original file', async () => {
      const filePath = '/test/logs/app.log';
      const mockGzip = { on: jest.fn() };
      const mockReadStream = { on: jest.fn() };
      const mockWriteStream = { on: jest.fn() };

      (zlib.createGzip as jest.Mock).mockReturnValue(mockGzip);
      (fsSync.createReadStream as jest.Mock).mockReturnValue(mockReadStream);
      (fsSync.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const compressLogFile = (cleaner as any).compressLogFile.bind(cleaner);
      await compressLogFile(filePath);

      expect(zlib.createGzip).toHaveBeenCalledWith({ level: 6 });
      expect(fsSync.createWriteStream).toHaveBeenCalledWith(`${filePath}.gz`);
      expect(pipeline).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledWith(filePath);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle compression errors gracefully', async () => {
      const filePath = '/test/logs/app.log';
      (pipeline as jest.Mock).mockRejectedValue(new Error('Compression failed'));

      const compressLogFile = (cleaner as any).compressLogFile.bind(cleaner);
      await compressLogFile(filePath);

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('getLogStats', () => {
    it('should return comprehensive log statistics', async () => {
      const mockFiles = [
        {
          name: 'error.log',
          fullPath: '/test/logs/error.log',
          size: 2048,
          mtime: new Date('2024-01-01'),
          level: 'error',
        },
        {
          name: 'info.log',
          fullPath: '/test/logs/info.log',
          size: 1024,
          mtime: new Date('2024-01-15'),
          level: 'info',
        },
      ];

      (fs.readdir as jest.Mock).mockResolvedValue(['error.log', 'info.log']);
      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({ size: 2048, mtime: new Date('2024-01-01') })
        .mockResolvedValueOnce({ size: 1024, mtime: new Date('2024-01-15') });

      const stats = await cleaner.getLogStats();

      expect(stats).toEqual({
        totalFiles: 2,
        totalSize: 3072,
        averageFileSize: 1536,
        oldestFile: new Date('2024-01-01'),
        newestFile: new Date('2024-01-15'),
        sizeByLevel: {
          error: 2048,
          info: 1024,
        },
      });
    });

    it('should return empty stats when no log files exist', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const stats = await cleaner.getLogStats();

      expect(stats).toEqual({
        totalFiles: 0,
        totalSize: 0,
        averageFileSize: 0,
        oldestFile: null,
        newestFile: null,
        sizeByLevel: {},
      });
    });
  });

  describe('configuration', () => {
    it('should use default retention policy when not provided', () => {
      const minimalConfig = {
        logsDir: '/test/logs',
        maxLogFiles: 5,
        maxLogAge: 7,
        maxLogSize: 1024 * 1024,
      };

      const cleanerWithDefaults = new OptimizedLogCleaner(minimalConfig, mockLogger);
      expect((cleanerWithDefaults as any).config.retentionPolicy).toEqual({
        critical: 90,
        error: 30,
        info: 14,
        debug: 7,
      });
      expect((cleanerWithDefaults as any).config.compressionEnabled).toBe(true);
    });

    it('should respect custom retention policy', () => {
      const customConfig = {
        ...testConfig,
        compressionEnabled: false,
        retentionPolicy: {
          critical: 180,
          error: 60,
          info: 30,
          debug: 14,
        },
      };

      const cleanerWithCustom = new OptimizedLogCleaner(customConfig, mockLogger);
      expect((cleanerWithCustom as any).config.retentionPolicy).toEqual(customConfig.retentionPolicy);
      expect((cleanerWithCustom as any).config.compressionEnabled).toBe(false);
    });
  });
});