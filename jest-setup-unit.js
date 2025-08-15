// Minimal Jest setup for unit tests
// Increase EventEmitter listener limit to prevent warnings
require('events').EventEmitter.defaultMaxListeners = 50;

// Suppress specific warnings that don't indicate actual test failures
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (name === 'warning' && data.name === 'MaxListenersExceededWarning') {
    return false;
  }
  return originalEmit.apply(process, arguments);
};

// Mock console methods to reduce noise in unit tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};