/**
 * Optimized Backend Server Manager for E2E Tests
 *
 * Implements performance optimizations for test environment:
 * - Fast server startup/shutdown
 * - Memory-efficient process management
 * - Optimized log handling during tests
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export interface OptimizedBackendConfig {
  port: number;
  host: string;
  timeout: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableOptimizations: boolean;
}

export interface BackendProcessInfo {
  process: ChildProcess;
  pid: number;
  port: number;
  startTime: number;
  ready: boolean;
}

/**
 * Optimized backend server management for E2E tests
 */
export class OptimizedBackendServer {
  private config: OptimizedBackendConfig;
  private processInfo: BackendProcessInfo | null = null;
  private readinessChecks = 0;
  private maxReadinessChecks = 30;

  constructor(config: OptimizedBackendConfig) {
    this.config = config;
  }

  async start(): Promise<BackendProcessInfo> {
    if (this.processInfo?.ready) {
      return this.processInfo;
    }

    const startTime = Date.now();
    console.log(`🚀 Starting optimized backend server on port ${this.config.port}...`);

    // Apply performance optimizations
    if (this.config.enableOptimizations) {
      this.setupPerformanceOptimizations();
    }

    const serverProcess = spawn('npx', ['ts-node', 'src/index.ts'], {
      cwd: join(__dirname, '../../../'),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: this.config.port.toString(),
        HOST: this.config.host,
        LOG_LEVEL: this.config.logLevel,
        // Performance optimizations
        NODE_OPTIONS: '--max-old-space-size=1024 --expose-gc',
        UV_THREADPOOL_SIZE: '4',
        // Disable excessive logging for faster execution
        WINSTON_DISABLE_CONSOLE: 'true',
        SUPPRESS_TEST_LOGS: 'true',
      },
      stdio: this.config.logLevel === 'debug' ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    if (!serverProcess.pid) {
      throw new Error('Failed to start backend server process');
    }

    this.processInfo = {
      process: serverProcess,
      pid: serverProcess.pid,
      port: this.config.port,
      startTime,
      ready: false,
    };

    // Handle process output efficiently
    if (serverProcess.stdout && serverProcess.stderr) {
      this.setupOutputHandling(serverProcess);
    }

    // Handle process errors
    serverProcess.on('error', error => {
      console.error('❌ Backend server process error:', error);
      throw error;
    });

    // Wait for server to be ready with optimized checks
    await this.waitForServerReady();

    this.processInfo.ready = true;
    const startupTime = Date.now() - startTime;
    console.log(
      `✅ Backend server ready at http://${this.config.host}:${this.config.port} (${startupTime}ms)`
    );

    return this.processInfo;
  }

  async stop(): Promise<void> {
    if (!this.processInfo) {
      return;
    }

    console.log('🛑 Stopping backend server...');
    const { process: serverProcess, pid } = this.processInfo;

    try {
      // Graceful shutdown first
      serverProcess.kill('SIGTERM');

      // Wait for graceful shutdown (with timeout)
      const shutdownTimeout = 5000;
      const shutdownPromise = new Promise<void>(resolve => {
        serverProcess.on('exit', () => resolve());
      });

      const timeoutPromise = new Promise<void>(resolve => {
        setTimeout(() => resolve(), shutdownTimeout);
      });

      await Promise.race([shutdownPromise, timeoutPromise]);

      // Force kill if still running
      if (!serverProcess.killed) {
        console.log('⚠️  Forcing server shutdown...');
        serverProcess.kill('SIGKILL');
      }

      // Additional cleanup
      try {
        process.kill(pid, 0); // Check if process is still running
        process.kill(pid, 'SIGKILL'); // Force kill if needed
      } catch {
        // Process already terminated
      }
    } catch (error) {
      console.warn('⚠️ Error during server shutdown:', error);
      // Force kill as last resort
      try {
        if (pid) {
          process.kill(pid, 'SIGKILL');
        }
      } catch {
        // Already terminated
      }
    }

    this.processInfo = null;
    console.log('✅ Backend server stopped');
  }

  private setupPerformanceOptimizations(): void {
    const settingsPath = join(__dirname, '../../../settings.json');

    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

        // Temporarily disable verbose logging for tests
        const testOptimizedSettings = {
          ...settings,
          logging: {
            ...settings.logging,
            level: this.config.logLevel,
            enableFile: false, // Disable file logging during tests
            enableConsole: false,
          },
          validation: {
            ...settings.validation,
            enableMetrics: false, // Disable metrics collection during tests
            stages:
              settings.validation?.stages?.map((stage: any) => ({
                ...stage,
                enabled: false, // Disable validation stages during tests
              })) || [],
          },
        };

        writeFileSync(settingsPath, JSON.stringify(testOptimizedSettings, null, 2));
      } catch (error) {
        console.warn('⚠️ Failed to optimize settings for testing:', error);
      }
    }
  }

  private setupOutputHandling(serverProcess: ChildProcess): void {
    let outputBuffer = '';
    const maxBufferSize = 8192; // 8KB buffer

    serverProcess.stdout!.on('data', data => {
      if (this.config.logLevel === 'debug') {
        outputBuffer += data.toString();

        // Prevent memory buildup in tests
        if (outputBuffer.length > maxBufferSize) {
          outputBuffer = outputBuffer.slice(-maxBufferSize / 2);
        }

        // Only log startup-related messages
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('running on') || line.includes('ready') || line.includes('error')) {
            console.log('[Backend]', line.trim());
          }
        }
      }
    });

    serverProcess.stderr!.on('data', data => {
      const errorMessage = data.toString();
      if (!this.shouldSuppressError(errorMessage)) {
        console.error('[Backend Error]', errorMessage.trim());
      }
    });
  }

  private shouldSuppressError(errorMessage: string): boolean {
    const suppressPatterns = [
      'experimental warning',
      'deprecation warning',
      'punycode',
      'buffer constructor',
    ];

    return suppressPatterns.some(pattern =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private async waitForServerReady(): Promise<void> {
    const checkInterval = 200; // Check every 200ms
    const maxWaitTime = this.config.timeout;
    const startTime = Date.now();

    while (this.readinessChecks < this.maxReadinessChecks) {
      this.readinessChecks++;

      try {
        // Use a lightweight HTTP check
        const response = await this.makeHealthCheck();
        if (response) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(`Backend server failed to start within ${maxWaitTime}ms`);
      }

      await this.sleep(checkInterval);
    }

    throw new Error(
      `Backend server failed readiness checks after ${this.maxReadinessChecks} attempts`
    );
  }

  private async makeHealthCheck(): Promise<boolean> {
    try {
      // Use Node.js built-in http for lightweight check
      const http = await import('http');

      return new Promise<boolean>(resolve => {
        const request = http.request(
          {
            hostname: this.config.host,
            port: this.config.port,
            path: '/api/health',
            method: 'GET',
            timeout: 1000,
          },
          response => {
            resolve(response.statusCode === 200);
          }
        );

        request.on('error', () => resolve(false));
        request.on('timeout', () => {
          request.destroy();
          resolve(false);
        });

        request.end();
      });
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isReady(): boolean {
    return this.processInfo?.ready ?? false;
  }

  getProcessInfo(): BackendProcessInfo | null {
    return this.processInfo;
  }
}

/**
 * Factory function for creating optimized backend server
 */
export function createOptimizedBackendServer(
  config?: Partial<OptimizedBackendConfig>
): OptimizedBackendServer {
  const defaultConfig: OptimizedBackendConfig = {
    port: 3001,
    host: 'localhost',
    timeout: 10000,
    logLevel: 'error',
    enableOptimizations: true,
  };

  return new OptimizedBackendServer({ ...defaultConfig, ...config });
}
