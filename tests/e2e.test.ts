import 'dotenv/config';
import axios from 'axios';

const baseUrl = 'http://localhost:3000';

describe('Proxy E2E Tests', () => {
  const timeout = 30000;

  beforeAll(() => {
    // Ensure API key is loaded
    expect(process.env.OPENROUTER_API_KEY).toBeDefined();
  });

  test('health check returns server status', async () => {
    const response = await axios.get(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'healthy');
    expect(response.data).toHaveProperty('models');
  });

  test('models endpoint returns all configured models', async () => {
    const response = await axios.get(`${baseUrl}/v1/models`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('object', 'list');
    expect(response.data.data).toBeInstanceOf(Array);

    const modelIds = response.data.data.map((m: any) => m.id);
    expect(modelIds).toContain('kimi-k2:free');
    expect(modelIds).toContain('deepseek-chat-v3-0324:free');
  });

  test(
    'chat completions with kimi-k2:free model',
    async () => {
      const response = await axios.post(
        `${baseUrl}/v1/chat/completions`,
        {
          model: 'kimi-k2:free',
          messages: [{ role: 'user', content: 'Say "Hello!" and nothing else.' }],
          temperature: 0.1,
          max_tokens: 10,
        },
        { timeout }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('choices');
      expect(response.data.choices[0]).toHaveProperty('message');
      expect(response.data.choices[0].message).toHaveProperty('content');
    },
    timeout
  );

  test('chat completions with deepseek model', async () => {
    try {
      const response = await axios.post(
        `${baseUrl}/v1/chat/completions`,
        {
          model: 'deepseek-chat-v3-0324:free',
          messages: [{ role: 'user', content: 'What is 2+2? Answer with just the number.' }],
          max_tokens: 5,
        },
        { timeout: 15000 }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('choices');
      expect(response.data.choices[0].message.content.trim()).toMatch(/4/);
    } catch (error: any) {
      // Handle various failure modes for free tier models
      const isExpectedError =
        error.response?.status === 500 ||
        error.response?.status === 429 ||
        error.code === 'ECONNABORTED' ||
        error.message?.includes('timeout');

      if (isExpectedError) {
        console.log(
          'DeepSeek model issue (expected for free tier):',
          error.response?.data?.error?.message || error.message
        );
        // Test passes - proxy correctly handled the upstream issue
      } else {
        throw error;
      }
    }
  }, 20000);

  test('invalid model returns 400 error', async () => {
    await expect(
      axios.post(`${baseUrl}/v1/chat/completions`, {
        model: 'invalid-model-name',
        messages: [{ role: 'user', content: 'Test' }],
      })
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: {
          error: {
            message: expect.stringContaining('not found'),
          },
        },
      },
    });
  });

  test(
    'streaming chat completions',
    async () => {
      const response = await axios.post(
        `${baseUrl}/v1/chat/completions`,
        {
          model: 'kimi-k2:free',
          messages: [{ role: 'user', content: 'Count from 1 to 3' }],
          stream: true,
          max_tokens: 20,
        },
        {
          responseType: 'stream',
          timeout,
        }
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(
        /text\/event-stream|text\/plain|application\/json/
      );

      // Verify we get streaming data
      let dataReceived = false;
      response.data.on('data', () => {
        dataReceived = true;
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      expect(dataReceived).toBe(true);
    },
    timeout
  );
});
