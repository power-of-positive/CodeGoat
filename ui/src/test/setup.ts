// Jest setup for frontend tests
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for React Router
if (typeof global.TextEncoder === 'undefined') {
  // Use dynamic import to avoid linting issues
  void (async () => {
    const util = await import('util');
    global.TextEncoder = util.TextEncoder as typeof TextEncoder;
    global.TextDecoder = util.TextDecoder as typeof TextDecoder;
  })();
}