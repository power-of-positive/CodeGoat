// Jest setup for frontend tests
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for React Router
if (typeof global.TextEncoder === 'undefined') {
  const util = require('util');
  global.TextEncoder = util.TextEncoder;
  global.TextDecoder = util.TextDecoder;
}