import request from 'supertest';
import express from 'express';

// Mock the server setup for testing
const app = express();

// Mock the OpenRouter stats endpoint
jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('OpenRouter Stats API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty stats for invalid model', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/management/openrouter-stats/invalid%2Fmodel')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Model not found');
  });

  it('should parse OpenRouter API response correctly', async () => {
    // This is an integration test that requires the server to be running
    const response = await request('http://localhost:3000')
      .get('/api/management/openrouter-stats/openrouter%2Fmoonshotai%2Fkimi-k2%3Afree')
      .expect(200);

    expect(response.body).toHaveProperty('modelSlug');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body).toHaveProperty('averageUptime');
    expect(response.body).toHaveProperty('providerCount');
    expect(response.body.modelSlug).toBe('moonshotai/kimi-k2:free');

    if (response.body.endpoints.length > 0) {
      const endpoint = response.body.endpoints[0];
      expect(endpoint).toHaveProperty('provider');
      expect(endpoint).toHaveProperty('pricing');
      expect(endpoint).toHaveProperty('uptime');
    }
  });

  it('should handle OpenRouter API errors gracefully', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/management/openrouter-stats/openrouter%2Fnonexistent%2Fmodel')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});
