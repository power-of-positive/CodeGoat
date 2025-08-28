// Simple server starter for Playwright tests
const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.PORT = '3001';
process.env.NODE_ENV = 'development';

// Start the server using the compiled version
const serverPath = path.join(__dirname, 'dist', 'src', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.error(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle termination
process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
});