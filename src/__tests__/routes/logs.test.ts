import request from 'supertest';
import express from 'express';
import { createLogsRoutes } from '../../routes/logs';
import { createMockLogger } from '../../test-helpers/logger.mock';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('Logs Routes', () => {
  let app: express.Application;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    app = express();
    app.use(express.json());
    app.use('/logs', createLogsRoutes(mockLogger));
    jest.clearAllMocks();
  });

  describe('GET /logs/requests', () => {
    it('should return request logs with default pagination', async () => {
      const mockLogContent =
        '2025-08-09 01:00:00 [info]: Request completed\n' +
        '2025-08-09 01:01:00 [info]: Another request\n';

      (fs.readdir as jest.Mock).mockResolvedValue(['app-2025-08-09.log']);
      (fs.readFile as jest.Mock).mockResolvedValue(mockLogContent);

      const response = await request(app).get('/logs/requests').expect(200);

      expect(response.body).toEqual({
        logs: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(String),
            level: expect.any(String),
            message: expect.any(String),
          }),
        ]),
        total: expect.any(Number),
        offset: 0,
        limit: 50,
      });
    });

    it('should handle pagination parameters', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/logs/requests?limit=10&offset=20').expect(200);

      expect(response.body).toEqual({
        logs: [],
        total: 0,
        offset: 20,
        limit: 10,
      });
    });

    it('should handle file system errors', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('File system error'));

      await request(app).get('/logs/requests').expect(500).expect({
        error: 'Failed to load request logs',
      });

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('GET /logs/errors', () => {
    it('should return error logs', async () => {
      const mockErrorContent = '2025-08-09 01:00:00 [error]: Database connection failed\n';

      (fs.readdir as jest.Mock).mockResolvedValue(['error-2025-08-09.log']);
      (fs.readFile as jest.Mock).mockResolvedValue(mockErrorContent);

      const response = await request(app).get('/logs/errors').expect(200);

      expect(response.body).toEqual({
        logs: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(String),
            level: 'error',
            message: expect.stringContaining('Database connection failed'),
          }),
        ]),
        total: expect.any(Number),
        offset: 0,
        limit: 50,
      });
    });

    it('should handle missing log files gracefully', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/logs/errors').expect(200);

      expect(response.body).toEqual({
        logs: [],
        total: 0,
        offset: 0,
        limit: 50,
      });
    });
  });

  describe('GET /logs/:filename', () => {
    it('should return specific log file content', async () => {
      const mockContent = '2025-08-09 01:00:00 [info]: Test log entry';

      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const response = await request(app).get('/logs/app-2025-08-09.log').expect(200);

      expect(response.body).toEqual({
        filename: 'app-2025-08-09.log',
        content: mockContent,
        size: mockContent.length,
      });
    });

    it('should handle invalid filename', async () => {
      await request(app).get('/logs/../../../etc/passwd').expect(400).expect({
        error: 'Invalid filename',
      });
    });

    it('should handle file not found', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      await request(app).get('/logs/nonexistent.log').expect(404).expect({
        error: 'Log file not found',
      });
    });
  });
});
