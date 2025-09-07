import { spec } from 'pactum';
import { AddressInfo } from 'net';

// Set test environment and suppress debug logs before importing app
process.env.NODE_ENV = 'test';
process.env.DEBUG = '';
process.env.DOTENV_CONFIG_DEBUG = 'false';

import app, { cleanupIntervals } from '../../src/index';

describe('Simple API E2E Tests', () => {
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
      await spec().get(`${baseUrl}/health`).withRequestTimeout(10000).expectStatus(200);
    } catch (error) {
      console.error('Failed to start test server:', error);
      throw error;
    }
  }, 40000); // Increased timeout for parallel execution

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
        .withRequestTimeout(20000) // Increase to 20 second timeout for parallel execution
        .expectStatus(200)
        .expectJsonLike({
          validation: {
            stages: [],
            enableMetrics: true,
          },
        });
    }, 30000); // Increase test timeout to 30 seconds for parallel execution
  });

  describe('Analytics API', () => {
    it('should get analytics', async () => {
      await spec()
        .get(`${baseUrl}/api/analytics`)
        .withRequestTimeout(30000) // Increase to 30 second timeout for parallel execution
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            totalSessions: { type: 'number' },
            successRate: { type: 'number' },
            averageTimeToSuccess: { type: 'number' },
            averageAttemptsToSuccess: { type: 'number' },
            mostFailedStage: { type: ['string', 'null'] }, // Allow null value
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
    }, 40000); // Increase test timeout to 40 seconds for parallel execution
  });
});
