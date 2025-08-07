// Global test setup
import { config } from 'dotenv';

// Load test environment variables quietly
try {
  config({ path: '.env.test' });
} catch {
  // Ignore if .env.test doesn't exist
}

// Mock console methods in tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset console mocks before each test
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods after each test
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global timeout for async operations
jest.setTimeout(30000);
