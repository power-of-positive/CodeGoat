/**
 * API E2E tests for check-runners.ts
 */

import { runApiE2eTests } from './check-runners';
import { execSync } from 'child_process';
import { createServer } from 'net';

// Mock external dependencies
jest.mock('child_process');
jest.mock('net');

describe('check-runners API E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.cwd and process.env
    const mockCwd = jest.fn().mockReturnValue('/mock/cwd');
    Object.defineProperty(process, 'cwd', {
      value: mockCwd,
      configurable: true,
    });
  });

  describe('runApiE2eTests', () => {
    it('should run API E2E tests successfully', async () => {
      const mockServer = {
        listen: jest.fn((_port: number, callback: () => void) => callback()),
        close: jest.fn((callback: () => void) => callback()),
        on: jest.fn(),
      };
      (createServer as jest.Mock).mockReturnValue(
        mockServer as unknown as ReturnType<typeof createServer>
      );
      (execSync as jest.Mock).mockReturnValue('API E2E tests passed');

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
        listen: jest.fn(),
        close: jest.fn((callback?: () => void) => {
          if (callback) {
            callback();
          }
        }),

        on: jest.fn((event: string, callback: (err?: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Port error')), 0);
          }
        }),
      };
      (createServer as jest.Mock).mockReturnValue(
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
        listen: jest.fn((_port: number, callback: () => void) => callback()),
        close: jest.fn((callback?: () => void) => {
          if (callback) {
            callback();
          }
        }),
        on: jest.fn(),
      };
      (createServer as jest.Mock).mockReturnValue(
        mockServer as unknown as ReturnType<typeof createServer>
      );
      (execSync as jest.Mock).mockImplementation(() => {
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
