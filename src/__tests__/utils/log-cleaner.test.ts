import fs from 'fs/promises';
import path from 'path';
import { LogCleaner } from '../../utils/log-cleaner';
import { createMockLogger } from '../../test-helpers/logger.mock';

// Mock fs and path modules
jest.mock('fs/promises');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('LogCleaner', () => {
  let logCleaner: LogCleaner;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let config: {
    logsDir: string;
    maxLogFiles: number;
    maxLogAge: number;
    maxLogSize: number;
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    config = {
      logsDir: '/test/logs',
      maxLogFiles: 5,
      maxLogAge: 7, // 7 days
      maxLogSize: 1024 * 1024, // 1MB
    };
    logCleaner = new LogCleaner(config, mockLogger);
    jest.clearAllMocks();

    // Setup default path mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.parse.mockImplementation(filePath => ({
      name: filePath.replace('.log', ''),
      ext: '.log',
      base: filePath,
      dir: '',
      root: '',
    }));

    // Reset Date.now mock
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config and logger', () => {
      expect(logCleaner).toBeInstanceOf(LogCleaner);
    });
  });

  describe('cleanLogs', () => {
    it('should execute all cleanup steps successfully', async () => {
      // Mock successful operations
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await logCleaner.cleanLogs();

      expect(mockFs.access).toHaveBeenCalledWith('/test/logs');
      expect(mockFs.readdir).toHaveBeenCalledWith('/test/logs');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and log them', async () => {
      const error = new Error('File system error');
      mockFs.access.mockRejectedValue(error);
      mockFs.mkdir.mockRejectedValue(error); // Also fail mkdir

      await logCleaner.cleanLogs();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to clean logs', error);
    });

    it('should create logs directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await logCleaner.cleanLogs();

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/logs', { recursive: true });
      expect(mockFs.readdir).toHaveBeenCalledWith('/test/logs');
    });
  });

  describe('rotateLogsBySize', () => {
    it('should rotate logs that exceed max size', async () => {
      const files = ['app.log'];
      const stats = {
        size: 2 * 1024 * 1024, // 2MB (exceeds 1MB limit)
        mtime: new Date('2023-01-01'),
        isFile: () => true,
        isDirectory: () => false,
      } as any;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat.mockResolvedValue(stats);
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock date for consistent timestamp
      const mockDate = new Date('2023-06-01T10:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      await logCleaner.cleanLogs();

      expect(mockFs.stat).toHaveBeenCalledWith('/test/logs/app.log');
      expect(mockFs.rename).toHaveBeenCalledWith(
        '/test/logs/app.log',
        '/test/logs/app_2023-06-01T10-00-00-000Z.log'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/logs/app.log', '');
    });

    it('should not rotate logs that are under max size', async () => {
      const files = ['small.log'];
      const stats = {
        size: 500 * 1024, // 500KB (under 1MB limit)
        mtime: new Date('2023-01-01'),
      } as any;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat.mockResolvedValue(stats);

      await logCleaner.cleanLogs();

      expect(mockFs.rename).not.toHaveBeenCalled();
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('cleanOldLogs', () => {
    it('should delete logs older than max age', async () => {
      const files = ['old.log'];
      const now = new Date('2023-06-01T10:00:00.000Z');
      const oldDate = new Date('2023-05-20T10:00:00.000Z'); // 12 days ago (exceeds 7 day limit)

      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat
        .mockResolvedValueOnce({ size: 1000, mtime: oldDate } as any) // for rotation check
        .mockResolvedValueOnce({ size: 1000, mtime: oldDate } as any); // for age check
      mockFs.unlink.mockResolvedValue(undefined);

      await logCleaner.cleanLogs();

      expect(mockFs.unlink).toHaveBeenCalledWith('/test/logs/old.log');
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted old log file: old.log');

      mockDateNow.mockRestore();
    });

    it('should not delete recent logs', async () => {
      const files = ['recent.log'];
      const now = new Date('2023-06-01T10:00:00.000Z');
      const recentDate = new Date('2023-05-30T10:00:00.000Z'); // 2 days ago

      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat
        .mockResolvedValueOnce({ size: 1000, mtime: recentDate } as any) // for rotation check
        .mockResolvedValueOnce({ size: 1000, mtime: recentDate } as any); // for age check

      await logCleaner.cleanLogs();

      expect(mockFs.unlink).not.toHaveBeenCalled();

      mockDateNow.mockRestore();
    });
  });

  describe('limitLogFileCount', () => {
    it('should delete excess log files keeping the newest ones', async () => {
      const files = [
        'log1.log',
        'log2.log',
        'log3.log',
        'log4.log',
        'log5.log',
        'log6.log',
        'log7.log',
      ];

      // Mock stats with different modification times (oldest to newest)
      const statsData = [
        { size: 1000, mtime: new Date('2023-01-01') },
        { size: 1000, mtime: new Date('2023-01-02') },
        { size: 1000, mtime: new Date('2023-01-03') },
        { size: 1000, mtime: new Date('2023-01-04') },
        { size: 1000, mtime: new Date('2023-01-05') },
        { size: 1000, mtime: new Date('2023-01-06') },
        { size: 1000, mtime: new Date('2023-01-07') },
      ] as any[];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);

      // Mock stat calls: size rotation (7) + age cleanup (7) + count limit (7) = 21 calls total
      for (let i = 0; i < 21; i++) {
        const index = i % statsData.length;
        mockFs.stat.mockResolvedValueOnce(statsData[index]);
      }

      mockFs.unlink.mockResolvedValue(undefined);

      await logCleaner.cleanLogs();

      // Should delete 2 oldest files (7 files - 5 max = 2 to delete)
      expect(mockFs.unlink).toHaveBeenCalledWith('/test/logs/log1.log');
      expect(mockFs.unlink).toHaveBeenCalledWith('/test/logs/log2.log');
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted excess log file: log1.log');
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted excess log file: log2.log');
    });

    it('should not delete any files if count is within limit', async () => {
      const files = ['log1.log', 'log2.log', 'log3.log']; // 3 files (under 5 limit)

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat.mockResolvedValue({ size: 1000, mtime: new Date() } as any);

      await logCleaner.cleanLogs();

      // Should not call unlink for excess file deletion
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Deleted excess log file')
      );
    });
  });

  describe('getLogFiles', () => {
    it('should return only .log files', async () => {
      const files = ['app.log', 'error.log', 'config.json', 'backup.txt', 'debug.log'];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat.mockResolvedValue({ size: 1000, mtime: new Date() } as any);

      await logCleaner.cleanLogs();

      // Verify that only .log files are processed by checking stat calls
      expect(mockFs.stat).toHaveBeenCalledWith('/test/logs/app.log');
      expect(mockFs.stat).toHaveBeenCalledWith('/test/logs/error.log');
      expect(mockFs.stat).toHaveBeenCalledWith('/test/logs/debug.log');
      expect(mockFs.stat).not.toHaveBeenCalledWith('/test/logs/config.json');
      expect(mockFs.stat).not.toHaveBeenCalledWith('/test/logs/backup.txt');
    });

    it('should handle empty directory', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await logCleaner.cleanLogs();

      expect(mockFs.stat).not.toHaveBeenCalled();
      expect(mockFs.unlink).not.toHaveBeenCalled();
      expect(mockFs.rename).not.toHaveBeenCalled();
    });
  });

  describe('error scenarios', () => {
    it('should handle readdir failures gracefully', async () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(Date.now());

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      // This should not throw an error because getLogFiles catches errors
      await logCleaner.cleanLogs();

      expect(mockLogger.error).not.toHaveBeenCalled();

      mockDateNow.mockRestore();
    });

    it('should handle stat errors during operations', async () => {
      const files = ['problematic.log'];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat.mockRejectedValue(new Error('Stat failed'));

      await logCleaner.cleanLogs();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to clean logs', expect.any(Error));
    });
  });

  describe('configuration edge cases', () => {
    it('should handle zero max files configuration', async () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(Date.now());

      const zeroFilesConfig = { ...config, maxLogFiles: 0 };
      const zeroFilesLogCleaner = new LogCleaner(zeroFilesConfig, mockLogger);
      const files = ['log1.log'];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat
        .mockResolvedValueOnce({ size: 1000, mtime: new Date() } as any) // rotation check
        .mockResolvedValueOnce({ size: 1000, mtime: new Date() } as any) // age check
        .mockResolvedValueOnce({ size: 1000, mtime: new Date() } as any); // count check
      mockFs.unlink.mockResolvedValue(undefined);

      await zeroFilesLogCleaner.cleanLogs();

      // Should delete all files when maxLogFiles is 0
      expect(mockFs.unlink).toHaveBeenCalledWith('/test/logs/log1.log');

      mockDateNow.mockRestore();
    });

    it('should handle zero max age configuration', async () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(Date.now());

      const zeroAgeConfig = { ...config, maxLogAge: 0 };
      const zeroAgeLogCleaner = new LogCleaner(zeroAgeConfig, mockLogger);
      const files = ['recent.log'];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat
        .mockResolvedValueOnce({ size: 1000, mtime: new Date(Date.now() - 1000) } as any) // rotation check
        .mockResolvedValueOnce({ size: 1000, mtime: new Date(Date.now() - 1000) } as any); // age check
      mockFs.unlink.mockResolvedValue(undefined);

      await zeroAgeLogCleaner.cleanLogs();

      // Should delete files immediately when maxLogAge is 0
      expect(mockFs.unlink).toHaveBeenCalledWith('/test/logs/recent.log');

      mockDateNow.mockRestore();
    });

    it('should handle zero max size configuration', async () => {
      const zeroSizeConfig = { ...config, maxLogSize: 0 };
      const zeroSizeLogCleaner = new LogCleaner(zeroSizeConfig, mockLogger);
      const files = ['tiny.log'];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat.mockResolvedValue({ size: 1, mtime: new Date() } as any); // 1 byte
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await zeroSizeLogCleaner.cleanLogs();

      // Should rotate any file with size > 0 when maxLogSize is 0
      expect(mockFs.rename).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });
});
