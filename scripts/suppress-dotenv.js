// Suppress dotenv debug messages before any modules load
delete process.env.DEBUG;
delete process.env.DOTENV_CONFIG_DEBUG; 
delete process.env.DOTENV_DEBUG;

// Intercept console methods before anything else loads
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('[dotenv@') || message.includes('[DEBUG]')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('[dotenv@') || message.includes('[DEBUG]')) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('[dotenv@') || message.includes('[DEBUG]')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

console.debug = (...args) => {
  const message = args.join(' ');
  if (message.includes('[dotenv@') || message.includes('[DEBUG]')) {
    return;
  }
  originalConsoleDebug.apply(console, args);
};

// Also intercept stderr
const originalStderrWrite = process.stderr.write;
process.stderr.write = function(chunk, ...args) {
  const str = chunk?.toString ? chunk.toString() : String(chunk);
  if (str.includes('[dotenv@') || str.includes('[DEBUG]')) {
    return true;
  }
  return originalStderrWrite.apply(process.stderr, [chunk, ...args]);
};