import request from 'supertest';
import express from 'express';

describe('Payload Limits', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Configure body parser with limits (same as main app)
    app.use(
      express.json({
        limit: '100mb',
      })
    );
    app.use(
      express.raw({
        type: '*/*',
        limit: '100mb',
      })
    );
    app.use(
      express.urlencoded({
        limit: '100mb',
        extended: true,
      })
    );

    // Handle body parser errors
    app.use(
      (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (error instanceof SyntaxError && 'body' in error) {
          return res.status(400).json({
            error: 'Invalid JSON in request body',
          });
        }

        if (error.type === 'entity.too.large') {
          return res.status(413).json({
            error: {
              message: 'Request payload too large',
              type: 'payload_too_large_error',
              limit: '100MB',
            },
          });
        }

        next(error);
      }
    );

    // Test route that echoes back the payload size
    app.post('/test-payload', (req, res) => {
      const bodySize = JSON.stringify(req.body).length;
      res.json({
        message: 'Payload received',
        size: bodySize,
        sizeFormatted: `${(bodySize / 1024 / 1024).toFixed(2)}MB`,
      });
    });

    // Route that simulates chat completions with large payloads
    app.post('/v1/chat/completions', async (req, res) => {
      try {
        // Simulate processing a large request
        const bodySize = JSON.stringify(req.body).length;

        if (bodySize > 50 * 1024 * 1024) {
          // 50MB threshold for this test
          return res.status(413).json({
            error: {
              message: 'Request payload exceeds model limits',
              type: 'payload_too_large_error',
              size: bodySize,
              limit: '50MB',
            },
          });
        }

        // Simulate successful response
        res.json({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `Processed payload of ${(bodySize / 1024).toFixed(1)}KB`,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: Math.floor(bodySize / 4),
            completion_tokens: 20,
            total_tokens: Math.floor(bodySize / 4) + 20,
          },
        });
      } catch {
        res.status(500).json({
          error: {
            message: 'Internal server error',
            type: 'internal_error',
          },
        });
      }
    });
  });

  describe('Payload Size Handling', () => {
    it('should handle small payloads normally', async () => {
      const smallPayload = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, world!' }],
      };

      const response = await request(app).post('/test-payload').send(smallPayload).expect(200);

      expect(response.body.message).toBe('Payload received');
      expect(response.body.size).toBeLessThan(1024); // Less than 1KB
    });

    it('should handle medium payloads (1MB)', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB of content
      const mediumPayload = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: largeContent }],
      };

      const response = await request(app).post('/test-payload').send(mediumPayload).expect(200);

      expect(response.body.message).toBe('Payload received');
      expect(parseFloat(response.body.sizeFormatted)).toBeGreaterThanOrEqual(1); // At least 1MB
    });

    it('should handle chat completions with large context', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB of content
      const chatPayload = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: largeContent }],
        max_tokens: 1000,
      };

      const response = await request(app)
        .post('/v1/chat/completions')
        .send(chatPayload)
        .expect(200);

      expect(response.body.choices[0].message.content).toContain('Processed payload');
      expect(response.body.usage.prompt_tokens).toBeGreaterThan(250000); // Approximate tokens for 1MB
    });

    it('should reject extremely large payloads with proper error', async () => {
      const hugeContent = 'x'.repeat(60 * 1024 * 1024); // 60MB of content
      const hugePayload = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: hugeContent }],
      };

      const response = await request(app)
        .post('/v1/chat/completions')
        .send(hugePayload)
        .expect(413);

      expect(response.body.error.type).toBe('payload_too_large_error');
      expect(response.body.error.message).toContain('exceeds model limits');
      expect(response.body.error.limit).toBe('50MB');
    });

    it('should provide helpful error information for payload limits', async () => {
      // Create a payload that's exactly at the Express limit + 1MB to trigger the error
      const payload = 'x'.repeat(101 * 1024 * 1024); // 101MB - should exceed 100MB limit

      const response = await request(app).post('/test-payload').send({ data: payload }).expect(413);

      expect(response.body.error.type).toBe('payload_too_large_error');
      expect(response.body.error.message).toBe('Request payload too large');
      expect(response.body.error.limit).toBe('100MB');
    });
  });

  describe('Error Recovery', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const response = await request(app)
        .post('/test-payload')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // Invalid JSON
        .expect(400);

      expect(response.body.error).toBe('Invalid JSON in request body');
    });

    it('should continue processing after payload errors', async () => {
      // First request fails due to size
      const hugeContent = 'x'.repeat(60 * 1024 * 1024);
      await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: hugeContent }],
        })
        .expect(413);

      // Second request should work normally
      const response = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toContain('Processed payload');
    });
  });
});
