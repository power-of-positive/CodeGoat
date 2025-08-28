#!/usr/bin/env node

/**
 * Server manager for E2E tests with proper process handling
 * Prevents SIGTERM issues and ensures clean process lifecycle
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

class ServerManager {
  constructor() {
    this.processes = [];
    this.shuttingDown = false;
  }

  /**
   * Check if a port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  /**
   * Wait for a server to be ready
   */
  async waitForServer(port, name, maxWaitSeconds = 30) {
    console.error(`Waiting for ${name} on port ${port}...`);
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:${port}`, () => {
            resolve(true);
          });
          req.on('error', reject);
          req.setTimeout(1000);
        });
        console.error(`✓ ${name} ready on port ${port}`);
        return true;
      } catch {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    throw new Error(`${name} failed to start on port ${port} after ${maxWaitSeconds}s`);
  }

  /**
   * Start a server process
   */
  async startServer(config) {
    const { name, command, args = [], port, cwd, env = {} } = config;
    
    // Check if port is already in use
    const portAvailable = await this.isPortAvailable(port);
    if (!portAvailable) {
      console.error(`⚠️  Port ${port} already in use, assuming ${name} is running`);
      return null;
    }

    console.error(`Starting ${name}...`);
    
    const processEnv = {
      ...process.env,
      ...env,
      FORCE_COLOR: '0', // Disable color output for cleaner logs
    };

    const serverProcess = spawn(command, args, {
      cwd,
      env: processEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false, // Keep attached to parent process
    });

    // Handle process output
    serverProcess.stdout.on('data', (data) => {
      if (process.env.DEBUG_SERVERS) {
        console.error(`[${name}] ${data.toString().trim()}`);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      // Filter out common noise
      if (!msg.includes('DeprecationWarning') && !msg.includes('ExperimentalWarning')) {
        if (process.env.DEBUG_SERVERS || msg.toLowerCase().includes('error')) {
          console.error(`[${name}] ${msg}`);
        }
      }
    });

    // Handle process exit
    serverProcess.on('exit', (code, signal) => {
      if (!this.shuttingDown) {
        console.error(`⚠️  ${name} exited unexpectedly (code: ${code}, signal: ${signal})`);
      }
    });

    // Store process reference
    this.processes.push({ name, process: serverProcess, port });

    // Wait for server to be ready
    await this.waitForServer(port, name);
    
    return serverProcess;
  }

  /**
   * Gracefully shutdown all processes
   */
  async shutdown() {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    
    console.error('\n🛑 Shutting down servers...');
    
    for (const { name, process } of this.processes) {
      if (process && !process.killed) {
        console.error(`  Stopping ${name}...`);
        
        // Try graceful shutdown first
        process.kill('SIGTERM');
        
        // Give it time to shutdown gracefully
        await new Promise(r => setTimeout(r, 1000));
        
        // Force kill if still running
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }
    }
    
    // Clear process list
    this.processes = [];
    console.error('✅ All servers stopped');
  }

  /**
   * Setup signal handlers for clean shutdown
   */
  setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.error(`\nReceived ${signal}, shutting down gracefully...`);
        await this.shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught errors
    process.on('uncaughtException', async (err) => {
      console.error('Uncaught Exception:', err);
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (err) => {
      console.error('Unhandled Rejection:', err);
      await this.shutdown();
      process.exit(1);
    });
  }
}

// Export for use in other scripts
module.exports = { ServerManager };

// Run if called directly
if (require.main === module) {
  const manager = new ServerManager();
  manager.setupSignalHandlers();

  async function runServers() {
    try {
      // Start backend
      await manager.startServer({
        name: 'Backend',
        command: 'npm',
        args: ['run', 'dev'],
        port: 3001,
        cwd: path.resolve(__dirname, '../..'),
        env: {
          NODE_ENV: 'e2e-test',
          PORT: '3001',
          KANBAN_DATABASE_URL: 'file:./prisma/kanban-test.db',
          DATABASE_URL: 'file:./prisma/kanban-test.db',
          AI_REVIEWER_ENABLED: 'false',
          LOG_LEVEL: 'error',
          NODE_OPTIONS: '--max_old_space_size=2048', // Increase memory to 2GB for E2E tests
        }
      });

      // Start frontend
      await manager.startServer({
        name: 'Frontend',
        command: 'npm',
        args: ['run', 'dev'],
        port: 5173,
        cwd: path.resolve(__dirname, '..'),
        env: {
          VITE_API_URL: 'http://localhost:3001',
        }
      });

      console.error('✅ All servers running. Press Ctrl+C to stop.');
      
      // Keep process alive
      await new Promise(() => {});
      
    } catch (error) {
      console.error('Failed to start servers:', error);
      await manager.shutdown();
      process.exit(1);
    }
  }

  runServers();
}