/**
 * Backend Server Test Utilities
 * 
 * Common test utilities and mock factories for backend server testing.
 * Extracted to reduce code duplication and maintain DRY principles.
 */

import { vi } from 'vitest';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Create mock child process with basic properties
 */
export function createMockChildProcess(overrides: Partial<ChildProcess> = {}): ChildProcess {
  const mockProcess = Object.assign(new EventEmitter(), {
    pid: 12345,
    killed: false,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    ...overrides
  }) as ChildProcess;
  
  return mockProcess;
}

/**
 * Create mock backend configuration for testing
 */
export function createMockBackendConfig() {
  return {
    port: '3001',
    baseUrl: 'http://localhost:3001',
    projectRoot: '/project',
    binaryRelease: '/release',
    binaryDebug: '/debug'
  };
}

/**
 * Create mock backend process structure
 */
export function createMockBackendProcess(pid = 12345, killed = false) {
  return {
    process: {
      killed,
      kill: vi.fn()
    } as any,
    pid
  };
}

/**
 * Setup common mocks for backend manager
 */
export async function setupBackendManagerMocks() {
  const { ensureBackendBinary, waitForBackend } = await import('../backend-manager');
  vi.mocked(ensureBackendBinary).mockResolvedValue('/path/to/binary');
  vi.mocked(waitForBackend).mockResolvedValue();
  
  return { ensureBackendBinary, waitForBackend };
}

/**
 * Setup timer mocks and advance time for async operations
 */
export function setupTimerTest(callback: () => Promise<void>) {
  return async () => {
    vi.useFakeTimers();
    const promise = callback();
    vi.advanceTimersByTime(2000);
    await promise;
    vi.useRealTimers();
  };
}