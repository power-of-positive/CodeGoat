import { jest } from '@jest/globals';

interface MockHeaders {
  'content-type': string;
  [key: string]: string;
}

interface MockResponse<T = unknown> {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
  text: () => Promise<string>;
  headers: MockHeaders;
}

export const createMockFetch = (): jest.MockedFunction<typeof fetch> => {
  return global.fetch as jest.MockedFunction<typeof fetch>;
};

export const createMockFetchResponse = <T = unknown>(
  data: T,
  options: { ok?: boolean; status?: number } = {}
): Promise<MockResponse<T>> => {
  const { ok = true, status = 200 } = options;

  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: {
      'content-type': 'application/json',
    },
  });
};

export const createMockFetchError = (message = 'Network error'): Promise<never> => {
  return Promise.reject(new Error(message));
};
