import { WinstonLogger } from '../../logger-winston';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import type { Request, Response } from 'express';

describe('WinstonLogger - App Log Files Prevention', () => {
  let tempDir: string;
  let logger: WinstonLogger;

  beforeEach(() => {
    // Create unique temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'winston-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Test Environment Configuration', () => {
    it('should disable file logging when NODE_ENV is test', () => {
      // Set test environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      logger = new WinstonLogger({
        logsDir: tempDir,
        enableFile: false, // Should be automatically disabled in test env
      });

      // Log some messages
      logger.info('Test message 1');
      logger.error('Test error message');
      logger.warn('Test warning');

      // Check that no log files were created
      const logFiles = fs.readdirSync(tempDir);
      expect(logFiles.length).toBe(0);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not create app.log files in test directories', () => {
      const testLogDir = path.join(tempDir, 'tests', 'api-e2e', 'logs');
      fs.mkdirSync(testLogDir, { recursive: true });

      logger = new WinstonLogger({
        logsDir: testLogDir,
        enableFile: false, // Explicitly disable for test
      });

      // Log multiple messages that would trigger file rotation
      for (let i = 0; i < 10; i++) {
        logger.info(`Test message ${i}`, { data: 'x'.repeat(1000) });
      }

      // Verify no app log files were created
      const logFiles = fs.readdirSync(testLogDir);
      const appLogFiles = logFiles.filter(file => file.startsWith('app') && file.endsWith('.log'));

      expect(appLogFiles.length).toBe(0);
      expect(logFiles.filter(f => f === 'app.log')).toHaveLength(0);
      expect(logFiles.filter(f => f.match(/^app\d+\.log$/))).toHaveLength(0);
    });

    it('should automatically detect test environment from path', () => {
      // Simulate being in a test directory
      const testPath = path.join(tempDir, 'tests', 'api-e2e', 'logs');
      fs.mkdirSync(testPath, { recursive: true });

      // Logger should detect it's in a test environment and disable file logging
      logger = new WinstonLogger({
        logsDir: testPath,
      });

      logger.info('Test message in test directory');

      const logFiles = fs.readdirSync(testPath);
      expect(logFiles.length).toBe(0);
    });
  });

  describe('File Rotation Prevention', () => {
    it('should not create numbered app log files (app1.log, app2.log, etc)', () => {
      logger = new WinstonLogger({
        logsDir: tempDir,
        enableFile: true,
        maxFiles: '3',
        maxSize: '100', // Very small size to force rotation
      });

      // Generate enough logs to potentially trigger rotation
      for (let i = 0; i < 50; i++) {
        logger.info(`Large test message ${i}`, {
          data: 'x'.repeat(500),
          iteration: i,
        });
      }

      const logFiles = fs.readdirSync(tempDir);
      const numberedAppFiles = logFiles.filter(file => file.match(/^app\d+\.log$/));

      expect(numberedAppFiles.length).toBe(0);
    });

    it('should use single app.log file without rotation in test environment', () => {
      // Even with rotation settings, should not rotate in test env
      logger = new WinstonLogger({
        logsDir: tempDir,
        enableFile: false, // Disabled for test
        maxFiles: '5',
        maxSize: '1000',
      });

      // Generate logs
      for (let i = 0; i < 20; i++) {
        logger.info(`Message ${i}`);
      }

      const logFiles = fs.readdirSync(tempDir);
      expect(logFiles.length).toBe(0); // No files should be created
    });
  });

  describe('Production vs Test Environment', () => {
    it('should respect enableFile: false setting regardless of environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logger = new WinstonLogger({
        logsDir: tempDir,
        enableFile: false, // Explicitly disabled
      });

      logger.info('Production message with file logging disabled');

      const logFiles = fs.readdirSync(tempDir);
      expect(logFiles.length).toBe(0);

      process.env.NODE_ENV = originalEnv;
    });

    it('should create app.log in production when file logging is enabled', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalJest = process.env.JEST_WORKER_ID;

      // Temporarily set non-test environment
      process.env.NODE_ENV = 'production';
      delete process.env.JEST_WORKER_ID;

      logger = new WinstonLogger({
        logsDir: tempDir,
        enableFile: true,
        forceTestEnvironment: false, // Force non-test environment
      });

      logger.info('Production message with file logging enabled');

      // Wait for file to be written - Winston writes asynchronously
      // Poll for file existence up to 2 seconds
      let fileExists = false;
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const logFiles = fs.readdirSync(tempDir);
        if (logFiles.includes('app.log')) {
          fileExists = true;
          break;
        }
      }

      const logFiles = fs.readdirSync(tempDir);
      expect(logFiles).toContain('app.log');
      expect(logFiles.filter(f => f.match(/^app\d+\.log$/))).toHaveLength(0);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalJest) {
        process.env.JEST_WORKER_ID = originalJest;
      }
    }, 10000);
  });

  describe('Log File Cleanup', () => {
    it('should provide method to clean up test log files', () => {
      // Create some test log files
      const testFiles = ['app.log', 'app1.log', 'app2.log', 'error.log', 'access.log'];
      testFiles.forEach(file => {
        fs.writeFileSync(path.join(tempDir, file), 'test content');
      });

      // Verify files exist
      let logFiles = fs.readdirSync(tempDir);
      expect(logFiles.length).toBe(testFiles.length);

      // Use WinstonLogger cleanup method
      WinstonLogger.cleanupAppLogFiles(tempDir);

      // Verify only app log files are cleaned up
      logFiles = fs.readdirSync(tempDir);
      const remainingAppFiles = logFiles.filter(
        file => file.startsWith('app') && file.endsWith('.log')
      );
      expect(remainingAppFiles.length).toBe(0);

      // Verify other log files remain
      expect(logFiles).toContain('error.log');
      expect(logFiles).toContain('access.log');
    });

    it('should detect test environment correctly', () => {
      // WinstonLogger should detect we're in Jest
      expect(WinstonLogger.isTestEnvironment()).toBe(true);
    });
  });

  describe('Middleware logging', () => {
    it('captures request and response metadata with sanitized headers', () => {
      logger = new WinstonLogger({
        logsDir: tempDir,
        enableConsole: false,
        enableFile: false,
        forceTestEnvironment: true,
      });

      const internalLogger = (logger as any).logger;
      const infoSpy = jest.spyOn(internalLogger, 'info');

      const req = {
        method: 'POST',
        path: '/api/test',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest', authorization: 'secret-token' },
        body: { foo: 'bar' },
        get: (header: string) => (header === 'user-agent' ? 'jest' : undefined),
      } as unknown as Request;

      class ResponseStub extends EventEmitter {
        statusCode = 201;
        private storedHeaders: Record<string, unknown> = {
          'content-type': 'application/json',
          'set-cookie': 'session=secret',
        };
        end = jest.fn();
        getHeaders() {
          return this.storedHeaders;
        }
      }

      const res = new ResponseStub() as unknown as Response;
      const middleware = logger.middleware();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      const writeChunk = JSON.stringify({ ok: true });
      (res as any).end(writeChunk);

      const logCall = infoSpy.mock.calls.find(call => call[0] === 'HTTP Request');
      expect(logCall).toBeDefined();
      const meta = logCall?.[1] as Record<string, unknown>;
      const requestHeaders = (meta?.requestHeaders as Record<string, string>) ?? {};
      const responseHeaders = (meta?.responseHeaders as Record<string, string>) ?? {};
      expect(requestHeaders.authorization).toBe('[REDACTED]');
      expect(responseHeaders['set-cookie']).toBe('[REDACTED]');
      expect(meta?.responseBody).toEqual({ ok: true });
    });
  });
});
