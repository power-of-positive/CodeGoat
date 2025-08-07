import request from 'supertest';
import express from 'express';
import { createInternalRoutes } from '../../routes/internal';

describe('Internal Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    const internalRouter = createInternalRoutes();
    app.use('/internal', internalRouter);
  });

  describe('GET /internal/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/internal/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
      });
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('GET /internal/test', () => {
    it('should return test message', async () => {
      const response = await request(app).get('/internal/test').expect(200);

      expect(response.body).toEqual({
        message: 'Test route works!',
      });
    });
  });
});
