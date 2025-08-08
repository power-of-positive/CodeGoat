import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer test-token',
    'x-custom-header': 'test-value',
  },
  query: {
    param1: 'value1',
    param2: 'value2',
  },
  body: { test: 'data' },
  method: 'POST',
  path: '/test',
  ...overrides,
});

export const createMockResponse = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis() as jest.MockedFunction<Response['status']>,
  json: jest.fn() as jest.MockedFunction<Response['json']>,
  set: jest.fn() as jest.MockedFunction<Response['set']>,
  setHeader: jest.fn() as jest.MockedFunction<Response['setHeader']>,
  write: jest.fn() as unknown as jest.MockedFunction<Response['write']>,
  end: jest.fn() as unknown as jest.MockedFunction<Response['end']>,
  send: jest.fn() as jest.MockedFunction<Response['send']>,
  pipe: jest.fn() as jest.MockedFunction<Response['pipe']>,
  headersSent: false,
});

export const createMockNext = (): NextFunction => jest.fn();
