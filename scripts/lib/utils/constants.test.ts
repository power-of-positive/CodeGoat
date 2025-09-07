/**
 * Tests for constants.ts
 */

import {
  MAX_FILE_LINES,
  MAX_FUNCTION_LINES,
  REVIEW_FILE_NAME,
  getMaxLinesConfig,
} from './constants';

describe('constants', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('MAX_FILE_LINES', () => {
    it('should use default value when environment variable is not set', () => {
      delete process.env.MAX_FILE_LINES;

      // Re-import to get fresh values
      jest.isolateModules(() => {
        const { MAX_FILE_LINES } = require('./constants');
        expect(MAX_FILE_LINES).toBe(150);
      });
    });

    it('should use environment variable when set', () => {
      process.env.MAX_FILE_LINES = '200';

      jest.isolateModules(() => {
        const { MAX_FILE_LINES } = require('./constants');
        expect(MAX_FILE_LINES).toBe(200);
      });
    });
  });

  describe('MAX_FUNCTION_LINES', () => {
    it('should use default value when environment variable is not set', () => {
      delete process.env.MAX_FUNCTION_LINES;

      jest.isolateModules(() => {
        const { MAX_FUNCTION_LINES } = require('./constants');
        expect(MAX_FUNCTION_LINES).toBe(33);
      });
    });

    it('should use environment variable when set', () => {
      process.env.MAX_FUNCTION_LINES = '50';

      jest.isolateModules(() => {
        const { MAX_FUNCTION_LINES } = require('./constants');
        expect(MAX_FUNCTION_LINES).toBe(50);
      });
    });
  });

  describe('REVIEW_FILE_NAME', () => {
    it('should use default value when environment variable is not set', () => {
      delete process.env.CODE_REVIEW_FILE_NAME;

      jest.isolateModules(() => {
        const { REVIEW_FILE_NAME } = require('./constants');
        expect(REVIEW_FILE_NAME).toBe('code-review-comments.tmp');
      });
    });

    it('should use environment variable when set', () => {
      process.env.CODE_REVIEW_FILE_NAME = 'custom-review.md';

      jest.isolateModules(() => {
        const { REVIEW_FILE_NAME } = require('./constants');
        expect(REVIEW_FILE_NAME).toBe('custom-review.md');
      });
    });
  });

  describe('getMaxLinesConfig', () => {
    it('should return configuration object with current values', () => {
      const config = getMaxLinesConfig();

      expect(config).toEqual({
        maxFileLines: MAX_FILE_LINES,
        maxFunctionLines: MAX_FUNCTION_LINES,
      });
    });

    it('should return configuration with environment variable values', () => {
      process.env.MAX_FILE_LINES = '300';
      process.env.MAX_FUNCTION_LINES = '75';

      jest.isolateModules(() => {
        const { getMaxLinesConfig } = require('./constants');
        const config = getMaxLinesConfig();

        expect(config.maxFileLines).toBe(300);
        expect(config.maxFunctionLines).toBe(75);
      });
    });
  });
});
