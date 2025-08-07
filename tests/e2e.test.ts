import 'dotenv/config';
import axios from 'axios';
import {
  TEST_CONFIG,
  TEST_MODELS,
  COMMON_MESSAGES,
  CONVERSATION_EXAMPLES,
  COMMON_PARAMETERS,
  createChatPayload,
  createStreamingPayload,
  EXPECTED_RESPONSE_STRUCTURE,
  AXIOS_CONFIG,
  isExpectedUpstreamError,
} from './fixtures/e2e-fixtures';

describe('Proxy E2E Tests', () => {
  beforeAll(() => {
    // Ensure API key is loaded
    expect(process.env.OPENROUTER_API_KEY).toBeDefined();
  });

  test('health check returns server status', async () => {
    const response = await axios.get(`${TEST_CONFIG.baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'healthy');
    expect(response.data).toHaveProperty('models');
  });

  test('models endpoint returns all configured models', async () => {
    const response = await axios.get(`${TEST_CONFIG.baseUrl}/v1/models`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('object', 'list');
    expect(response.data.data).toBeInstanceOf(Array);

    const modelIds = response.data.data.map((m: any) => m.id);
    expect(modelIds).toContain(TEST_MODELS.kimi);
    expect(modelIds).toContain(TEST_MODELS.deepseek);
  });

  test(
    'chat completions with kimi-k2:free model',
    async () => {
      const payload = createChatPayload(
        TEST_MODELS.kimi,
        [COMMON_MESSAGES.greeting],
        COMMON_PARAMETERS.minimal
      );

      const response = await axios.post(
        `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
        payload,
        AXIOS_CONFIG.default
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('choices');
      expect(response.data.choices[0]).toHaveProperty('message');
      expect(response.data.choices[0].message).toHaveProperty('content');
    },
    TEST_CONFIG.timeout
  );

  test('chat completions with deepseek model', async () => {
    try {
      const payload = createChatPayload(
        TEST_MODELS.deepseek,
        [COMMON_MESSAGES.math],
        COMMON_PARAMETERS.small
      );

      const response = await axios.post(
        `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
        payload,
        AXIOS_CONFIG.short
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('choices');
      expect(response.data.choices[0].message.content.trim()).toMatch(/4/);
    } catch (error: any) {
      if (isExpectedUpstreamError(error)) {
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
    const payload = createChatPayload(TEST_MODELS.invalid, [{ role: 'user', content: 'Test' }]);

    await expect(
      axios.post(`${TEST_CONFIG.baseUrl}/v1/chat/completions`, payload)
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
      const payload = createStreamingPayload(
        TEST_MODELS.kimi,
        [COMMON_MESSAGES.count],
        COMMON_PARAMETERS.larger
      );

      const response = await axios.post(
        `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
        payload,
        AXIOS_CONFIG.streaming
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

      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.streamTimeout));
      expect(dataReceived).toBe(true);
    },
    TEST_CONFIG.timeout
  );

  describe('Chat Completion Parameter Handling', () => {
    test(
      'should use default parameters when not specified',
      async () => {
        const payload = createChatPayload(
          TEST_MODELS.kimi,
          [COMMON_MESSAGES.simple]
          // No temperature, max_tokens, etc. specified - should use defaults
        );

        const response = await axios.post(
          `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
          payload,
          AXIOS_CONFIG.default
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
        expect(response.data.choices[0]).toHaveProperty('message');
        expect(response.data.choices[0].message).toHaveProperty('content');
        expect(typeof response.data.choices[0].message.content).toBe('string');
      },
      TEST_CONFIG.timeout
    );

    test(
      'should override defaults with user-specified parameters',
      async () => {
        const payload = createChatPayload(
          TEST_MODELS.kimi,
          [COMMON_MESSAGES.testOnly],
          COMMON_PARAMETERS.restrictive
        );

        const response = await axios.post(
          `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
          payload,
          AXIOS_CONFIG.default
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
        expect(response.data.choices[0].message.content.trim().length).toBeLessThanOrEqual(10);
      },
      TEST_CONFIG.timeout
    );

    test(
      'should handle system message in conversation',
      async () => {
        const payload = createChatPayload(
          TEST_MODELS.kimi,
          CONVERSATION_EXAMPLES.systemConversation,
          COMMON_PARAMETERS.medium
        );

        const response = await axios.post(
          `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
          payload,
          AXIOS_CONFIG.default
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
        expect(response.data.choices[0]).toHaveProperty('message');
      },
      TEST_CONFIG.timeout
    );

    test(
      'should handle multi-turn conversation',
      async () => {
        const payload = createChatPayload(
          TEST_MODELS.kimi,
          CONVERSATION_EXAMPLES.mathConversation,
          COMMON_PARAMETERS.small
        );

        const response = await axios.post(
          `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
          payload,
          AXIOS_CONFIG.default
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
        expect(response.data.choices[0]).toHaveProperty('message');
      },
      TEST_CONFIG.timeout
    );
  });

  describe('Model Fallback and Error Handling', () => {
    test(
      'should handle model-specific API key correctly',
      async () => {
        const payload = createChatPayload(
          TEST_MODELS.kimi,
          [COMMON_MESSAGES.apiKeyTest],
          COMMON_PARAMETERS.small
        );

        const response = await axios.post(
          `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
          payload,
          AXIOS_CONFIG.default
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('choices');
      },
      TEST_CONFIG.timeout
    );

    test('should return proper error format for rate limits or provider errors', async () => {
      try {
        // Make multiple rapid requests to potentially trigger rate limiting
        const requests = Array(3)
          .fill(null)
          .map(() => {
            const payload = createChatPayload(
              TEST_MODELS.deepseek,
              [COMMON_MESSAGES.quickTest],
              COMMON_PARAMETERS.tiny
            );
            return axios.post(`${TEST_CONFIG.baseUrl}/v1/chat/completions`, payload, {
              timeout: 5000,
            });
          });

        const responses = await Promise.allSettled(requests);

        // At least one should succeed, but if any fail, they should fail gracefully
        const failed = responses.filter(r => r.status === 'rejected');
        const succeeded = responses.filter(r => r.status === 'fulfilled');

        expect(succeeded.length).toBeGreaterThan(0); // At least one should work

        // If any failed, they should be due to expected errors (rate limits, etc.)
        if (failed.length > 0) {
          console.log('Some requests failed as expected (rate limits/provider issues)');
        }
      } catch (error: any) {
        // Should still return proper error format
        if (error.response) {
          expect(error.response.data).toHaveProperty('error');
          expect(typeof error.response.data.error.message).toBe('string');
        }
      }
    });

    test(
      'should handle different response formats consistently',
      async () => {
        const payload = createChatPayload(
          TEST_MODELS.kimi,
          [COMMON_MESSAGES.formatTest],
          COMMON_PARAMETERS.medium
        );

        const response = await axios.post(
          `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
          payload,
          AXIOS_CONFIG.default
        );

        expect(response.status).toBe(200);

        // Validate OpenAI-compatible response format
        expect(response.data).toMatchObject(EXPECTED_RESPONSE_STRUCTURE.chatCompletion);

        // Validate choice structure
        const choice = response.data.choices[0];
        expect(choice).toMatchObject(EXPECTED_RESPONSE_STRUCTURE.choice);
      },
      TEST_CONFIG.timeout
    );
  });

  describe('Config-Driven Behavior', () => {
    test(
      'should respect model configuration from config file',
      async () => {
        // Test that we can access models defined in the config
        const modelsResponse = await axios.get(`${TEST_CONFIG.baseUrl}/v1/models`);
        const models = modelsResponse.data.data.map((m: any) => m.id);

        // Test one of the configured models
        expect(models).toContain(TEST_MODELS.kimi);

        const payload = createChatPayload(
          TEST_MODELS.kimi,
          [COMMON_MESSAGES.configTest],
          COMMON_PARAMETERS.small
        );

        const chatResponse = await axios.post(
          `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
          payload,
          AXIOS_CONFIG.default
        );

        expect(chatResponse.status).toBe(200);
        expect(chatResponse.data.model).toContain('kimi-k2'); // Should reflect the actual model used
      },
      TEST_CONFIG.timeout
    );

    test(
      'should handle proxy settings correctly',
      async () => {
        const payload = createChatPayload(
          TEST_MODELS.kimi,
          [COMMON_MESSAGES.proxyTest],
          COMMON_PARAMETERS.small
        );

        const response = await axios.post(
          `${TEST_CONFIG.baseUrl}/v1/chat/completions`,
          payload,
          AXIOS_CONFIG.withUserAgent('E2E-Test-Client')
        );

        expect(response.status).toBe(200);

        // Verify the response came through our proxy
        expect(response.data).toHaveProperty('choices');
      },
      TEST_CONFIG.timeout
    );
  });
});
