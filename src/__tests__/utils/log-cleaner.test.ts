import fs from 'fs/promises';
import path from 'path';
import { LogCleaner } from '../../utils/log-cleaner';
import { ILogger } from '../../logger-interface';

// Mock fs/promises module
jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

// Mock logger
const mockLogger: ILogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('LogCleaner', () => {
  let logCleaner: LogCleaner;
  const testLogsDir = '/test/logs';

  beforeEach(() => {
    jest.clearAllMocks();

    logCleaner = new LogCleaner(
      {
        logsDir: testLogsDir,
        maxLogFiles: 5,
        maxLogAge: 30, // 30 days
        maxLogSize: 10 * 1024 * 1024, // 10MB
      },
      mockLogger
    );
  });

  describe('constructor', () => {
    it('should create LogCleaner with provided configuration', () => {
      expect(logCleaner).toBeDefined();
    });
  });

  describe('cleanLogs', () => {
    it('should execute cleaning operations successfully', async () => {
      // Mock successful directory access
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['app.log', 'error.log'] as any);
      mockFs.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      await logCleaner.cleanLogs();

      expect(mockFs.access).toHaveBeenCalledWith(testLogsDir);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should create logs directory if it does not exist', async () => {
      // Mock directory not existing, then successful creation
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await logCleaner.cleanLogs();

      expect(mockFs.mkdir).toHaveBeenCalledWith(testLogsDir, { recursive: true });
    });

    it('should handle file operations during cleaning', async () => {
      const mockFiles = ['app.log', 'old.log'];
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      // Mock file stats - one large file, one old file
      mockFs.stat.mockImplementation(filePath => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'app.log') {
          return Promise.resolve({
            size: 15 * 1024 * 1024, // 15MB > 10MB limit
            mtime: new Date(),
            isFile: () => true,
            isDirectory: () => false,
          } as any);
        }
        return Promise.resolve({
          size: 1024,
          mtime: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days old > 30 day limit
          isFile: () => true,
          isDirectory: () => false,
        } as any);
      });

      mockFs.rename.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await logCleaner.cleanLogs();

      expect(mockFs.readdir).toHaveBeenCalledWith(testLogsDir);
    });

    it('should handle errors in cleaning operations', async () => {
      // Mock directory access failure
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await logCleaner.cleanLogs();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to clean logs', expect.any(Error));
    });

    it('should handle empty logs directory', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await logCleaner.cleanLogs();

      expect(mockFs.readdir).toHaveBeenCalledWith(testLogsDir);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should process only log files', async () => {
      const mockItems = ['app.log', 'error.log', 'config.yaml', 'readme.txt'];
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(mockItems as any);
      mockFs.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      await logCleaner.cleanLogs();

      // Verify that readdir was called to get directory contents
      expect(mockFs.readdir).toHaveBeenCalledWith(testLogsDir);
      // Should process files (exact count depends on operations performed)
      expect(mockFs.stat).toHaveBeenCalled();
    });
  });

  describe('limitLogFileCount', () => {
    it('should not delete files when count is under limit', async () => {
      const files = ['log1.log', 'log2.log']; // 2 files, limit is 5
      mockFs.readdir.mockResolvedValue(files as any);

      await (logCleaner as any).limitLogFileCount();

      expect(mockFs.unlink).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should delete oldest files when count exceeds limit', async () => {
      // Create 7 files when limit is 5, should delete 2 oldest
      const files = [
        'log1.log',
        'log2.log',
        'log3.log',
        'log4.log',
        'log5.log',
        'log6.log',
        'log7.log',
      ];
      mockFs.readdir.mockResolvedValue(files as any);

      // Mock file stats with different modification times (older files have earlier timestamps)
      const baseTime = Date.now();
      mockFs.stat
        .mockResolvedValueOnce({ mtime: new Date(baseTime - 7000) } as any) // log1.log - oldest
        .mockResolvedValueOnce({ mtime: new Date(baseTime - 6000) } as any) // log2.log - second oldest
        .mockResolvedValueOnce({ mtime: new Date(baseTime - 5000) } as any) // log3.log
        .mockResolvedValueOnce({ mtime: new Date(baseTime - 4000) } as any) // log4.log
        .mockResolvedValueOnce({ mtime: new Date(baseTime - 3000) } as any) // log5.log
        .mockResolvedValueOnce({ mtime: new Date(baseTime - 2000) } as any) // log6.log
        .mockResolvedValueOnce({ mtime: new Date(baseTime - 1000) } as any); // log7.log - newest

      mockFs.unlink.mockResolvedValue(undefined);

      await (logCleaner as any).limitLogFileCount();

      // Should delete 2 oldest files (7 - 5 = 2)
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
      expect(mockFs.unlink).toHaveBeenCalledWith(path.join(testLogsDir, 'log1.log'));
      expect(mockFs.unlink).toHaveBeenCalledWith(path.join(testLogsDir, 'log2.log'));

      expect(mockLogger.info).toHaveBeenCalledWith('Deleted excess log file: log1.log');
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted excess log file: log2.log');
    });

    it('should handle stat errors during file processing', async () => {
      const files = ['log1.log', 'log2.log', 'log3.log', 'log4.log', 'log5.log', 'log6.log'];
      mockFs.readdir.mockResolvedValue(files as any);

      // Mock first stat to fail
      mockFs.stat.mockRejectedValueOnce(new Error('Stat failed'));

      await expect((logCleaner as any).limitLogFileCount()).rejects.toThrow('Stat failed');
    });

    it('should handle unlink errors during file deletion', async () => {
      const files = ['log1.log', 'log2.log', 'log3.log', 'log4.log', 'log5.log', 'log6.log'];
      mockFs.readdir.mockResolvedValue(files as any);

      // Mock file stats
      const baseTime = Date.now();
      files.forEach((_, index) => {
        mockFs.stat.mockResolvedValueOnce({
          mtime: new Date(baseTime - (files.length - index) * 1000),
        } as any);
      });

      // Mock unlink to fail
      mockFs.unlink.mockRejectedValueOnce(new Error('Delete failed'));

      await expect((logCleaner as any).limitLogFileCount()).rejects.toThrow('Delete failed');
    });
  });

  describe('getLogFiles', () => {
    it('should return only .log files', async () => {
      mockFs.readdir.mockResolvedValue([
        'app.log',
        'error.log',
        'config.json',
        'backup.txt',
        'debug.log',
      ] as any);

      const result = await (logCleaner as any).getLogFiles();

      expect(result).toEqual(['app.log', 'error.log', 'debug.log']);
    });

    it('should return empty array when directory read fails', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Cannot read directory'));

      const result = await (logCleaner as any).getLogFiles();

      expect(result).toEqual([]);
    });

    it('should return empty array when no log files exist', async () => {
      mockFs.readdir.mockResolvedValue(['config.json', 'backup.txt'] as any);

      const result = await (logCleaner as any).getLogFiles();

      expect(result).toEqual([]);
    });
  });

  describe('rotateLogsBySize', () => {
    it('should not rotate files under size limit', async () => {
      mockFs.readdir.mockResolvedValue(['app.log'] as any);
      mockFs.stat.mockResolvedValue({ size: 1024 } as any); // Under 10MB limit

      await (logCleaner as any).rotateLogsBySize();

      expect(mockFs.rename).not.toHaveBeenCalled();
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should rotate files over size limit', async () => {
      mockFs.readdir.mockResolvedValue(['app.log'] as any);
      mockFs.stat.mockResolvedValue({ size: 15 * 1024 * 1024 } as any); // Over 10MB limit
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock Date for consistent timestamp
      const mockDate = '2023-01-01T12:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      await (logCleaner as any).rotateLogsBySize();

      expect(mockFs.rename).toHaveBeenCalledWith(
        path.join(testLogsDir, 'app.log'),
        path.join(testLogsDir, 'app_2023-01-01T12-00-00-000Z.log')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(path.join(testLogsDir, 'app.log'), '');
    });
  });

  describe('cleanOldLogs', () => {
    it('should not delete recent files', async () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days old, under 30 day limit

      mockFs.readdir.mockResolvedValue(['recent.log'] as any);
      mockFs.stat.mockResolvedValue({ mtime: recentDate } as any);

      await (logCleaner as any).cleanOldLogs();

      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it('should delete old files', async () => {
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days old, over 30 day limit

      mockFs.readdir.mockResolvedValue(['old.log'] as any);
      mockFs.stat.mockResolvedValue({ mtime: oldDate } as any);
      mockFs.unlink.mockResolvedValue(undefined);

      await (logCleaner as any).cleanOldLogs();

      expect(mockFs.unlink).toHaveBeenCalledWith(path.join(testLogsDir, 'old.log'));
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted old log file: old.log');
    });
  });
});
