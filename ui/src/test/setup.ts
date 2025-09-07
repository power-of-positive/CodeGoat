// Jest setup for frontend tests
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { cleanup } from '@testing-library/react';

// Import Jest globals
import { afterEach } from '@jest/globals';

// Constants
const TEST_TIMEOUT_MS = 10000; // 10 seconds

// Polyfill TextEncoder/TextDecoder for React Router
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock ResizeObserver for react-use-measure
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for react-use-measure
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Increase test timeout for potentially slow tests
jest.setTimeout(TEST_TIMEOUT_MS);

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Clear all timers (but don't override timer configuration)
  jest.clearAllTimers();
  // Clear all mocks
  jest.clearAllMocks();
});
