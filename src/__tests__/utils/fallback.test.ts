import {
  shouldFallbackOnError,
  extractErrorMessage,
  delay,
  FallbackCondition,
} from '../../utils/fallback';

// Mock setTimeout for delay testing
jest.useFakeTimers();

describe('Fallback Utils', () => {
  const defaultConditions: FallbackCondition = {
    enableFallbacks: true,
    fallbackOnServerError: true,
    fallbackOnContextLength: true,
    fallbackOnRateLimit: true,
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('shouldFallbackOnError', () => {
    describe('global fallback control', () => {
      it('should return false when fallbacks are globally disabled', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          enableFallbacks: false,
        };

        expect(shouldFallbackOnError(500, null, conditions)).toBe(false);
        expect(shouldFallbackOnError(429, null, conditions)).toBe(false);
        expect(shouldFallbackOnError(413, null, conditions)).toBe(false);
      });

      it('should proceed with specific checks when fallbacks are enabled', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          enableFallbacks: true,
          fallbackOnServerError: true,
        };

        expect(shouldFallbackOnError(500, null, conditions)).toBe(true);
      });
    });

    describe('server error handling', () => {
      it('should fallback on 500+ status codes when server error fallbacks are enabled', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnServerError: true,
        };

        expect(shouldFallbackOnError(500, null, conditions)).toBe(true);
        expect(shouldFallbackOnError(502, null, conditions)).toBe(true);
        expect(shouldFallbackOnError(503, null, conditions)).toBe(true);
        expect(shouldFallbackOnError(504, null, conditions)).toBe(true);
        expect(shouldFallbackOnError(599, null, conditions)).toBe(true);
      });

      it('should fallback on 413 (Payload Too Large) when server error fallbacks are enabled', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnServerError: true,
        };

        expect(shouldFallbackOnError(413, null, conditions)).toBe(true);
      });

      it('should not fallback on server errors when server error fallbacks are disabled', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnServerError: false,
        };

        expect(shouldFallbackOnError(500, null, conditions)).toBe(false);
        expect(shouldFallbackOnError(502, null, conditions)).toBe(false);
        expect(shouldFallbackOnError(413, null, conditions)).toBe(false);
      });
    });

    describe('context length error handling', () => {
      it('should not fallback on 400 errors when context length fallbacks are disabled', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnContextLength: false,
        };

        const responseData = {
          error: { message: 'Context length exceeded' },
        };

        expect(shouldFallbackOnError(400, responseData, conditions)).toBe(false);
      });

      it('should fallback on context length errors with various message formats', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnContextLength: true,
        };

        const testCases = [
          'Context length exceeded',
          'Maximum context length reached',
          'Token limit exceeded',
          'Too many tokens in request',
          'Input exceeds maximum allowed length',
          'Context window is full',
          'Input too long for this model',
          'Message too long',
          'Prompt too long',
        ];

        testCases.forEach(message => {
          const responseData = {
            error: { message },
          };
          expect(shouldFallbackOnError(400, responseData, conditions)).toBe(true);
        });
      });

      it('should handle case-insensitive context length error messages', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnContextLength: true,
        };

        const testCases = [
          'CONTEXT LENGTH EXCEEDED',
          'Context Length Exceeded',
          'context length exceeded',
          'TOKEN LIMIT EXCEEDED',
          'Token Limit Exceeded',
        ];

        testCases.forEach(message => {
          const responseData = {
            error: { message },
          };
          expect(shouldFallbackOnError(400, responseData, conditions)).toBe(true);
        });
      });

      it('should not fallback on 400 errors without context length trigger words', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnContextLength: true,
        };

        const responseData = {
          error: { message: 'Invalid request format' },
        };

        expect(shouldFallbackOnError(400, responseData, conditions)).toBe(false);
      });

      it('should not fallback on 400 errors without proper response structure', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnContextLength: true,
        };

        expect(shouldFallbackOnError(400, null, conditions)).toBe(false);
        expect(shouldFallbackOnError(400, 'string response', conditions)).toBe(false);
        expect(shouldFallbackOnError(400, { message: 'Context length exceeded' }, conditions)).toBe(
          false
        );
      });

      it('should handle nested error structures', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnContextLength: true,
        };

        const responseData = {
          error: {
            message: 'Request failed due to context length limitations',
          },
        };

        expect(shouldFallbackOnError(400, responseData, conditions)).toBe(true);
      });

      it('should handle missing error message gracefully', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnContextLength: true,
        };

        const responseData = {
          error: {},
        };

        expect(shouldFallbackOnError(400, responseData, conditions)).toBe(false);
      });
    });

    describe('rate limit handling', () => {
      it('should fallback on 429 status when rate limit fallbacks are enabled', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnRateLimit: true,
        };

        expect(shouldFallbackOnError(429, null, conditions)).toBe(true);
        expect(
          shouldFallbackOnError(429, { error: { message: 'Rate limit exceeded' } }, conditions)
        ).toBe(true);
      });

      it('should not fallback on 429 status when rate limit fallbacks are disabled', () => {
        const conditions: FallbackCondition = {
          ...defaultConditions,
          fallbackOnRateLimit: false,
        };

        expect(shouldFallbackOnError(429, null, conditions)).toBe(false);
      });
    });

    describe('other status codes', () => {
      it('should not fallback on success status codes', () => {
        expect(shouldFallbackOnError(200, null, defaultConditions)).toBe(false);
        expect(shouldFallbackOnError(201, null, defaultConditions)).toBe(false);
        expect(shouldFallbackOnError(204, null, defaultConditions)).toBe(false);
      });

      it('should not fallback on client error codes (except 413, 400, 429)', () => {
        expect(shouldFallbackOnError(401, null, defaultConditions)).toBe(false);
        expect(shouldFallbackOnError(403, null, defaultConditions)).toBe(false);
        expect(shouldFallbackOnError(404, null, defaultConditions)).toBe(false);
        expect(shouldFallbackOnError(422, null, defaultConditions)).toBe(false);
      });
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from properly structured error object', () => {
      const responseData = {
        error: {
          message: 'This is an error message',
        },
      };

      expect(extractErrorMessage(responseData)).toBe('This is an error message');
    });

    it('should extract type when message is not available', () => {
      const responseData = {
        error: {
          type: 'validation_error',
        },
      };

      expect(extractErrorMessage(responseData)).toBe('Error type: validation_error');
    });

    it('should prefer message over type when both are available', () => {
      const responseData = {
        error: {
          message: 'Detailed error message',
          type: 'generic_error',
        },
      };

      expect(extractErrorMessage(responseData)).toBe('Detailed error message');
    });

    it('should return "Unknown error" for null/undefined input', () => {
      expect(extractErrorMessage(null)).toBe('Unknown error');
      expect(extractErrorMessage(undefined)).toBe('Unknown error');
    });

    it('should return "Unknown error" for non-object input', () => {
      expect(extractErrorMessage('string')).toBe('Unknown error');
      expect(extractErrorMessage(123)).toBe('Unknown error');
      expect(extractErrorMessage(true)).toBe('Unknown error');
    });

    it('should return "Unknown error" for object without error property', () => {
      const responseData = {
        status: 'failed',
        data: null,
      };

      expect(extractErrorMessage(responseData)).toBe('Unknown error');
    });

    it('should return "Unknown error" for empty error object', () => {
      const responseData = {
        error: {},
      };

      expect(extractErrorMessage(responseData)).toBe('Unknown error');
    });

    it('should handle nested error structures', () => {
      const responseData = {
        error: {
          message: 'Context length exceeded for model gpt-4',
          type: 'invalid_request_error',
          param: 'messages',
          code: 'context_length_exceeded',
        },
      };

      expect(extractErrorMessage(responseData)).toBe('Context length exceeded for model gpt-4');
    });

    it('should handle empty strings in error fields', () => {
      const responseDataEmptyMessage = {
        error: {
          message: '',
          type: 'some_error',
        },
      };

      expect(extractErrorMessage(responseDataEmptyMessage)).toBe('Error type: some_error');

      const responseDataEmptyType = {
        error: {
          message: 'Some message',
          type: '',
        },
      };

      expect(extractErrorMessage(responseDataEmptyType)).toBe('Some message');
    });
  });

  describe('delay', () => {
    it('should create a promise that resolves after specified milliseconds', async () => {
      const delayPromise = delay(1000);

      // Fast-forward time
      jest.advanceTimersByTime(999);

      // Promise should still be pending
      let resolved = false;
      delayPromise.then(() => {
        resolved = true;
      });

      await Promise.resolve(); // Allow microtasks to run
      expect(resolved).toBe(false);

      // Complete the delay
      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(resolved).toBe(true);
    });

    it('should work with zero delay', async () => {
      const delayPromise = delay(0);

      jest.advanceTimersByTime(0);

      let resolved = false;
      delayPromise.then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toBe(true);
    });

    it('should work with different delay values', async () => {
      const delays = [100, 500, 2000];

      const promises = delays.map(ms => {
        let resolved = false;
        const promise = delay(ms).then(() => {
          resolved = true;
        });
        return { promise, resolved: () => resolved, delay: ms };
      });

      // Check that none are resolved initially
      await Promise.resolve();
      promises.forEach(p => expect(p.resolved()).toBe(false));

      // Advance to 100ms
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(promises[0].resolved()).toBe(true);
      expect(promises[1].resolved()).toBe(false);
      expect(promises[2].resolved()).toBe(false);

      // Advance to 500ms total
      jest.advanceTimersByTime(400);
      await Promise.resolve();
      expect(promises[0].resolved()).toBe(true);
      expect(promises[1].resolved()).toBe(true);
      expect(promises[2].resolved()).toBe(false);

      // Advance to 2000ms total
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      expect(promises[0].resolved()).toBe(true);
      expect(promises[1].resolved()).toBe(true);
      expect(promises[2].resolved()).toBe(true);
    });
  });
});
