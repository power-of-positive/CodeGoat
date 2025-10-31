import { spec } from 'pactum';
import { AddressInfo } from 'net';

// Set test environment and suppress debug logs before importing app
process.env.NODE_ENV = 'test';
process.env.DEBUG = '';
process.env.DOTENV_CONFIG_DEBUG = 'false';

import app, { cleanupIntervals } from '../../src/index';

describe('Validation Analytics API E2E Tests', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    try {
      // Start the server on a random port for testing
      server = await new Promise((resolve, reject) => {
        const srv = app.listen(0); // 0 = random available port
        srv.on('listening', () => resolve(srv));
        srv.on('error', reject);
      });

      const address = server.address() as AddressInfo;
      baseUrl = `http://localhost:${address.port}`;

      // Wait for server to be ready to accept connections
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased wait time

      // Verify server is responding with increased timeout
      await spec()
        .get(`http://localhost:${address.port}/health`)
        .withRequestTimeout(10000)
        .expectStatus(200);
    } catch (error) {
      console.error('Failed to start test server:', error);
      throw error;
    }
  }, 40000); // Increase timeout for parallel execution

  afterAll(async () => {
    // Clean up intervals first
    await cleanupIntervals();

    if (server) {
      await new Promise(resolve => {
        server.close(() => {
          setTimeout(resolve, 100); // Give time for cleanup
        });
      });
    }
  });

  describe('Settings API', () => {
    it('should get current settings', async () => {
      await spec()
        .get(`${baseUrl}/api/settings`)
        .withRequestTimeout(20000) // Add timeout for parallel execution
        .expectStatus(200)
        .expectJsonLike({
          validation: {
            stages: [],
            enableMetrics: true,
          },
        });
    }, 30000); // Increase test timeout

    it('should get validation stages', async () => {
      await spec()
        .get(`${baseUrl}/api/settings/validation/stages`)
        .withRequestTimeout(20000) // Add timeout for parallel execution
        .expectStatus(200)
        .expectJsonLike({
          stages: [],
        });
    }, 30000); // Increase test timeout
  });

  describe('Analytics API', () => {
    it('should get analytics', async () => {
      await spec()
        .get(`${baseUrl}/api/analytics`)
        .withRequestTimeout(30000) // Add timeout for parallel execution
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            totalSessions: { type: 'number' },
            successRate: { type: 'number' },
            averageTimeToSuccess: { type: 'number' },
            averageAttemptsToSuccess: { type: 'number' },
            mostFailedStage: { type: 'string' },
            stageSuccessRates: { type: 'object' },
            averageStageTime: { type: 'object' },
            dailyStats: { type: 'object' },
          },
          required: [
            'totalSessions',
            'successRate',
            'averageTimeToSuccess',
            'averageAttemptsToSuccess',
            'mostFailedStage',
            'stageSuccessRates',
            'averageStageTime',
            'dailyStats',
          ],
        });
    }, 40000); // Increase test timeout

    it.skip('should get sessions', async () => {
      await spec()
        .get(`${baseUrl}/api/analytics/sessions`)
        .withRequestTimeout(60000) // Increase timeout significantly
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            sessions: { type: 'array' },
          },
          required: ['sessions'],
        });
    }, 120000); // Increase test timeout

    it.skip('should handle pagination for sessions', async () => {
      await spec()
        .get(`${baseUrl}/api/analytics/sessions`)
        .withQueryParams({
          limit: 10,
        })
        .withRequestTimeout(60000) // Increase timeout significantly
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            sessions: { type: 'array' },
          },
          required: ['sessions'],
        });
    }, 120000); // Increase test timeout
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      await spec()
        .get(`${baseUrl}/health`)
        .withRequestTimeout(10000) // Add timeout for parallel execution
        .expectStatus(200)
        .expectJson({ status: 'ok' });
    }, 20000); // Increase test timeout
  });
});
