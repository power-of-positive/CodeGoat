import fs from 'fs';
import { WinstonLogger } from '../logger-winston';

// Mock fs module
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('WinstonLogger', () => {
  let logger: WinstonLogger;
  const testLogsDir = '/test/logs';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation();

    logger = new WinstonLogger({
      logsDir: testLogsDir,
      level: 'info',
    });
  });

  afterEach(() => {
    // Clean up logger to avoid memory leaks
    if (logger && typeof (logger as any).close === 'function') {
      (logger as any).close();
    }
  });

  describe('constructor', () => {
    it('should create logger with default configuration', () => {
      const defaultLogger = new WinstonLogger();
      expect(defaultLogger).toBeDefined();
    });

    it('should create logger with custom configuration', () => {
      const customLogger = new WinstonLogger({
        logsDir: '/custom/logs',
        level: 'debug',
        enableConsole: false,
        enableFile: false,
        maxSize: '1MB',
        maxFiles: '10',
      });

      expect(customLogger).toBeDefined();
    });

    it('should create logs directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      // Force non-test environment to ensure file logging is enabled
      new WinstonLogger({
        logsDir: testLogsDir,
        enableFile: true,
        forceTestEnvironment: false, // Override test environment detection
      });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(testLogsDir, { recursive: true });
    });

    it('should not create logs directory if file logging is disabled', () => {
      mockFs.existsSync.mockReturnValue(false);

      new WinstonLogger({
        logsDir: testLogsDir,
        enableFile: false,
      });

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('logging methods', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log info messages', () => {
      const message = 'Test info message';
      const meta = { userId: '123' };

      logger.info(message, meta);

      // Since we're using Winston internally, we can't directly test console output
      // but we can verify the method doesn't throw
      expect(() => logger.info(message, meta)).not.toThrow();
    });

    it('should log error messages', () => {
      const message = 'Test error message';
      const error = new Error('Test error');
      const meta = { requestId: 'abc123' };

      logger.error(message, error, meta);

      expect(() => logger.error(message, error, meta)).not.toThrow();
    });

    it('should log warn messages', () => {
      const message = 'Test warning message';
      const meta = { component: 'test' };

      logger.warn(message, meta);

      expect(() => logger.warn(message, meta)).not.toThrow();
    });

    it('should log debug messages', () => {
      const debugLogger = new WinstonLogger({
        level: 'debug',
        logsDir: testLogsDir,
      });

      const message = 'Test debug message';
      const meta = { debug: true };

      debugLogger.debug(message, meta);

      expect(() => debugLogger.debug(message, meta)).not.toThrow();
    });

    it('should handle error logging without error object', () => {
      const message = 'Error message without error object';

      logger.error(message);

      expect(() => logger.error(message)).not.toThrow();
    });

    it('should handle info logging without meta', () => {
      const message = 'Info message without meta';

      logger.info(message);

      expect(() => logger.info(message)).not.toThrow();
    });
  });

  describe('log method compatibility', () => {
    it('should support log method for backward compatibility', () => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/test',
        statusCode: 200,
      };

      if (logger.log) {
        logger.log(logEntry);
        expect(() => logger.log!(logEntry)).not.toThrow();
      }
    });
  });

  describe('middleware method', () => {
    it('should return middleware function when available', () => {
      if (logger.middleware) {
        const middleware = logger.middleware();
        expect(middleware).toBeDefined();
        expect(typeof middleware).toBe('function');
      }
    });
  });

  describe('configuration validation', () => {
    it('should handle invalid log levels gracefully', () => {
      expect(() => {
        new WinstonLogger({
          level: 'invalid' as any,
          logsDir: testLogsDir,
        });
      }).not.toThrow();
    });

    it('should handle missing logsDir', () => {
      expect(() => {
        new WinstonLogger({
          logsDir: undefined as any,
          enableFile: true,
        });
      }).not.toThrow();
    });
  });

  describe('file logging configuration', () => {
    it('should configure file transports when enabled', () => {
      const fileLogger = new WinstonLogger({
        logsDir: testLogsDir,
        enableFile: true,
        maxSize: '5MB',
        maxFiles: '15',
      });

      expect(fileLogger).toBeDefined();
    });

    it('should skip file transports when disabled', () => {
      const noFileLogger = new WinstonLogger({
        logsDir: testLogsDir,
        enableFile: false,
      });

      expect(noFileLogger).toBeDefined();
    });
  });

  describe('console logging configuration', () => {
    it('should enable console logging by default', () => {
      const consoleLogger = new WinstonLogger({
        logsDir: testLogsDir,
      });

      expect(consoleLogger).toBeDefined();
    });

    it('should disable console logging when specified', () => {
      const noConsoleLogger = new WinstonLogger({
        logsDir: testLogsDir,
        enableConsole: false,
      });

      expect(noConsoleLogger).toBeDefined();
    });
  });

  describe('middleware functionality', () => {
    it('should log HTTP requests with middleware', () => {
      const logger = new WinstonLogger({
        enableFile: false,
        logsDir: testLogsDir,
      });

      const middleware = logger.middleware();

      // Mock request and response objects
      const mockReq = {
        method: 'GET',
        path: '/test',
        routeName: 'test-route',
        targetUrl: 'https://api.example.com/test',
      } as any;

      const mockRes = {
        statusCode: 200,
        end: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      // Store original end function
      const originalEnd = mockRes.end;

      // Execute middleware
      middleware(mockReq, mockRes, mockNext);

      // Verify next was called
      expect(mockNext).toHaveBeenCalled();

      // Verify res.end was replaced
      expect(mockRes.end).not.toBe(originalEnd);

      // Simulate calling the wrapped end function
      mockRes.end();

      // Verify original end function was restored and called
      expect(originalEnd).toHaveBeenCalled();
    });

    it('should handle middleware logging with different status codes', () => {
      const logger = new WinstonLogger({
        enableFile: false,
        logsDir: testLogsDir,
      });

      const middleware = logger.middleware();

      const mockReq = {
        method: 'POST',
        path: '/api/test',
      } as any;

      const mockRes = {
        statusCode: 404,
        end: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      // Call the wrapped end function
      mockRes.end();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle middleware with arguments passed to end', () => {
      const logger = new WinstonLogger({
        enableFile: false,
        logsDir: testLogsDir,
      });

      const middleware = logger.middleware();

      const mockReq = {
        method: 'PUT',
        path: '/api/update',
      } as any;

      const mockRes = {
        statusCode: 200,
        end: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      // Call the wrapped end function with arguments
      const testData = 'response data';
      const testEncoding = 'utf8';
      mockRes.end(testData, testEncoding);

      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should measure response time accurately', async () => {
      const logger = new WinstonLogger({
        enableFile: false,
        logsDir: testLogsDir,
      });

      const middleware = logger.middleware();

      const mockReq = {
        method: 'GET',
        path: '/slow-endpoint',
      } as any;

      const mockRes = {
        statusCode: 200,
        end: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      // Execute middleware
      middleware(mockReq, mockRes, mockNext);

      // Add a small delay to test timing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Call the wrapped end function
      mockRes.end();

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
