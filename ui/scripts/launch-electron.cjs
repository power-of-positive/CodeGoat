#!/usr/bin/env node

const { spawn } = require('child_process');
const electronPath = require('electron'); // resolves to the binary path when required from Node

const env = { ...process.env };

// Electron disables its runtime when this flag is present, so ensure it is removed for child process
delete env.ELECTRON_RUN_AS_NODE;

if (!env.ELECTRON_RENDERER_URL) {
  env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
}

if (!env.ELECTRON_STARTUP) {
  env.ELECTRON_STARTUP = 'dev';
}

const args = process.argv.slice(2);

if (args.length === 0) {
  args.push('.');
}

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('close', (code, signal) => {
  if (code !== null) {
    process.exit(code);
  }

  console.error('Electron exited due to signal', signal);
  process.exit(1);
});
