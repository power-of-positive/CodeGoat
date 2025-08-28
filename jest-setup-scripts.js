// Jest setup for scripts tests
// Suppress console warnings that cause non-zero exit codes
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress specific warnings that don't affect test functionality
    if (message.includes('detectOpenHandles') || 
        message.includes('forceExit') ||
        message.includes('ExperimentalWarning')) {
      return;
    }
  }
  originalWarn.apply(console, args);
};

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SKIP_COVERAGE = 'false';

// Mock global console methods to prevent noisy test output
global.console = {
  ...console,
  // Keep errors and warns for debugging
  error: console.error,
  warn: console.warn,
  // Suppress info and log in tests
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};