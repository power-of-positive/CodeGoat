import { MAX_FILE_LINES, MAX_FUNCTION_LINES, getMaxLinesConfig } from './constants';

describe('constants', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('MAX_FILE_LINES', () => {
    it('should use default value when MAX_FILE_LINES env var is not set', () => {
      delete process.env.MAX_FILE_LINES;
      // Re-import to get the updated value
      jest.resetModules();
      const { MAX_FILE_LINES: actualMaxFileLines } = require('./constants');
      expect(actualMaxFileLines).toBe(150);
    });

    it('should use environment variable when MAX_FILE_LINES is set', () => {
      process.env.MAX_FILE_LINES = '200';
      jest.resetModules();
      const { MAX_FILE_LINES: actualMaxFileLines } = require('./constants');
      expect(actualMaxFileLines).toBe(200);
    });

    it('should handle invalid environment variable gracefully', () => {
      process.env.MAX_FILE_LINES = 'invalid';
      jest.resetModules();
      const { MAX_FILE_LINES: actualMaxFileLines } = require('./constants');
      expect(actualMaxFileLines).toBeNaN();
    });
  });

  describe('MAX_FUNCTION_LINES', () => {
    it('should use default value when MAX_FUNCTION_LINES env var is not set', () => {
      delete process.env.MAX_FUNCTION_LINES;
      jest.resetModules();
      const { MAX_FUNCTION_LINES: actualMaxFunctionLines } = require('./constants');
      expect(actualMaxFunctionLines).toBe(33);
    });

    it('should use environment variable when MAX_FUNCTION_LINES is set', () => {
      process.env.MAX_FUNCTION_LINES = '50';
      jest.resetModules();
      const { MAX_FUNCTION_LINES: actualMaxFunctionLines } = require('./constants');
      expect(actualMaxFunctionLines).toBe(50);
    });

    it('should handle zero value', () => {
      process.env.MAX_FUNCTION_LINES = '0';
      jest.resetModules();
      const { MAX_FUNCTION_LINES: actualMaxFunctionLines } = require('./constants');
      expect(actualMaxFunctionLines).toBe(0);
    });
  });

  describe('getMaxLinesConfig', () => {
    it('should return configuration object with current values', () => {
      const config = getMaxLinesConfig();
      
      expect(config).toEqual({
        maxFileLines: expect.any(Number),
        maxFunctionLines: expect.any(Number)
      });
    });

    it('should return current MAX_FILE_LINES and MAX_FUNCTION_LINES values', () => {
      const config = getMaxLinesConfig();
      
      expect(config.maxFileLines).toBe(MAX_FILE_LINES);
      expect(config.maxFunctionLines).toBe(MAX_FUNCTION_LINES);
    });

    it('should reflect environment variable changes', () => {
      process.env.MAX_FILE_LINES = '300';
      process.env.MAX_FUNCTION_LINES = '100';
      jest.resetModules();
      
      const { getMaxLinesConfig: getConfig } = require('./constants');
      const config = getConfig();
      
      expect(config.maxFileLines).toBe(300);
      expect(config.maxFunctionLines).toBe(100);
    });
  });
});