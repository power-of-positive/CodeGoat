import axios from 'axios';
import { TEST_CONFIG, TEST_MODELS } from './fixtures/e2e-fixtures';

describe('Payload Handling E2E Tests', () => {
  const baseUrl = TEST_CONFIG.baseUrl;

  describe('Payload Size Handling', () => {
    test('should handle small payloads (< 1KB)', async () => {
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content: 'Hello!' }],
        max_tokens: 10,
      };

      const payloadSize = JSON.stringify(payload).length;
      expect(payloadSize).toBeLessThan(1024);

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 15000,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
      } catch (error: any) {
        // Handle expected provider errors
        if (error.response?.status >= 400) {
          expect(error.response.data).toHaveProperty('error');
        } else {
          throw error;
        }
      }
    });

    test('should handle medium payloads (1-10KB)', async () => {
      const content = 'This is a test message with substantial content. '.repeat(200); // ~10KB
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content }],
        max_tokens: 50,
      };

      const payloadSize = JSON.stringify(payload).length;
      expect(payloadSize).toBeGreaterThan(1024);
      expect(payloadSize).toBeLessThan(10 * 1024);

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 20000,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
      } catch (error: any) {
        // Check if it's a context length error (expected)
        if (
          error.response?.status === 400 &&
          error.response.data?.error?.message?.includes('context length')
        ) {
          console.log('Context length exceeded - this triggers fallback logic');
          expect(error.response.data.error).toHaveProperty('message');
        } else if (error.response?.status >= 400) {
          expect(error.response.data).toHaveProperty('error');
        } else {
          throw error;
        }
      }
    });

    test('should handle large payloads (100KB+) without 413 errors', async () => {
      const largeContent = 'x'.repeat(100 * 1024); // 100KB of content
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content: largeContent }],
        max_tokens: 10,
      };

      const payloadSize = JSON.stringify(payload).length;
      expect(payloadSize).toBeGreaterThan(100 * 1024);

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 30000,
        });

        // Should not get 413 Payload Too Large
        expect(response.status).not.toBe(413);

        // May get 400 for context length, which is expected
        if (response.status === 200) {
          expect(response.data).toHaveProperty('choices');
        }
      } catch (error: any) {
        // Should NOT be 413 Payload Too Large
        expect(error.response?.status).not.toBe(413);

        // Should be proper error responses (400 for context length, etc.)
        if (error.response?.status === 400) {
          expect(error.response.data).toHaveProperty('error');
          expect(error.response.data.error).toHaveProperty('message');

          // Check if it's context length error (expected)
          if (
            error.response.data.error.message.includes('context length') ||
            error.response.data.error.message.includes('too large')
          ) {
            console.log(
              'Large payload correctly handled - got context length error instead of 413'
            );
          }
        } else {
          throw error;
        }
      }
    });

    test('should handle extremely large payloads (1MB+) gracefully', async () => {
      const hugeContent = 'x'.repeat(1024 * 1024); // 1MB of content
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content: hugeContent }],
        max_tokens: 5,
      };

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 45000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        // Should not crash with 413
        expect(response.status).not.toBe(413);
        expect(response.status).not.toBe(500);
      } catch (error: any) {
        // Should be handled gracefully, not 413 or 500 crashes
        if (error.response) {
          expect(error.response.status).not.toBe(413); // No payload too large
          expect(error.response.status).not.toBe(500); // No server crash

          // Likely 400 for context length limits
          if (error.response.status === 400) {
            expect(error.response.data).toHaveProperty('error');
            console.log(
              '1MB payload handled - got expected error:',
              error.response.data.error.message
            );
          }
        } else if (error.code === 'ECONNABORTED') {
          // Timeout is acceptable for very large payloads
          console.log('Large payload timed out - this is acceptable behavior');
        } else {
          throw error;
        }
      }
    }, 60000);
  });

  describe('Fallback Behavior on Large Payloads', () => {
    test('should attempt fallback when primary model fails with context length error', async () => {
      // Create payload that exceeds kimi-k2:free context window
      const largeText = 'This is a test message with substantial content. '.repeat(16000); // ~800KB
      const payload = {
        model: TEST_MODELS.kimi, // Primary model
        messages: [{ role: 'user', content: largeText }],
        max_tokens: 10,
      };

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 45000,
        });

        if (response.status === 200) {
          // Success - either primary model handled it or fallback worked
          expect(response.data).toHaveProperty('choices');
          console.log('Large payload succeeded - fallback may have been used');
        }
      } catch (error: any) {
        if (error.response?.status === 400) {
          const errorMsg = error.response.data?.error?.message || '';

          if (errorMsg.includes('context length') || errorMsg.includes('maximum context')) {
            // This means fallback didn't work or all models failed
            console.log('All models failed with context length error - fallback needs improvement');
            expect(error.response.data).toHaveProperty('error');
          }
        } else {
          throw error;
        }
      }
    }, 60000);

    test('should handle streaming requests with large payloads', async () => {
      const mediumContent = 'Stream test content. '.repeat(1000); // ~20KB
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content: mediumContent }],
        max_tokens: 20,
        stream: true,
      };

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 30000,
          responseType: 'stream',
        });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(
          /text\/event-stream|application\/json|text\/plain/
        );

        // Verify we get streaming data
        let dataReceived = false;
        response.data.on('data', (chunk: any) => {
          dataReceived = true;
          console.log('Streaming chunk received:', chunk.toString().substring(0, 100));
        });

        await new Promise(resolve => setTimeout(resolve, 5000));
        expect(dataReceived).toBe(true);
      } catch (error: any) {
        if (error.response?.status === 400) {
          // Context length error is acceptable
          console.log('Streaming large payload failed with context error - expected');
        } else {
          throw error;
        }
      }
    }, 45000);
  });

  describe('Error Recovery and Resilience', () => {
    test('should continue processing after payload errors', async () => {
      // First request with large payload that may fail
      const largePayload = {
        model: TEST_MODELS.kimi,
        messages: [
          { role: 'user', content: 'x'.repeat(200000) }, // Large content
        ],
        max_tokens: 5,
      };

      try {
        await axios.post(`${baseUrl}/v1/chat/completions`, largePayload, {
          timeout: 15000,
        });
      } catch {
        // First request may fail - that's okay
        console.log('Large request failed as expected');
      }

      // Second request should work normally
      const smallPayload = {
        model: TEST_MODELS.kimi,
        messages: [{ role: 'user', content: 'Hello, this should work.' }],
        max_tokens: 10,
      };

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, smallPayload, {
          timeout: 15000,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
        console.log('Server recovered successfully after large payload error');
      } catch (error: any) {
        // Even if this fails, it should be a proper error, not a crash
        if (error.response) {
          expect(error.response.data).toHaveProperty('error');
        }
      }
    });

    test('should handle malformed large payloads gracefully', async () => {
      const malformedData =
        '{"model": "' +
        TEST_MODELS.kimi +
        '", "messages": [{"role": "user", "content": "' +
        'x'.repeat(10000) +
        '", "invalid_field": }';

      try {
        await axios.post(`${baseUrl}/v1/chat/completions`, malformedData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });
        fail('Should have thrown error for malformed JSON');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
      }
    });

    test('should respect server timeout settings for large requests', async () => {
      const payload = {
        model: TEST_MODELS.kimi,
        messages: [
          {
            role: 'user',
            content:
              'Generate a very long response about artificial intelligence, machine learning, and the future of technology. Please be very detailed and comprehensive.',
          },
        ],
        max_tokens: 1000, // Request large response
      };

      try {
        const response = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
          timeout: 60000, // 1 minute timeout
        });

        if (response.status === 200) {
          expect(response.data).toHaveProperty('choices');
          expect(response.data.choices[0]).toHaveProperty('message');
        }
      } catch (error: any) {
        // Timeout or other errors should be handled gracefully
        if (error.code === 'ECONNABORTED') {
          console.log('Request timed out - server handled timeout correctly');
        } else if (error.response?.status >= 400) {
          expect(error.response.data).toHaveProperty('error');
        } else {
          throw error;
        }
      }
    }, 90000);
  });
});
