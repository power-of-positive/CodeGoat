/**
 * Backend Server Management Utilities
 * 
 * Handles backend binary discovery, building, and server lifecycle.
 * Extracted from global-setup to follow SRP and file size limits.
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface BackendConfig {
  port: string;
  baseUrl: string;
  projectRoot: string;
  startCommand: string;
}

export interface BackendProcess {
  process: ChildProcess;
  pid: number;
}

/**
 * Create backend configuration from environment
 */
export function createBackendConfig(): BackendConfig {
  const port = process.env.BACKEND_PORT || '3001';
  const projectRoot = process.cwd(); // We're already in the project root
  
  return {
    port,
    baseUrl: `http://localhost:${port}`,
    projectRoot,
    startCommand: 'npm start',
  };
}

/**
 * Check if backend server responds to health check
 */
export async function checkBackendHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for backend server to be ready
 */
export async function waitForBackend(baseUrl: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkBackendHealth(baseUrl)) {
      console.log(`✅ Backend server ready at ${baseUrl}`);
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Backend server failed to start within ${maxAttempts} seconds`);
}

/**
 * Build backend using npm run build
 */
export async function buildBackend(projectRoot: string): Promise<void> {
  console.log('🔨 Building Node.js backend...');
  
  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  
  await new Promise<void>((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Backend build failed with code ${code}`));
    });
  });
}

/**
 * Ensure backend is ready (build if necessary)
 */
export async function ensureBackendReady(config: BackendConfig): Promise<void> {
  const packageJsonPath = join(config.projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(`Backend project not found at ${config.projectRoot}`);
  }
  
  console.log('📦 Node.js backend project found');
  
  // Check if dist exists, build if not
  const distPath = join(config.projectRoot, 'dist');
  if (!existsSync(distPath)) {
    await buildBackend(config.projectRoot);
  }
}