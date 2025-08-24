/**
 * API E2E tests for check-runners.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runApiE2eTests } from './check-runners';
import { execSync } from 'child_process';
import { createServer } from 'net';

// Mock external dependencies
vi.mock('child_process');
vi.mock('net');

describe('check-runners API E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.cwd and process.env
    vi.stubGlobal('process', {
      ...process,
      cwd: vi.fn().mockReturnValue('/mock/cwd'),
      env: { ...process.env },
    });
  });

  describe('runApiE2eTests', () => {
    it('should run API E2E tests successfully', async () => {
      const mockServer = {
        listen: vi.fn((_port: number, callback: () => void) => callback()),
        close: vi.fn((callback: () => void) => callback()),
        on: vi.fn(),
      };
      vi.mocked(createServer).mockReturnValue(
        mockServer as unknown as ReturnType<typeof createServer>
      );
      vi.mocked(execSync).mockReturnValue('API E2E tests passed');

      const result = await runApiE2eTests('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
    });

    it('should handle invalid project root path', async () => {
      const result = await runApiE2eTests('');

      expect(result.success).toBe(false);
      expect(result.output).toContain('API E2E test execution failed');
    });

    it('should handle port finding error', async () => {
      const mockServer = {
        listen: vi.fn(),
        close: vi.fn((callback?: () => void) => {
          if (callback) {
            callback();
          }
        }),

        on: vi.fn((event: string, callback: (err?: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Port error')), 0);
          }
        }),
      };
      vi.mocked(createServer).mockReturnValue(
        mockServer as unknown as ReturnType<typeof createServer>
      );

      const result = await runApiE2eTests('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(result.success).toBe(false);
      expect(typeof result.output).toBe('string');
    });

    it('should handle execCommand throwing error', async () => {
      const mockServer = {
        listen: vi.fn((_port: number, callback: () => void) => callback()),
        close: vi.fn((callback?: () => void) => {
          if (callback) {
            callback();
          }
        }),
        on: vi.fn(),
      };
      vi.mocked(createServer).mockReturnValue(
        mockServer as unknown as ReturnType<typeof createServer>
      );
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Command execution failed');
      });

      const result = await runApiE2eTests('/mock/project');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(result.success).toBe(false);
      expect(typeof result.output).toBe('string');
    });
  });
});
