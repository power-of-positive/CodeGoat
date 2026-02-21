// Minimal Jest setup for unit tests
// Set NODE_ENV to test for all unit tests
process.env.NODE_ENV = 'test';

// Set test database URL (standard)
process.env.DATABASE_URL = 'file:./prisma/kanban-test.db';
process.env.KANBAN_DATABASE_URL = process.env.DATABASE_URL; // Legacy support

// Increase EventEmitter listener limit to prevent warnings
require('events').EventEmitter.defaultMaxListeners = 50;

// Suppress specific warnings that don't indicate actual test failures
const originalEmit = process.emit;
process.emit = function (name, data) {
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