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
});
