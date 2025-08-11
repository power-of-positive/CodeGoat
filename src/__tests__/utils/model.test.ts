import {
  extractModelName,
  getProviderFromModel,
  getTargetUrl,
  getApiKey,
  buildProxyHeaders,
} from '../../utils/model';

describe('Model Utils', () => {
  describe('extractModelName', () => {
    it('should extract model name from provider/model format', () => {
      expect(extractModelName('openai/gpt-4')).toBe('gpt-4');
      expect(extractModelName('anthropic/claude-3-opus')).toBe('claude-3-opus');
      expect(extractModelName('openrouter/anthropic/claude-3-sonnet')).toBe('claude-3-sonnet');
    });

    it('should return original name if no slash present', () => {
      expect(extractModelName('gpt-4')).toBe('gpt-4');
      expect(extractModelName('claude-3-opus')).toBe('claude-3-opus');
      expect(extractModelName('text-davinci-003')).toBe('text-davinci-003');
    });

    it('should handle multiple slashes by taking the last segment', () => {
      expect(extractModelName('openrouter/anthropic/claude-3-opus')).toBe('claude-3-opus');
      expect(extractModelName('provider/org/model-name')).toBe('model-name');
      expect(extractModelName('a/b/c/d/final-model')).toBe('final-model');
    });

    it('should return original model if split results in empty string', () => {
      expect(extractModelName('model/')).toBe('model/');
      expect(extractModelName('/')).toBe('/');
    });

    it('should handle empty string', () => {
      expect(extractModelName('')).toBe('');
    });

    it('should handle special characters in model names', () => {
      expect(extractModelName('provider/model-name_v2.1')).toBe('model-name_v2.1');
      expect(extractModelName('org/model@latest')).toBe('model@latest');
      expect(extractModelName('provider/model.fine-tuned')).toBe('model.fine-tuned');
    });
  });

  describe('getProviderFromModel', () => {
    it('should identify Anthropic provider', () => {
      expect(getProviderFromModel('anthropic/claude-3-opus')).toBe('Anthropic');
      expect(getProviderFromModel('anthropic/claude-3-sonnet')).toBe('Anthropic');
      expect(getProviderFromModel('anthropic/claude-2')).toBe('Anthropic');
    });

    it('should identify OpenRouter provider', () => {
      expect(getProviderFromModel('openrouter/anthropic/claude-3-opus')).toBe('OpenRouter');
      expect(getProviderFromModel('openrouter/openai/gpt-4')).toBe('OpenRouter');
      expect(getProviderFromModel('openrouter/meta-llama/llama-2-70b-chat')).toBe('OpenRouter');
    });

    it('should identify OpenAI provider for openai/ prefix', () => {
      expect(getProviderFromModel('openai/gpt-4')).toBe('OpenAI');
      expect(getProviderFromModel('openai/gpt-3.5-turbo')).toBe('OpenAI');
      expect(getProviderFromModel('openai/text-davinci-003')).toBe('OpenAI');
    });

    it('should default to OpenAI for models without provider prefix', () => {
      expect(getProviderFromModel('gpt-4')).toBe('OpenAI');
      expect(getProviderFromModel('gpt-3.5-turbo')).toBe('OpenAI');
      expect(getProviderFromModel('text-davinci-003')).toBe('OpenAI');
    });

    it('should return Unknown for unrecognized providers', () => {
      expect(getProviderFromModel('google/gemini-pro')).toBe('Unknown');
      expect(getProviderFromModel('cohere/command')).toBe('Unknown');
      expect(getProviderFromModel('custom-provider/model')).toBe('Unknown');
    });

    it('should handle edge cases', () => {
      expect(getProviderFromModel('')).toBe('OpenAI');
      expect(getProviderFromModel('/')).toBe('Unknown');
      expect(getProviderFromModel('anthropic/')).toBe('Anthropic');
      expect(getProviderFromModel('openrouter/')).toBe('OpenRouter');
    });

    it('should be case sensitive', () => {
      expect(getProviderFromModel('ANTHROPIC/claude')).toBe('Unknown');
      expect(getProviderFromModel('Anthropic/claude')).toBe('Unknown');
      expect(getProviderFromModel('OPENROUTER/model')).toBe('Unknown');
    });
  });

  describe('getTargetUrl', () => {
    it('should return Anthropic URL for anthropic/ models', () => {
      const expected = 'https://api.anthropic.com/v1/messages';
      expect(getTargetUrl('anthropic/claude-3-opus')).toBe(expected);
      expect(getTargetUrl('anthropic/claude-3-sonnet')).toBe(expected);
      expect(getTargetUrl('anthropic/claude-2')).toBe(expected);
    });

    it('should return OpenRouter URL for openrouter/ models', () => {
      const expected = 'https://openrouter.ai/api/v1/chat/completions';
      expect(getTargetUrl('openrouter/anthropic/claude-3-opus')).toBe(expected);
      expect(getTargetUrl('openrouter/openai/gpt-4')).toBe(expected);
      expect(getTargetUrl('openrouter/meta-llama/llama-2-70b')).toBe(expected);
    });

    it('should return OpenAI URL for openai/ models', () => {
      const expected = 'https://api.openai.com/v1/chat/completions';
      expect(getTargetUrl('openai/gpt-4')).toBe(expected);
      expect(getTargetUrl('openai/gpt-3.5-turbo')).toBe(expected);
    });

    it('should default to OpenAI URL for models without provider prefix', () => {
      const expected = 'https://api.openai.com/v1/chat/completions';
      expect(getTargetUrl('gpt-4')).toBe(expected);
      expect(getTargetUrl('gpt-3.5-turbo')).toBe(expected);
      expect(getTargetUrl('text-davinci-003')).toBe(expected);
    });

    it('should default to OpenAI URL for unknown providers', () => {
      const expected = 'https://api.openai.com/v1/chat/completions';
      expect(getTargetUrl('google/gemini-pro')).toBe(expected);
      expect(getTargetUrl('cohere/command')).toBe(expected);
      expect(getTargetUrl('unknown/model')).toBe(expected);
    });

    it('should handle edge cases', () => {
      const expected = 'https://api.openai.com/v1/chat/completions';
      expect(getTargetUrl('')).toBe(expected);
      expect(getTargetUrl('/')).toBe(expected);
    });
  });

  describe('getApiKey', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should extract API key from environment variable', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-12345';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api-key';

      expect(getApiKey('os.environ/OPENAI_API_KEY')).toBe('sk-test-key-12345');
      expect(getApiKey('os.environ/ANTHROPIC_API_KEY')).toBe('sk-ant-api-key');
    });

    it('should return null for non-existent environment variables', () => {
      expect(getApiKey('os.environ/NON_EXISTENT_KEY')).toBeNull();
      expect(getApiKey('os.environ/MISSING_API_KEY')).toBeNull();
    });

    it('should return the key itself if not environment variable format', () => {
      expect(getApiKey('sk-direct-key-12345')).toBe('sk-direct-key-12345');
      expect(getApiKey('direct-api-key')).toBe('direct-api-key');
      expect(getApiKey('api-key-value')).toBe('api-key-value');
    });

    it('should handle empty strings', () => {
      expect(getApiKey('')).toBeNull();
      expect(getApiKey('os.environ/')).toBeNull();
    });

    it('should handle environment variables with empty values', () => {
      process.env.EMPTY_KEY = '';
      expect(getApiKey('os.environ/EMPTY_KEY')).toBeNull();
    });

    it('should handle environment variables with undefined values', () => {
      delete process.env.UNDEFINED_KEY;
      expect(getApiKey('os.environ/UNDEFINED_KEY')).toBeNull();
    });

    it('should be case sensitive for environment variable names', () => {
      process.env.API_KEY = 'correct-key';
      expect(getApiKey('os.environ/API_KEY')).toBe('correct-key');
      expect(getApiKey('os.environ/api_key')).toBeNull();
      expect(getApiKey('os.environ/Api_Key')).toBeNull();
    });

    it('should handle special characters in environment variable names', () => {
      process.env['API-KEY-123'] = 'special-key';
      process.env['API_KEY_V2'] = 'underscore-key';

      expect(getApiKey('os.environ/API-KEY-123')).toBe('special-key');
      expect(getApiKey('os.environ/API_KEY_V2')).toBe('underscore-key');
    });
  });

  describe('buildProxyHeaders', () => {
    it('should build headers for OpenRouter models', () => {
      const model = 'openrouter/anthropic/claude-3-opus';
      const apiKey = 'or-api-key-123';
      const originalHeaders = {
        'x-request-id': 'req-12345',
        'user-agent': 'test-client/1.0',
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://localhost:3000',
        'x-request-id': 'req-12345',
        'user-agent': 'test-client/1.0',
      });
    });

    it('should build headers for Anthropic models', () => {
      const model = 'anthropic/claude-3-opus';
      const apiKey = 'sk-ant-api-key';
      const originalHeaders = {
        'x-request-id': 'req-67890',
        'user-agent': 'anthropic-client/2.0',
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'x-request-id': 'req-67890',
        'user-agent': 'anthropic-client/2.0',
      });
    });

    it('should build headers for OpenAI models (default)', () => {
      const model = 'openai/gpt-4';
      const apiKey = 'sk-openai-key-123';
      const originalHeaders = {
        'x-request-id': 'req-54321',
        'user-agent': 'openai-client/1.0',
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        Authorization: `Bearer ${apiKey}`,
        'x-request-id': 'req-54321',
        'user-agent': 'openai-client/1.0',
      });
    });

    it('should build headers for models without provider prefix (defaults to OpenAI)', () => {
      const model = 'gpt-4';
      const apiKey = 'sk-default-key';
      const originalHeaders = {
        'x-request-id': 'req-default',
        'user-agent': 'default-client/1.0',
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        Authorization: `Bearer ${apiKey}`,
        'x-request-id': 'req-default',
        'user-agent': 'default-client/1.0',
      });
    });

    it('should handle missing headers to forward', () => {
      const model = 'openai/gpt-4';
      const apiKey = 'sk-test-key';
      const originalHeaders = {};

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        Authorization: `Bearer ${apiKey}`,
      });
    });

    it('should handle array headers by taking the first value', () => {
      const model = 'anthropic/claude-3-opus';
      const apiKey = 'sk-test-key';
      const originalHeaders = {
        'x-request-id': ['req-1', 'req-2', 'req-3'],
        'user-agent': ['client-1/1.0', 'client-2/2.0'],
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'x-request-id': 'req-1',
        'user-agent': 'client-1/1.0',
      });
    });

    it('should handle empty array headers', () => {
      const model = 'openai/gpt-4';
      const apiKey = 'sk-test-key';
      const originalHeaders = {
        'x-request-id': [],
        'user-agent': [],
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        Authorization: `Bearer ${apiKey}`,
      });
    });

    it('should handle undefined header values', () => {
      const model = 'openrouter/meta/llama-2';
      const apiKey = 'or-test-key';
      const originalHeaders = {
        'x-request-id': undefined,
        'user-agent': undefined,
        'other-header': 'should-not-forward',
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://localhost:3000',
      });
    });

    it('should be case-insensitive when looking for headers to forward', () => {
      const model = 'anthropic/claude-3-sonnet';
      const apiKey = 'sk-test-key';
      const originalHeaders = {
        'X-REQUEST-ID': 'req-uppercase',
        'USER-AGENT': 'UpperCase-Client/1.0',
        'x-request-id': 'req-lowercase', // This should be ignored due to case handling
        'user-agent': 'lowercase-client/1.0',
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      // Should find the lowercase versions of the headers
      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'x-request-id': 'req-lowercase',
        'user-agent': 'lowercase-client/1.0',
      });
    });

    it('should handle unknown providers by using default OpenAI headers', () => {
      const model = 'google/gemini-pro';
      const apiKey = 'google-api-key';
      const originalHeaders = {
        'x-request-id': 'req-google',
        'user-agent': 'google-client/1.0',
      };

      const result = buildProxyHeaders(model, apiKey, originalHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'proxy-server',
        Authorization: `Bearer ${apiKey}`,
        'x-request-id': 'req-google',
        'user-agent': 'google-client/1.0',
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete model processing pipeline', () => {
      const fullModel = 'openrouter/anthropic/claude-3-opus-20240229';

      // Extract components
      const modelName = extractModelName(fullModel);
      const provider = getProviderFromModel(fullModel);
      const targetUrl = getTargetUrl(fullModel);

      expect(modelName).toBe('claude-3-opus-20240229');
      expect(provider).toBe('OpenRouter');
      expect(targetUrl).toBe('https://openrouter.ai/api/v1/chat/completions');

      // Build headers
      const apiKey = 'or-test-key';
      const originalHeaders = { 'x-request-id': 'req-123' };
      const headers = buildProxyHeaders(fullModel, apiKey, originalHeaders);

      expect(headers).toMatchObject({
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://localhost:3000',
        'x-request-id': 'req-123',
      });
    });

    it('should handle edge case models consistently', () => {
      const edgeModel = '';

      expect(extractModelName(edgeModel)).toBe('');
      expect(getProviderFromModel(edgeModel)).toBe('OpenAI');
      expect(getTargetUrl(edgeModel)).toBe('https://api.openai.com/v1/chat/completions');

      const headers = buildProxyHeaders(edgeModel, 'test-key', {});
      expect(headers).toMatchObject({
        Authorization: 'Bearer test-key',
      });
    });
  });
});
