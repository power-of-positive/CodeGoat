/**
 * Jest to Vitest Compatibility Shims
 * 
 * Provides compatibility layer for migrating from Jest to Vitest
 * while maintaining existing test functionality.
 */

import { vi } from 'vitest';

// Global Jest compatibility shims
declare global {
  var jest: typeof mockJest;
}

/**
 * Jest compatibility object for Vitest environment
 */
const mockJest = {
  fn: vi.fn,
  spyOn: vi.spyOn,
  mock: vi.mock,
  unmock: vi.unmock,
  mocked: vi.mocked,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  
  // Timer mocks
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  setSystemTime: vi.setSystemTime,
  getRealSystemTime: vi.getRealSystemTime,
  
  // Advanced mocking
  doMock: vi.doMock,
  doUnmock: vi.doUnmock,
  
  // Module mocking compatibility
  createMockFromModule: <T = any>(moduleName: string): T => {
    // Vitest equivalent of jest.createMockFromModule
    return vi.importMock(moduleName) as T;
  },
  
  // Mock implementation helpers
  MockedFunction: vi.MockedFunction,
  MockedClass: vi.MockedClass,
  MockedObject: vi.MockedObject,
};

/**
 * Vitest-compatible expect extensions for Jest migrations
 */
export const expectExtensions = {
  // Common Jest matchers that might need shimming
  toHaveBeenCalledTimes: (received: any, expected: number) => {
    return expect(received).toHaveBeenCalledTimes(expected);
  },
  
  toHaveBeenCalledWith: (received: any, ...expected: any[]) => {
    return expect(received).toHaveBeenCalledWith(...expected);
  },
  
  toHaveBeenLastCalledWith: (received: any, ...expected: any[]) => {
    return expect(received).toHaveBeenLastCalledWith(...expected);
  },
  
  toHaveReturnedWith: (received: any, expected: any) => {
    return expect(received).toHaveReturnedWith(expected);
  },
};

/**
 * Setup Jest compatibility in Vitest environment
 */
export function setupJestCompatibility() {
  // Only setup if jest is not already defined and we're in a test environment
  if (typeof global.jest === 'undefined' && process.env.NODE_ENV === 'test') {
    global.jest = mockJest;
    
    // Additional global compatibility
    if (typeof global.beforeAll === 'undefined') {
      global.beforeAll = beforeAll;
    }
    if (typeof global.afterAll === 'undefined') {
      global.afterAll = afterAll;
    }
    if (typeof global.beforeEach === 'undefined') {
      global.beforeEach = beforeEach;
    }
    if (typeof global.afterEach === 'undefined') {
      global.afterEach = afterEach;
    }
    if (typeof global.describe === 'undefined') {
      global.describe = describe;
    }
    if (typeof global.it === 'undefined') {
      global.it = it;
    }
    if (typeof global.test === 'undefined') {
      global.test = test;
    }
    if (typeof global.expect === 'undefined') {
      global.expect = expect;
    }
  }
}

/**
 * Mock factory functions commonly used in Jest tests
 */
export const mockFactories = {
  /**
   * Create a mock Express Request object
   */
  mockRequest: (overrides: Partial<any> = {}): any => ({
    params: {},
    query: {},
    body: {},
    headers: {},
    method: 'GET',
    path: '/',
    ...overrides,
  }),

  /**
   * Create a mock Express Response object
   */
  mockResponse: (): any => {
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
    };
    return res;
  },

  /**
   * Create a mock logger object
   */
  mockLogger: (): any => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  }),

  /**
   * Create a mock database connection
   */
  mockDatabase: (): any => ({
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
    })),
    close: vi.fn(),
    exec: vi.fn(),
  }),
};

/**
 * Common test utilities for migration
 */
export const testUtils = {
  /**
   * Wait for a promise to resolve (useful for async testing)
   */
  waitFor: async (fn: () => any, timeout: number = 5000): Promise<any> => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        return await fn();
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    throw new Error(`waitFor timed out after ${timeout}ms`);
  },

  /**
   * Create a promise that resolves after specified delay
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generate test data with optional overrides
   */
  generateTestData: <T>(template: T, overrides: Partial<T> = {}): T => ({
    ...template,
    ...overrides,
  }),
};

/**
 * Module path resolution helpers for cross-platform compatibility
 */
export const pathUtils = {
  /**
   * Normalize path separators for consistent testing across platforms
   */
  normalizePath: (path: string): string => {
    return path.replace(/\\/g, '/');
  },

  /**
   * Join paths in a test-safe manner
   */
  joinPath: (...parts: string[]): string => {
    return parts.join('/').replace(/\/+/g, '/');
  },
};

// Auto-setup compatibility when this module is imported
setupJestCompatibility();