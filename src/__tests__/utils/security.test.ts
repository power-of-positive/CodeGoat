import { maskApiKey, maskSensitiveData } from '../../utils/security';

describe('Security Utils', () => {
  describe('maskApiKey', () => {
    it('should mask a provided API key', () => {
      const result = maskApiKey('sk-1234567890abcdef');
      expect(result).toBe('***');
    });

    it('should mask an empty string API key', () => {
      const result = maskApiKey('');
      expect(result).toBe('');
    });

    it('should return empty string for undefined API key', () => {
      const result = maskApiKey(undefined);
      expect(result).toBe('');
    });

    it('should mask any non-empty API key regardless of length', () => {
      expect(maskApiKey('a')).toBe('***');
      expect(maskApiKey('short')).toBe('***');
      expect(maskApiKey('very-long-api-key-with-many-characters')).toBe('***');
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask specified fields in an object', () => {
      const obj = {
        apiKey: 'sk-1234567890',
        password: 'secret123',
        email: 'user@example.com',
        name: 'John Doe',
      };

      const result = maskSensitiveData(obj, ['apiKey', 'password']);

      expect(result).toEqual({
        apiKey: '***',
        password: '***',
        email: 'user@example.com',
        name: 'John Doe',
      });
    });

    it('should not modify the original object', () => {
      const obj = {
        apiKey: 'sk-1234567890',
        password: 'secret123',
        name: 'John Doe',
      };

      const originalCopy = { ...obj };
      const result = maskSensitiveData(obj, ['apiKey']);

      expect(obj).toEqual(originalCopy);
      expect(result).not.toBe(obj); // Should be a different object reference
    });

    it('should handle empty fields array', () => {
      const obj = {
        apiKey: 'sk-1234567890',
        password: 'secret123',
      };

      const result = maskSensitiveData(obj, []);

      expect(result).toEqual(obj);
    });

    it('should handle non-existent fields', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = maskSensitiveData(obj, ['apiKey', 'password'] as any);

      expect(result).toEqual(obj);
    });

    it('should handle fields with falsy values', () => {
      const obj = {
        apiKey: '',
        password: null as any,
        token: undefined as any,
        count: 0,
        active: false,
      };

      const result = maskSensitiveData(obj, ['apiKey', 'password', 'token', 'count', 'active']);

      expect(result).toEqual({
        apiKey: '',
        password: null,
        token: undefined,
        count: 0,
        active: false,
      });
    });

    it('should handle fields with truthy non-string values', () => {
      const obj = {
        apiKey: 'sk-1234567890',
        count: 42,
        active: true,
        data: { nested: 'value' },
        array: [1, 2, 3],
      };

      const result = maskSensitiveData(obj, ['apiKey', 'count', 'active', 'data', 'array']);

      expect(result).toEqual({
        apiKey: '***',
        count: '***',
        active: '***',
        data: '***',
        array: '***',
      });
    });

    it('should work with complex nested objects', () => {
      const obj = {
        user: {
          id: 1,
          name: 'John',
        },
        config: {
          apiKey: 'secret-key',
          timeout: 5000,
        },
        metadata: {
          version: '1.0.0',
        },
      };

      const result = maskSensitiveData(obj, ['config']);

      expect(result).toEqual({
        user: {
          id: 1,
          name: 'John',
        },
        config: '***',
        metadata: {
          version: '1.0.0',
        },
      });
    });

    it('should preserve type safety', () => {
      const obj = {
        apiKey: 'sk-123',
        name: 'test',
        count: 5,
      };

      const result = maskSensitiveData(obj, ['apiKey']);

      // TypeScript should recognize this as the same type
      expect(typeof result.name).toBe('string');
      expect(typeof result.count).toBe('number');
      expect(result.apiKey).toBe('***');
    });

    it('should handle objects with symbol keys', () => {
      const symbolKey = Symbol('secret');
      const obj = {
        name: 'John',
        [symbolKey]: 'secret-value',
      };

      const result = maskSensitiveData(obj, ['name']);

      expect(result).toEqual({
        name: '***',
        [symbolKey]: 'secret-value',
      });
    });
  });
});
