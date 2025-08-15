// Jest setup for frontend tests
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for React Router
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}