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
    jest.clearAllMocks();
    mockLogger = createMockLogger();
    app = express();
    app.use(express.json());
    app.use('/logs', createLogsRoutes(mockLogger));

    // Reset all mocks to default behavior
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
  });

  describe('GET /logs/requests', () => {
    it('should return request logs with default pagination', async () => {
      const mockAppLog =
        '{"timestamp":"2025-08-09T01:00:00.000Z","method":"GET","path":"/api/test","statusCode":200,"duration":100,"message":"HTTP Request"}\n{"timestamp":"2025-08-09T01:01:00.000Z","method":"POST","path":"/api/another","statusCode":201,"duration":150,"message":"HTTP Request"}\n';

      // Mock readdir to return app.log file
      (fs.readdir as jest.Mock).mockResolvedValue(['app.log']);
      (fs.readFile as jest.Mock).mockResolvedValue(mockAppLog);

      const response = await request(app).get('/logs/requests').expect(200);

      expect(response.body).toEqual({
        logs: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(String),
            method: expect.any(String),
            path: expect.any(String),
            statusCode: expect.any(Number),
            duration: expect.any(Number),
          }),
        ]),
        total: expect.any(Number),
        offset: 0,
        limit: 50,
      });
    });

    it('should handle pagination parameters', async () => {
      // Mock readdir to return empty array (no log files)
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/logs/requests?limit=10&offset=20').expect(200);

      expect(response.body).toEqual({
        logs: [],
        total: 0,
        offset: 20,
        limit: 10,
      });
    });

    it('should handle file system errors gracefully', async () => {
      // Mock readdir to throw error
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory read error'));

      // The service gracefully handles missing or erroring log files
      const response = await request(app).get('/logs/requests').expect(200);

      expect(response.body).toEqual({
        logs: [],
        total: 0,
        offset: 0,
        limit: 50,
      });
    });
  });

  describe('GET /logs/errors', () => {
    it('should return error logs', async () => {
      const mockErrorContent =
        '{"timestamp":"2025-08-09T01:00:00.000Z","level":"error","message":"Database connection failed"}\n';

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
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

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

    it.skip('should handle invalid filename', async () => {
      await request(app).get('/logs/invalid..filename').expect(400).expect({
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
