/**
 * Backend Server Lifecycle Management
 * 
 * Handles spawning, monitoring, and cleanup of backend server process.
 * Extracted from global-setup to follow SRP and function size limits.
 */

import { spawn, ChildProcess } from 'child_process';
import { BackendConfig, BackendProcess, waitForBackend, ensureBackendReady } from './backend-manager';

/**
 * Configure backend process logging
 */
function configureProcessLogging(childProcess: ChildProcess): void {
  if (!process.env.DEBUG) return;
  
  childProcess.stdout?.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });
  
  childProcess.stderr?.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });
}

/**
 * Configure backend process error handling
 */
function configureProcessErrorHandling(childProcess: ChildProcess): void {
  childProcess.on('error', (error) => {
    console.error('❌ Backend process error:', error);
  });
  
  childProcess.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`❌ Backend process exited with code ${code}, signal ${signal}`);
    }
  });
}

/**
 * Spawn backend server process
 */
function spawnBackendProcess(config: BackendConfig): ChildProcess {
  console.log(`🚀 Starting Node.js backend server on port ${config.port}...`);
  
  const [command, ...args] = config.startCommand.split(' ');
  
  return spawn(command, args, {
    cwd: config.projectRoot,
    env: {
      ...process.env,
      PORT: config.port,
      DATABASE_URL: 'prisma/kanban.db',
      NODE_ENV: 'test',
      BROWSER: 'none',
      NO_BROWSER: '1',
      CI: '1',
    },
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

/**
 * Start backend server and wait for readiness
 */
export async function startBackendServer(config: BackendConfig): Promise<BackendProcess> {
  await ensureBackendReady(config);
  const childProcess = spawnBackendProcess(config);
  
  if (!childProcess.pid) {
    throw new Error('Failed to start backend process');
  }
  
  configureProcessLogging(childProcess);
  configureProcessErrorHandling(childProcess);
  
  await waitForBackend(config.baseUrl);
  
  return {
    process: childProcess,
    pid: childProcess.pid
  };
}

/**
 * Stop backend server gracefully
 */
export async function stopBackendServer(backendProcess: BackendProcess): Promise<void> {
  const { process: childProcess, pid } = backendProcess;
  
  if (childProcess.killed) return;
  
  console.log(`🛑 Stopping backend server (PID: ${pid})`);
  childProcess.kill('SIGTERM');
  
  // Wait for graceful shutdown
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Force kill if still running
  if (!childProcess.killed) {
    childProcess.kill('SIGKILL');
  }
}