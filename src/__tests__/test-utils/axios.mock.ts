import { jest } from '@jest/globals';
import axios from 'axios';

interface MockAxiosResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

interface MockAxiosError {
  isAxiosError: true;
  response?: {
    status: number;
    data: { message: string };
  };
  message: string;
}

// Common axios mock setup
export const createMockAxios = (): {
  mockAxios: jest.MockedFunction<typeof axios>;
  mockIsAxiosError: jest.MockedFunction<(payload: unknown) => boolean>;
} => {
  const mockAxios = axios as jest.MockedFunction<typeof axios>;
  const mockIsAxiosError = jest.fn<(payload: unknown) => boolean>();
  (
    mockAxios as { isAxiosError?: jest.MockedFunction<(payload: unknown) => boolean> }
  ).isAxiosError = mockIsAxiosError;

  return { mockAxios, mockIsAxiosError };
};

// Common axios response
export const createMockAxiosResponse = <T = { result: string }>(
  data: T = { result: 'success' } as T,
  status = 200
): MockAxiosResponse<T> => ({
  status,
  headers: {
    'content-type': 'application/json',
    'x-response-header': 'response-value',
  },
  data,
});

// Common axios error
export const createMockAxiosError = (
  message = 'Network timeout',
  hasResponse = false
): MockAxiosError => {
  if (hasResponse) {
    return {
      isAxiosError: true,
      response: {
        status: 404,
        data: { message: 'Not found' },
      },
      message: 'Request failed with status code 404',
    };
  }

  return {
    isAxiosError: true,
    response: undefined,
    message,
  };
};
