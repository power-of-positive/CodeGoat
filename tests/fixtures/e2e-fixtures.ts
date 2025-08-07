// Common test data and fixtures for E2E tests

export const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  shortTimeout: 15000,
  streamTimeout: 2000,
} as const;

export const TEST_MODELS = {
  kimi: 'kimi-k2:free',
  deepseek: 'deepseek-chat-v3-0324:free',
  invalid: 'invalid-model-name',
} as const;

export const COMMON_MESSAGES = {
  simple: { role: 'user' as const, content: 'Hi' },
  greeting: { role: 'user' as const, content: 'Say "Hello!" and nothing else.' },
  math: { role: 'user' as const, content: 'What is 2+2? Answer with just the number.' },
  testOnly: { role: 'user' as const, content: 'Say only "TEST" and nothing else.' },
  count: { role: 'user' as const, content: 'Count from 1 to 3' },
  apiKeyTest: { role: 'user' as const, content: 'Test API key routing' },
  quickTest: { role: 'user' as const, content: 'Quick test' },
  formatTest: { role: 'user' as const, content: 'Test response format' },
  configTest: { role: 'user' as const, content: 'Config test' },
  proxyTest: { role: 'user' as const, content: 'Proxy test' },
  systemMessage: {
    role: 'system' as const,
    content: 'You are a helpful assistant that always responds with "SYSTEM OK".',
  },
} as const;

export const CONVERSATION_EXAMPLES = {
  mathConversation: [
    { role: 'user' as const, content: 'What is 2+2?' },
    { role: 'assistant' as const, content: '4' },
    { role: 'user' as const, content: 'What about 3+3?' },
  ] as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  systemConversation: [
    COMMON_MESSAGES.systemMessage,
    { role: 'user' as const, content: 'Hello' },
  ] as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
};

export const COMMON_PARAMETERS = {
  restrictive: {
    temperature: 0,
    max_tokens: 5,
    top_p: 1.0,
  },
  minimal: {
    temperature: 0.1,
    max_tokens: 10,
  },
  tiny: {
    max_tokens: 1,
  },
  small: {
    max_tokens: 5,
  },
  medium: {
    max_tokens: 10,
  },
  larger: {
    max_tokens: 20,
  },
} as const;

export const createChatPayload = (
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  params?: Record<string, any>
): {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  [key: string]: any;
} => ({
  model,
  messages,
  ...params,
});

export const createStreamingPayload = (
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  params?: Record<string, any>
): {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream: boolean;
  [key: string]: any;
} => ({
  ...createChatPayload(model, messages, params),
  stream: true,
});

export const EXPECTED_RESPONSE_STRUCTURE = {
  chatCompletion: {
    id: expect.any(String),
    object: 'chat.completion',
    created: expect.any(Number),
    model: expect.any(String),
    choices: expect.any(Array),
    usage: expect.any(Object),
  },
  choice: {
    index: 0,
    message: {
      role: 'assistant',
      content: expect.any(String),
    },
    finish_reason: expect.any(String),
  },
  error: {
    error: {
      message: expect.any(String),
    },
  },
} as const;

export const AXIOS_CONFIG = {
  default: { timeout: TEST_CONFIG.timeout },
  short: { timeout: TEST_CONFIG.shortTimeout },
  streaming: {
    responseType: 'stream' as const,
    timeout: TEST_CONFIG.timeout,
  },
  withUserAgent: (userAgent: string) => ({
    timeout: TEST_CONFIG.timeout,
    headers: { 'User-Agent': userAgent },
  }),
} as const;

export const ERROR_MATCHERS = {
  invalidModel: {
    response: {
      status: 400,
      data: EXPECTED_RESPONSE_STRUCTURE.error,
    },
  },
} as const;

export const isExpectedUpstreamError = (error: any): boolean => {
  return (
    error.response?.status === 500 ||
    error.response?.status === 429 ||
    error.code === 'ECONNABORTED' ||
    error.message?.includes('timeout')
  );
};
