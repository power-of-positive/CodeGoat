import { spec } from 'pactum';
import { AddressInfo } from 'net';
import { createApp } from '../../src/app';

describe('Validation Analytics API E2E Tests', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    // Start the server on a random port for testing
    const app = createApp();
    server = app.listen(0); // 0 = random available port
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // Wait a bit for server to fully start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('Settings API', () => {
    it('should get current settings', async () => {
      await spec()
        .get(`${baseUrl}/api/settings`)
        .expectStatus(200)
        .expectJsonLike({
          validation: {
            stages: [],
            enableMetrics: true,
          },
        });
    });

    it('should get validation stages', async () => {
      await spec()
        .get(`${baseUrl}/api/settings/validation/stages`)
        .expectStatus(200)
        .expectJsonLike({
          stages: [],
        });
    });
  });

  describe('Analytics API', () => {
    it('should get analytics', async () => {
      await spec().get(`${baseUrl}/api/analytics`).expectStatus(200).expectJsonLike({
        totalSessions: 0,
        successRate: 0,
        averageTimeToSuccess: 0,
        averageAttemptsToSuccess: 0,
        mostFailedStage: 'none',
        stageSuccessRates: {},
        averageStageTime: {},
        dailyStats: {},
      });
    });

    it('should get sessions', async () => {
      await spec().get(`${baseUrl}/api/analytics/sessions`).expectStatus(200).expectJsonLike({
        sessions: [],
      });
    });

    it('should handle pagination for sessions', async () => {
      await spec()
        .get(`${baseUrl}/api/analytics/sessions`)
        .withQueryParams({
          limit: 10,
        })
        .expectStatus(200)
        .expectJsonLike({
          sessions: [],
        });
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      await spec().get(`${baseUrl}/health`).expectStatus(200).expectJson({ status: 'ok' });
    });
  });
});
