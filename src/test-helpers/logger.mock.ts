import { jest } from '@jest/globals';
import type { ILogger } from '../logger-interface';

export const createMockLogger = (): jest.Mocked<ILogger> => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
});
